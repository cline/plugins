---
name: buildkite-agent-runtime
description: >
  This skill should be used when the user asks to "add an annotation",
  "upload artifacts from a step", "share data between steps", "upload pipeline
  dynamically", "request an OIDC token inside a step", "acquire a distributed lock",
  "get or update a step attribute", "redact a secret from logs", "retrieve a cluster
  secret at runtime", or "debug environment variables in hooks".
  Also use when the user mentions buildkite-agent annotate, buildkite-agent artifact
  upload/download, buildkite-agent meta-data set/get, buildkite-agent pipeline upload,
  buildkite-agent oidc request-token, buildkite-agent step, buildkite-agent lock,
  buildkite-agent env, buildkite-agent secret get, buildkite-agent redactor add,
  buildkite-agent tool sign/verify, or any buildkite-agent subcommand used inside
  a running job step.
---

# Buildkite Agent Runtime

The `buildkite-agent` binary provides subcommands for interacting with Buildkite from within running job steps - creating annotations, uploading artifacts, sharing state between jobs, generating dynamic pipelines, requesting OIDC tokens, and more. This skill covers the command syntax, flags, and patterns for every in-job subcommand.

Commands in this skill run inside Buildkite jobs and can modify build state, upload artifacts, expose logs, or retrieve secrets. When adapting examples, avoid printing full environment dumps or secret values, and require explicit user approval before adding pipeline uploads, cancellations, secret reads, or artifact transfers to a real pipeline.

## Quick Start

A step that runs tests, annotates failures, uploads coverage, and stores a result flag for downstream jobs:

```yaml
steps:
  - label: ":test_tube: Tests"
    command: |
      if ! make test 2>&1 | tee test-output.txt; then
        buildkite-agent annotate --style "error" --context "test-failures" < test-output.txt
        buildkite-agent meta-data set "tests-passed" "false"
        exit 1
      fi
      buildkite-agent annotate "All tests passed :white_check_mark:" --style "success" --context "test-results"
      buildkite-agent artifact upload "coverage/*"
      buildkite-agent meta-data set "tests-passed" "true"
```

A downstream step reading that state:

```yaml
  - label: ":rocket: Deploy"
    command: |
      PASSED=$(buildkite-agent meta-data get "tests-passed")
      if [[ "$PASSED" != "true" ]]; then
        echo "Tests did not pass, skipping deploy"
        exit 0
      fi
      scripts/deploy.sh
    depends_on: "test-step"
```

## Annotations

Surface build results directly on the build page. Annotations support Markdown and HTML.

### Creating annotations

```bash
# Simple text annotation
buildkite-agent annotate "Deploy completed successfully" --style "success" --context "deploy"

# Pipe from a file
buildkite-agent annotate --style "error" --context "test-failures" < test-output.md
```

### Key flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--style` | `-s` | `default` | Visual style: `default`, `info`, `warning`, `error`, `success` |
| `--context` | `-c` | random UUID | Unique ID - reusing a context replaces the annotation |
| `--append` | - | `false` | Append to existing annotation with same context instead of replacing |
| `--priority` | - | `3` | Display priority (1-10). Higher numbers appear first |
| `--job` | - | current job | Job ID to annotate (rarely needed) |

### Replacing vs appending

- Same `--context` without `--append` replaces the annotation; with `--append` appends below existing content.
- Always use a stable `--context` value so reruns update the same annotation instead of creating duplicates.

> For pipeline-level `notify:` configuration, see the buildkite-pipelines skill.

## Artifacts

Upload files as build artifacts, download them in later steps or other builds, and search by glob.

### Upload

```bash
# Upload a single file
buildkite-agent artifact upload "pkg/release.tar.gz"

# Upload with glob pattern
buildkite-agent artifact upload "dist/*"
```

### Download

```bash
# Download to current directory
buildkite-agent artifact download "pkg/release.tar.gz" .

# Download from a specific step
buildkite-agent artifact download "dist/*" . --step "build-step"
```

### Search

```bash
# List matching artifacts
buildkite-agent artifact search "pkg/*.tar.gz" --build "$BUILDKITE_BUILD_ID"
```

For complete flag tables, see `references/flag-reference.md`.

> For the declarative `artifact_paths:` YAML key, see the buildkite-pipelines skill. For `bk artifacts` CLI download/list commands, see the buildkite-cli skill.

