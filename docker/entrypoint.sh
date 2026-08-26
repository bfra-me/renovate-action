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

  OPERATION="$operation" \
  TOOL="$tool" \
  VERSION="$version" \
  START_TIME="$start_time" \
  END_TIME="$end_time" \
  SUCCESS="$success" \
  ERROR="$error" \
  node --input-type=module -e '
  import fs from "node:fs";
  import path from "node:path";

  const analyticsDir = "/tmp/renovate-analytics";
  if (!fs.existsSync(analyticsDir)) {
    fs.mkdirSync(analyticsDir, { recursive: true });
  }

  const duration = new Date(process.env.END_TIME).getTime() - new Date(process.env.START_TIME).getTime();

  const dockerMetric = {
    operation: process.env.OPERATION,
    tool: process.env.TOOL || undefined,
    toolVersion: process.env.VERSION || undefined,
    startTime: process.env.START_TIME,
    endTime: process.env.END_TIME,
    duration: duration,
    success: process.env.SUCCESS === "true",
    error: process.env.ERROR || undefined,
    metadata: {
      containerUser: "ubuntu",
      workingDir: process.cwd()
    }
  };

  const metricsFile = path.join(analyticsDir, "docker-metrics.json");
  let existingMetrics = [];

  try {
    if (fs.existsSync(metricsFile)) {
      existingMetrics = JSON.parse(fs.readFileSync(metricsFile, "utf8"));
    }
  } catch (error) {
    console.log("Creating new docker metrics file");
  }

  existingMetrics.push(dockerMetric);
  fs.writeFileSync(metricsFile, JSON.stringify(existingMetrics, null, 2));

  console.log("Recorded Docker metric:", JSON.stringify(dockerMetric, null, 2));
  '
}

# Function to record failure scenarios
record_failure() {
  local message="$1"
  local component="$2"
  local category="${3:-unknown}"
  local recoverable="${4:-false}"
  local context="${5:-}"

  MESSAGE="$message" \
  COMPONENT="$component" \
  CATEGORY="$category" \
  RECOVERABLE="$recoverable" \
  CONTEXT="$context" \
  node --input-type=module -e '
  import fs from "node:fs";
  import path from "node:path";

  const analyticsDir = "/tmp/renovate-analytics";
  if (!fs.existsSync(analyticsDir)) {
    fs.mkdirSync(analyticsDir, { recursive: true });
  }

  let contextValue = {};
  try {
    contextValue = JSON.parse(process.env.CONTEXT || "{}");
  } catch {
    contextValue = {};
  }

  const failureMetric = {
    category: process.env.CATEGORY,
    type: "docker-execution-error",
    timestamp: new Date().toISOString(),
    message: process.env.MESSAGE,
    component: process.env.COMPONENT,
    recoverable: process.env.RECOVERABLE === "true",
    context: contextValue
  };

  const metricsFile = path.join(analyticsDir, "failure-metrics.json");
  let existingMetrics = [];

  try {
    if (fs.existsSync(metricsFile)) {
      existingMetrics = JSON.parse(fs.readFileSync(metricsFile, "utf8"));
    }
  } catch (error) {
    console.log("Creating new failure metrics file");
  }

  existingMetrics.push(failureMetric);
  fs.writeFileSync(metricsFile, JSON.stringify(existingMetrics, null, 2));

  console.log("Recorded failure metric:", JSON.stringify(failureMetric, null, 2));
  '
}

# renovate: datasource=github-releases depName=mikefarah/yq
export YQ_VERSION=v4.53.6

echo "Installing yq ${YQ_VERSION}..."
start_time=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

if curl -fsSL -o /usr/local/sbin/yq https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64; then
  chmod a+x /usr/local/sbin/yq
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
export NODE_VERSION=24.20.0

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

# renovate: datasource=npm depName=pnpm
export PNPM_VERSION=11.23.0

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
export YARN_VERSION=4.18.0

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
