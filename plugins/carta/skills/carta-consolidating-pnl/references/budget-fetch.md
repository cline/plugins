# Reference: budget fetch for carta-consolidating-pnl

Self-contained budget-fetch procedure for Gate 4b. Covers ManCo entity picker (Option 1 -- Pull from Carta), `fa:list:budgets` shape, truncation workaround, pivot.

---

## Part A -- Pick the ManCo entity

Only management companies carry budgets in Carta. Funds/SPVs return empty.

### A1. List entities

`fetch(command="fa:list:entities")` -> list of `{id, name, type, ...}`. Entity-type labels vary; don't hard-code exact match.

### A2. Classify (first-match-wins)

| Label | Heuristic |
|---|---|
| `ManCo` | name contains `Management` / `Mgmt` / `ManCo`, OR ends in `Capital, LLC` / `Partners Management`, AND does NOT contain `Fund` / `SPV` / `LP` / `Co-Invest` / `Bridge` |
| `Fund` | contains `Fund` |
| `SPV` | contains `SPV` / `Co-Invest` / `Bridge` |
| `Other` | else |

If exactly one ManCo, skip the picker. Else list all (ManCo first).

### A3. Picker via `ask the user`

> "Which entity's budget should I pull from Carta? (Only management companies carry budgets -- funds and SPVs usually return empty.)"

Options: ManCo(s) first (`<- recommended` in description of first), then non-ManCo by API order. >4 options -> keep ManCo(s) + 2 non-ManCo + a "None of these -- let me type" option.

### A4. Handle pick

| User picks | Action |
|---|---|
| ManCo | Lock `<ENTITY_NAME>` + `<ENTITY_UUID>`, proceed. |
| Non-ManCo | Warn: *"Heads up -- only ManCos carry a budget in Carta. Pulling `<entity>` will likely be empty. Want me to pick the ManCo instead?"* Wait. |
| "None of these" | Free-text entity name -> re-query -> re-classify. Don't free-type a UUID. |

### A5. Entity already named in prompt

Exact (case-insensitive substring) match in `fa:list:entities` -> skip picker. Multiple matches -> picker on candidates only. None -> ask whether to use closest ManCo.

---

## Part B -- Fetch budget

### B1. Command shape

```
fetch(command="fa:list:budgets", params={
  "fund_uuid":  "<ENTITY_UUID>",
  "start_date": "<YYYY-MM-DD>",
  "end_date":   "<YYYY-MM-DD>"
})
```

Param is named `fund_uuid` but accepts any entity UUID. Pass the ManCo UUID from Part A.

One call per month -- twelve calls for a full year. MCP response capped ~40KB; multi-month windows truncate for non-trivial CoAs. Issue 12 monthly fetches in parallel batches of 5-6, merge row lists, slice Month and YTD locally.

Partial window (e.g. "through May") -> one call per month within that window.

### B2. Response shape

Flat list, one row per (account, month):

```json
{
  "id": "<uuid>",
  "account_id": "<uuid>",
  "account_name": "Management fee income",
  "account_type": "4160",
  "amount": 4361526,
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "source": "manual" | "carry-forward",
  "source_user_id": "<uuid>",
  "entity_budget_id": "<uuid>"
}
```

Notes:
- `account_type` = GL code (matches `ACCOUNT_TYPE` in JOURNAL_ENTRIES).
- `amount` is in natural display sign -- income positive, expenses positive. No leading-digit flip (differs from actuals).
- Some accounts post quarterly (mgmt fees in 1/4/7/10). Don't synthesize zeros -- leave blank. SUM treats blank as 0.

### B3. Single-month truncation

12 monthly fetches are the canonical path. If a single month STILL truncates (very rare -- JSON ends mid-object), surface to user. Don't auto-fall-back to per-account windows -- likely a response-shape change needing a skill fix.

### B4. Pivot to `{(gl_code, account_name) -> {month: amount}}`

```python
budget_by_account = {}
for row in rows:
    key = (row["account_type"], row["account_name"])
    month_label = row["start_date"][:7]
    budget_by_account.setdefault(key, {})[month_label] = (
        budget_by_account.get(key, {}).get(month_label, 0) + row["amount"]
    )
```

Same key from multiple rows is summed (defensive). Today the API returns one row per (account, month).

### B5. Slice Month + YTD

For P&L reporting month `<YYYY-MM>`:
- Month budget = `budget_by_account[key]["<YYYY-MM>"]`.
- YTD budget = sum across months `<YYYY-01>`-`<YYYY-MM>` inclusive.

### B6. Empty result

Zero rows -> do NOT synthesize. Plain-English message: *"No budget rows in Carta for this entity / year."* Offer retry / file import / workbook tab / skip.

---

## Output shape Gate 6 expects

```
{
  source_label: "Carta Fund Admin (live) -- <ManCo name>",
  scope: "single-entity",
  entity_name: "<ManCo name>",
  entity_uuid: "<uuid>",
  budget_year: 2026,
  rows: [{ gl_code, account_name, month_budget, ytd_budget }, ...]
}
```

Gate 6's row-set union merges `rows[]` with the actuals account set.
