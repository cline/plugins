# Carta CRM Fundraising API Reference

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

### GET /v1/fundraisings/custom-fields

Returns the custom field schema configured for your tenant's fundraising records.
Use this to discover which field keys are valid before creating fundraisings.

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/fundraisings/custom-fields" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response:
```json
{
  "fields": [
    { "key": "amount", "label": "Amount", "type": "string" },
    { "key": "stage", "label": "Stage", "type": "string" },
    { "key": "status", "label": "Status", "type": "string" },
    { "key": "closeDate", "label": "Close Date", "type": "date" },
    { "key": "tags", "label": "Tags", "type": "array" }
  ]
}
```

> The actual fields returned depend on your tenant's configuration.

---

### POST /v1/fundraisings

Creates a new fundraising record.

Request body:
```json
{
  "name": "Acme Corp Series B",
  "fields": {
    "amount": "50000000",
    "stage": "Series B",
    "status": "open",
    "closeDate": "2026-06-30"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Fundraising round name |
| `fields` | object | No | Key/value map of custom fields |

Success response (200):
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Acme Corp Series B",
  "fields": {
    "amount": "50000000",
    "stage": "Series B"
  }
}
```

Error responses:

| Status | Meaning |
|--------|---------|
| 400 | Bad request -- `name` missing or invalid field keys |
| 401 | Unauthorized -- invalid or missing API key |
| 500 | Internal server error |

---

### GET /v1/fundraisings

List or search existing fundraisings.

Query params: `search` (string), `limit` (number), `offset` (number)

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/fundraisings?search=acme&limit=10" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
