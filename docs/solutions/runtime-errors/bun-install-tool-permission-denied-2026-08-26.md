---
title: Bun install-tool fails with EACCES after a manual install squats Containerbase's bin
date: 2026-08-26
category: runtime-errors
module: docker/entrypoint.sh
problem_type: runtime_error
component: tooling
symptoms:
  - "install-tool bun fails with EACCES: permission denied, open '/opt/containerbase/bin/bun'"
  - Renovate's renovate/artifacts step fails for Bun lockfile updates
  - Node.js, pnpm, and Yarn are unaffected
root_cause: incomplete_setup
resolution_type: code_fix
severity: high
related_components:
  - action.yaml
  - containerbase
tags:
  - bun
  - renovate
  - containerbase
  - install-tool
  - docker
  - permissions
---

## Problem

Renovate could not update Bun lockfiles. Whenever its Bun manager tried to provision a constrained Bun version at artifact-update time, `install-tool` failed with a permission error — even though Bun was demonstrably installed and working in the container.

## Symptoms

```text
[19:52:05.801] INFO (16): Installing tool bun@1.3.14...
[19:52:09.447] ERROR (16): EACCES: permission denied, open '/opt/containerbase/bin/bun'
[19:52:09.447] FATAL (16): Install tool bun failed in 3.6s.
EXIT=1
```

- Surfaced as `renovate/artifacts` failures on Bun dependency PRs.
- `bun --version` worked fine inside the container, which made the failure look unrelated to the entrypoint.
- Node.js, pnpm, and Yarn were never affected.

## What Didn't Work

- **"The Bun release assets Containerbase fetches are missing or the URL is wrong."** Falsified immediately — the archives exist and their `SHASUMS256.txt` checksums validate.

- **"Bun isn't registered in Containerbase's version database, so the runtime install takes an unexercised non-root path."** The registration observation was correct, but it was not the failure mechanism. In the _stock_ image, `install-tool bun 1.3.14` as `ubuntu` succeeds — and `/opt/containerbase/tools` has no `bun` entry there either.

- **"Starting the container as root and dropping to `ubuntu` via `runuser` breaks it."** Falsified by control: root start plus `runuser -u ubuntu -- install-tool bun`, _without_ the manual install, exits 0.

- **"Set `binarySource=global` so Renovate uses the preinstalled Bun."** Rejected. Renovate documents that `global` disables tool-version constraint enforcement. It hides the symptom by trading away version correctness — the obvious workaround was worse than the bug.

One variable at a time, same command each row:

| Setup                                               | `install-tool bun 1.3.14` as `ubuntu` |
| --------------------------------------------------- | ------------------------------------- |
| Stock image                                         | exit 0                                |
| Root start + `runuser -u ubuntu`, no manual install | exit 0                                |
| Root start + the entrypoint's manual install first  | EACCES                                |

## Solution

Before — hand-rolled download writing straight into `/usr/local/bin`:

```bash
if curl -fsSL -o bun-linux-x64.zip https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-x64.zip; then
  unzip bun-linux-x64.zip -d /tmp/bun
  rm bun-linux-x64.zip
  mv /tmp/bun/bun-linux-x64/bun /usr/local/bin/bun
  chmod a+x /usr/local/bin/bun
  ln -sf /usr/local/bin/bun /usr/local/bin/bunx
  bun --version
  echo "✅ Bun installation completed successfully"
else
  error_msg="Failed to download or install Bun"
  record_failure "${error_msg}" "docker" "docker-issues" "true" "{\"tool\":\"bun\",\"version\":\"${BUN_VERSION}\"}"
  echo "❌ Bun installation failed"
  exit 1
fi
```

After — delegate to Containerbase, with an action-owned `bunx` shim placed outside Containerbase's managed directory:

```bash
# renovate: datasource=npm depName=bun
export BUN_VERSION=1.4.0

echo "Installing Bun ${BUN_VERSION}..."
start_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

if install-tool bun $BUN_VERSION; then
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  cat > /usr/local/sbin/bunx <<'EOF'
#!/bin/bash
exec bun x "$@"
EOF
  chmod a+x /usr/local/sbin/bunx
  record_docker_metric "tool-install" "bun" "${BUN_VERSION}" "${start_time}" "${end_time}" "true"
  echo "✅ Bun installation completed successfully"
else
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  error_msg="Failed to install Bun"
  record_docker_metric "tool-install" "bun" "${BUN_VERSION}" "${start_time}" "${end_time}" "false" "${error_msg}"
  record_failure "${error_msg}" "docker" "docker-issues" "true" "{\"tool\":\"bun\",\"version\":\"${BUN_VERSION}\"}"
  echo "❌ Bun installation failed"
  exit 1
fi
```

