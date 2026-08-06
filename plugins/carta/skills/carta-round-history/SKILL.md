---
name: carta-round-history
description: Financing round history for a company -- each priced round with its date, share class issued, price per share, total cash raised, and the investors who participated. Covers what was raised and from whom across the company's funding history.
when_to_use: >-
  Use when asked about funding rounds, financing rounds, the company's
  round history, capital raised totals, how much has been pulled in from
  outside investors, how much money has been raised across all rounds,
  cumulative cash raised, who invested in a specific round, price per
  share at a financing, the equity activity timeline, or a round-by-
  round breakdown. For securities outside priced rounds (SAFEs,
  convertible notes), prefer the matching instrument-list skill. For
  current stakeholder snapshots without round context, prefer a
  stakeholder list skill.
---

# Round History

Fetch financing history and summarize by round, or use the cap table by share class for a quick overview.

## When to Use

- "Show me the funding history"
- "What rounds has this company raised?"
- "How much capital was raised in the Series A?"
- "List all financing rounds"
- "Who invested in each round?"
- "What was the price per share for the seed?"

## Prerequisites

You need the `corporation_id`. Get it from `list_accounts` if you don't have it.

## Data Retrieval

> Detail mode: This command supports `detail=summary` (round count, total cash raised, by-round breakdown -- fast) and `detail=full` (individual security records with per-investor data, issue dates, price per share). Choose the right mode upfront based on user intent -- see Workflow.

> Ordering: Pass `ordering` to sort server-side -- e.g. `-cash_paid` for largest investments first. Fields: `issue_date`, `quantity`, `stakeholder_name`, `cash_paid`, `prefix_number`. Combine with `detail=full` for "top N investors" queries; otherwise the default (chronological) order is fine.

```
call_tool({"name": "cap_table__get__financing_history", "arguments": {"corporation_id": corporation_id}})
```

This is the same data that powers the in-app "Financing History" tab.

Alternative: For a quick overview without any financing history call, use the cap table by share class:

```
call_tool({"name": "cap_table__get__cap_table_by_share_class", "arguments": {"corporation_id": corporation_id}})
```

Each preferred share class represents a round. Faster but less detail: no individual investors, no issue dates, no price per share.

## Key Fields

- `round_name`: name of the financing round (e.g. "Series A Preferred")
- `issue_date`: date the security was issued
- `cash_paid`: amount paid by the investor for this security
- `quantity`: number of shares issued
- `issue_price`: price per share
- `stakeholder_name`: investor name
- `label`: security label (e.g. "PB-9")
- `is_grant`: true if this is an option grant (not a priced round)
- `is_canceled`: true if the security was canceled -- exclude from aggregates
- `is_converted`: true if the security converted (e.g. SAFE -> preferred)

### Response Format

```json
{
  "count": 120,
  "results": [
    {
      "id": 666,
      "pk_key": "certificate_pk",
      "stakeholder_name": "Example Holder",
      "currency": "USD",
      "label": "PB-9",
      "round_name": "Series B Preferred",
      "quantity": 180000.0,
      "issue_date": "2014-09-14",
      "cash_paid": 219600.0,
      "issue_price": "1.22",
      "is_grant": false,
      "is_canceled": false,
      "is_converted": false
    }
  ]
}
```

## Workflow

### Step 1 -- Fetch Financing History

Choose detail mode based on the user's intent -- do NOT default to summary then re-fetch:

- Overview questions ("show me the funding history", "what rounds has this company raised?", "how much capital was raised?"): omit `detail` -- summary mode returns round count, total cash raised, and a by-round breakdown instantly. Present with the table and bar chart (see Presentation section).

  ```
  call_tool({"name": "cap_table__get__financing_history", "arguments": {"corporation_id": corporation_id}})
  ```

- Per-round details ("who invested in each round?", "what was the price per share?", "list all investors by round", any request for investor names, issue dates, or price per share): use `detail=full` directly.

  ```
  call_tool({"name": "cap_table__get__financing_history", "arguments": {"corporation_id": corporation_id, "detail": "full"}})
  ```

When in doubt, summary is usually sufficient for financing history -- it already includes round names, dates, and totals.

After fetching with `detail=full`, aggregate by round:

1. Group results by `round_name`
2. For each round, aggregate: total `cash_paid`, total `quantity`, count of investors, earliest `issue_date`
3. Use `issue_price` from any non-canceled entry as the price per share
4. Filter out entries where `is_canceled` is true

## Gates

Required inputs: `corporation_id`.
If missing, call `ask the user` before proceeding (see carta-interaction-reference §4.1).

AI computation: No -- this skill presents Carta data directly (aggregation is mechanical grouping, not modeled output).

## Presentation

Format: Table + ASCII bar chart

BLUF lead: Lead with the total number of rounds and total cash raised before showing the table.

Sort order: By `issue_date` ascending (chronological order).

Date format: MMM d, yyyy (e.g. "Jan 15, 2026").

| Round | Close Date | Price/Share | Investors | Shares Issued | Cash Raised |
|-------|-----------|-------------|-----------|---------------|-------------|
| Series Seed Preferred | Jun 30, 2013 | $0.27 | 5 | 1,422,435 | $383,380 |
| Series A Preferred | Nov 15, 2013 | $0.44 | 8 | 3,697,191 | $1,645,250 |

After the table, render an ASCII bar chart of cash raised per round (chronological order).
Scale bars to max width 40 chars. Exclude rounds with zero cash raised (e.g. option grants).

```
Cash Raised by Round

Series Seed Preferred  ████                                     $383K
Series A Preferred     ████████████████                         $1.6M
Series B Preferred     ████████████████████████████████████████ $3.7M
```

Each bar width = (cash_raised / max_cash_raised) * 40, rounded to nearest integer.
Format large numbers as $XM or $XK for readability.

## Caveats

- Entries with `is_canceled: true` must be excluded from all aggregates.
- Converted securities (`is_converted: true`) may appear alongside their post-conversion entries -- avoid double-counting when summing shares or cash.
- Option grants (`is_grant: true`) appear in financing history but are not priced rounds -- exclude from the cash-raised bar chart.
- The quick summary (Option 2) lacks per-investor detail, issue dates, and price per share.
