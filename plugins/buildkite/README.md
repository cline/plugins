# Buildkite

Buildkite adds Cline support for Buildkite MCP plus skills for writing pipeline YAML, running preflight builds, using the `bk` CLI, calling Buildkite APIs, migrating from other CI systems, and using `buildkite-agent` commands inside jobs.

## Cline Primitives

- `mcp`: registers the Buildkite MCP server at `https://mcp.buildkite.com/mcp` so Cline can access Buildkite builds, pipelines, logs, agents, artifacts, and related tools after OAuth authorization.
- `skills`: six Buildkite workflow skills cover pipelines, preflight, agent-runtime commands, CLI usage, API integrations, and CI migration.

## Install

```bash
cline plugin install buildkite
```

For local development from this repository:

```bash
cline plugin install ./plugins/buildkite --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Write a Buildkite pipeline for this repo that runs tests, uploads coverage artifacts, and gates deploys on main.
```

## Requirements

- Buildkite account and organization access for live MCP, CLI, API, or preflight workflows.
- OAuth authorization for the Buildkite MCP server when prompted by Cline.
- Optional `bk` CLI for terminal workflows, preflight, and local command examples.
- Optional `BUILDKITE_API_TOKEN` for REST, GraphQL, or non-interactive CLI automation.
- Appropriate Buildkite permissions before triggering builds, editing pipelines, viewing logs, managing secrets, or changing agents.

## Trust Boundaries

Buildkite integrations can read CI logs and artifacts, trigger remote builds, push preflight branches, mutate pipelines, and manage secrets or agents depending on user permissions. The plugin keeps those operations explicit and tells Cline not to reveal tokens, secret values, OIDC credentials, or sensitive job output.
