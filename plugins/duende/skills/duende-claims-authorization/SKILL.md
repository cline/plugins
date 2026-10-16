---
name: duende-claims-authorization
description: Claims transformation and profile service patterns for Duende IdentityServer -- IProfileService, IClaimsTransformation, claim type mapping, token claim filtering, extension grant validators, and dynamic claims loading.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Claims Transformation & Profile Service

## When to Use This Skill

- You are implementing or customizing `IProfileService` to control which claims are emitted into identity tokens, access tokens, or the userinfo endpoint.
- You need to map claims from an external identity provider (Google, Azure AD, SAML, etc.) into your IdentityServer user principal during login callback processing.
- You are configuring `IdentityResource`, `ApiScope`, or `ApiResource` `UserClaims` collections and need to understand how requested scopes drive `ProfileDataRequestContext.RequestedClaimTypes`.
- You are troubleshooting missing claims -- claims are defined on resources but not appearing in tokens or on the userinfo endpoint.
- You need to load claims dynamically from a database or downstream service at token issuance time.
- You are implementing an `IExtensionGrantValidator` and need to emit custom claims into the resulting access token.
- You are consuming tokens in an ASP.NET Core API or web app and need to handle claim type mapping (`MapInboundClaims`, `JwtClaimTypes` vs. Microsoft `ClaimTypes`).

## Core Principles

- Claims are opt-in by scope. IdentityServer only asks your profile service for claims that have been declared on a requested `IdentityResource`, `ApiScope`, or `ApiResource`. Declaring a claim on your user store is not enough -- it must be listed in a resource's `UserClaims` collection and the client must request that resource's scope.
- `IProfileService` is the single authoritative extension point for controlling which user claims enter tokens. Do not use `IClaimsTransformation` on the IdentityServer host to modify token claims -- that interface runs during cookie authentication, not token issuance.
- Identity tokens are for the client; access tokens are for APIs. Keep identity tokens small. Use `AlwaysIncludeUserClaimsInIdToken` sparingly. Prefer the userinfo endpoint for full profile data.
- `AddRequestedClaims` respects consent. Use `context.AddRequestedClaims(claims)` rather than `context.IssuedClaims.AddRange(claims)` when you want IdentityServer to filter your claims down to only those that were requested and consented to by the user.
- Claim serialization is type-aware. Set `ClaimValueType` correctly (e.g. `ClaimValueTypes.Integer64`, `IdentityServerConstants.ClaimValueTypes.Json`) so numeric and structured values arrive in tokens as the right JSON type rather than strings.
- `MapInboundClaims = false` is required in consuming APIs and web apps. Without it, the JWT bearer handler silently renames standard OIDC claims (e.g. `sub` -> `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier`), breaking `User.FindFirst(JwtClaimTypes.Subject)` lookups.

Docs: https://docs.duendesoftware.com/identityserver/tokens/authorization

---

## Sub-Documents

| Document | Description | When to Load |
|----------|-------------|--------------|
| [docs/extension-grant-claims.md](docs/extension-grant-claims.md) | `IExtensionGrantValidator` implementation for custom grant types with claim propagation | Extension grants, token exchange, custom grant type, IExtensionGrantValidator, GrantValidationResult |
| [docs/external-provider-claims.md](docs/external-provider-claims.md) | External provider login callback with claim mapping, Google/AAD normalization, and ClaimActions | External provider, Google, Azure AD, OIDC callback, claim mapping, ExternalCookieAuthenticationScheme |

---

## Claims Pipeline Overview

Claims travel through several distinct stages between the user's identity and an API's authorization check. Understanding where each transformation occurs prevents duplicate work and subtle bugs.

Claims pipeline:

1. External IdP or local user store provides claims to the IdentityServer login callback.
2. IdentityServer builds a cookie principal during `SignInAsync` and stores it in the authentication session.
3. `IProfileService.GetProfileDataAsync` runs at token issuance time and selects or augments claims for each token type.
4. Identity tokens carry client-facing claims; access tokens carry API-facing claims.
5. API JWT bearer authentication maps inbound claims, then `HttpContext.User` feeds `[Authorize]`, policies, and handlers.

Stage 1 -- Login callback: Claims from the external provider (or local user store) are incorporated into the `IdentityServerUser` and persisted in the session cookie. This is where you map external IdP claims to internal claim types.

Stage 2 -- Token issuance: When a client requests a token, IdentityServer calls `IProfileService.GetProfileDataAsync`. The `ProfileDataRequestContext` tells you which claims are requested (derived from scopes/resources) and what token type is being built. This is where you load dynamic claims from your database.

