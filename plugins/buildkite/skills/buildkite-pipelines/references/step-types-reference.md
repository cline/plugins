# Step Types Reference

Detailed attribute tables for all Buildkite pipeline step types.

## Command Step

The primary step type. Runs one or more shell commands on an agent.

```yaml
steps:
  - label: ":hammer: Build"
    command: "make build"
    # OR multiple commands:
    commands:
      - "npm ci"
      - "npm test"
```

### Command step attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `label` | - | Display label in Buildkite UI (supports emoji `:emoji:`) |
| `command` / `commands` | - | Shell command(s) to execute |
| `key` | - | Unique identifier for `depends_on` references |
| `env` | `{}` | Environment variables for this step |
| `agents` | `{}` | Agent targeting: `queue`, tags |
| `artifact_paths` | - | Glob pattern(s) for files to upload after step completes |
| `branches` | all | Branch filter (e.g., `"main"`, `"release/*"`) |
| `parallelism` | `1` | Number of parallel jobs to create |
| `timeout_in_minutes` | pipeline default | Max execution time before kill |
| `retry` | - | Automatic and manual retry rules (see retry reference) |
| `depends_on` | - | Step key(s) that must pass first |
| `if` | - | Boolean expression to conditionally run step |
| `skip` | `false` | Skip reason string, or `true` to skip silently |
| `soft_fail` | `false` | Treat failure as neutral (build continues green) |
| `cancel_on_build_failing` | `false` | Cancel this job if another job fails the build |
| `concurrency` | unlimited | Max parallel jobs in `concurrency_group` |
| `concurrency_group` | - | Shared concurrency namespace |
| `concurrency_method` | `ordered` | `ordered` (FIFO) or `eager` |
| `priority` | `0` | Scheduling priority (higher = sooner) |
| `plugins` | - | Plugin configurations |
| `notify` | - | Step-level notifications |
| `matrix` | - | Matrix build configuration |
| `cache` | - | Built-in cache (hosted agents only) |

## Wait Step

Blocks execution until all preceding steps complete successfully.

```yaml
# Simple form
- wait

# Explicit null form (equivalent)
- wait: ~

# Continue on failure - downstream steps run even if prior steps failed
- wait:
  continue_on_failure: true

# Conditional wait
- wait:
  if: build.source == "schedule"
```

### Wait step attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `continue_on_failure` | `false` | Proceed even if prior steps failed |
| `if` | - | Conditional expression |

## Block Step

Pauses the build for manual approval. The build remains in a "blocked" state until unblocked via UI or API.

```yaml
# Simple form
- block: ":shipit: Deploy to production"

# With branch restriction
- block: ":shipit: Release"
  branches: "main"

# With select field
- block: "Release"
  fields:
    - select: "Environment"
      key: "deploy-env"
      options:
        - label: "Staging"
          value: "staging"
        - label: "Production"
          value: "production"
      required: true
```

### Block step attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `block` | - | Label displayed on the block step |
| `key` | - | Unique identifier for `depends_on` |
| `prompt` | - | Instructional text shown to the unblocker |
| `fields` | - | Input fields (text or select) |
| `branches` | all | Branch filter |
| `if` | - | Conditional expression |
| `depends_on` | - | Step key(s) that must pass first |
| `allow_dependency_failure` | `false` | Show block even if dependencies failed |

## Trigger Step

Creates a build on another pipeline.

```yaml
steps:
  - trigger: "deploy-pipeline"
    label: ":rocket: Trigger deploy"
    build:
      branch: "main"
      commit: "HEAD"
      message: "Triggered from upstream"
      env:
        DEPLOY_VERSION: "1.2.3"
```

### Trigger step attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `trigger` | - | Pipeline slug to trigger |
| `label` | - | Display label |
| `build` | `{}` | Build parameters: `branch`, `commit`, `message`, `env`, `meta_data` |
| `async` | `false` | Don't wait for triggered build to complete |
| `branches` | all | Branch filter |
| `if` | - | Conditional expression |
| `depends_on` | - | Step key(s) that must pass first |
| `soft_fail` | `false` | Treat triggered build failure as neutral |
| `skip` | `false` | Skip reason or boolean |

## Group Step

Visually groups steps in the Buildkite UI. Collapsible in the build view.

```yaml
steps:
  - group: ":test_tube: Tests"
    steps:
      - label: "Unit"
        command: "make test-unit"
      - label: "Integration"
        command: "make test-integration"
```

### Group step attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `group` | - | Group label |
| `key` | - | Unique identifier for `depends_on` |
| `steps` | - | Nested steps (any type except group) |
| `if` | - | Conditional expression (prevents all nested steps + plugins) |
| `depends_on` | - | Step key(s) that must pass first |
| `notify` | - | Group-level notifications |
| `allow_dependency_failure` | `false` | Run group even if dependencies failed |

## Input Step

Collects structured input from a user before the build continues. Similar to block but designed for data collection rather than approval gates.

```yaml
steps:
  - input: "Deployment Configuration"
    fields:
      - text: "Release tag"
        key: "release-tag"
        hint: "The git tag to deploy (e.g., v1.2.3)"
        required: true
      - select: "Region"
        key: "deploy-region"
        multiple: true
        options:
          - label: "US East"
            value: "us-east-1"
          - label: "EU West"
            value: "eu-west-1"
```

Access collected values in subsequent steps with `build.env("release-tag")` in conditionals or via the Buildkite meta-data API.

### Input step attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `input` | - | Label displayed on the input step |
| `key` | - | Unique identifier for `depends_on` |
| `prompt` | - | Instructional text |
| `fields` | - | Input fields (text or select) |
| `branches` | all | Branch filter |
| `if` | - | Conditional expression |
| `depends_on` | - | Step key(s) that must pass first |

### Field types

Text field:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `text` | - | Field label |
| `key` | - | Meta-data key to store value |
| `hint` | - | Helper text below the field |
| `required` | `true` | Require a value before continuing |
| `default` | - | Pre-filled value |

Select field:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `select` | - | Field label |
| `key` | - | Meta-data key to store value |
| `options` | - | Array of `{label, value}` choices |
| `multiple` | `false` | Allow selecting multiple options |
| `required` | `true` | Require a selection before continuing |
| `default` | - | Pre-selected value |
