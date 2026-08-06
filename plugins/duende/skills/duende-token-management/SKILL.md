---
name: duende-token-management
description: Token management patterns using Duende.AccessTokenManagement. Covers client credential token caching, user token refresh, token storage, HttpClientFactory integration, DPoP support, and common configuration pitfalls. Also includes Blazor Server token management.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Token Management

## When to Use This Skill

Use this skill when:
- Building a .NET worker service or daemon that calls APIs using the client credentials flow
- Building an ASP.NET Core web application that calls APIs on behalf of the currently logged-in user
- Integrating `Duende.AccessTokenManagement` or `Duende.AccessTokenManagement.OpenIdConnect` with `IHttpClientFactory`
- Configuring token caching -- in-memory, distributed (Redis), or hybrid -- for machine-to-machine tokens
- Adding DPoP (Demonstrating Proof-of-Possession) key binding to access tokens
- Implementing API-to-API delegation where a downstream service calls further APIs with either user tokens or client credentials
- Revoking refresh tokens on user sign-out

## Core Principles

1. Prefer Automatic Over Manual -- Use `IHttpClientFactory`-integrated clients; they acquire, cache, refresh, and attach tokens transparently. Call `GetAccessTokenAsync` manually only when the factory pattern is insufficient.
2. Never Cache Tokens in Code -- The library owns the cache. Do not store tokens in instance fields, static variables, or application-managed caches. Call the service on every request and let it serve from cache.
3. `SaveTokens = true` Is Required for User Tokens -- The OIDC handler must persist tokens into the authentication session. This is the most common misconfiguration.
4. Refresh Tokens Must Be Revoked at Sign-Out -- Call `e.HttpContext.RevokeRefreshTokenAsync()` in `OnSigningOut` to revoke the refresh token at the authorization server, preventing reuse after logout.
5. v4 Uses `HybridCache`; v3 Uses `IDistributedCache` -- The caching layer changed between major versions. v4's `HybridCache` is two-tier and automatic; v3 requires an explicit `AddDistributedMemoryCache()` or Redis registration.
6. Resiliency Is Included in `AddClientCredentialsHttpClient` -- This registration adds a once-retry handler for `401 Unauthorized` responses (handles token expiry and DPoP nonce challenges). When using `AddClientCredentialsTokenHandler` directly, add it explicitly.

## Related Skills

- `duende-aspnetcore-authentication` -- cookie and OIDC handler setup required for user token management
- `duende-identityserver-configuration` -- configuring the authorization server that issues tokens
- `duende-oauth-oidc-protocols` -- protocol fundamentals underlying client credentials and refresh token flows
- `duende-bff` -- BFF pattern integrates this library automatically for proxied API calls

Docs: https://docs.duendesoftware.com/identityserver/tokens/management

---

## Pattern 1: Machine-to-Machine (Client Credentials) -- Worker Services

### Package

```bash
dotnet add package Duende.AccessTokenManagement
```

### Registration

```csharp
// OK Register one or more named client definitions
services.AddClientCredentialsTokenManagement()
    .AddClient("catalog.client", client =>
    {
        client.TokenEndpoint = new Uri("https://sts.company.com/connect/token");
        client.ClientId = ClientId.Parse("6f59b670-990f-4ef7-856f-0dd584ed1fac");
        client.ClientSecret = ClientSecret.Parse("d0c17c6a-ba47-4654-a874-f6d576cdf799");
        client.Scope = Scope.Parse("catalog inventory");
    })
    .AddClient("invoice.client", client =>
    {
        client.TokenEndpoint = new Uri("https://sts.company.com/connect/token");
        client.ClientId = ClientId.Parse("ff8ac57f-5ade-47f1-b8cd-4c2424672351");
        client.ClientSecret = ClientSecret.Parse("4dbbf8ec-d62a-4639-b0db-aa5357a0cf46");
        client.Scope = Scope.Parse("invoice customers");
    });
```

