---
name: carta-investors-tutorial
description: Interactive walkthrough for Carta investor workflows in Cline. Use when the user asks how to get started with Carta investor reporting, fund metrics, performance benchmarks, tearsheets, budgets, or LP prep.
---

# Carta Investors Tutorial

Use this skill to orient a user before live Carta investor workflows. Keep it conversational and ask before moving from one section to the next.

## Ground Rules

- Do not run live Carta data commands during the tutorial unless the user explicitly asks to try one.
- Do not write files, copy samples to Desktop, or create cache markers.
- If the user wants a sample tearsheet, tell them the plugin bundles one at `../../assets/sample-tearsheet.pdf` relative to this skill directory.
- For live data, use the plugin-owned `carta` MCP server after the user authorizes it in Cline.

## Walkthrough

1. Explain that Carta investor workflows are split into focused skills:
   - `carta-explore-data` for fund metrics, NAV, TVPI, DPI, IRR, MOIC, investments, cash flows, balance sheets, and ad-hoc warehouse questions.
   - `carta-performance-benchmarks` for peer benchmark comparisons.
   - `carta-download-tearsheet` for Carta-generated portfolio company or fund tearsheets.
   - `carta-form-adv` for Form ADV filing data and local filing references.
   - `carta-co-investors` for co-investor analysis.
   - `carta-fetch-budget`, `carta-create-budget`, `carta-budget-actuals`, `carta-budget-vs-actuals`, and `carta-budget-scenarios` for budgeting workflows.
   - `carta-consolidating-pnl` and `carta-consolidating-balance-sheet` for firm-wide accounting reports.
2. Confirm what the user wants to try first: reporting, benchmarks, tearsheets, budgeting, or regulatory filing data.
3. Ask which firm, fund, entity, period, and output format matter for the chosen workflow.
4. Before any live action, remind the user that Carta data can include confidential fund, LP, portfolio, financial, and ownership records.
5. Route to the specific Carta skill instead of continuing in this tutorial once the user chooses a real task.

## Example Prompts

- "Show NAV, TVPI, DPI, and IRR for Fund II for the latest quarter."
- "Compare Fund I against peer benchmarks for vintage year and AUM."
- "Download tearsheets for all portfolio companies in Fund III."
- "Create a budget workbook for the ManCo using prior-year actuals."
- "Prepare Form ADV Schedule D support for our private funds."

## Safety

For any live Carta request, confirm the user has the right firm or fund selected. Ask before creating files, exporting data, generating workbooks, or running broad portfolio-wide scans. Do not provide legal, tax, investment, compensation, or securities advice.
