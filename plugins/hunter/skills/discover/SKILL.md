---
name: hunter-discover
description: Searches Hunter for companies matching criteria like industry, size, location, and technologies. Use when the user explicitly wants Hunter company discovery or a Hunter target account list. This is a free operation that does not consume credits.
user-invocable: true
argument-hint: fintech startups in France with 50-200 employees
---

# Company Discovery

Search for companies matching any criteria. This is completely free -- no credits consumed.

## Examples

- "fintech startups in France"
- "SaaS companies using Salesforce"
- `"Find healthcare companies in Germany with 100+ employees"`
- `"Companies similar to Notion"`
- `"Series B startups in Europe"`
- `"Tech companies in San Francisco with 50-200 people"`

## Steps

1. Pass the user's query directly to the Hunter company discovery MCP action. It accepts natural language and handles parsing.

2. Present the results:

```
# Hunter Discovery: Fintech Startups in France

Found: 43 companies | Showing: 10

| Company | Domain | Industry | Size | Location |
|---------|--------|----------|------|----------|
| Qonto | qonto.com | Fintech | 150 | Paris, FR |
| Pennylane | pennylane.com | Fintech | 120 | Paris, FR |
| Swan | swan.io | Fintech | 95 | Paris, FR |
| Spendesk | spendesk.com | Fintech | 180 | Paris, FR |
| ... | ... | ... | ... | ... |

## Next Actions
1. Show more results (use offset to paginate)
2. Find contacts at one of these companies with Hunter domain search
3. Enrich a company for more details with Hunter company enrichment
4. Save companies as Hunter leads
5. Narrow the search (e.g., "only companies using React")
6. Find similar companies (e.g., "companies like Qonto")
```

3. If results are too broad (hundreds of companies), suggest narrowing: "That's a broad search. Try adding filters like industry, company size, location, or technology to narrow the results."

4. If zero results, suggest loosening criteria: "No companies found matching those exact criteria. Try broadening your search -- for example, expand the location or employee range."

5. Remind users this is free. Encourage exploration: "Hunter discovery is free -- feel free to refine your search as many times as you'd like."

## Success Criteria

At least one company returned matching the user's criteria.
