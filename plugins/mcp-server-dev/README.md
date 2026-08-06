# mcp-server-dev

Adds Cline skills for designing, building, and packaging MCP servers.

## What It Does

The plugin bundles two skills:

- `build-mcp-server` helps choose the right server shape, design tools, handle auth, and scaffold a maintainable MCP integration.
- `build-mcpb` helps package or distribute local MCP servers that must read local files, call localhost services, or interact with desktop or OS APIs.

For rich interactive MCP UI work, use the separate `mcp-apps` plugin. This plugin intentionally avoids duplicating MCP App authoring guidance.

## Install

```bash
cline plugin install mcp-server-dev
```

For local development from this repository:

```bash
cline plugin install ./plugins/mcp-server-dev --cwd .
```

## Requirements

The plugin itself has no MCP servers, runtime services, API keys, or local CLIs.

Projects built with these skills may need Node.js or Python, `@modelcontextprotocol/sdk`, FastMCP, a deploy target such as Cloudflare Workers, or host-specific packaging tools. Add those only in the target project and let its package manager resolve current versions.

## Trust Boundary

The skills may guide Cline to create server code, add dependencies, run local inspectors, or start local MCP servers when the user asks to build or test an integration. Do not expose tunnels, publish packages, deploy services, or package host-specific bundles unless the user explicitly requests that step.
