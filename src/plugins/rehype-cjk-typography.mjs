/**
 * 构建期中西文间距 + 中文标点压缩。
 *
 * 这是 Telari「间距发生在显示阶段，不需要为了排版效果去修改原文」的同一条原则，
 * 只是显示阶段从渲染时提前到了构建时：markdown 源文件保持干净，只有产物被改。
 *
 * 为什么不用原生 CSS（2026-09 实测，Chrome 152）：
 *
 * - `text-autospace: normal` 已经能用，但插入的间距是 **0.125em**，只有 Telari
 *   `cjk_latin_gap = 0.25` 的一半。而且 Safari / Firefox 都还没有。
 * - `text-spacing-trim` 更糟：它依赖字体自带的 `chws` 等 OpenType 特性。实测
 *   PingFang SC / Hiragino Sans GB / Noto Serif CJK SC 都能压（1em → 0.5em，
 *   正好是 `cjk_punct_compression = 0.5`），但 **Songti SC 完全没有反应**
 *   （200px → 200px）。也就是说我们为了对齐 Telari 选的那款字体，恰好是原生
 *   压缩失效的那款。
 *
 * 两件事都归结成同一个动作：在接缝处插入一个空 span，用 margin 调宽度。正数是
 * 间距，负数是压缩。
 *
 * 做不到、也没打算做的：与行位置相关的规则。开引号在行首该悬挂、句号在行尾该
 * 压缩——这些取决于断行结果，而断行结果取决于视口宽度，构建期不知道。行尾那半
 * 边交给 CSS 的 `hanging-punctuation`（Safari 支持，Chrome 尚不支持）。
 *
 * 数值来源：~/projects/telari `core/src/style.rs` 与 `core/src/items.rs`。
 */

/** 参与中西文间距的「中文侧」：汉字与假名，**不含标点**（标点有自己的 aki 机制）。 */
const CJK_IDEO = /[々-〇぀-ヿ㐀-䶿一-鿿豈-﫿]|[\uD840-\uD87F][\uDC00-\uDFFF]/;

/** 参与中西文间距的「西文侧」：拉丁字母与数字。标点、符号一律不算——对应
 *  items.rs `side_kind()` 里 `SideKind::Neither` 那一档。 */
const LATIN = /[A-Za-z0-9À-ɏ]/;

/** segment.rs `punct_side()` 的两张表，逐字符照抄。 */
const PUNCT_OPEN = new Set('〈《「『【〔〖〘〚〝（［｛｟｢');
const PUNCT_CLOSE = new Set('、。〉》」』】〕〗〙〛〞〟！），．：；？］｝｠｡｣､');

/** items.rs：`PUNCT_INK_EM = 0.5`，所以一个全角标点的空白半边正好 0.5em。
 *  两个相邻闭合标点 SOLID（前一个的尾部 aki 整个去掉）→ 压 0.5em。
 *  闭合后接开启，`PUNCT_PAIR_NATURAL_FACTOR = 0.5` 作用在 (0.5 + 0.5) 上
 *  → 保留 0.5em，同样压掉 0.5em。两种情况数值一致。 */
const PUNCT_TRIM_EM = 0.5;

/** style.rs `Typeset::default()` 的 `cjk_latin_gap`。 */
const CJK_LATIN_GAP_EM = 0.25;

/** 给多长的拉丁词标 lang="en"。整页是 lang="zh-CN"，浏览器不会对中文文档里的
 *  英文启用连字词典，长单词放不下就只能把上一行撑开——正是 Knuth-Plass 存在的
 *  理由，而 CSS 的贪心断行器没有全局视野，只能靠连字缓解。
 *
 *  阈值和 typography.css 里的 `hyphenate-limit-chars: 8 4 4` 对齐：只有 8 个
 *  字母以上的词才可能被断开，所以短于 8 的词包了也没用，白白多出一堆 span。
 *  这同时避开了「Telari」（6）这类产品名被断成 Tel-ari。 */
const LATIN_WORD_MIN = 8;
const LATIN_WORD = /[A-Za-zÀ-ɏ]{8,}/g;

