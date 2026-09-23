---
name: duende-identityserver-api-protection
description: "Protecting APIs with Duende IdentityServer: JWT bearer authentication, reference token introspection, scope-based authorization, DPoP/mTLS proof-of-possession validation, local API authentication, and multi-audience scenarios."
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Protecting APIs with IdentityServer

## When to Use This Skill

- Configuring JWT bearer authentication in an ASP.NET Core API to validate tokens from IdentityServer
- Setting up reference token introspection with `AddOAuth2Introspection`
- Handling both JWT and reference tokens in the same API using `ForwardReferenceToken`
- Implementing scope-based authorization policies
- Validating Proof-of-Possession tokens (DPoP and mTLS `cnf` claim)
- Protecting APIs hosted in the same application as IdentityServer (local API authentication)
- Securing multi-audience API deployments

Docs: https://docs.duendesoftware.com/identityserver/tokens/api-protection

## Core Concepts

APIs are the resources that IdentityServer protects. Clients obtain access tokens from IdentityServer, then present those tokens to APIs. The API must validate the token and enforce authorization based on the token's claims (scopes, audience, subject, etc.).

### Token Formats at the API

| Format         | Validation Method                          | Revocable              | Network Dependency                   |
| -------------- | ------------------------------------------ | ---------------------- | ------------------------------------ |
| JWT (`at+jwt`) | Signature verification using issuer's JWKS | No (expires naturally) | None at validation time              |
| Reference      | Introspection endpoint call                | Yes (immediate)        | Requires IdentityServer availability |

## JWT Bearer Authentication

### Basic Setup

Install the standard Microsoft JWT bearer package:

```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

Configure the authentication handler:

```csharp
// Program.cs
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "api1";

        options.TokenValidationParameters.ValidTypes = ["at+jwt"];
    });
```

### Critical: JWT Type Validation

Always set `ValidTypes` to `["at+jwt"]` to protect against JWT confusion attacks. Without this, an attacker could present an identity token (which is also a JWT signed by the same issuer) to an API:

```csharp
// WRONG WRONG: No type validation -- vulnerable to JWT confusion
options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateAudience = true
};

// OK CORRECT: Validate the at+jwt type header
options.TokenValidationParameters.ValidTypes = ["at+jwt"];
```

IdentityServer sets the `typ` header to `at+jwt` on all access token JWTs (per RFC 9068). This is controlled by `IdentityServerOptions.AccessTokenJwtType`.

### Audience Validation

The `Audience` property on `JwtBearerOptions` validates the `aud` claim in the access token. The audience value comes from the `ApiResource` name in IdentityServer:

```csharp
// IdentityServer configuration
var apiResource = new ApiResource("api1")
{
    Scopes = { "api1.read", "api1.write" }
};

// API configuration
options.Audience = "api1";
```

If `Audience` is not set, audience validation is skipped (not recommended for production).

### Multi-Audience APIs

When an API belongs to multiple logical resources, configure multiple valid audiences:

```csharp
options.TokenValidationParameters.ValidAudiences = ["api1", "api2"];
```

## Reference Token Introspection

For APIs that receive reference tokens (opaque strings rather than JWTs), use the OAuth 2.0 introspection package:

```bash
dotnet add package Duende.IdentityServer.AccessTokenValidation
```

Or use the introspection handler directly:

```bash
dotnet add package Duende.AspNetCore.Authentication.OAuth2Introspection
```

```csharp
// Program.cs
builder.Services.AddAuthentication("token")
    .AddOAuth2Introspection("token", options =>
    {
        options.Authority = "https://identity.example.com";
        options.ClientId = "api1";
        options.ClientSecret = "api1_secret";
    });
```

The `ClientId` and `ClientSecret` correspond to the `ApiResource` name and secret configured in IdentityServer:

```csharp
// IdentityServer configuration
var apiResource = new ApiResource("api1")
{
    ApiSecrets = { new Secret("api1_secret".Sha256()) },
    Scopes = { "api1.read" }
};
```

### Common Pitfall: Missing ApiSecrets

```csharp
// WRONG WRONG: No secret configured -- introspection will fail with 401
var apiResource = new ApiResource("api1")
{
    Scopes = { "api1.read" }
};

