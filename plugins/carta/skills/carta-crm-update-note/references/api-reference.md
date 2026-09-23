# Carta CRM Update Note API Reference

## Authentication

All requests require an API key in the `Authorization` header (no `Bearer` prefix):

```
Authorization: <your-api-key>
```

---

## Endpoints

### PATCH /v1/notes/{id}

Partially updates an existing note. Only fields provided in the request body are modified -- all other fields remain unchanged.

Path parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Note identifier |

Request body (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Display name of the note (minLength: 1) |
| `text` | string | Note body content |
| `folderId` | string | ID of the parent folder |
| `owner` | string | Email of the note owner |

Example -- update note text:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/notes/64f1a2b3c4d5e6f7a8b9c0d2" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"text": "Updated: follow-up call scheduled for next week."}'
```

Example -- rename and move to folder:
```bash
curl -s -X PATCH "https://crm-public-api.app.carta.com/v1/notes/64f1a2b3c4d5e6f7a8b9c0d2" \
  -H "Authorization: ${LISTALPHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Q2 Investor Call", "folderId": "64f1a2b3c4d5e6f7a8b9c0d9"}'
```

Response (200): Returns the full updated note object:
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d2",
  "title": "Q2 Investor Call",
  "text": "Updated: follow-up call scheduled for next week.",
  "folderId": "64f1a2b3c4d5e6f7a8b9c0d9",
  "owner": "analyst@fund.com"
}
```

Error responses:

| Status | Meaning |
|--------|---------|
| 400 | Validation error -- title is empty, or folderId does not exist |
| 401 | Unauthorized -- invalid or missing API key |
| 404 | No note found with that ID |
| 500 | Internal server error |

---

### GET /v1/notes

Use this to find a note ID before updating. See `search-notes` skill for full details.
