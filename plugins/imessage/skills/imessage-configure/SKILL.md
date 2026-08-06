---
name: imessage-configure
description: Check macOS iMessage plugin setup for Cline, including Messages database access, access policy, Bun runtime, and what the MCP tools can and cannot do.
---

# iMessage Configure

Use this when the user asks how to set up iMessage in Cline, why iMessage tools are unavailable, or who can be read or replied to.

This plugin is explicit MCP tooling, not a background inbound channel. Cline does not currently consume custom MCP channel notifications, so installing this plugin does not make Cline reachable by texting the Mac. The useful flow is: inspect allowlisted history with `chat_messages`, then send explicit replies with `reply`.

## Status checks

1. Platform
   - If not macOS, explain that iMessage tools are not registered on this platform.
2. Bun runtime
   - Check `command -v bun`.
   - If missing, tell the user Bun must be installed before the MCP server can start.
3. Full Disk Access
   - Run `ls ~/Library/Messages/chat.db`.
   - If it fails with `Operation not permitted`, tell the user to grant Full Disk Access to the app or terminal that runs Cline in System Settings, Privacy and Security, Full Disk Access.
4. Access state
   - Read `~/.cline/channels/imessage/access.json`.
   - Missing file means conservative defaults: self-chat only, no other handles, no groups.
   - Show `dmPolicy`, allowed handles, group GUIDs, `textChunkLimit`, and `chunkMode` when present.
5. Automation permission
   - Explain that macOS prompts the first time Messages.app is controlled for sending. This cannot be reliably pre-checked from the terminal.

## Guidance

Prefer allowlist setup over broad access. This plugin reads the user's personal Messages database, so other contacts should only be added after the local user explicitly asks.

For self-chat, the server learns the user's own sent addresses from `chat.db`. If no self-chat appears, ask the user to send themselves an iMessage once, then restart the MCP server.

For another person, ask for the exact iMessage handle, usually a phone number like `+15551234567` or an Apple ID email. Then use the `imessage-access` skill to add it.

For groups, ask the user to provide the chat GUID from `chat_messages` output. Group GUIDs look like `iMessage;+;chat...`. Adding a group explicitly exposes that group's recent history and permits text replies to it.

Do not claim that Cline will auto-reply to incoming texts. Replies are explicit tool calls.
