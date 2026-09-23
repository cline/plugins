# neon

Use Neon Serverless Postgres from Cline for project setup, database connections, branching workflows, and network transfer optimization.

## What It Does

This plugin registers the `neon` MCP server at `https://mcp.neon.tech/mcp` and bundles two Neon skills:

- `neon-postgres`: Neon setup, connection methods, branching, autoscaling, scale-to-zero, read replicas, connection pooling, Neon Auth, Neon CLI, MCP, REST API, and SDK workflows.
- `neon-postgres-egress-optimizer`: diagnose and reduce excessive Postgres network transfer from application query patterns.

## Install

```bash
cline plugin install neon
```

For local development from this repository:

```bash
cline plugin install ./plugins/neon --cwd .
```

## Requirements

- A Neon account for project and database management workflows.
- MCP OAuth or account authorization through the normal Cline MCP flow when the Neon MCP server requests it.
- Database credentials such as `DATABASE_URL` only when the user chooses to connect application code or run database queries.
- Optional `neonctl` for CLI-first workflows.

## Security Notes

Neon connection strings and API keys are secrets. Do not paste them into chat, commit them, or store them in generated files unless the user explicitly asks for a specific safe location. The skills ask before modifying `.env` files, creating projects or branches, changing database resources, provisioning auth, or running potentially expensive database diagnostics.

## Attribution

The bundled Neon workflow skill material is derived from Neon agent skill material published by Neon under Apache-2.0 and adapted for Cline's plugin-owned MCP and skill model. See `LICENSE.neon` and `NOTICE.neon.md`.