/** 不进入的子树。math 交给未来的公式渲染，别在里面塞 span。 */
const SKIP = new Set(['script', 'style', 'math', 'svg', 'textarea']);
/** 进入、但内部不插接缝的子树：里面的字符仍参与边界判定，且按 items.rs
 *  `side_kind(class, is_code = true)` 当作西文侧——所以 `中文\`foo\`` 照样有间距。 */
const CODE = new Set(['code', 'kbd', 'samp', 'pre']);

/** 块级容器：接缝不跨块。 */
const BLOCK = new Set([
	'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'td', 'th',
	'dt', 'dd', 'figcaption', 'caption', 'div', 'section', 'article', 'main',
]);

function isCjk(ch) {
	return CJK_IDEO.test(ch);
}

/**
 * 一个接缝需要插什么。`prev` / `next` 是接缝两侧的字符，`prevCode` / `nextCode`
 * 说明该字符是否来自代码运行。返回 null 表示这个接缝不动。
 */
function seamAt(prev, next, prevCode, nextCode) {
	// 1. 标点压缩。只处理 items.rs 那两条与行位置无关的规则：前一个是闭合类全角
	//    标点，后一个是任意全角标点。开启+开启（`（「`）在 items.rs 里走
	//    `(None, Some(ob))` 分支，保留完整 aki——这里也不动。
	if (!prevCode && !nextCode && PUNCT_CLOSE.has(prev) && (PUNCT_CLOSE.has(next) || PUNCT_OPEN.has(next))) {
		return { cls: 'tl-punct-trim', em: -PUNCT_TRIM_EM };
	}

	// 2. 中西文间距。代码运行里的非汉字字符算西文侧（side_kind 的 is_code 分支）。
	const prevIsCjk = !prevCode && isCjk(prev);
	const nextIsCjk = !nextCode && isCjk(next);
	const prevIsWestern = prevCode ? !isCjk(prev) : LATIN.test(prev);
	const nextIsWestern = nextCode ? !isCjk(next) : LATIN.test(next);
	if ((prevIsCjk && nextIsWestern) || (prevIsWestern && nextIsCjk)) {
		return { cls: 'tl-gap', em: CJK_LATIN_GAP_EM };
	}

	return null;
}

function gapNode(cls, em) {
	return {
		type: 'element',
		tagName: 'span',
		properties: { className: [cls], style: `--tl-em:${em}` },
		children: [],
	};
}

/**
 * 给块里够长的拉丁词套上 <span lang="en">，让 hyphens: auto 生效。
 *
 * 必须在接缝那一趟之前跑：接缝逻辑是重新收集文本节点的，跑完这里它看到的就是
 * 拆分后的结构，落在 span 边界上的接缝走 atRunEnd 那条路，本来就处理得了。
 */
function wrapLatinWords(block) {
	(function walk(node, code) {
		const children = node.children;
		if (!children) return;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child.type === 'element') {
				if (SKIP.has(child.tagName) || BLOCK.has(child.tagName)) continue;
				// 代码里的英文不参与连字：代码不该被断开。
				walk(child, code || CODE.has(child.tagName));
				continue;
			}
			if (child.type !== 'text' || code) continue;

			LATIN_WORD.lastIndex = 0;
			const value = child.value;
			if (!LATIN_WORD.test(value)) continue;
			LATIN_WORD.lastIndex = 0;

			const out = [];
			let cursor = 0;
			let m;
			while ((m = LATIN_WORD.exec(value)) !== null) {
				if (m.index > cursor) out.push({ type: 'text', value: value.slice(cursor, m.index) });
				out.push({
					type: 'element',
					tagName: 'span',
					properties: { lang: 'en' },
					children: [{ type: 'text', value: m[0] }],
				});
				cursor = m.index + m[0].length;
			}
			if (cursor < value.length) out.push({ type: 'text', value: value.slice(cursor) });

			children.splice(i, 1, ...out);
			i += out.length - 1;
		}
	})(block, CODE.has(block.tagName));
}

/**
 * 把一个块里的所有文本节点收集成一条字符流（代码子树也进，但打上 code 标记），
 * 再在需要的接缝上插入空 span。
 */