## Meta-data

A build-wide key-value store for sharing state between jobs. Set a value in one job, read it in any other job in the same build.

### Set

```bash
buildkite-agent meta-data set "release-version" "1.4.2"
```

### Get

```bash
VERSION=$(buildkite-agent meta-data get "release-version")
```

Use `--default` to return a fallback value instead of a non-zero exit when the key is missing: `buildkite-agent meta-data get "deploy-env" --default "staging"`.

### Check existence

```bash
# Returns exit code 0 if exists, 100 if not
if buildkite-agent meta-data exists "release-version"; then
  echo "Version already set"
fi
```

### Common patterns

Block step field values are stored automatically as meta-data. Retrieve them by field key:

```bash
# After a block step with fields: [{key: "release-name", text: "Release Name"}]
RELEASE_NAME=$(buildkite-agent meta-data get "release-name")
```

## Pipeline Upload

Dynamically add steps to a running build. The core mechanism behind dynamic pipelines - generate YAML at runtime and upload it.

### Basic usage

```bash
# Upload a specific file
buildkite-agent pipeline upload .buildkite/deploy-steps.yml

# Pipe generated YAML from stdin
./scripts/generate-pipeline.sh | buildkite-agent pipeline upload
```

### Replace mode

By default, uploaded steps are appended after the current step. Use `--replace` to replace the entire remaining pipeline:

```bash
# Replace all remaining steps with the uploaded ones
buildkite-agent pipeline upload --replace .buildkite/new-pipeline.yml
```

### Key flags

| Flag | Default | Description |
|------|---------|-------------|
| `--replace` | `false` | Replace remaining pipeline steps instead of appending |
| `--no-interpolation` | `false` | Skip environment variable interpolation in the uploaded YAML |
| `--dry-run` | `false` | Validate and output the pipeline without uploading |

> For pipeline YAML syntax and step types, see the buildkite-pipelines skill.

## OIDC Tokens

Request short-lived OpenID Connect tokens from within a job step for authenticating to external services (cloud providers, package registries) without static credentials.

### Basic token request

```bash
# Request a token for a specific audience
TOKEN=$(buildkite-agent oidc request-token --audience "https://packages.buildkite.com/my-org/my-registry")
```

### Cloud provider authentication

```bash
# AWS - request token with STS audience
TOKEN=$(buildkite-agent oidc request-token --audience "sts.amazonaws.com")
```

### Key flags

| Flag | Default | Description |
|------|---------|-------------|
| `--audience` | Buildkite endpoint | Target service URL - must match the OIDC provider audience configuration |
| `--lifetime` | `600` | Token lifetime in seconds |
| `--claim` | - | Comma-separated optional claims to include (e.g., `organization_id,pipeline_id`) |
| `--aws-session-tag` | - | Comma-separated claims to map as AWS session tags |

> For end-to-end OIDC auth flows, cloud provider setup, and token claim details, see the Buildkite secure delivery documentation.

## Step Management

Read or modify step attributes at runtime. Useful for conditional logic within steps and build automation.

### Get step attributes

```bash
# Get current step's label
LABEL=$(buildkite-agent step get "label")

# Get another step's attribute by key
STATE=$(buildkite-agent step get "state" --step "deploy-step")

# Get the outcome of a step
OUTCOME=$(buildkite-agent step get "outcome" --step "test-step")
```

### Update step attributes

```bash
# Update current step's label dynamically
buildkite-agent step update "label" ":rocket: Deploying v${VERSION}"

# Update another step
buildkite-agent step update "label" ":hourglass: Waiting..." --step "pending-step"
```

### Cancel a step

```bash
# Cancel a specific step by key
buildkite-agent step cancel --step "optional-step"
```

### Key flags

| Flag | Default | Description |
|------|---------|-------------|
| `--step` | current step | Step key or UUID to target |
| `--build` | current build | Build UUID (for cross-build operations) |
| `--format` | `string` | Output format for `get` |

### Available step attributes

| Attribute | Readable | Writable | Description |
|-----------|----------|----------|-------------|
| `label` | yes | yes | Step label displayed in UI |
| `state` | yes | no | Current state (`running`, `passed`, `failed`, etc.) |
| `outcome` | yes | no | Final outcome of the step |
| `key` | yes | no | Step key identifier |

## Distributed Locks

