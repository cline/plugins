---
name: dv-connect
description: Safe Dataverse workspace setup for Cline - inspect tools, authenticate, create local config, copy helper scripts, and optionally guide MCP setup when the user explicitly asks.
---

# Skill: Connect

Use this skill when starting a Dataverse project, switching environments, fixing authentication, or preparing the local helper scripts used by the other Dataverse skills.

## Safety Rules

- Do not install tools, authenticate CLIs, write `.env`, edit `.gitignore`, copy helper scripts, configure MCP, or modify Dataverse until the user has seen the exact planned command or file change and approved it.
- Never overwrite an existing `.env`. If it exists, read only the variable names and whether required values are present; do not display secret values.
- Confirm the target environment URL before any command that can change a Dataverse environment.
- This plugin does not register an MCP server during installation. MCP setup is optional workspace configuration and should only happen when the user explicitly asks for MCP.
- Treat setup as idempotent: inspect first, skip what is already present, and summarize gaps before proposing changes.

## Step 0: Inspect Existing Setup

Run read-only checks first:

```bash
test -f .env && echo ".env present" || echo ".env missing"
test -f scripts/auth.py && echo "scripts/auth.py present" || echo "scripts/auth.py missing"
python --version
pac 2>/dev/null | head -5 || true
dataverse auth who 2>/dev/null || true
pac org who 2>/dev/null || true
```

If `.env` is present, check for these variable names without printing values:

- `DATAVERSE_URL`
- `TENANT_ID`
- `DATAVERSE_PLUGIN_VERSION`
- `DATAVERSE_PLUGIN_AGENT`
- optional: `CLIENT_ID`, `CLIENT_SECRET`, `SOLUTION_NAME`, `PUBLISHER_PREFIX`, `PAC_AUTH_PROFILE`

If `DATAVERSE_URL`, `TENANT_ID`, and `scripts/auth.py` are present and auth checks match the requested environment, skip setup and proceed to verification.

## Step 1: Present A Setup Plan

If setup is incomplete, present a concise plan before running mutating commands. Include:

- tools that are missing or outdated
- authentication commands needed
- `.env` variables to add or update, showing variable names only
- files to create or copy (`scripts/auth.py`, optional `templates/DATAVERSE_WORKSPACE.md`, `.gitignore` entries)
- whether MCP setup is being requested

Wait for explicit approval.

## Step 2: Tools

Check tools independently so the user sees all missing prerequisites:

| Tool | Check |
| --- | --- |
| Python 3 | `python --version` |
| Git | `git --version` |
| PAC CLI | `pac` |
| Dataverse CLI | `npm list -g @microsoft/dataverse` |
| .NET SDK | `dotnet --version` |
| Azure CLI | `az --version` |

Only after approval, install missing dependencies. Typical commands:

```bash
pip install --upgrade azure-identity requests PowerPlatform-Dataverse-Client pandas msal msal-extensions
npm install -g @microsoft/dataverse@latest
```

Do not run `npm init`, create app package files, or use Node.js for Dataverse scripts. The npm command above is only for the Microsoft Dataverse CLI.

## Step 3: Authenticate And Select Environment

Use existing profiles when they match the target environment:

```bash
dataverse auth list
dataverse auth who
pac auth list
pac org who
```

If the user approves creating or switching auth profiles:

```bash
dataverse auth create --environment <DATAVERSE_URL>
pac auth create --name <profile-name> --environment <DATAVERSE_URL>
```

For headless sessions, offer the Dataverse CLI device-code variant:

```bash
dataverse auth create --environment <DATAVERSE_URL> --deviceCode
```

Use the same account for Dataverse CLI and PAC CLI unless the user explicitly asks otherwise.

## Step 4: Create Local Config

If `.env` is missing, show the file path and variable names, then wait for approval before writing it. Use placeholders for unknown values and ask the user to configure secrets outside chat.

Minimum local `.env` shape:

```bash
DATAVERSE_URL=<environment-url>
TENANT_ID=<tenant-id>
DATAVERSE_PLUGIN_VERSION=1.5.0
DATAVERSE_PLUGIN_AGENT=cline
SOLUTION_NAME=
PUBLISHER_PREFIX=
PAC_AUTH_PROFILE=
```

For service principal auth, add `CLIENT_ID` and `CLIENT_SECRET` only when the user explicitly requests CI/CD or non-interactive auth. Do not ask the user to paste secret values into the conversation.

Ensure these local-only paths are ignored after approval:

```gitignore
.env
.vscode/settings.json
.cline/mcp.json
.token_cache.bin
*.snk
__pycache__/
*.pyc
solutions/*.zip
plugins/*/bin/
plugins/*/obj/
```

## Step 5: Workspace Helper Files

If `scripts/auth.py` is missing, offer to copy the bundled `scripts/auth.py` from this plugin into `scripts/auth.py` in the workspace. Do not overwrite an existing file without showing a diff and receiving approval.

If the user wants a workspace guide, offer to copy `templates/DATAVERSE_WORKSPACE.md` into the repository as `DATAVERSE_WORKSPACE.md` or merge its useful commands into an existing project guidance file.

## Step 6: Optional MCP Setup

This plugin does not install or own a Dataverse MCP server. If the user explicitly asks for MCP:

1. Explain that Dataverse MCP requires local workspace configuration and Microsoft authentication.
2. Use Cline's current MCP settings UI or CLI for the user's installed Cline version.
3. Present the planned server name, command, args, environment variables, and target config file before writing anything.
4. Prefer the Microsoft Dataverse stdio proxy:

```bash
npx -y @microsoft/dataverse@latest mcp <DATAVERSE_URL>
```

After MCP configuration, tell the user they may need to restart or resume the Cline session before new MCP tools appear.

## Step 7: Verify

Run only the verification checks that match what was configured:

```bash
dataverse auth who
pac org who
python -c "from PowerPlatform.Dataverse.client import DataverseClient; import pandas; print('Dataverse SDK ready')"
```

For workspace helper verification:

```bash
python - <<'PY'
import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), "scripts"))
from auth import load_env
load_env()
print("DATAVERSE_URL set:", bool(os.environ.get("DATAVERSE_URL")))
print("TENANT_ID set:", bool(os.environ.get("TENANT_ID")))
PY
```

If anything fails, show the failing command and output, then ask how the user wants to proceed.
