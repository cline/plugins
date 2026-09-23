# Form ADV -- Source Tables, Field Mappings & SQL Queries

---

### Source Tables

| Table | Purpose |
|---|---|
| `FUND_ADMIN.FUNDS` | Fund metadata: entity type, legal structure, vintage/formation date, investment strategy, fund size, firm |
| `FUND_ADMIN.JOURNAL_ENTRIES` | Balance sheet: cash, cost of investment, unrealized G/L, other assets, borrowings (all account types) |
| `FUND_ADMIN.MONTHLY_NAV_CALCULATIONS` | Fund-level NAV (LP/GP split), unfunded commitments, cumulative and annual contributions/distributions |
| `FUND_ADMIN.PARTNER_MONTHLY_NAV_CALCULATIONS` | Partner-level point-in-time NAV and active membership per fund at month-end. Use this for any reporting-date investor count or NAV breakdown. |
| `FUND_ADMIN.AGGREGATE_FUND_METRICS` | LP and GP investor counts (current snapshot -- fallback only) |
| `FUND_ADMIN.AGGREGATE_INVESTMENTS` | Active portfolio companies snapshot (current state). |
| `FUND_ADMIN.AGGREGATE_INVESTMENTS_HISTORY` | Point-in-time portfolio holdings -- use with `EFFECTIVE_DATE <= reporting_date` for historical Form ADV filings. |
| `FUND_ADMIN.PARTNER_DATA` | Investor demographics (current snapshot): country (US/non-US), entity type, commitment size. Used for classification, not for point-in-time NAV. |

### Key Fields Mapping

| Output Field | Source | Account Type / Column | Form ADV Use |
|---|---|---|---|
| Cash | JOURNAL_ENTRIES | account_type 1000-1099 | Sched D §7.B.(1): gross assets |
| Cost of Investment | JOURNAL_ENTRIES | account_type 1100 | Sched D §7.B.(1): FMV (cost basis) |
| Unrealized G/L | JOURNAL_ENTRIES | account_type 1101 | Sched D §7.B.(1): FMV (unrealized) |
| Other Assets | JOURNAL_ENTRIES | account_type 1200-1899 | Sched D §7.B.(1): gross assets |
| Total Borrowings | JOURNAL_ENTRIES | account_type 2000-2099 (negated) -- debt only | Sched D §7.B.(1): borrowings outstanding |
| Other Liabilities | JOURNAL_ENTRIES | account_type 2100-2999 (negated) | Surfaced for review; not part of borrowings |
| Unfunded Commitments | MONTHLY_NAV_CALCULATIONS | GREATEST(commitment - contributions, 0) | Regulatory AUM addback |
| Regulatory AUM | Computed | Gross Assets + Unfunded Commitments | Item 5.D, 5.F |
| Net Asset Value | MONTHLY_NAV_CALCULATIONS | ending_total_nav | Sched D §7.B.(1): NAV; Form PF |
| # Beneficial Owners (per fund) | PARTNER_MONTHLY_NAV_CALCULATIONS | distinct partner_id at month_end_date | Sched D §7.B.(1) Q.13 |
| # Beneficial Owners (firm) | Query 3 firm_aggregates | distinct partner_id across funds | Item 5.D, 5.H -- firm-level distinct LP count |
| % Non-US Persons (firm) | Query 3 firm_aggregates | partner_country bucketed, distinct partner_id | Item 5.H |
| Fund Formation Date | FUNDS | vintage_date | Sched D §7.B.(1) Q.6 |
| Legal Structure | FUNDS | legal_structure | Sched D §7.B.(1) organizational form |
| Fund Type | FUNDS | investment_strategy_code | Sched D §7.B.(1) fund type classification |

### Important: Date Field

Use `effective_date` (accounting date) from `JOURNAL_ENTRIES`. The datashare table already filters to posted, non-deleted entries -- do not add an additional `posted_date <= reporting_date` filter, as it will exclude valid backdated entries and misalign with the Carta balance sheet.

### Point-in-Time vs. Snapshot -- Rule of Thumb

For any filing-date Form ADV value (investor counts, US/non-US %, asset composition, NAV by partner), use a point-in-time source filtered to `reporting_date`:

