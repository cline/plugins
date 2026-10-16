# zoom-mcp RUNBOOK -- 5-Minute Preflight
Quick diagnostic checklist before using the Zoom MCP server.
## Preflight Checklist
1. Token configured for the user-managed MCP entry?
If the user's MCP configuration references environment variables, confirm those variables are available to the MCP client:
```bash
echo "${ZOOM_MCP_ACCESS_TOKEN:+set}"
echo "${ZOOM_DOCS_MCP_ACCESS_TOKEN:+set}"
echo "${ZOOM_WHITEBOARD_MCP_ACCESS_TOKEN:+set}"
```
If empty, configure the relevant token using [concepts/oauth-setup.md](concepts/oauth-setup.md).
2. Tool discovery working?
- Confirm the client can see 7 default Zoom MCP tools: `search_meetings`,
  `create_new_file_with_markdown`, `search_zoom`, `get_meeting_assets`,
  `get_recording_resource`, `get_file_content`, and `recordings_list`.
- For the dedicated Zoom Docs server, confirm the client can see `create_file_with_content`
  and `get_file_content`.
- Team Chat MCP is documented in [team-chat/SKILL.md](team-chat/SKILL.md), but it is not
  registered by this plugin by default.
- If your client exposes raw protocol inspection, verify `tools/list` succeeds.
- Compare the visible tools with [references/tools.md](references/tools.md).
3. Correct OAuth scopes on the token?
Minimum Zoom MCP scopes for this guide:
- `ai_companion:read:search` -- Search across Zoom Meeting, Zoom Chat, and Zoom Doc
- `meeting:read:search` -- Search and view meetings
- `meeting:read:assets` -- View a meeting's assets
- `cloud_recording:read:list_user_recordings` -- Lists all cloud recordings for a user.
- `cloud_recording:read:content` -- read recording content scope
- `docs:write:import` -- Create Zoom Docs from Markdown through the main Zoom MCP server
- `docs:read:export` -- Read Zoom Docs or My Notes Markdown content
Minimum Zoom Docs MCP scopes:
- `docs:write:import` -- Create new file by import
- `docs:read:export` -- Read file content in Markdown format
Whiteboard uses a separate scope set. See [whiteboard/SKILL.md](whiteboard/SKILL.md).
Team Chat write/update tools use a separate scope set. See [team-chat/SKILL.md](team-chat/SKILL.md).
4. AI Companion features enabled?
Go to Zoom web portal -> Admin -> Account Management -> Account Settings -> AI Companion.
Confirm Smart Recording and Meeting Summary are enabled if you expect semantic search,
meeting assets, or transcript-rich recording content to be useful.
## Quick Fixes
| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `-32001 Access token is required` | Token missing or unavailable to the MCP client | Configure the token source, then reconnect the MCP server |
| `-32001 Invalid access token, does not contain scopes:[meeting:read:search]` | Missing semantic-search scope | Add `meeting:read:search` and mint a new user token |
| `-32001 Invalid access token, does not contain scopes:[meeting:read:assets,...]` | Missing meeting-assets scope | Add `meeting:read:assets` and mint a new user token |
| `-32001 Invalid access token, does not contain scopes:[ai_companion:read:search]` | Missing cross-Zoom search scope | Add `ai_companion:read:search` and mint a new user token |
| `-32001 Invalid access token, does not contain scopes:[cloud_recording:read:list_user_recordings,...]` | Missing recordings-list scope | Add `cloud_recording:read:list_user_recordings` |
| `-32001 Invalid access token, does not contain scopes:[cloud_recording:read:content]` | Missing recording-content scope | Add `cloud_recording:read:content` |
| `-32001 Invalid access token, does not contain scopes:[docs:read:export]` | Missing Docs export scope | Add `docs:read:export` and mint a new user token |
| `-32602 Can not found tool: ... in this MCP Server` | Wrong endpoint surface or wrong tool name | Re-run `tools/list` and use the current tool names for the active MCP server |
| `-32603 Call handle error` | Missing required parameters or server-side call handling failure | Re-check required arguments against the live schema and retry |
| `Upstream API returned error status code: 400 ... invalid param` | Invalid parameter value passed through to the underlying Zoom API | Fix the specific argument value, such as `parent_id` for Docs creation on the dedicated Docs server |
| Search returns no useful meeting content | AI Companion features missing or data not indexed | Enable Smart Recording + Meeting Summary, widen the search window, or fall back to `recordings_list` |
## Auth Reality Check
Use user OAuth as the documented execution path for Zoom MCP content tools in this plugin.
Do not rely on Server-to-Server OAuth as a supported MCP auth model here.
## Where to Get Help
- Developer forum: https://devforum.zoom.us/
- Zoom support: https://support.zoom.com/
- MCP protocol docs: https://modelcontextprotocol.io/
