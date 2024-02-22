#!/bin/bash

set -Eeuo pipefail

# TODO: Remove debugging
env | sort
[ -d /tmp/renovate ] && ls -al /tmp/renovate

# renovate: datasource=github-releases depName=mikefarah/yq
export YQ_VERSION=v4.41.1

curl -fsSL -o /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64
chmod a+x /usr/local/bin/yq
yq --version

runuser -u ubuntu renovate
