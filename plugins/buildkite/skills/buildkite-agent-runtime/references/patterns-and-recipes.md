# Patterns and Recipes

Advanced usage patterns combining multiple `buildkite-agent` runtime subcommands. Each recipe shows a real-world scenario with complete, copy-pasteable code.

---

## Test failure annotation with artifact links

Annotate the build page with a formatted test failure summary and link to the uploaded report.

```bash
#!/bin/bash
set -euo pipefail

# Run tests and capture output
if ! make test 2>&1 | tee test-output.txt; then
  # Upload the full test output as an artifact
  buildkite-agent artifact upload "test-output.txt"

  # Count failures for the summary
  FAIL_COUNT=$(grep -c "FAIL" test-output.txt || true)

  # Create a rich annotation with failure details and artifact link
  buildkite-agent annotate --style "error" --context "test-failures" <<EOF
## :x: ${FAIL_COUNT} test(s) failed

<details>
<summary>Failure summary (click to expand)</summary>

\`\`\`
$(grep -A 3 "FAIL" test-output.txt | head -50)
\`\`\`

</details>

Full output: <a href="artifact://test-output.txt">test-output.txt</a>
EOF
  exit 1
fi

# Success annotation
buildkite-agent annotate ":white_check_mark: All tests passed" \
  --style "success" --context "test-failures"
```

Pipeline YAML:

```yaml
steps:
  - label: ":test_tube: Tests"
    command: ".buildkite/scripts/test-with-annotations.sh"
    artifact_paths: "test-output.txt"
```

---

## Progressive annotation with parallel jobs

Each parallel job appends its results to a shared annotation. The final step summarizes.

```yaml
steps:
  - label: ":rspec: Tests %n"
    command: ".buildkite/scripts/test-parallel.sh"
    parallelism: 4

  - wait: ~
    continue_on_failure: true

  - label: ":bar_chart: Summary"
    command: ".buildkite/scripts/test-summary.sh"
```

test-parallel.sh:

```bash
#!/bin/bash
set -euo pipefail

JOB_INDEX="${BUILDKITE_PARALLEL_JOB}"
TOTAL="${BUILDKITE_PARALLEL_JOB_COUNT}"

# Run this job's slice of the test suite
bundle exec rspec $(./scripts/split-tests.sh "$JOB_INDEX" "$TOTAL") \
  --format json --out "results-${JOB_INDEX}.json" \
  --format progress || true

# Upload results as artifact
buildkite-agent artifact upload "results-${JOB_INDEX}.json"

# Store pass/fail in meta-data
if jq -e '.summary.failure_count == 0' "results-${JOB_INDEX}.json" > /dev/null; then
  buildkite-agent meta-data set "test-result-${JOB_INDEX}" "passed"
else
  FAILURES=$(jq '.summary.failure_count' "results-${JOB_INDEX}.json")
  buildkite-agent meta-data set "test-result-${JOB_INDEX}" "failed:${FAILURES}"
fi

# Append this job's result to the shared annotation
buildkite-agent annotate --style "info" --context "test-progress" --append <<EOF
- Job ${JOB_INDEX}/$((TOTAL - 1)): $(buildkite-agent meta-data get "test-result-${JOB_INDEX}")
EOF
```

test-summary.sh:

```bash
#!/bin/bash
set -euo pipefail

TOTAL="${BUILDKITE_PARALLEL_JOB_COUNT:-4}"
PASSED=0
FAILED=0
FAILURE_DETAILS=""

for i in $(seq 0 $((TOTAL - 1))); do
  RESULT=$(buildkite-agent meta-data get "test-result-${i}")
  if [[ "$RESULT" == "passed" ]]; then
    ((PASSED++))
  else
    ((FAILED++))
    COUNT="${RESULT#failed:}"
    FAILURE_DETAILS="${FAILURE_DETAILS}\n- Job ${i}: ${COUNT} failures"
  fi
done

if [[ "$FAILED" -eq 0 ]]; then
  buildkite-agent annotate --style "success" --context "test-summary" <<EOF
## :white_check_mark: All ${PASSED} test jobs passed
EOF
else
  buildkite-agent annotate --style "error" --context "test-summary" <<EOF
## :x: ${FAILED}/${TOTAL} test jobs had failures
${FAILURE_DETAILS}
EOF
  exit 1
fi
```

