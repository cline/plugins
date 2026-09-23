# Cap Table & Firm Ownership (Investor / Firm Context)

Query investor-side cap table and firm-ownership data for portfolio companies -- share classes, outstanding/authorized shares, ownership %, and firm stake.

## Triggers -- use this file when the user asks ...

Single company:
- "Pull a cap table for [Company]"
- "Pull a cap table for [Company] using the Carta Plugin"
- "Provide a full cap table for [Company]"
- "Show me the cap table for [Company] as of [date]"
- "What share classes does [Company] have?"

Batch (multiple companies in one prompt):
- "Pull cap tables for [A], [B], [C], and [D]"

Ownership questions:
- "What's our ownership in [Company]?"
- "What's our fully-diluted stake in [Company]?"

## Tool routing (CRITICAL -- investor/firm context)

When the active MCP context is a Firm, the agent has investor-side access only. Most portfolio companies returned by `fa:list:portfolio_companies` are exposed through the investor portal, not as direct cap-table-tenant members.

- ALWAYS query the DW. Use `SUMMARY_CAP_TABLE` for share-class detail and `FUND_CORPORATION_OWNERSHIP` for firm ownership % rollups.
- NEVER call `cap_table:*` or `cap_table_chart`. Those MCP commands require a direct cap-table-tenant user role and reject UUID-only corporation IDs. In firm context they will fail with permission or "invalid corporation_id" errors on nearly every portfolio company (only companies where the firm holds a direct cap-table viewer role -- e.g. holdco entities -- will succeed).
- Waterfall scenarios (`/waterfall-scenarios`) are NOT supported here -- they depend on cap-table-tenant access. If asked, explain the limitation and stop; do not attempt a DW workaround.
- Per-stakeholder / shareholder lists are NOT available -- there is no shareholder-detail table accessible in firm context. If the user asks "who are the shareholders of [Company]?" or "list shareholders", tell them individual shareholder data isn't accessible in investor context and stop. Do not attempt a DW workaround.

## Picking the right query

| User intent                                            | Use this query   | Primary table                              |
|--------------------------------------------------------|------------------|--------------------------------------------|
| Share-class breakdown, outstanding/authorized shares   | Query A      | `FUND_ADMIN.SUMMARY_CAP_TABLE`             |
| Firm ownership % / fully-diluted stake                 | Query B      | `FUND_ADMIN.FUND_CORPORATION_OWNERSHIP`    |
| Batch -- same intent across multiple companies          | A or B with `IN` | (same as above)                            |
| Both -- "give me the full picture for [Company]"        | A then B         | Both                                       |

## Input resolution (run before either query)

Step 0 (`fa:list:portfolio_companies`) has already run per SKILL.md -- its result contains `corporation_id` and `corporation_name` for every accessible portco. Match the user's company name(s) against that result first.

If the user supplied a name/UUID/integer ID that doesn't appear in the Step 0 result, or there's no clean match, resolve via the canonical corporation table:

```sql
SELECT DISTINCT CORPORATION_ID, CORPORATION_UUID, CORPORATION_NAME
FROM FUND_ADMIN.CORPORATION_BASIC_INFO_V2
WHERE LOWER(CORPORATION_NAME) LIKE '%<user-supplied name>%'
   OR CORPORATION_UUID = '<user-supplied uuid>'
   OR CORPORATION_ID = <user-supplied integer id>
LIMIT 10
```

- If multiple matches, use `ask the user` to confirm before continuing.
- If zero matches, tell the user the company doesn't appear in their portfolio and stop.
- Use the `CORPORATION_UUID` column when substituting into `<CORPORATION_UUIDS>` below -- NOT the `CORPORATION_ID` integer column. Both Query A and Query B match against the UUID-format `CORPORATION_ID` field in `SUMMARY_CAP_TABLE` / `FUND_CORPORATION_OWNERSHIP`. Substituting integer IDs yields silent zero-row results.

If only an entity link ID is available:

