# clickhouse-best-practices

Adds an offline ClickHouse skill pack for schema design, query review, architecture decisions, Node.js client troubleshooting, and local chDB analytics.

## What It Does

Bundles five guidance-only skills and does not register an MCP server:

- `clickhouse-best-practices` reviews schemas, queries, ingestion plans, materialized views, and safe analytical workflow.
- `clickhouse-architecture-advisor` maps workload requirements to ClickHouse architecture choices.
- `clickhouse-js-node-troubleshooting` diagnoses common `@clickhouse/client` connection, TLS, proxy, insert, streaming, and timeout issues.
- `chdb-sql` helps write embedded ClickHouse SQL over local files, object storage, and remote analytical sources from Python.
- `chdb-datastore` helps replace pandas-style workflows with chDB DataStore patterns for faster local and cross-source analysis.

## Install

```bash
cline plugin install clickhouse-best-practices
```

For local development from this repository:

```bash
cline plugin install ./plugins/clickhouse-best-practices --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Use ClickHouse best practices to review this table schema and ingestion plan.
```

Or:

```text
Help me troubleshoot this @clickhouse/client socket hang up error.
```

## Requirements

- No API keys or external services are required to load the skills.
- chDB guidance assumes a Python project where installing and importing `chdb` is appropriate.
- Node.js client guidance assumes the project uses `@clickhouse/client` in a Node runtime.

## Trust Boundaries

These skills are guidance only; they do not register MCP servers or execute code. Use the separate `clickhouse` plugin when the user wants ClickHouse Cloud MCP access. Treat database schemas, query results, logs, connection strings, cloud URLs, and local file samples as sensitive project data. Ask before suggesting broad data exports, production-impacting queries, package installs, or service changes.