Available client options:
- `TokenEndpoint` -- URL of the OAuth token endpoint
- `ClientId` / `ClientSecret` -- client credentials
- `ClientCredentialStyle` -- `AuthorizationHeader` (default) or `PostBody`
- `Scope` -- requested scope (optional; overridable per request)
- `Resource` -- resource indicator per RFC 8707 (optional)
- `HttpClientName` -- custom backchannel HTTP client name from the factory
- `DPoPJsonWebKey` -- JWK for DPoP-bound tokens (see Pattern 5)

### Automatic via HttpClientFactory (Recommended)

```csharp
// OK Named client -- token acquired, cached, and attached automatically
services.AddClientCredentialsHttpClient(
    "invoices",
    ClientCredentialsClientName.Parse("invoice.client"),
    client => { client.BaseAddress = new Uri("https://apis.company.com/invoice/"); });

// OK Typed client -- identical behaviour, strongly typed
services.AddHttpClient<CatalogClient>(client =>
    {
        client.BaseAddress = new Uri("https://apis.company.com/catalog/");
    })
    .AddClientCredentialsTokenHandler(ClientCredentialsClientName.Parse("catalog.client"));
```

Usage -- no token code required at the call site:

```csharp
public sealed class WorkerHttpClient(IHttpClientFactory factory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // OK Token acquired, cached, and refreshed transparently
            var client = factory.CreateClient("invoices");
            var response = await client.GetAsync("list", stoppingToken);
            // ...
        }
    }
}
```

> Resiliency handler -- `AddClientCredentialsHttpClient` automatically adds a resiliency handler that retries once on `401 Unauthorized`. This covers token expiry and DPoP nonce challenges. When using `AddClientCredentialsTokenHandler` directly, add it explicitly:
>
> ```csharp
> services.AddHttpClient<CatalogClient>(...)
>     .AddDefaultAccessTokenResiliency()
>     .AddClientCredentialsTokenHandler("catalog.client");
> ```

### Manual Token Retrieval (Advanced)

```csharp
// OK Inject IClientCredentialsTokenManager (v4)
public sealed class WorkerManual(
    IHttpClientFactory factory,
    IClientCredentialsTokenManager tokenManager) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var tokenResult = await tokenManager.GetAccessTokenAsync(
                ClientCredentialsClientName.Parse("catalog.client"),
                ct: stoppingToken);

            if (!tokenResult.Succeeded)
            {
                // log and handle -- do not call .GetToken() without checking first
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                continue;
            }

            var token = tokenResult.GetToken();
            var client = factory.CreateClient();
            client.SetBearerToken(token.AccessToken.ToString());
            var response = await client.GetAsync("https://apis.company.com/catalog/list", stoppingToken);
            // ...
        }
    }
}
```

> In v3, the service was `IClientCredentialsTokenManagementService` and the result was read via `.Value`. In v4 it is `IClientCredentialsTokenManager` and the result is `TokenResult<ClientCredentialsToken>` -- use `.Succeeded` / `.GetToken()`.

---

## Pattern 2: User Token Management -- Web Applications

### Package

```bash
dotnet add package Duende.AccessTokenManagement.OpenIdConnect
```

### Registration

```csharp
// OK Full setup: cookie + OIDC handler + token management
builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = "cookie";
        options.DefaultChallengeScheme = "oidc";
    })
    .AddCookie("cookie", options =>
    {
        options.Cookie.Name = "web";
        // OK Revoke refresh token at sign-out
        options.Events.OnSigningOut = async e =>
        {
            await e.HttpContext.RevokeRefreshTokenAsync();
        };
    })
    .AddOpenIdConnect("oidc", options =>
    {
        options.Authority = "https://sts.company.com";
        options.ClientId = "webapp";
        options.ClientSecret = "secret";
        options.ResponseType = "code";
        options.ResponseMode = "query";

        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.Scope.Add("email");
        options.Scope.Add("invoice");
        options.Scope.Add("offline_access"); // <- required for refresh tokens

        options.GetClaimsFromUserInfoEndpoint = true;
        options.MapInboundClaims = false;

        // OK REQUIRED -- persists access and refresh tokens into the auth session
        options.SaveTokens = true;
    });

// OK Adds all token management services
builder.Services.AddOpenIdConnectAccessTokenManagement();
```

