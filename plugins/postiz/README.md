# postiz

Postiz workflow guidance for Cline. It helps agents plan and execute social media scheduling work through the user's own Postiz CLI or API credentials.

## What It Does

Installs skills for Postiz setup, integration discovery, content scheduling, media upload, platform settings, and analytics triage.

## Install

```bash
cline plugin install postiz
```

For local development from this repository:

```bash
cline plugin install ./plugins/postiz --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Help me draft a LinkedIn and X launch post, discover the required Postiz integration IDs, and prepare the commands to schedule it for tomorrow.
```

## Requirements

- The `postiz` CLI installed by the user when live Postiz operations are needed.
- A Postiz account with connected social integrations.
- Authentication through `postiz auth:login` or `POSTIZ_API_KEY`.
- `POSTIZ_API_URL` only for custom or self-managed Postiz API endpoints.

## Security Notes

The plugin does not install the Postiz CLI, run an auth server, store credentials, or register an MCP server. Cline should ask before live posting, scheduling, deleting, changing status, uploading media, running `postiz auth:login`, or persisting any API key.
