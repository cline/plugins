---
name: carta-auth-and-discovery
description: Use when first using Carta MCP, resolving Carta accounts or contexts, discovering available Carta tools, choosing between cap table, CRM, and investors workflows, or handling Carta MCP authorization and missing-access questions.
---

# Carta Auth And Discovery

Use this skill before live Carta work when the target account, company, fund, portfolio, or MCP capability is unclear.

## First Checks

1. Check whether Carta MCP tools are available in the session.
2. If tools are unavailable, tell the user to authorize the Carta MCP server through Cline.
3. Use the least broad discovery call that can identify the target.
4. Confirm the target when multiple Carta accounts, companies, funds, or contexts match.

## Common Discovery Flow

- Use account or context listing to find accessible companies, portfolios, firms, or CRM contexts.
- Use tool discovery when the user asks for a Carta task that no bundled skill clearly covers.
- Prefer a domain skill once the task is known:
  - `carta-cap-table` for ownership, stakeholders, securities, grants, rounds, SAFEs, notes, 409A valuations, and signatures.
  - `carta-equity-scenarios` for conversion math and waterfall scenarios.
  - `carta-compensation-benchmarks` for compensation taxonomy and benchmarks.
  - `carta-crm` for investor, company, contact, deal, note, and fundraising records.
  - `carta-investors-reporting` for fund metrics, regulatory data, tearsheets, SOI, and warehouse-style reporting.
  - `carta-investors-budgeting` for budgets, actuals, scenarios, P&L, and balance sheet workbooks.

## Access Handling

If Carta returns no accounts or permission errors, report the access problem plainly. Do not infer hidden data or ask the user to paste tokens. Ask them to authorize the MCP server, switch context, or confirm that their Carta user has access.

## Output Rules

Keep discovery responses short. Provide the available choices, the selected context if one is clear, and the next action Cline can take.
