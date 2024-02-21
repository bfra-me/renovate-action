#!/bin/bash

set -euo pipefail

# renovate: datasource=github-tags depName=mikefarah/yq
export YQ_VERSION=v4

apt update

apt install -y curl jq

curl -fsSL -o /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64
chmod a+x /usr/local/bin/yq

runuser -u ubuntu renovate
