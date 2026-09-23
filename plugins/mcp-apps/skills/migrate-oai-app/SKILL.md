---
name: migrate-oai-app
description: Migrate an OpenAI Apps SDK app, skybridge integration, or window.openai UI to MCP Apps SDK patterns.
---

# Migrate OpenAI App To MCP

Use this skill when the user asks to migrate from OpenAI Apps SDK, convert an OpenAI App to MCP, port from `window.openai`, move away from skybridge, or translate `openai/outputTemplate` patterns.

Treat this as an architecture migration, not a search-and-replace.

## Inventory First

Find and record:

- Server-side tool registration and result metadata.
- Client references to `window.openai`, skybridge APIs, or OpenAI-specific globals.
- Output template HTML or iframe entrypoints.
- CSP declarations and external domains.
- Authentication assumptions.
- Existing tests, build commands, and local run commands.

## Concept Mapping

Use these mappings as a starting point:

- OpenAI output template becomes an MCP resource URI that serves the app HTML.
- OpenAI-specific metadata becomes MCP Apps UI metadata.
- `window.openai` host calls become MCP Apps SDK host/app APIs.
- Tool result text remains model-readable MCP `content`.
- App-only interactions become helper tools hidden from normal model use when appropriate.
- OpenAI CSP fields become MCP Apps CSP metadata with resource, connect, and frame domains.

Do not preserve OpenAI naming in new public APIs unless compatibility requires it.

## Migration Steps

1. Add MCP Apps dependencies with the package manager.
2. Create an MCP resource for the app HTML.
3. Update server tool results to include MCP Apps UI metadata and text fallback content.
4. Replace OpenAI host globals in client code with MCP Apps SDK host/app access.
5. Move server-only work out of the browser and into MCP tools.
6. Update CSP declarations to match the new app resource.
7. Remove dead OpenAI-specific code after the MCP path works.
8. Run formatter, typecheck, build, and any existing app tests.

## Gaps To Call Out

Some OpenAI Apps SDK behavior may not have a direct MCP Apps equivalent. If you find one:

- Explain the gap plainly.
- Preserve the closest useful behavior.
- Avoid pretending a host feature exists when the target MCP host does not expose it.
- Keep the standalone or old app path only when the user needs compatibility.

## Before Finishing

Check each item explicitly:

- No remaining `window.openai` or skybridge calls in the MCP path.
- Text fallback still works for non-UI MCP clients.
- UI resource loads from the MCP server.
- CSP metadata covers actual domains and is not broader than necessary.
- Authentication and user data assumptions are documented.
- Existing standalone behavior is either preserved or intentionally removed.
