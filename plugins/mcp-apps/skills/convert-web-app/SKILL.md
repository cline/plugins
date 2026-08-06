---
name: convert-web-app
description: Convert an existing web application into a hybrid app that can run standalone and as an MCP App.
---

# Convert Web App

Use this skill when the user wants an existing web app, SPA, iframe embed, dashboard, or visualization to also run as an MCP App.

Keep one codebase. Add MCP-mode entry points and host integration without breaking the standalone browser experience.

## Map The Existing App

Inspect:

- Framework and bundler.
- Routing and app entrypoints.
- Data sources: URL parameters, local files, API calls, WebSocket connections, localStorage, or server-rendered props.
- External resources: fonts, images, CDNs, scripts, iframes, analytics, and API domains.
- Authentication and user data flow.
- Existing build and test commands.

## Hybrid Architecture

Use a small adapter layer:

- Standalone mode reads from the existing browser inputs.
- MCP mode reads initialization data from the host context.
- Shared rendering components remain framework-native.
- Server-side MCP tools provide data or mutations that should not happen directly from the browser.
- The MCP App HTML build is a single-file artifact served as an MCP resource.

Avoid forking the entire app into separate standalone and MCP implementations.

## Server Work

1. Add or extend an MCP server entrypoint.
2. Register a resource for the MCP App HTML.
3. Register a tool that returns text fallback content plus UI metadata.
4. Add helper tools only when the UI needs refreshes, pagination, mutations, or server-only API access.
5. Validate all inputs regardless of whether they came from the model or the UI.

## Client Work

1. Add MCP-mode detection.
2. Initialize the host app object only when embedded as an MCP App.
3. Map existing props, URL params, or API inputs to host-provided initialization data.
4. Respect host theme and sizing where available.
5. Keep direct external API calls only when CSP and auth boundaries are intentional. Otherwise route them through MCP server tools.

## Build Work

1. Keep the existing web build intact.
2. Add a second build target for the MCP App HTML when necessary.
3. Inline assets for the MCP resource when practical.
4. Ensure the server reads the built file from a stable path.

## Before Finishing

Verify both modes:

- Standalone app still runs with the existing command.
- MCP App build emits the expected single HTML file.
- The MCP tool gives useful text output without UI rendering.
- The embedded UI can render initial data and call helper tools if any were added.
- CSP metadata matches the app's actual network and resource usage.
