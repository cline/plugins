# Workflow Router

## Table of Contents

- Box MCP tool usage
- Box CLI local verification
- Direct REST fallback
- Content workflows
- Webhooks and events
- AI and retrieval
- Troubleshooting

Use this file when the task is ambiguous and you need to decide which targeted reference to open next.

## Box MCP tool usage

Open `references/mcp-tool-patterns.md` for:

- Working with Box content via MCP tools (search, read, upload, organize)
- Box AI queries via MCP (Q&A, summarization, extraction)
- Metadata extraction and structured extraction via MCP
- General MCP tool usage patterns and guidelines

## Box CLI local verification

Open `references/box-cli.md` for:

- CLI-first smoke tests
- Safe CLI auth checks
- `--as-user` verification
- Quick local reads and writes without changing app code

## Direct REST fallback

Open `references/rest-calls.md` for:

- Last-resort REST usage after MCP and CLI setup paths fail
- Required explicit user confirmation before REST calls
- `BOX_ACCESS_TOKEN` setup and safe token handling
- Canonical `curl` templates and error/backoff guidance

## Content workflows

Open `references/content-workflows.md` for:

- Uploading files
- Creating folders
- Listing folder items
- Downloading or previewing files
- Creating shared links
- Inviting collaborators
- Reading or writing metadata

## Bulk operations

Open `references/bulk-operations.md` for:

- Organizing or reorganizing files across folders
- Batch-moving files into a structured hierarchy
- Creating folder trees for classification schemes
- Bulk metadata tagging
- Serial execution constraints and rate-limit handling

## Webhooks and events

Open `references/webhooks-and-events.md` for:

- Push-based notifications
- Catch-up syncs with the events APIs
- Signature verification
- Idempotent event consumers

## AI and retrieval

Open `references/ai-and-retrieval.md` for:

- Search-first retrieval
- Box AI questions and summaries
- External AI pipelines over Box content
- Traceability and citation requirements

## Troubleshooting

Open `references/troubleshooting.md` for:

- 401, 403, 404, 409, and 429 failures
- Wrong-actor bugs
- Search result mismatches
- Webhook verification failures
