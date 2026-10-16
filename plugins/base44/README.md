# base44

Base44 development skills for Cline users building full-stack Base44 apps.

## What It Adds

- `base44-cli` skill for project initialization, linking, resource configuration, type generation, deployment planning, and safe Base44 CLI usage, with bundled command references.
- `base44-sdk` skill for implementing JavaScript and TypeScript features with the Base44 SDK without hallucinating Firebase- or Supabase-style APIs, with bundled SDK module references.
- `base44-troubleshooter` skill for investigating backend function errors and production issues with bounded log review.

The plugin does not install the Base44 CLI or SDK. It gives Cline workflow guidance and bundled reference material, and expects project dependencies and authentication to be managed by the user.

## Requirements

- A Base44 account for authenticated CLI, deployment, and log workflows.
- `base44` CLI installed as a project dev dependency when running CLI commands.
- `@base44/sdk` installed in projects that use the SDK directly.

## Trust Boundaries

- Ask before installing packages, running `npx base44`, creating projects, scaffolding files, pushing resources, deploying, opening dashboards, reading production logs, or viewing, listing, setting, deleting, or otherwise handling secrets.
- Do not print Base44 access tokens, refresh tokens, app IDs, secrets, OAuth connector details, production log payloads, or customer data unless the user explicitly asks.
- Prefer code/config review and explicit diffs before CLI operations that affect a Base44 app.