> `SaveTokens = true` is mandatory. Without it, the library cannot read or refresh the user's access token. This is the most common misconfiguration causing `InvalidOperationException` at runtime.

### Automatic via HttpClientFactory (Recommended)

```csharp
// OK Named client using the current user's access token
builder.Services.AddUserAccessTokenHttpClient(
    "invoices",
    configureClient: client =>
    {
        client.BaseAddress = new Uri("https://api.company.com/invoices/");
    });

// OK Typed client using the current user's access token
builder.Services.AddHttpClient<InvoiceClient>(client =>
    {
        client.BaseAddress = new Uri("https://api.company.com/invoices/");
    })
    .AddUserAccessTokenHandler();

// OK Named client using a client credentials token (machine-to-machine, user-independent)
builder.Services.AddClientAccessTokenHttpClient(
    "masterdata.client",
    configureClient: client =>
    {
        client.BaseAddress = new Uri("https://api.company.com/masterdata/");
    });

// OK Typed client using a client credentials token
builder.Services.AddHttpClient<MasterDataClient>(client =>
    {
        client.BaseAddress = new Uri("https://api.company.com/masterdata/");
    })
    .AddClientAccessTokenHandler();
```

Usage in a controller:

```csharp
public sealed class ApiController(IHttpClientFactory httpClientFactory) : Controller
{
    public async Task<IActionResult> CallApi(CancellationToken ct)
    {
        // OK Token attached automatically; refreshed silently if expired
        var client = httpClientFactory.CreateClient("invoices");
        var response = await client.GetAsync("list", ct);
        // ...
    }
}
```

### Manual Token Retrieval (Advanced)

```csharp
// OK v4 -- inject IUserTokenManager
public sealed class HomeController(
    IHttpClientFactory httpClientFactory,
    IUserTokenManager userTokenManager) : Controller
{
    public async Task<IActionResult> CallApi(CancellationToken ct)
    {
        var token = await userTokenManager.GetAccessTokenAsync(User, ct: ct);
        var client = httpClientFactory.CreateClient();
        client.SetBearerToken(token.Value);
        var response = await client.GetAsync("https://api.company.com/invoices", ct);
        // ...
    }
}
```

`HttpContext` extension methods are also available:

```csharp
// OK User access token -- refreshed automatically via refresh token if expired
var userToken = await HttpContext.GetUserAccessTokenAsync();

// OK Client credentials token -- re-requested from the token server if expired
var clientToken = await HttpContext.GetClientAccessTokenAsync();

// OK Revoke refresh token explicitly (also wired into OnSigningOut above)
await HttpContext.RevokeRefreshTokenAsync();
```

### gRPC Support

Use `AddUserAccessTokenHandler` and `AddClientAccessTokenHandler` when registering typed gRPC clients:

```csharp
// OK gRPC client using the current user's access token
builder.Services.AddGrpcClient<Greeter.GreeterClient>(o =>
{
    o.Address = new Uri("https://grpc.company.com");
})
.AddUserAccessTokenHandler();

// OK gRPC client using a client credentials token
builder.Services.AddGrpcClient<Inventory.InventoryClient>(o =>
{
    o.Address = new Uri("https://grpc.company.com");
})
.AddClientAccessTokenHandler();
```

---

## Pattern 3: Token Caching

### v4 -- HybridCache (Default)

In v4, client credentials tokens are cached using `HybridCache` (ASP.NET Core 9+). It is two-tier: in-memory L1 + optional remote L2. No explicit registration is required for the default in-memory tier.

```csharp
// OK Add a distributed remote cache (e.g., Redis) -- HybridCache picks it up automatically as L2
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});
```

Global cache options:

```csharp
// OK Configure lifetime buffer and key prefix
services.AddClientCredentialsTokenManagement(options =>
{
    // Cache tokens 60 s before they expire to avoid serving a near-expired token
    options.CacheLifetimeBuffer = 60;
    options.CacheKeyPrefix = "MyApp.ATM::";
});
```

Default cache key format:

