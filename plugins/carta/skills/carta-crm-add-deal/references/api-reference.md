# Carta CRM Deal API Reference

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

### GET /v1/deals/pipelines

Returns all pipelines and their stages configured for your tenant.

Response:
```json
{
  "pipelines": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Main Pipeline",
      "stages": [
        { "id": "64f1a2b3c4d5e6f7a8b9c0d2", "name": "Sourcing" },
        { "id": "64f1a2b3c4d5e6f7a8b9c0d3", "name": "Diligence" },
        { "id": "64f1a2b3c4d5e6f7a8b9c0d4", "name": "Closed" }
      ]
    }
  ]
}
```

---

### GET /v1/deals/custom-fields

Returns the custom field schema configured for your tenant's deal records.

Response:
```json
{
  "fields": [
    { "key": "sector", "label": "Sector", "type": "string" },
    { "key": "revenue", "label": "Revenue", "type": "number" }
  ]
}
```

---

### POST /v1/deals

Creates a new deal record.

Request body:
```json
{
  "pipelineId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "stageId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "company": {
    "name": "Stripe",
    "url": "https://stripe.com"
  },
  "comment": "Warm intro from partner",
  "tags": ["fintech", "series-b"],
  "dealLead": "<user-id>",
  "addedAt": "2026-04-07T00:00:00Z",
  "fields": {
    "sector": "Fintech"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pipelineId` | string | No | Target pipeline ID |
| `stageId` | string | No | Target stage ID within the pipeline |
| `company` | object | No | Company details (`name` and/or `url`) |
| `company.name` | string | No | Company name |
| `company.url` | string | No | Company website URL (used for auto-enrichment) |
| `comment` | string | No | Notes or comments about the deal |
| `tags` | string[] | No | Array of tag strings |
| `dealLead` | string | No | User ID to assign as deal lead |
| `addedAt` | date-time | No | ISO 8601 timestamp for when the deal was added |
| `fields` | object | No | Custom field values keyed by field ID |

Success response (200):
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d5",
  "pipelineId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "stageId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "company": { "name": "Stripe" }
}
```

Error responses:
| Status | Meaning |
|--------|---------|
| 400 | Bad request -- invalid pipeline/stage IDs or field keys |
| 401 | Unauthorized -- invalid or missing API key |
| 500 | Internal server error |

---

### GET /v1/deals

List or search existing deals.

Query params: `search` (string), `pipelineId` (string), `stageId` (string), `limit` (number), `offset` (number)

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/deals?search=stripe&limit=10" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
