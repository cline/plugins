---
name: duende-identityserver-configuration
description: Configure Duende IdentityServer including client definitions, API resources, identity resources, scopes, signing credentials, and server-side sessions. Covers client types (M2M, interactive, SPA), grant types, API Scopes vs API Resources vs Identity Resources, secret management, and client authentication methods. Includes both in-memory and database-backed configuration.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Duende IdentityServer Configuration

## When to Use This Skill

Use this skill when:
- Setting up a new Duende IdentityServer host
- Defining or modifying client registrations
- Configuring API resources, API scopes, or identity resources
- Setting up signing key management (automatic or static)
- Enabling server-side sessions
- Tuning `IdentityServerOptions` for production deployments
- Migrating from IdentityServer4 to Duende IdentityServer

## Core Principles

1. Authorization Code + PKCE by Default -- Use `GrantTypes.Code` for all interactive clients. Never use implicit flow for new applications.
2. Least Privilege Scopes -- Grant clients only the scopes they need. Avoid wildcard or overly broad scope assignments.
3. Automatic Key Management -- Prefer the built-in automatic key rotation over static key configuration in production.
4. API Resources for Audience Isolation -- Use `ApiResource` to control the `aud` claim and isolate API boundaries. Use `ApiScope` for fine-grained permission modeling within those boundaries.
5. Server-Side Sessions for Enterprise -- Enable server-side sessions when you need centralized session management, back-channel logout, or session queries.

## Related Skills

- `duende-identityserver-stores` -- EF Core persistence for configuration and operational data
- `duende-oauth-oidc-protocols` -- Protocol fundamentals that underpin these configuration choices
- `duende-identity-security-hardening` -- Production hardening of IdentityServer deployments
- `duende-token-management` -- Client-side token lifecycle with Duende.AccessTokenManagement
- `duende-aspnetcore-authentication` -- Configuring OIDC authentication in client applications

Docs: https://docs.duendesoftware.com/identityserver/configuration

---

## Sub-Documents

Load these sub-documents when the user's question specifically targets one of these areas:

| Document | Description | When to Load |
|----------|-------------|--------------|
| [docs/client-types.md](docs/client-types.md) | Grant type selection matrix, client property reference tables, client authentication methods (shared secret, private_key_jwt, mTLS), secret rollover, and CORS | private_key_jwt, mTLS, secret rotation, refresh token settings, client authentication, CORS origins |
| [docs/resources-scopes.md](docs/resources-scopes.md) | Resource type decision matrix, identity resources, API scopes (including parameterized scopes), and API resources with audience isolation | aud claim, audience isolation, parameterized scopes, EmitStaticAudienceClaim, API Resources, Identity Resources |

---

## Pattern 1: Hosting and Basic Setup

Register Duende IdentityServer in `Program.cs` with `AddIdentityServer`. All configuration flows from the `IdentityServerOptions` lambda and the builder's fluent API.

```csharp
var builder = WebApplication.CreateBuilder(args);

var idsvrBuilder = builder.Services.AddIdentityServer(options =>
{
    // Let the issuer be inferred from the request URL (recommended)
    // options.IssuerUri = "https://identity.example.com"; // Only set when behind a reverse proxy

    // Enable events for diagnostics
    options.Events.RaiseErrorEvents = true;
    options.Events.RaiseInformationEvents = true;
    options.Events.RaiseFailureEvents = true;
    options.Events.RaiseSuccessEvents = true;
})
    .AddInMemoryIdentityResources(Config.IdentityResources)
    .AddInMemoryApiScopes(Config.ApiScopes)
    .AddInMemoryClients(Config.Clients);

var app = builder.Build();
app.UseIdentityServer(); // Includes UseAuthentication()
app.UseAuthorization();
app.Run();
```

> Important: Call `UseIdentityServer()` instead of `UseAuthentication()` -- it registers both the IdentityServer middleware and the authentication middleware.

---

## Pattern 2: Client Definitions

Clients represent applications that request tokens. The three most common configurations are:

### Machine-to-Machine (Client Credentials)

For service-to-service communication with no interactive user:

```csharp
new Client
{
    ClientId = "service.worker",
    ClientName = "Background Worker Service",

    AllowedGrantTypes = GrantTypes.ClientCredentials,
    ClientSecrets = { new Secret("secret".Sha256()) },

    AllowedScopes = { "api1", "api2.read_only" }
}
```

