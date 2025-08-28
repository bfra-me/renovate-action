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
      title: 'Renovate Action Analytics',
      description: 'Performance analytics and monitoring dashboard for @bfra.me/renovate-action',
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
        // Dashboard navigation will be enabled as pages are created
        // {
        //   label: 'Overview',
        //   items: [
        //     {label: 'Getting Started', slug: 'overview/getting-started'},
        //     {label: 'Dashboard Overview', slug: 'overview/dashboard'},
        //   ],
        // },
        {
          label: 'Analytics Dashboards',
          items: [
            {label: 'Multi-Repository Overview', slug: 'dashboards/overview'},
            {label: 'Cache Performance', slug: 'dashboards/cache'},
            {label: 'Docker Operations', slug: 'dashboards/docker'},
            {label: 'API Usage', slug: 'dashboards/api'},
            {label: 'Failure Analysis', slug: 'dashboards/failures'},
          ],
        },
        // {
        //   label: 'Reference',
        //   items: [
        //     {label: 'Data Models', slug: 'reference/data-models'},
        //     {label: 'API Reference', slug: 'reference/api'},
        //     {label: 'Troubleshooting', slug: 'reference/troubleshooting'},
        //   ],
        // },
        {
          label: 'Legacy Documentation',
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