Stage 3 -- Token consumption: APIs receive the JWT and validate it. `IClaimsTransformation` can augment the `ClaimsPrincipal` after validation -- useful for adding application-specific roles or denormalized data that doesn't belong in the token itself.

---

## IProfileService

`IProfileService` is the primary extensibility point for claims in Duende IdentityServer. Register your implementation with `AddProfileService<T>()` during startup.

### Interface Contract

```csharp
// Duende.IdentityServer.Services
public interface IProfileService
{
    // Called to get claims for a token or the userinfo endpoint.
    Task GetProfileDataAsync(ProfileDataRequestContext context);

    // Called to check whether the user is still active (e.g. not disabled).
    // context.Caller is a ProfileIsActiveCallers constant that tells you WHY
    // the check is being made (e.g. AuthorizeEndpoint, Token, RefreshTokenValidation).
    Task IsActiveAsync(IsActiveContext context);
}
```

### ProfileDataRequestContext Key Members

| Member | Description |
|---|---|
| `Subject` | The `ClaimsPrincipal` from the authentication session (or from the access token for userinfo calls). |
| `Client` | The `Client` making the request -- use for per-client filtering. |
| `Caller` | What triggered this call: `ClaimsProviderAccessToken`, `ClaimsProviderIdentityToken`, `UserInfoEndpoint`. |
| `RequestedClaimTypes` | Claim types requested by the client via scopes/resources. |
| `IssuedClaims` | Populate this collection with claims to include in the token. |
| `AddRequestedClaims(IEnumerable<Claim>)` | Helper that filters your claims to only those in `RequestedClaimTypes`. |

### Minimal Implementation

```csharp
// OK Correct: extend DefaultProfileService, use AddRequestedClaims
public sealed class ApplicationProfileService : DefaultProfileService
{
    private readonly IUserRepository _users;
    private readonly ILogger<ApplicationProfileService> _logger;

    public ApplicationProfileService(
        IUserRepository users,
        ILogger<ApplicationProfileService> logger)
        : base(logger)
    {
        _users = users;
        _logger = logger;
    }

    public override async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        // Source claims from Subject (cheap -- already in memory)
        var subjectId = context.Subject.GetSubjectId();

        // Load additional claims from the database
        var user = await _users.FindBySubjectIdAsync(subjectId);
        if (user is null)
        {
            _logger.LogWarning("Profile service: user {SubjectId} not found", subjectId);
            return;
        }

        var claims = new List<Claim>
        {
            new(JwtClaimTypes.Name, user.DisplayName),
            new(JwtClaimTypes.Email, user.Email),
            new("tenant_id", user.TenantId),
            new("subscription_tier", user.SubscriptionTier),
        };

        // Only emit claims that were requested by the client's scopes
        context.AddRequestedClaims(claims);
    }

    public override async Task IsActiveAsync(IsActiveContext context)
    {
        var subjectId = context.Subject.GetSubjectId();
        var user = await _users.FindBySubjectIdAsync(subjectId);
        context.IsActive = user is { IsEnabled: true };
    }
}
```

> `ProfileIsActiveCallers`: `IsActiveContext.Caller` is a `ProfileIsActiveCallers` constant indicating why the check is being made -- e.g. `AuthorizeEndpoint`, `Token`, `RefreshTokenValidation`, `UserInfoRequestValidation`. Use it to apply different strictness levels; for example, you might allow a soft-disabled account to complete an in-flight refresh but deny new interactive logins.

```csharp
// Program.cs
builder.Services.AddIdentityServer()
    .AddProfileService<ApplicationProfileService>();
```

### Emitting Claims Unconditionally

Use `context.IssuedClaims.AddRange(...)` when a claim must always appear regardless of requested scopes -- for example, a mandatory `tenant_id` that APIs rely on for multi-tenancy:

```csharp
// OK Always emit tenant_id, regardless of requested scopes
public override async Task GetProfileDataAsync(ProfileDataRequestContext context)
{
    var subjectId = context.Subject.GetSubjectId();
    var user = await _users.FindBySubjectIdAsync(subjectId);

    // Mandatory claim -- bypasses scope-based filtering
    context.IssuedClaims.Add(new Claim("tenant_id", user.TenantId));

    // Scope-filtered claims
    var profileClaims = BuildProfileClaims(user);
    context.AddRequestedClaims(profileClaims);
}
```

