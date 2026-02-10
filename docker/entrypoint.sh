#!/bin/bash

set -Eeuo pipefail

# Initialize analytics directory
mkdir -p /tmp/renovate-analytics

# Function to record Docker metrics
record_docker_metric() {
  local operation="$1"
  local tool="${2:-}"
  local version="${3:-}"
  local start_time="$4"
  local end_time="$5"
  local success="$6"
  local error="${7:-}"

  node -e "
  const fs = require('fs');
  const path = require('path');

  const analyticsDir = '/tmp/renovate-analytics';
  if (!fs.existsSync(analyticsDir)) {
    fs.mkdirSync(analyticsDir, { recursive: true });
  }

  const duration = new Date('${end_time}').getTime() - new Date('${start_time}').getTime();

  const dockerMetric = {
    operation: '${operation}',
    tool: '${tool}' || undefined,
    toolVersion: '${version}' || undefined,
    startTime: '${start_time}',
    endTime: '${end_time}',
    duration: duration,
    success: ${success},
    error: '${error}' || undefined,
    metadata: {
      containerUser: 'ubuntu',
      workingDir: process.cwd()
    }
  };

  const metricsFile = path.join(analyticsDir, 'docker-metrics.json');
  let existingMetrics = [];

  try {
    if (fs.existsSync(metricsFile)) {
      existingMetrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
    }
  } catch (error) {
    console.log('Creating new docker metrics file');
  }

  existingMetrics.push(dockerMetric);
  fs.writeFileSync(metricsFile, JSON.stringify(existingMetrics, null, 2));

  console.log('Recorded Docker metric:', JSON.stringify(dockerMetric, null, 2));
  "
}

# Function to record failure scenarios
record_failure() {
  local message="$1"
  local component="$2"
  local category="${3:-unknown}"
  local recoverable="${4:-false}"
  local context="${5:-{}}"

  node -e "
  const fs = require('fs');
  const path = require('path');

  const analyticsDir = '/tmp/renovate-analytics';
  if (!fs.existsSync(analyticsDir)) {
    fs.mkdirSync(analyticsDir, { recursive: true });
  }

  const failureMetric = {
    category: '${category}',
    type: 'docker-execution-error',
    timestamp: new Date().toISOString(),
    message: '${message}',
    component: '${component}',
    recoverable: ${recoverable},
    context: ${context}
  };

  const metricsFile = path.join(analyticsDir, 'failure-metrics.json');
  let existingMetrics = [];

  try {
    if (fs.existsSync(metricsFile)) {
      existingMetrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
    }
  } catch (error) {
    console.log('Creating new failure metrics file');
  }

  existingMetrics.push(failureMetric);
  fs.writeFileSync(metricsFile, JSON.stringify(existingMetrics, null, 2));

  console.log('Recorded failure metric:', JSON.stringify(failureMetric, null, 2));
  "
}

# renovate: datasource=github-releases depName=mikefarah/yq
export YQ_VERSION=v4.52.2

echo "Installing yq ${YQ_VERSION}..."
start_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

if curl -fsSL -o /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64; then
  chmod a+x /usr/local/bin/yq
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  yq --version
  record_docker_metric "tool-install" "yq" "${YQ_VERSION}" "${start_time}" "${end_time}" "true"
  echo "✅ yq installation completed successfully"
else
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  error_msg="Failed to download or install yq"
  record_docker_metric "tool-install" "yq" "${YQ_VERSION}" "${start_time}" "${end_time}" "false" "${error_msg}"
  record_failure "${error_msg}" "docker" "docker-issues" "true" "{\"tool\":\"yq\",\"version\":\"${YQ_VERSION}\"}"
  echo "❌ yq installation failed"
  exit 1
fi

# renovate: datasource=node-version depName=node
export NODE_VERSION=24.13.1

echo "Installing Node.js ${NODE_VERSION}..."
start_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

if install-tool node $NODE_VERSION; then
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  record_docker_metric "tool-install" "node" "${NODE_VERSION}" "${start_time}" "${end_time}" "true"
  echo "✅ Node.js installation completed successfully"
