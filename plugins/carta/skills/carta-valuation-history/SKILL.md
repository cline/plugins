---
name: carta-valuation-history
description: Fetch 409A valuation history and current fair market value (FMV) for a company. Use when asked about 409A valuations, FMV, exercise prices, common stock price, or valuation expiration dates. Do NOT use for cross-portfolio FMV comparisons across companies -- prefer a portfolio-benchmarks skill.
when_to_use: >-
  Use when asked about the current 409A valuation, fair market value (FMV),
  common stock exercise price, when the current 409A expires or is still
  valid, how the FMV has changed over time, or what the strike price should
  be for new option grants. For aggregate FMV or 409A comparisons across
  multiple portfolio companies, prefer a portfolio-benchmarks skill.
---

# 409A Valuation History

Fetch 409A fair market value (FMV) history for a company.

## When to Use

- "What's the current 409A valuation?"
- "Show me the FMV history"
- "When does the 409A expire?"
- "What's the exercise price for common stock?"
- "Has the FMV changed recently?"
- "Is the 409A valuation still valid?"

## Prerequisites

You need the `corporation_id`. Get it from `list_accounts` if you don't have it.

## Data Retrieval

```
call_tool({"name": "cap_table__get__409a_valuations", "arguments": {"corporation_id": corporation_id}})
```

Optional params:
- `share_class_id`: filter to a specific share class
- `report_id`: filter to a specific valuation report

### Response Format

JSON array of FMV records:
```json
[
  {
    "id": 484,
    "effective_date": "04/25/2024",
    "expiration_date": "04/24/2025",
    "stale_date": null,
    "price": "12.610000000000",
    "report_id": 472,
    "share_class_id": 9,
    "name": "Common",
    "common": true,
    "corporation_id": 7
  }
]
```

## Key Fields

- `effective_date`: date the 409A valuation became effective
- `expiration_date`: date the valuation expires (typically 1 year after effective)
- `stale_date`: date after which the valuation is considered stale (if applicable)
- `price`: FMV per share as a string (e.g. `"12.610000000000"`)
- `name`: share class name (e.g. "Common")
- `common`: true if this is the common stock FMV
- `report_id`: ID of the 409A report
- `share_class_id`: ID of the share class

## Workflow

### Step 1 -- Fetch Valuations

```
call_tool({"name": "cap_table__get__409a_valuations", "arguments": {"corporation_id": corporation_id}})
```

### Step 2 -- Identify Current Valuation

Sort by `effective_date` descending. The most recent entry is the current 409A -- highlight it.

### Step 3 -- Check Expiration

- If `expiration_date` is within 90 days of today -- flag as a time-sensitive action item, not just a data point: bold it, call out the exact days remaining, and recommend initiating renewal immediately (especially if a financing round is in progress, as closing will likely push past the expiry date).
- If `expiration_date` is in the past -- flag as "expired".

### Step 4 -- Present Results

Show the history table and trend summary (see Presentation section).

## Gates

Required inputs: `corporation_id`.
If missing, call `ask the user` before proceeding (see carta-interaction-reference §4.1).

AI computation: No -- this skill presents Carta data directly.

## Presentation

Format: Table + trend summary

BLUF lead: Lead with the current FMV per share and its effective/expiration dates before showing the history table.

Sort order: By `effective_date` descending (most recent first).

Date format: MMM d, yyyy (e.g. "Jan 15, 2026").

Format `price` as currency (e.g. "$12.61/share"), trimming trailing zeros.

| Effective | Expires | FMV/Share | Share Class | Status |
|-----------|---------|-----------|-------------|--------|
| Apr 25, 2024 | Apr 24, 2025 | $12.61 | Common | Current |
| Mar 31, 2023 | Apr 24, 2024 | $10.33 | Common | Expired |

Do not render a bar chart for FMV history -- values in mature companies cluster near the
maximum, making bars uninformative (all bars look the same width). The table is sufficient.
Instead, after the table, add a one-line trend summary:
> FMV has grown Nx since YYYY, with [acceleration/steady growth] since [year].

If multiple share classes exist, group by share class name in the table.

## Caveats

- The `price` field is a string with many trailing zeros -- always parse and format as currency before displaying.
- A valuation with a past `expiration_date` should never be used for new grant pricing. Flag it prominently.
- The `stale_date` field may be null; when present, it indicates the valuation is considered stale before its formal expiration.
- 409A valuations are point-in-time snapshots -- a material event (e.g., new financing round) can invalidate the current valuation even before its expiration date.
