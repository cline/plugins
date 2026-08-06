# Zoom Connectors
This plugin works without live connectors. In standalone mode, Cline uses the bundled Zoom skills and reference material to plan, build, and debug integrations.
## User-Managed MCP
Zoom MCP endpoints can be useful for agentic workflows over meetings, recordings, Zoom Docs, Whiteboard, and Team Chat. This plugin does not auto-register them because the endpoints require bearer-token headers and Cline does not yet provide a clean install form for those secrets.
| Connector | Endpoint | Use For |
|---|---|---|
| `zoom-mcp` | `https://mcp.zoom.us/mcp/zoom/streamable` | Meeting search, cross-Zoom search, recordings, summaries, meeting assets, and main-server Zoom Docs tools |
| `zoom-docs-mcp` | `https://mcp.zoom.us/mcp/docs/streamable` | Zoom Docs creation, retrieval, and Markdown document workflows |
| `zoom-whiteboard-mcp` | `https://mcp.zoom.us/mcp/whiteboard/streamable` | Whiteboard-specific MCP workflows |
| Team Chat MCP | `https://mcp.zoom.us/mcp/team_chat/streamable` | Write-capable Team Chat tools; use only when the user explicitly asks for Team Chat MCP writes |
## Authentication
Do not ask users to paste Zoom bearer tokens into chat. If a user wants MCP access, use `setup-zoom-mcp` to identify the connector, scopes, and token handling plan, then have the user configure secrets in their own environment or MCP settings.
## What Works Without MCP
- Choose the right Zoom surface for a new integration.
- Plan SDK, REST API, webhook, WebSocket, OAuth, and MCP-adjacent implementations.
- Compare Meeting SDK vs Video SDK vs Zoom Apps vs REST API.
- Debug architecture, auth, event-delivery, and integration mistakes.
- Use the bundled Zoom reference library under `skills/`.
## What MCP Adds
- Live MCP tool discovery and execution against Zoom MCP servers.
- Real meeting-search, recording-resource, and document workflows.
- Whiteboard-specific tool access when applicable.
- Cross-Zoom search through the main `search_zoom` tool when the token has the required scopes.
