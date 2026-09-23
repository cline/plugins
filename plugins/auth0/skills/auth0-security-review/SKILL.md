---
name: auth0-security-review
description: Use when reviewing Auth0 app code or tenant settings for authentication and authorization issues, callback URL mistakes, token storage risks, MFA gaps, API protection, or migration regressions.
---

# Auth0 Security Review

Use this skill for a focused review of Auth0-related code and configuration.

## Scope

Review only the requested files, diff, or tenant settings. If scope is unclear, ask for it. Prefer local code and configuration review first; ask before querying a live Auth0 tenant.

## Checklist

### Client Apps

- Authorization Code with PKCE is used for browser and native clients.
- Client secrets are not bundled into browser or native apps.
- Callback and logout URLs are exact and environment-specific.
- Tokens are not manually stored in local storage unless the project explicitly accepts that risk.
- Login and logout routes handle return URLs safely.

### Server Web Apps

- Session cookies are secure, HTTP-only, and same-site where supported.
- Client secrets are server-side only.
- Protected routes actually check the authenticated session.
- Logout clears local session state and uses the correct Auth0 logout URL.

### APIs

- APIs validate JWT signature, issuer, audience, and expiration.
- APIs do not accept ID tokens as access tokens.
- Scope and permission checks protect sensitive routes.
- Public routes are intentionally public.
- JWKS caching and error handling are handled by trusted middleware where possible.

### Tenant And Operations

- MFA and step-up requirements match sensitive actions.
- Custom domains and branding do not weaken callbacks or phishing protections.
- Roles, permissions, and organizations map to app authorization checks.
- Auth0 CLI or Management API scripts do not print secrets.

## Reporting

Lead with findings by severity. Include file and line when reviewing code, the risk, and a concrete fix. If no issues are found, state the scope and any areas not verified, such as live tenant settings or real login flows.