```sql
SELECT CORPORATION_ID
FROM FUND_ADMIN.CORPORATION_ENTITY_LINKS_V2
WHERE ENTITY_LINK_ID = '<ENTITY_LINK_ID>'
LIMIT 1
```
`CORPORATION_ENTITY_LINKS_V2.CORPORATION_ID` is UUID-format (TEXT) -- safe to pass directly to `<CORPORATION_UUIDS>` in Query A or Query B without additional resolution. The column is nullable: if `CORPORATION_ID` is null, the entity is not a Carta-tracked corporation and has no cap table -- stop and inform the user.

Firm UUID: call `list_contexts` -- each entry has a `firm_id` field. Use it as `<FIRM_UUID>` in Query B.

## Query A -- Cap Table by Share Class (SUMMARY_CAP_TABLE)

Parameters to substitute:
- `<CORPORATION_UUIDS>` -- one or more corporation IDs as a comma-separated list of quoted UUIDs (e.g. `'aaa-...', 'bbb-...'`).
- `<AS_OF_DATE>` -- the cap-table snapshot cutoff in `YYYY-MM-DD` format. Default to `CURRENT_DATE` for "latest snapshot" prompts. When the user specifies "as of [date]" (e.g. "as of Q1 2025", "as of 2024-12-31"), substitute that date here; the query will return the most recent snapshot on or before it. The same date is also applied to `FINANCING_HISTORY` so post-cutoff rounds are excluded.
  - ⚠️ `as_of_date` is a TIMESTAMP -- select and join the snapshot at the DATE level. The `latest_dates` CTE uses `MAX(DATE(as_of_date))` and the share CTEs join on `DATE(sct.as_of_date) = ld.max_as_of_date`. Keep both date-level. Do not revert to `MAX(as_of_date)` + an exact `sct.as_of_date = ld.max_as_of_date` equi-join: a single daily load can write rows with sub-second timestamp jitter (e.g. common classes at `...949`, the rest at `...950`), and an exact-timestamp join silently drops the jittered rows -- which is what produced cap tables missing Class A/B Common and inflated every ownership %. Likewise keep `DATE(as_of_date) <= '<AS_OF_DATE>'` in the filter so a same-day snapshot isn't excluded by midnight coercion.