---

## Cross-job state machine with meta-data and pipeline upload

A build where early steps determine what runs later by setting meta-data and dynamically uploading pipelines.

```yaml
steps:
  - label: ":mag: Analyze"
    command: ".buildkite/scripts/analyze.sh"

  - wait

  - label: ":pipeline: Plan"
    command: ".buildkite/scripts/plan.sh"
```

analyze.sh:

```bash
#!/bin/bash
set -euo pipefail

# Detect what changed
CHANGED=$(git diff --name-only HEAD~1)

# Classify changes and store as meta-data
if echo "$CHANGED" | grep -q "^src/"; then
  buildkite-agent meta-data set "needs-build" "true"
else
  buildkite-agent meta-data set "needs-build" "false"
fi

if echo "$CHANGED" | grep -q "^test/\|^spec/"; then
  buildkite-agent meta-data set "needs-test" "true"
else
  buildkite-agent meta-data set "needs-test" "false"
fi

if echo "$CHANGED" | grep -qE "^(Dockerfile|docker-compose)"; then
  buildkite-agent meta-data set "needs-docker" "true"
else
  buildkite-agent meta-data set "needs-docker" "false"
fi
```

plan.sh:

```bash
#!/bin/bash
set -euo pipefail

NEEDS_BUILD=$(buildkite-agent meta-data get "needs-build")
NEEDS_TEST=$(buildkite-agent meta-data get "needs-test")
NEEDS_DOCKER=$(buildkite-agent meta-data get "needs-docker")

# Build pipeline YAML based on analysis results
PIPELINE="steps:"

if [[ "$NEEDS_BUILD" == "true" ]]; then
  PIPELINE="${PIPELINE}
  - label: ':hammer: Build'
    key: 'build'
    command: 'make build'"
fi

if [[ "$NEEDS_TEST" == "true" ]]; then
  PIPELINE="${PIPELINE}
  - label: ':test_tube: Test'
    key: 'test'
    command: 'make test'
    depends_on: 'build'"
fi

if [[ "$NEEDS_DOCKER" == "true" ]]; then
  PIPELINE="${PIPELINE}
  - label: ':docker: Docker Build'
    key: 'docker'
    command: 'make docker-build'
    depends_on: 'build'"
fi

# If nothing changed that we care about, skip
if [[ "$PIPELINE" == "steps:" ]]; then
  PIPELINE="steps:
  - label: ':white_check_mark: Nothing to do'
    command: 'echo No relevant changes detected'"
fi

echo "$PIPELINE" | buildkite-agent pipeline upload
```

---

## Block step to meta-data to trigger

Collect user input via a block step, read the values from meta-data, and trigger a downstream pipeline.

```yaml
steps:
  - block: ":rocket: Deploy"
    prompt: "Choose deploy target"
    fields:
      - key: "deploy-env"
        text: "Environment"
        default: "staging"
        hint: "staging or production"
      - key: "deploy-version"
        text: "Version tag"
        required: true

  - label: ":pipeline: Trigger deploy"
    command: ".buildkite/scripts/trigger-deploy.sh"
```

trigger-deploy.sh:

```bash
#!/bin/bash
set -euo pipefail

# Block step field values are stored as meta-data automatically
ENV=$(buildkite-agent meta-data get "deploy-env")
VERSION=$(buildkite-agent meta-data get "deploy-version")

buildkite-agent annotate "Deploying ${VERSION} to ${ENV}" \
  --style "info" --context "deploy-trigger"

buildkite-agent pipeline upload <<YAML
steps:
  - trigger: "deploy-service"
    label: ":rocket: Deploy ${VERSION} to ${ENV}"
    build:
      branch: "${BUILDKITE_BRANCH}"
      message: "Deploy ${VERSION} to ${ENV}"
      meta_data:
        deploy-env: "${ENV}"
        deploy-version: "${VERSION}"
YAML
```

---

## OIDC-authenticated Docker push with secret redaction

