-- Chart of accounts: every P&L GL code that posted activity in the lookback window.
-- Substitute <entity_name>, <lookback_start>, <lookback_end> before calling
-- the connected Carta MCP fetch tool with verb "dwh:execute:query".

SELECT DISTINCT
    ACCOUNT_TYPE   AS gl_code,
    ACCOUNT_NAME   AS account_name
FROM <journal_entries_table>
WHERE FUND_NAME = '<entity_name>'
  AND ACCOUNT_TYPE >= '4000'
  AND EFFECTIVE_DATE BETWEEN '<lookback_start>' AND '<lookback_end>'
ORDER BY gl_code;
