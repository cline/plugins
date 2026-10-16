---
description: Detect security issues in Forge web triggers including missing authentication and input validation
globs:
alwaysApply: false
---

Context

- Forge web triggers are publicly accessible URLs with no built-in authentication. Apps must implement their own authentication, replay protection, and input validation.
- Related CWE: CWE-306 (Missing Authentication for Critical Function).
- Known footgun: PBAC-832 - Webtriggers have no supported authentication mechanism.

Scope & Signals

- Manifest: `modules` with `webtrigger` type.
- Handler functions: Receive HTTP request, return HTTP response.
- Risk areas:
  - No authentication header validation.
  - No signature/HMAC verification.
  - No replay protection (timestamp/nonce).
  - Direct processing of untrusted request body.
  - Sensitive operations without auth.

Vulnerable Patterns

```javascript
// VULNERABLE - No authentication whatsoever
export async function webhookHandler(request) {
  const data = JSON.parse(request.body);
  
  // Directly processing untrusted input
  await storage.set(`data-${data.id}`, data.payload);
  
  // Triggering sensitive operations
  await notifyUsers(data.users);
  
  return { statusCode: 200 };
}

// VULNERABLE - Weak authentication (easily bypassed)
export async function webhookHandler(request) {
  const apiKey = request.headers['x-api-key'];
  
  // Hardcoded comparison (timing attack + hardcoded secret)
  if (apiKey !== 'secret-api-key-12345') {
    return { statusCode: 401 };
  }
  
  // Process request...
}

// VULNERABLE - No replay protection
export async function webhookHandler(request) {
  const signature = request.headers['x-signature'];
  
  if (verifySignature(request.body, signature)) {
    // Valid signature, but could be replayed!
    await processPayment(JSON.parse(request.body));
  }
}
```

Secure Patterns

```javascript
import crypto from 'crypto';
import { storage } from '@forge/api';

// SECURE - Full authentication with replay protection
export async function webhookHandler(request) {
  // 1. Verify signature
  const signature = request.headers['x-signature'];
  const timestamp = request.headers['x-timestamp'];
  const nonce = request.headers['x-nonce'];
  
  if (!signature || !timestamp || !nonce) {
    return { statusCode: 401, body: 'Missing auth headers' };
  }
  
  // 2. Check timestamp freshness (prevent replay)
  const requestTime = parseInt(timestamp, 10);
  const now = Date.now();
  const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
  
  if (Math.abs(now - requestTime) > MAX_AGE_MS) {
    return { statusCode: 400, body: 'Request expired' };
  }
  
  // 3. Check nonce hasn't been used (prevent replay)
  const nonceKey = `nonce:${nonce}`;
  const usedNonce = await storage.get(nonceKey);
  if (usedNonce) {
    return { statusCode: 400, body: 'Nonce already used' };
  }
  
  // 4. Verify HMAC signature
  const secret = await storage.getSecret('webhook-secret');
  const payload = `${timestamp}.${nonce}.${request.body}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  )) {
    return { statusCode: 401, body: 'Invalid signature' };
  }
  
  // 5. Store nonce to prevent replay
  await storage.set(nonceKey, { used: true }, { ttl: MAX_AGE_MS / 1000 });
  
  // 6. Validate and process request body
  const data = validateAndParse(request.body);
  await processWebhook(data);
  
  return { statusCode: 200 };
}

// Helper: Constant-time comparison
function secureCompare(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

Detection Checklist

- [ ] Identify all `webtrigger` modules in manifest.yml.
- [ ] For each handler, check for authentication header processing.
- [ ] Verify signature validation uses timing-safe comparison.
- [ ] Check for timestamp validation (freshness).
- [ ] Look for nonce/idempotency key validation.
- [ ] Assess what operations the trigger performs (sensitivity).
- [ ] Verify input validation before processing body.

Authentication Methods

| Method | Security Level | Notes |
|--------|---------------|-------|
| None | Critical risk | Never acceptable for sensitive ops |
| API Key (header) | Low | Easily leaked, no replay protection |
| HMAC Signature | Medium | Good, add timestamp |
| HMAC + Timestamp | Good | Add nonce for full protection |
| HMAC + Timestamp + Nonce | Best | Complete replay protection |

PoC / Test Leads

- Call web trigger URL without any authentication headers.
- Capture a valid signed request and replay it.
- Test with expired timestamps.
- Test with reused nonces.
- Send malformed/malicious payloads in request body.

Remediation Guidance (advisory)

- Implement HMAC signature verification for all web triggers.
- Include timestamp in signed payload; reject old requests (5-15 min window).
- Use nonces and store used nonces to prevent replay.
- Use `crypto.timingSafeEqual` for all secret comparisons.
- Store webhook secrets via `storage.setSecret()`, not hardcoded.
- Validate and sanitize all input from request body.
- Log authentication failures for monitoring.

Reporting Guidance

- Document each web trigger module and its handler.
- Describe missing authentication/validation controls.
- Assess sensitivity of operations performed.
- Provide PoC showing unauthenticated access.
- Map to CWE-306; reference PBAC-832.