- **`bunx` is a shim, not a symlink.** Containerbase ships no `bunx`, and its generated `bun` wrapper hardcodes `/opt/containerbase/tools/bun/<version>/bin/bun "$@"` — it discards `argv[0]`. Real Bun dispatches bunx mode _on_ `argv[0]`, so a symlink named `bunx` pointing at the wrapper would silently behave as plain `bun`. `bun x` and native `bunx` share the same parser, so `--bun`, `-p/--package`, `--no-install`, `--silent`, and `--` all forward correctly.
- **The shim goes to `/usr/local/sbin`,** not `/usr/local/bin`, so it does not recreate the same squat. `/usr/local/sbin` is a real root-owned directory and precedes `/usr/local/bin` on `PATH` for both root and `ubuntu` under `runuser`.
- **The shim is written before the success metric.** Under `set -Eeuo pipefail`, a failed shim write would otherwise abort the entrypoint _after_ reporting a successful Bun install and without calling `record_failure`.

## Why This Works

In the Renovate image, `/usr/local/bin` is a symlink to `/opt/containerbase/bin`:

```console
$ ls -ld /usr/local/bin
lrwxrwxrwx 1 root root 22 /usr/local/bin -> /opt/containerbase/bin
```

So `mv ... /usr/local/bin/bun` as root created `/opt/containerbase/bin/bun` owned `root:root 0755` — the exact path Containerbase's `install-tool` `link()` writes its wrapper to.

Renovate runs as `ubuntu` (uid 12021, gid 0) via `runuser -u ubuntu renovate`. `/opt/containerbase/bin` is `drwxrwxr-x root root`, group-writable, which is why a clean `install-tool` as `ubuntu` normally works. But Containerbase `open()`s the wrapper path for writing rather than unlinking first, and `ubuntu` cannot write a root-owned `0755` file. Hence `EACCES`.

Node.js, pnpm, and Yarn were immune for one reason only: they already went through `install-tool`, so their wrappers were created by Containerbase and left owned `ubuntu:root 0775`.

Routing Bun through `install-tool` puts the whole lifecycle back under Containerbase — registered in its version database, wrapper owned by `ubuntu` — so runtime constrained installs can replace it.

## Prevention

- **Never write to `/usr/local/bin` in a Containerbase-derived image without checking what it resolves to.**

  ```bash
  test "$(readlink -f /usr/local/bin)" = /opt/containerbase/bin && echo "squat risk: writes here land in Containerbase's managed bin"
  ```

- **Use `install-tool` for anything Containerbase manages.** Hand-rolled installs bypass its version database, so `isInstalled()` never sees them and the runtime install path stays unexercised until it fails in production.

  ```bash
  install-tool bun "${BUN_VERSION}"
  install-tool node "${NODE_VERSION}"
  install-tool pnpm "${PNPM_VERSION}"
  ```

- **Put action-owned shims in `/usr/local/sbin`.** It precedes `/usr/local/bin` on `PATH` and is not Containerbase-managed.

- **Detect the squat class directly.** Any root-owned file at a path Containerbase links will reproduce this:

  ```bash
  docker run --rm --user root --entrypoint bash ghcr.io/renovatebot/renovate:44.42.0 -c '
    printf "#!/bin/sh\n" > /opt/containerbase/bin/bun
    runuser -u ubuntu -- install-tool bun 1.3.14'
  ```

- **Record success only after the whole setup step succeeds**, not immediately after the primary command.

- **Verify runtime changes on `main`, not on the PR.** The `Self-test` step lives in the **Test** job of `.github/workflows/main.yaml` and is gated on push-to-default-branch, so `action.yaml` and `docker/**` changes are never exercised end-to-end by PR CI. Reproduce locally against the pinned image before merging.

## Related Issues

- [#3436](https://github.com/bfra-me/renovate-action/issues/3436) — the original report, closed by this fix
- [#3686](https://github.com/bfra-me/renovate-action/pull/3686) — the fix (merge `1fb6f6d7`, released in `v10.21.4`)
- [#3687](https://github.com/bfra-me/renovate-action/issues/3687) — `yq` was hand-installed to `/usr/local/bin/yq`, the same squat class. Inert only because Containerbase ships no `yq` tool; moved to `/usr/local/sbin/yq` before it could bite.
