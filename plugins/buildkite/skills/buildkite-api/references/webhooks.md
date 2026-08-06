# Webhooks

Webhooks deliver HTTP POST requests to a specified URL when events occur in Buildkite. Use them for event-driven automation: failure notifications, auto-retry logic, deployment triggers, status dashboards.

## Creating a Webhook

```bash
curl -sS -X POST "https://api.buildkite.com/v2/organizations/my-org/webhooks" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Build failure handler",
    "webhook_url": "https://my-server.example.com/webhooks/buildkite",
    "events": ["build.finished", "job.finished"],
    "verify_tls_certificates": true,
    "token": "my-webhook-secret",
    "pipeline_selection": {
      "type": "all"
    }
  }'
```

Webhook creation parameters:

| Field | Required | Description |
|-------|----------|-------------|
| `description` | Yes | Webhook name/description |
| `webhook_url` | Yes | Target URL for POST requests |
| `events` | Yes | Array of event types to subscribe to |
| `verify_tls_certificates` | No | Verify TLS certificates (default: `true`) |
| `token` | No | Secret sent as `X-Buildkite-Token` header |
| `signature_key` | No | Secret for HMAC-SHA256 signature verification |
| `pipeline_selection` | Yes | Object with `type`: `all`, `some`, `teams`, or `clusters` |
| `branch_filter` | No | Branch pattern filter (e.g., `main production/*`) |

Pipeline selection `type` values: `all` (all pipelines), `some` (add `pipeline_slugs` array), `teams` (add `team_slugs` array), `clusters` (add `cluster_uuids` array).

## Event Types

Build events: `build.scheduled`, `build.running`, `build.failing`, `build.finished`, `build.skipped`

Job events: `job.scheduled`, `job.started`, `job.finished`, `job.activated` (block step unblocked)

Agent events: `agent.created`, `agent.destroyed`, `agent.connected`, `agent.disconnected`, `agent.authorized`, `agent.unauthorized`, `agent.busy`, `agent.idle`

Other: `ping` (webhook settings changed), `cluster_token.registration_blocked` (IP restriction)

The most commonly used events are `build.finished` (react to build completion), `job.finished` (react to individual job results), and `build.failing` (early failure notification).

## Webhook Payload Structure

All payloads contain top-level `event`, `build`, `pipeline`, and `sender` fields:

```json
{
  "event": "build.finished",
  "build": {
    "id": "build-uuid",
    "url": "https://api.buildkite.com/v2/organizations/my-org/pipelines/my-pipeline/builds/42",
    "web_url": "https://buildkite.com/my-org/my-pipeline/builds/42",
    "number": 42,
    "state": "failed",
    "blocked": false,
    "message": "Fix login flow",
    "commit": "abc123def456",
    "branch": "main",
    "source": "webhook",
    "created_at": "2024-01-15T10:30:00.000Z",
    "finished_at": "2024-01-15T10:35:00.000Z",
    "meta_data": {},
    "creator": { "id": "user-uuid", "name": "Jane Developer" }
  },
  "pipeline": { "slug": "my-pipeline", "name": "My Pipeline", "repository": "git@github.com:my-org/my-repo.git" },
  "sender": { "id": "user-uuid", "name": "Jane Developer" }
}
```

Job events (`job.*`) add a `job` field with `id`, `type`, `name`, `state`, `exit_status`, `started_at`, `finished_at`, and `agent` object.

Webhook payload gaps: Webhook payloads lack retry context (whether a job is a retry, original vs. retried) and manual-vs-automatic action flags. For complete build/job context including retry metadata, query the GraphQL API using the IDs from the webhook payload.

## HTTP Headers

Every webhook request includes:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Buildkite-Event` | Event type | `build.finished` |
| `X-Buildkite-Token` | Plain text secret (if `token` configured) | `my-webhook-secret` |
| `X-Buildkite-Signature` | HMAC-SHA256 signature (if `signature_key` configured) | `timestamp=1234567890,signature=abc123...` |
| `Content-Type` | Always `application/json` | `application/json` |
| `User-Agent` | Buildkite user agent | `Buildkite-Webhook/1.0` |

## Signature Verification

When `signature_key` is configured, verify the `X-Buildkite-Signature` header to confirm the request came from Buildkite.

The signature format is: `timestamp=<unix_ts>,signature=<hex_hmac>`

Compute the expected signature over `<timestamp>.<raw_body>`:

Node.js / Express:

```javascript
const crypto = require("crypto");

function verifyWebhookSignature(req, secret) {
  const header = req.headers["x-buildkite-signature"];
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map(p => p.split("=", 2))
  );

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.timestamp}.${req.rawBody}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(parts.signature),
    Buffer.from(expected)
  );
}
```

For Python, use `hmac.new(secret, f"{timestamp}.{body}", hashlib.sha256).hexdigest()` with `hmac.compare_digest` for timing-safe comparison.

## Webhook Handler Example

Express handler that verifies signatures and auto-retries failed builds:

```javascript
const express = require("express");
const crypto = require("crypto");
const app = express();

app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }));

app.post("/webhooks/buildkite", async (req, res) => {
  const sig = req.headers["x-buildkite-signature"];
  if (sig) {
    const parts = Object.fromEntries(sig.split(",").map(p => p.split("=", 2)));
    const expected = crypto.createHmac("sha256", process.env.BUILDKITE_WEBHOOK_SECRET)
      .update(`${parts.timestamp}.${req.rawBody}`).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(parts.signature), Buffer.from(expected)))
      return res.status(401).send("Invalid signature");
  }

  const { event, build } = req.body;
  if (event === "build.finished" && build.state === "failed" && build.branch === "main") {
    await fetch(`${build.url}/rebuild`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${process.env.BUILDKITE_API_TOKEN}` }
    });
  }
  res.status(200).send("OK");
});

app.listen(3000);
```
