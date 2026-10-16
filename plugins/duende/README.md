# Duende

Bundle Duende IdentityServer, OAuth, OIDC, BFF, and ASP.NET Core security workflow skills as an installable Cline plugin.

## Cline Primitives

This is a skills-only package plugin. It registers no MCP servers, tools, commands, hooks, or background processes.

The bundled skill pack covers:

- ASP.NET Core authentication and authorization.
- Claims transformation and authorization.
- Duende BFF, token management, and API protection.
- IdentityServer hosting, configuration, stores, sessions, UI flows, user management, and deployment.
- Security hardening, key management, token lifecycle, token security, testing, and Aspire orchestration.
- IdentityServer4 migration and IdentityServer v7 to v8 upgrade planning.
- Enterprise features including SAML and Dynamic Client Registration.

## Install

```bash
cline plugin install duende
```

For local development from this repository:

```bash
cline plugin install ./plugins/duende --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Review this Duende IdentityServer client configuration for redirect URI, PKCE, scope, and token lifetime issues.
```

```text
Help me migrate this IdentityServer4 host to Duende while preserving issuer, signing keys, persisted grants, and client trust.
```

## Requirements

- A .NET and ASP.NET Core codebase that uses, or plans to use, Duende IdentityServer, Duende BFF, or related Duende packages.
- A valid Duende license for production usage where required by your Duende agreement.
- Current Duende and Microsoft documentation for version-specific APIs, package versions, and license edition details.
- Qualified human review before applying security-sensitive identity, token, cookie, signing key, or production deployment changes.

## Security Notes

Identity systems are security-critical. The bundled skills instruct Cline to preserve least privilege, avoid browser-exposed tokens, treat secrets as secrets, ask before mutating configuration, and validate changes in non-production environments before rollout.

## Attribution

Bundled Duende guidance is adapted from Duende Software's `duende-skills` version `0.1.0`, licensed under MIT. It is based in part on `dotnet-skills` by Aaron Stannard. See `LICENSE.duende-skills` and `NOTICE.duende-skills`.