### Interactive Web Application (Authorization Code + PKCE)

For server-rendered web apps that authenticate users and call APIs:

```csharp
new Client
{
    ClientId = "web.app",
    ClientName = "Web Application",

    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = true, // Default is true in Duende IS

    ClientSecrets = { new Secret("secret".Sha256()) },

    // Redirect URIs -- must exactly match what the client sends
    RedirectUris = { "https://app.example.com/signin-oidc" },
    PostLogoutRedirectUris = { "https://app.example.com/signout-callback-oidc" },
    FrontChannelLogoutUri = "https://app.example.com/signout-oidc",

    // Enable offline access for refresh tokens
    AllowOfflineAccess = true,

    AllowedScopes =
    {
        IdentityServerConstants.StandardScopes.OpenId,
        IdentityServerConstants.StandardScopes.Profile,
        IdentityServerConstants.StandardScopes.Email,
        "api1"
    }
}
```

### SPA with BFF Pattern

For JavaScript SPAs using the Backend-for-Frontend pattern (see `duende-bff` skill):

```csharp
new Client
{
    ClientId = "spa.bff",
    ClientName = "SPA with BFF",

    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = true,
    RequireClientSecret = true, // BFF host holds the secret

    ClientSecrets = { new Secret("secret".Sha256()) },

    RedirectUris = { "https://app.example.com/signin-oidc" },
    PostLogoutRedirectUris = { "https://app.example.com/signout-callback-oidc" },
    BackChannelLogoutUri = "https://app.example.com/bff/backchannel",

    AllowOfflineAccess = true,

    AllowedScopes =
    {
        IdentityServerConstants.StandardScopes.OpenId,
        IdentityServerConstants.StandardScopes.Profile,
        "api1"
    }
}
```

### Key Client Properties

| Property | Purpose | Default |
|----------|---------|---------|
| `RequirePkce` | Enforce PKCE for authorization code flow | `true` |
| `AllowOfflineAccess` | Enable refresh token issuance | `false` |
| `AccessTokenLifetime` | Access token duration in seconds | `3600` (1 hour) |
| `IdentityTokenLifetime` | Identity token duration in seconds | `300` (5 min) |
| `RefreshTokenUsage` | `ReUse` or `OneTimeOnly` | `ReUse` (recommend `OneTimeOnly` for security) |
| `RefreshTokenExpiration` | `Absolute` or `Sliding` | `Absolute` |
| `AbsoluteRefreshTokenLifetime` | Max refresh token lifetime in seconds | `2592000` (30 days) |
| `AllowedCorsOrigins` | CORS origins for token endpoint calls | empty |
| `RequireConsent` | Show consent screen | `false` |
| `CoordinateLifetimeWithUserSession` | Tie token lifetimes to user session | `false` |

### Defining Clients in appsettings.json

For scenarios where client configuration should be externalized:

```json
{
  "IdentityServer": {
    "Clients": [
      {
        "Enabled": true,
        "ClientId": "local-dev",
        "ClientName": "Local Development",
        "ClientSecrets": [
          {
            "Value": "<Insert Sha256 hash of the secret encoded as Base64 string>"
          }
        ],
        "AllowedGrantTypes": ["client_credentials"],
        "AllowedScopes": ["api1"]
      }
    ]
  }
}
```

```csharp
// Load clients from configuration
idsvrBuilder.AddInMemoryClients(
    configuration.GetSection("IdentityServer:Clients"));
```

---

## Pattern 3: Identity Resources

Identity resources define groups of claims about users, requested via the `scope` parameter. They map to claims in the identity token and the userinfo endpoint.

### Standard Identity Resources

```csharp
public static IEnumerable<IdentityResource> IdentityResources =>
    new IdentityResource[]
    {
        new IdentityResources.OpenId(),   // Required -- maps to "sub" claim
        new IdentityResources.Profile(),  // name, family_name, given_name, etc.
        new IdentityResources.Email(),    // email, email_verified
        new IdentityResources.Phone(),    // phone_number, phone_number_verified
        new IdentityResources.Address(),  // address (JSON object)
    };
```

### Custom Identity Resources

Define custom identity resources for application-specific user claims:

```csharp
// OK Custom identity resource for tenant membership
new IdentityResource(
    name: "tenant",
    displayName: "Your organization info",
    userClaims: new[] { "tenant_id", "tenant_name", "tenant_role" })
{
    Required = true // Do not show on consent screen as optional
}
```

