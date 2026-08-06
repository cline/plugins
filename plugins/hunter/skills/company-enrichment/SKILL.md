---
name: hunter-company-enrichment
description: Retrieves Hunter company information including industry, size, location, and description from a domain name. Use when the user explicitly wants Hunter company enrichment.
user-invocable: true
argument-hint: stripe.com
---

# Company Enrichment

Get a detailed profile of any company from its domain name.

## Examples

- "stripe.com"
- `"Tell me about acme.com"`
- `"What does notion.so do?"`
- `"Company info for figma.com"`
- `"Look up HubSpot"`

## Steps

1. Parse the input. Extract the `domain`.
   - "stripe.com" -> use directly
   - "Stripe" -> infer domain as "stripe.com"
   - If the domain is inferred rather than provided, confirm it before spending Hunter enrichment credits.

2. Use the Hunter company enrichment MCP action with the domain.

3. Present the company profile:

```
# Company: Stripe (stripe.com)

| Field | Value |
|-------|-------|
| Industry | Financial Technology |
| Size | 5,000-10,000 employees |
| Founded | 2010 |
| Headquarters | San Francisco, CA |
| Type | Private |

## Description
Stripe builds economic infrastructure for the internet, enabling businesses to accept payments and manage their businesses online.

## Social Profiles
- LinkedIn: linkedin.com/company/stripe
- Twitter: @stripe

## Next Actions
1. Find contacts at stripe.com with Hunter domain search
2. Search for similar companies with Hunter discovery
3. Find a specific person's email at Stripe with Hunter email finder
4. Save this company to your Hunter leads
```

4. If the domain is unknown, respond: "No company data available for [domain]. Try checking the spelling, or use Hunter discovery to search for companies by name."

## Credit Cost

Costs 1 enrichment credit - only charged if data is found.

## Success Criteria

Company name, industry, and size returned.
