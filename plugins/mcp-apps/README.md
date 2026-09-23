# mcp-apps

Adds Cline skills for building MCP Apps: MCP tools that return interactive UI resources for hosts that support app rendering.

## What It Does

The plugin bundles four skills:

- `create-mcp-app` for starting a new MCP App server and UI.
- `add-app-to-server` for adding an interactive UI resource to an existing MCP server tool.
- `convert-web-app` for making an existing web app work both standalone and as an MCP App.
- `migrate-oai-app` for migrating OpenAI Apps SDK patterns to MCP Apps.

These skills focus on the practical architecture: tool plus HTML resource, CSP and CORS boundaries, text fallbacks for non-UI hosts, build outputs, and runtime testing with an MCP Apps-capable host.

## Install

```bash
cline plugin install mcp-apps
```

For local development from this repository:

```bash
cline plugin install ./plugins/mcp-apps --cwd .
```

## Requirements

The plugin itself has no runtime services, MCP servers, or API keys.

Projects built with these skills usually need Node.js, an MCP server framework, `@modelcontextprotocol/ext-apps`, `@modelcontextprotocol/sdk`, a bundler such as Vite, and any app framework the project already uses. When adding dependencies, let the package manager resolve current versions instead of guessing version numbers.

## Trust Boundary

The skills may guide Cline to add dependencies, run builds, and start local app or MCP servers when that is central to the user's task. Do not clone reference repositories, start demo hosts, expose tunnels, or connect to external APIs unless the user asked for that workflow or approved it during the session.
