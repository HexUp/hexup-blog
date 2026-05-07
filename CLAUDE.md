# hexup-blog

Astro 静态博客，部署在 Vercel，域名 hexup.cc。

## 关键约定

- **品牌名 `HexUp`**：所有面向用户展示的地方一律用这个大小写（不要写成 hexup / HEXUP / Hexup）。代码里的标识符、文件名、URL slug 不受此限。
- **导航栏**：左侧 `HexUp` 主页按钮，右侧 `Blog` 链接（当前页是 `/blog` 或 `/blog/*` 时高亮）。不要加 Home / About / 社交图标等其他项。
- **语言**：页面文案中英混排，HTML `lang="zh-CN"`。
- **中文严禁合成斜体**（浏览器把直立汉字机械倾斜，竖线变斜，非常难看）。global.css 已用 `font-synthesis-style: none` 全局禁止合成。**不要**手写 `font-style: italic` 在可能含中文的元素上；用更轻字重、低对比颜色、字号差异等方式建立层级。如果将来确实要中文斜体，必须加载一款专门设计、能保持竖线垂直的中文斜体字，再显式应用。

## 项目结构

- `src/pages/` — 路由页面（`index.astro` 首页 = 介绍 + 文章列表，`about.astro`，`blog/index.astro`，`rss.xml.js`）
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
