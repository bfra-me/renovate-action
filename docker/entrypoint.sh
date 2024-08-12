#!/bin/bash

set -Eeuo pipefail

# renovate: datasource=github-releases depName=mikefarah/yq
export YQ_VERSION=v4.44.2

curl -fsSL -o /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64
chmod a+x /usr/local/bin/yq
yq --version

# renovate: datasource=npm depName=pnpm
curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=9.7.0 sh -

runuser -u ubuntu renovate
