# Convex

Adds Convex backend support for Cline projects.

This plugin registers the Convex MCP server with `npx -y convex@1.41.0 mcp start`, giving Cline live Convex deployment tools for schemas, functions, data, logs, and environment variables when the MCP server is enabled. It also bundles a Convex backend skill for designing and reviewing reactive, type-safe Convex apps.

Use it when building or maintaining Convex projects with schemas, queries, mutations, actions, auth, file storage, scheduled jobs, vector search, or real-time client features.

## Requirements

- Node.js and `npx` on PATH.
- A Convex project in the workspace.
- Convex CLI authentication or a linked deployment when using live MCP tools.
- Network access when the MCP server starts and `npx` resolves the Convex CLI.

The plugin registers a network-backed stdio MCP server. When Cline starts or reconnects that server, it runs `npx -y convex@1.41.0 mcp start` from the installed plugin package, which can resolve the Convex CLI package and start the MCP process. Install is inert, but enabling/using the MCP server requires trusting that runtime.

The plugin does not start `convex dev`, stream logs, or run typechecks automatically. Ask Cline to run those commands when you want that feedback loop.

Live MCP tools can expose deployment data, logs, and environment variable names or values. Use them deliberately, and confirm before reading production data or environment variables.

## License

Apache-2.0. See the repository license, `LICENSE.convex-backend-skill`, and `NOTICE.convex-backend-skill`.
