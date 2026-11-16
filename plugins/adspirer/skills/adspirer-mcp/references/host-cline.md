# Running in Cline

Checked against Cline's MCP, skills and CLI documentation and source on 2026-11-16. Menu labels
change; re-check before relying on them.

## Connection

- CLI: `cline mcp install adspirer --transport http https://mcp.adspirer.com/mcp`.
- VS Code or JetBrains: MCP Servers panel → Remote Servers → name `adspirer`, URL
  `https://mcp.adspirer.com/mcp`, transport Streamable HTTP. In the settings file the entry needs
  `"type": "streamableHttp"`; without a type Cline falls back to the older SSE transport and the
  connection fails.
- Sign-in is browser OAuth with the user's Adspirer account. Cline registers itself, opens the
  browser and listens on `http://127.0.0.1:1456/mcp/oauth/callback` (it tries the next few ports
  if that one is busy). No API key or client secret is involved. Never ask for a token in chat.
- If sign-in expires, the user re-runs it from `cline mcp` → Authorize OAuth, or from the server's
  row in the MCP Servers panel. If the tools are missing, say so; do not invent data.

## Plan and Act

Use Plan mode for reading: connections, performance, audits, drafts of a change. Switch to Act
only to carry out a change the user has approved in this conversation.

## Auto-approve, YOLO mode and headless runs

Cline can approve tool calls automatically, and the CLI can run with no one watching. Neither is
consent to change an ad account. This server can change ad accounts, so before every write show
the account, the exact change and the cost, and wait for a yes in the conversation, even when
auto-approve would let the call through. Recommend that users leave auto-approve off for the
Adspirer routers. In a headless or scheduled run, do read-only work only.

Follow the approvals and purchases rules in the main skill: never use a browser or terminal to
buy or upgrade a plan, and never treat a broad goal as permission to spend.
