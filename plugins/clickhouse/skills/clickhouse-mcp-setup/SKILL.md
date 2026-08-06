---
name: clickhouse-mcp-setup
description: Help configure, authenticate, and troubleshoot the ClickHouse Cloud MCP server bundled by the clickhouse plugin. Use when the user asks to set up ClickHouse MCP, connect Cline to ClickHouse Cloud, authenticate ClickHouse, or troubleshoot missing ClickHouse MCP tools.
---

# ClickHouse MCP Setup

Guide the user through connecting the `clickhouse-cloud` MCP server registered by the plugin.

## Connection Checklist

1. Confirm the `clickhouse` plugin is installed and enabled.
2. Confirm the MCP tab or settings list shows a `clickhouse-cloud` server.
3. Explain that the server uses the remote URL `https://mcp.clickhouse.cloud/mcp`.
4. Ask the user to complete the ClickHouse Cloud OAuth flow if Cline prompts for authorization, or authorize `clickhouse-cloud` from the MCP manager if it was installed non-interactively.
5. After authorization, suggest a low-risk check such as listing organizations or services.

Do not ask the user to paste OAuth tokens, passwords, API keys, or connection strings into chat.
Treat returned organization, service, billing, schema, and row data as account data: summarize minimally, avoid dumping raw results unless requested, and ask before export-like outputs.

## What The MCP Server Can Do

The remote server exposes read-only ClickHouse Cloud tools for:

- listing organizations and services
- inspecting databases, tables, and service details
- running read-only SELECT queries
- listing ClickPipes and backup metadata
- checking organization cost data

## Query Safety

When testing the connection:

- start with metadata tools before running SQL
- use SELECT only
- add `LIMIT` to exploratory queries
- narrow by database, table, organization, and service when possible
- stop and ask before broad scans, large time ranges, or costly queries

## Troubleshooting

- If the server is missing, ask the user to confirm the plugin is enabled and reload plugins or restart the Cline session.
- If auth fails, have the user retry the OAuth flow rather than sharing credentials in chat.
- If tools time out, reduce query scope, use smaller date ranges, and prefer metadata inspection before SQL.
- If network requests fail, ask the user to confirm they can reach `https://mcp.clickhouse.cloud/mcp`.