```csharp
// WRONG Wrong: adding all claims directly bypasses consent and scope filtering
public override Task GetProfileDataAsync(ProfileDataRequestContext context)
{
    // This ignores RequestedClaimTypes and consent -- user agreed to share only
    // the claims associated with the requested scopes.
    context.IssuedClaims.AddRange(GetAllUserClaims());
    return Task.CompletedTask;
}
```

### Differentiating by Caller

The `Caller` property lets you tailor claims for each token type:

```csharp
public override async Task GetProfileDataAsync(ProfileDataRequestContext context)
{
    var user = await _users.FindBySubjectIdAsync(context.Subject.GetSubjectId());

    if (context.Caller == IdentityServerConstants.ProfileDataCallers.ClaimsProviderIdentityToken)
    {
        // Identity tokens go to the browser -- keep them small
        context.IssuedClaims.Add(new Claim(JwtClaimTypes.Name, user.DisplayName));
        return;
    }

    // Access tokens and userinfo can include richer application claims
    var claims = BuildFullClaimSet(user);
    context.AddRequestedClaims(claims);
}
```

### Detecting Userinfo Endpoint Calls

When called for the userinfo endpoint, `Subject` is populated from the access token rather than the session principal. Guard against assuming session-only data is available:

```csharp
public override async Task GetProfileDataAsync(ProfileDataRequestContext context)
{
    // context.Subject.GetSubjectId() works for all callers
    var subjectId = context.Subject.GetSubjectId();

    // For userinfo, context.Subject contains access-token claims only --
    // not the full session principal. Load from database instead.
    var user = await _users.FindBySubjectIdAsync(subjectId);

    context.AddRequestedClaims(BuildProfileClaims(user));
}
```

---

## Claims in Tokens: Identity vs. Access

### Identity Token

- Purpose: tells the client application what happened during authentication.
- Audience: the client application only -- never send to an API.
- Keep small: the client validates it immediately; large tokens stress browsers and PKCE flows.
- Standard claims: `sub`, `auth_time`, `amr`, `idp`, `sid`, `nonce`.
- User profile claims (name, email) are typically fetched via userinfo rather than embedded.

```csharp
// OK Prefer userinfo for profile data -- keep id_token lean
// On the client (ASP.NET Core OIDC handler):
options.GetClaimsFromUserInfoEndpoint = true;
options.SaveTokens = true;
```

### AlwaysIncludeUserClaimsInIdToken

Setting `AlwaysIncludeUserClaimsInIdToken = true` on a client forces all profile claims into the identity token, bypassing the userinfo endpoint. Use only when the client cannot make the userinfo call (e.g. native apps with no back-channel).

```csharp
// WARNING: Use sparingly -- increases id_token size significantly
var client = new Client
{
    ClientId = "native_app",
    AlwaysIncludeUserClaimsInIdToken = true,
    AllowedScopes = { "openid", "profile", "email" },
};
```

### Access Token

- Purpose: authorizes API calls.
- Audience: the resource server (API).
- Contains: `sub`, `client_id`, `scope`, `jti`, `iss`, `exp`, + any user claims from profile service.
- Resource-based filtering applies: claims associated with a specific `ApiResource` only appear when that resource is requested via resource indicator.

### Resource-Based Claim Filtering

Declare claims on `ApiResource` to scope them to that specific API:

```csharp
// OK Claims on ApiResource are only emitted when that resource is requested
new ApiResource("invoicing", "Invoicing API")
{
    Scopes = { "invoicing.read", "invoicing.write" },
    UserClaims = { "cost_center", "approval_limit" }  // Only in tokens for this API
}

new ApiScope("invoicing.read")
{
    UserClaims = { "department" }  // Emitted when this scope is requested
}
```

### Claim Value Types

Set `ClaimValueType` to ensure correct JSON serialization in the JWT:

```csharp
// OK Numeric and boolean claims serialize as JSON primitives
var claims = new List<Claim>
{
    new("account_id", "42",
        ClaimValueTypes.Integer64),

    new("is_verified", "true",
        ClaimValueTypes.Boolean),

    new("permissions", """["read","write"]""",
        IdentityServerConstants.ClaimValueTypes.Json),
};
```

```csharp
// WRONG Without ClaimValueType, all values serialize as JSON strings
// { "account_id": "42" }  <- wrong, should be 42
new Claim("account_id", "42")
```

---

## Claim Types and Mapping

### JwtClaimTypes vs. System ClaimTypes

