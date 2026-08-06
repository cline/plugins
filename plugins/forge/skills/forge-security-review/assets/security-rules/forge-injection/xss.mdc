---
description: Detect Cross-Site Scripting vulnerabilities in Forge Custom UI apps
globs:
alwaysApply: false
---

Context

- Forge Custom UI apps run in iframes and can be vulnerable to XSS when `unsafe-inline` is enabled in the manifest CSP and user content is rendered without sanitization.
- Related CWE: CWE-79 (Cross-Site Scripting).
- Only ~23% of Forge apps (473/2033) enable `unsafe-inline`; focus review on these.
- Reference: Internal Forge VULN Guide to XSS.

Prerequisites for XSS in Forge

1. `unsafe-inline` enabled in manifest:
```yaml
permissions:
  content:
    scripts:
      - 'unsafe-inline'
```

2. User-controlled content rendered without sanitization.

Scope & Signals

- Primary sink: `dangerouslySetInnerHTML` in React components.
- Secondary sinks: Direct DOM manipulation (`innerHTML`, `outerHTML`, `insertAdjacentHTML`).
- Sources: Data from Atlassian APIs, storage, web triggers, user input forms.
- Note: Some Atlassian API responses are already HTML-escaped (e.g., storage API).

Vulnerable Patterns

```javascript
// VULNERABLE - dangerouslySetInnerHTML with user content
function CommentDisplay({ comment }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: comment.body }} />
  );
}

// VULNERABLE - Direct HTML from API response
function RenderContent({ content }) {
  // If content comes from untrusted source
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

// VULNERABLE - String replacement doesn't sanitize
const HtmlTag = (text) => {
  let temp = `<span>${text.replaceAll('\\n', '</br>')}</span>`;
  return <div dangerouslySetInnerHTML={{ __html: temp }} />;
};

// VULNERABLE - Direct DOM manipulation
document.getElementById('output').innerHTML = userData;
```

Secure Patterns

```javascript
// SECURE - Use DOMPurify to sanitize
import DOMPurify from 'dompurify';

function SafeHtmlDisplay({ htmlContent }) {
  const sanitized = DOMPurify.sanitize(htmlContent);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// SECURE - Use React's default escaping (no dangerouslySetInnerHTML)
function CommentDisplay({ comment }) {
  return <div>{comment.body}</div>;  // React escapes by default
}

// SECURE - Use text content instead of HTML
function TextDisplay({ text }) {
  return <pre>{text}</pre>;
}

// SECURE - Allowlist-based HTML rendering
import { sanitize } from 'isomorphic-dompurify';

function RichTextDisplay({ content }) {
  const clean = sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

Detection Checklist

- [ ] Check manifest for `unsafe-inline` in `permissions.content.scripts`.
- [ ] If enabled, search for `dangerouslySetInnerHTML` usage.
- [ ] Trace the HTML content source - is it user-controlled?
- [ ] Check for DOMPurify or similar sanitization before rendering.
- [ ] Look for direct DOM manipulation (`innerHTML`, `outerHTML`).
- [ ] Review library code separately from app code (reduce false positives).

Always verify by testing - don't assume sanitization:
```javascript
// Test input
<p><script>console.log("XSS")</script></p>

// If sanitized, you'll see escaped output:
&lt;p&gt;&lt;script&gt;...
```

False Positive Indicators

- Static/constant HTML strings (not user-controlled).
- CSS-in-JS libraries (styled-components) using dangerouslySetInnerHTML for styles.
- Content from Atlassian endpoints that sanitize (verify with testing).
- Multiple-choice or enum-only user input (no free text).

Severity Assessment

| Factor | Higher Severity | Lower Severity |
|--------|-----------------|----------------|
| Content source | Direct user input | Indirect/transformed |
| Persistence | Stored XSS | Reflected XSS |
| Target | Other users | Same user only |
| Context | Admin panels | Low-privilege areas |

PoC / Test Leads

- Input: `<img src=x onerror=alert(1)>`
- Input: `<script>console.log('XSS')</script>`
- Input: `<svg onload=alert(1)>`
- Test in Jira issue fields, Confluence page content, comments, custom fields.
- Verify if XSS triggers when another user views the content.

Remediation Guidance (advisory)

- Remove `unsafe-inline` from CSP if possible.
- Use React's default escaping (avoid dangerouslySetInnerHTML).
- When HTML rendering is required, use DOMPurify with strict allowlists.
- Validate and sanitize at the point of use, not just input.
- Consider using Atlassian's UI Kit components which handle escaping.

Reporting Guidance

- Note whether `unsafe-inline` is enabled in manifest.
- Document the data flow from source to dangerouslySetInnerHTML.
- Distinguish between stored (higher severity) and reflected XSS.
- Provide PoC payload that demonstrates script execution.
- Map to CWE-79; classify as Stored/Reflected/DOM-based.

