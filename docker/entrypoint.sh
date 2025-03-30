#!/bin/bash

set -Eeuo pipefail

# renovate: datasource=github-releases depName=mikefarah/yq
export YQ_VERSION=v4.45.1

curl -fsSL -o /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64
chmod a+x /usr/local/bin/yq
yq --version

# renovate: datasource=node-version
export NODE_VERSION=22.11.0
install-tool node $NODE_VERSION

# renovate: datasource=npm depName=pnpm
export PNPM_VERSION=10.7.0
install-tool pnpm $PNPM_VERSION

# renovate: datasource=npm packageName=@yarnpkg/cli-dist
export YARN_VERSION=4.8.1
install-tool yarn $YARN_VERSION

[ ! -d /tmp/renovate ] && mkdir /tmp/renovate
chown -R ubuntu:ubuntu /tmp/renovate
runuser -u ubuntu renovate
