# UI5

UI5 adds SAPUI5 and OpenUI5 development guidance plus the UI5 MCP server for API lookup, project validation, linting, and Integration Card workflows.

## What It Adds

- `ui5-mcp-server`, a stdio MCP server launched with `npx --yes @ui5/mcp-server@0.2.12`.
- `ui5-best-practices`, a skill for UI5 coding standards, async loading, data binding, i18n, CSP, TypeScript event handling, CAP integration, and form layout rules.
- `ui5-best-practices-integration-cards`, a skill for UI Integration Card manifests, Configuration Editor files, validation, previewing, destination binding, chart feeds, and analytical chart references.
- The bundled skill covers scaffolding, package installs, project scripts and CLIs, linter fixes, local servers, generated code, and production translation files.

## Requirements

- Node.js and `npx` available on PATH.
- Network access when the MCP server package is first downloaded by `npx`.
- A UI5, OpenUI5, SAPUI5, or CAP workspace for project-specific linting, scaffolding, validation, or preview workflows.

## Trust Boundaries

Installing this plugin registers the MCP server command and bundled local skills. It does not run the UI5 MCP server until Cline connects to it, and it does not scaffold projects, install dependencies, start servers, or modify files during setup.

Review project paths, generated files, package installs, local scripts and CLIs, linter fixes, manifest edits, and local server commands before allowing Cline to execute them.

## Install

```bash
cline plugin install ui5
```

For local development:

```bash
cline plugin install ./plugins/ui5 --cwd .
```
