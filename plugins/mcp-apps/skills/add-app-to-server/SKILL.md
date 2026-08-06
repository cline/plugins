---
name: add-app-to-server
description: Add an MCP App UI resource to an existing MCP server tool without breaking text-only MCP clients.
---

# Add App To Server

Use this skill when the user already has an MCP server and wants to add an interactive UI to one or more existing tools.

Preserve the existing tool contract first. The UI is an enhancement, not a replacement for the model-readable tool result.

## Analyze The Server

1. Find the MCP server entrypoint and the tool registration APIs it uses.
2. List the existing tools, their input schemas, output shapes, and side effects.
3. Identify which tool result needs a UI and what data the UI needs to render.
4. Check whether the UI should be read-only, interactive through app-only helper tools, or capable of calling existing tools.
5. Identify current build tooling and package manager.

## Add The UI

1. Add `@modelcontextprotocol/ext-apps` only if the project does not already use it.
2. Configure the existing bundler, or add Vite with `vite-plugin-singlefile`, to emit a self-contained HTML file.
3. Create a UI entrypoint such as `mcp-app.html` plus framework code under the project's existing source layout.
4. Register a resource URI for the built HTML.
5. Update the target tool to return:
   - `content` with a useful text fallback.
   - UI metadata pointing to the resource URI and initial data.
6. Keep model-facing tools model-facing. Use app-only helper tools only for interactions the model should not call directly.

## UI Data Flow

Prefer a simple data model:

- Initial tool result contains enough data for the first render.
- The UI calls app-only helper tools for refreshes, mutations, or large data.
- Server validates app-originated input just like model-originated input.
- Errors are visible both in the UI and in model-readable text where relevant.

## CSP And Assets

Declare every external boundary:

- `connectDomains` for APIs, WebSockets, and fetch calls.
- `resourceDomains` for images, fonts, styles, and scripts.
- `frameDomains` for embedded iframes.

Avoid adding broad wildcards. If the project has tenant-specific domains, document how the server derives them.

## Review Checklist

- Existing non-UI tool behavior still works.
- UI-capable hosts get a resource that exists at runtime.
- Text-only clients receive enough information to continue.
- Helper tools have the narrowest useful visibility.
- Build artifacts are ignored or committed according to the repository's normal practice.
- The user explicitly approved any new external service, tunnel, or hosted dependency needed for testing.
