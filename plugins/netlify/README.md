# netlify

Use Netlify platform skills from Cline for web app deployment, serverless functions, edge middleware, forms, blobs, database workflows, image optimization, caching, identity, and AI Gateway integrations.

## What It Does

This plugin bundles Netlify skills for:

- Functions, Edge Functions, Blobs, Forms, Image CDN, caching, and `netlify.toml` configuration.
- Framework deployment patterns for Vite, Astro, TanStack Start, Next.js, and other supported frameworks.
- Netlify Database setup, Drizzle migrations, local development, preview branching, and production data-change safety.
- Netlify CLI workflows for local development, site linking, environment variables, deploy logs, and account/project inspection.
- Dedicated deployment workflows for preview-first deploy execution, production promotion, build configuration, and deployment recovery.
- Netlify Identity and AI Gateway integration patterns.

## Install

```bash
cline plugin install netlify
```

For local development from this repository:

```bash
cline plugin install ./plugins/netlify --cwd .
```

## Requirements

- A Netlify account for linking sites, deploying, managing environment variables, or using account-backed platform features.
- Netlify CLI access through `npx netlify` or an installed `netlify` binary when the user chooses CLI workflows.
- Browser OAuth with `netlify login` or a user-managed `NETLIFY_AUTH_TOKEN` for noninteractive environments.
- Project-specific dependencies such as `@netlify/functions`, `@netlify/blobs`, `@netlify/database`, framework adapters, or provider SDKs only when the chosen workflow needs them.

## Security Notes

This plugin does not run the Netlify CLI, create deploys, install packages, or contact Netlify during installation. The skills are references and workflow guides. Commands that read or export Netlify auth tokens, API keys, connection strings, environment variables, downloaded `.env` files, or `.netlify` local state require explicit approval, redacted output handling, and gitignore checks before anything is written.

Some bundled skill content is adapted from Netlify's MIT-licensed context-and-tools project: `https://github.com/netlify/context-and-tools`. See `NOTICE.netlify-context-and-tools`.