else
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  error_msg="Failed to install Node.js"
  record_docker_metric "tool-install" "node" "${NODE_VERSION}" "${start_time}" "${end_time}" "false" "${error_msg}"
  record_failure "${error_msg}" "docker" "docker-issues" "true" "{\"tool\":\"node\",\"version\":\"${NODE_VERSION}\"}"
  echo "❌ Node.js installation failed"
  exit 1
fi

# renovate: datasource=github-releases depName=oven-sh/bun
export BUN_VERSION=bun-v1.3.6
echo "Installing Bun ${BUN_VERSION}..."

if curl -fsSL -o bun-linux-x64.zip https://github.com/oven-sh/bun/releases/download/${BUN_VERSION}/bun-linux-x64.zip; then
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

# renovate: datasource=npm depName=pnpm
export PNPM_VERSION=10.28.2

echo "Installing pnpm ${PNPM_VERSION}..."
start_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

if install-tool pnpm $PNPM_VERSION; then
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  record_docker_metric "tool-install" "pnpm" "${PNPM_VERSION}" "${start_time}" "${end_time}" "true"
  echo "✅ pnpm installation completed successfully"
else
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  error_msg="Failed to install pnpm"
  record_docker_metric "tool-install" "pnpm" "${PNPM_VERSION}" "${start_time}" "${end_time}" "false" "${error_msg}"
  record_failure "${error_msg}" "docker" "docker-issues" "true" "{\"tool\":\"pnpm\",\"version\":\"${PNPM_VERSION}\"}"
  echo "❌ pnpm installation failed"
  exit 1
fi

# renovate: datasource=npm packageName=@yarnpkg/cli-dist
export YARN_VERSION=4.12.0

echo "Installing Yarn ${YARN_VERSION}..."
start_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

if install-tool yarn $YARN_VERSION; then
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  record_docker_metric "tool-install" "yarn" "${YARN_VERSION}" "${start_time}" "${end_time}" "true"
  echo "✅ Yarn installation completed successfully"
else
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  error_msg="Failed to install Yarn"
  record_docker_metric "tool-install" "yarn" "${YARN_VERSION}" "${start_time}" "${end_time}" "false" "${error_msg}"
  record_failure "${error_msg}" "docker" "docker-issues" "true" "{\"tool\":\"yarn\",\"version\":\"${YARN_VERSION}\"}"
  echo "❌ Yarn installation failed"
  exit 1
fi

# Prepare renovate cache directory
echo "Preparing Renovate cache directory..."
start_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

[ ! -d /tmp/renovate ] && mkdir /tmp/renovate
if chown -R ubuntu:ubuntu /tmp/renovate; then
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  record_docker_metric "exec" "" "" "${start_time}" "${end_time}" "true"
  echo "✅ Cache directory preparation completed successfully"
else
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  error_msg="Failed to set cache directory ownership"
  record_docker_metric "exec" "" "" "${start_time}" "${end_time}" "false" "${error_msg}"
  record_failure "${error_msg}" "docker" "docker-issues" "false" "{\"operation\":\"chown\",\"directory\":\"/tmp/renovate\"}"
  echo "❌ Cache directory preparation failed"
fi

# Run Renovate as ubuntu user
echo "Starting Renovate execution..."
start_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

if runuser -u ubuntu renovate; then
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  record_docker_metric "run" "renovate" "${RENOVATE_VERSION:-unknown}" "${start_time}" "${end_time}" "true"
  echo "✅ Renovate execution completed successfully"
else
  exit_code=$?
  end_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  error_msg="Renovate execution failed with exit code ${exit_code}"
  record_docker_metric "run" "renovate" "${RENOVATE_VERSION:-unknown}" "${start_time}" "${end_time}" "false" "${error_msg}"
  record_failure "${error_msg}" "renovate" "unknown" "false" "{\"exitCode\":${exit_code},\"user\":\"ubuntu\"}"
  echo "❌ Renovate execution failed with exit code ${exit_code}"
  exit $exit_code
fi
