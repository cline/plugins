---
name: duende-oauth-oidc-protocols
description: OAuth 2.0 and OpenID Connect protocol fundamentals including authorization code flow with PKCE, client credentials, refresh tokens, discovery documents, JWKS, and token introspection. Protocol-level troubleshooting and compliance.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# OAuth 2.0 & OpenID Connect Protocols

## When to Use This Skill

Use this skill when:
- Choosing the correct OAuth 2.0 grant type for a scenario
- Debugging token exchange flows or redirect-based authentication
- Understanding what claims and headers appear in identity tokens vs access tokens
- Implementing or troubleshooting PKCE (Proof Key for Code Exchange)
- Working with discovery documents, JWKS endpoints, or token introspection
- Reviewing security properties of different protocol flows
- Implementing refresh token rotation or token revocation

## Core Principles

1. OAuth 2.0 is for Authorization, OIDC is for Authentication -- OAuth alone does not tell you *who* the user is. OpenID Connect adds an identity layer (the ID token) on top of OAuth.
2. Authorization Code + PKCE is the Universal Flow -- Use it for web apps, SPAs (via BFF), native apps, and any interactive scenario. It replaced implicit flow.
3. Tokens are Opaque to Clients -- Clients should not parse access tokens. Only the resource server (API) validates access tokens. Clients use the ID token for authentication.
4. Discovery Documents are the Source of Truth -- Always resolve endpoints from `/.well-known/openid-configuration` rather than hardcoding URLs.
5. Refresh Tokens Require Secure Storage -- Refresh tokens are long-lived credentials. Rotate them on every use (`OneTimeOnly`) and store them server-side.

## Related Skills

- `duende-identityserver-configuration` -- Server-side configuration of clients, resources, and scopes
- `duende-aspnetcore-authentication` -- Implementing OIDC authentication in ASP.NET Core apps
- `duende-token-management` -- Automated token lifecycle with Duende.AccessTokenManagement
- `duende-identity-security-hardening` -- Security hardening including DPoP, PAR, and FAPI
- `duende-bff` -- Backend-for-Frontend pattern for SPAs

Docs: https://docs.duendesoftware.com/identityserver/fundamentals

---

## Concept 1: The OAuth 2.0 / OIDC Mental Model

### Roles

| Role | OAuth 2.0 Term | OIDC Term | Example |
|------|---------------|-----------|---------|
| User | Resource Owner | End-User | A person logging in |
| Browser/App | Client | Relying Party (RP) | ASP.NET Core web app |
| Token Server | Authorization Server | OpenID Provider (OP) | Duende IdentityServer |
| API | Resource Server | -- | ASP.NET Core Web API |

### Tokens

| Token | Purpose | Who Consumes It | Format |
|-------|---------|----------------|--------|
| ID Token | Proves user identity | Client application | Always JWT |
| Access Token | Authorizes API calls | Resource server (API) | JWT or reference |
| Refresh Token | Obtains new access tokens | Client application | Opaque handle |

> Critical Rule: Clients authenticate users with the ID token. Clients authorize API calls with the access token. Never use an access token to determine who a user is. Never send an ID token to an API.

---

## Concept 2: Grant Types (Flows)

### Authorization Code + PKCE (Recommended for All Interactive Scenarios)

The authorization code flow with PKCE is the recommended flow for all clients that involve a user. PKCE prevents authorization code interception attacks.

How it works:

1. Client generates a random `code_verifier` and its SHA256 hash `code_challenge`
2. Client redirects user to the authorize endpoint with `code_challenge`
3. User authenticates at IdentityServer and consents (if required)
4. IdentityServer redirects back with an authorization `code`
5. Client exchanges the `code` + `code_verifier` at the token endpoint
6. IdentityServer verifies the verifier matches the original challenge
7. IdentityServer returns ID token + access token (+ refresh token if `offline_access` scope)

Flow summary:

