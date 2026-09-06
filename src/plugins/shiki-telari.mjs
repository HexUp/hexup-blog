/**
 * 代码高亮配色 — Telari Light / Telari Dark 的 [document.code] 五个槽。
 *
 * 那五个颜色在 telari 那边不是随手挑的色相，是一条**六级明度梯子**：
 * 面色 → comment → literal → string → 正文 → type → keyword，两两 ΔL* ≥ 7.5，
 * token 对正文 ΔL* ≥ 8。这样即使色觉有差异、或者截图被转成灰度，层级依然分得开。
 * 所以这里把 scope 映射到这五个槽时，要按「这个 token 在语义上属于哪一档」来分，
 * 不要按「哪个颜色好看」来分。
 *
 * 颜色值不要在这里改：源头是 telari 的 document-themes/*.toml，由
 * tools/theme/ladder_gen.py 生成。
 */

/** 五个槽 → TextMate scope。两套主题共用同一份映射，只换颜色。 */
const SCOPES = {
	keyword: [
		'keyword',
		'storage',
		'storage.type',
		'keyword.control',
		'keyword.operator.new',
		'variable.language',
		'constant.language',
	],
	string: ['string', 'string.quoted', 'string.template', 'meta.embedded.assembly'],
	comment: ['comment', 'punctuation.definition.comment'],
	literal: ['constant.numeric', 'constant.character', 'constant.other', 'support.constant'],
	type: [
		'entity.name.type',
		'entity.name.class',
		'entity.name.function',
		'support.type',
		'support.class',
		'support.function',
	],
};

function build({ name, type, fg, bg, code }) {
	return {
		name,
		type,
		fg,
		bg,
		settings: [
			{ settings: { foreground: fg, background: bg } },
			...Object.entries(SCOPES).map(([slot, scope]) => ({
				scope,
				settings: { foreground: code[slot] },
			})),
		],
	};
}

/** telari-light.toml */
export const telariLight = build({
	name: 'telari-light',
	type: 'light',
	fg: '#31312F',
	bg: '#EDECE9',
	code: {
		keyword: '#000342',
		string: '#004E36',
		comment: '#616A70',
		literal: '#844500',
		type: '#001D4B',
	},
});

/** telari-dark.toml */
export const telariDark = build({
	name: 'telari-dark',
	type: 'dark',
	fg: '#B9BBC2',
	bg: '#212630',
	code: {
		keyword: '#E4E7FF',
		string: '#5EB597',
		comment: '#757E84',
		literal: '#C97F3D',
		type: '#96DCFF',
	},
});
