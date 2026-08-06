-- Actuals sliced by reporting-tag categories and aggregated by period.
-- Used by carta-budget-actuals Layout E (tag-view tab).
--
-- Two query shapes -- pick by the JSON-vs-flat detection in Gate 2.5:
--
--   1. JSON path (REPORTING_TAGS_JSON populated)         -- primary, multi-category
--   2. Flat path  (only REPORTING_TAGS TEXT populated)   -- fallback, single synthetic category
--
-- Substitutions (never hardcode):
--   <journal_entries_table>  -- resolved via dwh:list:tables at Gate 0
--   <entity_name>            -- exact FUND_NAME value from Gate 3
--   <period_trunc>           -- YEAR | QUARTER | MONTH per Gate 3 aggregation choice
--   <period_start>           -- first day of the selected period (YYYY-MM-DD)
--   <period_end>             -- last day of the selected period (YYYY-MM-DD)
--
-- Hard rules (same as actuals-by-account-month.sql):
--   - FUND_NAME = exact match, never FIRM_NAME ILIKE
--   - EFFECTIVE_DATE (books date), not POSTED_DATE
--   - Revenue (4xxx) sign-flipped via CASE; expenses kept as-is
--   - ACCOUNT_TYPE >= '4000' restricts to P&L; balance sheet excluded
--   - Reversals preserved as negative postings

-- ============================================================
-- 1) JSON path -- multi-category
-- ============================================================
-- The CROSS JOIN with the categories CTE makes every journal entry produce one
-- row per category, with GET(...) extracting the value at that category key (or
-- 'Untagged' when the key is absent on that row). This is what guarantees the
-- per-category subtotal invariant: every category's subtotal sums to the same
-- account total in the period.

WITH categories AS (
    SELECT DISTINCT f.key AS category
    FROM <journal_entries_table>,
         LATERAL FLATTEN(input => REPORTING_TAGS_JSON) f
    WHERE FUND_NAME = '<entity_name>'
      AND REPORTING_TAGS_JSON IS NOT NULL
      AND EFFECTIVE_DATE BETWEEN '<period_start>' AND '<period_end>'
)
SELECT
    j.ACCOUNT_TYPE                                                AS gl_code,
    j.ACCOUNT_NAME                                                AS account_name,
    c.category                                                    AS category,
    COALESCE(GET(j.REPORTING_TAGS_JSON, c.category)::TEXT,
             'Untagged')                                          AS tag_value,
    DATE_TRUNC('<period_trunc>', j.EFFECTIVE_DATE)                AS period,
    SUM(CASE WHEN LEFT(j.ACCOUNT_TYPE, 1) = '4' THEN -j.AMOUNT
             ELSE j.AMOUNT END)                                   AS signed_amount
FROM <journal_entries_table> j
CROSS JOIN categories c
WHERE j.FUND_NAME = '<entity_name>'
  AND j.ACCOUNT_TYPE >= '4000'
  AND j.EFFECTIVE_DATE BETWEEN '<period_start>' AND '<period_end>'
GROUP BY 1, 2, 3, 4, 5
ORDER BY 1, 5, 3, 4;

-- ============================================================
-- 2) Flat path -- single synthetic category (fallback)
-- ============================================================
-- Use when REPORTING_TAGS_JSON is NULL across the firm's journal entries but the
-- flat REPORTING_TAGS TEXT column is populated. The synthetic category label is
-- 'Reporting Tag' so the 3-row header still renders consistently.

SELECT
    ACCOUNT_TYPE                                           AS gl_code,
    ACCOUNT_NAME                                           AS account_name,
    'Reporting Tag'                                        AS category,
    COALESCE(REPORTING_TAGS, 'Untagged')                   AS tag_value,
    DATE_TRUNC('<period_trunc>', EFFECTIVE_DATE)           AS period,
    SUM(CASE WHEN LEFT(ACCOUNT_TYPE, 1) = '4' THEN -AMOUNT
             ELSE AMOUNT END)                              AS signed_amount
FROM <journal_entries_table>
WHERE FUND_NAME = '<entity_name>'
  AND ACCOUNT_TYPE >= '4000'
  AND EFFECTIVE_DATE BETWEEN '<period_start>' AND '<period_end>'
GROUP BY 1, 2, 3, 4, 5
ORDER BY 1, 5, 4;