The `Duende.IdentityModel` (or `IdentityModel`) library provides `JwtClaimTypes` with the short JWT/OIDC claim names:

| JwtClaimTypes | Long Microsoft ClaimTypes |
|---|---|
| `sub` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier` |
| `name` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` |
| `email` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` |
| `role` | `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` |
| `given_name` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname` |

Always use `JwtClaimTypes` constants in IdentityServer code and in APIs that validate JWTs directly.

### MapInboundClaims = false (Required in APIs)

The default JWT bearer handler maps short JWT claim names to long Microsoft WS-Federation names. Disable this:

```csharp
// OK In your API -- keep standard OIDC short names
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "my_api";
        options.MapInboundClaims = false;  // Keep "sub", not the long name
    });
```

```csharp
// OK In web app OIDC handler -- same principle
builder.Services.AddAuthentication(...)
    .AddOpenIdConnect("oidc", options =>
    {
        options.Authority = "https://identity.example.com";
        options.MapInboundClaims = false;
        options.TokenValidationParameters.NameClaimType = JwtClaimTypes.Name;
        options.TokenValidationParameters.RoleClaimType = JwtClaimTypes.Role;
    });
```

```csharp
// WRONG Without MapInboundClaims = false:
// User.FindFirst("sub")  -> null
// User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier") -> found
```

---

## IClaimsTransformation (API-Side)

`IClaimsTransformation` is an ASP.NET Core interface that runs in consuming applications after authentication but before authorization. Use it in APIs and web apps -- never in the IdentityServer host itself for token content.

### When to Use IClaimsTransformation

- Enriching the `ClaimsPrincipal` with application-specific roles from a local database, after validating a token from IdentityServer.
- Mapping external department/group memberships to application roles without putting that data in the token.
- Adding denormalized claims (e.g. resolved tenant name from `tenant_id`) for use in authorization policies.

```csharp
// OK In an API project -- augment principal after token validation
public sealed class TenantClaimsTransformation : IClaimsTransformation
{
    private readonly ITenantRepository _tenants;

    public TenantClaimsTransformation(ITenantRepository tenants)
    {
        _tenants = tenants;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var tenantId = principal.FindFirstValue("tenant_id");
        if (tenantId is null)
        {
            return principal;
        }

        var tenant = await _tenants.GetByIdAsync(tenantId);
        if (tenant is null)
        {
            return principal;
        }

        // Clone before mutating -- ClaimsPrincipal can be reused across calls
        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim("tenant_name", tenant.DisplayName));
        identity.AddClaim(new Claim("tenant_region", tenant.Region));

        foreach (var role in tenant.ApplicationRoles)
        {
            identity.AddClaim(new Claim(ClaimTypes.Role, role));
        }

        principal.AddIdentity(identity);
        return principal;
    }
}
```

```csharp
// Program.cs -- in the API
builder.Services.AddTransient<IClaimsTransformation, TenantClaimsTransformation>();
```

> Do not use `IClaimsTransformation` on the IdentityServer host to modify token claims. It runs during cookie sign-in/validation and does not affect token content -- use `IProfileService` there instead.

---

## Extension Grant Validators

`IExtensionGrantValidator` handles custom OAuth grant types at the token endpoint (e.g. token exchange, assertion grants). Implement `ValidateAsync` to validate the incoming token/assertion, then call `new GrantValidationResult(subject, grantType, customClaims)`. `IProfileService` is called subsequently and can augment claims further. Register with `AddExtensionGrantValidator<T>()`.

> See [docs/extension-grant-claims.md](docs/extension-grant-claims.md) for a full token exchange validator implementation with error handling and custom claim propagation.

---

## Claims from External Providers

When a user authenticates through an external provider, IdentityServer receives claims in a temporary external cookie. In the login callback: read via `HttpContext.AuthenticateAsync(ExternalCookieAuthenticationScheme)`, extract the provider user ID, find or provision the local user, build an `IdentityServerUser` with `AdditionalClaims = MapProviderClaims(...)`, then call `SignInAsync` + `SignOutAsync` for the external cookie. For OIDC handlers, use `ClaimActions.Clear()` followed by explicit `MapJsonKey` calls to whitelist only the claims you need.

> See [docs/external-provider-claims.md](docs/external-provider-claims.md) for the full callback controller implementation with Google/AAD claim mapping and `ClaimActions` examples.

---

## Dynamic Claims Loading

