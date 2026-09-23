# dataverse

Microsoft Dataverse workflow skills for Cline.

## Cline Primitives

This package plugin installs Dataverse skills for environment setup, workspace connection, record CRUD and bulk data operations, querying and analysis, schema and metadata changes, solution lifecycle, environment administration, and security role management.

The plugin also bundles optional helper scripts and templates that the skills can use when the user asks Cline to initialize or operate on a Dataverse workspace. Those files are inert at install time and should only be copied or executed after Cline has shown the planned file changes or commands and received explicit approval.

## Requirements

Dataverse workflows require a Microsoft Dataverse or Dynamics 365 environment and the permissions needed for the requested operation. Depending on the task, users may also need Python 3, the Microsoft Power Platform Dataverse Python SDK, Azure identity packages, PAC CLI, Dataverse CLI, .NET SDK, Node.js, Azure CLI, or Power Platform deployment credentials.

The plugin does not register an MCP server, write `.env`, install tools, authenticate CLIs, store credentials, or modify Dataverse during installation. Any setup, authentication, MCP workspace configuration, role assignment, metadata change, data mutation, bulk delete, solution import, or deployment action is treated as an explicit user-approved session action.

## Attribution

The bundled skills are derived from `microsoft/Dataverse-skills`, licensed under MIT. See `LICENSE.dataverse-skills`.
