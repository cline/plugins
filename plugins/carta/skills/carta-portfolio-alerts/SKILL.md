---
name: carta-portfolio-alerts
description: Time-bounded and threshold-bounded risk detection across portfolio companies -- finds items that are expiring soon, maturing soon, running low, or otherwise at risk. Surfaces what needs attention now, not what the data looks like in general.
when_to_use: >-
  Use when asked which companies have an expiring item (409As, agreements,
  exercise windows), what is maturing in the next N months across the
  portfolio (convertible notes, debt instruments), which companies are
  running low on something (option pool below a threshold, runway), which
  SAFEs are approaching their valuation-cap trigger or expiring before
  conversion across the portfolio, or to run a portfolio health audit or
  red-flag scan. For raw multi-company data without a risk or
  time or threshold lens, prefer a portfolio data-query skill. For
  statistical norms across the portfolio, prefer a portfolio-benchmarks
  skill.
---

# Portfolio Alerts

Scan multiple companies for red flags and compute severity classifications (critical / warning / info).

## Prerequisites

No inputs required -- this skill loops the full portfolio. Call `list_accounts` to get all `corporation_pk` accounts automatically.

## Data Retrieval

### Portfolio Enumeration

Call `list_accounts` to get all portfolio companies. Filter to accounts where `id` starts with `corporation_pk:`. Extract up to 20 numeric corporation IDs. If more than 20 companies exist, ask the user to narrow scope.

### Per-Company Commands

For each company, these are the relevant checks:

- `call_tool({"name": "cap_table__get__409a_valuations", "arguments": {"corporation_id": corporation_id}})` -- 409A expiry check
- `call_tool({"name": "cap_table__get__cap_table_by_share_class", "arguments": {"corporation_id": corporation_id}})` -- option pool check
- `call_tool({"name": "cap_table__get__convertible_notes", "arguments": {"corporation_id": corporation_id}})` -- note maturity check (summary includes `maturity.nearest_date`)
- `call_tool({"name": "cap_table__list__safes", "arguments": {"corporation_id": corporation_id}})` -- SAFE exposure check

The gateway defaults to `detail=summary` for list commands. All four commands use summary mode -- the convertible notes summary includes a `maturity` block with `nearest_date` and `total_outstanding_debt` for outstanding debt notes.

If the user asks about a specific check only (e.g. "any expiring 409As?"), fetch only the relevant command per company.

> Parallel execution: Issue ALL fetch calls for ALL companies in a single response when the host supports parallel tool calls -- do NOT loop company-by-company. See Workflow Step 2.

## Key Fields

From 409A: `expiration_date`, `price`, `effective_date`
From cap table option plans: `available_ownership`, `name`
From convertible notes (summary): `maturity.nearest_date`, `maturity.total_outstanding_debt`, `by_status`, `by_type`

## Workflow

### Step 1 -- Get Portfolio

Call `list_accounts` to get all `corporation_pk` accounts. Extract up to 20 numeric corporation IDs.

### Step 2 -- Fetch Data for All Companies (parallel)

Issue ALL fetch calls for ALL companies in a single response -- do NOT loop company-by-company. Each fetch call is independent and will execute concurrently.

For example, with 5 companies and all 4 checks, issue all 20 fetch calls at once:

```
call_tool({"name": "cap_table__get__409a_valuations", "arguments": {"corporation_id": 1}})
call_tool({"name": "cap_table__get__cap_table_by_share_class", "arguments": {"corporation_id": 1}})
call_tool({"name": "cap_table__get__convertible_notes", "arguments": {"corporation_id": 1}})
call_tool({"name": "cap_table__list__safes", "arguments": {"corporation_id": 1}})
call_tool({"name": "cap_table__get__409a_valuations", "arguments": {"corporation_id": 2}})
call_tool({"name": "cap_table__get__cap_table_by_share_class", "arguments": {"corporation_id": 2}})
... (all companies)
```

If the user asks about a specific check only (e.g. "any expiring 409As?"), issue only the relevant command per company -- but still all companies in one response.

### Step 3 -- Classify Findings

Apply severity thresholds to the results for each company:

#### 1. Expiring 409A Valuations

| Check | Critical | Warning | Info | Rationale |
|-------|----------|---------|------|-----------|
| 409A expiry | No 409A on file, or expiration_date in the past | expiration_date within 90 days | expiration_date within 180 days | 90 days = standard board reporting cycle; 180 days = early warning for planning |

Companies with no 409A data should never be silently skipped -- always include them in the output as a distinct category.

#### 2. Low Option Pool

| Check | Critical | Warning | Info | Rationale |
|-------|----------|---------|------|-----------|
| Option pool | available_ownership < 2% | available_ownership < 5% | available_ownership < 10% | 5% is industry floor for meaningful hiring capacity; <2% is effectively exhausted |

#### 3. SAFEs/Notes Approaching Maturity

| Check | Critical | Warning | Info | Rationale |
|-------|----------|---------|------|-----------|
| Note maturity | `maturity.nearest_date` in the past | `maturity.nearest_date` within 90 days | `maturity.nearest_date` within 180 days | 90 days = typical negotiation window for extension or conversion |

Use `maturity.nearest_date` and `maturity.total_outstanding_debt` from the convertible notes summary. These fields are pre-filtered to outstanding debt notes by the backend.

#### 4. Large Unconverted SAFE Exposure

| Check | Critical | Warning | Info | Rationale |
|-------|----------|---------|------|-----------|
| SAFE exposure | -- | total outstanding SAFEs > 20% of last known valuation cap | -- | 20% = significant dilution risk at conversion |

Sum outstanding SAFE amounts per company.

### Step 4 -- Present Results

Present a summary dashboard (see Presentation section).

## Gates

Required inputs: None -- portfolio enumeration is automatic.

AI computation: Yes -- severity classifications (critical, warning, info) for 409A expiry, option pool health, note maturity, and SAFE exposure are AI-derived.
Trigger the AI computation gate (see carta-interaction-reference §6.2) before outputting any severity classifications or health assessments.

Subagent prohibition: Not applicable.

## Presentation

Format: Summary dashboard + detail table

BLUF lead: Lead with the count of companies scanned and the critical/warning/healthy breakdown.

Sort order: Severity (critical first), then urgency (nearest deadline first).

Date format: MMM d, yyyy (e.g. "Jan 15, 2026").

### Summary Dashboard

```
Portfolio Health Check -- 12 companies scanned

Critical (2):
  - Beta Inc: 409A EXPIRED (expired Jan 14, 2025, 63 days ago)
  - Gamma Corp: Option pool at 1.2% available

Warning (3):
  - Acme Corp: 409A expires in 37 days (Apr 24, 2025)
  - Delta LLC: Convertible note matures in 45 days
  - Epsilon Inc: Option pool at 4.1% available

Healthy (7): Alpha, Zeta, Eta, Theta, Iota, Kappa, Lambda
```

### Detail Table (for specific checks)

| Company | Issue | Severity | Details | Action Needed |
|---------|-------|----------|---------|---------------|
| Beta Inc | 409A Expired | Critical | Expired Jan 14, 2025 | Order new 409A |
| Acme Corp | 409A Expiring | Warning | Expires Apr 24, 2025 (37 days) | Schedule valuation |

## Caveats

- Portfolio data reflects point-in-time API calls, not a single atomic snapshot
- Companies with restricted permissions may have incomplete data
- Rate limit: maximum 20 companies per invocation -- ask the user to narrow scope if more than 20
- Some companies may error (permissions, incomplete setup) -- skip gracefully and note which failed
- Always show the scan date and count: "Scanned 12 companies on Mar 18, 2025"
