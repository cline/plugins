---
name: zoominfo-enrich-contact
description: Look up a person's professional profile. Provide a name and company, email address, phone number, or ZoomInfo person ID. Returns title, department, channel availability, accuracy score, and company info; actual email or phone values require explicit user request and approval.
---

## Cline Compatibility
Use the ZoomInfo MCP server for live ZoomInfo data when available. Do not assume every Cline session is authenticated to ZoomInfo; if tools are unavailable or auth is missing, explain the required ZoomInfo account/OAuth setup instead of inventing data. Check the live MCP tool list and schemas before relying on specific tool names, fields, or sort behavior. Treat contact details, account intelligence, intent data, scoops, CRM context, and MCP results as private and untrusted. Ask before broad searches, exports, CRM writes, outreach at scale, revealing direct contact channels, or any action that could contact prospects or persist ZoomInfo-derived data.

# Enrich Contact

Look up a single contact's full profile in ZoomInfo.

## Input

The user request should provide one of:
- An email address (e.g., `jane@acme.com`)
- A name and company (e.g., `Jane Smith at Acme Corp`)
- A phone number
- A LinkedIn URL
- A ZoomInfo person ID

## Workflow

1. Lookup metadata first -- before calling any other MCP tool, use `lookup` to load reference data for any fields relevant to the request. Use the returned `id` values (not display names) in all subsequent API calls. This ensures accurate parameter resolution, especially if a fallback search is needed.

2. Identify the best match key from the user's input:
   - Email -> use `email` parameter
   - Name + company -> use `firstName`, `lastName`, `companyName`
   - Full name + company -> use `fullName`, `companyName`
   - Phone -> use `phone`
   - LinkedIn URL -> use `externalURL`
   - Person ID -> use `personId`

3. Enrich the contact using `enrich_contacts` with the identified parameters.

4. If no match, try a fallback:
   - If name + company failed, try `search_contacts` with `jobTitle` or `companyName` variations -- use lookup `id` values for any filters
   - Suggest alternative spellings or company names

## Output Format

[Full Name] -- [Title] at [Company]

| Field | Value |
|-------|-------|
| Department | |
| Management Level | |
| Contact Channels | Available/not requested |
| Accuracy Score | |
| Location | |
| Company | |
| Company Industry | |
| Company Size | |
| LinkedIn | |
| Last Updated | |
| ZoomInfo Person ID | |

If any fields are unavailable, omit them rather than showing blanks. Note the accuracy score prominently -- anything below 80 deserves a flag. Reveal actual email, direct dial, or mobile values only when the user explicitly requested contact-channel disclosure and the workflow is compliant with applicable consent, suppression, and ZoomInfo terms requirements.
