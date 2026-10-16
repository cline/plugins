# MCP Architecture -- Zoom MCP Server
## What is MCP?
Model Context Protocol (MCP) standardizes how AI systems connect to external tools and data
sources. Zoom exposes MCP surfaces that clients can discover and call over MCP.
## Zoom MCP Surfaces
### Zoom MCP
| Transport | URL |
|-----------|-----|
| Streamable HTTP (recommended) | `https://mcp.zoom.us/mcp/zoom/streamable` |
| SSE (fallback) | `https://mcp.zoom.us/mcp/zoom/sse` |
### Whiteboard MCP
| Transport | URL |
|-----------|-----|
| Streamable HTTP (recommended) | `https://mcp.zoom.us/mcp/whiteboard/streamable` |
| SSE (fallback) | `https://mcp.zoom.us/mcp/whiteboard/sse` |
Whiteboard MCP is covered by the dedicated skill
[../whiteboard/SKILL.md](../whiteboard/SKILL.md).
### Team Chat MCP
| Transport | URL |
|-----------|-----|
| Streamable HTTP (recommended) | `https://mcp.zoom.us/mcp/team_chat/streamable` |
| SSE (fallback) | `https://mcp.zoom.us/mcp/team_chat/sse` |
Team Chat MCP is documented by the optional child skill
[../team-chat/SKILL.md](../team-chat/SKILL.md), but it is not registered by this plugin by default.
## Discovery Model
Do not hardcode tool counts in client logic.
Use the MCP protocol `tools/list` response as the current source of truth for:
- tool names
- descriptions
- parameter schemas
- newly added or removed tools
## Current Capability Shape
The current Zoom MCP surface is centered on:
- semantic meeting search
- cross-Zoom search over meetings, Team Chat, Zoom Docs, and My Notes
- meeting asset retrieval
- recording resource retrieval
- Zoom Docs creation from Markdown
If the task requires deterministic meeting CRUD, use the REST API skill instead of assuming
those operations exist on the current Zoom MCP surface.
## Authentication Model
User OAuth is the primary documented path.
Use user OAuth as the expected auth model for user-managed Zoom MCP servers.
## Protected Resource Metadata
Zoom MCP surfaces advertise supported scopes through OAuth protected-resource metadata.
Zoom MCP protected-resource metadata currently exposes:
- `ai_companion:read:search`
- `meeting:read:assets`
- `meeting:read:search`
- `cloud_recording:read:content`
- `cloud_recording:read:list_user_recordings`
- `docs:write:import`
- `docs:read:export`
Whiteboard MCP protected-resource metadata currently exposes:
- `whiteboard:write:whiteboard`
- `whiteboard:read:list_whiteboards`
- `whiteboard:read:whiteboard`
Team Chat MCP protected-resource metadata currently exposes:
- `team_chat:write:user_message`
- `team_chat:update:user_message`
- `team_chat:write:contact_information`
- `team_chat:write:user_channel`
- `team_chat:update:user_channel`
- `team_chat:write:members`
## Retrieval Model
`search_meetings` is not just a title filter. It is a semantic retrieval path over meeting
content, recap-linked assets, and recording-linked artifacts.
Useful result families:
- recap-oriented results with AI summaries and linked assets
- recording-oriented results for post-meeting content retrieval
When writing parsers, validate the live response shape from the server rather than relying on
older example field names.
## Feature Prerequisites
AI Companion features such as Smart Recording and Meeting Summary are feature
prerequisites for useful semantic retrieval and recap-linked content. They do not replace the
required OAuth scopes.
## Error Layering
Failures can happen at two layers:
- MCP protocol layer (`-32001`, `-32602`, `-32603`)
- underlying Zoom API-style permission/resource failures surfaced through the MCP response
See [../references/error-codes.md](../references/error-codes.md).
