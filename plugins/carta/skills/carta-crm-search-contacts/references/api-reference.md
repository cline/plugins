# Carta CRM Search Contacts API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### GET /v1/contacts

List or search contacts with pagination.

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Contact name, email, or keyword |
| `listId` | string | Filter by list ID |
| `limit` | integer | Max results per request |
| `offset` | integer | Results to skip (for pagination) |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/contacts?search=jane+smith&limit=20" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200):
```json
{
  "contacts": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Jane Smith",
      "firstName": "Jane",
      "lastName": "Smith",
      "emailDetail": "jane@example.com",
      "phone": "+1 415 555 0100",
      "title": "Partner",
      "company": "Acme Ventures",
      "linkedIn": "https://linkedin.com/in/janesmith",
      "tags": ["investor", "partner"],
      "notes": "Met at SaaStr 2026",
      "listId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "createdAt": "2026-01-15T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z"
    }
  ]
}
```

---

### GET /v1/contacts/{id}

Returns a single contact by its unique identifier.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Contact identifier |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/contacts/64f1a2b3c4d5e6f7a8b9c0d2" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200): Same shape as a single contact object in the list response above.

Error responses:

| Status | Meaning |
|--------|---------|
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No contact found with that ID |
| 500 | Internal server error |
