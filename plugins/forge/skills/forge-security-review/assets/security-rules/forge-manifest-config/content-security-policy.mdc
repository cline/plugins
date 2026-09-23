---
description: Detect insecure Content Security Policy configurations in Forge app manifests
globs:
alwaysApply: false
---

Context

- Forge Custom UI apps can configure CSP via `permissions.content` in manifest.yml. Unsafe directives like `unsafe-inline` and `unsafe-eval` enable XSS attacks.
- Related CWE: CWE-16 (Configuration), CWE-79 (XSS via CSP bypass).
- Only ~23% of Forge apps enable `unsafe-inline`; these require extra scrutiny.

Scope & Signals

- Manifest location: `permissions.content.scripts`, `permissions.content.styles`.
- Dangerous directives:
  - `unsafe-inline` - Allows inline `<script>` tags (XSS vector)
  - `unsafe-eval` - Allows `eval()`, `Function()`, etc.
  - Overly broad sources: `*`, `https:`
- Note: Forge provides default CSP restrictions; apps opt out by adding these.

Vulnerable Patterns

```yaml
# HIGH RISK - Both unsafe directives
permissions:
  content:
    scripts:
      - 'unsafe-inline'
      - 'unsafe-eval'

# HIGH RISK - unsafe-inline enables XSS
permissions:
  content:
    scripts:
      - 'unsafe-inline'

# HIGH RISK - unsafe-eval enables code injection
permissions:
  content:
    scripts:
      - 'unsafe-eval'

# HIGH RISK - Wildcard script sources
permissions:
  content:
    scripts:
      - '*'
      - 'https:'

# MEDIUM RISK - Broad CDN sources
permissions:
  content:
    scripts:
      - 'https://cdn.jsdelivr.net'  # Hosts arbitrary user content
      - 'https://unpkg.com'
```

Secure Patterns

```yaml
# SECURE - Specific trusted sources only
permissions:
  content:
    scripts:
      - 'https://specific-cdn.example.com/lib.js'
    styles:
      - 'https://fonts.googleapis.com'

# SECURE - No unsafe directives (default)
permissions:
  content:
    styles:
      - 'https://fonts.googleapis.com'
# scripts section omitted = no additional script sources

# BEST - No content permissions needed
# Rely on bundled code, no external resources
```

Detection Checklist

- [ ] Parse manifest.yml `permissions.content` section.
- [ ] Flag `unsafe-inline` in scripts (enables XSS).
- [ ] Flag `unsafe-eval` in scripts (enables code injection).
- [ ] Check for wildcard or overly broad sources.
- [ ] Verify external script sources are trustworthy and necessary.
- [ ] Cross-reference with XSS findings (unsafe-inline + dangerouslySetInnerHTML).

Risk Assessment Matrix

| Directive | Risk | Enables |
|-----------|------|---------|
| `unsafe-inline` | High | XSS via inline scripts |
| `unsafe-eval` | High | Code injection via eval |
| `*` | Critical | Any external scripts |
| `https:` | High | Any HTTPS source |
| `data:` | Medium | Data URI scripts |
| Specific CDN | Medium | Depends on CDN content |

Common Justifications (Assess Validity)

```yaml
# "We need inline scripts for React"
# INVALID - React works fine without unsafe-inline
# Solution: Use bundled code, avoid inline event handlers

# "We use a charting library that requires eval"
# QUESTIONABLE - Modern libraries shouldn't require eval
# Solution: Find alternative library or update version

# "We dynamically load scripts"
# VALID USE CASE but needs scrutiny
# Solution: Use specific URLs, not wildcards
```

CDN Risk Assessment

```yaml
# HIGH RISK CDNs (host user-uploaded content)
- 'https://cdn.jsdelivr.net'   # npm packages, user controlled
- 'https://unpkg.com'          # npm packages
- 'https://cdnjs.cloudflare.com'  # Generally trusted but broad

# If CDN is needed, prefer specific paths:
permissions:
  content:
    scripts:
      # Specific version and file
      - 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js'
```

PoC / Test Leads

- If `unsafe-inline` present, check for `dangerouslySetInnerHTML` (XSS combo).
- If `unsafe-eval` present, look for code injection sinks.
- Test XSS payloads against apps with relaxed CSP.
- Verify necessity of each external source.

Remediation Guidance (advisory)

- Remove `unsafe-inline`: Bundle all JavaScript, avoid inline handlers.
- Remove `unsafe-eval`: Update libraries, avoid dynamic code execution.
- Replace wildcards with specific domains/paths.
- Audit necessity of each external source.
- Use subresource integrity (SRI) for external scripts where possible.
- If `unsafe-inline` is truly required, document the justification and ensure no XSS sinks exist.

Reporting Guidance

- Document exact CSP configuration from manifest.
- Explain what attacks each unsafe directive enables.
- Cross-reference with other findings (XSS sinks, eval usage).
- Provide specific recommendations for removal.
- Map to CWE-16; note impact on CWE-79 (XSS) exploitability.