- Partner membership / counts -> `PARTNER_MONTHLY_NAV_CALCULATIONS` at `month_end_date = reporting_date`.
- Per-partner NAV at reporting date -> `PARTNER_MONTHLY_NAV_CALCULATIONS.ending_total_nav` (column name may vary -- verify against schema before merging changes).
- Portfolio holdings at reporting date -> `AGGREGATE_INVESTMENTS_HISTORY` with `EFFECTIVE_DATE <= reporting_date` + QUALIFY most-recent-per-position.

`AGGREGATE_INVESTMENTS`, `AGGREGATE_FUND_METRICS`, and `PARTNER_DATA` are current snapshots and are only used as fallbacks (e.g. classification fields where point-in-time isn't required) or when a fund has no NAV calc for the reporting month.

---

### Query 1 -- Regulatory AUM, Fund Detail, and Capital Activity

Produces per-fund Schedule D §7.B.(1) rows. Substitute `{reporting_date}` with the user's reporting date (YYYY-MM-DD) before executing.

```sql
WITH
constants AS (
    SELECT LAST_DAY('{reporting_date}'::DATE) AS reporting_date
),

funds AS (
    SELECT
        f.fund_uuid,
        f.fund_name,
        f.entity_type_name,
        f.legal_structure,
        f.vintage_date,
        f.vintage_year,
        f.investment_strategy_code,
        f.fund_size                    AS total_fund_commitment,
        f.fund_family_name,
        f.firm_name,
        f.firm_id,
        c.reporting_date
    FROM FUND_ADMIN.FUNDS f
    CROSS JOIN constants c
    WHERE f.entity_type_name IN ('Fund', 'SPV')
      AND f.is_onboarding = FALSE
),

je_balances AS (
    -- Borrowings narrowed to debt accounts (2000-2099 typically: LOC, term loans).
    -- Previously summed 2000-2999, which incorrectly included payables, accrued expenses,
    -- and due-to-broker -- none of which are "borrowings outstanding" under Form ADV §7.B.(1).
    -- other_liabilities is surfaced separately for review but is NOT part of regulatory AUM.
    SELECT
        j.fund_uuid,
        SUM(CASE WHEN j.account_type BETWEEN 1000 AND 1099 THEN j.amount ELSE 0 END)  AS cash,
        SUM(CASE WHEN j.account_type = 1100                THEN j.amount ELSE 0 END)  AS cost_of_investment,
        SUM(CASE WHEN j.account_type = 1101                THEN j.amount ELSE 0 END)  AS unrealized_gl,
        SUM(CASE WHEN j.account_type BETWEEN 1200 AND 1899 THEN j.amount ELSE 0 END)  AS other_assets,
       -SUM(CASE WHEN j.account_type BETWEEN 2000 AND 2099 THEN j.amount ELSE 0 END)  AS total_borrowings,
       -SUM(CASE WHEN j.account_type BETWEEN 2100 AND 2999 THEN j.amount ELSE 0 END)  AS other_liabilities
    FROM FUND_ADMIN.JOURNAL_ENTRIES j
    INNER JOIN funds f ON j.fund_uuid = f.fund_uuid
    WHERE j.effective_date <= f.reporting_date
    GROUP BY j.fund_uuid
),

nav_data AS (
    SELECT
        n.fund_uuid,
        n.ending_total_nav,
        n.ending_lp_nav,
        n.ending_gp_nav,
        n.cumulative_commitment_amount,
        n.cumulative_total_contributions,
        n.cumulative_lp_contributions,
        n.cumulative_gp_contributions,
        n.cumulative_total_distributions,
        n.cumulative_lp_distributions,
        n.cumulative_gp_distributions,
        GREATEST(n.cumulative_commitment_amount - n.cumulative_total_contributions, 0) AS unfunded_commitments,
        n.total_tvpi,
        n.total_moic,
        n.total_dpi,
        n.lp_tvpi,
        n.lp_dpi,
        n.lp_moic
    FROM FUND_ADMIN.MONTHLY_NAV_CALCULATIONS n
    INNER JOIN funds f ON n.fund_uuid = f.fund_uuid
    WHERE n.is_firm_rollup = FALSE
      AND n.month_end_date = f.reporting_date
    QUALIFY ROW_NUMBER() OVER (PARTITION BY n.fund_uuid ORDER BY n.last_refreshed_at DESC) = 1
),

annual_activity AS (
    SELECT
        n.fund_uuid,
        SUM(n.total_contributions)  AS annual_subscriptions,
        SUM(n.total_distributions)  AS annual_distributions,
        SUM(n.lp_contributions)     AS annual_lp_subscriptions,
        SUM(n.lp_distributions)     AS annual_lp_distributions,
        SUM(n.gp_contributions)     AS annual_gp_subscriptions,
        SUM(n.gp_distributions)     AS annual_gp_distributions
    FROM FUND_ADMIN.MONTHLY_NAV_CALCULATIONS n
    INNER JOIN funds f ON n.fund_uuid = f.fund_uuid
    WHERE n.is_firm_rollup = FALSE
      AND n.month_end_date BETWEEN DATE_TRUNC('year', f.reporting_date) AND f.reporting_date
    GROUP BY n.fund_uuid
),

-- Point-in-time investor counts: join PARTNER_MONTHLY_NAV_CALCULATIONS (point-in-time membership)
-- to PARTNER_DATA (LP/GP classification). Partners present in the monthly calc at the exact
-- reporting month-end are counted as active at that date.
-- Falls back to AGGREGATE_FUND_METRICS (current snapshot) for funds with no NAV calc that month.
investor_counts_pit AS (
    SELECT
        pmn.fund_id AS fund_uuid,
        COUNT(DISTINCT CASE WHEN pd.is_limited_partner THEN pmn.partner_id END) AS count_lps,
        COUNT(DISTINCT CASE WHEN pd.is_general_partner THEN pmn.partner_id END) AS count_gps,
        TRUE                                                                 AS is_point_in_time
    FROM FUND_ADMIN.PARTNER_MONTHLY_NAV_CALCULATIONS pmn
    INNER JOIN funds f  ON pmn.fund_id = f.fund_uuid
    LEFT  JOIN FUND_ADMIN.PARTNER_DATA pd
           ON pmn.fund_id    = pd.fund_uuid
          AND pmn.partner_id = pd.partner_id
    WHERE pmn.month_end_date = f.reporting_date
    GROUP BY pmn.fund_id
),

investor_counts_snapshot AS (
    SELECT
        m.fund_uuid,
        m.count_lps,
        m.count_gps,
        FALSE AS is_point_in_time
    FROM FUND_ADMIN.AGGREGATE_FUND_METRICS m
    INNER JOIN funds f ON m.fund_uuid = f.fund_uuid
    QUALIFY ROW_NUMBER() OVER (PARTITION BY m.fund_uuid ORDER BY m.last_refreshed_at DESC) = 1
),

investor_counts AS (
    -- LEFT JOIN replaces UNION ALL (DWH endpoint rejects set operations in CTEs).
    -- Priority: point-in-time over snapshot; is_point_in_time=TRUE when pit row exists.
    SELECT
        f.fund_uuid,
        COALESCE(pit.count_lps,  snap.count_lps,  0) AS count_lps,
        COALESCE(pit.count_gps,  snap.count_gps,  0) AS count_gps,
        (pit.fund_uuid IS NOT NULL)                    AS is_point_in_time
    FROM funds f
    LEFT JOIN investor_counts_pit      pit  ON f.fund_uuid = pit.fund_uuid
    LEFT JOIN investor_counts_snapshot snap ON f.fund_uuid = snap.fund_uuid
),

-- Point-in-time portfolio holdings: use AGGREGATE_INVESTMENTS_HISTORY filtered to
-- EFFECTIVE_DATE <= reporting_date, take the most recent record per fund/issuer/asset.
-- Previously used AGGREGATE_INVESTMENTS (current snapshot), which made Schedule D §5.K.(1)
-- and the asset-composition tiles reflect TODAY's portfolio rather than reporting_date.
portfolio_pit AS (
    SELECT
        aih.fund_uuid,
        aih.general_ledger_issuer_id,
        aih.is_active_investment,
        aih.remaining_value,
        aih.is_public_asset,
        aih.is_ownership_interest_asset,
        aih.is_investment_in_fund,
        aih.is_crypto_asset,
        aih.is_option_or_warrant_asset,
        aih.is_alternative_or_other_asset
    FROM FUND_ADMIN.AGGREGATE_INVESTMENTS_HISTORY aih
    INNER JOIN funds f ON aih.fund_uuid = f.fund_uuid
    WHERE aih.effective_date <= f.reporting_date
    -- Deterministic tiebreaker on last_refreshed_at so two history records sharing the
    -- same effective_date don't flip Schedule D §5.K.(1) FMV between runs. Same column
    -- the fund-level NAV CTE uses.
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY aih.fund_uuid, aih.general_ledger_issuer_id
        ORDER BY aih.effective_date DESC, aih.last_refreshed_at DESC
    ) = 1
),

portfolio_summary AS (
    SELECT
        p.fund_uuid,
        COUNT(DISTINCT CASE WHEN p.is_active_investment THEN p.general_ledger_issuer_id END)  AS active_portfolio_companies,
        -- Asset type composition for Schedule D §5.K.(1) SMA reporting
        SUM(CASE WHEN p.is_active_investment AND p.is_public_asset
            THEN p.remaining_value ELSE 0 END)                                                AS fmv_exchange_traded_equity,
        SUM(CASE WHEN p.is_active_investment
            AND NOT p.is_public_asset AND p.is_ownership_interest_asset
            AND NOT p.is_investment_in_fund
            THEN p.remaining_value ELSE 0 END)                                                AS fmv_private_equity,
        SUM(CASE WHEN p.is_active_investment AND p.is_investment_in_fund
            THEN p.remaining_value ELSE 0 END)                                                AS fmv_pooled_investment_vehicles,
        SUM(CASE WHEN p.is_active_investment AND p.is_crypto_asset
            THEN p.remaining_value ELSE 0 END)                                                AS fmv_digital_assets,
        SUM(CASE WHEN p.is_active_investment AND p.is_option_or_warrant_asset
            THEN p.remaining_value ELSE 0 END)                                                AS fmv_options_and_warrants,
        SUM(CASE WHEN p.is_active_investment AND p.is_alternative_or_other_asset
            AND NOT p.is_crypto_asset
            THEN p.remaining_value ELSE 0 END)                                                AS fmv_other_alternatives,
        SUM(CASE WHEN p.is_active_investment
            THEN p.remaining_value ELSE 0 END)                                                AS total_active_fmv
    FROM portfolio_pit p
    GROUP BY p.fund_uuid
),

fund_detail AS (
    SELECT
        '7.B.(1) Fund Detail'                                                           AS form_adv_section,
        f.fund_name,
        f.entity_type_name                                                              AS entity_type,
        f.legal_structure,
        f.vintage_date                                                                  AS formation_date,
        f.vintage_year,
        f.fund_family_name,
        f.investment_strategy_code,
        CASE
            WHEN f.investment_strategy_code = 'DIRECT_VENTURE' THEN 'Venture Capital Fund'
            WHEN f.investment_strategy_code = 'DIRECT_PE'      THEN 'Private Equity Fund'
            WHEN f.investment_strategy_code = 'REAL_ESTATE'    THEN 'Real Estate Fund'
            WHEN f.investment_strategy_code = 'FUND_OF_FUNDS'  THEN 'Other Private Fund (Fund of Funds)'
            ELSE 'Other Private Fund'
        END                                                                             AS fund_type_classification,
        -- Balance sheet / gross assets
        ROUND(je.cost_of_investment + je.unrealized_gl, 2)                              AS fair_market_value,
        ROUND(je.cash, 2)                                                               AS cash,
        ROUND(je.other_assets, 2)                                                       AS other_assets,
        ROUND(je.cost_of_investment + je.unrealized_gl + je.cash + je.other_assets, 2) AS total_gross_assets,
        ROUND(je.total_borrowings, 2)                                                   AS total_borrowings_outstanding,
        ROUND(je.other_liabilities, 2)                                                  AS other_liabilities,
        -- Regulatory AUM
        -- COALESCE unfunded -> 0 so a missing NAV calc doesn't null out the entire fund.
        -- A null regulatory_aum used to silently drop the fund from the firm rollup.
        ROUND(COALESCE(nav.unfunded_commitments, 0), 2)                                 AS unfunded_commitments,
        ROUND(
            je.cost_of_investment + je.unrealized_gl + je.cash + je.other_assets
            + COALESCE(nav.unfunded_commitments, 0), 2)                                 AS regulatory_aum,
        -- NAV (Form PF and ADV §7.B.(1))
        ROUND(nav.ending_total_nav, 2)                                                  AS net_asset_value,
        ROUND(nav.ending_lp_nav, 2)                                                     AS lp_nav,
        ROUND(nav.ending_gp_nav, 2)                                                     AS gp_nav,
        ROUND(COALESCE(nav.ending_total_nav, 0) + COALESCE(nav.unfunded_commitments, 0), 2) AS net_aum_form_pf,
        -- Capital activity -- annual (Sched D §7.B.(1))
        ROUND(act.annual_subscriptions, 2)                                              AS annual_subscriptions,
        ROUND(act.annual_distributions, 2)                                              AS annual_distributions,
        ROUND(act.annual_lp_subscriptions, 2)                                           AS annual_lp_subscriptions,
        ROUND(act.annual_lp_distributions, 2)                                           AS annual_lp_distributions,
        ROUND(act.annual_gp_subscriptions, 2)                                           AS annual_gp_subscriptions,
        ROUND(act.annual_gp_distributions, 2)                                           AS annual_gp_distributions,
        -- Capital activity -- inception-to-date
        ROUND(nav.cumulative_commitment_amount, 2)                                      AS total_committed_capital,
        ROUND(nav.cumulative_total_contributions, 2)                                    AS contributions_since_inception,
        ROUND(nav.cumulative_lp_contributions, 2)                                       AS lp_contributions_since_inception,
        ROUND(nav.cumulative_gp_contributions, 2)                                       AS gp_contributions_since_inception,
        ROUND(nav.cumulative_total_distributions, 2)                                    AS distributions_since_inception,
        ROUND(nav.cumulative_lp_distributions, 2)                                       AS lp_distributions_since_inception,
        -- Investor counts (Sched D §7.B.(1) Q.13: # beneficial owners)
        -- is_point_in_time = TRUE means count is as of reporting_date; FALSE = current snapshot fallback
        COALESCE(lp.count_lps, 0)                                                       AS beneficial_owners_lp,
        COALESCE(lp.count_gps, 0)                                                       AS beneficial_owners_gp,
        COALESCE(lp.count_lps, 0) + COALESCE(lp.count_gps, 0)                          AS total_beneficial_owners,
        COALESCE(lp.is_point_in_time, FALSE)                                            AS investor_count_is_point_in_time,
        -- Portfolio composition
        COALESCE(ps.active_portfolio_companies, 0)                                      AS active_portfolio_companies,
        ROUND(ps.fmv_exchange_traded_equity, 2)                                         AS fmv_exchange_traded_equity,
        ROUND(ps.fmv_private_equity, 2)                                                 AS fmv_private_equity,
        ROUND(ps.fmv_pooled_investment_vehicles, 2)                                     AS fmv_pooled_investment_vehicles,
        ROUND(ps.fmv_digital_assets, 2)                                                 AS fmv_digital_assets,
        ROUND(ps.fmv_options_and_warrants, 2)                                           AS fmv_options_and_warrants,
        ROUND(ps.fmv_other_alternatives, 2)                                             AS fmv_other_alternatives,
        ROUND(ps.total_active_fmv, 2)                                                   AS total_active_fmv,
        -- Performance
        ROUND(nav.total_dpi, 4)                                                         AS total_dpi,
        ROUND(nav.total_tvpi, 4)                                                        AS total_tvpi,
        ROUND(nav.total_moic, 4)                                                        AS total_moic,
        ROUND(nav.lp_dpi, 4)                                                            AS lp_dpi,
        ROUND(nav.lp_tvpi, 4)                                                           AS lp_tvpi
    FROM funds f
    LEFT JOIN je_balances       je  ON f.fund_uuid = je.fund_uuid
    LEFT JOIN nav_data          nav ON f.fund_uuid = nav.fund_uuid
    LEFT JOIN annual_activity   act ON f.fund_uuid = act.fund_uuid
    LEFT JOIN investor_counts   lp  ON f.fund_uuid = lp.fund_uuid
    LEFT JOIN portfolio_summary ps  ON f.fund_uuid = ps.fund_uuid
)

SELECT * FROM fund_detail
ORDER BY fund_name
```

---

### Query 2 -- Per-Fund Investor Demographics (US / Non-US Breakdown)

Produces per-fund investor counts, US vs. non-US breakdown, and owner-type distribution for Schedule D §7.B.(1) Questions 14-16. Run after Query 1.

> Point-in-time: This rewrite uses `PARTNER_MONTHLY_NAV_CALCULATIONS` to determine which partners were active as of `reporting_date`, instead of the current-snapshot `PARTNER_DATA.is_active` flag. Per-partner NAV is also pulled from PMN (`ending_total_nav`) at reporting date, not from `PARTNER_DATA.total_net_asset_balance` which is current.
>
> Entity-type buckets are mutually exclusive. Each LP falls into exactly one bucket (first match wins, in priority order: pension -> trust/foundation -> individual -> other fund -> corporate -> uncategorized). This prevents the percentages in Schedule D §7.B.(1) Q.16 from summing to >100%.
>
> Country detection caveat: `partner_country` is user-entered. Always spot-check before filing. Partners with no country on file are surfaced separately.

```sql
WITH
constants AS (
    SELECT LAST_DAY('{reporting_date}'::DATE) AS reporting_date
),

funds AS (
    SELECT f.fund_uuid, f.fund_name, f.firm_id
    FROM FUND_ADMIN.FUNDS f
    WHERE f.entity_type_name IN ('Fund', 'SPV')
      AND f.is_onboarding = FALSE
),

-- Point-in-time partner membership at reporting_date.
-- One row per (fund_uuid, partner_id) for partners present in the monthly calc.
partner_pit AS (
    SELECT
        pmn.fund_id    AS fund_uuid,
        pmn.partner_id,
        pmn.ending_total_nav  -- TODO(schema-verify): confirm column name in PARTNER_MONTHLY_NAV_CALCULATIONS
    FROM FUND_ADMIN.PARTNER_MONTHLY_NAV_CALCULATIONS pmn
    INNER JOIN funds f ON pmn.fund_id = f.fund_uuid
    CROSS JOIN constants c
    WHERE pmn.month_end_date = c.reporting_date
),

-- Join classification (LP/GP, country, entity type) from PARTNER_DATA.
-- PARTNER_DATA is a current snapshot, but classification rarely changes.
partner_classified AS (
    SELECT
        pp.fund_uuid,
        pp.partner_id,
        pp.ending_total_nav,
        pd.is_limited_partner,
        pd.is_general_partner,
        pd.partner_country,
        pd.partner_entity_type,
        pd.total_capital_commitment_amount_current,
        -- Mutually-exclusive entity bucket (priority: most-specific first).
        CASE
            WHEN UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%PENSION%'
              OR UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%RETIREMENT%'
              OR UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%401%'
              OR UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%ERISA%'    THEN 'pension_plan'
            WHEN UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%TRUST%'
              OR UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%FOUNDATION%'
              OR UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%ENDOWMENT%' THEN 'trust_foundation'
            WHEN UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%INDIVIDUAL%'
              OR UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%NATURAL PERSON%' THEN 'individual'
            WHEN UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%FUND OF FUNDS%'
              OR UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%FUND%'      THEN 'other_fund'
            WHEN UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%LLC%'
              OR UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%CORP%'
              OR UPPER(COALESCE(pd.partner_entity_type, '')) LIKE '%INC%'        THEN 'corporate'
            ELSE 'uncategorized'
        END AS entity_bucket
    FROM partner_pit pp
    LEFT JOIN FUND_ADMIN.PARTNER_DATA pd
           ON pp.fund_uuid  = pd.fund_uuid
          AND pp.partner_id = pd.partner_id
)

SELECT
    f.fund_name,
    f.fund_uuid,

    -- Total active investors at reporting_date
    COUNT(DISTINCT CASE WHEN pc.is_limited_partner  THEN pc.partner_id END) AS lp_investors,
    COUNT(DISTINCT CASE WHEN pc.is_general_partner THEN pc.partner_id END) AS gp_investors,
    COUNT(DISTINCT pc.partner_id)                                          AS total_active_investors,

    -- US vs. Non-US investor counts
    COUNT(DISTINCT CASE WHEN pc.is_limited_partner
        AND UPPER(TRIM(pc.partner_country)) IN (
            'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
            'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
        THEN pc.partner_id END)                                            AS us_lp_investors,
    COUNT(DISTINCT CASE WHEN pc.is_limited_partner
        AND UPPER(TRIM(pc.partner_country)) NOT IN (
            'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
            'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
        AND pc.partner_country IS NOT NULL
        THEN pc.partner_id END)                                            AS non_us_lp_investors,
    COUNT(DISTINCT CASE WHEN pc.is_limited_partner
        AND pc.partner_country IS NULL
        THEN pc.partner_id END)                                            AS lp_investors_no_country_on_file,

    -- US vs. Non-US as % of known-country LP count
    ROUND(
        COUNT(DISTINCT CASE WHEN pc.is_limited_partner
            AND UPPER(TRIM(pc.partner_country)) NOT IN (
                'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
                'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
            AND pc.partner_country IS NOT NULL
            THEN pc.partner_id END)
        * 100.0
        / NULLIF(COUNT(DISTINCT CASE WHEN pc.is_limited_partner
            AND pc.partner_country IS NOT NULL
            THEN pc.partner_id END), 0),
    1)                                                                     AS pct_non_us_lp_investors,

    -- Point-in-time NAV by US vs. Non-US (Item 5.H input)
    ROUND(SUM(CASE
        WHEN pc.is_limited_partner
            AND UPPER(TRIM(pc.partner_country)) NOT IN (
                'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
                'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
            AND pc.partner_country IS NOT NULL
        THEN pc.ending_total_nav ELSE 0 END), 2)                           AS non_us_lp_nav,
    ROUND(SUM(CASE
        WHEN pc.is_limited_partner
        THEN pc.ending_total_nav ELSE 0 END), 2)                           AS total_lp_nav,
    ROUND(
        SUM(CASE
            WHEN pc.is_limited_partner
                AND UPPER(TRIM(pc.partner_country)) NOT IN (
                    'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
                    'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
                AND pc.partner_country IS NOT NULL
            THEN pc.ending_total_nav ELSE 0 END)
        * 100.0
        / NULLIF(SUM(CASE
            WHEN pc.is_limited_partner
                AND pc.partner_country IS NOT NULL
            THEN pc.ending_total_nav ELSE 0 END), 0),
    1)                                                                     AS pct_non_us_lp_nav,

    -- Mutually-exclusive entity type buckets (each LP counted once)
    COUNT(DISTINCT CASE WHEN pc.entity_bucket = 'individual'       THEN pc.partner_id END) AS individual_investors,
    COUNT(DISTINCT CASE WHEN pc.entity_bucket = 'trust_foundation' THEN pc.partner_id END) AS trust_foundation_investors,
    COUNT(DISTINCT CASE WHEN pc.entity_bucket = 'corporate'        THEN pc.partner_id END) AS corporate_investors,
    COUNT(DISTINCT CASE WHEN pc.entity_bucket = 'pension_plan'     THEN pc.partner_id END) AS pension_plan_investors,
    COUNT(DISTINCT CASE WHEN pc.entity_bucket = 'other_fund'       THEN pc.partner_id END) AS fund_investors,
    COUNT(DISTINCT CASE WHEN pc.entity_bucket = 'uncategorized'    THEN pc.partner_id END) AS uncategorized_investors,

    -- Capital commitment totals (snapshot -- committed amount does not vary point-in-time)
    ROUND(SUM(CASE WHEN pc.is_limited_partner
        THEN pc.total_capital_commitment_amount_current ELSE 0 END), 2)    AS total_lp_committed,
    ROUND(SUM(CASE WHEN pc.is_general_partner
        THEN pc.total_capital_commitment_amount_current ELSE 0 END), 2)    AS total_gp_committed,
    ROUND(SUM(pc.total_capital_commitment_amount_current), 2)              AS total_committed_all_partners,

    ROUND(
        SUM(CASE WHEN pc.is_general_partner
            THEN pc.total_capital_commitment_amount_current ELSE 0 END)
        * 100.0
        / NULLIF(SUM(pc.total_capital_commitment_amount_current), 0),
    1)                                                                     AS pct_gp_commitment

FROM funds f
LEFT JOIN partner_classified pc ON f.fund_uuid = pc.fund_uuid
GROUP BY f.fund_name, f.fund_uuid
ORDER BY f.fund_name
```

---

### Query 3 -- Firm-Level Aggregates (Distinct LP Count, US/Non-US)

Returns one row of firm-wide distinct-partner counts and NAV totals for Items 5.D and 5.H. Run after Query 1 and Query 2. The artifact generators must read these values from `firm_aggregates` in the JSON data file rather than summing per-fund counts -- same partner committed to multiple funds was being double-counted.

> Point-in-time: Same as Query 2 -- membership and NAV are pulled from `PARTNER_MONTHLY_NAV_CALCULATIONS` at `reporting_date`.
>
> Country deduplication: A partner committed to multiple funds appears once per fund in PMN. For firm-level distinct counts we collapse to one row per `partner_id` using `MAX(partner_country)` (firms generally have consistent country data per partner; if not, the value reviewed should be flagged).

```sql
WITH
constants AS (
    SELECT LAST_DAY('{reporting_date}'::DATE) AS reporting_date
),

funds AS (
    SELECT f.fund_uuid, f.firm_id
    FROM FUND_ADMIN.FUNDS f
    WHERE f.entity_type_name IN ('Fund', 'SPV')
      AND f.is_onboarding = FALSE
),

-- Collapse to one row per LP at the firm level:
--   - partner_country: MAX (deterministic single value)
--   - partner_total_nav: SUM across funds (correct -- partner's true firm-level NAV)
--
-- LEFT JOIN to PARTNER_DATA (not INNER) so a partner present in PMN at reporting_date
-- without a PARTNER_DATA row isn't silently dropped from the universe. We exclude them
-- from LP totals via COALESCE(is_limited_partner, FALSE) -- matches Query 2's structure
-- (LEFT JOIN + filter via CASE WHEN is_limited_partner). Conservative: only count rows
-- we positively know are LPs.
firm_lp_universe AS (
    SELECT
        pmn.partner_id,
        MAX(pd.partner_country)                              AS partner_country,
        SUM(pmn.ending_total_nav)                            AS partner_total_nav,  -- TODO(schema-verify): confirm column
        BOOLOR_AGG(COALESCE(pd.is_limited_partner, FALSE))   AS is_limited_partner
    FROM FUND_ADMIN.PARTNER_MONTHLY_NAV_CALCULATIONS pmn
    INNER JOIN funds f
           ON pmn.fund_id = f.fund_uuid
    LEFT JOIN FUND_ADMIN.PARTNER_DATA pd
           ON pmn.fund_id    = pd.fund_uuid
          AND pmn.partner_id = pd.partner_id
    CROSS JOIN constants c
    WHERE pmn.month_end_date = c.reporting_date
    GROUP BY pmn.partner_id
)

SELECT
    -- Distinct LP counts (dedup across funds -- the bug this fix addresses)
    COUNT(DISTINCT partner_id)                                                 AS total_lp_investors,
    COUNT(DISTINCT CASE
        WHEN UPPER(TRIM(partner_country)) IN (
            'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
            'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
        THEN partner_id END)                                                   AS us_lp_investors,
    COUNT(DISTINCT CASE
        WHEN UPPER(TRIM(partner_country)) NOT IN (
            'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
            'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
            AND partner_country IS NOT NULL
        THEN partner_id END)                                                   AS non_us_lp_investors,
    COUNT(DISTINCT CASE
        WHEN partner_country IS NULL THEN partner_id END)                      AS lp_investors_no_country_on_file,

    -- Firm-wide LP NAV (sum is correct here -- each partner appears once per fund-relationship)
    ROUND(SUM(partner_total_nav), 2)                                           AS total_lp_nav,
    ROUND(SUM(CASE
        WHEN UPPER(TRIM(partner_country)) NOT IN (
            'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
            'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
            AND partner_country IS NOT NULL
        THEN partner_total_nav ELSE 0 END), 2)                                 AS non_us_lp_nav,

    ROUND(
        COUNT(DISTINCT CASE
            WHEN UPPER(TRIM(partner_country)) NOT IN (
                'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
                'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
                AND partner_country IS NOT NULL
            THEN partner_id END)
        * 100.0
        / NULLIF(COUNT(DISTINCT CASE
            WHEN partner_country IS NOT NULL THEN partner_id END), 0),
    1)                                                                         AS pct_non_us_lp_investors,

    ROUND(
        SUM(CASE
            WHEN UPPER(TRIM(partner_country)) NOT IN (
                'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA',
                'U.S.', 'U.S.A.', 'UNITED STATES OF AMERICA (USA)')
                AND partner_country IS NOT NULL
            THEN partner_total_nav ELSE 0 END)
        * 100.0
        / NULLIF(SUM(CASE
            WHEN partner_country IS NOT NULL THEN partner_total_nav ELSE 0 END), 0),
    1)                                                                         AS pct_non_us_lp_nav

FROM firm_lp_universe
WHERE is_limited_partner  -- orphan PMN rows (no PARTNER_DATA match) and confirmed non-LPs excluded
```
