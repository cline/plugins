# Authentication and Identifiers -- Whiteboard MCP
Guidance for `https://mcp.zoom.us/mcp/whiteboard/streamable` and
`https://mcp.zoom.us/mcp/whiteboard/sse`.
## Authentication Behavior
Use user-level OAuth for Whiteboard MCP and request the scopes required by the specific tools you need.
Tool-to-scope mapping:
- `add_a_whiteboard_collaborator` -> `whiteboard:write:collaborator:admin`
- `create_a_whiteboard` -> `whiteboard:write:whiteboard`
- `create_a_whiteboard_by_script` -> `whiteboard:write:whiteboard`
- `create_a_whiteboard_for_brainstorming` -> `whiteboard:write:whiteboard`
- `create_a_whiteboard_for_meeting_summary` -> `whiteboard:write:whiteboard`
- `create_a_whiteboard_for_strategy_analysis` -> `whiteboard:write:whiteboard`
- `delete_a_whiteboard_collaborator` -> `whiteboard:delete:collaborator:admin`
- `get_a_whiteboard` -> `whiteboard:read:whiteboard:admin`
- `get_a_whiteboard_collaborator` -> `whiteboard:read:list_collaborators:admin`
- `list_whiteboards` -> `whiteboard:read:list_whiteboards:admin`
- `update_a_whiteboard_collaborator` -> `whiteboard:update:collaborator:admin`
## Whiteboard ID Mapping
The MCP-facing `whiteboard_id` matches the URL segment after `/wb/db/`.
Example:
```text
https://us05whiteboard.zoom.us/wb/db/6iktP8hJT3e5qaCuwFuAGg/p/180968285929472
```
- Correct MCP `whiteboard_id`: `6iktP8hJT3e5qaCuwFuAGg`
- The numeric `/p/...` segment is not the Whiteboard MCP identifier.
## Response Shape
`get_a_whiteboard` returned a list-style payload containing the matched whiteboard rather than
an obviously single-object payload. Parse the response shape you actually receive from the live
server instead of assuming the tool name implies a unique-object response.