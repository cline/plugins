# Reference: drill into a single budget line

## When to use

The user named a specific line and wants to understand it:

- "Why are we pacing higher on Travel this year?"
- "What's behind the Legal Fees overage?"
- "Show me the largest entries in Software Subscriptions."
- "Which months had the biggest spend on <X>?"

## Workflow

### 1. Identify the line and its GL account

- Find the row in the budget tab (ask if ambiguous).
- Match to `account_name` / `gl_code` using name-first / GL-code
  tiebreaker.

### 2. Pull month-by-month for that account

Specialised query -- narrower than the canonical one because we want
line-level detail, not aggregates. Pull the description-and-counterparty
columns the drill-down narrative needs:

```sql
SELECT
    DATE_TRUNC('MONTH', EFFECTIVE_DATE)                         AS period_month,
    EFFECTIVE_DATE,
    AMOUNT,
    JOURNAL_ENTRY_DESCRIPTION,
    VENDOR_NAME,
    PARTNER_NAME,
    EVENT_TYPE,
    CASE WHEN LEFT(ACCOUNT_TYPE, 1) = '4' THEN -AMOUNT
         ELSE AMOUNT END                                        AS signed_amount
FROM <journal_entries_table>
WHERE FUND_NAME = '<entity_name>'
  AND ACCOUNT_TYPE = '<gl_code>'      -- prefer GL code over name
  AND EFFECTIVE_DATE BETWEEN '<period_start>' AND '<period_end>'
ORDER BY EFFECTIVE_DATE DESC, AMOUNT DESC;
```

Send it through the MCP with the exact parameter shape:

```
fetch(command="dwh:execute:query", params={
  "sql":    "<SQL above>",
  "format": "ndjson"   # use "markdown" only when you expect <=50 rows
})
```

The query parameter is `sql`, not `query`. The description column is
`JOURNAL_ENTRY_DESCRIPTION`, not `DESCRIPTION`. Both names cost a retry
if you guess.

> Even on a drill-down, never drop the `FUND_NAME` filter. The
> entity-scoping rule is non-negotiable.

### 3. Aggregate and rank

- Monthly totals (signed) -- for the trend.
- Top 10 individual entries by absolute amount -- for the "what
  drove this" answer.
- Comparison to the same month in prior year (run a parallel query
  for `prior_year`).

### 4. Output -- chat by default

This reference defaults to chat-only output (no spreadsheet
write), because it's an answer to a question. Offer to write a
`<Line Name> -- Drill-down` tab if the user wants it persisted.

Chat output shape:

```
<Line Name> -- YTD <year>: $X vs prior-year YTD: $Y (Δ +Z%)

Monthly trend:
  Jan: $a    Feb: $b    Mar: $c   ...

Largest entries this year:
  1. <date>  $<amt>  <description>
  2. <date>  $<amt>  <description>
  ...

Why pacing is high (best-effort interpretation):
  - <month-over-month spike, vendor concentration, one-off, etc.>
```

Two or three sentences of interpretation only -- don't lecture.

### 5. Cross-budget context (optional)

If the user's prompt has a how-does-this-affect-cash flavour
("how does that impact available cash"), suggest the user invoke the
`carta-budget-scenarios` skill (cost-rebalance reference) to model the impact
instead of staying in pure drill-down.
