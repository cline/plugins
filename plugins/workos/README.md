# WorkOS

WorkOS adds Cline skills for implementing and debugging enterprise identity workflows.

## Cline Primitives

- Skills: `workos` routes WorkOS AuthKit, SSO/SAML, Directory Sync, RBAC, FGA, MFA, Vault, Audit Logs, Admin Portal, Pipes, Feature Flags, Radar, Events, Custom Domains, API references, CLI lifecycle, and migration requests to bundled WorkOS references.
- Skills: `workos-widgets` helps integrate WorkOS widgets such as User Management, User Profile, Admin Portal SSO Connection, and Admin Portal Domain Verification across common frontend and backend stacks.
- The bundled skills protect secrets and production identity resources, require verified CLI/dashboard guidance, and gate mutating WorkOS operations behind explicit user confirmation.

## Requirements

- WorkOS account access and the relevant WorkOS environment variables for live implementation work, commonly `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, cookie/session secrets, webhook secrets, and widget token material.
- The WorkOS CLI when the user asks Cline to run WorkOS setup or management commands. Cline should run it with `WORKOS_MODE=agent`, and with `--json` when command output is parsed.
- Network access when the task requires current WorkOS documentation, CLI installation, or live WorkOS API calls.

## Trust Boundaries

The plugin does not register an MCP server, start background services, install dependencies, or call WorkOS at install time. It only contributes bundled skills. Live WorkOS changes remain user-approved runtime actions.

Bundled WorkOS skill material is from WorkOS plugin metadata declaring MIT licensing. See `NOTICE.workos-skills`.
