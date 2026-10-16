# clickhouse

Adds ClickHouse Cloud MCP access plus focused setup guidance.

## What It Does

Registers the plugin-managed `clickhouse-cloud` MCP server at `https://mcp.clickhouse.cloud/mcp`. The server gives Cline read-only ClickHouse Cloud tools for organization and service discovery, database and table inspection, SELECT queries, ClickPipes, backups, and cost information.

Bundles one skill:

- `clickhouse-mcp-setup` helps users connect the remote MCP server, understand OAuth requirements, and troubleshoot connection issues.

## Install

```bash
cline plugin install clickhouse
```

For local development from this repository:

```bash
cline plugin install ./plugins/clickhouse --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Help me connect the ClickHouse MCP server.
```

Or:

```text
What can the ClickHouse Cloud MCP server inspect?
```

## Requirements

- ClickHouse Cloud account access for the remote MCP server.
- Network access to `https://mcp.clickhouse.cloud/mcp`.
- OAuth authorization through Cline's MCP flow. Interactive installs may offer authorization immediately; otherwise authorize the `clickhouse-cloud` server from the MCP manager when first using it.

## Trust Boundaries

The MCP server is remote and requires ClickHouse Cloud authorization. Installing the plugin adds the `clickhouse-cloud` MCP entry to Cline's MCP settings as plugin-managed; disable or uninstall the plugin to remove that managed server rather than toggling it directly. Treat organization, service, billing, backup, schema, and query results as account data. Use bounded SELECT queries with explicit limits, avoid expensive exploratory scans, and never paste credentials or secrets into chat.