> Key concept: The `openid` scope is mandatory for any OpenID Connect request. It tells IdentityServer to return the `sub` (subject ID) claim.

---

## Pattern 4: API Scopes and API Resources

API scopes and API resources work together to model your API surface area. Understanding the distinction is critical.

### API Scopes -- Permission Model

An `ApiScope` represents a permission or capability a client can request:

```csharp
public static IEnumerable<ApiScope> ApiScopes =>
    new ApiScope[]
    {
        // Simple scope -- just a name
        new ApiScope("api1", "Main API"),

        // Granular scopes for fine-grained access
        new ApiScope("catalog.read", "Read product catalog"),
        new ApiScope("catalog.write", "Modify product catalog"),
        new ApiScope("orders.manage", "Manage orders"),

        // Scope that includes specific user claims in the access token
        new ApiScope("invoicing", "Invoicing API")
        {
            UserClaims = { "department", "cost_center" }
        }
    };
```

### API Resources -- Logical API Boundaries

An `ApiResource` represents a logical API (typically a deployed service). It groups scopes and controls the `aud` (audience) claim in access tokens:

```csharp
public static IEnumerable<ApiResource> ApiResources =>
    new ApiResource[]
    {
        new ApiResource("catalog-api", "Product Catalog API")
        {
            Scopes = { "catalog.read", "catalog.write" },

            // These claims are included when any scope in this resource is requested
            UserClaims = { "role" }
        },
        new ApiResource("orders-api", "Order Management API")
        {
            Scopes = { "orders.manage" },

            // API-specific secret for reference token introspection
            ApiSecrets = { new Secret("orders-secret".Sha256()) }
        }
    };
```

### When to Use ApiResource vs ApiScope

| Scenario | Use ApiScope alone? | Add ApiResource? |
|----------|-------------------|------------------|
| Single API, simple permissions | OK Sufficient | Optional |
| Multiple APIs sharing a scope | WRONG | OK Required for audience isolation |
| Reference token introspection | WRONG | OK Required for API secrets |
| Per-API signing algorithms | WRONG | OK Use `AllowedTokenSigningAlgorithms` |
| Resource isolation (RFC 8707) | WRONG | OK Required |

### Resource Isolation

When multiple APIs share scope names, resource isolation prevents a token issued for one API from being used at another:

```csharp
// Two separate APIs that both have a "read" scope
new ApiResource("inventory-api") { Scopes = { "read", "write" } },
new ApiResource("reporting-api") { Scopes = { "read" } }
```

With resource isolation, the client specifies the target resource in the token request using the `resource` parameter (RFC 8707), and IdentityServer issues a token with a single audience.

---

## Pattern 5: Automatic Key Management

Duende IdentityServer's automatic key management handles signing key creation, rotation, and retirement. This is the recommended approach for production.

```csharp
var idsvrBuilder = builder.Services.AddIdentityServer(options =>
{
    // Automatic key management is enabled by default
    // Customize rotation policy:
    options.KeyManagement.RotationInterval = TimeSpan.FromDays(90);    // New key every 90 days
    options.KeyManagement.PropagationTime = TimeSpan.FromDays(14);     // Announce 14 days early
    options.KeyManagement.RetentionDuration = TimeSpan.FromDays(14);   // Keep old keys 14 days
    options.KeyManagement.DeleteRetiredKeys = true;                    // Clean up old keys

    // Keys are encrypted at rest via ASP.NET Data Protection (default: true)
    options.KeyManagement.DataProtectKeys = true;
});
```

### Key Lifecycle

Keys move through these phases:
1. Announced -- Added to discovery but not used for signing (`PropagationTime` duration)
2. Active -- Used for signing tokens (until `RotationInterval` is reached)
3. Retired -- No longer signs tokens, but remains in discovery for validation (`RetentionDuration`)
4. Deleted -- Removed from discovery (if `DeleteRetiredKeys` is true)

### Multiple Signing Algorithms

Support multiple algorithms for different clients or APIs:

