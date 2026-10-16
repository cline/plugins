# Cline Datadog MCP Reference

Use this reference whenever a Datadog skill needs to check the MCP server state, choose a site, change domains, or manage toolsets.

## Stay on script

Describe state and actions in plain language. Do not reveal hidden implementation details, raw environment values, OAuth tokens, API keys, application keys, session cookies, or credential headers.

Do not ask users to paste Datadog credentials into chat. Browser OAuth is the default path for this plugin-owned MCP server. If a user explicitly needs API-key authentication, guide them to create a separate user-managed Datadog MCP server with their chosen headers.

## Determine `datadog-server-state`

Silently determine the state of the `datadog` MCP server using only the steps below. Do not use another Datadog MCP server.

1. Try a lightweight MCP call on `datadog`, such as listing tools or reading a Datadog MCP resource.
2. If the server returns actual Datadog-specific tools, resources, or content, `datadog-server-state` is `working`.
3. If the MCP call fails, the server is missing, or the response is empty/generic, `datadog-server-state` is `not-working`.

Cline does not expose the hidden MCP registration file to skills. A missing or disconnected server is handled by authorizing the plugin-owned MCP server, reinstalling or re-enabling the plugin, or changing the environment variables listed below before reinstalling or re-enabling.

## Plugin-owned MCP registration

The plugin registers one streamable HTTP MCP server named `datadog`.

By default it uses the US1 MCP domain:

```
mcp.datadoghq.com
```

Users can change the generated MCP URL by setting environment variables before installing, reinstalling, disabling/enabling, or otherwise reloading the plugin:

- `DD_SITE`: one of `us1`, `us3`, `us5`, `eu`, `ap1`, `ap2`, or a Datadog site host such as `datadoghq.com`, `datadoghq.eu`, or `us3.datadoghq.com`.
- `DD_MCP_DOMAIN`: exact MCP domain. This overrides `DD_SITE`. Do not include `https://` or a path.
- `DD_MCP_TOOLSETS`: comma-separated toolset list. Leave unset to use Datadog server defaults.

After changing one of these values, tell the user to reinstall or re-enable the Datadog plugin so Cline regenerates the plugin-owned MCP settings. Then have the user authorize the `datadog` MCP server in Cline's MCP UI if authorization is required.

## Site-to-domain mapping

| Site | MCP domain            |
| ---- | --------------------- |
| us1  | mcp.datadoghq.com     |
| us3  | mcp.us3.datadoghq.com |
| us5  | mcp.us5.datadoghq.com |
| eu   | mcp.datadoghq.eu      |
| ap1  | mcp.ap1.datadoghq.com |
| ap2  | mcp.ap2.datadoghq.com |

When mapping user input:

- Site code, such as `us1` or `eu`: use the matching MCP domain directly. Site codes are case-insensitive.
- Datadog app URL, such as `https://app.datadoghq.com/logs`: identify the site from the URL, then use the matching MCP domain. `datadoghq.com` with no site prefix is US1 and `datadoghq.eu` is EU.
- Domain not in the table: confirm with the user, warning that an invalid domain will prevent connection.

If the user is unsure which site they use, suggest checking the URL bar in their Datadog browser session or Datadog's site documentation.

## Changing domains

To change the domain:

1. Resolve the user's requested site or domain using the mapping above.
2. Tell the user the resolved MCP domain.
3. Tell the user to set `DD_SITE` or `DD_MCP_DOMAIN` before reinstalling or re-enabling the plugin.
4. Tell the user to authorize the `datadog` MCP server in Cline after the plugin reloads.

## Changing toolsets

`DD_MCP_TOOLSETS` controls which toolsets the Datadog MCP server requests.

- Empty or unset means the server decides which default toolsets to enable.
- Explicit values, such as `core,alerting`, request exactly that comma-separated set.
- Prefer unset/empty when the selected list matches the server defaults.
- Warn before applying a list that excludes `core`, because most workflows depend on it.

To change toolsets, tell the user to set `DD_MCP_TOOLSETS` before reinstalling or re-enabling the plugin, then authorize or reconnect the `datadog` MCP server if needed.
