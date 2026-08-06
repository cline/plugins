---
name: carta-cap-table
user-invocable: false
description: Router for Carta cap table questions. Use only when no more specific Carta cap table skill matches; otherwise prefer the detailed ownership, grant, valuation, round, conversion, waterfall, market benchmark, alert, or signature skills.
---

# Carta Cap Table

Use this skill for read-only cap table reporting and interpretation from Carta MCP.

## Common Requests

- ownership breakdowns and fully diluted ownership
- stakeholders, holders, investors, and share classes
- option grants, RSUs, RSAs, SARs, PIUs, and vesting schedules
- SAFEs, convertible notes, maturity, valuation caps, and discounts
- financing round history and cash raised
- 409A valuation history, FMV, and expiration dates
- witness and spousal-consent signature status
- portfolio alerts such as expiring 409As, low option pools, maturing notes, or stale data

## Workflow

1. Resolve the company or portfolio with Carta account or context tools.
2. Ask the user to choose when multiple companies match.
3. Fetch the narrowest data needed for the question.
4. Preserve provenance: company, report, date, and command source when available.
5. Present a concise table first, then short observations and caveats.

## Portfolio Scans

Portfolio-wide scans can touch many companies and sensitive records. Keep default scans bounded. If more than 20 companies are in scope, ask the user to narrow the portfolio, time window, or alert type.

## Presentation

- Do not expose raw IDs unless they are useful for follow-up.
- Do not overstate stale or missing data.
- Explain whether values are shares, fully diluted percentages, cash, FMV, or return multiples.
- Use current Carta data for facts and label any Cline-calculated derived metric.

## Not Advice

Do not provide legal, tax, investment, securities, or compensation advice. Summarize the Carta data and assumptions, then recommend qualified review for decisions.
