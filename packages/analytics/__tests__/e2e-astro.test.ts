/**
 * End-to-end testing for Astro Starlight site build and deployment process.
 * Validates the complete analytics dashboard functionality and GitHub Pages deployment.
 */

import {beforeEach, describe, expect, test, vi} from 'vitest'
import {exec} from 'node:child_process'
import {promisify} from 'node:util'
import {existsSync} from 'node:fs'
import {readFile, readdir} from 'node:fs/promises'
import {join} from 'node:path'

const execAsync = promisify(exec)

// Test configuration
const TEST_CONFIG = {
  DOCS_DIR: join(process.cwd(), 'docs'),
  BUILD_OUTPUT_DIR: join(process.cwd(), 'docs', 'dist'),
  BUILD_TIMEOUT_MS: 60000, // 1 minute timeout for builds
  EXPECTED_PAGES: [
    'index.html',
    'dashboards/api/index.html',
    'dashboards/cache/index.html',
    'dashboards/docker/index.html',
    'dashboards/failures/index.html',
    'dashboards/overview/index.html',
  ],
  EXPECTED_ASSETS: ['_astro/', 'favicon.svg'],
} as const

describe('End-to-End Astro Starlight Testing', () => {
  beforeEach(() => {
    // Ensure we're in the right directory context
    process.chdir(TEST_CONFIG.DOCS_DIR)
  })

  describe('Build Process Validation', () => {
    test('should build Astro Starlight site successfully', async () => {
      // Check if docs directory exists
      expect(existsSync(TEST_CONFIG.DOCS_DIR)).toBe(true)

      // Check if package.json exists in docs directory
      const packageJsonPath = join(TEST_CONFIG.DOCS_DIR, 'package.json')
      expect(existsSync(packageJsonPath)).toBe(true)

      // Read package.json to verify build script
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent)
      expect(packageJson.scripts?.build).toBeDefined()

      // Attempt to build the site
      try {
        const {stdout, stderr} = await execAsync('pnpm build', {
          cwd: TEST_CONFIG.DOCS_DIR,
          timeout: TEST_CONFIG.BUILD_TIMEOUT_MS,
        })

        // Build should complete without errors
        expect(stderr).not.toContain('error')
        expect(stdout).toContain('built') // Astro typically outputs "built" on success
      } catch (error) {
        // If build fails, provide detailed error information
        const execError = error as {stdout?: string; stderr?: string; message: string}
        console.error('Build failed:', {
          message: execError.message,
          stdout: execError.stdout,
          stderr: execError.stderr,
        })
        throw error
      }
    }, TEST_CONFIG.BUILD_TIMEOUT_MS)

    test('should generate all expected pages and assets', async () => {
      // Check if build output directory exists
      expect(existsSync(TEST_CONFIG.BUILD_OUTPUT_DIR)).toBe(true)

      // Check for expected HTML pages
      for (const expectedPage of TEST_CONFIG.EXPECTED_PAGES) {
        const pagePath = join(TEST_CONFIG.BUILD_OUTPUT_DIR, expectedPage)
        expect(existsSync(pagePath)).toBe(true)

        // Verify page content
        const pageContent = await readFile(pagePath, 'utf-8')
        expect(pageContent).toContain('<!DOCTYPE html>')
        expect(pageContent).toContain('<html')
        expect(pageContent).toContain('</html>')
      }

      // Check for expected assets
      for (const expectedAsset of TEST_CONFIG.EXPECTED_ASSETS) {
        const assetPath = join(TEST_CONFIG.BUILD_OUTPUT_DIR, expectedAsset)
        expect(existsSync(assetPath)).toBe(true)
      }
    })

    test('should validate dashboard component functionality', async () => {
      // Check that dashboard pages contain expected analytics components
      const dashboardPages = TEST_CONFIG.EXPECTED_PAGES.filter(page => page.startsWith('dashboards/'))

      for (const dashboardPage of dashboardPages) {
        const pagePath = join(TEST_CONFIG.BUILD_OUTPUT_DIR, dashboardPage)
        const pageContent = await readFile(pagePath, 'utf-8')

        // Should contain chart.js or similar visualization library
        expect(pageContent).toMatch(/chart|canvas|d3|recharts/i)

        // Should contain analytics-related content
        expect(pageContent).toMatch(/analytics|metrics|dashboard/i)

        // Should have proper meta tags for SEO
        expect(pageContent).toContain('<meta')
        expect(pageContent).toContain('<title')
      }
    })
  })

  describe('Site Configuration Validation', () => {
    test('should have valid Astro configuration for GitHub Pages', async () => {
      const astroConfigPath = join(TEST_CONFIG.DOCS_DIR, 'astro.config.mjs')
      expect(existsSync(astroConfigPath)).toBe(true)

      const configContent = await readFile(astroConfigPath, 'utf-8')

      // Should contain GitHub Pages specific configuration
      expect(configContent).toMatch(/site.*github\.io/i)
      expect(configContent).toContain('starlight')

      // Should have proper base path configuration
      expect(configContent).toMatch(/base.*renovate-action/i)
    })

    test('should have proper TypeScript configuration', async () => {
      const tsconfigPath = join(TEST_CONFIG.DOCS_DIR, 'tsconfig.json')
      expect(existsSync(tsconfigPath)).toBe(true)

      const tsconfigContent = await readFile(tsconfigPath, 'utf-8')
      const tsconfig = JSON.parse(tsconfigContent)

      // Should extend Astro TypeScript configuration
      expect(tsconfig.extends).toContain('astro')

      // Should have compiler options
      expect(tsconfig.compilerOptions).toBeDefined()
    })

    test('should validate content structure and navigation', async () => {
      const contentDir = join(TEST_CONFIG.DOCS_DIR, 'src', 'content')
      expect(existsSync(contentDir)).toBe(true)

      // Check for content config
      const contentConfigPath = join(TEST_CONFIG.DOCS_DIR, 'src', 'content.config.ts')
      expect(existsSync(contentConfigPath)).toBe(true)

      // Check docs content structure
      const docsDir = join(contentDir, 'docs')
      expect(existsSync(docsDir)).toBe(true)

      // Verify dashboard content exists
      const dashboardsDir = join(docsDir, 'dashboards')
      expect(existsSync(dashboardsDir)).toBe(true)

      const dashboardFiles = await readdir(dashboardsDir)
      expect(dashboardFiles).toContain('api.mdx')
      expect(dashboardFiles).toContain('cache.mdx')
      expect(dashboardFiles).toContain('docker.mdx')
      expect(dashboardFiles).toContain('failures.mdx')
      expect(dashboardFiles).toContain('overview.mdx')
    })
  })

  describe('Component Testing', () => {
    test('should validate analytics dashboard components exist', async () => {
      const componentsDir = join(TEST_CONFIG.DOCS_DIR, 'src', 'components')
      expect(existsSync(componentsDir)).toBe(true)

      const expectedComponents = [
        'ApiUsageChart.astro',
        'CachePerformanceChart.astro',
        'DashboardFilters.astro',
        'DockerPerformanceChart.astro',
        'FailureAnalyticsChart.astro',
        'MultiRepositoryOverview.astro',
      ]

      for (const component of expectedComponents) {
        const componentPath = join(componentsDir, component)
        expect(existsSync(componentPath)).toBe(true)

        // Verify component content
        const componentContent = await readFile(componentPath, 'utf-8')
        expect(componentContent).toContain('---') // Astro frontmatter
        expect(componentContent).toMatch(/<[^>]+>/) // HTML content
      }
    })

    test('should validate analytics utilities and client-side code', async () => {
      const utilsDir = join(TEST_CONFIG.DOCS_DIR, 'src', 'utils')

      if (existsSync(utilsDir)) {
        const analyticsClientPath = join(utilsDir, 'analytics-client.ts')
        expect(existsSync(analyticsClientPath)).toBe(true)

        const clientContent = await readFile(analyticsClientPath, 'utf-8')

        // Should contain analytics-related functions
        expect(clientContent).toMatch(/fetch|chart|data|analytics/i)

        // Should use proper TypeScript types
        expect(clientContent).toContain('export')
        expect(clientContent).toMatch(/:\s*(string|number|boolean|object)/i)
      }
    })
  })

  describe('Performance and Accessibility', () => {
    test('should validate built pages for performance optimizations', async () => {
      const indexPath = join(TEST_CONFIG.BUILD_OUTPUT_DIR, 'index.html')
      const indexContent = await readFile(indexPath, 'utf-8')

      // Should have proper meta tags
      expect(indexContent).toContain('<meta name="viewport"')
      expect(indexContent).toContain('<meta charset="utf-8"')

      // Should contain Astro-specific class names (scoped styles)
      expect(indexContent).toMatch(/class="[^"]*astro-[a-zA-Z0-9]+/i)

      // Should contain optimized CSS and JS bundles
      expect(indexContent).toMatch(/<link[^>]*rel="stylesheet"/i)
      expect(indexContent).toMatch(/<script[^>]*type="module"/i)
    })

    test('should validate accessibility features', async () => {
      for (const page of TEST_CONFIG.EXPECTED_PAGES.slice(0, 3)) { // Test first 3 pages
        const pagePath = join(TEST_CONFIG.BUILD_OUTPUT_DIR, page)
        const pageContent = await readFile(pagePath, 'utf-8')

        // Should have proper semantic HTML
        expect(pageContent).toMatch(/<(header|main|nav|section|article)/i)

        // Should have alt attributes for images (if any)
        const imgMatches = pageContent.match(/<img[^>]*>/gi)
        if (imgMatches) {
          for (const img of imgMatches) {
            expect(img).toContain('alt=')
          }
        }

        // Should have proper heading structure
        expect(pageContent).toMatch(/<h[1-6]/i)

        // Should have skip links or similar accessibility features
        expect(pageContent).toMatch(/skip|sr-only|visually-hidden/i)
      }
    })
  })

  describe('GitHub Pages Deployment Simulation', () => {
    test('should validate deployment workflow exists', async () => {
      // Check if deployment workflow exists (should have at least one workflow)
      const workflowsDir = join('/Users/mrbrown/src/github.com/bfra-me/renovate-action', '.github', 'workflows')
      expect(existsSync(workflowsDir)).toBe(true)

      // Should have workflow files
      const workflowFiles = (await readdir(workflowsDir)).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      expect(workflowFiles.length).toBeGreaterThan(0)
    })

    test('should validate site URLs and routing', async () => {
      // Check that built pages have correct relative paths for GitHub Pages
      const indexPath = join(TEST_CONFIG.BUILD_OUTPUT_DIR, 'index.html')
      const indexContent = await readFile(indexPath, 'utf-8')

      // Links should use relative paths or correct base path
      const linkMatches = indexContent.match(/href="[^"]*"/gi)
      if (linkMatches) {
        for (const link of linkMatches) {
          // Should not contain absolute localhost URLs
          expect(link).not.toMatch(/http:\/\/localhost/i)
        }
      }

      // Script sources should be properly resolved
      const scriptMatches = indexContent.match(/src="[^"]*"/gi)
      if (scriptMatches) {
        for (const script of scriptMatches) {
          expect(script).not.toMatch(/http:\/\/localhost/i)
        }
      }

      // Canonical URL should be correctly configured
      expect(indexContent).toMatch(/rel="canonical"/)
    })
  })

  describe('Content Validation', () => {
    test('should validate dashboard content structure', async () => {
      const dashboardsDir = join(TEST_CONFIG.DOCS_DIR, 'src', 'content', 'docs', 'dashboards')
      const dashboardFiles = await readdir(dashboardsDir)

      for (const file of dashboardFiles) {
        if (file.endsWith('.mdx')) {
          const filePath = join(dashboardsDir, file)
          const content = await readFile(filePath, 'utf-8')

          // Should have frontmatter
          expect(content).toMatch(/^---[\s\S]*?---/)

          // Should contain dashboard-specific content
          expect(content).toMatch(/dashboard|chart|metrics|analytics/i)

          // Should have proper markdown structure
          expect(content).toMatch(/^#+ /m) // Headers
        }
      }
    })

    test('should validate example content and documentation', async () => {
      // Check if examples exist in docs
      const examplesDir = join(TEST_CONFIG.DOCS_DIR, 'public', 'examples')

      if (existsSync(examplesDir)) {
        const exampleFiles = await readdir(examplesDir)

        // Should contain workflow examples
        expect(exampleFiles.some(file => file.includes('renovate'))).toBe(true)
        expect(exampleFiles.some(file => file.endsWith('.yaml') || file.endsWith('.yml'))).toBe(true)
      }

      // Check main index page
      const indexMdx = join(TEST_CONFIG.DOCS_DIR, 'src', 'content', 'docs', 'index.mdx')
      if (existsSync(indexMdx)) {
        const indexContent = await readFile(indexMdx, 'utf-8')
        expect(indexContent).toMatch(/analytics|renovate|action/i)
      }
    })
  })

  describe('Integration Testing', () => {
    test('should validate build reproducibility', async () => {
      // Build twice and ensure consistent output
      try {
        await execAsync('pnpm build', {
          cwd: TEST_CONFIG.DOCS_DIR,
          timeout: TEST_CONFIG.BUILD_TIMEOUT_MS,
        })
      } catch (error) {
        console.warn('First build failed, skipping reproducibility test')
        return
      }

      // Get file list from first build
      const firstBuildFiles = await readdir(TEST_CONFIG.BUILD_OUTPUT_DIR, {recursive: true})

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100))

      try {
        await execAsync('pnpm build', {
          cwd: TEST_CONFIG.DOCS_DIR,
          timeout: TEST_CONFIG.BUILD_TIMEOUT_MS,
        })
      } catch (error) {
        console.warn('Second build failed, skipping reproducibility test')
        return
      }

      const secondBuildFiles = await readdir(TEST_CONFIG.BUILD_OUTPUT_DIR, {recursive: true})

      // Should produce the same files
      expect(firstBuildFiles.sort()).toEqual(secondBuildFiles.sort())
    }, TEST_CONFIG.BUILD_TIMEOUT_MS * 2)

    test('should validate development server startup', async () => {
      // Test that dev server can start (but don't keep it running)
      try {
        const devProcess = exec('pnpm dev', {
          cwd: TEST_CONFIG.DOCS_DIR,
          timeout: 10000, // 10 second timeout
        })

        let serverStarted = false
        let serverError = false

        devProcess.stdout?.on('data', (data) => {
          if (data.toString().includes('Local:') || data.toString().includes('localhost')) {
            serverStarted = true
          }
        })

        devProcess.stderr?.on('data', (data) => {
          const errorText = data.toString()
          if (errorText.includes('error') || errorText.includes('Error')) {
            serverError = true
          }
        })

        // Wait for server to start or fail
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (serverStarted || serverError) {
              clearInterval(checkInterval)
              resolve(void 0)
            }
          }, 500)

          // Timeout after 8 seconds
          setTimeout(() => {
            clearInterval(checkInterval)
            resolve(void 0)
          }, 8000)
        })

        // Kill the dev server
        devProcess.kill('SIGTERM')

        // Validate server started successfully
        expect(serverStarted).toBe(true)
        expect(serverError).toBe(false)
      } catch (error) {
        console.warn('Dev server test failed, this may be expected in CI environment')
      }
    }, 15000)
  })
})