1. Client generates `code_verifier` and `code_challenge`.
2. Browser is redirected to `/authorize` with the `code_challenge`.
3. User authenticates and consents at IdentityServer.
4. Browser returns to the client with an authorization code.
5. Client posts the code and `code_verifier` to `/token`.
6. IdentityServer validates PKCE and returns tokens.

When to use: Web applications, native apps, SPAs (via BFF pattern).

### Client Credentials

For machine-to-machine communication with no user involvement.

Flow summary:

1. Service posts to `/token` with `grant_type=client_credentials`, client authentication, and requested scopes.
2. IdentityServer authenticates the client and validates the scopes.
3. IdentityServer returns an access token containing client claims, not user claims.

When to use: Background services, daemons, server-to-server API calls.

Key difference: No user identity -- the access token contains only client claims, not user claims.

### Refresh Token Exchange

Flow summary:

1. Client posts to `/token` with `grant_type=refresh_token` and the current refresh token.
2. IdentityServer validates the refresh token, rotation settings, and client binding.
3. IdentityServer returns a new access token and, when using one-time refresh tokens, a replacement refresh token.

> With `RefreshTokenUsage = OneTimeOnly`, each refresh returns a new refresh token. The old one is invalidated. This enables refresh token rotation, a key security measure. Note: the default changed to `ReUse` in IdentityServer v7.0 -- set `OneTimeOnly` explicitly for rotation.

### Deprecated / Discouraged Flows

| Flow | Status | Why |
|------|--------|-----|
| Implicit (`token` / `id_token`) | Deprecated | Tokens in URL fragments; no PKCE protection |
| Resource Owner Password (ROPC) | Discouraged | Client handles credentials directly; no MFA support |
| Hybrid | Replaced | Use Authorization Code + PKCE instead |

---

## Concept 3: Discovery and JWKS

### Discovery Document

Every OpenID Connect provider publishes a discovery document at `/.well-known/openid-configuration`. This JSON document advertises:

- Endpoint URLs (authorize, token, userinfo, introspection, revocation, end\_session)
- Supported grant types, scopes, claims, and response types
- Signing algorithms and JWKS URI
- Token endpoint authentication methods

```csharp
// OK Use IdentityModel to fetch discovery programmatically
using var httpClient = new HttpClient();
var disco = await httpClient.GetDiscoveryDocumentAsync("https://identity.example.com");

if (disco.IsError) throw new Exception(disco.Error);

var tokenEndpoint = disco.TokenEndpoint;
var jwksUri = disco.JwksUri;
```

> Best Practice: Never hardcode endpoint URLs. Always resolve them from the discovery document. This ensures your application adapts to URL changes and load balancer configurations.

### JWKS (JSON Web Key Set)

The JWKS endpoint (advertised via the `jwks_uri` field in the discovery document; in Duende IdentityServer this is `/.well-known/openid-configuration/jwks`) publishes the public keys used to verify token signatures. APIs and clients fetch this to validate JWTs.

Key rotation: When IdentityServer rotates signing keys, the new key appears in JWKS during the propagation period before it becomes the active signing key. Client libraries cache JWKS for 24 hours by default.

---

## Concept 4: Token Anatomy

### ID Token (JWT)

```json
{
  "iss": "https://identity.example.com",
  "sub": "818727",
  "aud": "web.app",
  "exp": 1311281970,
  "iat": 1311280970,
  "nonce": "n-0S6_WzA2Mj",
  "auth_time": 1311280969,
  "at_hash": "77QmUPtjPfzWtF2AnpK9RQ",
  "amr": ["pwd", "mfa"],
  "name": "Alice Smith",
  "email": "alice@example.com"
}
```

Key claims:
- `iss` -- Issuer (must match your IdentityServer URL)
- `sub` -- Subject (unique user identifier)
- `aud` -- Audience (must match the client ID)
- `nonce` -- Replay protection (sent in authorize request, echoed in token)
- `at_hash` -- Hash of the access token (binds the ID token to the access token)
- `amr` -- Authentication methods used

