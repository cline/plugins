# Carta CRM Search Notes API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### GET /v1/notes

List or search notes with pagination.

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Note title or keyword |
| `folderId` | string | Filter by folder ID |
| `limit` | integer | Max results per request |
| `offset` | integer | Results to skip (for pagination) |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/notes?search=investor+call&limit=20" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200):
```json
{
  "notes": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "title": "Q1 Investor Call",
      "text": "Discussed Series B timeline and product roadmap.",
      "folderId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "owner": "analyst@fund.com",
      "creationDate": "2026-04-07T10:00:00Z",
      "uid": "ext-system-id-123",
      "createdAt": "2026-04-07T10:00:00Z",
      "updatedAt": "2026-04-07T10:00:00Z"
    }
  ]
}
```

---

### GET /v1/notes/{id}

Returns a single note by its unique identifier.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Note identifier |

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/notes/64f1a2b3c4d5e6f7a8b9c0d2" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

Response (200): Same shape as a single note object in the list response above.

Error responses:

| Status | Meaning |
|--------|---------|
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No note found with that ID |
| 500 | Internal server error |