// OK CORRECT: ApiSecrets required for introspection
var apiResource = new ApiResource("api1")
{
    ApiSecrets = { new Secret("secret".Sha256()) },
    Scopes = { "api1.read" }
};
```

## Handling Both JWT and Reference Tokens

Use `ForwardReferenceToken` from the `Duende.AspNetCore.Authentication.JwtBearer` package to support both token formats in a single API. This selector inspects the token: if it contains a dot (`.`) it is treated as a JWT; otherwise it is forwarded to the introspection handler.

```bash
dotnet add package Duende.AspNetCore.Authentication.JwtBearer
```

```csharp
// Program.cs
builder.Services.AddAuthentication("token")
    .AddJwtBearer("token", options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "api1";
        options.TokenValidationParameters.ValidTypes = ["at+jwt"];

        // Forward reference tokens to the introspection handler
        options.ForwardDefaultSelector =
            Selector.ForwardReferenceToken("introspection");
    })
    .AddOAuth2Introspection("introspection", options =>
    {
        options.Authority = "https://identity.example.com";
        options.ClientId = "api1";
        options.ClientSecret = "api1_secret";
    });
```

### How ForwardReferenceToken Works

The selector checks whether the incoming Bearer token string contains a dot (`.`):

- Contains a dot -> treated as a JWT, validated by `AddJwtBearer`
- No dot -> treated as a reference token, forwarded to `AddOAuth2Introspection`

This is a simple heuristic: JWTs always contain dots (header.payload.signature), while reference tokens are opaque identifiers.

## Scope-Based Authorization

### Scope Claim Format

IdentityServer can emit scopes in two formats, controlled by `EmitScopesAsSpaceDelimitedStringInJwt`:

| Setting           | Claim Format           | Example                                |
| ----------------- | ---------------------- | -------------------------------------- |
| `false` (default) | JSON array             | `"scope": ["api1.read", "api1.write"]` |
| `true`            | Space-delimited string | `"scope": "api1.read api1.write"`      |

### Normalizing Scope Claims

When scopes are emitted as a space-delimited string, the `scope` claim appears as a single string value. To normalize it back to individual claims for easier policy checks, implement a custom `IClaimsTransformation`:

```csharp
// Program.cs
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "api1";
        options.TokenValidationParameters.ValidTypes = ["at+jwt"];
    });

// Register a custom claims transformation to split space-delimited scopes
builder.Services.AddTransient<IClaimsTransformation, ScopeClaimsTransformation>();
```

```csharp
// ScopeClaimsTransformation.cs
public class ScopeClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var identity = (ClaimsIdentity)principal.Identity!;
        var scopeClaim = identity.FindFirst("scope");
        if (scopeClaim != null && scopeClaim.Value.Contains(' '))
        {
            identity.RemoveClaim(scopeClaim);
            foreach (var scope in scopeClaim.Value.Split(' '))
            {
                identity.AddClaim(new Claim("scope", scope));
            }
        }
        return Task.FromResult(principal);
    }
}
```

This transformation converts a space-delimited `scope` claim into individual `scope` claims, so authorization policies work consistently regardless of the format.

### Defining Authorization Policies

```csharp
// Program.cs
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("read", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("scope", "api1.read");
    });

    options.AddPolicy("write", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("scope", "api1.write");
    });
});
```

Apply policies to endpoints:

```csharp
app.MapGet("/data", () => Results.Ok(data))
    .RequireAuthorization("read");

app.MapPost("/data", (DataModel model) => Results.Created())
    .RequireAuthorization("write");
