---
description: Detect insecure wildcard patterns in Forge external permissions and remotes
globs:
alwaysApply: false
---

Context

- Wildcard patterns in `permissions.external.fetch` can expose apps to SSRF, data exfiltration, and unintended external communications. Explicit domain allowlists are required.
- Related CWE: CWE-942 (Permissive Cross-domain Policy), CWE-918 (SSRF).
- Reference: Internal VULN Guide to Insecure Wildcard Remotes.

Scope & Signals

- Manifest locations:
  - `permissions.external.fetch.backend`
  - `permissions.external.fetch.client`
  - `remotes` configuration
- Dangerous patterns:
  - `*` - Allows any domain (never acceptable)
  - `*.example.com` - Subdomain wildcard (attacker can register subdomains)
  - `*.*.example.com` - Multi-level wildcard
  - Overly broad TLDs: `*.com`, `*.io`

Vulnerable Patterns

```yaml
# CRITICAL - Allows any external domain
permissions:
  external:
    fetch:
      backend:
        - '*'

# HIGH - Subdomain wildcard exploitation
permissions:
  external:
    fetch:
      backend:
        - '*.example.com'
# Attacker registers: malicious.example.com (if possible)
# Or exploits: user-controlled.example.com subdomain

# HIGH - Multiple wildcards
permissions:
  external:
    fetch:
      backend:
        - '*.*.example.com'

# MEDIUM - Broad service wildcards
permissions:
  external:
    fetch:
      backend:
        - '*.amazonaws.com'  # Too broad - includes S3, EC2 metadata, etc.
        - '*.cloudfront.net'

# RISKY - Development/staging patterns in production
permissions:
  external:
    fetch:
      backend:
        - '*.dev.example.com'
        - 'localhost:*'
```

Secure Patterns

```yaml
# SECURE - Explicit domain allowlist
permissions:
  external:
    fetch:
      backend:
        - 'api.example.com'
        - 'auth.example.com'
        - 'webhooks.example.com'

# SECURE - Specific subdomains
permissions:
  external:
    fetch:
      backend:
        - 'api.prod.example.com'
        - 'api.eu.example.com'
        - 'api.us.example.com'

# SECURE - HTTPS only (implicit in Forge, but verify)
permissions:
  external:
    fetch:
      backend:
        - 'https://api.example.com'
```

Valid Domain Format Reference

Per Forge documentation, valid domain formats:
- `example.com` - Exact domain
- `api.example.com` - Exact subdomain
- `*.example.com` - Wildcard subdomain (use with caution)
- `example.com:8080` - With port
- Cannot use paths in domain specifications

Detection Checklist

- [ ] Parse manifest.yml for `permissions.external.fetch`.
- [ ] Flag any `*` (bare wildcard) entries.
- [ ] Flag `*.domain.com` patterns and assess subdomain control risk.
- [ ] Check for overly broad cloud provider wildcards.
- [ ] Verify all declared domains are necessary for app functionality.
- [ ] Look for development/localhost patterns.
- [ ] Review `remotes` section for similar issues.

Risk Assessment

| Pattern | Risk Level | Concern |
|---------|------------|---------|
| `*` | Critical | Unrestricted egress |
| `*.example.com` | High | Subdomain takeover/registration |
| `*.amazonaws.com` | High | Cloud metadata, internal services |
| `*.cloudflare.com` | Medium | May include untrusted user content |
| `api.example.com` | Low | Explicit, controlled |

Subdomain Takeover Considerations

```yaml
# If using wildcard, assess:
# 1. Can anyone register subdomains on this domain?
# 2. Are there dangling DNS records?
# 3. Are there user-controlled subdomain patterns?

# Example vulnerable scenario:
permissions:
  external:
    fetch:
      backend:
        - '*.github.io'  # Anyone can create [username].github.io
```

PoC / Test Leads

- Attempt requests to unintended domains within wildcard scope.
- Test subdomain patterns with attacker-controlled subdomains.
- Verify if declared but unused domains can be removed.
- Test SSRF to cloud metadata endpoints if cloud wildcards present.

Remediation Guidance (advisory)

- Replace wildcards with explicit domain lists.
- Audit all external domains for necessity.
- If subdomain wildcard required, ensure domain registrar controls all subdomains.
- Remove development/localhost patterns from production manifests.
- Implement request-time validation in addition to manifest controls.
- Consider using Forge External Auth for authenticated external services.

Reporting Guidance

- List all wildcard patterns found with their manifest location.
- Assess exploitability of each wildcard.
- Note which domains could be attacker-controlled.
- Provide explicit domain alternatives.
- Map to CWE-942, CWE-918.

