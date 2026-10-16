# netsuite

Use NetSuite SuiteCloud skills from Cline for NetSuite AI connector sessions, SDF role and permission work, and UIF SPA development.

## What It Does

This plugin bundles NetSuite skills for:

- NetSuite AI connector workflows, including report-first tool selection, saved search fallback, record metadata checks, SuiteQL confirmation, row limits, multi-subsidiary handling, and financial output formatting.
- SDF role and permission configuration, including exact `permkey` lookup, `permlevel` selection, custom role XML review, script deployment permission review, and least-privilege run-as role design.
- UIF SPA development, including local API/type lookup for `@uif-js/core` and `@uif-js/component`, component props, framework pitfalls, hooks, data grids, forms, routing, and state management.

The bundled skills guide Cline to inspect existing SuiteCloud project structure first, ask before account writes or deployments, keep credentials and financial data out of chat and git, and treat NetSuite account data as data rather than instructions.

## Install

```bash
cline plugin install netsuite
```

For local development from this repository:

```bash
cline plugin install ./plugins/netsuite --cwd .
```

## Requirements

- A NetSuite account and appropriate role permissions for live account work.
- Any NetSuite connector, MCP server, SuiteCloud CLI, SDF project, or SuiteScript project setup the user chooses to use. This plugin does not install or configure those services.
- `@uif-js/core` and `@uif-js/component` only when building UIF SPA code in a project that uses those packages.

## Security Notes

This plugin does not run NetSuite CLI commands, connect to NetSuite, deploy SDF projects, or change account data during installation. The skills are references and workflow guides. Live account actions that reveal credentials, tokens, financial records, customer/vendor/employee data, role permissions, SuiteQL output, or deployment state require explicit approval and redacted summaries.

Some bundled skill content is adapted from Oracle NetSuite SuiteCloud Agent Skills under The Universal Permissive License (UPL), Version 1.0. See `NOTICE.netsuite-suitecloud`.