### Access Token (JWT)

```json
{
  "iss": "https://identity.example.com",
  "aud": "https://api.example.com",
  "client_id": "web.app",
  "sub": "818727",
  "scope": "openid profile api1",
  "exp": 1311284570,
  "iat": 1311280970,
  "jti": "unique-token-id"
}
```

Key claims:
- `aud` -- The API resource(s) this token is valid for
- `client_id` -- Which client requested this token
- `scope` -- Granted permissions
- `jti` -- Unique token identifier (for revocation tracking)

### Reference Tokens

Reference tokens are not self-contained JWTs. Instead, the access token is an opaque identifier. The API must call the introspection endpoint to validate it:

```
POST /connect/introspect
Content-Type: application/x-www-form-urlencoded

token=<reference_token>&token_type_hint=access_token
```

When to use reference tokens:
- Tokens contain sensitive claims you don't want exposed to intermediaries
- You need immediate token revocation (JWT lifetimes are not revocable until expiry)
- Token size is a concern (reference tokens are small opaque strings)

---

## Concept 5: Token Introspection and Revocation

### Introspection

APIs validate reference tokens by calling the introspection endpoint. The API authenticates itself with its own secret:

```csharp
// Using IdentityModel
var introspectionResponse = await httpClient.IntrospectTokenAsync(
    new TokenIntrospectionRequest
    {
        Address = disco.IntrospectionEndpoint,
        ClientId = "api1",
        ClientSecret = "api1-secret",
        Token = accessToken
    });

if (!introspectionResponse.IsActive)
{
    // Token is invalid, expired, or revoked
}
```

### Revocation

Clients can revoke access tokens and refresh tokens:

```csharp
var revocationResponse = await httpClient.RevokeTokenAsync(
    new TokenRevocationRequest
    {
        Address = disco.RevocationEndpoint,
        ClientId = "web.app",
        ClientSecret = "secret",
        Token = refreshToken,
        TokenTypeHint = "refresh_token"
    });
```

---

## Concept 6: Scopes and Claims Mapping

### Scopes Control What's in Tokens

| Scope requested | What it controls | Token affected |
|----------------|-----------------|----------------|
| `openid` | Returns `sub` claim | ID token |
| `profile` | Returns name, family\_name, etc. | ID token / userinfo |
| `email` | Returns email, email\_verified | ID token / userinfo |
| `api1` | Grants access to API | Access token |
| `offline_access` | Returns refresh token | Refresh token issued |

### Claims Destinations

By default, IdentityServer emits identity claims to the ID token and the userinfo endpoint. Claims associated with API scopes go into the access token. The `IProfileService` controls claim emission:

```csharp
public class ProfileService : IProfileService
{
    public Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        // Add claims based on the requested resources
        var claims = GetClaimsForUser(context.Subject);
        context.IssuedClaims.AddRange(
            claims.Where(c => context.RequestedClaimTypes.Contains(c.Type)));
        return Task.CompletedTask;
    }

    public Task IsActiveAsync(IsActiveContext context)
    {
        context.IsActive = true; // Check if user account is still active
        return Task.CompletedTask;
    }
}
```

---

## Concept 7: Security Extensions

### Pushed Authorization Requests (PAR)

PAR moves the authorization parameters from the query string to a backchannel POST, preventing parameter tampering and URL length issues:

```
1. Client POSTs parameters to /connect/par -> gets a request_uri
2. Client redirects user to /authorize?request_uri=...&client_id=...
```

### DPoP (Demonstrating Proof-of-Possession)

DPoP binds access tokens to a client's cryptographic key, preventing token theft and replay:

```
1. Client generates a key pair
2. Client creates a DPoP proof (signed JWT with the public key)
3. Client sends the DPoP proof in the DPoP header with the token request
4. IdentityServer binds the token to the key via a "cnf" claim
5. API verifies the DPoP proof matches the token's "cnf" claim
```

