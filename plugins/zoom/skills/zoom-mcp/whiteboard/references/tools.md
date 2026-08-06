# Tools -- Whiteboard MCP
Current `tools/list` result from `https://mcp.zoom.us/mcp/whiteboard/streamable`.
## Tool Catalog
| Tool | Purpose | Guide coverage |
|------|---------|----------------|
| `add_a_whiteboard_collaborator` | Add collaborators to a whiteboard | Requires admin collaborator-write scope |
| `create_a_whiteboard_for_brainstorming` | Create a whiteboard from brainstorm inputs such as problems, ideas, and next steps | Available on the Whiteboard MCP surface; validate request schema before use |
| `list_whiteboards` | List accessible whiteboards for the current user or admin context | Covered by the read workflow in this guide |
| `create_a_whiteboard` | Create a whiteboard | Available on the Whiteboard MCP surface; validate request schema before use |
| `get_a_whiteboard` | Retrieve a whiteboard by `whiteboard_id` | Covered by the read workflow in this guide |
| `get_a_whiteboard_collaborator` | List a whiteboard's collaborators | Requires admin collaborator-read scope |
| `create_a_whiteboard_by_script` | Create a whiteboard using scripted content or structured input | Available on the Whiteboard MCP surface; validate request schema before use |
| `update_a_whiteboard_collaborator` | Update whiteboard collaborators | Requires admin collaborator-update scope |
| `delete_a_whiteboard_collaborator` | Remove a collaborator from a whiteboard | Requires admin collaborator-delete scope |
| `create_a_whiteboard_for_meeting_summary` | Generate a whiteboard from meeting-summary style input | Available on the Whiteboard MCP surface; validate request schema before use |
| `create_a_whiteboard_for_strategy_analysis` | Generate a whiteboard for strategy-analysis content | Available on the Whiteboard MCP surface; validate request schema before use |
## Tool-to-Scope Mapping
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