function processBlock(block) {
	wrapLatinWords(block);

	/** @type {{node: any, siblings: any[], code: boolean}[]} */
	const runs = [];

	(function collect(node, code) {
		if (node.type === 'text') return;
		const children = node.children;
		if (!children) return;
		for (const child of children) {
			if (child.type === 'text') {
				if (child.value.length > 0) runs.push({ node: child, siblings: children, code });
			} else if (child.type === 'element') {
				if (SKIP.has(child.tagName)) continue;
				// 嵌套块自己处理，不与外层串成一条流。
				if (BLOCK.has(child.tagName)) continue;
				collect(child, code || CODE.has(child.tagName));
			}
		}
	})(block, CODE.has(block.tagName));

	if (runs.length === 0) return;

	// 全局字符流 + 位置映射。
	let text = '';
	const owner = []; // 每个字符属于哪个 run
	for (let r = 0; r < runs.length; r++) {
		const v = runs[r].node.value;
		text += v;
		for (let i = 0; i < v.length; i++) owner.push(r);
	}

	// 收集编辑，稍后倒序应用。
	/** @type {{run: number, offset: number, cls: string, em: number, atRunEnd: boolean}[]} */
	const edits = [];
	for (let i = 1; i < text.length; i++) {
		const prev = text[i - 1];
		const next = text[i];
		// 已经有真空格的接缝不动——原文作者手写的空格就是他要的间距。
		if (/\s/.test(prev) || /\s/.test(next)) continue;

		const prevRun = owner[i - 1];
		const nextRun = owner[i];
		const spec = seamAt(prev, next, runs[prevRun].code, runs[nextRun].code);
		if (!spec) continue;

		// 接缝落在同一个代码运行内部 → 不动（代码里的空白是有意义的）。
		if (prevRun === nextRun && runs[prevRun].code) continue;

		let localOffset = i;
		for (let r = 0; r < nextRun; r++) localOffset -= runs[r].node.value.length;

		edits.push({
			run: nextRun,
			offset: localOffset,
			cls: spec.cls,
			em: spec.em,
			// 接缝正好在两个 run 之间：插到前一个 run 之后，而不是切开后一个。
			atRunEnd: prevRun !== nextRun,
			prevRun,
		});
	}

	// 按 run 归并后一次性重排。逐条 splice 是错的：一个文本节点被切开后，
	// 原节点就从 siblings 里消失了，同一节点上剩下的接缝会静默丢失。
	/** @type {Map<number, {splits: {offset: number, span: any}[], before: any[], after: any[]}>} */
	const byRun = new Map();
	const slot = (r) => {
		if (!byRun.has(r)) byRun.set(r, { splits: [], before: [], after: [] });
		return byRun.get(r);
	};

	for (const edit of edits) {
		const span = gapNode(edit.cls, edit.em);
		if (!edit.atRunEnd) {
			slot(edit.run).splits.push({ offset: edit.offset, span });
			continue;
		}
		// 接缝在两个 run 之间。默认挂在前一个 run 之后；前一个 run 在代码胶囊里时
		// 改挂到后一个之前，否则这个 span 会连同 <code> 的背景和 padding 一起画出来。
		if (runs[edit.prevRun].code && !runs[edit.run].code) {
			slot(edit.run).before.push(span);
		} else {
			slot(edit.prevRun).after.push(span);
		}
	}

	// 倒序遍历 run：靠后的节点先替换，前面的 indexOf 才不会失效。
	for (let r = runs.length - 1; r >= 0; r--) {
		const work = byRun.get(r);
		if (!work) continue;
		const { node, siblings } = runs[r];
		const at = siblings.indexOf(node);
		if (at < 0) continue;

		const out = [...work.before];
		work.splits.sort((a, b) => a.offset - b.offset);
		let cursor = 0;
		for (const { offset, span } of work.splits) {
			const chunk = node.value.slice(cursor, offset);
			if (chunk) out.push({ type: 'text', value: chunk });
			out.push(span);
			cursor = offset;
		}
		const rest = node.value.slice(cursor);
		if (rest) out.push({ type: 'text', value: rest });
		out.push(...work.after);

		siblings.splice(at, 1, ...out);
	}
}


export default function rehypeCjkTypography() {
	return (tree) => {
		(function walk(node) {
			if (node.type === 'element' && SKIP.has(node.tagName)) return;
			if (node.type === 'element' && BLOCK.has(node.tagName)) {
				processBlock(node);
			}
			for (const child of node.children ?? []) {
				if (child.type === 'element') walk(child);
			}
		})(tree);
	};
}
