// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import rehypeCjkTypography from './src/plugins/rehype-cjk-typography.mjs';
import { telariDark, telariLight } from './src/plugins/shiki-telari.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://hexup.cc',
	integrations: [mdx(), sitemap()],
	// 构建期中西文间距与中文标点压缩。mdx() 默认继承 markdown 配置。
	markdown: {
		rehypePlugins: [rehypeCjkTypography],
		// defaultColor: false → Shiki 不写死颜色，而是给每个 span 输出
		// --shiki-light / --shiki-dark 两个变量，由 palette.css 挑。这样切主题
		// 不用重新渲染，和站点其他颜色走同一条路径。
		shikiConfig: {
			themes: { light: telariLight, dark: telariDark },
			defaultColor: false,
			wrap: false,
		},
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
		{
			provider: fontProviders.google(),
			name: 'JetBrains Mono',
			cssVariable: '--font-mono',
			fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
			options: {
				weights: [400, 500, 700],
				styles: ['normal'],
				subsets: ['latin'],
			},
		},
	],
});