```csharp
options.KeyManagement.SigningAlgorithms = new[]
{
    // RS256 for maximum compatibility (first = default)
    new SigningAlgorithmOptions(SecurityAlgorithms.RsaSha256)
    {
        UseX509Certificate = true // Wrap in X.509 certificate
    },
    // PS256 for enhanced security
    new SigningAlgorithmOptions(SecurityAlgorithms.RsaSsaPssSha256),
    // ES256 for compact tokens
    new SigningAlgorithmOptions(SecurityAlgorithms.EcdsaSha256)
};
```

> The first algorithm in the list becomes the default. Clients and API resources can override via `AllowedTokenSigningAlgorithms`.

### Load-Balanced Deployments

For file-system key storage in load-balanced environments, all instances need access to the same key path:

```csharp
options.KeyManagement.KeyPath = "/home/shared/keys";
```

Alternatively, use the EF Core operational store for database-backed key storage (see `duende-identityserver-stores`).

---

## Pattern 6: Static Key Configuration

When automatic key management is not available or you need explicit control:

```csharp
var idsvrBuilder = builder.Services.AddIdentityServer(options =>
{
    options.KeyManagement.Enabled = false;
});

// Load key from secure storage
var signingKey = LoadKeyFromVault(); // Your key loading logic
idsvrBuilder.AddSigningCredential(signingKey, SecurityAlgorithms.RsaSha256);
```

### Manual Key Rotation (Three-Phase Process)

Rotating static keys requires careful sequencing to avoid breaking token validation:

```csharp
// Phase 1: Announce new key (keep signing with old key)
idsvrBuilder.AddSigningCredential(oldKey, SecurityAlgorithms.RsaSha256);
idsvrBuilder.AddValidationKey(newKey, SecurityAlgorithms.RsaSha256);
// Wait for all clients/APIs to refresh their JWKS cache (default: 24h)

// Phase 2: Start signing with new key (keep old key for validation)
idsvrBuilder.AddSigningCredential(newKey, SecurityAlgorithms.RsaSha256);
idsvrBuilder.AddValidationKey(oldKey, SecurityAlgorithms.RsaSha256);
// Wait for all tokens signed with old key to expire

// Phase 3: Remove old key
idsvrBuilder.AddSigningCredential(newKey, SecurityAlgorithms.RsaSha256);
```

---

## Pattern 7: Server-Side Sessions

Server-side sessions store authentication session data in a server-side store instead of the cookie alone. This enables centralized session management, queries, and back-channel logout.

```csharp
var idsvrBuilder = builder.Services.AddIdentityServer(options =>
{
    // Remove expired sessions automatically
    options.ServerSideSessions.RemoveExpiredSessionsFrequency = TimeSpan.FromMinutes(10);
    options.ServerSideSessions.ExpiredSessionsTriggerBackchannelLogout = true;

    // Coordinate client token lifetimes with user sessions
    options.Authentication.CoordinateClientLifetimesWithUserSession = true;
})
    // Server-side sessions are enabled by calling AddServerSideSessions()
    .AddServerSideSessions();
```

> Important: Server-side sessions are enabled by calling `.AddServerSideSessions()` on the IdentityServer builder -- there is no `options.ServerSideSessions.Enabled` property. Add this to the builder chain, not to options.

### Session Expiration Options

| Option | Default | Purpose |
|--------|---------|---------|
| `ServerSideSessions.RemoveExpiredSessionsFrequency` | 10 min | Cleanup interval |
| `ServerSideSessions.RemoveExpiredSessions` | `true` | Enable automatic cleanup |
| `ServerSideSessions.ExpiredSessionsTriggerBackchannelLogout` | `true` | Notify clients on session expiry |

> Tip: Combine server-side sessions with `CoordinateClientLifetimesWithUserSession = true` to ensure refresh tokens are revoked when a user's session ends.

---

## Pattern 8: Important IdentityServerOptions

### Events -- Enable for Production Monitoring

```csharp
options.Events.RaiseErrorEvents = true;
options.Events.RaiseInformationEvents = true;
options.Events.RaiseFailureEvents = true;
options.Events.RaiseSuccessEvents = true;
```

### Authentication Cookie Settings

```csharp
options.Authentication.CookieLifetime = TimeSpan.FromHours(10);
options.Authentication.CookieSlidingExpiration = false;
```

### Caching (with Store Caching Enabled)

```csharp
options.Caching.ClientStoreExpiration = TimeSpan.FromMinutes(15);
options.Caching.ResourceStoreExpiration = TimeSpan.FromMinutes(15);
```

### Pushed Authorization Requests (PAR)

