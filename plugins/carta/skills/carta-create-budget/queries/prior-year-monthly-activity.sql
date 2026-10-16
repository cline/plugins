-- Prior-year monthly P&L activity grouped by (account, month).
-- Substitute <entity_name>, <prior_year> before calling the connected
-- Carta MCP fetch tool with verb "dwh:execute:query".
--
-- Sign convention (aligned with carta-consolidating-pnl):
--   Revenue (4xxx) flipped to positive; Expenses (5xxx+) kept as-is.
--   Balance Sheet accounts (1xxx/2xxx/3xxx) excluded by ACCOUNT_TYPE >= '4000'.

SELECT
    ACCOUNT_TYPE                                                AS gl_code,
    ACCOUNT_NAME                                                AS account_name,
    DATE_TRUNC('MONTH', EFFECTIVE_DATE)                         AS period_month,
    SUM(CASE WHEN LEFT(ACCOUNT_TYPE, 1) = '4' THEN -AMOUNT
             ELSE AMOUNT END)                                   AS signed_amount
FROM <journal_entries_table>
WHERE FUND_NAME = '<entity_name>'
  AND ACCOUNT_TYPE >= '4000'
  AND EXTRACT(YEAR FROM EFFECTIVE_DATE) = <prior_year>
GROUP BY 1, 2, 3
ORDER BY 1, 3;
