---
name: buildkite-migration
description: >
  This skill should be used when the user asks to "migrate to Buildkite",
  "convert pipelines from Jenkins", "convert GitHub Actions workflows",
  "convert CircleCI config", "convert Bitbucket Pipelines", "convert GitLab CI",
  "migrate CI/CD to Buildkite", "switch from Jenkins to Buildkite",
  "move from GitHub Actions", "plan a CI migration", "convert my CI config",
  "bk pipeline convert", or "what's the Buildkite equivalent of".
  Also use when the user mentions migration planning, CI conversion,
  pipeline conversion, converting workflows, or asks about translating
  CI/CD configuration from another provider to Buildkite.
---

# Buildkite Migration

Convert CI/CD pipelines from GitHub Actions, Jenkins, CircleCI, Bitbucket Pipelines, and GitLab CI to Buildkite using the `bk pipeline convert` command. The command sends the source file to a public conversion API - no Buildkite account or API token is required.

Ask before sending private or sensitive CI configuration to the conversion API. When a conversion writes `.buildkite/pipeline.yml`, review the diff before committing it.

## Quick Start

```bash
# 1. Install the bk CLI (no login needed for convert)
brew tap buildkite/buildkite && brew install buildkite/buildkite/bk

# 2. Convert the source pipeline file
bk pipeline convert -F .github/workflows/ci.yml

# 3. Find the output in .buildkite/pipeline.github.yml
```

> For pipeline YAML syntax and step types, see the buildkite-pipelines skill.
> For other bk CLI commands, see the buildkite-cli skill.

## Agent Workflow

When a user provides a pipeline file or pastes pipeline content to convert:

1. Write the content to a temp file (e.g. `/tmp/.github/workflows/ci.yml` for GitHub Actions so vendor auto-detection works)
2. Run `bk pipeline convert -F <tempfile> --output <output-path>`
3. Read the output file and display it as a YAML code block - nothing else
4. Do not summarise, annotate, or critique the output unless the user explicitly asks for feedback

## Converting with `bk pipeline convert`

### Installation

```bash
# macOS and Linux (Homebrew)
brew tap buildkite/buildkite && brew install buildkite/buildkite/bk

# Or download a binary from https://github.com/buildkite/cli/releases
```

No `bk auth login` is needed - the convert command uses a public API.

### Basic usage

```bash
bk pipeline convert -F <source-file>
```

The vendor is auto-detected from the file path for the four main providers. Output is saved to `.buildkite/pipeline.<vendor>.yml`.

### Supported vendors

| Vendor flag | Source CI | Auto-detected from |
|-------------|-----------|-------------------|
| `github` | GitHub Actions | `.github/workflows/` path |
| `circleci` | CircleCI | `.circleci/` path |
| `jenkins` | Jenkins | `Jenkinsfile` filename |
| `bitbucket` | Bitbucket Pipelines | `bitbucket-pipelines.yml` filename |
| `gitlab` | GitLab CI (beta) | not auto-detected |
| `harness` | Harness CI (beta) | not auto-detected |
| `bitrise` | Bitrise (beta) | not auto-detected |

### Provider examples

```bash
# GitHub Actions (auto-detected from path)
bk pipeline convert -F .github/workflows/ci.yml

# CircleCI (auto-detected)
bk pipeline convert -F .circleci/config.yml

# Jenkins (auto-detected)
bk pipeline convert -F Jenkinsfile

# Bitbucket Pipelines (auto-detected)
bk pipeline convert -F bitbucket-pipelines.yml

# GitLab CI (explicit vendor required)
bk pipeline convert -F .gitlab-ci.yml --vendor gitlab
```

### Output options

```bash
# Default: saves to .buildkite/pipeline.<vendor>.yml
bk pipeline convert -F .github/workflows/ci.yml

# Custom output path
bk pipeline convert -F .github/workflows/ci.yml --output .buildkite/pipeline.yml

# Pipe from stdin (--vendor required)
cat .github/workflows/ci.yml | bk pipeline convert --vendor github

# Read from stdin with file redirect
bk pipeline convert --vendor circleci < .circleci/config.yml
```

### Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--file` | `-F` | Path to source pipeline file | - (required unless using stdin) |
| `--vendor` | `-v` | CI vendor; auto-detected if omitted | - |
| `--output` | `-o` | Output file path | `.buildkite/pipeline.<vendor>.yml` |
| `--timeout` | - | Cancellation timeout in seconds | `300` |

