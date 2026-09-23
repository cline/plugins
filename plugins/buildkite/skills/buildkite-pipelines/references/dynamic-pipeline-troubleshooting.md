# Dynamic Pipeline Troubleshooting

Failure modes specific to pipelines that generate steps at runtime via `buildkite-agent pipeline upload`. Ordered by frequency - silent upload failures and quota issues come first.

## Contents

1. [Diagnose in this order](#diagnose-in-this-order)
2. [Common Mistakes](#common-mistakes)
3. [Silent upload failures](#silent-upload-failures)
4. [Debugging strategies](#debugging-strategies)
5. [Upload quota exceeded](#upload-quota-exceeded)
6. [Job count surprises](#job-count-surprises)
7. [Upload performance at scale](#upload-performance-at-scale)
8. [Step insertion order](#step-insertion-order)
9. [Environment variable interpolation](#environment-variable-interpolation)
10. [Duplicate steps after retry of an upload step](#duplicate-steps-after-retry-of-an-upload-step)
11. [Concurrency in dynamically generated steps](#concurrency-in-dynamically-generated-steps)
12. [Notifications on dynamically generated steps](#notifications-on-dynamically-generated-steps)
13. [Combining if and if_changed](#combining-if-and-if_changed)
14. [Matrix and parallelism on the same step](#matrix-and-parallelism-on-the-same-step)
15. [Retry storms during infrastructure incidents](#retry-storms-during-infrastructure-incidents)
16. [Security](#security)
17. [Pipeline signing with dynamic uploads](#pipeline-signing-with-dynamic-uploads)

## Diagnose in this order

Most production failures fall into a small set of patterns. Work down this list before deeper investigation:

1. Build green, no generated steps appear - generator script missing `set -euo pipefail`. The upload failed; bash reported the script's exit code, not the upload's. Fix: add `set -euo pipefail`.
2. `The number of jobs in this upload exceeds your organization limit of 500` - split the output into multiple smaller uploads, or use trigger steps to fan across separate builds. Account for `parallelism` (multiplies jobs).
3. `pipeline parsing of "(stdin)" failed: <error>` - invalid YAML. Run with `--dry-run` locally; capture the generator output to a file and run it through a YAML linter.
4. Generated steps in unexpected order - `pipeline upload` inserts immediately after the calling step. Multiple uploads from the same step appear in reverse upload order. Use `depends_on` for explicit ordering.
5. Env vars empty in generated steps - interpolated at upload time. Use `$$VAR` to defer.
6. Duplicate steps after retry of the upload step - the generator re-ran. Set `key:` on every step (uploads with duplicate keys fail loudly with `DuplicateKeyError`) or use `--replace` if the step is responsible for the entire downstream pipeline.
7. Concurrency limits not working - concurrency group name was interpolated at upload time and resolved to something unexpected. Emit literal strings from the generator.
8. Notifications not firing on generated steps - step-level notifications are not inherited from the initial pipeline. Add `notify:` to the generated step itself.
9. Build hits 4,000 jobs-per-build limit - `(steps × parallelism) + (retries × steps)`. Split with trigger steps or reduce `parallelism` using Test Engine's timing-based test splitting.

Each item below expands one of the above with root cause, fix, and debugging guidance.

## Common Mistakes

| Mistake | What happens | Fix |
|---------|-------------|-----|
| Generator script missing `set -euo pipefail` | Upload fails but build step reports success; no steps appear | Start every generator script with `set -euo pipefail` |
| Relying on upload order for step ordering | Multiple uploads from one step appear in reverse order; generated steps surface in unexpected positions | Declare execution order with `depends_on` between step keys |
| Referencing `$VAR` for a step's own `env:` value | Variable is empty when step runs - interpolation happens at upload time | Escape with `$$VAR` to defer evaluation to step runtime |
| Retrying the upload step without `key:` | Steps upload twice; build runs every step in duplicate | Set `key:` on every generated step - `DuplicateKeyError` then blocks re-upload |
| Using `concurrency_group: "deploy/$SERVICE"` in generator | `$SERVICE` interpolates from generator environment, not per-step; steps share or leak concurrency groups | Compute the literal string in the generator before emitting YAML |
| Assuming step-level `notify` inherits into uploaded steps | Notifications silently do not fire on generated steps | Emit `notify:` on each generated step that needs it |
| Using `exit_status: "*"` with high retry limit | An outage multiplies jobs: 200 steps × 2 retries = 400 retry jobs hitting the broken fleet | Target specific exit codes and cap wildcard retries at `limit: 1` |
| Pipeline processing timeout on huge uploads | HTTP 529 from agent, then retry or rejection | Split into multiple smaller uploads inside the generator |

## Silent upload failures

Symptom. The generator step completes green. No generated steps appear in the build.

Why. The generator script does not set `set -euo pipefail`. When `pipeline upload` fails (rejected YAML, quota exceeded, network error, processing timeout), bash without `pipefail` reports the exit code of the last command in a pipe. So `script | pipeline upload` returns the script's exit code (often 0) and the build step succeeds.

The agent is not silent: the Buildkite API returns HTTP 422 (rejected), 500 (failed), or 529 (timeout/retry) on upload failures. Internally, uploads move through PENDING → PROCESSING → APPLIED (or REJECTED / FAILED). The failure is silent only because the script swallowed it.

Fix.

```bash
#!/bin/bash
set -euo pipefail

.buildkite/generate-pipeline.sh | buildkite-agent pipeline upload
```

`-e` exits on any non-zero return. `pipefail` makes a failure anywhere in a pipe (not just the last command) fail the whole pipe. Together they ensure the build step fails when the upload fails.

## Debugging strategies

Static pipelines live in the repo and are easy to read. Dynamic pipelines only exist at build time, so debugging needs different tooling. Three layers, in order of when they help:

### Local validation with --dry-run

Parses and interpolates the YAML, prints the result, does not upload:

```bash
.buildkite/generate-pipeline.sh | buildkite-agent pipeline upload --dry-run
```

Invalid YAML exits with `buildkite-agent: fatal: pipeline parsing of "(stdin)" failed: <error>`. The error does not always pinpoint the line - for complex generators, redirect the output to a file and run a YAML linter against it, or use `bk pipeline validate` (see the buildkite-cli skill).

### Production validation with artifact capture

Save the generated YAML as a build artifact every build, validate it, then upload:

```bash
#!/bin/bash
set -euo pipefail

.buildkite/generate-pipeline.sh > /tmp/generated-pipeline.yml
buildkite-agent pipeline upload --dry-run < /tmp/generated-pipeline.yml > /dev/null
buildkite-agent artifact upload /tmp/generated-pipeline.yml
buildkite-agent pipeline upload /tmp/generated-pipeline.yml
```

`set -e` ensures the build fails if `--dry-run` rejects the YAML. The artifact persists on the build page for later inspection via `buildkite-agent artifact download`.

### Annotations summarising decisions

Record what the generator decided as a build annotation and metadata so later debugging does not require re-running the generator:

```bash
buildkite-agent meta-data set "generated-services" "$CHANGED"
buildkite-agent annotate "Generated steps for: ${CHANGED}" \
  --style "info" --context "generator"
```

See the buildkite-agent-runtime skill for full `annotate` and `meta-data` reference.

## Upload quota exceeded

Symptom. Build fails with `The number of jobs in this upload exceeds your organization limit of 500`. Steps already in the build are unaffected; nothing from the rejected upload is added.

Defaults (raisable via Buildkite support):

| Limit | Default | Note |
|-------|---------|------|
| Jobs per `pipeline upload` | 500 | A step with `parallelism: 10` counts as 10 |
| Pipeline uploads per build | 500 | Each call to `pipeline upload` |
| Jobs per build | 4,000 | Each retry attempt is a separate job |

Visible in Organisation Settings > Quotas > Service Quotas.

Three options to fix:

1. Split into multiple smaller uploads. Loop in the generator and call `pipeline upload` per service, shard, or batch. Two uploads of 300 steps process more reliably than one upload of 600.
2. Use trigger steps to fan out. A monorepo with 20 services × 30 steps each = 600 jobs in one build (rejected). With trigger steps: 20 trigger steps in the parent (well under 500), each child build handles its own 30 steps. Each triggered build gets its own job limits.
3. Request a quota increase when workloads genuinely exceed defaults.

## Job count surprises

Symptom. The build hits the 4,000 jobs-per-build limit unexpectedly.

Three things people miss:

1. Parallelism multiplies. `parallelism: 10` = 10 jobs.
2. Retries count. Each retry attempt is a separate job. `automatic_retry` with `limit: 2` produces up to 3 jobs per step (original + 2 retries).
3. Retrying the upload step re-uploads. If the bootstrap step retries and is not using `--replace` or step keys, it uploads everything again, doubling the job count.

The math. `(steps × parallelism) + (steps × max_retries)`. Close to 4,000 means fan out with trigger steps or reduce `parallelism` using Test Engine timing-based test splitting (see the Buildkite Test Engine documentation).

## Upload performance at scale

What happens. After `pipeline upload`, the control plane parses, validates, and merges steps into the running build. The agent waits for processing, polling with dynamic backoff (max 60 retries, Retry-After clamped 1s–30s). Small uploads finish in under a second. Uploads of hundreds of steps can take significantly longer; very large uploads can hit the server-side processing timeout.

Symptom. Generator step takes a long time before the next steps appear. Or HTTP 529 returned to the agent followed by retries. Or the upload is ultimately rejected.

Fix. Split into multiple smaller uploads inside the generator:

```bash
#!/bin/bash
set -euo pipefail

for service in api web worker payments notifications search; do
  cat <<YAML | buildkite-agent pipeline upload
steps:
  - label: ":test_tube: Test ${service}"
    command: "make test -C services/${service}"
    key: "test-${service}"
  - label: ":rocket: Deploy ${service}"
    command: "make deploy -C services/${service}"
    depends_on: "test-${service}"
YAML
done
```

Each upload is small enough to process quickly. Use `depends_on` for execution order - multiple uploads from a single step appear in reverse order on the build (see next section).

For workloads beyond what splitting can fix, use trigger steps to fan out across separate builds.

## Step insertion order

Symptom. Steps appear in the build in a different order than the generator emitted them.

Why. `pipeline upload` inserts new steps immediately after the step that called it. When a single step calls `pipeline upload` three times (batches A, then B, then C), they appear as C, B, A in the build - each new batch is inserted at the same position, pushing earlier batches down.

Fix. Declare execution order with `depends_on` between keys:

```yaml
- label: "Build"
  key: "build"
  command: "make build"

- label: "Test"
  key: "test"
  depends_on: "build"
  command: "make test"
```

## Environment variable interpolation

Symptom. A generated step references `$SOME_VAR` and the variable is empty or wrong when the step runs.

Why. The agent interpolates `$VAR` and `${VAR}` at upload time, before generated steps run. A variable that does not exist in the generator step's environment (or whose value differs from what the step will see at runtime) resolves to whatever is in the generator's environment - often empty.

The most common case: a step's own `env:` block does not take effect until the step runs, so referencing those values with `$VAR` in the same step's `command:` resolves to empty at upload time.

Fix. Escape `$` to defer evaluation:

```yaml
# Wrong: $DEPLOY_TARGET is empty at upload time
- command: "deploy.sh $DEPLOY_TARGET"
  env:
    DEPLOY_TARGET: "production"

# Right: $$ defers evaluation to step runtime
- command: "deploy.sh $$DEPLOY_TARGET"
  env:
    DEPLOY_TARGET: "production"
```

`\$VAR` works the same way as `$$VAR`.

Other interpolation patterns worth knowing:

```yaml
# Required variable: upload fails if MY_VAR is unset
command: "deploy.sh ${MY_VAR?}"

# Default value at upload time
command: "deploy.sh ${MY_VAR:-staging}"

# Substring extraction (characters 0-7)
label: "Commit ${BUILDKITE_COMMIT:0:7}"
```

To skip interpolation entirely on an upload:

```bash
buildkite-agent pipeline upload --no-interpolation
```

Useful when the generated YAML already contains the literal values needed, or when shell variables in commands would otherwise be consumed by the agent.

## Duplicate steps after retry of an upload step

Symptom. Retrying a failed generator step leaves the build with two copies of every generated step.

Why. The step that calls `pipeline upload` runs again on retry. The first run already uploaded steps; the retry uploads them again. Subsequent uploads add alongside existing steps - they do not replace them.

Fixes (pick the one that fits):

- Set `key:` on every generated step. The Buildkite server raises `DuplicateKeyError` when a key already exists in the build, so the second upload fails loudly instead of silently duplicating. This is the right default.
- Use `--replace` when the upload step is responsible for the entire downstream pipeline. `--replace` soft-deletes pending steps before adding new ones (jobs already running are not affected). Do not use `--replace` when multiple steps each upload their own portion - a retry of one step would wipe steps uploaded by others.
- Design for idempotency. A generator can check the build via the API and skip re-uploading steps that already exist.

## Concurrency in dynamically generated steps

Symptom. Concurrency limits do not work as expected. Steps that should share a limit do not, or steps that should not share one do.

Why. Concurrency group names get interpolated at upload time. A generator emitting `"deploy/$SERVICE/production"` resolves `$SERVICE` from the generator's environment, not from each generated step's environment. The literal string at upload time is whatever `$SERVICE` happened to be (often empty), so steps share or do not share groups unexpectedly.

Fix. Compute the literal string in the generator:

```python
# Python generator
for service in changed_services:
    pipeline.add_step({
        "label": f"Deploy {service}",
        "command": f"deploy.sh {service}",
        "concurrency": 1,
        "concurrency_group": f"deploy/{service}/production",  # literal
    })
```

```bash
# Bash generator
for service in $CHANGED_SERVICES; do
  cat <<YAML
- label: "Deploy ${service}"
  command: "deploy.sh ${service}"
  concurrency: 1
  concurrency_group: "deploy/${service}/production"
YAML
done
```

Concurrency groups are organisation-scoped, not build-scoped. Two pipelines using `"deploy/auth/production"` share the limit globally.

Concurrency attributes only work on command steps, not on group steps. See `references/group-steps.md`.

## Notifications on dynamically generated steps

Symptom. Notifications do not fire on dynamically generated steps.

Why. Two distinct issues:

1. Step-level notifications are not inherited. Build-level `notify` in the initial `pipeline.yml` covers the whole build, including dynamically uploaded steps - repeating it is not needed. But step-level `notify` is per-step. A generated step that needs its own notification requires `notify:` emitted by the generator.
2. Build-level events that already fired do not replay. A generator uploading a `notify` block after `build.started` already fired misses that event. Time-sensitive notifications belong in the bootstrap YAML.

Fix for step-level conditional notifications:

```yaml
- label: ":rocket: Deploy to production"
  command: "make deploy"
  notify:
    - slack:
        channels: ["#deploys"]
        message: "Production deploy failed"
      if: step.outcome == "hard_failed"
```

`step.outcome` values: `"neutral"`, `"passed"`, `"soft_failed"`, `"hard_failed"`, `"errored"`.

Step-level supports: Slack, GitHub checks, GitHub commit status, Basecamp.
Build-level only: webhooks, PagerDuty, email.

## Combining if and if_changed

Symptom. A step needs "run when on main OR when these files changed" and a single step cannot express it.

Why. `if` is evaluated at upload time before checkout. `if_changed` is evaluated during upload after the agent reads the diff. They combine with AND logic (both must be true) but not OR.

Fix. A small generator script that evaluates both conditions:

```bash
#!/bin/bash
set -euo pipefail

BRANCH="$BUILDKITE_BRANCH"
CHANGED_FILES=$(git diff --name-only origin/main...HEAD)
DEPLOY_FILES_CHANGED=$(echo "$CHANGED_FILES" | grep -c '^deploy/' || true)

if [[ "$BRANCH" == "main" ]] || [[ "$DEPLOY_FILES_CHANGED" -gt 0 ]]; then
  cat <<YAML | buildkite-agent pipeline upload
steps:
  - label: ":rocket: Deploy"
    command: "make deploy"
    key: "deploy"
    agents:
      queue: "deploy"
YAML
fi
```

This consumes an agent slot to evaluate the condition but gives full control over the logic. The standard upgrade path when teams outgrow `if_changed`.

## Matrix and parallelism on the same step

Symptom. A step uses `matrix` and `parallelism` together. The pipeline is rejected, or matrix values silently fail to accept nested objects.

Why. Buildkite's built-in `matrix` does not combine with `parallelism` on the same step, and matrix values must be flat strings (no nested objects).

Fix. Use a generator (often via the SDK) to compute combinations and emit individual steps. See `references/dynamic-pipeline-patterns.md` → "SDK-based pipeline generation" for the worked example.

## Retry storms during infrastructure incidents

Symptom. During an infrastructure issue (spot preemption, network outage, dependent service down), many jobs fail at once and all retry simultaneously, multiplying load on an already-broken fleet.

Why. `automatic_retry` defaults to `limit: 2` when no limit is set. 200 steps × 2 retries = 400 retry jobs hitting the fleet during the outage.

Fix.

- Set explicit `limit` on every `automatic_retry` rule.
- Target specific exit codes, not `exit_status: "*"` with high limits:
  - `-1` agent lost (spot termination, network)
  - `137` OOM kill (SIGKILL)
  - `143` SIGTERM
  - `255` timeout / SSH failure
- Use a different queue for retries on infra failures instead of retrying on the same broken fleet. See `references/dynamic-pipeline-patterns.md` for the `pre-exit` hook pattern.
- Watch the per-build retry budget: `(steps × max_retries)` counts toward the 4,000 jobs-per-build limit.

## Security

Any running job can call `pipeline upload`. If a forked PR modifies `.buildkite/`, those scripts run on the pipeline's agents. Treat dynamic pipelines as a privilege-escalation surface.

Disable fork builds for sensitive pipelines. Buildkite repository setting. The safest option when the pipeline has access to production secrets.

For pipelines that need to accept fork PRs, gate them behind a manual approval. Either with a static `if`:

```yaml
- block: ":lock: Approve fork build"
  if: build.pull_request_repo != "" && build.pull_request_repo != build.repository
  prompt: "This build is from a fork. Review the code before allowing it to run."
```

Or with a generator (when allowlist logic is needed):

```bash
#!/bin/bash
set -euo pipefail

if [ "${BUILDKITE_PULL_REQUEST_REPO}" != "" ] && \
   [ "${BUILDKITE_PULL_REQUEST_REPO}" != "${BUILDKITE_REPO}" ]; then
  buildkite-agent pipeline upload <<'YAML'
steps:
  - block: ":lock: Approve fork build"
    prompt: "This build is from a fork. Review before allowing on our agents."
YAML
fi

buildkite-agent pipeline upload  # main pipeline; appears after the block
```

Pass `--reject-secrets` to `pipeline upload` to reject YAML containing values matching secret-like names (`*_TOKEN`, `*_SECRET`, `*_KEY`). Opt-in, disabled by default.

Kubernetes setups: `pipeline upload` can be used to inject steps that run with higher-privilege service accounts. Audit which steps can call `pipeline upload` and what service accounts they run under.

For the durable answer - cryptographic verification that uploaded YAML matches what was signed - see pipeline signing below and the Buildkite secure delivery documentation.

## Pipeline signing with dynamic uploads

Pipeline signing verifies that uploaded YAML has not been tampered with. With dynamic pipelines, the agent signs YAML at upload time.

When signing is enabled and verification fails for dynamically uploaded steps, check that the generator's signing context matches what the verifier expects. See the Buildkite secure delivery documentation for signing setup.

For pipelines that need strong supply chain guarantees, signing is the durable answer - block-step gating is a stopgap.

## Job priority on dynamically uploaded jobs

Job `priority` works the same way on a dynamically uploaded job as on a statically defined one. The default value is `0`, and any integer value works. Higher values run before lower values, regardless of how long a job has been queued. Priority is considered before jobs are dispatched to agent queues, and only applies to command jobs (including plugin commands), not to wait, block, group, or input steps.

Set the priority inline on a generated step:

```bash
#!/bin/bash
set -euo pipefail

case "${BUILDKITE_BRANCH}" in
  main)         PRIORITY=10 ;;
  release/*)    PRIORITY=5 ;;
  *)            PRIORITY=0 ;;
esac

cat <<YAML | buildkite-agent pipeline upload
steps:
  - label: ":hammer: Build"
    command: "make build"
    priority: ${PRIORITY}
YAML
```

To apply the same priority across every command step in the generated pipeline, set `priority` as a top-level key. Steps that declare their own `priority` keep theirs.

```yaml
priority: 10
steps:
  - label: ":fire: Hotfix"
    command: "make hotfix"
  - label: ":test_tube: Tests"
    command: "make test"
    priority: 1
```

Priority is a step attribute set in the YAML, so it's fixed when the step is uploaded. To change a job's priority after upload, use the REST API's [reprioritize a job](https://buildkite.com/docs/apis/rest-api/jobs#reprioritize-a-job) endpoint rather than re-uploading the step.

## Further Reading

- [Dynamic pipelines overview](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines.md)
- [`pipeline upload` CLI reference](https://buildkite.com/docs/agent/v3/cli-pipeline.md)
- [Platform limits](https://buildkite.com/docs/platform/limits.md)
- [Environment variables](https://buildkite.com/docs/pipelines/configure/environment-variables.md)
- [Notifications](https://buildkite.com/docs/pipelines/configure/notifications.md)
- [Job priority](https://buildkite.com/docs/pipelines/configure/workflows/job-priority.md)