Authenticate to a registry using OIDC, build and push an image, then annotate the build with the image tag.

```bash
#!/bin/bash
set -euo pipefail

REGISTRY="packages.buildkite.com/my-org/my-registry"
IMAGE_TAG="${REGISTRY}/myapp:${BUILDKITE_BUILD_NUMBER}"

# Request OIDC token and authenticate with the registry
buildkite-agent oidc request-token \
  --audience "https://${REGISTRY}" \
  --lifetime 300 \
  | docker login "${REGISTRY}" -u buildkite --password-stdin

# Build and push
docker build -t "${IMAGE_TAG}" .
docker push "${IMAGE_TAG}"

# Store the image tag for downstream jobs
buildkite-agent meta-data set "image-tag" "${IMAGE_TAG}"

# Annotate with the published image
buildkite-agent annotate --style "success" --context "docker-push" <<EOF
:docker: Published \`${IMAGE_TAG}\`
EOF
```

---

## OIDC with AWS role assumption

Request an OIDC token, exchange it for AWS credentials using STS, and redact the temporary credentials.

```bash
#!/bin/bash
set -euo pipefail

# Request OIDC token with AWS session tags
OIDC_TOKEN=$(buildkite-agent oidc request-token \
  --audience "sts.amazonaws.com" \
  --lifetime 300 \
  --aws-session-tag "organization_slug,pipeline_slug")

# Exchange for AWS credentials
AWS_CREDS=$(aws sts assume-role-with-web-identity \
  --role-arn "arn:aws:iam::123456789012:role/buildkite-deploy" \
  --role-session-name "buildkite-${BUILDKITE_BUILD_NUMBER}" \
  --web-identity-token "$OIDC_TOKEN" \
  --output json)

# Extract and redact credentials
export AWS_ACCESS_KEY_ID=$(echo "$AWS_CREDS" | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo "$AWS_CREDS" | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo "$AWS_CREDS" | jq -r '.Credentials.SessionToken')

echo "$AWS_SECRET_ACCESS_KEY" | buildkite-agent redactor add
echo "$AWS_SESSION_TOKEN" | buildkite-agent redactor add

# Now use AWS commands - credentials are redacted in logs
aws s3 cp build/app.tar.gz s3://deploy-bucket/releases/
```

---

## Parallel job coordination with locks

Multiple parallel jobs share a database, but only one should run migrations. Use `lock do/done` to ensure exactly-once execution.

```bash
#!/bin/bash
set -euo pipefail

# One-time database migration across parallel test jobs
echo "+++ Database setup"
if [[ $(buildkite-agent lock do "db-migrate") == "do" ]]; then
  echo "Running database migrations..."
  bundle exec rails db:migrate
  buildkite-agent meta-data set "db-ready" "true"
  buildkite-agent lock done "db-migrate"
else
  echo "Migrations already run by another job, waiting for completion..."
  # Poll until the migrating job marks the DB as ready
  while ! buildkite-agent meta-data exists "db-ready" 2>/dev/null; do
    sleep 2
  done
fi

echo "+++ Running tests"
bundle exec rspec $(./scripts/split-tests.sh "$BUILDKITE_PARALLEL_JOB" "$BUILDKITE_PARALLEL_JOB_COUNT")
```

---

## Exclusive deploy with acquire/release locks

Only one deploy runs at a time across parallel jobs, with guaranteed lock release via trap.

```bash
#!/bin/bash
set -euo pipefail

echo "+++ Acquiring deploy lock"
TOKEN=$(buildkite-agent lock acquire "deploy-production")
trap 'buildkite-agent lock release "deploy-production" "${TOKEN}"' EXIT

echo "+++ Deploying"
buildkite-agent step update "label" ":rocket: Deploying to production..."

./scripts/deploy.sh

buildkite-agent step update "label" ":white_check_mark: Deployed to production"
buildkite-agent annotate "Deployed at $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --style "success" --context "deploy"
```

---

## Environment debugging in hooks

Debug what lifecycle hooks are doing to the environment by dumping state at each stage.

environment hook (`.buildkite/hooks/environment`):