Coordinate parallel jobs within a build using distributed mutex locks. Prevents race conditions when multiple jobs access shared resources.

### Acquire / release pattern

```bash
#!/bin/bash
set -euo pipefail

# Acquire lock - blocks until available, returns a token
token=$(buildkite-agent lock acquire "database-migration")
trap 'buildkite-agent lock release "database-migration" "${token}"' EXIT

# Critical section - only one job runs this at a time
bundle exec rails db:migrate
```

### Do / done pattern (one-time setup)

Run a setup task exactly once across all parallel jobs:

```bash
#!/bin/bash
echo "+++ Setting up shared test environment"

if [[ $(buildkite-agent lock do "test-env-setup") == "do" ]]; then
  echo "Downloading test assets..."
  curl -o /tmp/test-data.zip https://releases.example.com/data.zip
  unzip /tmp/test-data.zip -d /tmp/shared-test-files/
  buildkite-agent lock done "test-env-setup"
else
  echo "Assets already prepared by another job"
fi

# All jobs continue here
run-tests.sh
```

### Key flags

| Subcommand | Flags | Description |
|------------|-------|-------------|
| `lock acquire <name>` | `--timeout` | Maximum wait time in seconds (0 = wait forever) |
| `lock release <name> <token>` | - | Release with the token from `acquire` |
| `lock do <name>` | - | Returns `do` if lock acquired, `done` if already completed |
| `lock done <name>` | - | Mark a `do` lock as completed |

## Environment

Inspect and modify the job's environment variables. Primarily useful for debugging lifecycle hooks and understanding what environment changes hooks made.

```bash
# Inspect environment variable names without printing values
buildkite-agent env dump | jq 'keys'

# Get a specific variable
buildkite-agent env get "BUILDKITE_BRANCH"

# Set a variable for subsequent hooks and the command
buildkite-agent env set "DEPLOY_TARGET" "production"
```

### Key flags

| Subcommand | Default | Description |
|------------|---------|-------------|
| `env dump` | JSON to stdout | Dump all environment variables |
| `env get <keys...>` | - | Get one or more specific variables |
| `env set <key> <value>` | - | Set a variable for subsequent phases |
| `env unset <key>` | - | Remove a variable from subsequent phases |

### Debugging hooks

The `env dump` command is particularly useful in lifecycle hooks to see what prior hooks changed:

```bash
#!/bin/bash
# .buildkite/hooks/pre-command
echo "--- Environment after environment hook:"
buildkite-agent env dump | jq 'keys'
```

> For agent lifecycle hooks and `buildkite-agent.cfg` configuration, see the Buildkite agent infrastructure documentation.

## Secrets

Retrieve cluster secrets at runtime from within job steps. Secrets retrieved this way are automatically added to the log redactor.

### Basic usage

```bash
# Get a secret value
SECRET_VAR=$(buildkite-agent secret get "deploy-key")

# Pass directly to a tool
cli-tool --token "$(buildkite-agent secret get "api-token")"
```

### Key flags

| Flag | Default | Description |
|------|---------|-------------|
| `--format` | `string` | Output format: `string` (single secret) or `env` (multiple, KEY="value" pairs) |
| `--skip-redaction` | `false` | Do not add the secret value to the log redactor |
| `--job` | current job | Job ID context |

By default, `secret get` automatically registers retrieved values with the log redactor, masking them as `[REDACTED]` in subsequent output.

> For setting up cluster secrets, see the Buildkite agent infrastructure documentation. For the declarative `secrets:` pipeline YAML key, see the buildkite-pipelines skill.

## Log Redaction

Add values to the build log redactor at runtime so they are masked in all subsequent output. Use this for dynamically-retrieved secrets that were not declared via `secrets:` or `buildkite-agent secret get`.

### Basic usage

```bash
# Fetch a token from an external source
DYNAMIC_TOKEN=$(curl -s https://vault.example.com/token)

# Register it with the redactor before using it
echo "$DYNAMIC_TOKEN" | buildkite-agent redactor add
```

After registering a value with the redactor, still avoid echoing the value intentionally. Treat redaction as a last line of defense, not permission to print secrets.

### Multiple values

```bash
# Redact multiple values
echo "$SECRET1" | buildkite-agent redactor add
echo "$SECRET2" | buildkite-agent redactor add
```

### When to use redactor vs secret get

