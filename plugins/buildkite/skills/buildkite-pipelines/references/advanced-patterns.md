# Advanced Pipeline Patterns

Complex patterns for dynamic pipelines, matrix builds, monorepo setups, and multi-stage workflows.

## Dynamic Pipeline Generator (Python)

Generate pipeline YAML based on git diff. Useful for monorepos where only changed services need testing:

```python
#!/usr/bin/env python3
"""Generate Buildkite pipeline steps for changed services."""
import subprocess
import sys
import yaml

def changed_files():
    result = subprocess.run(
        ["git", "diff", "--name-only", "HEAD~1"],
        capture_output=True, text=True, check=True
    )
    return result.stdout.strip().split("\n")

def affected_services(files):
    services = set()
    for f in files:
        parts = f.split("/")
        if len(parts) > 1 and parts[0] == "services":
            services.add(parts[1])
    return sorted(services)

def generate_pipeline(services):
    steps = []
    for svc in services:
        steps.append({
            "label": f":test_tube: {svc}",
            "command": f"cd services/{svc} && make test",
            "key": f"test-{svc}",
            "retry": {"automatic": [{"exit_status": -1, "limit": 2}]}
        })

    if steps:
        steps.append("wait")
        steps.append({
            "label": ":white_check_mark: All services passed",
            "command": "echo 'All tests passed'"
        })
    else:
        steps.append({
            "label": ":fast_forward: No services changed",
            "command": "echo 'No service changes detected, skipping tests'"
        })

    return yaml.dump({"steps": steps}, default_flow_style=False)

if __name__ == "__main__":
    files = changed_files()
    services = affected_services(files)
    print(generate_pipeline(services))
```

Use in pipeline:

```yaml
steps:
  - label: ":pipeline: Generate"
    command: ".buildkite/generate-pipeline.py | buildkite-agent pipeline upload"
```

## Dynamic Pipeline Generator (Bash)

Simpler alternative without Python dependency:

```bash
#!/bin/bash
set -euo pipefail

CHANGED=$(git diff --name-only HEAD~1)
STEPS=""

for dir in services/*/; do
  svc=$(basename "$dir")
  if echo "$CHANGED" | grep -q "^services/$svc/"; then
    STEPS="${STEPS}
  - label: ':test_tube: ${svc}'
    command: 'cd services/${svc} && make test'
    retry:
      automatic:
        - exit_status: -1
          limit: 2"
  fi
done

if [ -z "$STEPS" ]; then
  echo "steps:
  - label: ':fast_forward: Skip'
    command: 'echo No changes detected'"
else
  echo "steps:${STEPS}"
fi
```

## if_changed Patterns

Skip steps when relevant files haven't changed. Available on Buildkite-hosted agents:

### Basic include pattern

```yaml
steps:
  - label: ":nodejs: Frontend tests"
    command: "npm test"
    if_changed:
      - "src/frontend/*"
      - "package.json"
      - "package-lock.json"
```

### Exclude pattern (run unless only docs changed)

```yaml
steps:
  - label: ":hammer: Build"
    command: "make build"
    if_changed:
      on_changes_excluding:
        - "docs/*"
        - "*.md"
        - ".github/*"
```

### Monorepo patterns

```yaml
steps:
  - label: ":api: API tests"
    command: "cd api && make test"
    if_changed:
      - "api/*"
      - "shared/*"       # Shared libraries affect all services
      - "proto/*"         # Protobuf changes affect API

  - label: ":web: Web tests"
    command: "cd web && make test"
    if_changed:
      - "web/*"
      - "shared/*"
```

## Advanced Matrix Builds

### Matrix with adjustments and skips

```yaml
steps:
  - label: "Test {{matrix.lang}} {{matrix.version}}"
    command: "scripts/test-{{matrix.lang}}.sh"
    matrix:
      setup:
        lang:
          - "ruby"
          - "python"
          - "node"
        version:
          - "latest"
          - "previous"
      adjustments:
        - with:
            lang: "ruby"
            version: "previous"
          soft_fail: true           # Allow Ruby previous to fail
        - with:
            lang: "python"
            version: "previous"
          skip: "Python 3.11 EOL"   # Skip entirely with reason
```

### Matrix with per-combination environment variables

```yaml
steps:
  - label: "Build {{matrix.arch}}"
    command: "make build"
    matrix:
      setup:
        arch:
          - "amd64"
          - "arm64"
      adjustments:
        - with:
            arch: "arm64"
          env:
            CROSS_COMPILE: "aarch64-linux-gnu-"
            CGO_ENABLED: "0"
```

## Multi-Stage Pipeline (Build → Test → Deploy)

Complete pipeline with artifacts passed between stages:

```yaml
steps:
  - group: ":hammer: Build"
    steps:
      - label: "Compile"
        command: "make build"
        artifact_paths: "dist/*"
        key: "build"

  - wait

  - group: ":test_tube: Test"
    steps:
      - label: "Unit Tests"
        command: |
          buildkite-agent artifact download "dist/*" .
          make test-unit
        depends_on: "build"
        artifact_paths: "coverage/*"

      - label: "Integration Tests"
        command: |
          buildkite-agent artifact download "dist/*" .
          make test-integration
        depends_on: "build"

  - wait

  - block: ":shipit: Deploy to production?"
    branches: "main"

  - label: ":rocket: Deploy"
    command: |
      buildkite-agent artifact download "dist/*" .
      scripts/deploy.sh
    branches: "main"
    concurrency: 1
    concurrency_group: "deploy/production"
```

## Plugin Composition

Combine multiple plugins in a single step:

```yaml
steps:
  - label: ":docker: Build and Test"
    plugins:
      - docker-login#v2.1.0:
          username: myuser
          password-env: DOCKER_PASSWORD
      - docker-compose#v5.5.0:
          build: app
          image-repository: index.docker.io/org/repo
          cache-from:
            - "app:index.docker.io/org/repo:latest"
      - test-collector#v2.0.0:
          files: "tmp/junit-*.xml"
          format: "junit"
```

Plugins execute in order: login first, then compose build, then test collection.

## Notification Routing

Route notifications to different channels based on branch or build state:

```yaml
notify:
  - slack:
      channels:
        - "#deploys"
      message: ":rocket: Deploy build {{build.number}} {{build.state}}"
    if: build.branch == "main"

  - slack:
      channels:
        - "#ci-alerts"
      message: ":rotating_light: Build {{build.number}} failed on {{build.branch}}"
    if: build.state == "failed" && build.branch != "main"

  - email: "oncall@example.com"
    if: build.state == "failed" && build.branch == "main"

steps:
  - command: "make test"
```
