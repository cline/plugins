# Filter Resolution Guide

Resolve structured filter values before calling any search tool -- never pass raw natural-language strings where a canonical value is expected. Each `prospecting_*_filters` call resolves one filter type.

Exception: job titles are passed directly to `prospecting_contact_search` as `jobTitles` (free-form strings). They are not resolved here.

## Contact Filters (`prospecting_contact_filters`)

| Filter | type | Query param | Notes |
|--------|------|-------------|-------|
| Department | `departments` | -- | No query needed |
| Seniority | `seniority` | -- | No query needed; values are numeric seniority IDs |
| Country | `all_countries` | -- | No query needed; returns ISO-2 country codes |
| Location | `locations` | `locationSearchText` (required) | City/region; the query param is `locationSearchText`, not `q` |
| Data points | `existing_data_points` | -- | Filter to contacts that already have a given data type (e.g. email, phone) |

## Company Filters (`prospecting_company_filters`)

| Filter | type | Query param | Notes |
|--------|------|-------------|-------|
| Industry | `industries_labels` | -- | Returns main + sub industry IDs |
| Size | `sizes` | -- | Returns valid min/max employee-count ranges; custom ranges are not supported |
| Revenue | `revenues` | -- | Returns valid annual-revenue (USD) ranges |
| Intent topics | `intent_topics` | -- | Available 3rd-party buying-intent topics |
| SIC / NAICS | `sics` / `naics` | -- | Industry classification codes |
| Names | `names` | `q` (required) | Resolve specific company names |
| Location | `locations` | `q` (required) | Use `q` to narrow |
| Technologies | `technologies` | `q` (required) | Use `q` to narrow (e.g. `q: "salesforce"`) |

Query-required company types (`names`, `locations`, `technologies`) ignore the call unless `q` is set. All other company types return the full canonical list and ignore `q`.

## Intent Topics

Intent topics represent 3rd-party buying signals -- companies actively researching a topic area. Always present resolved intent topics to the user for confirmation before applying, since the returned labels may differ from the user's phrasing.

## Technology Filters

Use the `q` parameter to narrow technology lookups. E.g. `q: "salesforce"` returns Salesforce-related tech entries. Present the resolved options if multiple matches exist.