```sql
WITH latest_dates AS (
    -- Snapshot selection MUST be date-level, not timestamp-level. `as_of_date` is a TIMESTAMP,
    -- and two failure modes follow from treating it as exact:
    --   1. Boundary: comparing `as_of_date <= '<date>'` coerces the literal to midnight
    --      (00:00:00), so a same-day snapshot timestamped later in the day is excluded and the
    --      query falls back to a STALE prior snapshot. Fixed by `DATE(as_of_date) <= '<date>'`.
    --   2. Intra-snapshot jitter: a single daily load can write rows with sub-second timestamp
    --      jitter -- e.g. Class A/B Common land at ...12.949 while every other class lands at
    --      ...12.950. Picking MAX(as_of_date) (a single full timestamp) and equi-joining
    --      `sct.as_of_date = ld.max_as_of_date` then SILENTLY DROPS the .949 rows (the common
    --      classes), undercounting the fully-diluted denominator and inflating EVERY
    --      ownership_pct. (This is the bug that produced cap tables missing common stock.)
    -- Both are fixed by collapsing to the calendar date: take MAX(DATE(as_of_date)) here and
    -- join on DATE(as_of_date) below, so all rows of one logical daily snapshot are included
    -- regardless of jitter. Assumes one logical snapshot per corp per calendar day (true for
    -- this daily-load table); if a corp ever has two genuine same-day loads, the date join would
    -- union both -- re-introduce a timestamp tiebreak then.
    SELECT CORPORATION_ID, MAX(DATE(as_of_date)) AS max_as_of_date
    FROM FUND_ADMIN.SUMMARY_CAP_TABLE
    WHERE CORPORATION_ID IN (<CORPORATION_UUIDS>)
      AND DATE(as_of_date) <= '<AS_OF_DATE>'
    GROUP BY CORPORATION_ID
),
shares_agg AS (
    SELECT
        sct.CORPORATION_ID,
        sct.SECURITY_CLASS_NAME,
        MIN(sct.security_class_type_detailed) AS security_class_type_detailed,
        SUM(sct.AUTHORIZED_SHARES)                      AS authorized_shares,
        SUM(sct.FULLY_DILUTED_QUANTITY)                 AS total_shares,
        SUM(sct.OUTSTANDING_SHARES)                     AS outstanding_shares
    FROM FUND_ADMIN.SUMMARY_CAP_TABLE sct
    INNER JOIN latest_dates ld
        ON sct.CORPORATION_ID    = ld.CORPORATION_ID
       AND DATE(sct.as_of_date)  = ld.max_as_of_date   -- date-level join: include all rows of the day's snapshot (see latest_dates)
    WHERE sct.security_class_type <> 'note_block'
    GROUP BY sct.CORPORATION_ID, sct.SECURITY_CLASS_NAME
),
total_shares_sum AS (
    SELECT
        sct.CORPORATION_ID,
        SUM(sct.FULLY_DILUTED_QUANTITY) AS grand_total_shares
    FROM FUND_ADMIN.SUMMARY_CAP_TABLE sct
    INNER JOIN latest_dates ld
        ON sct.CORPORATION_ID    = ld.CORPORATION_ID
       AND DATE(sct.as_of_date)  = ld.max_as_of_date   -- MUST match shares_agg's join exactly, or numerator/denominator diverge
    WHERE sct.security_class_type <> 'note_block'
    GROUP BY sct.CORPORATION_ID
),
round_prices AS (
    SELECT
        CORPORATION_ID,
        SHARECLASS_NAME,
        CLOSING_DATE         AS latest_closing_date,
        ORIGINAL_ISSUE_PRICE AS round_price
    FROM FUND_ADMIN.FINANCING_HISTORY
    WHERE CORPORATION_ID IN (<CORPORATION_UUIDS>)
      AND CLOSING_DATE <= '<AS_OF_DATE>'
    -- Tiebreaker on ORIGINAL_ISSUE_PRICE: if two rounds share the same CLOSING_DATE for a share class,
    -- pick the higher issue price deterministically rather than letting Snowflake choose.
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY CORPORATION_ID, SHARECLASS_NAME
        ORDER BY CLOSING_DATE DESC, ORIGINAL_ISSUE_PRICE DESC
    ) = 1
)
SELECT
    s.CORPORATION_ID,
    s.SECURITY_CLASS_NAME                                                    AS share_class,
    COALESCE(s.authorized_shares, 0)                                         AS authorized_shares,
    COALESCE(s.total_shares, 0)                                              AS total_shares,
    ROUND(s.total_shares / NULLIF(ts.grand_total_shares, 0) * 100, 2)       AS ownership_pct,
    r.round_price,
    CASE
        WHEN r.round_price IS NULL THEN NULL
        ELSE COALESCE(s.outstanding_shares, 0) * r.round_price
    END                                                                    AS liquidation_preference,
    r.latest_closing_date
FROM shares_agg s
JOIN  total_shares_sum ts ON s.CORPORATION_ID = ts.CORPORATION_ID
-- Note: SUMMARY_CAP_TABLE calls this column SECURITY_CLASS_NAME; FINANCING_HISTORY calls it SHARECLASS_NAME -- different column names, same logical share class.
LEFT JOIN round_prices r  ON s.SECURITY_CLASS_NAME = r.SHARECLASS_NAME
                          AND s.CORPORATION_ID     = r.CORPORATION_ID
ORDER BY
    s.CORPORATION_ID,
    CASE
        WHEN LOWER(s.SECURITY_CLASS_NAME) LIKE '%common%'          THEN 1
        WHEN s.security_class_type_detailed = 'Option plan'         THEN 2
        WHEN s.security_class_type_detailed = 'Preferred'           THEN 3
        WHEN LOWER(s.SECURITY_CLASS_NAME) LIKE '%warrant%'         THEN 4
        ELSE 5  -- novel / unknown share types (e.g. convertible notes, RSU-only plans) sort after warrants, not interleaved with preferred
    END,
    CASE
        WHEN s.security_class_type_detailed = 'Preferred'
            THEN COALESCE(r.latest_closing_date, '1900-01-01')
        ELSE NULL
    END,
    s.SECURITY_CLASS_NAME
LIMIT 500
```

