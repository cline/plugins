# Box MCP Tool Patterns

Best-practice patterns for working with Box content via the Box MCP server. The MCP schema already describes each tool's parameters - this reference focuses on how to use them well.

> Mandatory guardrails are registered by the Cline `box` plugin rule. They cover confirmation gates for destructive actions, hub modifications, file comments, Doc Gen output locations, externally shared folders, content display preferences, and Box AI governance. Read and follow them in every session.

## MCP auth and setup

The Box MCP server authenticates via OAuth 2.0. The MCP server connection is configured by the user through their Cline MCP settings. This keeps credentials in the user's own config and avoids storing Box OAuth app credentials in this plugin, the project repository, or chat.

The Box OAuth app must also allow the redirect or callback URI required by the user's Cline MCP OAuth flow. See `references/auth-and-setup.md` for step-by-step guidance on creating an OAuth app, retrieving credentials, and configuring the MCP server without exposing secrets.

If MCP tools are not appearing in the session:

1. Check the user's Cline MCP settings for a Box server entry. If it contains a `box` server with Box OAuth app credentials, the MCP server should be available. Verify by calling `who_am_i`. If it fails, the OAuth flow may not have been completed - call `mcp_auth` to trigger it.
2. If no Box server entry exists, guide the user through `references/auth-and-setup.md` to create or retrieve OAuth credentials and add the server:

```json
{
  "mcpServers": {
    "box": {
      "url": "https://mcp.box.com",
      "auth": {
        "CLIENT_ID": "<client_id>",
        "CLIENT_SECRET": "<client_secret>"
      }
    }
  }
}
```

Ask the user before editing Cline MCP settings. If they approve and the file already contains other MCP servers, merge the `box` entry into the existing `mcpServers` object - do not overwrite the file. Never write credentials into the conversation or into files inside a repository.

3. Confirm the OAuth app has the redirect or callback URI required by the user's Cline MCP OAuth flow.
4. Restart the Cline session only as a last resort - MCP connections are established at session startup.

If MCP auth still fails after setup, fall back to the Box CLI while the user resolves the connection. See `references/box-cli.md` for CLI auth and common commands. If CLI is unavailable or the user declines CLI, ask for explicit confirmation before using direct REST fallback and then use `references/rest-calls.md`.

## When to use MCP vs CLI

Tool selection between MCP and CLI is handled in the main skill workflow - see the tool selection table in `SKILL.md`. In short: MCP provides structured I/O and concurrent-safe calls; CLI provides full API coverage and compact, field-filtered output. Direct REST is last-resort fallback only, and requires explicit user confirmation.

## Search

- When the user refers to a folder by name, use `search_folders_by_name` first to resolve the folder ID, then scope subsequent file searches to that folder.
- Prefer `search_files_metadata` over keyword search when the user's query maps to known metadata fields or templates - it returns more precise results.

## File writes

- When uploading new files with `upload_file`, prefer writing to a dedicated output folder rather than the root or the same folder as source files. Ask the user where to place output if it isn't obvious.

## Metadata and structured extraction

- Prefer `ai_extract_structured` over `ai_extract_freeform` when a metadata template exists. Check for available templates first (e.g., via context or prior results) and infer the best match. Only ask the user if no template can be determined. Always tell the user which template was selected.
- When extracting from multiple files, process them in batches and summarize results clearly - don't dump raw JSON unless asked.
- Use `ai_extract_structured_from_fields_enhanced` when the user needs custom field definitions without a pre-existing template.

## Box AI

- Use `ai_qa_single_file` for questions about one document, `ai_qa_multi_file` for cross-file analysis, and `ai_qa_hub` when the user has an existing hub.
- Use `get_file_content` only when the user has confirmed raw content retrieval or the task truly requires file text that Box AI/search/metadata/previews cannot provide.
- Box AI responses include citations - surface them when possible so the user can verify answers.

## General guidelines

- Call `who_am_i` at the start of a session if you need to verify permissions or identify the authenticated user.
- When listing folder contents, paginate if needed and summarize large directories rather than printing every item.
- Prefer reading file details with `get_file_details` before operating on a file - it confirms the file exists and shows current state.
- For exploratory or demo usage, prefer working within a dedicated folder rather than operating across the user's entire Box account.
- Avoid granting or assuming broad enterprise-wide access. Default to least-privilege - only access the folders and files the task requires.
