# Reference: fetch budget data from Carta (`fa:list:budgets`)

Defines the canonical fetch pattern for pulling a ManCo budget from
Carta's Fund Admin via the MCP `fa:list:budgets` command.

## Command shape

```
fetch(command="fa:list:budgets", params={
  "fund_uuid":  "<ENTITY_UUID>",
  "start_date": "<YYYY-MM-DD>",
  "end_date":   "<YYYY-MM-DD>"
})
```

The parameter is named `fund_uuid` for historical reasons but it accepts
any entity UUID returned by `fa:list:entities`. (The skill's entity
picker guarantees it's the ManCo's UUID -- see `entity-picker.md`.)

## Response shape

A wrapped JSON list where each row is one monthly budget posting for
one GL account:

```
[
  {
    "id":                "<row uuid>",
    "account_id":        "<account uuid>",
    "account_name":      "Management fee income",
    "account_type":      "4160",
    "amount":            4361526,
    "start_date":        "2026-01-01",
    "end_date":          "2026-01-31",
    "source":            "manual" | "carry-forward" | ...,
    "source_user_id":    "<user uuid>",
    "entity_budget_id":  "<budget uuid>"
  },
  ...
]
```

Notes from the source data:

- `account_type` is the GL code (numeric string, e.g. `"4160"`,
  `"7100"`). It is not an account-type label -- same field as
  `ACCOUNT_TYPE` in the Carta DWH journal-entries table.
- `amount` is signed, already in the natural display sign -- income
  positive, expenses positive. No leading-digit sign flip needed
  (this differs from the actuals query in `carta-budget-actuals/get-actuals.md`).
- Some accounts post quarterly (e.g. Management fee income -- only the
  first month of each quarter has a value, the others are absent or $0).
  Do not synthesize zeros for missing months; leave the cell empty
  (Excel treats it as 0 in the SUM, which is what the user wants).

## Window sizing -- always fetch one month at a time

The MCP response is capped around 40 KB. A full-year fetch for a ManCo
with ~45 accounts × 12 months × ~12 fields/row routinely runs over that
cap and truncates mid-stream, and quarter-sized windows also truncate
once a CoA grows past ~20 accounts. Always issue twelve monthly
fetches -- one per month -- instead of guessing how wide a window will
fit.

| Window | start_date | end_date |
|---|---|---|
| Jan | `<year>-01-01` | `<year>-01-31` |
| Feb | `<year>-02-01` | `<year>-02-28` (or 29) |
| ... | ... | ... |
| Dec | `<year>-12-01` | `<year>-12-31` |

Issue all twelve calls in a single parallel batch and merge the row
lists before pivoting. A single monthly response stays well under the
40 KB cap even for the widest ManCo CoAs observed. If your runtime limits
concurrent tool calls, batch into two groups of six -- but never serialize
further than that.

Do not try a single annual call first as an "optimistic path" --
discovering truncation costs at least one call, and then the quarterly
fallback adds four more, all of which are pure waste.

If the user explicitly asks for a sub-year window (e.g. "just pull H1"),
fetch one call per month inside that window using the same rule.

## Pivot to `{account -> {month: amount}}`

After fetching (single or merged), pivot the row list:

```
budget_by_account = {}
for row in rows:
    key = (row["account_type"], row["account_name"])
    month_label = row["start_date"][:7]   # "2026-01"
    budget_by_account.setdefault(key, {})[month_label] = (
        budget_by_account.get(key, {}).get(month_label, 0) + row["amount"]
    )
```

Same `(account_type, account_name)` key + same month from multiple rows
is summed -- defensive against future MCP changes that might split
postings. Today the API returns one row per (account, month).

## Section mapping (leading digit of `account_type`)

Same convention as the rest of the carta-investors plugin:

| Prefix | Section |
|---|---|
| `4xxx` | Income |
| `5xxx` / `6xxx` / `7xxx` / `8xxx` | Expenses |
| `1xxx` | Investments / Other |
| anything else | Other |

Within each section, sort by `account_type` ascending.

## Output to the calling skill

```
{
  source: "Carta Fund Admin (fa:list:budgets)",
  fetched_at: "<ISO timestamp>",
  entity_name: "Example Capital, LLC",
  entity_uuid: "<uuid>",
  budget_year: 2026,
  window: { start: "2026-01-01", end: "2026-12-31" },
  sections: {
    "Income":   [ { gl_code, account_name, monthly: {01..12}, total } ],
    "Expenses": [ ... ],
    "Other":    [ ... ]
  },
  totals: {
    income:   <number>,
    expenses: <number>,
    noi:      <number>
  }
}
```

The caller writes this directly into the workbook layout described in
the parent SKILL.md Gate 6. Do not invent rows; do not apply a
buffer percentage; do not smooth quarterly postings into monthly
ones.

## Empty-result handling

If the fetch (any window) returns zero rows: do not synthesize a
fake budget. Halt and return the empty-result error to the caller. The
calling SKILL.md surfaces a plain-English message to the user -- "no
budget rows in Carta for this entity / year" -- and offers to retry.