```bash
#!/bin/bash

# Set up shared variables
export APP_ENV="test"
export DATABASE_URL="postgres://localhost:5432/test"

# Dump environment state after this hook
if [[ "${BUILDKITE_AGENT_DEBUG:-}" == "true" ]]; then
  buildkite-agent env dump > /tmp/env-after-environment.json
fi
```

pre-command hook (`.buildkite/hooks/pre-command`):

```bash
#!/bin/bash

# Inject secrets
export SECRET_KEY=$(buildkite-agent secret get "SECRET_KEY")

if [[ "${BUILDKITE_AGENT_DEBUG:-}" == "true" ]]; then
  buildkite-agent env dump > /tmp/env-after-pre-command.json

  # Compare with environment hook (keys only - don't log values)
  echo "New vars added by pre-command hook:"
  diff <(jq -r 'keys[]' /tmp/env-after-environment.json) \
       <(jq -r 'keys[]' /tmp/env-after-pre-command.json) \
    | grep "^>" || echo "(none)"
fi
```

---

## Dynamic annotation dashboard

Build a live-updating dashboard annotation that multiple steps contribute to throughout a build.

```bash
# Step 1: Initialize the dashboard
buildkite-agent annotate --style "info" --context "dashboard" <<'EOF'
## Build Dashboard
| Stage | Status | Duration |
|-------|--------|----------|
EOF

# Helper function (include in each step that updates the dashboard)
update_dashboard() {
  local stage="$1" status="$2" duration="$3"
  buildkite-agent annotate --style "info" --context "dashboard" --append <<EOF
| ${stage} | ${status} | ${duration} |
EOF
}
```

Usage in each step:

```bash
#!/bin/bash
set -euo pipefail
source .buildkite/scripts/dashboard-helpers.sh

START=$(date +%s)
make lint
DURATION=$(($(date +%s) - START))

update_dashboard "Lint" ":white_check_mark:" "${DURATION}s"
```

---

## Secrets from external vault with redaction

Fetch secrets from HashiCorp Vault and redact them from build logs.

```bash
#!/bin/bash
set -euo pipefail

# Authenticate to Vault using Buildkite OIDC
VAULT_TOKEN=$(buildkite-agent oidc request-token --audience "https://vault.internal" \
  | vault write -field=token auth/jwt/login role=buildkite jwt=-)

echo "$VAULT_TOKEN" | buildkite-agent redactor add

# Fetch application secrets
DB_PASSWORD=$(VAULT_TOKEN="$VAULT_TOKEN" vault kv get -field=password secret/myapp/db)
API_KEY=$(VAULT_TOKEN="$VAULT_TOKEN" vault kv get -field=key secret/myapp/api)

# Redact both values
echo "$DB_PASSWORD" | buildkite-agent redactor add
echo "$API_KEY" | buildkite-agent redactor add

# Export for use (values are now redacted in any log output)
export DB_PASSWORD API_KEY

# Use them safely
./scripts/deploy.sh
```

---

## Artifact chain across builds

Upload artifacts in a build step, then download them in a triggered child pipeline.

Parent pipeline step:

```bash
#!/bin/bash
set -euo pipefail

# Build the artifact
make build
buildkite-agent artifact upload "dist/app.tar.gz"

# Store the build ID so the child pipeline can reference it
buildkite-agent meta-data set "artifact-build-id" "${BUILDKITE_BUILD_ID}"

# Trigger child pipeline, passing the build ID
buildkite-agent pipeline upload <<YAML
steps:
  - trigger: "deploy-pipeline"
    label: ":rocket: Deploy"
    build:
      message: "Deploy from build ${BUILDKITE_BUILD_NUMBER}"
      meta_data:
        parent-build-id: "${BUILDKITE_BUILD_ID}"
YAML
```

Child pipeline step:

```bash
#!/bin/bash
set -euo pipefail

# Get parent build ID from meta-data (passed via trigger step)
PARENT_BUILD=$(buildkite-agent meta-data get "parent-build-id")

# Download artifact from parent build
buildkite-agent artifact download "dist/app.tar.gz" . --build "${PARENT_BUILD}"

# Deploy it
tar xzf dist/app.tar.gz
./scripts/deploy.sh
```
