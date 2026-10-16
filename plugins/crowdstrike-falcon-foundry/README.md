# CrowdStrike Falcon Foundry

Adds CrowdStrike Falcon Foundry development guidance for Cline.

This plugin bundles skills for building Falcon Foundry apps across app setup, API integrations, collections, functions, Falcon API usage, Fusion workflows, UI pages and extensions, debugging, e2e tests, and security review.

It is intentionally skills-only. It does not run the Foundry CLI, fetch or rewrite OpenAPI specs, start tests, or intercept shell commands automatically. Cline uses the skills to guide the work, then asks before external content fetches, credential use, deployment, release, destructive changes, live tenant mutations, or production data access.

## Requirements

- CrowdStrike Falcon Foundry access.
- The Foundry CLI installed when running app, capability, deploy, release, or local test commands.
- Valid Falcon credentials or a configured Foundry CLI profile for live operations.
- Node.js, Python, Go, Docker, npm, or Playwright only when the chosen Foundry app capability requires them.

## License

MIT. See `LICENSE.crowdstrike-foundry-skills`.