Empty results -- if 0 rows return for a given `CORPORATION_ID`, that company has no cap table coverage in `SUMMARY_CAP_TABLE`. Surface this per-company in the response rather than failing silently for the whole batch.

Batch truncation -- `LIMIT 500` can silently truncate the tail of a large batch (results are ordered by `CORPORATION_ID`, so the last sort-order corps get dropped first). If the result set returns exactly 500 rows, treat the batch as potentially truncated: split the original `<CORPORATION_UUIDS>` list in half and re-run the query for each half. Cap the recursion at 2 levels of splitting (up to 4 sub-batches). If any sub-batch still returns 500 rows after that, stop splitting and tell the user the batch is too large to fully cover in one pass -- they should narrow the company list and re-ask.

- Single-company queries -- do not trigger a split. A 500-row result for one corporation means that company genuinely has 500 share-class rows, not truncation.
- Verification rule -- if the sum of the two halves' row counts equals the original 500, the original result was already complete; discard the split and use the original.

## Query B -- Firm Ownership Snapshot (FUND_CORPORATION_OWNERSHIP)

For "what's our ownership in [Company]" / "fully-diluted stake" / "firm stake" questions. Returns one row per (corporation, fund) at the most recent `AS_OF_DATE` on or before `<AS_OF_DATE>`. Exposes `PERCENTAGE` (the fund's % stake), `OWNERSHIP_QUANTITY` (number of shares held), `FULLY_DILUTED` (the corporation's total fully-diluted share count at that date -- the denominator backing the %), and `AS_OF_DATE`.

Parameters to substitute:
- `<FIRM_UUID>` -- from `list_contexts`.
- `<CORPORATION_UUIDS>` -- comma-separated quoted UUIDs.
- `<AS_OF_DATE>` -- the snapshot cutoff in `YYYY-MM-DD` format. Use the same value as in Query A so the two queries align temporally for the combined "give me the full picture" path. Default to `CURRENT_DATE` for "latest snapshot" prompts; substitute the user's requested date when they say "as of [date]".

```sql
WITH ranked AS (
    SELECT  CORPORATION_ID,
            FIRM_ID,
            FUND_ID,
            TRY_TO_DECIMAL(PERCENTAGE, 38, 10) * 100 AS ownership_pct_calc,
            FULLY_DILUTED,
            OWNERSHIP_QUANTITY,
            AS_OF_DATE,
            ROW_NUMBER() OVER (
              PARTITION BY CORPORATION_ID, FIRM_ID, FUND_ID
              ORDER BY AS_OF_DATE DESC
            ) AS rn
    FROM FUND_ADMIN.FUND_CORPORATION_OWNERSHIP
    WHERE FIRM_ID = '<FIRM_UUID>'
      AND CORPORATION_ID IN (<CORPORATION_UUIDS>)
      -- DATE() cast for the same reason as Query A: guard against AS_OF_DATE carrying a time
      -- component, which would make a bare `<= '<date>'` (coerced to midnight) skip the
      -- same-day snapshot and fall back to a stale, lower ownership %. Harmless if the column
      -- is already a pure DATE.
      AND DATE(AS_OF_DATE) <= '<AS_OF_DATE>'
)
SELECT
    r.CORPORATION_ID,
    r.FUND_ID,
    f.FUND_NAME,
    r.AS_OF_DATE,
    ROUND(r.ownership_pct_calc, 2) AS firm_ownership_pct,
    r.OWNERSHIP_QUANTITY,
    r.FULLY_DILUTED                AS total_fd_shares
FROM ranked r
LEFT JOIN FUND_ADMIN.FUNDS f ON f.FUND_UUID = r.FUND_ID
WHERE r.rn = 1
ORDER BY r.CORPORATION_ID, f.FUND_NAME
LIMIT 500
```