```

Or with controllers:

```csharp
[Authorize(Policy = "read")]
[ApiController]
[Route("api/[controller]")]
public class DataController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(data);

    [HttpPost]
    [Authorize(Policy = "write")]
    public IActionResult Post(DataModel model) => Created();
}
```

## Proof-of-Possession (PoP) Token Validation

Proof-of-Possession binds an access token to a specific client's cryptographic key, preventing token theft/replay. IdentityServer supports two PoP mechanisms: Mutual TLS (mTLS) and DPoP.

### mTLS Confirmation (cnf Claim)

When mTLS is used, the access token contains a `cnf` claim with the SHA-256 thumbprint of the client certificate:

```json
{
  "cnf": {
    "x5t#S256": "bBBDDeEFSS..."
  }
}
```

To validate at the API, confirm the `cnf` thumbprint matches the client certificate presented on the TLS connection:

```csharp
// Program.cs
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "api1";
        options.TokenValidationParameters.ValidTypes = ["at+jwt"];

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var cnfClaim = context.Principal?.FindFirst("cnf");
                if (cnfClaim != null)
                {
                    var certificate = context.HttpContext.Connection.ClientCertificate;
                    if (certificate == null)
                    {
                        context.Fail("Client certificate required for mTLS tokens");
                        return Task.CompletedTask;
                    }

                    var thumbprint = Base64UrlEncoder.Encode(
                        certificate.GetCertHash(HashAlgorithmName.SHA256));

                    var cnf = JsonDocument.Parse(cnfClaim.Value);
                    var expectedThumbprint = cnf.RootElement
                        .GetProperty("x5t#S256").GetString();

                    if (thumbprint != expectedThumbprint)
                    {
                        context.Fail("Certificate thumbprint does not match cnf claim");
                    }
                }
                return Task.CompletedTask;
            }
        };
    });
```

### DPoP Validation

DPoP (Demonstration of Proof-of-Possession) uses a separate proof JWT in the `DPoP` HTTP header. Use the `Duende.AspNetCore.Authentication.JwtBearer` package which provides built-in DPoP validation:

```bash
dotnet add package Duende.AspNetCore.Authentication.JwtBearer
```

```csharp
// Program.cs
builder.Services.AddAuthentication("token")
    .AddJwtBearer("token", options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "api1";
        options.TokenValidationParameters.ValidTypes = ["at+jwt"];
    });

// Configure DPoP on the service collection, NOT inside AddJwtBearer
builder.Services.ConfigureDPoPTokensForScheme("token");

// DPoP replay detection requires a distributed cache
builder.Services.AddDistributedMemoryCache();
```

#### DPoP Validation Details

The `ConfigureDPoPTokensForScheme` extension is called on `IServiceCollection`, not inside the `AddJwtBearer` options lambda. It:

1. Validates the `DPoP` proof JWT in the request header
2. Confirms the `jkt` (JWK thumbprint) in the access token's `cnf` claim matches the proof key
3. Verifies the proof is bound to the correct HTTP method and URL
4. Uses `IDistributedCache` for nonce/replay detection

```csharp
// WRONG WRONG: DPoP configured inside AddJwtBearer lambda -- this is not valid
builder.Services.AddAuthentication("token")
    .AddJwtBearer("token", options =>
    {
        options.ConfigureDPoPTokensForScheme("token"); // <- wrong location
    });

// OK CORRECT: ConfigureDPoPTokensForScheme on IServiceCollection, plus distributed cache
builder.Services.AddDistributedMemoryCache(); // or Redis, SQL, etc.
builder.Services.AddAuthentication("token")
    .AddJwtBearer("token", options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "api1";
        options.TokenValidationParameters.ValidTypes = ["at+jwt"];
    });
builder.Services.ConfigureDPoPTokensForScheme("token");
```

## Local API Authentication

When your API is hosted in the same application as IdentityServer, use local API authentication to avoid the overhead of a network call to the token endpoint:

```csharp
// Program.cs (in the IdentityServer host)
builder.Services.AddIdentityServer()
    .AddInMemoryClients(Config.Clients)
    .AddInMemoryApiScopes(Config.ApiScopes);

builder.Services.AddLocalApiAuthentication();
```

### What AddLocalApiAuthentication Configures

`AddLocalApiAuthentication()` sets up:

- An authentication handler named `IdentityServerAccessToken` (available as `IdentityServerConstants.LocalApi.AuthenticationScheme`)
- An authorization policy named `IdentityServerConstants.LocalApi.PolicyName` that requires the `IdentityServerApi` scope

### Requiring the IdentityServerApi Scope

Clients that access local APIs must include `IdentityServerApi` in their allowed scopes:

```csharp
// IdentityServer configuration
var client = new Client
{
    ClientId = "local_client",
    AllowedScopes = { "openid", "profile", "IdentityServerApi" }
};
```

### Protecting Local API Endpoints

```csharp
// Using the built-in policy
app.MapGet("/local-api/data", () => Results.Ok(data))
    .RequireAuthorization(IdentityServerConstants.LocalApi.PolicyName);

