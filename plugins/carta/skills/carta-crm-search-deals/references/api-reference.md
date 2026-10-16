# Carta CRM Search Deals API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### GET /v1/deals

List or filter deals with pagination.

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Company name or keyword |
| `pipelines` | array | Filter by pipeline ID(s) -- repeat for multiple: `?pipelines=id1&pipelines=id2` |
| `stages` | array | Filter by stage ID(s) -- repeat for multiple |
| `limit` | integer | Max results per request |
| `offset` | integer | Results to skip (for pagination) |

If `pipelineId` is not specified, the default pipeline is used. To search across other pipelines, pass `pipelines` explicitly.

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/deals?search=stripe&limit=20" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200):
```json
{
  "deals": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "company": { "name": "Stripe", "url": "https://stripe.com" },
      "comment": "Warm intro from partner",
      "tags": ["fintech"],
      "creatorId": "...",
      "pipelineId": "...",
      "stageId": "...",
      "addedAt": "2026-01-15T00:00:00Z",
      "createdAt": "2026-01-15T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z",
      "dealLead": "...",
      "fields": {},
      "people": {
        "advisers": [],
        "introducer": [],
        "management": []
      }
    }
  ]
}
```

---

### GET /v1/deals/{id}

Returns a single deal by its unique identifier.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Deal identifier |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/deals/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200): Same shape as a single deal object in the list response above.

Error responses:

| Status | Meaning |
|--------|---------|
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No deal found with that ID |
| 500 | Internal server error |

---

### GET /v1/deals/pipelines

Returns all pipelines and their stages -- use this to resolve stage/pipeline names to IDs.

```bash
curl -s "https://crm-public-api.app.carta.com/v1/deals/pipelines" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
