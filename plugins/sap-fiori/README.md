# sap-fiori

SAP Fiori app generation, modification, documentation lookup, and visual filter guidance for Cline.

## What It Does

This plugin registers the `fiori-mcp` MCP server from `@sap-ux/fiori-mcp-server` and bundles a SAP Fiori visual filter skill.

The MCP server can search SAP Fiori elements, annotation, UI5, and SAP Fiori tools documentation, list existing Fiori apps in a workspace, inspect supported Fiori app-generation and modification workflows, and execute those workflows when the user confirms the target app and file changes.

The bundled skill helps add chart-based visual filters to SAP Fiori elements filter bars and value help dialogs for CAP and ABAP RAP projects.

## Install

```bash
cline plugin install sap-fiori
```

For local development from this repository:

```bash
cline plugin install ./plugins/sap-fiori --cwd .
```

## Requirements

- Node.js and `npx` for launching the MCP server. When the MCP server starts, `npx` may download and execute `@sap-ux/fiori-mcp-server@1.2.0` from npm if it is not already cached.
- SAP Fiori, UI5, CAP, or ABAP RAP project files in the workspace for project modification workflows.
- SAP system access only when the requested workflow needs live metadata or an existing OData service.
- A trusted CA certificate for SAP systems that use a private or self-signed certificate.

## Security Notes

The plugin instructs Cline to confirm project writes, generated app changes, metadata refreshes, SAP system access, package installs, and watcher commands before execution. It also prefers custom CA certificates over disabling TLS verification.

## Attribution

The bundled visual filter skill is derived from SAP's `sap-fiori-mcp-server` plugin materials, licensed under Apache-2.0. See `LICENSE.sap-fiori-mcp-server` and `NOTICE.sap-fiori-mcp-server`.
