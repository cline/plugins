---
name: ddtoolsets
description: Manage toolsets for the Datadog MCP server named `datadog`. Use when the user wants to view, enable, disable, replace, or reset toolsets that control which Datadog MCP tools are available.
---

# Datadog Toolsets

Use this skill when the user wants to review or change which Datadog MCP toolsets are requested by the plugin-owned `datadog` server.

## Datadog MCP Server

Use the MCP server named `datadog`. Do not use another Datadog MCP server unless the user explicitly asks to use a different user-managed server.

## Shared Reference

Read [references/mcp-settings.md](references/mcp-settings.md) before proceeding. It contains the server-state check, site-to-domain mapping, environment variables, OAuth guidance, and toolset behavior.

## Entry Flow

Check `datadog-server-state` from the shared reference. If possible, use the `datadog://mcp/toolsets` resource on the `datadog` MCP server.

- `working` with valid toolset content: continue to Toolsets Flow.
- `not-working`: tell the user the Datadog MCP server is not connected, instruct them to run `ddconfig`, and stop.

Describe state and actions in plain language. Do not reveal hidden implementation details, raw environment values, tokens, API keys, or credential headers.

## Toolsets Flow

A toolset is a named group of related tools for a Datadog feature. Enabling a toolset makes those tools available; disabling it removes them from the server's exposed surface.

Use the `datadog://mcp/toolsets` resource when available. Present all toolsets to the user in a selectable list, table, or grouped summary. Make it clear which toolsets are currently enabled, which are defaults, and what each one does.

## Compute The New Toolset List

The user may want to add, remove, replace, or reset toolsets.

- If the resulting list matches the server defaults, prefer leaving `DD_MCP_TOOLSETS` unset.
- If the user wants to reset or use defaults, leave `DD_MCP_TOOLSETS` unset.
- If all toolsets would be removed, warn that the server defaults will be used instead.
- If the explicit list does not include `core`, warn that most Datadog workflows depend on `core`; proceed only after the user confirms.
- Otherwise, produce a comma-separated list such as `core,alerting`.

## Apply The Change

Tell the user to set `DD_MCP_TOOLSETS` before reinstalling or re-enabling the Datadog plugin. For defaults, tell them to unset `DD_MCP_TOOLSETS`.

After the plugin reloads, tell the user to authorize or reconnect the `datadog` MCP server in Cline's MCP UI if needed.
