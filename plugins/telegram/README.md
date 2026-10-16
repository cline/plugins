# Telegram

This plugin bundles Cline skills for setting up and safely operating Cline's native Telegram connector.

It helps users create a Telegram bot, start `cline connect telegram`, restrict access to trusted Telegram users, and reason about the security boundary between remote Telegram messages and the local Cline session.

## Cline Primitives

- Skill: `telegram-setup` guides BotFather setup, token handling, connector startup, foreground/background operation, and basic troubleshooting.
- Skill: `telegram-access` explains access controls for the Cline connector, including `--allowed-user-id`, `--hook-command`, group and DM trust boundaries, and safe handling of remote requests.
- Bundled skills remind Cline to treat Telegram messages as untrusted remote input and to use the native connector instead of a separate MCP server.

## Requirements

Users need a Telegram bot token from BotFather and the Cline CLI. The plugin does not store tokens, start the connector, register MCP servers, or contact Telegram during installation.

## Install

```bash
cline plugin install telegram
```

For local development from this repository:

```bash
cline plugin install ./plugins/telegram --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Help me connect Cline to Telegram with a bot token and restrict it to my Telegram user ID.
```

Cline will use the `telegram-setup` and `telegram-access` skills to guide BotFather setup, connector startup, and access-control choices.

## Security Notes

Telegram bot messages are remote input. Restrict connector access with `--allowed-user-id <id>` or a reviewed `--hook-command`, and stop connectors with `cline connect --stop` when they are no longer needed. Do not commit bot tokens or connector commands containing tokens.

## Attribution

The bundled Telegram guidance is adapted from Apache-2.0 licensed Telegram channel material. See `LICENSE.telegram`.
