# Group Steps Reference

Group steps collect related steps into collapsible UI sections. This reference covers the attributes they accept, how they behave in dynamic pipelines, and the gotchas that surprise teams in production.

## Attributes accepted on a group

| Attribute | Accepted? | Behaviour |
|-----------|-----------|-----------|
| `key` | Yes | Unique identifier. Other steps reference it via `depends_on`. Appears as `group_key` in REST API responses. Also accepted as `identifier`. |
| `group` | Yes | Display name. Also accepted as `label`. |
| `depends_on` | Yes | Group-level dependencies. No child step starts until all dependencies are met. |
| `allow_dependency_failure` | Yes | Lets the group proceed even when a depended-upon step has failed. |
| `if` | Yes | Pushed down to every child step. The group container still appears in the UI even when all children are conditionally omitted. |
| `skip` | Yes | Pushed down to every child step. |
| `notify` | Yes | Evaluated on the group itself. Group outcome resolves from children: error > hard fail > soft fail > pass > neutral. |
| `concurrency` | No | Command-step only. Server rejects the upload. |
| `concurrency_group` | No | Command-step only. Server rejects the upload. |
| `concurrency_method` | No | Command-step only. Server rejects the upload. |

Set `key` on every group. It is required for `depends_on` between groups, surfaces in the API as `group_key`, and must be unique within a build. Use descriptive keys (`tests-auth`, not `tests`) so they remain unique when groups proliferate.

## DAG mode warning

Adding any group step to a build automatically enables DAG (directed acyclic graph) mode for that build. In DAG mode, steps without explicit `depends_on` or `wait` between them run in parallel, not top-to-bottom.

If the existing pipeline relied on top-to-bottom ordering without explicit dependencies, adding a group causes those steps to run concurrently - including any steps that should have run after the group. Add `depends_on` or `wait` steps to preserve ordering.

Check for implicit ordering assumptions before introducing a group into an existing pipeline. This is the most common surprise when teams adopt groups.

## Generating groups dynamically

One group per service is the default monorepo pattern:

```bash
#!/bin/bash
set -euo pipefail

CHANGED_FILES=$(git diff --name-only --merge-base origin/main)

echo "steps:"

for service_dir in services/*/; do
  service=$(basename "$service_dir")
  if echo "$CHANGED_FILES" | grep -q "^services/${service}/"; then
    cat <<YAML
  - group: ":package: ${service}"
    key: "group-${service}"
    steps:
      - label: ":hammer: Build ${service}"
        command: "make build -C services/${service}"
        key: "build-${service}"
      - label: ":test_tube: Test ${service}"
        command: "make test -C services/${service}"
        depends_on: "build-${service}"
        key: "test-${service}"
YAML
  fi
done
```

Each changed service gets its own collapsible group. Within each group, the test step waits for the build step via `depends_on`. The groups themselves run in parallel because no dependency is declared between them.

Group by service in monorepo pipelines so each service has its own section. Group by phase (lint, unit tests, integration tests, deploy) in single-service pipelines. The goal is for any engineer to find a failed step without scrolling through unrelated output.

## Ordering groups with depends_on

```yaml
steps:
  - group: ":test_tube: Tests"
    key: "tests"
    steps:
      - label: "Test auth"
        command: "make test-auth"
        key: "test-auth"
      - label: "Test api"
        command: "make test-api"
        key: "test-api"

  - group: ":rocket: Deploy"
    key: "deploy"
    depends_on: "tests"
    steps:
      - label: "Deploy to staging"
        command: "make deploy-staging"
        key: "deploy-staging"
```

If any step in `tests` fails, no step in `deploy` runs. To allow `deploy` to proceed when some tests fail, add `allow_dependency_failure: true` on the downstream group.

Consecutive groups without `depends_on` or `wait` between them run in parallel.

## Group merging across uploads

Groups can merge across `pipeline upload` calls, but only under two specific conditions:

1. The job running the upload is itself inside a group, AND
2. The first step of the uploaded pipeline is a group with the same label as the enclosing group.

If both hold, the uploaded steps are added to the existing group rather than creating a new one.

### Example: merging works

```yaml
# .buildkite/pipeline.yml - the upload job is inside the "Setup" group
steps:
  - group: "Setup"
    steps:
      - label: "Initialise"
        command: "init.sh"
      - label: "Generate pipeline"
        command: "buildkite-agent pipeline upload .buildkite/generated.yml"
```

```yaml
# .buildkite/generated.yml - first step is a group with the same label
steps:
  - group: "Setup"
    steps:
      - label: "Build containers"
        command: "docker build ."
```

`Build containers` appears inside the existing `Setup` group.

### Example: merging does NOT work

```yaml
# .buildkite/pipeline.yml - upload job is at top level, not in a group
steps:
  - label: "Generate pipeline"
    command: "buildkite-agent pipeline upload .buildkite/generated.yml"
```

```yaml
# .buildkite/generated.yml
steps:
  - group: "Setup"
    steps:
      - label: "Build containers"
        command: "docker build ."
```