| Scenario | Use |
|----------|-----|
| Secret stored in Buildkite cluster secrets | `buildkite-agent secret get` (auto-redacts) |
| Secret from external vault (HashiCorp Vault, AWS SSM, etc.) | Fetch externally, then `buildkite-agent redactor add` |
| Computed sensitive value (temporary token, derived key) | `buildkite-agent redactor add` |

## Tool Signing

Sign and verify pipeline step definitions for integrity checking. Ensures steps have not been tampered with between definition and execution.

### Sign a pipeline

```bash
# Sign step configuration using a JWKS key
buildkite-agent tool sign --jwks-file /etc/buildkite-agent/signing-key.json \
  --step "command=make test" \
  --step "plugins=docker#v5.12.0"
```

### Verify a signature

```bash
# Verify step signature
buildkite-agent tool verify --jwks-file /etc/buildkite-agent/verification-key.json \
  --step "command=make test"
```

### Key flags

| Flag | Default | Description |
|------|---------|-------------|
| `--jwks-file` | - | Path to JWKS key file for signing or verification |
| `--jwks-key-id` | - | Key ID to use from the JWKS file |
| `--step` | - | Step attributes to sign/verify (repeatable) |

> For pipeline signing configuration and rollout strategy, see the Buildkite secure delivery documentation.

## Common Mistakes

| Mistake | What happens | Fix |
|---------|-------------|-----|
| Missing `--context` on `annotate` | Each call creates a new annotation instead of updating | Always pass `--context` with a stable identifier |
| Using `--append` without matching `--context` | Append has no effect - creates a new annotation | Ensure `--context` matches the annotation to append to |
| Forgetting to quote artifact glob patterns | Shell expands globs before `buildkite-agent` sees them | Always quote: `"dist/*"` not `dist/*` |
| Reading `meta-data get` before the writing job completes | Key does not exist, command fails with non-zero exit | Use `depends_on` or `wait` to enforce ordering, or use `--default` |
| Using `pipeline upload --replace` unintentionally | Removes all remaining steps in the build | Only use `--replace` when intentionally rebuilding the entire pipeline |
| Not releasing locks on script failure | Lock held indefinitely, blocking other jobs | Use `trap ... EXIT` to release locks on any exit |
| Passing `--audience` that doesn't match OIDC provider config | Token rejected by the target service | Audience must exactly match the provider's configured audience URL |
| Using `--skip-redaction` with actual secrets | Secret values appear in plain text in build logs | Only use `--skip-redaction` for non-sensitive configuration values |
| Calling `env set` expecting it to affect the current shell | Variable is set for subsequent hooks/phases, not the current script | Use `export VAR=value` for current-script variables; `env set` for cross-phase |
| Passing large values via environment variables | OS-level env size limits cause silent truncation or job failure | Switch to file-based approaches (artifacts, meta-data with files) for payloads larger than a few KB |
| Uploading pipeline YAML with unescaped `$` in `--no-interpolation` mode off | Variables interpolated unexpectedly, producing malformed YAML | Use `--no-interpolation` when YAML contains literal `$` characters |

## Additional Resources

### Reference Files
- `references/flag-reference.md` - Complete flag tables for all subcommands including upload, download, search, shasum, annotate, meta-data, pipeline upload, oidc, step, lock, env, secret, redactor, and tool
- `references/patterns-and-recipes.md` - Advanced multi-subcommand patterns: test failure annotation pipelines, cross-job state machines, OIDC-authenticated Docker push, parallel job coordination with locks, environment debugging

## Further Reading

- [Buildkite Docs for LLMs](https://buildkite.com/docs/llms.txt)
- [Agent CLI - annotate](https://buildkite.com/docs/agent/v3/cli-annotate.md)
- [Agent CLI - artifact](https://buildkite.com/docs/agent/v3/cli-artifact.md)
- [Agent CLI - meta-data](https://buildkite.com/docs/agent/v3/cli-meta-data.md)
- [Agent CLI - pipeline](https://buildkite.com/docs/agent/v3/cli-pipeline.md)
- [Agent CLI - OIDC](https://buildkite.com/docs/agent/v3/cli-oidc.md)
- [Agent CLI - lock](https://buildkite.com/docs/agent/v3/cli-lock.md)
- [Managing secrets with Buildkite secrets](https://buildkite.com/docs/pipelines/security/secrets/buildkite-secrets.md)
- [Dynamic pipelines](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines.md)