// Or with controllers
[Authorize(Policy = IdentityServerConstants.LocalApi.PolicyName)]
[ApiController]
[Route("local-api/[controller]")]
public class LocalDataController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(data);
}
```

### Custom Claims Transformation for Local APIs

You can add custom claims from the user store when using local API authentication:

```csharp
builder.Services.AddLocalApiAuthentication(principal =>
{
    principal.Identities.First().AddClaim(
        new Claim("additional_claim", "value"));
    return Task.FromResult(principal);
});
```

## Complete Example: API with JWT, Reference Tokens, and Scope-Based Policies

```csharp
// Program.cs
using Duende.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication("token")
    .AddJwtBearer("token", options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "api1";
        options.TokenValidationParameters.ValidTypes = ["at+jwt"];

        options.ForwardDefaultSelector =
            Selector.ForwardReferenceToken("introspection");
    })
    .AddOAuth2Introspection("introspection", options =>
    {
        options.Authority = "https://identity.example.com";
        options.ClientId = "api1";
        options.ClientSecret = "api1_secret";
    });

// Custom claims transformation to normalize space-delimited scope claims
builder.Services.AddTransient<IClaimsTransformation, ScopeClaimsTransformation>();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("read", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("scope", "api1.read");
    });

    options.AddPolicy("write", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("scope", "api1.write");
    });
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/data", () => Results.Ok(new { message = "Protected data" }))
    .RequireAuthorization("read");

app.MapPost("/data", (DataModel model) => Results.Created())
    .RequireAuthorization("write");

app.Run();
```

## Common Anti-Patterns

- WRONG Omitting `ValidTypes = ["at+jwt"]` -- allows JWT confusion attacks where identity tokens are accepted as access tokens
- OK Always validate the `at+jwt` type header

- WRONG Using `AddOAuth2Introspection` without configuring `ApiSecrets` on the `ApiResource`
- OK Always set a shared secret between the API and the introspection endpoint

- WRONG Hardcoding scope checks against a space-delimited string without normalization
- OK Implement a custom `IClaimsTransformation` to split space-delimited scope claims into individual claims

- WRONG Configuring DPoP validation without registering `IDistributedCache`
- OK Always register a distributed cache implementation for DPoP replay detection

- WRONG Using local API authentication but forgetting to add `IdentityServerApi` to client scopes
- OK Clients accessing local APIs must request the `IdentityServerApi` scope

## Common Pitfalls

1. Audience mismatch: The `Audience` in `JwtBearerOptions` must match the `ApiResource` name in IdentityServer. A mismatch causes `401` responses with no clear error message in the API logs.

2. Introspection returns inactive: If introspection returns `active: false`, check that the `ApiResource` secret matches and the scopes are correctly associated with the resource.

3. Scope claim format inconsistency: If IdentityServer emits scopes as a space-delimited string but your policies expect individual claims, authorization will fail silently. Implement a custom `IClaimsTransformation` to normalize.

4. ForwardReferenceToken with wrong scheme name: The scheme name passed to `ForwardReferenceToken()` must exactly match the scheme name used in `AddOAuth2Introspection()`.

5. DPoP nonce stale errors: DPoP nonces have a limited validity window. If the API returns `use_dpop_nonce`, the client must retry with the new nonce from the `DPoP-Nonce` response header.

6. Local API auth in separate host: `AddLocalApiAuthentication()` only works when the API is co-hosted with IdentityServer. For separate API hosts, use JWT bearer or introspection.

7. Missing scope normalization in production: During development, scopes may work because of the default array format. When `EmitScopesAsSpaceDelimitedStringInJwt` is enabled (or changed), policies break without a custom `IClaimsTransformation` to split the scope claim.
