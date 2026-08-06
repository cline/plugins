# Signal Type Reference

The identifiers below are illustrative. The authoritative, current list of signal types and sub-filter values comes from `signals_company_filters` (company) and `signals_contact_filters` (contact) -- always resolve and validate against those before using a value in a request.

## Company Signals

| Signal ID | What it means | Best use case |
|-----------|--------------|---------------|
| `surgeInHiring` | Company is posting significantly more jobs than usual | Stack is expanding, budget is open |
| `surgeInHiringByDepartment` | Hiring surge in a specific department (Sales, Engineering, etc.) | Target the department being built out |
| `surgeInHiringByLocation` | Hiring surge in a specific location | Territory-based outbound |
| `headcountIncrease1m` | Headcount grew over the last month | Early growth signal |
| `headcountIncrease3m` | Headcount grew over the last 3 months | Sustained growth -- stronger signal |
| `headcountIncrease6m` | Headcount grew over the last 6 months | Established scaling motion |
| `headcountIncrease12m` | Headcount grew over the last 12 months | Long-term growth trajectory |
| `headcountDecrease1m/3m/6m/12m` | Headcount declined over the period | Churn risk signal for existing customers; also triggers restructure opportunities |
| `financialEventsNews` | Financial event reported (funding, IPO, investment) | Sub-filter by event type: `Funding Round`, `IPO`, `Strategic Investment` |
| `commercialActivityNews` | Business activity news (new customer, partnership, new location) | Sub-filter by event type: `New Customer`, `Partnership`, `New Location` |
| `productActivityNews` | Product-related news (launch, integration, development) | Sub-filter: `Product Launch`, `Product Integration`, `Product Development` |
| `peopleNews` | Executive-level people changes | Sub-filter: `Executive Hire`, `Executive Departure`, `Executive Promotion` |
| `corporateStrategyNews` | M&A, restructuring, strategic investment | Sub-filter: `M&A`, `Asset Investment`, `Asset Sale` |
| `itSpendIncrease` | IT budget or spend is growing | Strong signal for tech vendors |
| `itSpendDecrease` | IT budget declining | Risk signal for tech vendors; potential switch opportunity |
| `websiteTrafficIncrease` | Website traffic is up | Growing market presence |
| `websiteTrafficDecrease` | Website traffic is down | Potential trouble signal |
| `riskNews` | Negative news (lawsuits, security issues, facility closures) | Competitive displacement opportunity |
| `marketIntelligenceNews` | Broader market news involving the company | General awareness |

## Contact Signals

| Signal ID | What it means | Best use case |
|-----------|--------------|---------------|
| `promotion` | Contact was promoted at their current company | Reach out to congratulate; they now have more budget/authority |
| `companyChange` | Contact moved to a new company | Re-engage at their new employer; warm intro opportunity |

## Signal Freshness

Always surface the signal date in output. Signals older than 90 days should be flagged -- the trigger may no longer be relevant. The most actionable window for most signals is 0-30 days.

## Sub-Filter Application

Two distinct kinds of sub-filter exist, and they apply at different stages -- this matters for getting it right:

News-event sub-types (`newsEventTypes`, e.g. `Funding Round`, `Partnership`, `Product Launch`, `Executive Hire`) narrow the news-driven signals (`financialEventsNews`, `commercialActivityNews`, `productActivityNews`, `peopleNews`, `corporateStrategyNews`). They are not accepted by the discovery search (`prospecting_company_search.signals`). Apply them in the signal-detail step via `signals_companies_get` / `signals_companies_search` -> `filters.include.newsEventTypes`. Resolve valid values from `signals_company_filters` with `filterType: newsEventTypes`.

Hiring sub-filters (`hiringByDepartments`, `hiringByLocations`) narrow hiring-surge signals (`surgeInHiringByDepartment`, `surgeInHiringByLocation`). These apply in both places:
- discovery search -- `prospecting_company_search.signals.filterByDepartment` / `filterByLocation`
- signal detail -- `signals_companies_get` -> `filters.include.hiringByDepartments` / `hiringByLocations`

Resolve their values from `signals_company_filters` (`filterType: hiringByDepartments` / `hiringByLocations`; the latter requires a `query`).

Always apply the most specific sub-filter available -- a scoped signal (`Partnership` events only) produces far less noise than a broad one (all `commercialActivityNews`).
