---
name: telegram-setup
description: Use when the user wants to connect Cline to Telegram, configure a Telegram bot token, troubleshoot `cline connect telegram`, or understand how Telegram messages reach Cline.
---

# Telegram Connector Setup

Use Cline's native Telegram connector. Do not register a Telegram MCP server for this workflow.

## Quick Path

1. Create a bot in Telegram with `@BotFather`.
2. Get the bot token.
3. Get the local user's numeric Telegram user ID from `@userinfobot`.
4. Start the connector with an access restriction:

```bash
cline connect telegram --bot-token <TELEGRAM_BOT_TOKEN> --allowed-user-id <USER_ID>
```

When the user is unsure about flags, show the connector help:

```bash
cline connect telegram --help
```

## BotFather Steps

Ask the user to open Telegram and message `@BotFather`.

1. Send `/newbot`.
2. Pick a display name.
3. Pick a username ending in `bot`.
4. Copy the token exactly, including the numeric prefix and colon.

Treat the token as a credential. Do not print it back in full, write it into project files, or commit it.

## Access Restriction

Telegram bots are publicly reachable by username. Strongly prefer one of these before the connector is started:

- `--allowed-user-id <id>` for a single-user bot.
- `--hook-command <command>` for a reviewed custom allow/deny policy.

The user can get their numeric Telegram ID by messaging `@userinfobot`.

If the user intentionally wants an open bot, clearly state that anyone who finds the bot can send requests to the running Cline connector.

## Runtime Notes

- `cline connect telegram` runs a connector process that receives Telegram messages and creates Cline chat sessions.
- By default the connector may run in the background. Use `-i` / `--interactive` to keep it in the foreground for troubleshooting.
- Use `cline connect --stop` to stop running connectors.
- Use `--cwd <path>` to choose the workspace Cline should operate in.
- Use `--provider`, `--model`, `--api-key`, `--mode`, and `--no-tools` only when the user intentionally wants connector-specific runtime overrides.

## Troubleshooting

- Missing token: pass `--bot-token <token>`.
- Wrong bot username: pass `--bot-username` if Telegram `getMe` lookup cannot resolve it.
- No response in Telegram: confirm the connector is running, the bot token is valid, and the sender passes `--allowed-user-id` or the hook policy.
- Multiple connectors: stop stale connectors with `cline connect --stop`, then start the intended one.
