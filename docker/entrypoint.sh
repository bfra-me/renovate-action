#!/bin/bash

set -Eeuo pipefail

# renovate: datasource=github-releases depName=mikefarah/yq
export YQ_VERSION=v4.44.2

curl -fsSL -o /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64
chmod a+x /usr/local/bin/yq
yq --version

# renovate: datasource=npm depName=pnpm
export PNPM_VERSION=9.12.0
install-tool pnpm $PNPM_VERSION

runuser -u ubuntu renovate
