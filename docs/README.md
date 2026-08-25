# Renovate Action documentation

This directory contains the Astro/Starlight documentation site for the current v9 GitHub Action. The active user entrypoint is the [Usage guide](src/content/docs/guides/usage.md). Runtime behavior remains authoritative in [`action.yaml`](../action.yaml) and [`docker/entrypoint.sh`](../docker/entrypoint.sh); the docs explain how to use that behavior and should not replace those files as specifications.

## Workspace structure

```text
docs/
├── src/content/docs/    # Markdown and MDX routes
├── public/              # Static site assets
├── astro.config.mjs     # Site and sidebar configuration
├── package.json         # Docs workspace commands
└── DEPLOYMENT.md        # GitHub Pages deployment handoff
```

Files under `src/content/docs/` become routes based on their paths. The `guides/` directory contains maintained user guidance. The `legacy/` directory contains retained historical material and is not current runtime authority.

## Local workflow

Run these commands from `docs/`:

| Command        | Purpose                                      |
| -------------- | -------------------------------------------- |
| `pnpm install` | Install the docs workspace dependencies.     |
| `pnpm dev`     | Start the local Astro development server.    |
| `pnpm check`   | Run Astro/Starlight content and type checks. |
| `pnpm build`   | Build the production site into `docs/dist`.  |
| `pnpm preview` | Preview the production build locally.        |

From the repository root, `pnpm check-docs` runs the docs check through the workspace filter. Use `pnpm build` when validating the complete repository build.

## Deployment handoff

The production site is deployed to GitHub Pages from the built `docs/dist` artifacts. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the deployment steps. Content changes should remain limited to documentation files; runtime, workflow, and deployment-policy changes are outside this workspace README's scope.
