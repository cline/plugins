---
name: duende-identity-security-hardening
description: Security hardening for Duende IdentityServer deployments including signing key rotation, HTTPS enforcement, CORS configuration, CSP headers, rate limiting, token lifetime tuning, and security audit patterns.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Identity Security Hardening

## When to Use This Skill

Use this skill when:
- Hardening a Duende IdentityServer deployment before promoting to production
- Configuring HTTPS, HSTS, and TLS requirements for the identity server host
- Evaluating or enforcing client secret policies (shared secrets vs. certificates vs. `private_key_jwt`)
- Setting PKCE requirements, restricting grant types, or locking down redirect URI validation
- Configuring Content Security Policy (CSP) and CORS for IdentityServer UI pages and endpoints
- Applying rate limiting to the token endpoint to protect against brute-force and enumeration attacks
- Tuning token lifetimes, enabling reference tokens, or implementing token replay detection
- Rotating signing keys or choosing between RS256 and ES256 algorithms
- Hardening session lifetimes, idle timeouts, and back-channel logout behavior
- Auditing an existing IdentityServer setup against OAuth 2.0 Security Best Current Practice (RFC 9700)

## Core Principles

1. HTTPS Everywhere -- IdentityServer must only be reachable over HTTPS in production. Any HTTP request should be permanently redirected. HSTS with `includeSubDomains` and `preload` is the minimum bar.
2. Reduce Token Blast Radius -- Short access token lifetimes, reference tokens for sensitive APIs, and audience validation ensure that a stolen token can do minimal damage.
3. PKCE is Non-Negotiable -- Every authorization code flow client must use PKCE, regardless of whether it is a public or confidential client. `RequirePkce = true` is the default; never disable it.
4. Asymmetric Client Authentication -- Prefer certificate-based or `private_key_jwt` client authentication over shared secrets. Secrets that are never transmitted cannot be stolen in transit.
5. Strict Redirect URI Matching -- Wildcards in redirect URIs are a critical attack surface. Every production URI must be fully qualified and must match exactly.
6. Restrict Grant Types Per Client -- Every client should only allow the grant types it actually uses. Disabling implicit flow and unused grants is one of the highest-impact, lowest-effort hardening steps.
7. Defense in Depth -- Combine transport security, token constraints, rate limiting, CSP, and CORS into a layered defense. No single control is sufficient.

## Related Skills

- `duende-identityserver-configuration` -- Server-side configuration of clients, resources, and signing keys that these hardening patterns build upon
- `duende-oauth-oidc-protocols` -- Protocol-level context for PKCE, PAR, DPoP, and grant type trade-offs
- `duende-aspnetcore-authentication` -- Applying OIDC authentication hardening in client applications
- `duende-aspnetcore-authorization` -- Enforcing authorization policies that consume the hardened tokens produced here

Docs: https://docs.duendesoftware.com/identityserver/configuration/security

---

## Sub-Documents

| Document | Description | When to Load |
|----------|-------------|--------------|
| [docs/cors-csp.md](docs/cors-csp.md) | CORS `ICorsPolicyService` implementation and CSP middleware with header examples | CORS origins, Content-Security-Policy, X-Frame-Options, clickjacking, custom CORS policy |
| [docs/rate-limiting.md](docs/rate-limiting.md) | ASP.NET Core `AddRateLimiter` configuration for token and authorization endpoints | Rate limiting, brute force, 429, sliding window, fixed window, token endpoint protection |
| [docs/session-hardening.md](docs/session-hardening.md) | Server-side sessions, cookie lifetime configuration, back-channel logout client setup | Session security, CookieSlidingExpiration, BackChannelLogoutUri, session fixation, inactivity |

---

## Pattern 1: Transport Security -- HTTPS, HSTS, and TLS

IdentityServer handles credentials and tokens. Every byte must travel over TLS. ASP.NET Core provides the pipeline middleware to enforce this.