Notes:
- `PERCENTAGE` in source is stored as TEXT, fraction-valued (e.g. `"0.0432"` = 4.32%). The query uses `TRY_TO_DECIMAL` to cast safely -- non-numeric strings (e.g. `"N/A"`) become `NULL` and propagate to `firm_ownership_pct` as `NULL`. Render `--` for these rows in the presentation; do not treat them as `0%` ownership.
- One row per (corporation, fund). If the firm holds the same corp through multiple funds, each fund gets its own row -- do not sum percentages across funds.
- `FULLY_DILUTED` is the corporation's total fully-diluted share count at the snapshot date (the denominator backing `PERCENTAGE`). It is NOT a boolean. Aliased as `total_fd_shares` in the SELECT to avoid confusion.
- `FUND_NAME` is resolved via `LEFT JOIN FUND_ADMIN.FUNDS` (one row per fund -- no aggregation needed).

Batch truncation -- `LIMIT 500` can silently truncate a large batch (one row per `(corporation, fund)` -- firms with many funds × many portcos may exceed 500). If the result returns exactly 500 rows, treat the batch as potentially truncated: split `<CORPORATION_UUIDS>` in half and re-run for each half. Cap the recursion at 2 levels of splitting (up to 4 sub-batches). If any sub-batch still returns 500 rows after that, stop splitting and tell the user the batch is too large to fully cover in one pass -- they should narrow the company list and re-ask.

- Single-company queries -- do not trigger a split. A 500-row result for one corporation means the firm holds that company through 500 funds (extremely unlikely) and is genuine, not truncation.
- Verification rule -- if the sum of the two halves' row counts equals the original 500, the original result was already complete; discard the split.

## Table reference

### SUMMARY_CAP_TABLE
Each row is a share class snapshot per corporation at a given date.

| Column | Description |
|--------|-------------|
| `CORPORATION_ID` | Portfolio company identifier (UUID) |
| `as_of_date` | Cap table snapshot timestamp. TIMESTAMP, not DATE (carries a time component, e.g. `2026-06-03 16:13:19`). Rows of one daily snapshot can have sub-second jitter (e.g. common classes at `...949`, others at `...950`), so always select/join at the DATE level (`MAX(DATE(as_of_date))`, `DATE(as_of_date) = ...`) -- an exact-timestamp equi-join drops the jittered rows. Also filter with `DATE(as_of_date) <= '<date>'`, never a bare `<= '<date>'`, or the same-day snapshot is excluded. |
| `SECURITY_CLASS_NAME` | Share class label (e.g. "Series A Preferred") |
| `security_class_type` | Broad type; filter out `note_block` rows |
| `security_class_type_detailed` | Granular type: `Preferred`, `Option plan`, etc. |
| `AUTHORIZED_SHARES` | Shares authorized in the class |
| `FULLY_DILUTED_QUANTITY` | Fully diluted share count -- the basis for `total_shares` and the `ownership_pct` denominator. Populated for real share classes (incl. common). If common shares or another class go missing from a result, the cause is almost always `as_of_date` snapshot selection (stale-fallback or timestamp-jitter drop -- see the row above), not a null `FULLY_DILUTED_QUANTITY`. Do not "fix" it by `COALESCE`-ing in `OUTSTANDING_SHARES`; that masks the real bug and double-counts. |
| `OUTSTANDING_SHARES` | Issued and outstanding shares |
| `OUTSTANDING_WARRANTS` | Outstanding warrants |
| `OUTSTANDING_EQUITY_AWARD_DERIVATIVES` | Outstanding options/RSUs |

Supporting tables used by Query A:
- `FINANCING_HISTORY` -- round price and date per share class (`SHARECLASS_NAME`, `ORIGINAL_ISSUE_PRICE`, `CLOSING_DATE`, `RAISED_DATE`)

### FUND_CORPORATION_OWNERSHIP
One row per (corporation, firm, fund, as_of_date). Source for Query B.

