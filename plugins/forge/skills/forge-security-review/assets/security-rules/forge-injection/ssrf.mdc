---
description: Detect SSRF vulnerabilities in Forge apps via requestJira, requestConfluence, and fetch
globs:
alwaysApply: false
---

Context

- Forge apps can make outbound HTTP requests via `requestJira`, `requestConfluence`, `fetch`, and remote backends. SSRF occurs when user input controls request destinations.
- Related CWE: CWE-918 (Server-Side Request Forgery).
- Forge-specific: The `route` template literal is designed to prevent SSRF; bypassing it is a key vulnerability.

Scope & Signals

- Safe pattern: `route` template literal with validated parameters.
- Dangerous patterns:
  - String concatenation in API routes.
  - User input in `fetch()` URLs.
  - Dynamic URL construction without validation.
  - Missing `route` usage with requestJira/requestConfluence.

Vulnerable Patterns

```javascript
// VULNERABLE - String concatenation instead of route
const issueKey = payload.issueKey;  // User controlled
await api.requestJira(`/rest/api/3/issue/${issueKey}/comment`);
// Attacker: issueKey = "../../../admin/sensitive"

// VULNERABLE - Direct URL from user input
const webhookUrl = payload.callbackUrl;  // User controlled
await fetch(webhookUrl);  // SSRF to internal services

// VULNERABLE - User controls path segment
const endpoint = payload.endpoint;  // User controlled
await api.requestJira(route`/rest/api/3/${endpoint}`);
// Less obvious but still risky if endpoint can contain ../

// VULNERABLE - User input in fetch without validation
const imageUrl = payload.avatarUrl;
const response = await fetch(imageUrl);  // Could be internal URL

// VULNERABLE - Building URL from parts
const host = payload.host;
const path = payload.path;
await fetch(`https://${host}${path}`);  // Host/path injection
```

Secure Patterns

```javascript
// SECURE - Using route template literal correctly
import { route } from '@forge/api';

const issueKey = payload.issueKey;
// Route escapes/validates the parameter
await api.requestJira(route`/rest/api/3/issue/${issueKey}/comment`);

// SECURE - Validating before use
const issueKey = payload.issueKey;
if (!/^[A-Z]+-\d+$/.test(issueKey)) {
  throw new Error('Invalid issue key format');
}
await api.requestJira(route`/rest/api/3/issue/${issueKey}`);

// SECURE - Allowlist for external URLs
const ALLOWED_HOSTS = ['api.trusted-service.com', 'webhooks.example.com'];

function validateUrl(url) {
  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error('URL not in allowlist');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('HTTPS required');
  }
  return url;
}

const webhookUrl = validateUrl(payload.callbackUrl);
await fetch(webhookUrl);

// SECURE - Using predefined endpoints only
const ENDPOINTS = {
  'issues': '/rest/api/3/issue',
  'projects': '/rest/api/3/project'
};

const endpoint = ENDPOINTS[payload.endpointName];
if (!endpoint) {
  throw new Error('Unknown endpoint');
}
await api.requestJira(route`${endpoint}`);
```

Detection Checklist

- [ ] Search for `requestJira`, `requestConfluence` without `route` template.
- [ ] Find `fetch()` calls with dynamic URLs.
- [ ] Check for string concatenation in API paths.
- [ ] Trace URL components to user input sources.
- [ ] Verify external URLs are validated against allowlist.
- [ ] Look for URL construction from multiple user inputs.

SSRF Targets in Atlassian Context

```
# Internal services attackers may target:
- Cloud metadata: http://169.254.169.254/
- Internal APIs: http://localhost:*/
- Other tenants: Different cloudId endpoints
- Admin endpoints: /rest/api/3/configuration
```

Route Template Protection

```javascript
// The route`` template literal provides protection:
import { route } from '@forge/api';

// SAFE - route encodes special characters
const userInput = "../admin";
route`/rest/api/3/issue/${userInput}`
// Results in: /rest/api/3/issue/..%2Fadmin (encoded)

// BYPASS ATTEMPT - still safe
const userInput = "TEST-1/../../admin";
route`/rest/api/3/issue/${userInput}`
// Results in properly encoded path

// NOT USING route - VULNERABLE
const path = `/rest/api/3/issue/${userInput}`;  // Path traversal works!
```

PoC / Test Leads

- Inject path traversal: `../`, `..%2F`, `..%252F`
- Test internal IPs: `127.0.0.1`, `169.254.169.254`, `[::1]`
- Test URL schemes: `file://`, `gopher://`, `dict://`
- Test DNS rebinding with attacker-controlled domain
- Verify request reaches attacker-controlled server

Remediation Guidance (advisory)

- Always use `route` template literal for Atlassian API calls.
- Validate all URL inputs against strict allowlists.
- Validate hostname, protocol (HTTPS only), and path components.
- Use URL parsing libraries; don't construct URLs via concatenation.
- Block private IP ranges, localhost, and metadata endpoints.
- Implement request timeouts and response size limits.

Reporting Guidance

- Document the vulnerable request construction.
- Show data flow from user input to request URL.
- Provide SSRF PoC (use safe internal webhook catcher).
- Assess reachability of internal services.
- Map to CWE-918; note whether route`` was bypassed or unused.

