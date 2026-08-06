# supabase

Supabase project and Postgres guidance for Cline, with the official Supabase remote MCP server and bundled Supabase skills.

## What It Adds

This plugin registers the official Supabase MCP server and bundles Supabase-focused skills for project work, database changes, auth, storage, realtime, edge functions, migrations, RLS, and Postgres performance best practices.

It uses Cline's MCP authorization flow. It does not install the Supabase CLI, run migrations, query projects, or contact Supabase during installation.

## Cline Primitives

- MCP: `supabase` connects to `https://mcp.supabase.com/mcp` for Supabase project, docs, SQL, advisor, logs, migration, and management tools.
- Skills: `supabase` for general Supabase workflows and `supabase-postgres-best-practices` for Postgres schema, query, connection, RLS, locking, monitoring, and data-access guidance.
- Bundled skills cover credential masking, read/plan defaults, approval gates for SQL/project mutations, private/untrusted MCP output handling, migration review discipline, and official-doc verification.

## Requirements

Users need access to the relevant Supabase organization/project and may need to complete Supabase MCP OAuth through Cline. CLI workflows require a user-installed Supabase CLI or project-pinned CLI command runner; the plugin does not install the CLI.

## Trust Boundaries

Supabase workflows can expose schema, data rows, auth users, storage metadata, logs, connection strings, API keys, migrations, generated types, and production project configuration. The plugin asks before writes, migrations, broad reads, deployments, auth/storage/RLS changes, and production-impacting operations.
