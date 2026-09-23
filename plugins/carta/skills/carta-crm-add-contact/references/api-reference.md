# Carta CRM Contact API Reference

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

### POST /v1/contacts

Creates a new contact record. If `listId` is omitted, the contact is saved to
the platform's all-contacts view and can be added to a list later.

Request body:
```json
{
  "name": "Jane Smith",
  "emailDetail": "jane@example.com",
  "title": "Partner",
  "company": "Acme Ventures",
  "listId": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Contact's full name |
| `firstName` | string | No | First name |
| `middleName` | string | No | Middle name |
| `lastName` | string | No | Last name |
| `listId` | string | No | List to add the contact to (omit to save without a list) |
| `emailDetail` | string | No | Primary email address (plain string) |
| `emailDetailSecond` | string | No | Second email address |
| `emailDetailThird` | string | No | Third email address |
| `emailDetailFourth` | string | No | Fourth email address |
| `phone` | string | No | Primary phone number |
| `businessPhone` | string | No | Business phone number |
| `title` | string | No | Job title |
| `company` | string | No | Employer/company name |
| `linkedIn` | string | No | LinkedIn profile URL |
| `tags` | string[] | No | Array of string tags |
| `notes` | string | No | Free-text notes |
| `jobs` | object[] | No | Work history array |
| `dynamicInfo` | object | No | Additional dynamic metadata |

Success response (200):
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d2",
  "name": "Jane Smith",
  "listId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "ownerId": "...",
  "themes": []
}
```

Error responses:
| Status | Meaning |
|--------|---------|
| 400 | Bad request -- `name` missing or invalid field keys |
| 401 | Unauthorized -- invalid or missing API key |
| 404 | List not found -- `listId` does not exist |
| 500 | Internal server error |

---

### GET /v1/contacts

List or search existing contacts.

Query params: `search` (string), `listId` (string), `limit` (number), `offset` (number)

Example:
```bash
curl -s "https://crm-public-api.app.carta.com/v1/contacts?search=jane&limit=10" \
  -H "Authorization: ${LISTALPHA_API_KEY}"
```
