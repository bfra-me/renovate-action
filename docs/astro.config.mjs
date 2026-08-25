// @ts-check
import starlight from '@astrojs/starlight'
import {defineConfig} from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: 'https://bfra-me.github.io',
  base: '/renovate-action',
  // Build optimizations for GitHub Pages
  build: {
    assets: '_astro',
    inlineStylesheets: 'auto',
  },
  // Improved compatibility settings
  vite: {
    build: {
      assetsInlineLimit: 0, // Ensure assets are properly handled
    },
  },
  integrations: [
    starlight({
      title: 'Renovate Action Docs',
      description: 'Usage and migration documentation for @bfra.me/renovate-action',
      // logo: {
      //   src: './src/assets/logo.svg',
      //   replacesTitle: true,
      // },
      social: [
        {
          icon: 'github',
          label: 'GitHub Repository',
          href: 'https://github.com/bfra-me/renovate-action',
        },
      ],
      customCss: ['./src/styles/custom.css'],
      // Enable pagination for better navigation
      pagination: true,
      // Table of contents configuration
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },
      sidebar: [
        {
          label: 'Guides',
          items: [{label: 'Usage Guide', slug: 'guides/usage'}],
        },
        {
          label: 'Archive / Legacy',
          collapsed: true,
          items: [
            {label: 'Testing Strategy', slug: 'legacy/testing-strategy'},
            {label: 'Action Report', slug: 'legacy/renovate-action-report'},
            {label: 'Examples', slug: 'legacy/examples'},
          ],
        },
      ],
    }),
  ],
})