```csharp
// OK Program.cs -- production pipeline ordering
var app = builder.Build();

// 1. HTTPS redirection -- permanent redirect (308) for any HTTP request
app.UseHttpsRedirection();

// 2. HSTS -- tell browsers to always use HTTPS for this host
// includeSubDomains: all subdomains also require HTTPS
// preload: opt-in to browser preload lists (requires max-age >= 1 year)
app.UseHsts();

app.UseIdentityServer();
app.UseAuthorization();
```

Configure HSTS options in `Program.cs` before `Build()`:

```csharp
// OK Strong HSTS configuration
builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = true;

    // Optionally exclude development/staging hosts
    // options.ExcludedHosts.Add("localhost");
});

// OK Force HTTPS redirect to use 443 explicitly
builder.Services.AddHttpsRedirection(options =>
{
    options.RedirectStatusCode = StatusCodes.Status308PermanentRedirect;
    options.HttpsPort = 443;
});
```

### Behind a Reverse Proxy

When IdentityServer sits behind a load balancer or reverse proxy that terminates TLS, the inner request arrives as HTTP. Configure `ForwardedHeaders` so IdentityServer sees the correct scheme:

```csharp
// OK Required when hosted behind a load balancer or ingress
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto;

    // Restrict to known proxy IPs -- never accept from any source
    options.KnownProxies.Add(IPAddress.Parse("10.0.0.1"));
    options.ForwardLimit = 1;
});

// Must be the very first middleware in the pipeline
app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseHsts();
app.UseIdentityServer();
```

> Important: Without `ForwardedHeaders`, IdentityServer publishes an `http://` issuer URI in the discovery document, causing token validation failures in every downstream API.

### Kestrel TLS Configuration

For direct Kestrel hosting (no reverse proxy), configure TLS explicitly:

```csharp
// OK Kestrel TLS -- require TLS 1.2 minimum
builder.WebHost.ConfigureKestrel(options =>
{
    options.ConfigureHttpsDefaults(https =>
    {
        https.SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13;
        https.ClientCertificateMode = ClientCertificateMode.NoCertificate;
    });
});
```

---

## Pattern 2: Signing Key Security -- Algorithm Selection and Rotation

Signing keys are the root of trust for every token IdentityServer issues. The default RS256 algorithm is broadly compatible. ES256 (ECDSA) offers smaller tokens and is appropriate for new deployments.

### Automatic Key Management (Recommended)

```csharp
// OK Production automatic key management
builder.Services.AddIdentityServer(options =>
{
    // Rotate every 90 days (default); reduce for higher-security deployments
    options.KeyManagement.RotationInterval = TimeSpan.FromDays(90);

    // Announce 14 days before activation so JWKS caches refresh
    options.KeyManagement.PropagationTime = TimeSpan.FromDays(14);

    // Keep retired keys for 14 days to validate recently-issued tokens
    options.KeyManagement.RetentionDuration = TimeSpan.FromDays(14);

    // Delete keys when their retention period ends
    options.KeyManagement.DeleteRetiredKeys = true;

    // Encrypt keys at rest via ASP.NET Core Data Protection (default: true)
    options.KeyManagement.DataProtectKeys = true;

    // Store keys in a shared, durable location for load-balanced deployments
    options.KeyManagement.KeyPath = "/var/identity/keys";

    // ES256 first = default for new tokens; RS256 for legacy client compatibility
    options.KeyManagement.SigningAlgorithms = new[]
    {
        new SigningAlgorithmOptions(SecurityAlgorithms.EcdsaSha256),
        new SigningAlgorithmOptions(SecurityAlgorithms.RsaSha256)
        {
            UseX509Certificate = true
        }
    };
});
```

### Key Storage -- ASP.NET Data Protection