```
{CacheKeyPrefix}::{client_name}::hashed({scope})::hashed({resource})
```

`scope` and `resource` values are MD5-hashed to keep key length bounded. Implement `IClientCredentialsCacheKeyGenerator` to supply custom keys when adding custom `TokenRequestParameters`.

### v3 -- IDistributedCache

```csharp
// OK v3: must explicitly register a distributed cache implementation
services.AddDistributedMemoryCache(); // development / single-instance only

// OK v3: Redis for production
services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = "redis.company.com:6379";
});

services.AddClientCredentialsTokenManagement(options =>
{
    options.CacheLifetimeBuffer = 60;
});
```

### Encrypting Cached Tokens (v4)

When sharing a remote cache with other applications, encrypt tokens at rest using a custom `IHybridCacheSerializer<ClientCredentialsToken>`:

```csharp
// OK Register the encrypted serializer for the ClientCredentialsToken type
services.AddHybridCache()
    .AddSerializer<ClientCredentialsToken, EncryptedHybridCacheSerializer>();

services.AddDataProtection();

public sealed class EncryptedHybridCacheSerializer : IHybridCacheSerializer<ClientCredentialsToken>
{
    private readonly IDataProtector _protector;

    public EncryptedHybridCacheSerializer(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("ClientCredentialsToken");
    }

    public ClientCredentialsToken Deserialize(ReadOnlySequence<byte> source)
    {
        var unprotected = _protector.Unprotect(source.ToArray());
        return JsonSerializer.Deserialize<ClientCredentialsToken>(unprotected)!;
    }

    public void Serialize(ClientCredentialsToken value, IBufferWriter<byte> target)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(value);
        target.Write(_protector.Protect(json));
    }
}
```

### Scoping a Custom Cache to This Library Only

```csharp
// OK Inject a custom HybridCache only for AccessTokenManagement (uses service keys)
services.AddKeyedSingleton<HybridCache>(
    ServiceProviderKeys.ClientCredentialsTokenCache,
    new MyCustomCacheImplementation());
```

---

## Pattern 4: Configuration Options

### `ClientCredentialsTokenManagementOptions`

```csharp
services.AddClientCredentialsTokenManagement(options =>
{
    options.CacheLifetimeBuffer = 60;            // seconds subtracted from token lifetime in cache
    options.CacheKeyPrefix = "MyApp.ATM::";      // prefix for all cache keys
});
```

### `UserTokenManagementOptions`

```csharp
builder.Services.AddOpenIdConnectAccessTokenManagement(options =>
{
    // Override the OIDC challenge scheme if not using the default
    options.ChallengeScheme = "oidc";

    // Enable separate token stores per OIDC scheme (multi-provider setups)
    options.UseChallengeSchemeScopedTokens = false;

    // Scope and resource sent when requesting client credentials tokens from
    // the configured OIDC provider (cannot be inferred from OIDC metadata)
    options.ClientCredentialsScope = "api1 api2";
    options.ClientCredentialsResource = "urn:myapi";

    // How client credentials are sent to the token endpoint
    options.ClientCredentialStyle = ClientCredentialStyle.PostBody;

    // DPoP key for all user token requests from this application
    options.DPoPJsonWebKey = jwk;
});
```

### Per-Request Parameter Overrides

```csharp
// OK Force a fresh token even if a cached one exists
var token = await tokenManager.GetAccessTokenAsync(
    ClientCredentialsClientName.Parse("catalog.client"),
    new TokenRequestParameters { ForceRenewal = true },
    ct: stoppingToken);

// OK Override scope per user token request
var token = await userTokenManager.GetAccessTokenAsync(
    User,
    new UserTokenRequestParameters
    {
        Scope = "invoice:write",
        ForceRenewal = false,
        ChallengeScheme = "oidc"
    },
    ct: ct);
```

For `IHttpClientFactory` clients, parameters are wired at registration time:

```csharp
builder.Services.AddUserAccessTokenHttpClient(
    "invoices",
    parameters: new UserTokenRequestParameters { ForceRenewal = true },
    configureClient: client => { client.BaseAddress = new Uri("https://api.company.com/invoices/"); });
```

