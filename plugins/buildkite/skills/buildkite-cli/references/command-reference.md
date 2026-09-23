# CLI Command Reference

Detailed flags, examples, and usage for less-common `bk` CLI commands. For core commands (builds, jobs, pipelines, secrets, artifacts), see `SKILL.md`.

## Installation

### Homebrew (macOS and Linux)

```bash
brew tap buildkite/buildkite
brew install buildkite/buildkite/bk
```

### Binary download

Download pre-built binaries from the [GitHub releases page](https://github.com/buildkite/cli/releases). Extract and place the `bk` binary on the system PATH.

### Shell completion

Generate autocompletion scripts for the current shell:

```bash
# Bash
bk completion bash > /etc/bash_completion.d/bk

# Zsh
bk completion zsh > "${fpath[1]}/_bk"

# Fish
bk completion fish > ~/.config/fish/completions/bk.fish
```

### Verify installation

```bash
bk --version
```

## Auth Commands (v3.31+)

Starting in v3.31, `bk auth` provides structured authentication management with system keychain storage.

```bash
# Login (stores credentials in system keychain)
bk auth login

# Check current authentication status
bk auth status

# Switch between authenticated organizations
bk auth switch

# Clear keychain credentials
bk auth logout

# Clear all keychain configurations
bk auth logout --all
```

| Subcommand | Description |
|------------|-------------|
| `login` | Authenticate and store credentials in system keychain |
| `status` | Display current authentication state |
| `switch` | Switch between authenticated organizations |
| `logout` | Clear stored credentials (`--all` removes all) |

### Organization switching

Switch the active organization for subsequent commands:

```bash
# Switch to a specific org
bk use my-other-org

# Interactive selection (if multiple orgs configured)
bk use
```

## Clusters

Manage organization clusters from the terminal.

```bash
# List clusters
bk cluster list

# View cluster details
bk cluster view <cluster-slug>
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--output` | `-o` | `text` | Output format: `text`, `json` |

> For cluster creation, queue management, hosted agent configuration, and infrastructure provisioning, see the Buildkite agent infrastructure documentation.

## Packages

Manage packages in Buildkite Package Registries.

```bash
# Push a package from a local file
bk package push my-registry --file-path my-package.tar.gz

# Push a package through stdin
cat my-package.tar.gz | bk package push my-registry --stdin-file-name my-package.tar.gz -
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--file-path` | | - | Path to the package file to push |
| `--stdin-file-name` | | - | Filename to use when reading package data from stdin |

The first positional argument is the Buildkite registry slug.

> For OIDC-based authentication to package registries (no static credentials), see the Buildkite secure delivery documentation.

## Raw API Access

Make direct REST or GraphQL API calls from the terminal using `bk api`. Useful for operations not covered by dedicated subcommands.

### REST API

```bash
# GET request
bk api /organizations/my-org/pipelines

# POST request with JSON body
bk api --method POST /organizations/my-org/pipelines --data '{
  "name": "New Pipeline",
  "repository": "git@github.com:org/repo.git"
}'

# PUT request
bk api --method PUT /organizations/my-org/pipelines/my-app --data '{
  "description": "Updated description"
}'
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--method` | `-X` | `GET` | HTTP method: `GET`, `POST`, `PUT`, `DELETE`, `PATCH` |
| `--data` | `-d` | - | Request body (JSON string) |
| `--output` | `-o` | `text` | Output format: `text`, `json` |

### GraphQL API

```bash
bk api --graphql --data '{
  "query": "{ viewer { user { name email } } }"
}'
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--graphql` | | `false` | Send request to the GraphQL endpoint |
| `--data` | `-d` | - | GraphQL query as JSON string |

> For comprehensive REST and GraphQL API documentation (endpoints, mutations, pagination, webhooks), see the buildkite-api skill.

## Users

Invite users to the organization.

```bash
bk user invite user@example.com
```

Sends an invitation email to the specified address. The user gains access based on the organization's default role and team assignments.

## Pipeline Initialization

Scaffold a new `pipeline.yaml` in the current directory:

```bash
bk init
```

Creates a starter pipeline definition. Edit the generated file to define build steps.

> For pipeline YAML syntax, step types, and configuration patterns, see the buildkite-pipelines skill.