Loading claims dynamically at token issuance time -- rather than storing them in the session cookie -- keeps your session lean and ensures claims reflect the current state of your database. This is the recommended pattern for role assignments and feature flags that change frequently.

```csharp
public sealed class DynamicProfileService : DefaultProfileService
{
    private readonly IUserPermissionService _permissions;
    private readonly IFeatureFlagService _features;
    private readonly ILogger<DynamicProfileService> _logger;

    public DynamicProfileService(
        IUserPermissionService permissions,
        IFeatureFlagService features,
        ILogger<DynamicProfileService> logger)
        : base(logger)
    {
        _permissions = permissions;
        _features = features;
        _logger = logger;
    }

    public override async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        var subjectId = context.Subject.GetSubjectId();

        // Run database calls concurrently
        var (permissionsTask, featuresTask) = (
            _permissions.GetForUserAsync(subjectId, context.Client.ClientId),
            _features.GetEnabledForUserAsync(subjectId)
        );

        await Task.WhenAll(permissionsTask, featuresTask);

        var claims = new List<Claim>();

        // Role claims from permission service
        foreach (var permission in permissionsTask.Result)
        {
            claims.Add(new Claim(JwtClaimTypes.Role, permission));
        }

        // Feature flag claims -- serialize as JSON array
        var featuresJson = System.Text.Json.JsonSerializer.Serialize(featuresTask.Result);
        claims.Add(new Claim(
            "features",
            featuresJson,
            IdentityServerConstants.ClaimValueTypes.Json));

        context.AddRequestedClaims(claims);
    }

    public override async Task IsActiveAsync(IsActiveContext context)
    {
        // Guard against token use after account suspension
        var subjectId = context.Subject.GetSubjectId();
        context.IsActive = await _permissions.IsUserActiveAsync(subjectId);
    }
}
```

> Performance note: `GetProfileDataAsync` is called on every token issuance, including refresh token redemptions. Use caching (`IMemoryCache`, `IDistributedCache`) for expensive lookups, keyed by `subjectId + clientId`. Cache TTL should be shorter than your access token lifetime.

### Caching Dynamic Claims

```csharp
public override async Task GetProfileDataAsync(ProfileDataRequestContext context)
{
    var subjectId = context.Subject.GetSubjectId();
    var cacheKey = $"profile:{subjectId}:{context.Client.ClientId}";

    if (!_cache.TryGetValue(cacheKey, out IReadOnlyList<Claim>? cachedClaims))
    {
        cachedClaims = await LoadClaimsFromDatabaseAsync(subjectId, context.Client.ClientId);

        _cache.Set(cacheKey, cachedClaims, TimeSpan.FromMinutes(5));
    }

    context.AddRequestedClaims(cachedClaims!);
}
```

---

## Client Claims

Client claims are static claims attached to a `Client` definition and emitted into access tokens. They are prefixed with `client_` by default to prevent collision with user claims.

```csharp
var client = new Client
{
    ClientId = "billing-service",
    ClientSecrets = { new Secret("secret".Sha256()) },
    AllowedGrantTypes = GrantTypes.ClientCredentials,
    AllowedScopes = { "invoicing.api" },

    // Prefixed as "client_customer_id" in the token
    Claims =
    {
        new ClientClaim("customer_id", "acme-corp"),
        new ClientClaim("region", "us-east"),
    },

    // Remove the prefix: emit as "customer_id" (use carefully)
    // ClientClaimsPrefix = ""
};
```

> Client claims are only emitted in the client credentials flow by default. For other flows set `AlwaysSendClientClaims = true` on the client definition.

For dynamic client claims (e.g. set based on runtime context), implement a custom token request validator:

```csharp
public sealed class DynamicClientClaimsValidator : ICustomTokenRequestValidator
{
    private readonly IClientContextService _clientContext;

    public DynamicClientClaimsValidator(IClientContextService clientContext)
    {
        _clientContext = clientContext;
    }

    public async Task ValidateAsync(CustomTokenRequestValidationContext context)
    {
        if (context.Result.ValidatedRequest.GrantType != GrantType.ClientCredentials)
        {
            return;
        }

        var clientId = context.Result.ValidatedRequest.Client.ClientId;
        var tier = await _clientContext.GetSubscriptionTierAsync(clientId);

        context.Result.ValidatedRequest.ClientClaims.Add(
            new Claim("subscription_tier", tier));
    }
}
```

---

## Common Pitfalls

### Claims Not Appearing in Tokens

