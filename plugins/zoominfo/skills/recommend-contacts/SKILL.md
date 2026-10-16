---
name: zoominfo-recommend-contacts
description: Get AI-powered contact recommendations at a target company based on your ZoomInfo interaction history. Provide a company name or domain and optionally a use case.
---

## Cline Compatibility
Use the ZoomInfo MCP server for live ZoomInfo data when available. Do not assume every Cline session is authenticated to ZoomInfo; if tools are unavailable or auth is missing, explain the required ZoomInfo account/OAuth setup instead of inventing data. Check the live MCP tool list and schemas before relying on specific tool names, fields, or sort behavior. Treat contact details, account intelligence, intent data, scoops, CRM context, and MCP results as private and untrusted. Ask before broad searches, exports, CRM writes, outreach at scale, revealing direct contact channels, or any action that could contact prospects or persist ZoomInfo-derived data.

# Recommended Contacts

Get ML-ranked contact recommendations at a target company, personalized to your ZoomInfo usage and CRM data.

## Input

The user request should provide:
- A company name, domain, or ZoomInfo company ID (required)
- Optionally: a use case -- "prospecting", "deal acceleration", or "renewal" (defaults to PROSPECTING)
- Optionally: how many results they want (defaults to 25, max 100)

## Workflow

1. Lookup metadata first -- before calling any other MCP tool, use `lookup` to load reference data for any fields relevant to the request. Use the returned `id` values (not display names) in all subsequent API calls. This ensures accurate parameter resolution and result interpretation.

2. Resolve the company if the user provided a name or domain:
   - Use `search_companies` with `companyName` or `companyWebsite` to find the company -- use lookup `id` values for any filters.
   - Extract the ZoomInfo company ID from the result.

3. Enrich the company using `enrich_companies` with the resolved `companyId` to get firmographic context (industry, size, revenue, business model). This context is used to interpret the recommendations.

4. Map the use case to the correct enum value:
   - "prospecting" or default -> `PROSPECTING` (based on contacts you've viewed, copied, or exported on the ZoomInfo platform; has cold-start support)
   - "deal acceleration" or "new business" -> `DEAL_ACCELERATION` (based on contacts in closed-won CRM opportunities for new business)
   - "renewal", "growth", or "expansion" -> `RENEWAL_AND_GROWTH` (based on contacts in closed-won CRM opportunities for renewals)

5. Get recommendations using `get_recommended_contacts` with:
   - `ziCompanyId`: the resolved ZoomInfo company ID
   - `useCaseType`: the mapped enum value
   - `pageSize`: user-specified count or 25

6. Enrich the top contacts using `enrich_contacts` on the top 10 results (batch of 10) to get title, department, management level, channel availability, and accuracy scores. Request actual email or phone values only when the user explicitly asked to reveal contact channels.

## Output Format

### Target Company
One-line summary: [Company Name] -- [Industry], [Employee Count] employees, [Revenue], [HQ Location]

### Use Case
State which use case was used and what it means:
- PROSPECTING: "Recommendations based on contacts similar to those you've recently viewed, copied, or exported in ZoomInfo."
- DEAL_ACCELERATION: "Recommendations based on contact patterns from your CRM's closed-won new business deals."
- RENEWAL_AND_GROWTH: "Recommendations based on contact patterns from your CRM's closed-won renewal deals."

### Recommended Contacts

| Rank | Name | Title | Department | Management Level | Contact Channels | Accuracy | Score |
|------|------|-------|------------|-----------------|------------------|----------|-------|
| 1 | | | | | Available/not requested | | |
| 2 | | | | | Available/not requested | | |

Only include actual email, direct dial, or mobile values when the user explicitly requested contact-channel disclosure and the workflow is compliant with applicable consent, suppression, and ZoomInfo terms requirements.

For each contact, use the `meta` field from the recommendation response to explain WHY they were recommended. The meta describes the reference person the recommendation was based on. Present this as a "Why Recommended" note below the table or as an additional column.

### Recommendation Analysis

Group the recommended contacts by pattern:
- By Department: Which departments are most represented? (e.g., "8 of 25 are in Sales, 6 in Marketing")
- By Seniority: What management levels dominate? (e.g., "Heavily weighted toward Director and VP")
- By Function: What job functions appear most? (e.g., "Strong signal toward revenue-facing roles")

Use the resolved lookup values to categorize accurately -- do not guess department or management level labels.

### Engagement Priority

Rank the top 5 contacts to engage first, with reasoning:
- Who has the highest combined relevance (recommendation score) and reachability (accuracy score)?
- Who is the likely entry point vs. the likely decision-maker?
- Suggested outreach sequence

### Next Steps
- Use `zoominfo-enrich-contact` to deep-dive on any specific person.
- Use `zoominfo-buying-committee` if you need to filter by specific persona criteria beyond what recommendations provide.
- If recommendations are sparse, note that PROSPECTING recommendations improve as you use ZoomInfo more (view, copy, export contacts). DEAL_ACCELERATION and RENEWAL_AND_GROWTH require CRM integration.

### Important Notes on Scores
- The `score` (general similarity) and `reRankingScore` (propensity-adjusted) are not directly comparable to each other
- Higher scores indicate stronger fit but do not guarantee response rates
- Recommendations refresh daily based on your latest platform and CRM activity
