---
name: carta-crm-lookup-fund-portfolio
description: >
  Finds and returns the portfolio companies listed on a VC or investment fund's website.
  Use this skill when the user says things like "look up portfolio of [fund]",
  "get portfolio companies for [fund website]", "what companies does [fund] invest in",
  "find portfolio page for [url]", "list investments of [fund]", or "/lookup-fund-portfolio".
  Input: fund website URL or domain. Output: structured JSON list of portfolio company names.
  Saves the result locally at ~/.carta-crm/fund-portfolios/ for auditing.
user-invocable: false
version: 1.0.0
model: haiku
---

## Overview

Find and extract the portfolio company list from an investment fund's website.
The result is saved locally as a JSON file and returned to the caller.

## Step 1 -- Normalize the target URL

Take the input and produce a clean root URL:
- If it starts with `http://` or `https://`, use as-is.
- If it's a bare domain (e.g., `sequoiacap.com`), prepend `https://`.
- Strip any path -- use the root only (e.g., `https://sequoiacap.com`).

Also extract the bare domain (e.g., `sequoiacap.com`) for the output filename.

## Step 2 -- Discover the portfolio page

Try fetching these paths in order, stopping at the first one that returns meaningful company data:

1. `[root-url]/portfolio`
2. `[root-url]/companies`
3. `[root-url]/investments`
4. `[root-url]/portfolio-companies`
5. `[root-url]/our-portfolio`
6. `[root-url]/founders`

For each fetch, use this prompt: "List every company name mentioned on this page. Also return the page title so I can identify which fund this is."

If none of the above return a clear company list, fetch the homepage and look for any navigation links that suggest a portfolio or companies section. Then follow those links.

## Step 3 -- Fallback: web search

If WebFetch fails to find a usable portfolio page (e.g., JavaScript-heavy SPA, login wall, empty results), run a WebSearch:

```
[fund name] portfolio companies site:[domain]
```

Or if the fund name is unknown:

```
[domain] investment fund portfolio companies list
```

Use the search results to either find the direct portfolio URL to retry with WebFetch, or extract company names directly from search snippets.

## Step 4 -- Extract company names

From the fetched content, extract a clean list of portfolio company names:
- Include only company/startup names -- not fund names, investor names, or team members
- Remove duplicates
- Normalize capitalization (use the company's own capitalization where visible)
- Do not include descriptions, sectors, or URLs -- names only at this stage
- If the page is paginated or has "Load more", note how many companies were retrieved vs. total shown

Aim for completeness -- capture every visible company name on the page.

## Step 5 -- Save the portfolio record

Write the result to a local audit file:

```bash
mkdir -p ~/.carta-crm/fund-portfolios
cat > ~/.carta-crm/fund-portfolios/[domain].json << 'ENDJSON'
{
  "fund": "[fund name]",
  "website": "[root url]",
  "portfolio_page": "[url used to retrieve data]",
  "retrieved_at": "[today's date as YYYY-MM-DD]",
  "company_count": [N],
  "companies": [
    "Company A",
    "Company B",
    "Company C"
  ]
}
ENDJSON
```

Confirm the file was written with `echo $?` (should be 0).

## Step 6 -- Return the result

Return the full JSON record to the caller. Then summarize:

> "Found N portfolio companies for [Fund Name] from [portfolio_page]. Saved to `~/.carta-crm/fund-portfolios/[domain].json`."

If the list appears incomplete (e.g., page was paginated, or only logos were shown without text names), add a note:

> "Note: page may be incomplete -- only N companies were visible as text. The fund may have more investments not listed."