1. Claim not in `UserClaims`: The claim type must be listed in the `UserClaims` collection of the `IdentityResource`, `ApiScope`, or `ApiResource` that the client requests.

```csharp
// WRONG "department" never requested -- won't appear even if profile service emits it
new ApiScope("api.read");  // no UserClaims

// OK Declare the claim on the scope
new ApiScope("api.read")
{
    UserClaims = { "department", "cost_center" }
}
```

2. Client not requesting the scope: The client must include the scope in `AllowedScopes` and request it at authorization time.

3. `AddRequestedClaims` filtered it out: If you use `context.AddRequestedClaims(claims)`, only claims whose types are in `context.RequestedClaimTypes` pass through. Check whether the scope was requested.

### Wrong Claim Names in APIs

Caused by not setting `MapInboundClaims = false`. The JWT bearer handler renames `sub` to the long WS-Federation URI. Fix:

```csharp
// OK Always set this in APIs consuming IdentityServer tokens
options.MapInboundClaims = false;
```

### Mutating ClaimsPrincipal in IClaimsTransformation

`ClaimsPrincipal` instances can be cached and reused. Always create a new `ClaimsIdentity` and add it to the principal rather than mutating an existing identity:

```csharp
// OK Create a new identity, add to existing principal
var identity = new ClaimsIdentity();
identity.AddClaim(new Claim("app_role", "admin"));
principal.AddIdentity(identity);
return principal;

// WRONG Never mutate the principal's existing identities in-place
((ClaimsIdentity)principal.Identity!).AddClaim(new Claim("app_role", "admin"));
```

### AlwaysIncludeUserClaimsInIdToken Overuse

Setting `AlwaysIncludeUserClaimsInIdToken = true` embeds all profile claims in the identity token. This:
- Increases token size (can exceed header/cookie limits).
- Caches profile data in the client until the token expires (stale claims).
- Bypasses the userinfo endpoint's on-demand freshness.

Prefer `options.GetClaimsFromUserInfoEndpoint = true` in the client OIDC handler.

### Storing Too Many Claims in the Session Cookie

The IdentityServer session cookie stores the `ClaimsPrincipal` from `SignInAsync`. Large claim sets (e.g. hundreds of AD groups) bloat this cookie, breaking requests with 431 or 400 errors. Keep the session principal minimal -- load bulk claims dynamically in `IProfileService` instead.

### Forgetting IsActiveAsync

`IsActiveAsync` is called on refresh token redemption. If you block token issuance via `context.IsActive = false` but don't revoke the refresh token, the user sees token request failures without a helpful error. Ensure your user deactivation flow also revokes persisted grants.

---

## Resources

- [Duende IdentityServer -- Claims fundamentals](https://docs.duendesoftware.com/identityserver/fundamentals/claims/)
- [Duende IdentityServer -- Profile Service reference](https://docs.duendesoftware.com/identityserver/reference/services/profile-service/)
- [Duende IdentityServer -- Identity Resources](https://docs.duendesoftware.com/identityserver/fundamentals/resources/identity/)
- [Duende IdentityServer -- API Scopes](https://docs.duendesoftware.com/identityserver/fundamentals/resources/api-scopes/)
- [Duende IdentityServer -- API Resources](https://docs.duendesoftware.com/identityserver/fundamentals/resources/api-resources/)
- [Duende IdentityServer -- Extension Grants](https://docs.duendesoftware.com/identityserver/tokens/extension-grants/)
- [Duende IdentityServer -- External Providers](https://docs.duendesoftware.com/identityserver/ui/login/external/)
- [Duende IdentityServer -- Token types overview](https://docs.duendesoftware.com/identityserver/tokens/)
- [Duende IdentityServer -- Custom Token Request Validator](https://docs.duendesoftware.com/identityserver/tokens/dynamic-validation/)
- [ASP.NET Core -- IClaimsTransformation](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/claims)
- [OpenID Connect Core spec -- Standard scope/claim mappings](https://openid.net/specs/openid-connect-core-1_0.html#scopeclaims)

### Related Skills

- `duende-aspnetcore-authorization` -- policy-based authorization, `IAuthorizationRequirement`, resource-based authorization using claims in the `ClaimsPrincipal`
- `duende-identityserver-configuration` -- configuring `IdentityResource`, `ApiScope`, `ApiResource`, and `Client` definitions that drive which claims are requested
- `duende-aspnetcore-authentication` -- cookie authentication, OIDC handler configuration, `MapInboundClaims`, and `GetClaimsFromUserInfoEndpoint`