A new `Setup` group is created. Merging only happens when the upload job itself is a member of a matching group.

Merging also only applies to the first step of the uploaded pipeline. A matching group appearing second or later creates a new group.

### Multiple generators producing the same group name

When several generators each call `pipeline upload` separately, each upload creates its own groups. Two uploads that both produce `:test_tube: Tests` result in two separate groups in the UI. To avoid this:

- Give each generator's groups distinct names (`:test_tube: Auth Tests`, `:test_tube: Payments Tests`), or
- Consolidate the steps into a single upload.

## Concurrency on group steps

`concurrency`, `concurrency_group`, and `concurrency_method` are command-step attributes. The server rejects pipeline uploads that put them on a group:

```
"concurrency" is not a valid property on a group step
```

Set concurrency on each command step inside the group instead:

```yaml
- group: ":rocket: Deploy"
  key: "deploy"
  steps:
    - label: "Deploy auth"
      command: "make deploy-auth"
      concurrency: 1
      concurrency_group: "deploy/auth"
    - label: "Deploy payments"
      command: "make deploy-payments"
      concurrency: 1
      concurrency_group: "deploy/payments"
```

Different `concurrency_group` values queue separately: `deploy/auth` and `deploy/payments` can run concurrently across builds, but two `deploy/auth` jobs from different builds cannot.

To serialise all deploys regardless of service, use the same `concurrency_group` (e.g. `"deploy"`) on every step. To cap parallelism against a shared resource without enforcing queue order, set `concurrency_method: eager`.

## Groups can't nest

A group inside another group is rejected:

```
Group steps can't be nested within groups
```

The workaround is flat groups with a `Category: Subcategory` naming convention:

```yaml
steps:
  - group: ":test_tube: Backend: Auth Tests"
    key: "backend-auth"
    steps:
      - label: "Auth unit tests"
        command: "make test-auth-unit"
      - label: "Auth integration tests"
        command: "make test-auth-integration"

  - group: ":test_tube: Backend: API Tests"
    key: "backend-api"
    steps:
      - label: "API unit tests"
        command: "make test-api-unit"
      - label: "API integration tests"
        command: "make test-api-integration"

  - group: ":rocket: Deploy"
    depends_on:
      - "backend-auth"
      - "backend-api"
    steps:
      - label: "Deploy to staging"
        command: "make deploy-staging"
```

When a generator would naturally produce outer-team / inner-service nesting, restructure to flat `Team: Service` groups.

## Job limits with grouped pipelines

Group steps count toward the platform job limits. Each group is 1 job, plus 1 job per child command step (multiplied by `parallelism`).

| Limit | Default |
|-------|---------|
| Jobs per `pipeline upload` | 500 |
| Pipeline uploads per build | 500 |
| Jobs per build | 4,000 |

This pipeline produces 7 jobs:

```yaml
steps:
  - group: ":test_tube: Tests"    # 1 job
    key: "tests"
    steps:
      - label: "Unit tests"
        command: "make test-unit"
        parallelism: 3             # 3 jobs
      - label: "Lint"
        command: "make lint"       # 1 job

  - group: ":rocket: Deploy"       # 1 job
    depends_on: "tests"
    steps:
      - label: "Deploy"
        command: "make deploy"     # 1 job
```

Exceeding the per-upload limit returns `The number of jobs in this upload exceeds your organization limit of 500`. Steps already in the build are unaffected; nothing from the rejected upload is added.

### Three levers for reducing job count

1. Trigger steps to fan out. Generate trigger steps that start separate builds per service instead of uploading all jobs into a single build. Each triggered build gets its own job limits. A monorepo with 20 services × 30 steps = 600 jobs in one build (rejected) becomes 20 trigger steps in the parent and 30 steps each in 20 child builds.
2. Test Engine instead of high `parallelism`. A step with `parallelism: 10` counts as 10 jobs. Timing-based test splitting distributes tests evenly, so 4 well-balanced shards often replace 10 evenly-split ones. See the Buildkite Test Engine documentation.
3. Cap retries explicitly. `automatic_retry` defaults to `limit: 2`. Across many steps during an outage, these retries multiply and contribute to the per-build limit.

## No per-group collapse, no fast-cancel

Two limitations worth knowing:

No per-group default collapse state. All groups in a build share the same default collapse state on page load. There is no way to start some groups collapsed and others expanded. Use descriptive group names so engineers know which group to expand.

No built-in fast-cancel of sibling steps. When only one result matters across a group (e.g. testing against multiple environments and using the first to pass), Buildkite has no native way to cancel the others when one succeeds or fails. Workaround: call the Buildkite REST API from inside the step command to cancel sibling jobs by key. See the buildkite-api skill.

## Further Reading

- [Group step reference](https://buildkite.com/docs/pipelines/configure/step-types/group-step.md)
- [Controlling concurrency](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency.md)
- [Platform limits](https://buildkite.com/docs/platform/limits.md)