---

## Pattern 5: DPoP (Demonstrating Proof-of-Possession)

DPoP binds an access token to a client-held asymmetric key, preventing replay attacks even if the token is stolen. Configure it by setting `DPoPJsonWebKey` on the client credentials client or `UserTokenManagementOptions`, and optionally implement `IDPoPKeyStore` for runtime key rotation.

> Full details in sub-document -- See [`docs/dpop.md`](docs/dpop.md) for JWK generation, per-client configuration, `IDPoPKeyStore`, session size implications, and the key-persistence pitfall.

---

## Pattern 6: API-to-API Token Delegation

An API can either forward the user's access token to a downstream API (when the downstream accepts the same audience) or use a dedicated client credentials token (when the downstream requires a service identity).

> Full details in sub-document -- See [`docs/api-delegation.md`](docs/api-delegation.md) for both approaches with complete code examples and a decision guide.

---

## Pattern 7: Dynamic Client Configuration

Use `IConfigureNamedOptions<ClientCredentialsClient>` when token endpoint configuration must be resolved at runtime -- for example, from OIDC discovery:

```csharp
public sealed class ClientCredentialsConfigureOptions(DiscoveryCache cache)
    : IConfigureNamedOptions<ClientCredentialsClient>
{
    public void Configure(string? name, ClientCredentialsClient options)
    {
        if (name == "catalog.client")
        {
            // OK Resolve token endpoint from OIDC discovery document
            var disco = cache.GetAsync().GetAwaiter().GetResult();
            options.TokenEndpoint = new Uri(disco.TokenEndpoint);
            options.ClientId = ClientId.Parse("...");
            options.ClientSecret = ClientSecret.Parse("...");
            options.Scope = Scope.Parse("catalog");
        }
    }

    public void Configure(ClientCredentialsClient options) => Configure(string.Empty, options);
}

// Registration
services.AddClientCredentialsTokenManagement();
services.AddSingleton(new DiscoveryCache("https://sts.company.com"));
services.AddSingleton<IConfigureOptions<ClientCredentialsClient>, ClientCredentialsConfigureOptions>();
```

---

## Pattern 8: Custom Token Storage

### User Tokens -- Replace the Default Cookie Session Store

By default, user access and refresh tokens are stored inside the ASP.NET Core authentication cookie. Replace `IUserTokenStore` when this is insufficient -- for example, when using server-side sessions:

```csharp
// OK Register a custom implementation backed by server-side session storage
builder.Services.AddSingleton<IUserTokenStore, ServerSideSessionUserTokenStore>();
```

### Client Credentials -- Replace the Cache Implementation

```csharp
// OK Override the entire cache with a custom IClientCredentialsTokenCache
services.AddSingleton<IClientCredentialsTokenCache, MyCustomTokenCache>();
```

---

## Pattern 9: Blazor Server Token Management

Blazor Server circuits outlive the initial HTTP request. Once a circuit is established, `HttpContext` is `null`, making the default cookie-based `IUserTokenStore` unusable. Use `AddBlazorServerAccessTokenManagement<T>()` with a persistent `IUserTokenStore` (e.g., database-backed), and capture tokens in `OnTokenValidated` during the initial OIDC flow.

> Full details in sub-document -- See [`docs/blazor-server.md`](docs/blazor-server.md) for the full `IUserTokenStore` implementation, `OnTokenValidated` setup, and the `HttpContext`-null pitfall.

---

## Pattern 10: Client Assertions (private_key_jwt)

Use `IClientAssertionService` to authenticate with signed JWTs instead of shared client secrets. CRITICAL: set the JWT `Audience` to the authorization server's issuer URL -- NOT the token endpoint URL. Using the token endpoint URL was the root cause of CVE-2025-27370 and CVE-2025-27371.

> Full details in sub-document -- See [`docs/client-assertions.md`](docs/client-assertions.md) for the full `IClientAssertionService` implementation, correct audience configuration, and CVE context.

---

## Pattern 11: Custom Token Request Customization