```csharp
options.PushedAuthorization.Required = true; // Require all clients to use PAR
```

### DPoP (Demonstrating Proof-of-Possession)

```csharp
options.DPoP.ValidationMode = DPoPTokenExpirationValidationMode.Nonce;
options.DPoP.ServerClockSkew = TimeSpan.FromMinutes(5);
```

---

## Common Pitfalls

### 1. Missing openid Scope

```csharp
// WRONG WRONG -- OpenID Connect requires the openid scope
new Client
{
    AllowedScopes = { "profile", "api1" }
}

// OK CORRECT -- Always include openid for interactive clients
new Client
{
    AllowedScopes =
    {
        IdentityServerConstants.StandardScopes.OpenId,
        IdentityServerConstants.StandardScopes.Profile,
        "api1"
    }
}
```

### 2. Mismatched Redirect URIs

```csharp
// WRONG WRONG -- Trailing slash mismatch causes "invalid_redirect_uri" error
RedirectUris = { "https://app.example.com/signin-oidc/" }
// Client sends:   https://app.example.com/signin-oidc (no trailing slash)

// OK CORRECT -- Exact match required
RedirectUris = { "https://app.example.com/signin-oidc" }
```

### 3. Using ApiScope When ApiResource Is Needed

```csharp
// WRONG WRONG -- No audience claim, tokens work at any API
public static IEnumerable<ApiScope> ApiScopes =>
    new[] { new ApiScope("read"), new ApiScope("write") };

// OK CORRECT -- API resource sets audience for token isolation
public static IEnumerable<ApiResource> ApiResources =>
    new[]
    {
        new ApiResource("my-api")
        {
            Scopes = { "read", "write" }
        }
    };
```

### 4. Plaintext Client Secrets in Source Control

```csharp
// WRONG WRONG -- Secret in source code
ClientSecrets = { new Secret("my-production-secret".Sha256()) }

// OK CORRECT -- Load from configuration or vault
ClientSecrets = { new Secret(configuration["Clients:Web:Secret"].Sha256()) }

// OK ALSO CORRECT -- Use asymmetric credentials (no shared secret)
// Client authenticates with a signed JWT assertion
```

### 5. Forgetting AllowOfflineAccess for Refresh Tokens

```csharp
// WRONG Client requests "offline_access" scope but server doesn't allow it
var client = new Client
{
    AllowedGrantTypes = GrantTypes.Code,
    AllowOfflineAccess = false, // Default
    AllowedScopes = { "openid", "api1" }
};
// Client silently won't receive a refresh token

// OK Enable offline access explicitly
var client = new Client
{
    AllowedGrantTypes = GrantTypes.Code,
    AllowOfflineAccess = true,
    AllowedScopes = { "openid", "api1" }
};
```

### 6. Not Setting IssuerUri Behind a Reverse Proxy

```csharp
// WRONG IdentityServer behind Nginx but IssuerUri defaults to internal hostname
// Tokens contain iss: "http://internal-host:5000" -- clients reject them

// OK Set IssuerUri to the external URL
options.IssuerUri = "https://identity.example.com";
```

---

## Production Configuration Checklist

| Setting | Dev | Production |
|---------|-----|------------|
| `KeyManagement.Enabled` | `true` | `true` |
| `KeyManagement.DataProtectKeys` | `true` | `true` + configure Data Protection |
| `Events.Raise*Events` | Optional | All `true` |
| `ServerSideSessions` (`AddServerSideSessions()`) | Optional | Recommended |
| Secrets | In-memory / config | Key vault / certificates |
| Store | In-memory | EF Core or custom |
| HTTPS | Optional | Required |

---

## Resources

- [Clients -- Duende Docs](https://docs.duendesoftware.com/identityserver/fundamentals/clients/)
- [Resources -- Duende Docs](https://docs.duendesoftware.com/identityserver/fundamentals/resources/)
- [Key Management -- Duende Docs](https://docs.duendesoftware.com/identityserver/fundamentals/key-management/)
- [IdentityServerOptions Reference -- Duende Docs](https://docs.duendesoftware.com/identityserver/reference/options/)
- [Server-Side Sessions -- Duende Docs](https://docs.duendesoftware.com/identityserver/ui/server-side-sessions/)
- [Client Model Reference -- Duende Docs](https://docs.duendesoftware.com/identityserver/reference/models/client/)
