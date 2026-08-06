# revenuecat

Use RevenueCat from Cline for in-app purchase setup, subscription analytics, entitlement checks, paywalls, customer center flows, purchase testing, migration, and troubleshooting.

## What It Adds

The plugin registers the RevenueCat remote MCP server and bundles RevenueCat workflow skills for:

- Creating projects, apps, products, entitlements, offerings, and packages.
- Integrating RevenueCat SDKs in iOS, Android, Kotlin Multiplatform, Flutter, and React Native apps.
- Building paywalls, purchase flows, entitlement gates, customer center screens, and identify/log-in flows.
- Reading RevenueCat charts and project status.
- Testing purchases and troubleshooting dashboard or SDK issues.

## Requirements

RevenueCat MCP access requires RevenueCat account authentication. Interactive installs may offer to authorize the RevenueCat MCP server immediately; non-interactive installs can authorize later from `cline mcp`.

Project configuration changes depend on the user's RevenueCat account permissions. App-side SDK changes may require local platform tooling such as Xcode, Android Studio, Gradle, Flutter, or React Native tooling depending on the target app.

## Safety Notes

RevenueCat controls monetization and customer access. The bundled skills ask Cline to confirm before changing projects, apps, products, entitlements, offerings, packages, webhooks, API keys, pricing, or SDK configuration.

Public SDK keys are safe to embed in client apps. Secret API keys are server-side only and should never be written into client code.

## License

The bundled RevenueCat workflow skills are adapted from RevenueCat's AI toolkit under the MIT license. See `NOTICE.revenuecat-ai-toolkit`.
