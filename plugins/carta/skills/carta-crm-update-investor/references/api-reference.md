# Carta CRM Update Investor API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### PATCH /v1/investors/{id}

Partially updates an existing investor. Only fields provided in the request body are modified -- all other fields remain unchanged.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Investor identifier |

Request body (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Investor firm name |
| `fields` | object | Custom field values keyed by field name |

Common custom field keys:

| Key | Type | Description |
|-----|------|-------------|
| `website` | string | Investor website URL |
| `location` | string | Geographic location |
| `industry` | string | Industry focus |
| `about` | string | Description or notes |
| `tags` | array | List of tag strings |

Example -- update website:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/investors/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"fields": {"website": "https://sequoiacap.com"}}'
```

Example -- update name and tags:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/investors/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Sequoia Capital (US)", "fields": {"tags": ["tier-1", "series-a"]}}'
```

Response (200): Returns the full updated investor object:
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Sequoia Capital (US)",
  "fields": {
    "website": "https://sequoiacap.com",
    "location": "Menlo Park, CA",
    "industry": "Venture Capital",
    "about": "Global venture capital firm",
    "tags": ["tier-1", "series-a"]
  }
}
```

Error responses:

| Status | Meaning |
|--------|---------|
| 400 | Validation error -- invalid field keys |
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No investor found with that ID |
| 500 | Internal server error |

---

### GET /v1/investors

Use this to find an investor ID before updating. See `search-investors` skill for full details.

### GET /v1/investors/custom-fields

Use this to discover available custom field keys before updating `fields`.

```bash
curl -s "https://crm-public-api.app.carta.com/v1/investors/custom-fields" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