| Column | Description |
|--------|-------------|
| `CORPORATION_ID` | Portfolio company identifier (UUID) |
| `FIRM_ID` | Firm identifier (UUID) -- match against `list_contexts.firm_id` |
| `FUND_ID` | Fund identifier (UUID) |
| `AS_OF_DATE` | Date of the ownership snapshot |
| `PERCENTAGE` | Fund's ownership fraction in the corp, stored as TEXT (cast with `TRY_TO_DECIMAL`; multiply by 100 for %) |
| `FULLY_DILUTED` | Corporation's total fully-diluted share count at the snapshot date (NUMBER, NOT a boolean -- this is the denominator backing `PERCENTAGE`) |
| `OWNERSHIP_QUANTITY` | Number of shares the fund holds |

## Common Aliases

`CORPORATION_NAME`, `LEGAL_NAME`, `company_name`

## Presentation

### Single company
1. Header line -- "Cap table for [Company Name] as of [latest snapshot date]"
2. Table columns (max 6): Share Class | Authorized Shares | Total Shares | Class Ownership % | Round Price | Closing Date. The `liquidation_preference` column is present in the result set but must not appear as a table column -- render it only as a prose summary line below the table, and call it a face-value estimate (it is `outstanding_shares × round_price`; it does NOT account for participation multiples, seniority stacks, or anti-dilution adjustments, so do not use it for waterfall modeling).
3. Currency -- `$X.XX` for round price; `$X,XXX` for liquidation preference (`outstanding_shares × round_price` per share class; surface as a face-value summary line below the table, not as an inline column).
4. Liquidation preference reliability -- `round_price` is `NULL` when no matching row exists in `FINANCING_HISTORY` for that share class. This is expected behavior, not a bug: `FINANCING_HISTORY` only covers priced financing rounds, so non-priced classes (option/RSU plans, warrants, common stock, ESOP) will always have `NULL` round price. With the SELECT's `CASE WHEN r.round_price IS NULL THEN NULL` guard, `liquidation_preference` is also `NULL` for those rows. Render `--` for both columns in those cases. For preferred classes where the round price is still `NULL`, note in prose that the financing-round price could not be resolved (uncommon but possible for older / pre-Carta rounds with missing `FINANCING_HISTORY` coverage).
5. Percentages -- `X.XX%`. The `ownership_pct` column from Query A is the share class's % of total fully-diluted shares -- NOT the firm's stake. Label it "Class Ownership %" to avoid confusion.
6. Firm-level stake -- to show "what % does the firm own", run Query B and surface its result in a separate summary line (e.g. "Firm ownership: 4.32% as of 2026-03-31"), not as a per-row column in the share-class table.
7. Row order -- common first, then option plans, then preferred (oldest to newest round), then warrants
8. Missing round price -- show `--` rather than `$0` to avoid implying a zero-dollar round

### Batch (multiple companies in one prompt)
- Render one section per company with a `### [Company Name]` header followed by its table. Do not interleave rows from different companies.
- For companies that returned zero rows from Query A, show a single line under the header: "_No cap table data in Carta for this company._" Continue to the next company; do not abort the entire response.

### Ownership-only response (Query B without Query A)
- Render one table per company, with columns: Fund Name | As Of | Ownership % | Shares Held.
- Each row corresponds to one fund within the firm holding that company. If the firm holds the company through multiple funds, list each fund as its own row so the user can see fund-specific ownership.
- Do not sum the ownership % across funds. `total_fd_shares` is the corporation's total fully-diluted share count (the denominator) -- it is the same for every fund in a given (corp, snapshot) and should not be rendered as a per-row column; mention it once in a footnote if the user asks for the denominator.
- If `FUND_NAME` is null for a row (no matching row in `FUNDS`), fall back to displaying `FUND_ID`.
- NULL `firm_ownership_pct` -- render `--`, not `0.00%`. A NULL means the source `PERCENTAGE` was non-numeric (e.g. `"N/A"`) for that snapshot; treat it as data-unavailable, not zero ownership.
