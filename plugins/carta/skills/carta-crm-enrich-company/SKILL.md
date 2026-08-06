---
name: carta-crm-enrich-company
description: >
  Researches a company by fetching its website and returning structured profile data.
  Use this skill when the user says things like "enrich this company", "look up company info",
  "research this company", "what does [domain] do", "get company details for [url]",
  "find info on [company]", or "/enrich-company".
  Input: target (domain name or website URL).
  Output: structured JSON with name, industry, tags, description, and website.
  Saves the result locally at ~/.carta-crm/enriched-companies/ for auditing.
user-invocable: false
version: 1.0.0
model: haiku
---

## Overview

Enrich a company profile by fetching its website and extracting key business information.
The result is returned as structured JSON and saved locally for auditing.

## Step 1 -- Normalize the target URL

Take the `target` input and produce a clean `https://` URL:
- If it already starts with `http://` or `https://`, use it as-is.
- If it looks like a bare domain (e.g., `acme.com`), prepend `https://`.
- Strip any trailing paths -- use only the root URL (e.g., `https://acme.com`).

Also extract the bare domain (e.g., `acme.com`) -- you'll need it for the output filename.

## Step 2 -- Fetch the company website

Use WebFetch to retrieve the homepage. Look for:
- Page `<title>` and `<meta name="description">` content
- `<h1>` / `<h2>` headings and hero/tagline text
- Any "About", "What we do", or "Our mission" sections

If the homepage returns insufficient content (e.g., a login wall, placeholder, or very sparse text),
also try fetching `[root-url]/about` as a fallback.

## Step 3 -- Supplement with web search if needed

If the website alone doesn't clearly reveal the company's industry or what it does,
run a WebSearch for:

```
"[company name]" company what does it do
```

Use the top 2-3 results to fill in gaps -- especially for `industry` and `description`.

## Step 4 -- Extract structured data

From the gathered content, produce the following fields:

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Official company name (not the domain) |
| `industry` | string | Primary industry, e.g. "FinTech", "SaaS", "Healthcare IT", "Climate Tech" |
| `tags` | array of strings | 3-6 short topic tags, e.g. `["payments", "B2B", "API", "embedded finance"]` |
| `description` | string | 1-2 sentence plain-English summary of what the company does |
| `website` | string | Canonical root URL, e.g. `https://acme.com` |

Use specific, meaningful tags -- avoid generic ones like "technology" or "software" on their own.

## Step 5 -- Save the enrichment record

Write the JSON to a local audit file:

```bash
mkdir -p ~/.carta-crm/enriched-companies
cat > ~/.carta-crm/enriched-companies/[domain].json << 'ENDJSON'
{
  "name": "...",
  "industry": "...",
  "tags": [...],
  "description": "...",
  "website": "..."
}
ENDJSON
```

Replace `[domain]` with the bare domain (e.g., `acme.com`).
Confirm the file was written with `echo $?` (should be 0).

## Step 6 -- Return the result

Return the enrichment record as a JSON block, followed by the save path:

```json
{
  "name": "...",
  "industry": "...",
  "tags": [...],
  "description": "...",
  "website": "..."
}
```

State: `Saved to ~/.carta-crm/enriched-companies/[domain].json`

## Handling multiple companies

If the user provides multiple targets, repeat Steps 1-5 for each one, then return all
results together and summarize: `Enriched N companies -- saved to ~/.carta-crm/enriched-companies/`
