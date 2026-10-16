# DataHub

DataHub skills for catalog discovery, metadata enrichment, lineage analysis, data quality work, setup, connector planning, connector review, and Micro Frontend app work.

Install:

```bash
cline plugin install datahub
```

## Cline Primitives

This plugin bundles DataHub skills for common catalog, connector, and Micro Frontend workflows:

- `datahub-search` for catalog search, ownership questions, schema lookup, and metadata discovery.
- `datahub-enrich` for descriptions, tags, glossary terms, ownership, domains, deprecation, data products, structured properties, and documents. The skill asks for an explicit approval step before writes.
- `datahub-lineage` for upstream, downstream, cross-platform, root-cause, and impact-analysis workflows.
- `datahub-quality` for assertions, incidents, quality health checks, and subscriptions.
- `datahub-setup` for DataHub CLI installation, authentication, connection verification, and default scope setup.
- `datahub-connector-planning` for planning new DataHub ingestion connectors.
- `datahub-connector-pr-review` for reviewing connector implementations against the bundled connector standards.
- `load-standards` for loading the DataHub connector standards into context.
- `datahub-mfe-create-app` for scaffolding a DataHub Micro Frontend app after preview and approval.
- `datahub-mfe-configure-app` for configuring DataHub to load a Micro Frontend app after preview and approval.

The package also includes the DataHub connector standards, templates, and small helper scripts used by the connector planning and review skills.

## Requirements

Most workflows need a configured DataHub instance and either DataHub MCP tools in the current session or the `datahub` CLI installed in the workspace environment. The setup skill can guide CLI installation with `pip install acryl-datahub`.

Search and read-only lineage workflows can run with read-only DataHub access. Enrichment, assertion creation, incident updates, subscriptions, and connector validation workflows may write metadata or run local validation commands. Those skills should show the plan first and wait for approval before making changes.

Keep DataHub tokens in environment variables or `~/.datahubenv`; do not paste tokens into chat output. The plugin does not register an MCP server or store credentials.
