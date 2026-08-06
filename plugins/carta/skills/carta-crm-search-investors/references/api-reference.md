# Carta CRM Search Investors API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### GET /v1/investors

List or search investors with pagination.

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Investor name or keyword |
| `limit` | integer | Max results per request |
| `offset` | integer | Results to skip (for pagination) |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/investors?search=sequoia&limit=20" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200):
```json
{
  "investors": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Sequoia Capital",
      "fields": {
        "website": "https://sequoiacap.com",
        "location": "Menlo Park, CA",
        "industry": "Venture Capital",
        "about": "Global venture capital firm",
        "tags": ["tier-1", "series-a"]
      },
      "createdAt": "2026-01-15T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z"
    }
  ]
}
```

---

### GET /v1/investors/{id}

Returns a single investor by its unique identifier.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Investor identifier |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/investors/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200): Same shape as a single investor object in the list response above.

Error responses:

| Status | Meaning |
|--------|---------|
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No investor found with that ID |
| 500 | Internal server error |