Use `ITokenRequestCustomizer` (v4) to dynamically modify token request parameters per outgoing HTTP request -- useful for multi-tenant scenarios where different tenants require different API resources or scopes. Use the `with` expression to create a modified copy of `baseParameters`; do not mutate it.

> Full details in sub-document -- See [`docs/customization.md`](docs/customization.md) for the full `ITokenRequestCustomizer` implementation and registration pattern.

---

## Pattern 12: Custom Token Retrieval

Implement `AccessTokenRequestHandler.ITokenRetriever` to completely replace the default token retrieval logic with custom selection or caching behavior.

> Full details in sub-document -- See [`docs/customization.md`](docs/customization.md) for the full `ITokenRetriever` implementation and `AddHttpMessageHandler` registration pattern.

---

## Sub-Documents

Load these sub-documents when the user's question specifically targets one of these areas:

| Document | Description | When to Load |
|----------|-------------|--------------|
| [docs/dpop.md](docs/dpop.md) | DPoP proof-of-possession token binding | DPoP, `DPoPJsonWebKey`, `IDPoPKeyStore`, key generation, key rotation |
| [docs/blazor-server.md](docs/blazor-server.md) | Blazor Server circuit-scoped token management | Blazor, SignalR circuit, `HttpContext` null, `AddBlazorServerAccessTokenManagement` |
| [docs/client-assertions.md](docs/client-assertions.md) | Client assertions (private_key_jwt) + CVE guidance | `IClientAssertionService`, JWT client auth, CVE-2025-27370, CVE-2025-27371 |
| [docs/customization.md](docs/customization.md) | `ITokenRequestCustomizer` & `ITokenRetriever` | Multi-tenant token params, custom token retrieval, `AccessTokenRequestHandler` |
| [docs/api-delegation.md](docs/api-delegation.md) | API-to-API delegation patterns | Downstream API calls, forwarding user tokens, service identity |

---

## Complete Example: Web App with User and Client Credentials

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// User token management via OIDC
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = "cookie";
    options.DefaultChallengeScheme = "oidc";
})
.AddCookie("cookie", options =>
{
    options.Cookie.Name = "web";
    options.Events.OnSigningOut = async e =>
    {
        await e.HttpContext.RevokeRefreshTokenAsync();
    };
})
.AddOpenIdConnect("oidc", options =>
{
    options.Authority = "https://identity.example.com";
    options.ClientId = "web_app";
    options.ClientSecret = "secret";
    options.ResponseType = "code";
    options.Scope.Add("api1");
    options.Scope.Add("offline_access");
    options.SaveTokens = true;
});

builder.Services.AddOpenIdConnectAccessTokenManagement();

// User token HTTP client -- attaches the logged-in user's access token
builder.Services.AddUserAccessTokenHttpClient("user-api",
    configureClient: client =>
    {
        client.BaseAddress = new Uri("https://api.example.com");
    });

// Client credentials for service-to-service (v4 types)
builder.Services.AddClientCredentialsTokenManagement()
    .AddClient(ClientCredentialsClientName.Parse("service-client"), client =>
    {
        client.TokenEndpoint = new Uri("https://identity.example.com/connect/token");
        client.ClientId = ClientId.Parse("web_app_service");
        client.ClientSecret = ClientSecret.Parse("service_secret");
        client.Scope = Scope.Parse("backend.api");
    });

builder.Services.AddClientCredentialsHttpClient("service-api",
    ClientCredentialsClientName.Parse("service-client"),
    configureClient: client =>
    {
        client.BaseAddress = new Uri("https://backend.example.com");
    });

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// User-context API call
app.MapGet("/user-data", async (IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("user-api");
    var response = await client.GetAsync("/data");
    return Results.Ok(await response.Content.ReadAsStringAsync());
}).RequireAuthorization();

// Service-to-service API call (no user context needed)
app.MapGet("/backend-data", async (IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("service-api");
    var response = await client.GetAsync("/internal/data");
    return Results.Ok(await response.Content.ReadAsStringAsync());
});

