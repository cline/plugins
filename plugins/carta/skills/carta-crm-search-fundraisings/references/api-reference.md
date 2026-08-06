# Carta CRM Search Fundraisings API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### GET /v1/fundraisings

List or search fundraisings with pagination.

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Company name or keyword |
| `limit` | integer | Max results per request |
| `offset` | integer | Results to skip (for pagination) |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/fundraisings?search=acme&limit=20" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200):
```json
{
  "fundraisings": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Acme Corp Series B",
      "fields": {},
      "createdAt": "2026-01-15T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z"
    }
  ]
}
```

> Note: The exact field shape for fundraising records depends on the tenant's custom field configuration. Inspect the actual API response for the full schema.

---

### GET /v1/fundraisings/{id}

Returns a single fundraising record by its unique identifier.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Fundraising identifier |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/fundraisings/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200): Same shape as a single fundraising object in the list response above.

Error responses:

| Status | Meaning |
|--------|---------|
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No fundraising found with that ID |
| 500 | Internal server error |

---

### GET /v1/fundraisings/custom-fields

Returns the custom field schema configured for your tenant's fundraising records.

```bash
curl -s "https://crm-public-api.app.carta.com/v1/fundraisings/custom-fields" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
