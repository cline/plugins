# Carta CRM Update Fundraising API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### PATCH /v1/fundraisings/{id}

Partially updates an existing fundraising record. Only fields provided in the request body are modified -- all other fields remain unchanged.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Fundraising identifier |

Request body (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Fundraising round name or title |
| `fields` | object | Custom field values keyed by field name |

> Note: The available custom fields depend on the tenant's configuration. Call `GET /v1/fundraisings/custom-fields` to discover valid field keys.

Example -- update name:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/fundraisings/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp Series B (Revised)"}'
```

Example -- update custom fields:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/fundraisings/64f1a2b3c4d5e6f7a8b9c0d1" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"fields": {"status": "closed", "amount": "50000000"}}'
```

Response (200): Returns the full updated fundraising object.

Error responses:

| Status | Meaning |
|--------|---------|
| 400 | Validation error -- invalid field keys |
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No fundraising found with that ID |
| 500 | Internal server error |

---

### GET /v1/fundraisings

Use this to find a fundraising ID before updating. See `search-fundraisings` skill for full details.

### GET /v1/fundraisings/custom-fields

Use this to discover available custom field keys before updating `fields`.

```bash
curl -s "https://crm-public-api.app.carta.com/v1/fundraisings/custom-fields" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