app.Run();
```

---

## Common Pitfalls

### 1. Missing `SaveTokens = true` for User Tokens

```csharp
// WRONG Tokens never stored in session -- library throws InvalidOperationException at runtime
.AddOpenIdConnect("oidc", options =>
{
    // SaveTokens not set -- defaults to false
});

// OK Always set it when using AddOpenIdConnectAccessTokenManagement
options.SaveTokens = true;
```

### 2. Missing `offline_access` Scope

```csharp
// WRONG No refresh token issued -- access token expires and user must re-authenticate
options.Scope.Add("openid");
options.Scope.Add("profile");
// offline_access missing

// OK
options.Scope.Add("offline_access");
```

### 3. Not Revoking Refresh Tokens at Sign-Out

```csharp
// WRONG Refresh token remains valid at the authorization server after sign-out
.AddCookie("cookie", options =>
{
    // No OnSigningOut handler -- refresh token never revoked
});

// OK
.AddCookie("cookie", options =>
{
    options.Events.OnSigningOut = async e =>
    {
        await e.HttpContext.RevokeRefreshTokenAsync();
    };
});
```

### 4. Caching Tokens Manually Alongside the Library

```csharp
// WRONG Double-caching -- your cache won't stay in sync; stale token after expiry
private string? _cachedToken;

public async Task<string> GetToken()
{
    if (_cachedToken != null) return _cachedToken;
    var token = await _tokenManager.GetAccessTokenAsync(...);
    _cachedToken = token.AccessToken.ToString(); // never invalidated
    return _cachedToken;
}

// OK Call GetAccessTokenAsync every time -- the library serves from cache transparently
public async Task<string> GetToken(CancellationToken ct)
{
    var result = await _tokenManager
        .GetAccessTokenAsync(ClientCredentialsClientName.Parse("my.client"), ct: ct)
        .GetToken();
    return result.AccessToken.ToString();
}
```

### 5. Calling `.GetToken()` Without Checking `Succeeded`

```csharp
// WRONG .GetToken() throws InvalidOperationException when token retrieval fails;
// the actual error is swallowed unless you inspect Succeeded first
var tokenResult = await tokenManager.GetAccessTokenAsync(...);
var token = tokenResult.GetToken(); // throws when Succeeded == false

// OK Check success before accessing the token value
var tokenResult = await tokenManager.GetAccessTokenAsync(...);
if (!tokenResult.Succeeded)
{
    logger.LogError("Failed to obtain access token");
    return Problem("Authentication failure", statusCode: StatusCodes.Status503ServiceUnavailable);
}
var token = tokenResult.GetToken();
```

### 6. Using `AddClientCredentialsTokenHandler` Without Resiliency

```csharp
// WRONG A 401 from an expired token is returned directly to the caller -- no retry
services.AddHttpClient<CatalogClient>(...)
    .AddClientCredentialsTokenHandler("catalog.client");

// OK Add the resiliency handler before the token handler
services.AddHttpClient<CatalogClient>(...)
    .AddDefaultAccessTokenResiliency()
    .AddClientCredentialsTokenHandler("catalog.client");
```

### 7. v3 -- Forgetting to Register a Distributed Cache

```csharp
// WRONG v3: no cache registered -- runtime exception on first token request
services.AddClientCredentialsTokenManagement()
    .AddClient("catalog.client", client => { /* ... */ });
// Missing: services.AddDistributedMemoryCache();

// OK v3: always register a distributed cache (in-memory for dev, Redis for prod)
services.AddDistributedMemoryCache();
```

### 8. Regenerating DPoP Keys on Every Process Restart

```csharp
// WRONG New key generated on every restart -- all previously issued DPoP-bound tokens
// become unusable, causing 401 errors until new tokens are obtained
var rsaKey = new RsaSecurityKey(RSA.Create(2048)); // ephemeral -- lost on restart

// OK Load from stable, secure storage
var jwkJson = configuration["DPoP:JsonWebKey"]; // from Key Vault / secrets
services.AddClientCredentialsTokenManagement()
    .AddClient("my.client", client =>
    {
        client.DPoPJsonWebKey = jwkJson;
    });
