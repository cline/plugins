---
name: create-mcp-app
description: Build a new MCP App with an MCP tool, an interactive UI resource, a single-file HTML build, host styling, CSP, and text fallback behavior.
---

# Create MCP App

Use this skill when the user asks to create an MCP App, add an interactive MCP view, scaffold a UI-backed MCP tool, or learn MCP Apps SDK patterns.

An MCP App is an MCP tool plus a UI resource. The tool returns normal text content for the model and non-UI clients, and also returns metadata that points a UI-capable host at an HTML resource.

## First Decisions

1. Identify the server runtime already present in the workspace. Prefer extending it over creating a second server.
2. Choose the UI framework based on the project:
   - Existing React app: use React and `useApp` patterns.
   - Existing Preact, Solid, or vanilla app: keep the current stack.
   - No existing UI stack: choose the smallest stack that can express the requested UI.
3. Decide whether the UI needs live updates, host-to-app calls, app-only helper tools, or a static render.
4. Decide where the built HTML will live. Prefer one single-file HTML artifact per app view.

## Implementation Shape

Use the package manager to add dependencies instead of hardcoding versions from memory. Typical projects need:

```bash
npm install @modelcontextprotocol/ext-apps @modelcontextprotocol/sdk zod
npm install -D vite vite-plugin-singlefile typescript tsx
```

Adapt commands to the workspace's package manager and existing scripts.

The minimal architecture is:

- Server entrypoint registers the MCP tool and a resource handler for the UI HTML.
- UI entrypoint initializes against the MCP Apps host context when embedded.
- Build script emits one self-contained HTML file.
- Tool response includes text fallback content and UI metadata.
- Resource metadata declares CSP for every external domain the UI loads or connects to.

## Build Steps

1. Add or extend the MCP server entrypoint.
2. Register the UI resource before any tool returns it.
3. Add a tool whose result includes both:
   - `content` with useful text fallback.
   - UI metadata that points to the resource URI.
4. Add the UI entrypoint and keep host-specific code behind MCP-mode detection.
5. Configure Vite or the existing bundler to produce a single HTML artifact.
6. Add scripts for build, dev, and server start that match the repository's conventions.
7. Run the existing formatter, typecheck, and build commands.

## Host Behavior

Design for graceful degradation:

- Non-UI clients must still get a meaningful text response.
- UI-capable hosts should receive the HTML resource and any initialization data.
- The UI should respect host theme, font, and safe-area values when available.
- Direct network calls, images, fonts, scripts, iframes, and APIs must be reflected in CSP metadata.
- Long-running or animated UI should pause when hidden if the host exposes visibility state.

## Common Mistakes

- Returning only the UI metadata and no useful text fallback.
- Registering the resource after the tool tries to reference it.
- Loading external assets without CSP entries.
- Treating localStorage as shared across host views without checking the app view identity.
- Assuming every MCP client can render the UI.
- Starting a copied demo host instead of testing the actual server or host the user is targeting.

## Before Finishing

Verify:

- The app builds into the resource path the server reads.
- The MCP tool still returns useful text in a non-UI client.
- The UI resource can load without missing asset or CSP errors.
- Server-to-UI and UI-to-server calls are documented in the code where future maintainers will look.
- Any external APIs, tokens, or user data flows are explicit and not hidden in example code.
