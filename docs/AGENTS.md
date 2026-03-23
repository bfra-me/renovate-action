# DOCS WORKSPACE

Astro/Starlight documentation site. Separate pnpm workspace package.

## OVERVIEW

Static docs site built with Astro + Starlight. Deployed to GitHub Pages from CI.

## STRUCTURE

```
docs/
├── src/content/docs/   # Markdown content (routes)
├── src/styles/          # Custom styles
├── public/              # Static assets + example configs
├── dist/                # Built output (NOT committed — built in CI)
├── astro.config.mjs     # Astro configuration
├── package.json         # Separate workspace dependencies
└── tsconfig.json        # Extends root with Astro type refs
```

## WHERE TO LOOK

| Task          | Location                                        | Notes                                            |
| ------------- | ----------------------------------------------- | ------------------------------------------------ |
| Add/edit docs | `src/content/docs/`                             | Markdown files become routes                     |
| Site config   | `astro.config.mjs`                              | Base path, integrations                          |
| Examples      | `public/examples/` + `src/content/docs/legacy/` | Config examples for users                        |
| Build         | `pnpm --filter docs run build`                  | Or from root: `pnpm build` runs workspace builds |

## CONVENTIONS

- Content in `src/content/docs/` — Starlight auto-generates nav from file structure.
- `dist/` is gitignored here (unlike root `dist/` which is committed).
- Preview tested in CI: build → serve → curl health check.

## COMMANDS

```bash
pnpm --filter docs run dev       # Local dev server (localhost:4321)
pnpm --filter docs run build     # Production build
pnpm --filter docs run check     # Astro type checking
pnpm --filter docs run preview   # Preview built site
```
