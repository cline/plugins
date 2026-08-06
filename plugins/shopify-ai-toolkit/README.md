# shopify-ai-toolkit

Shopify development skill pack for building and reviewing Shopify apps, Admin and Storefront GraphQL operations, Liquid themes, Hydrogen storefronts, Shopify Functions, Polaris UI extensions, POS UI, App Store review readiness, and Shopify CLI workflows.

## What It Adds

- Bundled Shopify skills for API code generation, app and extension development, custom data modeling, partner workflows, and storefront implementation.
- Local helper scripts for Shopify documentation search and code validation where the source skill provides them.
- Bundled schemas, type definitions, sample Liquid, and other reference assets used by the skills.

## Requirements

- Node.js 22 or later for the bundled helper scripts.
- Shopify CLI for workflows that scaffold, validate, run, or deploy Shopify apps and extensions.
- Relevant Shopify accounts, stores, app credentials, API versions, and merchant permissions for live store operations.
- Package installation fetches npm dependencies used by the Liquid and TypeScript validators unless they are already cached.

## Trust Boundaries

The plugin does not register MCP servers, hooks, or background processes.

Some bundled helper scripts call Shopify services to search docs. The copied usage-reporting paths in those scripts are disabled for this Cline plugin. Ask before sending proprietary code, prompts, store data, or merchant/customer information to any external Shopify service.

This plugin intentionally includes a large local schema and type corpus so Shopify validators can run without fetching those assets at runtime.
