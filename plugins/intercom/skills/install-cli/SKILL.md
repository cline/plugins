---
name: intercom-install-cli
description: >
  Install and authenticate the Intercom CLI (`@intercom/cli`) -- a command-line
  tool for managing Intercom workspaces, designed for both human operators
  and AI agents. Use when the user asks to "install the Intercom CLI",
  "set up the intercom command", "install @intercom/cli", or wants
  shell access to their Intercom workspace.
---

# Install Intercom CLI

Install the [`@intercom/cli`](https://www.npmjs.com/package/@intercom/cli) package globally and authenticate it against the user's workspace. The CLI complements this plugin: the plugin is for in-conversation MCP usage, while the CLI is for shell access, scripting, and workspace provisioning.

## Prerequisites

Before installing, verify the user has:

1. Node.js >= 20.6.0 -- Run `node --version` to check. If missing or older, direct them to install via [nodejs.org](https://nodejs.org) or their version manager (nvm, fnm, volta).
2. npm -- Comes bundled with Node.

If `node --version` returns < 20.6.0, stop and ask the user to upgrade before proceeding. The CLI will not run on older versions.

## Step 1: Install Globally

Ask for explicit approval before installing or updating a global npm package.

```bash
npm install -g @intercom/cli
```

Verify the install:

```bash
intercom --version
```

If the user gets a permission error (`EACCES`) on macOS or Linux, they likely have a system Node install. Recommend either:
- Switching to a user-managed Node via nvm/fnm/volta (preferred), or
- Configuring an [npm prefix](https://docs.npmjs.com/cli/v10/configuring-npm/folders#prefix-configuration) under their home directory.

Do not suggest `sudo npm install -g` -- installing global packages as root is a known footgun and will cause permissions issues on later updates.

## Step 2: Authenticate

There are two paths. Ask the user which applies.

### Path A: Existing Workspace (most common)

The user has an Intercom workspace and needs to connect the CLI to it.

1. Direct them to the [Developer Hub](https://app.intercom.com/a/apps/_/developer-hub).
2. Click New app (or select an existing app).
3. Under Authentication, copy the Access Token.
4. Authenticate one of two ways. Prefer that the user runs token commands locally; do not ask them to paste the raw token into chat, and never echo it back.

Option 1 -- Persistent (recommended for interactive use):

```bash
intercom auth login --token "$INTERCOM_TOKEN"
```

This stores the token in the OS keyring (Keychain on macOS, Secret Service on Linux, Credential Manager on Windows) so future commands don't need the env var. If the token is not already in `INTERCOM_TOKEN`, have the user paste it directly into their own shell or use their password manager's CLI.

Option 2 -- Environment variable (recommended for CI / scripting):

```bash
export INTERCOM_TOKEN="..."
```

Ask before writing credentials to `~/.zshrc`, `~/.bashrc`, or the equivalent. Prefer a local secret manager or CI secret store. Never write tokens into source-controlled files.

The env var takes precedence over the keyring-stored credential when both are present.

### Path B: New Workspace (provisioning)

The user wants to create a brand-new Intercom workspace from scratch -- no token needed.

This provisions a real Intercom workspace and stores credentials. Ask for explicit approval before running it.

```bash
intercom setup --company-name "Acme"
```

This command provisions a workspace, signs the user in, and stores the resulting credentials. The CLI will prompt for an email, password, and verification code during the flow.

If the user has additional setup needs (importing articles, enabling Fin, etc.), point them at:

```bash
intercom setup --help
```

## Step 3: Verify

Run:

```bash
intercom me
```

Expected output: the admin's name, email, and the active workspace ID. If this fails:

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| `Not authenticated` | No token in keyring or env | Re-run Step 2 |
| `401 Unauthorized` | Token revoked or wrong workspace | Generate a new token in the Developer Hub |
| `command not found: intercom` | Global install path not on `$PATH` | Run `npm config get prefix`, ensure `<prefix>/bin` is on `$PATH` |

## Step 4 (Optional): Shell Completions

Recommend this only if the user uses `intercom` interactively in their shell.
Ask for approval before appending to shell startup files.

```bash
# zsh -- append to ~/.zshrc
intercom completion zsh >> ~/.zshrc

# bash -- append to ~/.bashrc
intercom completion bash >> ~/.bashrc

# fish
intercom completion fish > ~/.config/fish/completions/intercom.fish
```

Restart the shell or `source` the rc file for completions to take effect.

## Quick Reference

After install, the user can run any of these. Don't dump this whole list at them -- surface relevant commands based on their goal.

| Command | Purpose |
|---------|---------|
| `intercom me` | Show current admin + workspace |
| `intercom api <endpoint>` | Raw API access (like `gh api`) |
| `intercom articles list\|get\|search` | Help center articles |
| `intercom contacts list\|get\|search` | Contacts |
| `intercom conversations list\|get\|search` | Conversations |
| `intercom fin manifest\|enable\|download` | Fin AI Agent |
| `intercom messenger get\|update\|snippet` | Messenger config |
| `intercom config list` | Show CLI config |

Full reference: [`@intercom/cli` README](https://github.com/intercom/cli#readme).

## Agent / Pipe Mode

The CLI auto-detects when stdout is piped and switches to compact NDJSON (one JSON object per line). This makes it ergonomic for scripts and AI agents:

```bash
# Auto NDJSON when piped
intercom articles list | jq '.title'

# Force JSON
intercom articles list --json

# Inline jq filter
intercom articles list --jq '.data[].title'
```

If the user is using the CLI from Cline or other automation, prefer `--json` or `--jq` over parsing human-formatted output.

## Multi-Workspace

If the user manages multiple workspaces:

```bash
intercom auth list                  # show stored credentials
intercom auth switch <workspace>    # change default
intercom me --workspace <id>        # one-off override
```

Each workspace's credential is stored separately in the keyring.

## Troubleshooting

### `npm install -g` Hangs or Fails on Corporate Network
The user's npm registry may be proxied. Check `npm config get registry` -- if it points at an internal mirror, that mirror may not have `@intercom/cli` published. Set the registry explicitly for this install:

```bash
npm install -g @intercom/cli --registry=https://registry.npmjs.org
```

Ask for approval before retrying a global install against the public npm registry.

### `intercom` Command Found But Crashes Immediately
Usually a Node version mismatch. Run `node --version` and confirm it's >= 20.6.0. If using nvm, ensure the active version (`nvm current`) is the one the global install used.

### Token Stored But Commands Still Fail With 401
The `INTERCOM_TOKEN` env var overrides the keyring. Run `unset INTERCOM_TOKEN` and try again -- a stale env var may be shadowing a fresh keyring credential.

### Wrong Region (EU / Australia)
The CLI defaults to the US API. If the workspace is hosted in EU or Australia:

```bash
export INTERCOM_API_BASE_URL="https://api.eu.intercom.io"      # EU
export INTERCOM_API_BASE_URL="https://api.au.intercom.io"      # Australia
```

Ask before persisting this in a shell rc file.
