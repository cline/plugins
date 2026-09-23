-- Canonical actuals query -- used by every Carta budgeting skill.
-- Substitute <entity_name>, <period_start>, <period_end> before calling
-- the connected Carta MCP fetch tool with verb "dwh:execute:query".
--
-- Schema notes (aligned with carta-consolidating-pnl):
--   - EFFECTIVE_DATE is the books date -- use this, not POSTED_DATE.
--   - AMOUNT is a single signed column. Revenue (4xxx) stored as negative
--     credits; expenses (5xxx+) stored as positive debits. Flip the sign
--     on revenue only.
--   - FUND_NAME is the entity-scoping primitive. Never FIRM_NAME ILIKE.
--   - BS accounts (1xxx, 2xxx, 3xxx) are excluded by ACCOUNT_TYPE >= '4000'.

SELECT
    ACCOUNT_TYPE                                                AS gl_code,
    ACCOUNT_NAME                                                AS account_name,
    DATE_TRUNC('MONTH', EFFECTIVE_DATE)                         AS period_month,
    SUM(CASE WHEN LEFT(ACCOUNT_TYPE, 1) = '4' THEN -AMOUNT
             ELSE AMOUNT END)                                   AS signed_amount
FROM <journal_entries_table>
WHERE FUND_NAME = '<entity_name>'
  AND ACCOUNT_TYPE >= '4000'
  AND EFFECTIVE_DATE BETWEEN '<period_start>' AND '<period_end>'
GROUP BY 1, 2, 3
ORDER BY 1, 3;
