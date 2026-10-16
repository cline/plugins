---
name: discord-configure
description: Set up the Discord MCP plugin by saving a Discord bot token, checking access state, and guiding the user through safe bot permissions.
---

# Discord Configure

Use this skill when the local Cline user pastes a Discord bot token, asks how to set up Discord, asks who can reach the bot, or wants to check whether the plugin is ready.

The MCP server reads its token from the shell environment or from `~/.cline/channels/discord/.env`. Shell environment wins. If `DISCORD_STATE_DIR` is set for the MCP server, use that directory instead of `~/.cline/channels/discord`.

## Setup Checklist

1. Create a Discord application in the Discord Developer Portal.
2. Add a bot to the application and enable Message Content Intent.
3. Reset and copy the bot token. It is only shown once.
4. Invite the bot to a server shared with the users who should DM it.
5. For guild-channel workflows, grant permissions for View Channels, Send Messages, Send Messages in Threads, Read Message History, Attach Files, and Add Reactions.
6. Save the token locally.
7. Start or restart Cline so the MCP server can read the token.
8. DM the bot to generate a pairing code, approve the code with the Discord access skill, then switch policy to `allowlist` when the expected users are approved.

## Show Status

With no token argument, inspect:

1. `~/.cline/channels/discord/.env` for `DISCORD_BOT_TOKEN`.
2. `~/.cline/channels/discord/access.json`, treating a missing file as `dmPolicy: "pairing"`, empty `allowFrom`, empty `groups`, and empty `pending`.

Report:

- Whether the token is set. If set, show only the first 6 characters followed by masking.
- Current DM policy and what it means.
- Allowed sender count and Discord user snowflakes.
- Pending pairing count and codes.
- Opted-in guild channel count.
- A concrete next step.

Push toward lockdown. `pairing` is useful for capturing Discord user IDs, but it should not be the long-term policy. Once the expected users are in `allowFrom`, recommend switching to `allowlist`.

## Save A Token

When the local user provides a token:

1. Trim whitespace.
2. Create `~/.cline/channels/discord`.
3. Read `.env` if it exists.
4. Add or replace the `DISCORD_BOT_TOKEN=` line, preserving other lines.
5. Write the file with no quotes around the token.
6. Set file mode to `600` when the platform supports it.
7. Tell the user that the MCP server reads the token at startup, so they should restart Cline or reload the plugin after changing it.
8. Show status so the user can see the next step.

When the user asks to clear the token, remove the `DISCORD_BOT_TOKEN=` line. If that leaves the file empty, remove the file.

## Access Orientation

Discord itself gates who can DM a bot: a user must share a server with the bot. The Developer Portal's Public Bot toggle controls who can add it to new servers. These gates do not replace the plugin allowlist.

Default access policy is `pairing`. Unknown DM senders receive a code and their message is dropped. The local Cline user approves a code with the Discord access skill, which adds the sender's Discord user ID to `allowFrom`.

Guild channels are off by default and must be opted in by channel ID. With `requireMention: true`, Cline should respond only when the bot is mentioned or replied to. Only disable mention requirements when the local user explicitly wants the bot to process every message in that channel.
