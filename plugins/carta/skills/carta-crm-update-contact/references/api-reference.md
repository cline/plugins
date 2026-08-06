# Carta CRM Update Contact API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### PATCH /v1/contacts/{id}

Partially updates an existing contact. Only fields provided in the request body are modified -- all other fields remain unchanged.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Contact identifier |

Request body (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Contact's full name |
| `firstName` | string | First name |
| `middleName` | string | Middle name |
| `lastName` | string | Last name |
| `emailDetail` | string | Primary email address |
| `emailDetailSecond` | string | Second email address |
| `emailDetailThird` | string | Third email address |
| `emailDetailFourth` | string | Fourth email address |
| `phone` | string | Primary phone number |
| `businessPhone` | string | Business phone number |
| `title` | string | Job title |
| `company` | string | Employer/company name |
| `linkedIn` | string | LinkedIn profile URL |
| `tags` | array | Replace the full tags array |
| `notes` | string | Free-text notes |

Example -- update title and company:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/contacts/64f1a2b3c4d5e6f7a8b9c0d2" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Managing Partner", "company": "Acme Ventures"}'
```

Example -- update email and tags:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/contacts/64f1a2b3c4d5e6f7a8b9c0d2" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"emailDetail": "jane.smith@acme.com", "tags": ["investor", "warm"]}'
```

Response (200): Returns the full updated contact object:
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d2",
  "name": "Jane Smith",
  "title": "Managing Partner",
  "company": "Acme Ventures",
  "emailDetail": "jane.smith@acme.com",
  "tags": ["investor", "warm"]
}
```

Error responses:

| Status | Meaning |
|--------|---------|
| 400 | Validation error -- invalid field keys |
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No contact found with that ID |
| 500 | Internal server error |

---

### GET /v1/contacts

Use this to find a contact ID before updating. See `search-contacts` skill for full details.
