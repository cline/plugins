# valtown

Build and deploy TypeScript vals on Val Town.

## What It Does

Registers the `valtown` MCP server and installs Val Town platform skills for HTTP endpoints, cron and interval vals, blob storage, SQLite storage, email, OAuth, React UI, templates, and third-party integrations.

The MCP server exposes Val Town actions for working with vals and their runtime resources. The bundled skills add platform-specific guidance for choosing file types, using Val Town standard libraries, remixing templates, verifying live endpoints, handling scheduled runs, and storing secrets in environment variables.

## Install

```bash
cline plugin install valtown
```

For local development from this repository:

```bash
cline plugin install ./plugins/valtown --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Create a small Val Town HTTP val with a React UI and SQLite-backed state.
```

## Requirements

- A Val Town account.
- Authorization for the Val Town MCP server when Cline prompts for MCP access.
- Any third-party API credentials needed by the val being built.

## Security Notes

Setup registers the remote Val Town MCP server and installs bundled skills only. It does not create vals, call Val Town APIs, send email, start schedules, create databases, upload blobs, or store secrets during installation.

Live Val Town work can create public URLs, send mail, change schedules, persist data, and call external services. The bundled skills require explicit approval for those actions and keep credentials in Val Town environment variables rather than source, blobs, logs, or public output.

## Attribution

Bundled Val Town skills and icon are derived from Val Town plugin materials, licensed under MIT. See `LICENSE.valtown` and `NOTICE.valtown`.
