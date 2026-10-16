# Carta CRM Update Company API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### PATCH /v1/companies/{id}

Partially updates an existing company. Only fields provided in the request body are modified -- all other fields remain unchanged.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Company identifier |

Request body (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Company name |
| `fields` | object | Custom field values keyed by field name |

Common custom field keys:

| Key | Type | Description |
|-----|------|-------------|
| `website` | string | Company website URL |
| `location` | string | Geographic location |
| `industry` | string | Industry sector |
| `about` | string | Description or notes |
| `tags` | array | List of tag strings |

Example -- update website:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/companies/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"fields": {"website": "https://stripe.com"}}'
```

Example -- update name and tags:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/companies/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Stripe Inc.", "fields": {"tags": ["fintech", "payments"]}}'
```

Response (200): Returns the full updated company object:
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Stripe Inc.",
  "fields": {
    "website": "https://stripe.com",
    "location": "San Francisco, CA",
    "industry": "Fintech",
    "tags": ["fintech", "payments"]
  }
}
```

Error responses:

| Status | Meaning |
|--------|---------|
| 400 | Validation error -- invalid field keys |
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No company found with that ID |
| 500 | Internal server error |

---

### GET /v1/companies

Use this to find a company ID before updating. See `search-companies` skill for full details.

### GET /v1/companies/custom-fields

Use this to discover available custom field keys before updating `fields`.

```bash
curl -s "https://crm-public-api.app.carta.com/v1/companies/custom-fields" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