### FAPI 2.0

Financial-grade API profile requires PAR, DPoP or mTLS, and stricter validation. Duende IdentityServer supports FAPI 2.0 compliance from v7.3+.

---

## Common Pitfalls

### 1. Using Access Tokens for Authentication

```csharp
// WRONG WRONG -- Access tokens are for authorization, not authentication
var userId = accessToken.Claims.First(c => c.Type == "sub").Value;
// The access token's audience is the API, not your app

// OK CORRECT -- Use the ID token (via the authentication middleware)
var userId = User.FindFirst("sub")?.Value;
```

### 2. Parsing Access Tokens in the Client

```csharp
// WRONG WRONG -- Clients should treat access tokens as opaque
var handler = new JwtSecurityTokenHandler();
var jwt = handler.ReadJwtToken(accessToken);
// This breaks when the server switches to reference tokens

// OK CORRECT -- Only the resource server (API) validates access tokens
// The client just forwards the token in the Authorization header
httpClient.SetBearerToken(accessToken);
```

### 3. Missing PKCE

```csharp
// WRONG WRONG -- No PKCE leaves authorization code flow vulnerable
// Duende IdentityServer requires PKCE by default (RequirePkce = true)

// OK The ASP.NET Core OIDC handler sends PKCE automatically since .NET 7
// No extra configuration needed on the client side
```

### 4. Ignoring Token Expiration

```csharp
// WRONG WRONG -- Using a token without checking expiration
httpClient.SetBearerToken(cachedAccessToken); // Might be expired

// OK CORRECT -- Use Duende.AccessTokenManagement for automatic refresh
// See the `duende-token-management` skill
builder.Services.AddOpenIdConnectAccessTokenManagement();
```

### 5. Hardcoding Endpoint URLs

```csharp
// WRONG WRONG -- Breaks when server URL changes
var tokenEndpoint = "https://identity.example.com/connect/token";

// OK CORRECT -- Resolve from discovery
var disco = await httpClient.GetDiscoveryDocumentAsync(authority);
var tokenEndpoint = disco.TokenEndpoint;
```

---

## Protocol Debugging Checklist

When a token exchange fails, check these in order:

1. Discovery document -- Is `/.well-known/openid-configuration` reachable? Does it return valid JSON?
2. Client ID -- Does the client ID in the request exactly match the server registration?
3. Redirect URI -- Exact string match including scheme, host, port, path, and trailing slash
4. Scopes -- Are all requested scopes registered in `AllowedScopes` on the client?
5. Grant type -- Is the grant type in the request allowed by the client's `AllowedGrantTypes`?
6. PKCE -- Is the client sending `code_challenge` and `code_verifier`? Duende IS requires PKCE by default.
7. Client secret -- Is the secret correct? Check for encoding issues (Sha256 hash, not plaintext).
8. Clock skew -- Is the server time within acceptable bounds for token validation? (default: 5 min)
9. HTTPS -- Is the authorize redirect using HTTPS? Mixed content blocks cause silent failures.
10. CORS -- If calling the token endpoint from a browser, is the origin in `AllowedCorsOrigins`?

---

## Resources

- [OAuth 2.0 (RFC 6749)](https://tools.ietf.org/html/rfc6749)
- [OAuth 2.0 for Browser-Based Apps (RFC draft)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [JWT Access Tokens (RFC 9068)](https://datatracker.ietf.org/doc/html/rfc9068)
- [Resource Indicators (RFC 8707)](https://tools.ietf.org/html/rfc8707)
- [DPoP (RFC 9449)](https://datatracker.ietf.org/doc/html/rfc9449)
- [PAR (RFC 9126)](https://datatracker.ietf.org/doc/html/rfc9126)
- [Duende IdentityServer Specs -- Duende Docs](https://docs.duendesoftware.com/identityserver/overview/specs/)
