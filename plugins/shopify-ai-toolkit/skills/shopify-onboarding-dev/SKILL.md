---
name: shopify-onboarding-dev
description: "Get started building on Shopify from Cline. Use when a developer asks to build a Shopify app, theme, extension, custom storefront, or development store, or asks which Shopify workflow to start with."
---

Guide Shopify developers through Cline-native setup and route them to the right Shopify skill.

Do not tell the user to install this toolkit into another AI host. They are already using the Cline plugin.

## First Steps

1. Identify what the developer wants to build:
   - Shopify app or app extension
   - Shopify theme or Liquid customization
   - Hydrogen custom storefront
   - Shopify Function
   - Admin, Storefront, Customer Account, Partner, or Payments GraphQL operation
   - Shopify CLI setup or troubleshooting
2. Check whether Shopify CLI is available only when the next workflow needs it:

```bash
shopify version
```

3. If Shopify CLI is missing, suggest the normal install path:

```bash
npm install -g @shopify/cli@latest
```

If npm is unavailable on macOS, Homebrew is also acceptable:

```bash
brew tap shopify/shopify && brew install shopify-cli
```

4. Route to the more specific skill as soon as the direction is clear.

## Routing

- Use `shopify-use-shopify-cli` for CLI setup, app scaffolding, config validation, `shopify app dev`, `shopify app deploy`, store auth, or store execution workflows.
- Use `shopify-admin` for authoring or explaining Admin GraphQL operations.
- Use `shopify-storefront-graphql` for custom storefront GraphQL operations.
- Use `shopify-customer` for Customer Account API operations.
- Use `shopify-partner` for Partner API operations.
- Use `shopify-functions` for Shopify Functions.
- Use `shopify-liquid` for theme Liquid.
- Use `shopify-hydrogen` for Hydrogen and Oxygen storefront work.
- Use the Polaris extension skills for Admin, Checkout, Customer Account, App Home, and POS UI extension code.

## Developer Account and Store Setup

If the developer does not have a Shopify Partner account or development store, point them to the Shopify developer dashboard and keep the next steps practical:

- Create or sign in to a Shopify Partner account.
- Create a development store or connect an existing development store.
- Authenticate Shopify CLI when the CLI prompts for it.
- Scaffold only after the developer confirms the app, theme, extension, or storefront direction.

Do not run account-creating, store-auth, deploy, mutation, or billing-affecting commands without explicit user confirmation.
