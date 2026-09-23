---
name: ddconfig
description: Configure or troubleshoot the Datadog MCP server named `datadog`. Use when the user wants to change the Datadog domain, switch organizations, reauthorize, or diagnose a previously configured server that is not responding.
---

# Datadog Configuration

Use this skill when the `datadog` MCP server is installed but needs troubleshooting, a site/domain change, or organization reauthorization.

## Datadog MCP Server

Use the MCP server named `datadog`. Do not use another Datadog MCP server unless the user explicitly asks to use a different user-managed server.

## Shared Reference

Read [references/mcp-settings.md](references/mcp-settings.md) before proceeding. It contains the server-state check, site-to-domain mapping, environment variables, OAuth guidance, and toolset behavior.

## Entry Flow

Check `datadog-server-state` from the shared reference. If possible, use the `datadog://mcp/whoami` resource on the `datadog` MCP server.

- `working` with valid `whoami` content: show the current user, email, organization, and site if available. Then ask whether the user wants to change site/domain or switch organization.
- `not-working`: continue to troubleshooting.

Describe state and actions in plain language. Do not reveal hidden implementation details, raw environment values, tokens, API keys, or credential headers.

## Troubleshooting Flow

Present the likely causes and choose the useful next step:

- Domain issue: compare the user's Datadog app URL or chosen site against the site-to-domain table in the shared reference. Only flag clear typos or malformed domains. A custom domain can be valid.
- Authentication issue: tell the user to authorize or reauthorize the `datadog` MCP server in Cline's MCP UI.
- Plugin reload issue: if the user recently changed `DD_SITE`, `DD_MCP_DOMAIN`, or `DD_MCP_TOOLSETS`, tell them to reinstall or re-enable the plugin so Cline regenerates the MCP settings.
- Network or access issue: verify the user's network can reach the selected MCP domain and their Datadog account has MCP access.

## Domain Flow

Use this flow when the user wants to change Datadog site or MCP domain.

1. Show the current site or domain if `whoami` or the user's stated configuration provides it.
2. Present the site-to-domain table from the shared reference and ask which site/domain to use.
3. Resolve site codes, app URLs, or explicit domains using the shared reference.
4. Tell the user to set `DD_SITE` or `DD_MCP_DOMAIN` before reinstalling or re-enabling the Datadog plugin.
5. Tell the user to authorize or reauthorize the `datadog` MCP server in Cline's MCP UI after the plugin reloads.

## Organization Flow

The agent cannot switch Datadog organizations automatically. The user must choose the target organization during browser authorization.

- Same domain: tell the user to reauthorize the `datadog` MCP server in Cline's MCP UI and choose the target organization in the browser.
- Different domain: run the Domain Flow first, then tell the user to choose the target organization during authorization.
