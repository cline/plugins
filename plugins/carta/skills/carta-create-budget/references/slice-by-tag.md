# Reference: budget sliced by reporting tag / department

## When to use

User said "by department", "by reporting tag", "split by `<tag>`", "by sub-account", etc.

## Workflow

### 1. Discover the slicing dimension

Common dimension columns on the journal-entries table (typical names: reporting-tag, department, sub-account-name, project-code, class). Discover the exact column names at runtime via `dwh:get:table_schema` -- don't hardcode.

Discovery query:

```sql
SELECT DISTINCT <dimension_column>
FROM <journal_entries_table>
WHERE FUND_NAME = '<entity_name>'
  AND EFFECTIVE_DATE BETWEEN '<lookback_start>' AND '<lookback_end>'
ORDER BY 1;
```

If all NULL, tell the user the entity isn't tagged on that dimension and offer: a) flat budget, b) cancel.

### 2. Build the pivot

Group by `(ACCOUNT_NAME, <dimension>, MONTH)`. Each dimension value gets its own column block:

```
Account | <Dim 1> Jan 2025 Actual | <Dim 1> Jan 2026 Budget | <Dim 2> Jan 2025 Actual | ...
```

For wide pivots (>8 dimension values), prefer long format:

```
Account | Section | <Dim Value> | Jan 2025 Actual | Jan 2026 Budget | ... | Year Total
```

Ask the user which layout at the Gate 2 parameter-batching step when cardinality > 8.

### 3. Otherwise same as `from-prior-actuals.md`

Same source, sign convention, scope filter, section mapping, approval gate. Note which dimension was sliced in the source metadata (B3).

## Hard rules

- Never invent dimension column names -- always discover first.
- Slice is additive to entity filter, never a replacement. `WHERE FUND_NAME = '<entity>'` always applies.
