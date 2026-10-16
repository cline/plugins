# Carta CRM Company API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LISTALPHA_API_KEY` | Yes | Your Carta CRM API key |

---

## Endpoints

### GET /v1/companies/custom-fields

Returns the custom field schema configured for your tenant's company records.
Use this to discover which field keys are valid before creating companies.

Response:
```json
{
  "fields": [
    { "key": "website", "label": "Website", "type": "string" },
    { "key": "location", "label": "Location", "type": "string" },
    { "key": "industry", "label": "Industry", "type": "string" },
    { "key": "about", "label": "About", "type": "string" },
    { "key": "tags", "label": "Tags", "type": "array" }
  ]
}
```

---

### POST /v1/companies

Creates a new company record.

Request body:
```json
{
  "name": "Stripe",
  "fields": {
    "website": "https://stripe.com",
    "location": "San Francisco, CA",
    "industry": "Fintech",
    "about": "Global payments infrastructure company"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Company name |
| `fields` | object | No | Key/value map of custom fields |

Success response (200):
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Stripe",
  "fields": { "website": "https://stripe.com" },
  "files": []
}
```

Error responses:
| Status | Meaning |
|--------|---------|
| 400 | Bad request -- `name` missing or invalid field keys |
| 401 | Unauthorized -- invalid or missing API key |
| 500 | Internal server error |

---

### GET /v1/companies

List or search existing companies.

Query params: `search` (string), `limit` (number), `offset` (number)

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/companies?search=stripe&limit=10" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
