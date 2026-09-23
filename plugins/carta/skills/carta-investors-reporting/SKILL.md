---
name: carta-investors-reporting
user-invocable: false
description: Router for Carta investor reporting workflows. Use only to choose a detailed data exploration, performance benchmark, tearsheet, Form ADV, co-investor, or investor tutorial skill.
---

# Carta Investors Reporting

Use this skill for investor and fund reporting through Carta MCP.

## Common Requests

- fund-level metrics such as NAV, TVPI, DPI, IRR, MOIC, reserves, and unfunded commitments
- investment and portfolio company detail
- partner, entity, and firm rollups
- Form ADV Schedule D data
- benchmark comparisons against peer cohorts
- tearsheet generation or download
- statement of investments views
- data exploration across available tables

## Workflow

1. Resolve the firm, fund, entity, or context.
2. Ask the user to choose if multiple contexts match.
3. Fetch the narrowest tables or reports needed.
4. Preserve period, currency, fund, entity, and source metadata.
5. Present fund metrics in a compact table and call out caveats.

## Query Safety

For warehouse-style queries, use read-only SELECTs. Add limits during exploration. Before broad table dumps, exports, or report downloads, confirm the firm or fund context, fields or reports, period, output format, and permission scope.

## Files

Ask before downloading tearsheets, ZIPs, PDFs, or generated report files. Tell the user where the file will be written and keep filenames descriptive.

## Analysis

Separate Carta-reported metrics from Cline analysis. Do not provide investment advice or valuation opinions.