```

### 9. Setting Client Assertion Audience to the Token Endpoint URL

```csharp
// WRONG Audience set to the token endpoint -- security vulnerability
// Root cause of CVE-2025-27370 and CVE-2025-27371
Audience = "https://identity.example.com/connect/token"

// OK Audience must be the authorization server's issuer URL
Audience = "https://identity.example.com"
```

> CVE-2025-27370 and CVE-2025-27371 were caused by this exact mistake. Authorization servers that accept both values allow token endpoint confusion attacks.

### 10. Using `HttpContext` to Access Tokens in Blazor Server Components

```csharp
// WRONG HttpContext is null after circuit establishment -- this will fail at runtime
var token = await HttpContext.GetUserAccessTokenAsync(); // throws NullReferenceException

// OK Use AddBlazorServerAccessTokenManagement<T>() with a custom IUserTokenStore
builder.Services.AddOpenIdConnectAccessTokenManagement()
    .AddBlazorServerAccessTokenManagement<ServerSideTokenStore>();
// Capture tokens in OnTokenValidated (see Pattern 9)
```

### 11. Setting `CacheLifetimeBuffer` to 0

```csharp
// WRONG Buffer set to 0 -- tokens served until exact expiry; a token may expire
// in transit between retrieval and use at the API, causing unnecessary 401s
services.AddClientCredentialsTokenManagement(options =>
{
    options.CacheLifetimeBuffer = 0;
});

// OK Keep the default (60 s) or set a positive value that accounts for network latency
services.AddClientCredentialsTokenManagement(options =>
{
    options.CacheLifetimeBuffer = 60; // default -- refresh 60 s before expiry
});
```

---

## Version Reference: v3 -> v4

| Area | v3 | v4 |
|---|---|---|
| Client credentials service | `IClientCredentialsTokenManagementService` | `IClientCredentialsTokenManager` |
| User token service | `IUserTokenManagementService` | `IUserTokenManager` |
| Token result type | `TokenResponse` -- read `.Value` | `TokenResult<T>` -- use `.Succeeded` / `.GetToken()` |
| Client name type | `string` | `ClientCredentialsClientName` (strongly typed) |
| Token cache | `IDistributedCache` (explicit `AddDistributedMemoryCache()` required) | `HybridCache` (automatic; picks up `IDistributedCache` as remote L2 tier) |
| Resiliency | Manual | `AddDefaultAccessTokenResiliency()` built into `AddClientCredentialsHttpClient` |

---

## Resources

- [Access Token Management Overview](https://docs.duendesoftware.com/accesstokenmanagement/)
- [Service Workers / Background Tasks](https://docs.duendesoftware.com/accesstokenmanagement/workers/)
- [Web Applications (User Tokens)](https://docs.duendesoftware.com/accesstokenmanagement/web-apps/)
- [Blazor Server](https://docs.duendesoftware.com/accesstokenmanagement/blazor-server/)
- [Advanced: Client Credentials Options](https://docs.duendesoftware.com/accesstokenmanagement/advanced/client-credentials/)
- [Advanced: User Token Options](https://docs.duendesoftware.com/accesstokenmanagement/advanced/user-tokens/)
- [Advanced: Client Assertions](https://docs.duendesoftware.com/accesstokenmanagement/advanced/client-assertions/)
- [Advanced: DPoP](https://docs.duendesoftware.com/accesstokenmanagement/advanced/dpop/)
- [Advanced: Extensibility](https://docs.duendesoftware.com/accesstokenmanagement/advanced/extensibility/)
- [v3 -> v4 Upgrade Guide](https://docs.duendesoftware.com/accesstokenmanagement/upgrading/atm-v3-to-v4/)
- [NuGet: Duende.AccessTokenManagement](https://www.nuget.org/packages/Duende.AccessTokenManagement/)
- [NuGet: Duende.AccessTokenManagement.OpenIdConnect](https://www.nuget.org/packages/Duende.AccessTokenManagement.OpenIdConnect/)
- [GitHub: DuendeSoftware/foss (access-token-management)](https://github.com/DuendeSoftware/foss/tree/main/access-token-management)
