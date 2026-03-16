# Documentation Deployment

This document outlines GitHub Pages deployment for this documentation site.

## Build and deploy

1. Build docs using Astro/Starlight.
2. Upload artifacts from `docs/dist`.
3. Deploy artifacts to GitHub Pages.

## Local commands

```bash
cd docs
pnpm install
pnpm run build
```

## Notes

- This site no longer hosts analytics dashboards.
- See `README.md` for v9 migration and deprecation notes.
