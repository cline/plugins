# Carta CRM Note API Reference

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

### POST /v1/notes

Creates a new note record.

Request body:
```json
{
  "title": "Q1 Investor Call",
  "text": "Discussed Series B timeline and product roadmap.",
  "folderId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "owner": "analyst@fund.com",
  "creationDate": "2026-04-07T10:00:00Z",
  "uid": "ext-system-id-123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Display name shown in the UI (minLength: 1) |
| `text` | string | No | Note body content |
| `folderId` | string | No | MongoDB ID of the parent folder |
| `owner` | string | No | Owner email; defaults to API key owner if omitted |
| `creationDate` | date-time | No | ISO 8601 timestamp to preserve historical creation date |
| `uid` | string | No | External unique identifier from another system |

Success response (200):
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d2",
  "title": "Q1 Investor Call",
  "text": "Discussed Series B timeline and product roadmap."
}
```

Error responses:
| Status | Meaning |
|--------|---------|
| 400 | Bad request -- `title` is missing or empty |
| 401 | Unauthorized -- invalid or missing API key |
| 404 | Folder not found -- `folderId` does not exist |
| 500 | Internal server error |

---

### GET /v1/notes

List or search existing notes.

Query params: `search` (string), `folderId` (string), `limit` (number), `offset` (number)

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/notes?search=investor&limit=10" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

---

### GET /v1/notes/{id}

Retrieve a single note by ID.

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/notes/64f1a2b3c4d5e6f7a8b9c0d2" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```

---

### POST /v1/deals/{id}/notes/{noteId}

Link an existing note to a deal.

Example:
```bash
curl -s -X POST "https://crm-public-api.app.carta.com/v1/deals/<dealId>/notes/<noteId>" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
