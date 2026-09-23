# Carta CRM Update Deal API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### PATCH /v1/deals/{id}

Partially updates an existing deal. Only fields provided in the request body are modified -- all other fields remain unchanged.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Deal identifier |

Request body (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| `stageId` | string | Move deal to a different stage |
| `company.name` | string | Update the associated company name |
| `company.url` | string | Update company URL -- triggers auto-enrichment |
| `comment` | string | Replace the deal comment/notes |
| `tags` | array | Replace the full tags array |
| `dealLead` | string | User ID to assign as deal lead |
| `addedAt` | date-time | ISO 8601 date the deal was added |
| `fields` | object | Custom field values keyed by field ID |
| `people.advisers` | array | Contact IDs linked as advisers |
| `people.introducer` | array | Contact IDs linked as introducers |
| `people.management` | array | Contact IDs linked as management |

Example -- move stage:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/deals/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"stageId": "64f1a2b3c4d5e6f7a8b9c0d3"}'
```

Example -- update comment and tags:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/deals/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Met founder at SaaStr", "tags": ["saas", "series-a"]}'
```

Response (200): Returns the full updated deal object:
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "company": { "name": "Stripe", "url": "https://stripe.com" },
  "comment": "Met founder at SaaStr",
  "tags": ["saas", "series-a"],
  "pipelineId": "...",
  "stageId": "64f1a2b3c4d5e6f7a8b9c0d3",
  "dealLead": "...",
  "fields": {},
  "people": { "advisers": [], "introducer": [], "management": [] }
}
```

Error responses:

| Status | Meaning |
|--------|---------|
| 400 | Validation error -- invalid field keys, stage ID, or contact IDs |
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No deal found with that ID |
| 500 | Internal server error |

---

### GET /v1/deals

Use this to find a deal ID before updating. See `search-deals` skill for full details.

### GET /v1/deals/pipelines

Use this to resolve stage/pipeline names to IDs before updating `stageId`.
