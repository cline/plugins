# clickhouse-data-analyst

Bundle the ClickHouse data analyst skill as an installable Cline plugin.

## What It Does

Installs the `data-analyst` skill and its supporting sub-skills. The skill provides an elicitation-first workflow for answering analytics questions against ClickHouse, including connection setup, data dictionary lookup, safe SQL, analysis, plotting, and artifact management.

The package also bundles the ClickHouse skills that `data-analyst` references for best practices, local file analysis with chDB, local ClickHouse development, Cloud deployment, architecture guidance, and JavaScript client work.

## Install

```bash
cline plugin install clickhouse-data-analyst
```

For local development from this repository:

```bash
cline plugin install ./plugins/clickhouse-data-analyst --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Analyze last week's signup funnel in ClickHouse, show drop-off by step, and create a chart of the result.
```

Cline automatically uses the `data-analyst` skill and its supporting ClickHouse sub-skills to gather connection details, inspect the data dictionary, run safe queries, and produce analysis artifacts.

## Requirements

- Per-user ClickHouse Cloud API credentials (`CH_API_KEY` / `CH_API_SECRET`) authorized on the configured Prod Query API endpoint for Cloud analytics.
- `clickhousectl` for local and host/port ClickHouse workflows.
- Python dependencies as required by the bundled chDB skills when analyzing local files.

## Security Notes

The bundled skill instructs agents to avoid ClickHouse MCP tools, use the configured direct Query API endpoint with per-user API key/secret credentials for ClickHouse Cloud analytics, avoid `clickhousectl cloud service query` and its automatic service-query-key provisioning, ask before expensive or unbounded queries, and avoid echoing credentials or secrets.

## Attribution

Several bundled ClickHouse sub-skills are derived from `ClickHouse/agent-skills`, licensed under Apache-2.0. See `LICENSE.clickhouse-agent-skills` and `NOTICE.clickhouse-agent-skills`.
