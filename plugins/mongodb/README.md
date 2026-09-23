# mongodb

Work with MongoDB from Cline using the MongoDB MCP server and bundled MongoDB workflow skills.

## What It Does

This plugin installs `mongodb-mcp-server` with the plugin package and registers a `mongodb` stdio MCP server. The MCP server can connect to MongoDB deployments, inspect databases and collections, explain queries, view indexes, and use MongoDB Atlas administration tools when the user configures Atlas API credentials. The registered MCP server defaults to `MDB_MCP_READ_ONLY=true`.

The plugin also bundles seven MongoDB skills:

- `mongodb-mcp-setup`: configure MongoDB MCP credentials and read-only mode.
- `mongodb-natural-language-querying`: turn natural language requests into read-only find queries and aggregation pipelines.
- `mongodb-query-optimizer`: diagnose slow queries and recommend indexes or pipeline changes.
- `mongodb-schema-design`: design or review MongoDB schemas, including embed/reference tradeoffs and document growth risks.
- `mongodb-search-and-ai`: build Atlas Search, Vector Search, and hybrid search workflows.
- `mongodb-connection`: tune client connection pooling, timeouts, and lifecycle patterns.
- `mongodb-atlas-stream-processing`: plan and operate Atlas Stream Processing workspaces, connections, processors, and diagnostics.

## Install

```bash
cline plugin install mongodb
```

For local development from this repository:

```bash
cline plugin install ./plugins/mongodb --cwd .
```

## Requirements

- Node.js available to run the package-local MCP server.
- For database access, one of:
  - `MDB_MCP_CONNECTION_STRING` for a direct MongoDB connection.
  - `MDB_MCP_API_CLIENT_ID` and `MDB_MCP_API_CLIENT_SECRET` for MongoDB Atlas Admin API workflows.
  - Atlas Local and Docker for local development workflows that do not need cloud credentials.
- `MDB_MCP_READ_ONLY=true` is the default. Set `MDB_MCP_READ_ONLY=false` only when you intentionally want writable MCP tools and understand the data, Atlas resource, and billing impact.

## Security Notes

MongoDB credentials are secrets. Do not paste them into chat, commit them, or ask Cline to store them. Configure them in the environment or in Cline MCP settings outside this plugin.

The MCP server can read and, when explicitly put into writable mode, modify MongoDB data and Atlas resources according to the credentials provided. The bundled skills require explicit user approval before writes, destructive operations, index creation, processor starts, or changes that may affect billing.

## Attribution

Bundled MongoDB skill material is derived from `mongodb/agent-skills`, authored by MongoDB and licensed under Apache-2.0. See `LICENSE.mongodb` and `NOTICE.mongodb.md`.
