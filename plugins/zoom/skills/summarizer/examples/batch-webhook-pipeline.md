# Batch Webhook Pipeline
Use batch mode when summarizing transcript files stored in S3.
## Submit Job
Keep real AWS keys, Zoom tokens, and webhook secrets outside chat and source control. Use short-lived credentials from a secret manager or environment-specific runtime configuration.
```bash
curl -X POST https://api.zoom.us/v2/aiservices/summarizer/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "mode": "PREFIX",
      "source": "S3",
      "uri": "s3://bucket/transcripts/",
      "filters": {
        "include_globs": ["*.vtt", "*.srt", "*.txt"]
      },
      "auth": {
        "aws": {
          "access_key_id": "<AWS_ACCESS_KEY_ID_FROM_SECRET_MANAGER>",
          "secret_access_key": "<AWS_SECRET_ACCESS_KEY_FROM_SECRET_MANAGER>",
          "session_token": "<AWS_SESSION_TOKEN_IF_USED>"
        }
      }
    },
    "output": {
      "destination": "S3",
      "uri": "s3://bucket/summaries/",
      "layout": "PREFIX",
      "auth": {
        "aws": {
          "access_key_id": "<AWS_ACCESS_KEY_ID_FROM_SECRET_MANAGER>",
          "secret_access_key": "<AWS_SECRET_ACCESS_KEY_FROM_SECRET_MANAGER>",
          "session_token": "<AWS_SESSION_TOKEN_IF_USED>"
        }
      }
    },
    "config": {
      "summary_type": "conversation",
      "task": "summary",
      "language": "en-US"
    },
    "notifications": {
      "webhook_url": "https://example.com/hooks/zoom-summarizer",
      "secret": "<WEBHOOK_SIGNING_SECRET_FROM_SECRET_MANAGER>"
    },
    "reference_id": "batch-summarization-2026-05"
  }'
```
## Monitor
Poll these endpoints or rely on webhook notifications:
- `GET /aiservices/summarizer/jobs/{jobId}`
- `GET /aiservices/summarizer/jobs/{jobId}/files`
- `GET /aiservices/summarizer/jobs/{jobId}/files/{fileId}`
## Verify Webhooks
When `notifications.secret` is set, verify:
```javascript
import crypto from 'node:crypto';
function verifyZoomAiWebhook({ rawBody, timestamp, signature, secret }) {
  const message = `v0:${timestamp}:${rawBody}`;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(message).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```
Use raw request body bytes. Verifying after JSON parsing can change the signed payload.
