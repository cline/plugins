---
name: vanta-list-tests
description: Show failing Vanta compliance tests, prioritized by what can be fixed from this repository
---

Show the user their failing Vanta tests, ranked by what the plugin can help with.

Before calling any Vanta MCP tool, confirm the user's Vanta tenant region and use only the matching regional server: `vanta-us`, `vanta-eu`, or `vanta-aus`. If the region is unclear, ask. Do not query multiple regions unless the user explicitly asks.

## Steps

1. Fetch failing tests. Call the matching region's `tests` tool to get all tests with status `NEEDS_ATTENTION`.
2. Categorize and rank tests. Group the failing tests into tiers:
   Ready to fix  -  Tests where:
    - The test's integration matches resources likely managed in this repo. Detect this by checking for deployment code: look for provider declarations (`provider "aws"` in `.tf` files for AWS, `provider "google"` for GCP, `provider "azurerm"` for Azure) and resource type prefixes (`aws_`, `google_`, `azurerm_`) in `.tf` files; or `AWSTemplateFormatVersion` in CloudFormation templates; or `cdk.json` for CDK projects. Use both signals  -  provider blocks are often absent in child modules or Terragrunt configs.
    - Present these first. These are candidates for `/vanta-fix-test <testId>`.
   Fixable with guidance  -  Tests that are code-remediable but may not match this repo (different cloud provider, different integration). The user can still get remediation code, but may need to apply it elsewhere.
   Manual steps needed  -  Tests that require configuration changes in external tools, Vanta settings, or manual processes. The plugin can provide guidance but not generate code.
3. Present the results. For each tier, show a table with columns:
    - Test name
    - Test ID
    - Number of failing entities
    - Integration (e.g., AWS, GitHub, Azure)
    - How long the test has been failing (from `latestFlipDate`)
    - For "Ready to fix" tests, show: `Run /vanta-fix-test <testId> to prepare a remediation plan`
4. Highlight co-failure clusters. If multiple failing tests map to the same resource type or integration, note this. For example: "5 IAM tests are failing  -  fixing the password policy may resolve all of them at once."
5. Keep it scannable. Use a table or bulleted list. Do not dump raw API responses. The user needs to quickly see what to fix first.

## Edge cases
- No failing tests: "All tests are passing. Nice work." Do not show an empty table.
- User asks to filter (e.g., "show AWS tests"): Filter by integration name. If no failures match the filter, say so and show the full list: "No failing AWS tests found. Here's what is failing across other integrations:"
- User asks to filter by framework (e.g., "SOC 2 gaps"): Filter by framework. "You have [N] failing tests mapped to SOC 2. Here are the ones I can help fix from this repo."
- User asks "what should I fix first?": Rank by impact: IaC-fixable in this repo first, then highest entity count, then longest time failing. Highlight co-failure clusters as "biggest bang for the buck."
- Very large number of failing tests: Group by integration and summarize counts rather than listing every test. Show the top 5-10 highest-impact items with a note: "[N] more tests failing. Want to see the full list or focus on [integration]?"
