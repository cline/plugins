# Carta CRM Search Companies API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### GET /v1/companies

List or search companies with pagination.

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Company name or keyword |
| `limit` | integer | Max results per request |
| `offset` | integer | Results to skip (for pagination) |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/companies?search=stripe&limit=20" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200):
```json
{
  "companies": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Stripe",
      "fields": {
        "website": "https://stripe.com",
        "location": "San Francisco, CA",
        "industry": "Fintech",
        "about": "Global payments infrastructure company",
        "tags": ["fintech", "series-a"]
      },
      "createdAt": "2026-01-15T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z"
    }
  ]
}
```

---

### GET /v1/companies/{id}

Returns a single company by its unique identifier.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Company identifier |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/companies/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200): Same shape as a single company object in the list response above.

Error responses:

| Status | Meaning |
|--------|---------|
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No company found with that ID |
| 500 | Internal server error |