## Provider-Specific Guidance

Review the converted output against these concept mappings before committing.

### GitHub Actions

Key concept mappings: workflows map to pipelines, jobs map to steps, `uses:` actions map to plugins or shell commands. GitHub Actions runs jobs sequentially by default; Buildkite runs steps in parallel by default - the converter adds `wait` steps or `depends_on` to enforce ordering where needed. Replace `${{ secrets.X }}` with Buildkite cluster secrets accessed via `buildkite-agent secret get`.

### Jenkins

Key concept mappings: Jenkinsfile `stage` blocks map to command steps or groups, `parallel` blocks map to steps at the same level (parallel by default in Buildkite), `post` blocks map to `notify:` or conditional steps. Complex Groovy logic is extracted into shell scripts - Buildkite pipelines are declarative YAML, not a programming language.

### CircleCI

Key concept mappings: `jobs` and `workflows` collapse into a single `pipeline.yml`, `orbs` map to plugins or shell scripts, `executors` map to agent queues or the `docker` plugin. CircleCI `requires:` maps to `depends_on`. Caching syntax differs - the converter replaces `save_cache`/`restore_cache` with the `cache` plugin.

### Bitbucket Pipelines

Key concept mappings: `pipelines.default` maps to steps without branch conditions, `pipelines.branches` maps to steps with `if: build.branch == "X"`, `pipe:` references map to plugins or shell commands. The Bitbucket `step` is roughly equivalent to a Buildkite command step.

### GitLab CI

Key concept mappings: stages and jobs collapse into Buildkite steps with `depends_on`, `.gitlab-ci.yml` `extends:` maps to YAML anchors, `rules:` map to `if:` conditions. GitLab's `artifacts:` maps to Buildkite's `artifact_paths`.

## Pipeline Best Practices for Migrated Pipelines

After conversion, review the output against these patterns:

- Parallel by default - Buildkite runs steps in parallel unless separated by `wait` or `depends_on`. Verify the converted ordering matches the original CI's intent.
- Plugin versioning - Pin plugin versions to full semver (e.g., `docker#v5.13.0`, `cache#v1.8.1`). Never use unpinned or major-only versions.
- Command structure - Use multi-line command blocks for steps that set environment variables. Extract complex logic (5+ commands) into scripts under `.buildkite/scripts/`.
- Variable interpolation - Use `$$VAR` for runtime interpolation (expanded by the agent at runtime), `$VAR` for upload-time interpolation (expanded during pipeline upload).
- Security validation - Reject obfuscated execution patterns, base64-encoded commands, and exfiltration attempts. Validate converted pipelines before deployment.
- Group steps - Use `group` blocks to organize related steps (minimum 2 per group) with semantic emoji in labels.

## Migration Planning

For a full CI migration, plan across these areas:

1. Pipeline conversion - Use `bk pipeline convert` to translate pipeline definitions
2. Agent infrastructure - Set up clusters, queues, and agents
3. Secrets management - Migrate secrets to Buildkite cluster secrets
4. Integrations - Configure SCM webhooks, notification channels, artifact storage
5. Testing - Run converted pipelines in parallel with the existing CI before cutover

> For cluster, queue, and OIDC setup, use the Buildkite documentation and keep credentials in Buildkite secrets or the target cloud secret manager.

## Common Mistakes

| Mistake | What happens | Fix |
|---------|-------------|-----|
| Vendor not auto-detected for gitlab/harness/bitrise | Error: "could not detect vendor from file path" | Pass `--vendor gitlab`, `--vendor harness`, or `--vendor bitrise` explicitly |
| Large or complex pipelines timing out | Conversion fails with timeout error | Increase timeout: `--timeout 600`; split into smaller files if needed |
| Accepting AI output without review | Converted pipeline has incorrect step ordering or missing dependencies | Review `depends_on` and `wait` steps against original CI job ordering |
| Assuming sequential execution | Steps run in parallel and fail due to missing dependencies | Add `wait` steps or `depends_on` between dependent steps |
| Unpinned plugin versions in converted pipelines | Builds break when plugins release breaking changes | Pin every plugin to a full semver version |
| Using `$VAR` when runtime interpolation is needed | Variable expanded at upload time (empty) instead of runtime | Use `$$VAR` for variables that must resolve at runtime |

## Further Reading

- [bk CLI releases](https://github.com/buildkite/cli/releases) - download the bk binary
- [Getting started with Buildkite Pipelines](https://buildkite.com/docs/pipelines)