Automatic key management encrypts signing keys at rest using ASP.NET Data Protection. Configure Data Protection to use durable, shared storage. See [ASP.NET Core Data Protection](https://docs.duendesoftware.com/general/data-protection/) for complete configuration guidance.

```csharp
// OK Data Protection for load-balanced IdentityServer
builder.Services.AddDataProtection()
    // Persist keys to a shared location accessible by all instances
    .PersistKeysToFileSystem(new DirectoryInfo("/var/identity/dp-keys"))
    // Or: .PersistKeysToDbContext<IdentityDbContext>()
    // Or: .PersistKeysToAzureBlobStorage(...)
    .ProtectKeysWithCertificate(LoadProtectionCertificate())
    // Always set an explicit application name
    .SetApplicationName("identity-server");
```

> Warning: Never store Data Protection keys on ephemeral storage (e.g., container local disk). If keys are lost, all encrypted data (persisted grants, cookies, server-side sessions) becomes unreadable.

### Manual Key Rotation (Three-Phase Process)

When using static keys, never swap them in a single deployment. Use a phased rotation to avoid breaking in-flight token validation:

```csharp
// Phase 1: Announce new key -- continue signing with old key
// Deploy and wait >= 24 h for JWKS caches to refresh
idsvrBuilder.AddSigningCredential(oldKey, SecurityAlgorithms.RsaSha256);
idsvrBuilder.AddValidationKey(newKey, SecurityAlgorithms.RsaSha256);

// Phase 2: Switch to new key -- retain old key for validation
// Deploy and wait >= token lifetime (default 1 h) for old tokens to expire
idsvrBuilder.AddSigningCredential(newKey, SecurityAlgorithms.RsaSha256);
idsvrBuilder.AddValidationKey(oldKey, SecurityAlgorithms.RsaSha256);

// Phase 3: Drop old key -- old tokens are all expired
idsvrBuilder.AddSigningCredential(newKey, SecurityAlgorithms.RsaSha256);
```

---

## Pattern 3: Token Constraints -- Lifetimes, Reference Tokens, and Audience Validation

Token constraints limit the damage from token compromise and ensure tokens are only usable at their intended audience.

### Token Lifetime Tuning

```csharp
// OK Production-tuned client -- short-lived access tokens, rotating refresh tokens
new Client
{
    ClientId = "web.app",
    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = true,

    // Short access token -- reduces replay window
    AccessTokenLifetime = 300,            // 5 minutes (default: 3600)

    // Identity tokens are consumed immediately after login
    IdentityTokenLifetime = 300,          // 5 minutes (default: 300)

    // Refresh tokens rotate on every use -- each use issues a new token
    AllowOfflineAccess = true,
    RefreshTokenUsage = TokenUsage.OneTimeOnly,
    RefreshTokenExpiration = TokenExpiration.Absolute,
    AbsoluteRefreshTokenLifetime = 86400, // 24 hours (default: 2592000 = 30 days)
    SlidingRefreshTokenLifetime = 3600,   // 1 hour sliding window

    // Revoke refresh tokens when the user's session ends
    CoordinateLifetimeWithUserSession = true
}
```

### Reference Tokens

Use reference tokens when:
- Tokens contain sensitive claims that must not be visible to intermediaries
- Immediate revocation is required (JWTs remain valid until expiry)
- Token size is a concern (reference tokens are short opaque handles)

```csharp
// OK Client configured for reference tokens
new Client
{
    ClientId = "internal.api.consumer",
    AllowedGrantTypes = GrantTypes.ClientCredentials,
    ClientSecrets = { new Secret("secret".Sha256()) },

    // Issue reference tokens instead of self-contained JWTs
    AccessTokenType = AccessTokenType.Reference,

    AllowedScopes = { "internal-api" }
}
```

The API must call the introspection endpoint to validate reference tokens:

```csharp
// OK API configured to validate reference tokens via introspection
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddOAuth2Introspection("introspection", options =>
    {
        options.Authority = "https://identity.example.com";
        options.ClientId = "internal-api";
        options.ClientSecret = "api-secret";
    });
```

### Audience Validation

Audience validation ensures an access token issued for one API cannot be replayed at a different API. Use `ApiResource` to set explicit `aud` claims:

```csharp
// OK Separate API resources = separate audiences
new ApiResource("catalog-api", "Product Catalog")
{
    Scopes = { "catalog.read", "catalog.write" }
},
new ApiResource("orders-api", "Order Management")
{
    Scopes = { "orders.manage" }
}
```

Validate audience on each API:

```csharp
// OK API validates its own audience
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "catalog-api"; // Must exactly match the ApiResource name
        options.TokenValidationParameters.ValidateAudience = true;
    });
```

---

## Pattern 4: PKCE Enforcement

PKCE prevents authorization code interception attacks. `RequirePkce = true` is the default in Duende IdentityServer and must never be disabled for any interactive client.

```csharp
// OK PKCE required (this is the default -- shown explicitly for clarity)
new Client
{
    ClientId = "web.app",
    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = true, // DO NOT SET TO FALSE IN PRODUCTION
    ClientSecrets = { new Secret("secret".Sha256()) },
    RedirectUris = { "https://app.example.com/signin-oidc" },
    AllowedScopes = { "openid", "profile", "api1" }
}
```

```csharp
// WRONG WRONG -- disabling PKCE for authorization code flow
new Client
{
    ClientId = "legacy.app",
    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = false, // Vulnerable to authorization code interception
}
```

For public clients (native apps, SPAs without BFF), PKCE is the *only* protection since they cannot hold a secret:

```csharp
// OK Public client -- no secret, PKCE is mandatory
new Client
{
    ClientId = "native.app",
    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = true,
    RequireClientSecret = false, // Public client -- no secret

    RedirectUris =
    {
        "com.example.app:/callback",      // Custom URI scheme for native apps
        "https://app.example.com/callback" // HTTPS redirect for web
    },
    AllowedScopes = { "openid", "profile", "api1" }
}
```

---

## Pattern 5: Client Secret Management

Client authentication quality directly determines the strength of the authorization boundary. Upgrade from shared secrets to asymmetric credentials wherever possible.

### Hierarchy of Client Authentication Strength

| Method | RFC | Strength | Secret Transmitted? |
|--------|-----|----------|---------------------|
| `client_secret_basic` | RFC 6749 | Low | Yes (over TLS) |
| `client_secret_post` | RFC 6749 | Low | Yes (in body) |
| `private_key_jwt` | RFC 7523 | High | No -- only signed assertion |
| `tls_client_auth` (mTLS) | RFC 8705 | High | No -- certificate proves identity |

### Shared Secret (Minimum Baseline -- Avoid for Sensitive Clients)

```csharp
// WRONG Avoid -- shared secrets can be extracted from config, logs, and memory
new Client
{
    ClientId = "basic.client",
    ClientSecrets = { new Secret("my-secret".Sha256()) }
}
```

Store secrets outside source control. Never hash secrets inline with literals:

```csharp
// OK Load secret value from configuration, not code
var secretValue = configuration["IdentityServer:Clients:MyClient:Secret"];
new Client
{
    ClientId = "my-client",
    ClientSecrets = { new Secret(secretValue.Sha256()) }
}
```

### Private Key JWT (Recommended)

The client holds a private key and signs a JWT assertion. IdentityServer validates the assertion using the client's registered public key. No secret is ever sent over the wire.

```csharp
// OK Register a client that authenticates with private_key_jwt
new Client
{
    ClientId = "secure.service",
    AllowedGrantTypes = GrantTypes.ClientCredentials,
    AllowedScopes = { "api1" },

    ClientSecrets =
    {
        // Register the client's public key or certificate
        new Secret
        {
            Type = IdentityServerConstants.SecretTypes.JsonWebKey,
            Value = """
            {
                "kty": "RSA",
                "use": "sig",
                "kid": "my-key-id",
                "n": "<base64url-encoded-modulus>",
                "e": "AQAB"
            }
            """
        }
    }
}
```

The client sends a signed JWT assertion at the token endpoint (using Duende.AccessTokenManagement or IdentityModel):

```csharp
// OK Client-side: authenticate with a signed assertion
var tokenRequest = new ClientCredentialsTokenRequest
{
    Address = disco.TokenEndpoint,
    ClientId = "secure.service",
    ClientAssertion = new ClientAssertion
    {
        Type = OidcConstants.ClientAssertionTypes.JwtBearer,
        Value = BuildClientAssertionJwt(clientId, tokenEndpoint, privateKey)
    },
    Scope = "api1"
};
```

### Secret Rotation

Never rotate secrets with a hard cut-over. Register the new secret alongside the old one, deploy clients, then remove the old secret:

```csharp
// OK Two active secrets during rotation window
new Client
{
    ClientId = "my-service",
    ClientSecrets =
    {
        new Secret(currentSecret.Sha256()),
        new Secret(newSecret.Sha256()) // New secret pre-registered
    }
}
// After all clients are updated: remove currentSecret
```

### Custom Secret Validation (`ISecretValidator`)

Implement `ISecretValidator` to enforce custom secret policies (e.g., key minimum length, algorithm restrictions):

```csharp
// OK Custom validator that rejects secrets shorter than 32 characters
public sealed class MinimumLengthSecretValidator : ISecretValidator
{
    public Task<SecretValidationResult> ValidateAsync(
        IEnumerable<Secret> secrets, ParsedSecret parsedSecret)
    {
        if (parsedSecret.Type != IdentityServerConstants.ParsedSecretTypes.SharedSecret)
            return Task.FromResult(new SecretValidationResult { Success = false });

        var value = parsedSecret.Credential as string;
        if (value is null || value.Length < 32)
        {
            return Task.FromResult(new SecretValidationResult
            {
                Success = false,
                Error = "Secret does not meet minimum length requirements"
            });
        }

        // Delegate to default validation
        return Task.FromResult(new SecretValidationResult { Success = true });
    }
}
```

---

## Pattern 6: Redirect URI Validation

Authorization code injection via open redirectors is one of the most critical OAuth attack vectors. Redirect URI validation must be exact-match in production.

### Strict Matching (Default Behavior)

Duende IdentityServer validates redirect URIs by exact string comparison. This is the correct behavior:

```csharp
// OK Exact URIs -- no trailing slash ambiguity, no wildcards
new Client
{
    ClientId = "web.app",
    RedirectUris =
    {
        "https://app.example.com/signin-oidc"
    },
    PostLogoutRedirectUris =
    {
        "https://app.example.com/signout-callback-oidc"
    }
}
```

```csharp
// WRONG WRONG -- wildcards allow an attacker to redirect to a malicious host
new Client
{
    RedirectUris = { "https://*.example.com/callback" } // Never do this
}
```

### Custom Redirect URI Validator

For legitimate dynamic scenarios (e.g., multi-tenant apps with per-tenant domains), implement `IRedirectUriValidator` with explicit allow-listing from a trusted data source:

```csharp
// OK Custom validator that allows tenant subdomains from a verified list
public sealed class TenantRedirectUriValidator : IRedirectUriValidator
{
    private readonly ITenantRegistry _tenants;

    public TenantRedirectUriValidator(ITenantRegistry tenants) => _tenants = tenants;

    public async Task<bool> IsRedirectUriValidAsync(string requestedUri, Client client)
    {
        // Allow standard registered URIs first
        if (client.RedirectUris.Contains(requestedUri))
            return true;

        // Allow per-tenant URIs -- always validate against a trusted data source
        var uri = new Uri(requestedUri);
        return await _tenants.IsAllowedCallbackAsync(uri);
    }

    public async Task<bool> IsPostLogoutRedirectUriValidAsync(
        string requestedUri, Client client)
    {
        if (client.PostLogoutRedirectUris.Contains(requestedUri))
            return true;

        var uri = new Uri(requestedUri);
        return await _tenants.IsAllowedCallbackAsync(uri);
    }
}
```

Register the custom validator:

```csharp
// OK Replace the default validator
builder.Services.AddTransient<IRedirectUriValidator, TenantRedirectUriValidator>();
```

---

## Pattern 7: Grant Type Restrictions

Each enabled grant type expands the attack surface. Disable every grant type a client does not use.

### Disable Implicit Flow Globally

Implicit flow is deprecated by RFC 9700. Ensure no client uses it:

```csharp
// WRONG WRONG -- implicit flow exposes tokens in browser history and referrer headers
new Client
{
    AllowedGrantTypes = GrantTypes.Implicit
}

// OK CORRECT -- use authorization code + PKCE for all interactive clients
new Client
{
    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = true
}
```

### Principle of Least Grant

```csharp
// OK Machine-to-machine service: only client_credentials
new Client
{
    ClientId = "background.worker",
    AllowedGrantTypes = GrantTypes.ClientCredentials,
    // AllowOfflineAccess = false (default) -- no refresh tokens for M2M
}

// OK Interactive web app: only authorization code
new Client
{
    ClientId = "web.app",
    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = true
}

// WRONG WRONG -- granting more than needed
new Client
{
    ClientId = "web.app",
    AllowedGrantTypes = GrantTypes.CodeAndClientCredentials // Never combine user + M2M flows
}
```

### Custom Grant Validation

For extension grants, always validate the grant assertion rigorously:

```csharp
// OK Extension grant with strict validation
public sealed class TokenExchangeGrantValidator : IExtensionGrantValidator
{
    public string GrantType => "urn:ietf:params:oauth:grant-type:token-exchange";

    public async Task ValidateAsync(ExtensionGrantValidationContext context)
    {
        var subjectToken = context.Request.Raw.Get("subject_token");
        if (string.IsNullOrWhiteSpace(subjectToken))
        {
            context.Result = new GrantValidationResult(TokenRequestErrors.InvalidRequest,
                "subject_token is required");
            return;
        }

        // Validate the subject token -- never trust without verification
        var principal = await ValidateSubjectTokenAsync(subjectToken);
        if (principal is null)
        {
            context.Result = new GrantValidationResult(TokenRequestErrors.InvalidGrant,
                "subject_token is invalid or expired");
            return;
        }

        context.Result = new GrantValidationResult(
            subject: principal.GetSubjectId(),
            authenticationMethod: GrantType);
    }
}
```

---

## Pattern 8: CORS Configuration

Set `AllowedCorsOrigins` per client with exact scheme+host+port -- no trailing slashes, no wildcards. For dynamic tenant scenarios, implement `ICorsPolicyService` with a custom repository. Never use `AllowAnyOrigin` for IdentityServer endpoints.

> See [docs/cors-csp.md](docs/cors-csp.md) for the complete `ICorsPolicyService` implementation and CORS configuration examples.

---

## Pattern 9: Content Security Policy

Add a middleware that appends `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy` headers to all IdentityServer UI paths (`/account`, `/consent`, `/connect`, `/diagnostics`). Use `frame-ancestors 'none'` and `object-src 'none'` as the minimum bar.

> See [docs/cors-csp.md](docs/cors-csp.md) for the complete CSP middleware implementation with inline examples.

---

## Pattern 10: Rate Limiting

Use `AddRateLimiter` with a sliding window policy (e.g., 20 requests/minute per IP) for `/connect/token` and a fixed window policy (e.g., 10 requests/minute) for `/connect/authorize`. Set `RejectionStatusCode = 429`. In load-balanced deployments, use `X-Forwarded-For` (after `ForwardedHeaders` middleware) for accurate IP partitioning.

> See [docs/rate-limiting.md](docs/rate-limiting.md) for the complete rate limiter configuration and route application code.

---

## Pattern 11: Session Security

Enable server-side sessions via `idsvrBuilder.AddServerSideSessions()`. Set `CookieSlidingExpiration = false` and a fixed `CookieLifetime` (e.g., 8 hours). Configure `ExpiredSessionsTriggerBackchannelLogout = true` and `CoordinateClientLifetimesWithUserSession = true`. Set `BackChannelLogoutUri` on each client for server-to-server session termination notification.

> See [docs/session-hardening.md](docs/session-hardening.md) for the complete session configuration and back-channel logout client setup.

---

## Pattern 12: Input Validation and `InputLengthRestrictions`

IdentityServer validates all incoming request parameters against configurable length limits. Tighten these to reduce injection and memory exhaustion risks.

```csharp
// OK Tightened input length restrictions
builder.Services.AddIdentityServer(options =>
{
    // Scope values -- tighten to your longest actual scope name
    options.InputLengthRestrictions.Scope = 300;         // default: 300

    // Client ID -- match your longest client ID
    options.InputLengthRestrictions.ClientId = 100;      // default: 100

    // Client secret -- limit to prevent memory abuse
    options.InputLengthRestrictions.ClientSecret = 100;  // default: 100

    // Redirect URI -- match your longest registered URI
    options.InputLengthRestrictions.RedirectUri = 400;   // default: 400

    // Nonce -- OpenID Connect replay protection
    options.InputLengthRestrictions.Nonce = 300;         // default: 300

    // Code challenge for PKCE -- use the correct min/max length properties
    // (verify exact property names against current Duende IdentityServer source,
    //  e.g. CodeChallengeMinLength / CodeChallengeMaxLength)
    options.InputLengthRestrictions.CodeChallengeMinLength = 43;  // RFC 7636 minimum
    options.InputLengthRestrictions.CodeChallengeMaxLength = 128; // RFC 7636 maximum
});
```

---

## Common Pitfalls

### 1. Disabling PKCE

```csharp
// WRONG WRONG -- authorization code interception becomes trivially exploitable
new Client { RequirePkce = false }

// OK CORRECT -- RequirePkce = true is the default; never override it to false
new Client { RequirePkce = true }
```

### 2. Wildcard Redirect URIs

```csharp
// WRONG WRONG -- open redirector: attacker steers code to their server
RedirectUris = { "https://*.example.com/*" }

// OK CORRECT -- fully qualified, exact-match URIs only
RedirectUris = { "https://app.example.com/signin-oidc" }
```

### 3. Implicit Flow Still Enabled

```csharp
// WRONG WRONG -- exposes tokens in URL fragments, browser history, referrer headers
AllowedGrantTypes = GrantTypes.Implicit

// OK CORRECT -- authorization code + PKCE replaces implicit flow entirely
AllowedGrantTypes = GrantTypes.Code
```

### 4. Accepting `ForwardedHeaders` From Any Source

```csharp
// WRONG WRONG -- attacker can spoof X-Forwarded-Proto: https from any IP
options.ForwardedHeaders = ForwardedHeaders.XForwardedProto;
// KnownProxies is empty = accepts from anywhere

// OK CORRECT -- restrict to known proxy IPs
options.KnownProxies.Add(IPAddress.Parse("10.0.0.1"));
```

### 5. Plaintext Secrets in Source Control

```csharp
// WRONG WRONG -- secret is committed to git history
ClientSecrets = { new Secret("SuperSecret123".Sha256()) }

// OK CORRECT -- load from secret store or environment variable
ClientSecrets = { new Secret(config["Services:MyClient:Secret"].Sha256()) }
```

### 6. HTTP Issuer URI

```csharp
// WRONG WRONG -- discovery document publishes http:// issuer; APIs reject all tokens
// Caused by missing ForwardedHeaders middleware behind a TLS-terminating proxy

// OK CORRECT -- configure ForwardedHeaders before UseIdentityServer()
// OR set the issuer explicitly
options.IssuerUri = "https://identity.example.com";
```

### 7. Long-Lived Access Tokens

```csharp
// WRONG WRONG -- 8-hour access token gives attackers a huge replay window
AccessTokenLifetime = 28800

// OK CORRECT -- 5-15 minutes; use refresh tokens for longer sessions
AccessTokenLifetime = 300
```

### 8. Missing Audience Validation at the API

```csharp
// WRONG WRONG -- API accepts any token from the issuer, regardless of audience
options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateAudience = false // Dangerous -- token from any client works at any API
};

// OK CORRECT -- validate the audience matches this specific API
options.Audience = "my-api";
options.TokenValidationParameters.ValidateAudience = true;
```

### 9. Shared Keys Across Environments

```csharp
// WRONG WRONG -- development signing key committed to source control and reused in production
idsvrBuilder.AddDeveloperSigningCredential(); // Development only!

// OK CORRECT -- automatic key management generates and rotates keys per-environment
// Each environment has its own isolated key material
options.KeyManagement.Enabled = true;
options.KeyManagement.DataProtectKeys = true;
```

---

## Production Security Checklist

| Area | Control | Status |
|------|---------|--------|
| Transport | HTTPS enforced with `UseHttpsRedirection()` | Required |
| Transport | HSTS with `IncludeSubDomains = true`, `MaxAge` >= 1 year | Required |
| Transport | TLS 1.2+ minimum on Kestrel | Required |
| Transport | `ForwardedHeaders` restricted to known proxy IPs | Required if behind proxy |
| Keys | Automatic key management enabled (`KeyManagement.Enabled = true`) | Required |
| Keys | `DataProtectKeys = true` + Data Protection configured with durable storage | Required |
| Keys | `PropagationTime` >= 24 h and `RetentionDuration` >= token lifetime | Required |
| Keys | ES256 or RS256 (never HS256 for asymmetric signing) | Required |
| Tokens | `AccessTokenLifetime` <= 300 s for interactive clients | Recommended |
| Tokens | `RefreshTokenUsage = OneTimeOnly` | Required |
| Tokens | Audience validation enabled at every API | Required |
| Clients | `RequirePkce = true` on every authorization code client | Required |
| Clients | No implicit flow (`GrantTypes.Implicit`) in any client | Required |
| Clients | No wildcard redirect URIs | Required |
| Clients | Secrets loaded from vault/config, not source code | Required |
| Clients | Certificate or `private_key_jwt` auth for sensitive M2M clients | Recommended |
| CORS | `AllowedCorsOrigins` set per-client; no `AllowAnyOrigin` | Required |
| CSP | `frame-ancestors 'none'` and `object-src 'none'` on UI pages | Required |
| CSP | `X-Frame-Options: DENY` on all IdentityServer pages | Required |
| Sessions | `CookieSlidingExpiration = false` | Recommended |
| Sessions | Server-side sessions enabled with back-channel logout | Recommended |
| Sessions | `CoordinateClientLifetimesWithUserSession = true` | Recommended |
| Rate Limiting | Token endpoint rate-limited per client IP | Required |
| Events | `RaiseErrorEvents`, `RaiseFailureEvents` both `true` | Required |

---

## Resources

- [Duende IdentityServer Deployment -- Duende Docs](https://docs.duendesoftware.com/identityserver/deployment/)
- [Key Management -- Duende Docs](https://docs.duendesoftware.com/identityserver/fundamentals/key-management/)
- [Client Authentication -- Duende Docs](https://docs.duendesoftware.com/identityserver/tokens/client-authentication/)
- [CORS -- Duende Docs](https://docs.duendesoftware.com/identityserver/tokens/cors/)
- [Reference Tokens -- Duende Docs](https://docs.duendesoftware.com/identityserver/tokens/reference/)
- [Server-Side Sessions -- Duende Docs](https://docs.duendesoftware.com/identityserver/ui/server-side-sessions/)
- [Pushed Authorization Requests -- Duende Docs](https://docs.duendesoftware.com/identityserver/tokens/par/)
- [IdentityServerOptions Reference -- Duende Docs](https://docs.duendesoftware.com/identityserver/reference/options/)
- [OAuth 2.0 Security Best Current Practice (RFC 9700)](https://www.rfc-editor.org/rfc/rfc9700)
- [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [JWT Client Authentication (RFC 7523)](https://datatracker.ietf.org/doc/html/rfc7523)
- [mTLS Client Authentication (RFC 8705)](https://www.rfc-editor.org/rfc/rfc8705)
- [OWASP OAuth 2.0 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth_Cheat_Sheet.html)
- [ASP.NET Core Data Protection -- Microsoft Docs](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview)
- [ASP.NET Core Rate Limiting -- Microsoft Docs](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)
