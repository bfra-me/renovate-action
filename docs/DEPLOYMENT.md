# Analytics Dashboard Deployment

This document outlines the automated deployment workflow for the Renovate Action Analytics Dashboard.

## GitHub Actions Workflow

The dashboard is automatically deployed to GitHub Pages using the workflow defined in [`.github/workflows/deploy-docs.yaml`](../.github/workflows/deploy-docs.yaml).

### Deployment Process

1. **Trigger Events:**
   - Push to `main` branch (when `docs/**` files change)
   - Pull requests targeting `main` (for build testing)
   - Manual workflow dispatch

2. **Build Process:**
   - Sets up Node.js 22 and pnpm
   - Installs dependencies with frozen lockfile
   - Configures GitHub Pages site and base path
   - Builds Astro site with production optimizations
   - Uploads build artifacts for deployment

3. **Deployment:**
   - Deploys to GitHub Pages environment
   - Accessible at: `https://bfra-me.github.io/renovate-action`

### Quality Gates

The workflow includes comprehensive testing:

- **Type Checking:** `astro check` + `tsc --noEmit`
- **Build Validation:** Successful static site generation
- **Preview Testing:** Basic HTTP accessibility check

### Configuration

Key configuration in `astro.config.mjs`:

```javascript
export default defineConfig({
  site: 'https://bfra-me.github.io',
  base: '/renovate-action',
  build: {
    assets: '_astro',
    inlineStylesheets: 'auto',
  }
})
```

### Manual Deployment

To deploy manually:

```bash
cd docs
pnpm install
pnpm run build
# Build artifacts in dist/ ready for GitHub Pages
```

### Troubleshooting

**Build Failures:**

- Check TypeScript compilation: `pnpm run check`
- Verify dependencies: `pnpm install --frozen-lockfile`
- Test local build: `pnpm run build`

**Analytics Data Errors:**

- Build-time API fetch failures are expected (no authentication)
- Site uses fallback mock data when real data unavailable
- Runtime data fetching occurs client-side with proper authentication

**Path Issues:**

- Ensure `base: '/renovate-action'` in astro.config.mjs
- Verify GitHub Pages source is set to "GitHub Actions"
- Check repository settings > Pages configuration

## Performance

The built site includes:

- **Optimized Assets:** Automatic asset bundling and compression
- **Code Splitting:** Separate chunks for Chart.js and analytics client
- **Search Integration:** Pagefind search index generation
- **Progressive Enhancement:** Components work without JavaScript

Build output typically:

- 12 static pages
- ~70KB Chart.js bundle (gzipped)
- ~14KB analytics client (gzipped)
- ~22KB UI core bundle (gzipped)
