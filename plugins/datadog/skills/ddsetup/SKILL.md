---
name: ddsetup
description: First-time setup for the Datadog MCP server named `datadog`. Use before Datadog investigations when Datadog tools are missing or disconnected, and for dashboards, monitors, logs, metrics, APM traces, SLOs, incidents, production debugging, or service-health questions.
---

# Datadog Setup

Use this skill when the user needs to connect Cline to Datadog or when a Datadog request cannot proceed because the `datadog` MCP server is unavailable.

## Datadog MCP Server

Use the MCP server named `datadog`. Do not use another Datadog MCP server unless the user explicitly asks to use a different user-managed server.

If `datadog` tools are not available, do not conclude that Datadog is unavailable. Run this setup flow first.

## Shared Reference

Read [references/mcp-settings.md](references/mcp-settings.md) before proceeding. It contains the server-state check, site-to-domain mapping, environment variables, OAuth guidance, and toolset behavior.

## Setup Procedure

Check `datadog-server-state` from the shared reference:

- `working`: continue with the user's Datadog request without mentioning this check.
- `not-working`: tell the user the Datadog MCP server is installed but not connected, instruct them to run `ddconfig`, and stop.

If setup is needed, do not gather Datadog data through browser instructions, curl, API keys, or unrelated tools unless the user explicitly asks for that path. The plugin-owned MCP server is the primary path.

## What Datadog Provides

After setup, the MCP server can help Cline query production observability data directly:

- Search and filter application logs.
- Query infrastructure and application metrics.
- Inspect distributed traces for latency or errors.
- List dashboards, monitors, alerts, incidents, and SLOs.
- Investigate service health, errors, dependencies, and performance.

## First-Time Setup Flow

1. Tell the user the Datadog MCP server needs to be connected.
2. Ask which Datadog site they use. Present the site-to-domain table from the shared reference.
3. Resolve the answer to an MCP domain. If ambiguous, ask one clarifying question.
4. Tell the user to set `DD_SITE` or `DD_MCP_DOMAIN` before reinstalling or re-enabling the Datadog plugin. Use `DD_SITE` for standard sites and `DD_MCP_DOMAIN` for a custom MCP domain.
5. Tell the user to reinstall or re-enable the Datadog plugin so Cline regenerates the plugin-owned MCP settings.
6. Tell the user to authorize the `datadog` MCP server in Cline's MCP UI if prompted.

Do not ask the user to paste OAuth tokens, API keys, application keys, cookies, or auth headers into chat.

## After Setup

Once the `datadog` MCP server is connected, continue with the original Datadog task. Keep queries bounded by service, environment, team, tag, and time window whenever possible.
