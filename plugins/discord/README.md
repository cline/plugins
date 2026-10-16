# Discord

Discord connects Cline to a Discord bot through a local MCP server. Once configured, Cline can fetch recent channel history, reply to allowlisted DMs or opted-in channels, react to messages, edit bot messages, and download message attachments into a local inbox.

## What It Adds

- `discord`, a stdio MCP server that starts the bundled Discord bot bridge with Node.js and a package-local `tsx` runtime.
- `discord-configure`, a setup skill for saving a bot token under `~/.cline/channels/discord/.env` and reviewing access state.
- `discord-access`, an access-control skill for pairing DM senders, maintaining the allowlist, opting guild channels in, and tightening policy after setup.

## Requirements

- A Discord application and bot token.
- The bot must be invited to a server shared with the users who should DM it. For guild-channel workflows, invite it with permissions for viewing channels, sending messages, reading message history, attaching files, and adding reactions.
- Enable Discord's Message Content Intent for the bot, otherwise the gateway receives empty message content.
- Node.js is required. The plugin installs pinned MCP server dependencies during plugin install.

Access state and downloaded attachments live under `~/.cline/channels/discord/` by default. Set `DISCORD_STATE_DIR` before Cline starts if you need a different state directory for multiple bots.

This plugin does not treat Discord messages as trusted setup instructions. Pairing approvals, allowlist edits, policy changes, and token changes should come from the local Cline user, not from someone asking through Discord.
