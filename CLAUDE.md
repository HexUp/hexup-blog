# hexup-blog

Astro 静态博客，部署在 Vercel，域名 hexup.cc。

## 关键约定

- **品牌名 `HexUp`**：所有面向用户展示的地方一律用这个大小写（不要写成 hexup / HEXUP / Hexup）。代码里的标识符、文件名、URL slug 不受此限。
- **导航栏**：左侧 `HexUp` 主页按钮，右侧 `Blog` 链接（当前页是 `/blog` 或 `/blog/*` 时高亮）+ 主题切换按钮。不要再加 Home / About / 社交图标等其他项。
- **配色以 telari 的主题文件为准**：`src/styles/palette.css` 逐槽照抄 `~/projects/telari/app/Sources/TelariKit/Resources/document-themes/telari-{light,dark}.toml`。那两个文件是 `tools/theme/ladder_gen.py` 生成的，每个值都在一组对比度约束里（正文对纸、代码色六级明度梯子两两 ΔL* ≥ 7.5）。**不要在博客这边手改颜色**——要改回 telari 改生成器参数重跑再搬过来。
- **主题三档**：未选择 = 跟随系统；`data-theme="light"` / `"dark"` = 用户显式选择，存在 localStorage。任何颜色都必须在 `:root` 上有浅色定义，不能只写在媒体查询里，否则切回浅色时无处可退。BaseHead 里的内联脚本负责在首次绘制前套用，别挪走。
- **语言**：页面文案中英混排，HTML `lang="zh-CN"`。
- **中文严禁合成斜体**（浏览器把直立汉字机械倾斜，竖线变斜，非常难看）。global.css 已用 `font-synthesis-style: none` 全局禁止合成。**不要**手写 `font-style: italic` 在可能含中文的元素上；用更轻字重、低对比颜色、字号差异等方式建立层级。文章正文里的 `<em>` 已在 `typography.css` 里换成楷体（Telari 的 `CjkItalicFace.kai` 同款做法，楷体竖线本身垂直，不是倾斜变换）——但楷体在现代 macOS 上不预装，没装的机器会退化成「无区别」。
- **排版参数以 telari 仓库为准**：`src/styles/typography.css` 里的行高、段距、标题级差与留白、行内代码尺寸等，全部抄自 `~/projects/telari` 的 `core/src/style.rs`（`Typeset::default()`）和 `app/Sources/TelariKit/Theme.swift`。改这些数值前先回去看源头，不要凭感觉调。

## 项目结构

- `src/pages/` — 路由页面（`index.astro` 首页 = 文章列表，`blog/index.astro`，`rss.xml.js`）
- `src/content/blog/` — 文章源文件，`.md` 或 `.mdx`，frontmatter schema 见 `src/content.config.ts`
- `src/components/` — `Header` `Footer` `BaseHead` `FormattedDate`
- `src/layouts/BlogPost.astro` — 单篇文章布局
- `src/consts.ts` — 站点标题、描述
- `astro.config.mjs` — `site: 'https://hexup.cc'`（影响 RSS、sitemap 绝对链接）

## 写新文章

在 `src/content/blog/` 下新建 `.md` 或 `.mdx`，frontmatter 至少要有：

```yaml
---
title: '...'
description: '...'
pubDate: 'YYYY-MM-DD'
---
```

可选：`updatedDate`、`heroImage`（路径相对于 md 文件，例如 `../../assets/xxx.jpg`）。

## 常用命令

- `npm run dev` — 本地开发 (http://localhost:4321)
- `npm run build` — 构建到 `dist/`
- `npm run preview` — 预览构建产物

## 部署

push 到 `main` → Vercel 自动部署（仓库 `HexUp/hexup-blog`，private）。
