---
name: duende-bff
description: Duende BFF (Backend for Frontend) security framework for securing SPAs. Covers session management, API endpoint proxying, token management, anti-forgery protection, and integration with React/Angular/Blazor frontends.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Duende BFF (Backend for Frontend)

## When to Use This Skill

- Building or securing a SPA (React, Angular, Vue, Blazor WASM) that calls APIs requiring authentication
- Implementing the Backend-for-Frontend security pattern to keep access tokens out of the browser
- Configuring BFF session management, login/logout endpoints, and server-side sessions
- Proxying requests from a frontend to remote APIs while automatically attaching access tokens
- Adding CSRF/anti-forgery protection to APIs consumed by browser-based applications
- Integrating `Duende.BFF` with `Duende.AccessTokenManagement` for automatic token refresh
- Deploying a BFF behind a reverse proxy or configuring same-site cookie behavior

## Core Principles

1. Tokens Never Touch the Browser -- The BFF holds all OAuth tokens server-side; the browser only ever sees an HTTP-only, Secure, SameSite cookie
2. CSRF Protection Is Mandatory -- Every BFF API endpoint must require the `X-CSRF: 1` header; use `.AsBffApiEndpoint()` or `MapRemoteBffApiEndpoint` -- never skip it without an explicit alternative
3. Cookie Configuration Determines Security Posture -- `SameSite=Strict` is preferred when the IDP is on the same site; `Lax` is acceptable when cross-site redirects are required after login
4. Server-Side Sessions for Production -- The default in-memory cookie session is unsuitable for production; persist sessions with `Duende.BFF.EntityFramework`
5. Token Management Is Automatic -- BFF integrates with `Duende.AccessTokenManagement`; never manually refresh tokens or pass raw access tokens to the frontend

Docs: https://docs.duendesoftware.com/identityserver/bff

---

## Pattern 1: Setup and Registration (BFF v4)

BFF v4 uses a streamlined registration API that auto-configures OpenID Connect and cookie authentication with recommended defaults.

```csharp
// OK v4: AddBff() with fluent OIDC and cookie configuration
builder.Services.AddBff()
    .ConfigureOpenIdConnect(options =>
    {
        options.Authority = "https://your-idp.example.com";
        options.ClientId = "my-bff-client";
        options.ClientSecret = "secret";
        options.ResponseType = "code";
        options.ResponseMode = "query";

        options.GetClaimsFromUserInfoEndpoint = true;
        options.SaveTokens = true;
        options.MapInboundClaims = false;

        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.Scope.Add("offline_access"); // Required for refresh tokens
    })
    .ConfigureCookies(options =>
    {
        // Use Strict when your IDP is on the same site as the BFF.
        // Use Lax when a cross-site redirect is required (e.g., IDP on a different domain).
        options.Cookie.SameSite = SameSiteMode.Lax;
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseRouting();
app.UseAuthentication();
app.UseBff();          // Adds CSRF anti-forgery enforcement middleware
app.UseAuthorization();

app.Run();
```

```csharp
// WRONG v4: Do NOT manually wire AddCookie + AddOpenIdConnect when using AddBff()
// ConfigureOpenIdConnect and ConfigureCookies handle this correctly
builder.Services.AddAuthentication()
    .AddCookie("cookie")
    .AddOpenIdConnect("oidc", ...); // Bypasses BFF's recommended defaults
```

### BFF v3 Registration

For projects still on v3, explicit scheme setup is required and `MapBffManagementEndpoints()` must be called manually:

```csharp
// OK v3: explicit authentication scheme wiring
builder.Services.AddBff();

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = "cookie";
        options.DefaultChallengeScheme = "oidc";
        options.DefaultSignOutScheme = "oidc";
    })
    .AddCookie("cookie", options =>
    {
        options.Cookie.Name = "__Host-bff";
        options.Cookie.SameSite = SameSiteMode.Strict;
    })
    .AddOpenIdConnect("oidc", options =>
    {
        options.Authority = "https://your-idp.example.com";
        options.ClientId = "my-bff-client";
        options.ClientSecret = "secret";
        options.ResponseType = "code";
        options.SaveTokens = true;
        options.Scope.Add("offline_access");
    });

// ...

app.MapBffManagementEndpoints(); // OK Required in v3
```

### Key Differences: V4 vs V3

| Feature               | V4                                                | V3                                          |
| --------------------- | ------------------------------------------------- | ------------------------------------------- |
| Auth handler setup    | `ConfigureOpenIdConnect()` / `ConfigureCookies()` | Manual `AddCookie()` / `AddOpenIdConnect()` |
| Management endpoints  | Auto-registered                                   | `MapBffManagementEndpoints()` required      |
| Remote API token type | `.WithAccessToken(RequiredTokenType.User)`        | `.RequireAccessToken(TokenType.User)`       |
| Session cleanup       | `.AddSessionCleanupBackgroundProcess()`           | `EnableSessionCleanup` option               |
| Token retriever       | `IAccessTokenRetriever` (implement directly)      | `DefaultAccessTokenRetriever` (inheritable) |
| Multi-frontend        | Built-in `AddFrontend()` API                      | Not supported                               |
| Middleware control     | `AutomaticallyRegisterBffMiddleware` option       | Always automatic                            |

---

## Pattern 2: Login and Logout Endpoints

In BFF v4, management endpoints (`/bff/login`, `/bff/logout`, `/bff/user`, `/bff/backchannel-logout`) are registered automatically by `AddBff()` with the implicit default frontend. In v3, they require an explicit call to `MapBffManagementEndpoints()`.

Login -- A browser navigation to `/bff/login` initiates an OIDC Authorization Code flow. After the IDP redirects back, the BFF sets an HTTP-only authentication cookie.

```csharp
// OK Trigger login from the SPA (browser navigation, not fetch)
// React example:
// window.location.href = '/bff/login?returnUrl=/dashboard';

// OK Optional: supply a returnUrl to redirect after login
// GET /bff/login?returnUrl=/dashboard
// The returnUrl must be a local path; absolute URLs are rejected.
```

Logout -- A browser navigation to `/bff/logout` signs the user out locally and initiates an OIDC end_session flow. It also revokes the refresh token automatically.

```csharp
// OK The sid claim from /bff/user must be passed as a query parameter
// GET /bff/logout?sid=<session-id>
// This is required to prevent CSRF attacks on the logout endpoint.
```

```csharp
// WRONG Do NOT call /bff/logout via fetch() without the sid parameter.
// The logout endpoint validates the sid to prevent cross-site logout attacks.
```

---

## Pattern 3: CSRF / Anti-Forgery Protection

The BFF enforces a custom `X-CSRF` header on every protected endpoint. This triggers a CORS preflight for cross-origin requests, effectively preventing CSRF attacks. The header value is irrelevant -- its presence is sufficient.

### Local (Embedded) API Endpoints

```csharp
// OK Minimal API: decorate with AsBffApiEndpoint()
app.MapGet("/api/data", (HttpContext ctx) => Results.Ok("data"))
    .RequireAuthorization()
    .AsBffApiEndpoint();

// OK MVC Controllers: apply to the entire controller via attribute
[Route("api/data")]
[BffApi]
public class DataController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok("data");
}

// OK MVC Controllers: apply at mapping time
app.MapControllers()
    .RequireAuthorization()
    .AsBffApiEndpoint();
```

```csharp
// WRONG Do NOT expose BFF API endpoints without AsBffApiEndpoint() or BffApi attribute.
// Without it, the x-csrf header is not enforced and the endpoint is CSRF-vulnerable.
app.MapGet("/api/data", () => Results.Ok("data"))
    .RequireAuthorization(); // Missing .AsBffApiEndpoint()
```

### Middleware Order

`UseBff()` must appear after `UseRouting()` but before `UseAuthorization()`. Incorrect order silently disables anti-forgery enforcement.

```csharp
// OK Correct middleware order
app.UseRouting();
app.UseAuthentication();
app.UseBff();           // Must be here
app.UseAuthorization();
app.MapControllers().AsBffApiEndpoint();

// WRONG Wrong: UseBff() after UseAuthorization() -- anti-forgery is not applied
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseBff();           // Too late
```

### Skipping Anti-Forgery

For specific endpoints that cannot send the anti-forgery header (e.g., webhook receivers), use `.SkipAntiforgery()`:

```csharp
// OK Webhook receiver: skip anti-forgery for endpoints that cannot send the header
app.MapPost("/api/webhook", (WebhookPayload payload) => Results.Ok())
    .AsBffApiEndpoint()
    .SkipAntiforgery();
```

### Skipping Response Handling (V4)

By default, BFF converts 401/403 responses from local API endpoints into JSON-friendly responses (no redirect). Use `.SkipResponseHandling()` to bypass this and trigger normal ASP.NET Core authentication redirects:

```csharp
// OK Skip BFF's automatic 401/403 conversion -- triggers actual OIDC redirect on challenge
app.MapGet("/api/interactive", () => Results.Ok("data"))
    .RequireAuthorization()
    .AsBffApiEndpoint()
    .SkipResponseHandling();
```

### Conditional Anti-Forgery (V4)

In v4, `DisableAntiForgeryCheck` is a delegate that allows conditionally skipping anti-forgery per-request:

```csharp
builder.Services.AddBff(options =>
{
    options.DisableAntiForgeryCheck = context =>
        context.Request.Path.StartsWithSegments("/api/webhook");
});
```

---

## Pattern 4: Remote API Proxying

The BFF can act as a reverse proxy to APIs deployed on separate hosts. Requests carry only the session cookie; the BFF exchanges it for an access token before forwarding.

Install the YARP integration package:

```
dotnet add package Duende.BFF.Yarp
```

```csharp
// OK Direct forwarding via MapRemoteBffApiEndpoint
builder.Services.AddBff()
    .AddRemoteApis();

// Maps /api/orders and all sub-paths to https://orders-service/orders
app.MapRemoteBffApiEndpoint("/api/orders", new Uri("https://orders-service/orders"))
    .WithAccessToken(RequiredTokenType.User);    // Attach the user's access token

app.MapRemoteBffApiEndpoint("/api/public", new Uri("https://content-service/public"))
    .WithAccessToken(RequiredTokenType.None);    // Anonymous remote API

app.MapRemoteBffApiEndpoint("/api/internal", new Uri("https://internal-service/api"))
    .WithAccessToken(RequiredTokenType.Client);  // Client credentials token (machine-to-machine)
```

### Token Type Options

| `RequiredTokenType` | Behavior |
|---|---|
| `None` | No token attached; anonymous passthrough |
| `User` | Forwards the current user's access token; challenges if unauthenticated |
| `Client` | Forwards a client credentials token; works even without a logged-in user |
| `UserOrClient` | Forwards user token if available, falls back to client token |
| `UserOrNone` | Forwards user token if logged in, no token if anonymous (no challenge). Replaces v3's `OptionalUserToken` |

### Custom Access Token Retriever (V4)

Implement `IAccessTokenRetriever` to customize per-route token retrieval. In v4, `DefaultAccessTokenRetriever` is internal -- implement the interface directly:

```csharp
// OK Custom token retriever: select token based on route or request context
public class MyTokenRetriever : IAccessTokenRetriever
{
    public Task<AccessTokenResult> GetAccessToken(GetAccessTokenContext context)
    {
        // Custom logic -- e.g., choose token based on route or header
        return Task.FromResult<AccessTokenResult>(
            new BearerTokenResult(context.UserToken, "Bearer"));
    }
}

// Register per-endpoint
app.MapRemoteBffApiEndpoint("/api/custom", new Uri("https://api.example.com"))
    .WithAccessToken(RequiredTokenType.User)
    .WithAccessTokenRetriever<MyTokenRetriever>();
```

### ForwarderRequestConfig (V4)

Configure per-endpoint activity timeout and response buffering for remote API proxying:

```csharp
app.MapRemoteBffApiEndpoint("/api/long-running", new Uri("https://api.example.com"))
    .WithAccessToken(RequiredTokenType.User)
    .WithForwarderRequestConfig(new ForwarderRequestConfig
    {
        ActivityTimeout = TimeSpan.FromMinutes(5),
        AllowResponseBuffering = true
    });
```

```csharp
// OK Restrict access in addition to token requirements
app.MapRemoteBffApiEndpoint("/api/admin", new Uri("https://admin-service/api"))
    .WithAccessToken(RequiredTokenType.User)
    .RequireAuthorization("AdminPolicy");
```

```csharp
// WRONG MapRemoteBffApiEndpoint opens the entire sub-path namespace.
// Do NOT use broad paths like "/" or "/api" unless all sub-routes should be exposed.
app.MapRemoteBffApiEndpoint("/", new Uri("https://backend-service")); // Exposes everything
```

---

## Pattern 5: Session Management

### Server-Side Sessions

Default cookie-based sessions embed claims and tokens in the cookie. For production, move session data server-side: the cookie only carries a session ID, keeping cookie size small and enabling server-initiated revocation.

```csharp
// OK In-memory server-side sessions (development/testing only)
builder.Services.AddBff()
    .AddServerSideSessions();

// OK Production: persist with Entity Framework
// dotnet add package Duende.BFF.EntityFramework
builder.Services.AddBff()
    .AddEntityFrameworkServerSideSessions(options =>
    {
        options.UseSqlServer(builder.Configuration.GetConnectionString("BffSessions"));
    });
```

```csharp
// OK Session cleanup (v4): manual registration required
builder.Services.AddBff(options =>
{
    options.SessionCleanupInterval = TimeSpan.FromMinutes(5);
})
.AddEntityFrameworkServerSideSessions(options =>
{
    options.UseSqlServer(connectionString);
})
.AddSessionCleanupBackgroundProcess();
```

```csharp
// WRONG In-memory sessions are NOT suitable for production.
// Sessions are lost on restart; BFF horizontal scaling requires a shared store.
builder.Services.AddBff()
    .AddServerSideSessions(); // No EF store -- data lives only in process memory
```

### EF Migrations for Session Store

```bash
dotnet ef migrations add UserSessions -o Migrations -c SessionDbContext
dotnet ef database update
```

---

## Pattern 6: Token Management Integration

BFF integrates with `Duende.AccessTokenManagement` (ATM) automatically when `SaveTokens = true` is set on the OIDC handler. Tokens are stored in the server-side session and refreshed transparently.

```csharp
// OK Retrieve the current user access token in a local API endpoint
app.MapGet("/api/data", async (HttpContext ctx, IHttpClientFactory factory) =>
{
    // ATM handles refresh automatically if the token is expired
    var token = await ctx.GetUserAccessTokenAsync();

    var client = factory.CreateClient();
    client.SetBearerToken(token);

    var response = await client.GetAsync("https://remote-service/data");
    return Results.Text(await response.Content.ReadAsStringAsync());
})
.AsBffApiEndpoint();
```

```csharp
// OK Named HttpClient with automatic token management (preferred pattern)
builder.Services.AddUserAccessTokenHttpClient("apiClient", configureClient: client =>
{
    client.BaseAddress = new Uri("https://remote-service/");
});

app.MapGet("/api/proxy", async (IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("apiClient"); // Token attached automatically
    return Results.Text(await (await client.GetAsync("data")).Content.ReadAsStringAsync());
})
.AsBffApiEndpoint();
```

```csharp
// OK Typed HttpClient with token handler
builder.Services.AddHttpClient<RemoteApiClient>(client =>
{
    client.BaseAddress = new Uri("https://remote-service/");
})
.AddUserAccessTokenHandler();
```

```csharp
// WRONG Do NOT manually read tokens from the session and store them in JavaScript.
// This defeats the entire purpose of BFF. Tokens must stay server-side.
var token = await ctx.GetUserAccessTokenAsync();
return Results.Json(new { accessToken = token }); // WRONG Exposes token to browser
```

### Refresh Token Revocation

BFF revokes refresh tokens automatically at logout. Configure rotation behavior on IdentityServer -- BFF clients are confidential clients and do not need rotating (one-time-use) refresh tokens.

```csharp
// OK Manually revoke if needed (e.g., on account compromise)
await HttpContext.RevokeUserRefreshTokenAsync();
```

---

## Pattern 7: SPA Integration

### Session Check Endpoint (`/bff/user`)

The `/bff/user` endpoint returns the current user's claims or `401`. Use it on SPA startup to determine authentication state.

```javascript
// OK React: check session on app load
async function getUser() {
    const response = await fetch('/bff/user', {
        headers: { 'X-CSRF': '1' }  // Required anti-forgery header
    });
    if (response.ok) {
        return await response.json();
    }
    return null; // 401 = not authenticated
}
```

### Fetch Wrapper for CSRF Header

Every `fetch()` call to a BFF API endpoint must include `X-CSRF: 1`. Wrap `fetch` globally rather than adding it to every call site.

```javascript
// OK Fetch wrapper that automatically appends the required CSRF header
function bffFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            'X-CSRF': '1',
            ...options.headers,
        },
    });
}

// Usage
const data = await bffFetch('/api/orders').then(r => r.json());
```

```javascript
// WRONG Missing X-CSRF header -- BFF will return 401
const data = await fetch('/api/orders').then(r => r.json());
```

### Handling 401 and Session Expiry

BFF API endpoints return `401` (not a redirect) when the session has expired. The SPA must detect this and redirect to `/bff/login`.

```javascript
// OK Centralized 401 handling in fetch wrapper
async function bffFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { 'X-CSRF': '1', ...options.headers },
    });

    if (response.status === 401) {
        // Session expired -- redirect to BFF login endpoint
        window.location.href = `/bff/login?returnUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
    }

    return response;
}
```

### Login and Logout Links

Login and logout are browser navigations, not `fetch` calls. Do not use `fetch` or `XMLHttpRequest` for these flows.

```javascript
// OK Navigate to login (triggers OIDC redirect)
window.location.href = '/bff/login';

// OK Navigate to logout -- must include sid from /bff/user response
const user = await bffFetch('/bff/user').then(r => r.json());
const sid = user.find(c => c.type === 'sid')?.value;
window.location.href = `/bff/logout?sid=${sid}`;
```

---

## Pattern 8: Deployment Considerations

### SameSite Cookie Configuration

| Scenario | Recommended `SameSite` |
|---|---|
| IDP on same site as BFF (e.g., `auth.example.com` and `app.example.com`) | `Strict` |
| IDP on a different domain (e.g., Duende demo, Auth0, Azure AD) | `Lax` |
| Embedded in iframe or third-party context | Not supported -- BFF requires first-party cookie |

```csharp
// OK Strict (preferred when IDP is same-site)
options.Cookie.SameSite = SameSiteMode.Strict;

// OK Lax (required when IDP is on a different domain)
options.Cookie.SameSite = SameSiteMode.Lax;

// WRONG None requires Secure=true and is only appropriate for third-party contexts
// which are fundamentally incompatible with the BFF pattern
options.Cookie.SameSite = SameSiteMode.None;
```

### Reverse Proxy / Path Base

When the BFF is hosted behind a reverse proxy (e.g., nginx, Azure Application Gateway), configure forwarded headers and path base so authentication callbacks resolve correctly.

```csharp
// OK Trust forwarded headers from proxy (add before UseAuthentication)
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

// OK If the BFF is mounted at a sub-path (e.g., /app)
app.UsePathBase("/app");
```

### CORS Policy

The BFF serves the SPA from the same origin, so CORS is typically not needed between the SPA and BFF. CORS should be configured only for cross-origin scenarios.

```csharp
// OK Restrict CORS to known origins if the BFF and SPA are on different origins
builder.Services.AddCors(options =>
{
    options.AddPolicy("SpaPolicy", policy =>
    {
        policy.WithOrigins("https://app.example.com")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for cookie-based auth across origins
    });
});

app.UseCors("SpaPolicy");
```

### Data Protection in Clustered Deployments

When running multiple BFF instances, cookies and anti-forgery tokens must be decryptable by all nodes. Configure a shared Data Protection key store. See [ASP.NET Core Data Protection](https://docs.duendesoftware.com/general/data-protection/) for comprehensive configuration guidance -- BFF depends on Data Protection equally to IdentityServer.

```csharp
// OK Shared key ring (e.g., Azure Blob Storage + Key Vault)
builder.Services.AddDataProtection()
    .PersistKeysToAzureBlobStorage(/* ... */)
    .ProtectKeysWithAzureKeyVault(/* ... */);

// OK Shared key ring via database (e.g., Entity Framework)
builder.Services.AddDataProtection()
    .PersistKeysToDbContext<ApplicationDbContext>();
```

```csharp
// WRONG Default in-memory key ring in multi-instance deployments
// Each instance generates its own keys; cookies from one instance
// cannot be decrypted by another.
builder.Services.AddDataProtection(); // No persistence -- broken in clusters
```

---

## Pattern 9: YARP Reverse Proxy Integration

For complex proxying scenarios, BFF integrates with YARP (Yet Another Reverse Proxy) via the `Duende.BFF.Yarp` package, which provides full BFF token management and anti-forgery enforcement inside the YARP pipeline.

```bash
dotnet add package Duende.BFF.Yarp
```

### Setup with In-Code Configuration

```csharp
// OK YARP with BFF extensions -- in-code route/cluster configuration
builder.Services.AddBff();

var proxyBuilder = builder.Services.AddReverseProxy()
    .AddBffExtensions(); // Register BFF token management for YARP

// Configure routes in code using LoadFromMemory
proxyBuilder.LoadFromMemory(
    routes:
    [
        new RouteConfig
        {
            RouteId = "api",
            ClusterId = "api-cluster",
            Match = new RouteMatch { Path = "/api/{catch-all}" }
        }
        .WithAccessToken(TokenType.User)      // Note: YARP uses TokenType, not RequiredTokenType
        .WithAntiforgeryCheck()
    ],
    clusters:
    [
        new ClusterConfig
        {
            ClusterId = "api-cluster",
            Destinations = new Dictionary<string, DestinationConfig>
            {
                ["default"] = new DestinationConfig
                {
                    Address = "https://upstream-api.example.com"
                }
            }
        }
    ]
);

var app = builder.Build();

app.UseRouting();
app.UseAuthentication();
app.UseBff();
app.UseAuthorization();

// OK UseAntiforgeryCheck() must be explicitly added inside MapReverseProxy
app.MapReverseProxy(proxyApp =>
{
    proxyApp.UseAntiforgeryCheck();
});

app.Run();
```

```csharp
// WRONG Do NOT omit UseAntiforgeryCheck() in the YARP pipeline --
// anti-forgery is not automatically applied to YARP routes
app.MapReverseProxy(); // Missing UseAntiforgeryCheck()
```

### YARP Configuration via appsettings.json

When using JSON configuration instead of `LoadFromMemory`, set BFF behavior via route metadata:

```json
{
  "ReverseProxy": {
    "Routes": {
      "api-route": {
        "ClusterId": "api-cluster",
        "Match": { "Path": "/api/{catch-all}" },
        "Metadata": {
          "Duende.Bff.Yarp.TokenType": "User",
          "Duende.Bff.Yarp.AntiforgeryCheck": "true"
        }
      }
    },
    "Clusters": {
      "api-cluster": {
        "Destinations": {
          "default": { "Address": "https://upstream-api.example.com" }
        }
      }
    }
  }
}
```

> Warning: Metadata keys (`Duende.Bff.Yarp.TokenType`, `Duende.Bff.Yarp.AntiforgeryCheck`) are case-sensitive strings. Typos fail silently -- no token is attached and no anti-forgery check is performed.

### YARP Code Configuration Extensions

Note: YARP routes use `TokenType` (not `RequiredTokenType` which is used by `MapRemoteBffApiEndpoint`).

| Extension                         | Purpose                        |
| --------------------------------- | ------------------------------ |
| `WithAccessToken(TokenType.User)` | Attach user access token       |
| `WithAntiforgeryCheck()`          | Enable anti-forgery validation |
| `WithOptionalUserAccessToken()`   | Attach user token if available |

---

## Pattern 10: Multi-Frontend (V4)

BFF v4 supports serving multiple frontends from a single BFF host. Each frontend gets its own OIDC, cookie, and API configuration. The default single-frontend behavior is an implicit multi-frontend setup with one frontend.

### AutomaticallyRegisterBffMiddleware

By default, BFF middleware is auto-registered. In multi-frontend scenarios, disable this for manual control:

```csharp
builder.Services.AddBff(options =>
{
    options.AutomaticallyRegisterBffMiddleware = false;
});

var app = builder.Build();

app.UseRouting();
app.UseAuthentication();

// OK Register BFF middleware components individually for multi-frontend control
app.UseBffPreProcessing();
app.UseBffFrontendSelection();
app.UseBffPathMapping();
app.UseBffOpenIdCallbacks();
app.UseBffStaticFileProxying();

app.UseAuthorization();
```

### Frontend Configuration (Code)

```csharp
builder.Services.AddBff()
    .AddFrontend("admin", frontend =>
    {
        frontend.MatchingPath = "/admin";
        frontend.CdnIndexHtmlUrl = new Uri("https://cdn.example.com/admin/index.html");

        frontend.ConfigureOpenIdConnect(options =>
        {
            options.Authority = "https://idp.example.com";
            options.ClientId = "admin-client";
            options.ClientSecret = "secret";
        });

        frontend.AddRemoteApi("api", remote =>
        {
            remote.PathMatch = "/api/admin";
            remote.TargetUri = new Uri("https://admin-api.example.com");
            remote.RequiredTokenType = RequiredTokenType.User;
        });
    });
```

### IIndexHtmlTransformer

Implement `IIndexHtmlTransformer` to inject frontend-specific configuration into the `index.html` before serving:

```csharp
public class FrontendConfigTransformer : IIndexHtmlTransformer
{
    public Task<string> TransformAsync(string indexHtml, HttpContext context)
    {
        // Inject runtime configuration into the SPA's index.html
        var config = $"<script>window.__CONFIG__ = {{ api: '/api' }};</script>";
        return Task.FromResult(indexHtml.Replace("</head>", $"{config}</head>"));
    }
}
```

### IndexHtmlDefaultCacheDuration

Control CDN index.html cache duration (default 5 minutes):

```csharp
builder.Services.AddBff(options =>
{
    options.IndexHtmlDefaultCacheDuration = TimeSpan.FromMinutes(10);
});
```

---

## Pattern 11: Blazor Integration

### Blazor Server

```csharp
// OK Blazor Server: AddBlazorServer() integrates BFF session management with the circuit model
builder.Services.AddBff()
    .ConfigureOpenIdConnect(options =>
    {
        options.Authority = "https://identity.example.com";
        options.ClientId = "blazor-server";
        options.ClientSecret = "secret";
        options.ResponseType = "code";
        options.Scope.Add("api1");
        options.Scope.Add("offline_access");
        options.SaveTokens = true;
    })
    .AddBlazorServer();
```

`AddBlazorServer()` integrates BFF session management with Blazor Server's circuit model. Long-lived circuits may encounter expired sessions -- configure appropriate polling intervals via `BffBlazorServerOptions`.

### Blazor WASM (Client)

```csharp
// OK Server-side Program.cs
builder.Services.AddBff()
    .ConfigureOpenIdConnect(options =>
    {
        options.Authority = "https://identity.example.com";
        options.ClientId = "blazor-wasm";
        options.ClientSecret = "secret";
        options.ResponseType = "code";
        options.Scope.Add("api1");
        options.Scope.Add("offline_access");
        options.SaveTokens = true;
    })
    .AddBffBlazorClient();
```

```csharp
// OK Client-side Program.cs (WASM project)
builder.Services.AddBffBlazorClient(options =>
{
    options.RemoteApiPath = "/api/remote";
    options.Polling = new BffBlazorClientPollingOptions
    {
        Interval = TimeSpan.FromSeconds(30) // Default is 5 seconds
    };
});

// AddLocalApiHttpClient<T>() creates a typed HTTP client that routes through the BFF host
builder.Services.AddLocalApiHttpClient<WeatherClient>();
```

### BffBlazorServerOptions

| Option            | Default   | Purpose                           |
| ----------------- | --------- | --------------------------------- |
| `PollingInterval` | 5 seconds | How often to check session status |

### BffBlazorClientOptions

| Option             | Default       | Purpose                         |
| ------------------ | ------------- | ------------------------------- |
| `RemoteApiPath`    | `/api/remote` | Base path for remote API calls  |
| `BaseAddress`      | (from host)   | Base address for API calls      |
| `Polling.Interval` | 5 seconds     | Session status polling interval |

---

## BffOptions Reference

| Option                              | Default     | Purpose                                              |
| ----------------------------------- | ----------- | ---------------------------------------------------- |
| `AntiForgeryHeaderName`             | `"X-CSRF"`  | Name of the anti-forgery header                      |
| `AntiForgeryHeaderValue`            | `"1"`       | Expected value of the anti-forgery header            |
| `ManagementBasePath`                | `"/bff"`    | Base path for management endpoints                   |
| `RevokeRefreshTokenOnLogout`        | `true`      | Revoke refresh tokens on logout                      |
| `AnonymousSessionResponse`          | (null)      | Response for `/bff/user` when anonymous              |
| `BackchannelLogoutAllUserSessions`  | `false`     | Logout all sessions on backchannel notification      |
| `SessionCleanupInterval`            | 10 minutes  | Interval for expired session cleanup                 |
| `AutomaticallyRegisterBffMiddleware`| `true`      | V4: Auto-register BFF middleware; set `false` for multi-frontend manual control |
| `DisableAntiForgeryCheck`           | (null)      | V4: Delegate to conditionally skip anti-forgery per-request |
| `IndexHtmlDefaultCacheDuration`     | 5 minutes   | V4: CDN index.html cache duration                    |
| `Diagnostics.LogFrequency`          | (default)   | V4: How often BFF logs diagnostic information        |
| `Diagnostics.ChunkSize`             | (default)   | V4: Size of diagnostic log chunks                    |

> V4 Breaking Change: `EnableSessionCleanup` has been removed. Use `.AddSessionCleanupBackgroundProcess()` on the BFF builder instead.

---

## Extensibility: Logout Endpoint (V4)

Customize the logout endpoint by implementing `ILogoutEndpoint`:

```csharp
public class CustomLogoutEndpoint : ILogoutEndpoint
{
    private readonly ILogoutEndpoint _inner;

    public CustomLogoutEndpoint(ILogoutEndpoint inner) => _inner = inner;

    public async Task<IResult> ProcessRequestAsync(HttpContext context)
    {
        // Pre-processing: audit log, cleanup, etc.
        var result = await _inner.ProcessRequestAsync(context);
        // Post-processing
        return result;
    }
}
```

Validate return URLs with `IReturnUrlValidator` to prevent open redirector attacks.

---

## Extensibility: Session Store (V4)

V4 uses `UserSessionKey` and `PartitionKey` types instead of raw strings. The `IUserSessionStore` interface:

```csharp
public interface IUserSessionStore
{
    Task<UserSession?> GetUserSessionAsync(UserSessionKey key, CancellationToken ct);
    Task CreateUserSessionAsync(UserSession session, CancellationToken ct);
    Task UpdateUserSessionAsync(UserSessionKey key, UserSessionUpdate session, CancellationToken ct);
    Task DeleteUserSessionAsync(UserSessionKey key, CancellationToken ct);
    Task<IReadOnlyCollection<UserSession>> GetUserSessionsAsync(
        PartitionKey partitionKey, UserSessionsFilter filter, CancellationToken ct);
    Task DeleteUserSessionsAsync(
        PartitionKey partitionKey, UserSessionsFilter filter, CancellationToken ct);
}
```

Register a custom store: `.AddServerSideSessions<YourCustomStore>()`

Session cleanup is a separate concern -- implement `IUserSessionStoreCleanup` and register with `.AddSessionCleanupBackgroundProcess()`.

---

## Common Pitfalls

- Calling `/bff/login` or `/bff/logout` via `fetch()` -- These endpoints trigger OIDC redirects and must be browser navigations (`window.location.href`), not AJAX calls.

- Omitting `offline_access` scope -- Without a refresh token, BFF cannot automatically renew expired access tokens. The user will receive 401 errors from remote APIs when their access token expires.

- Using in-memory sessions in production -- `AddServerSideSessions()` without EF means sessions vanish on restart and cannot be shared across instances. Always use `AddEntityFrameworkServerSideSessions()` in production.

- Forgetting `SaveTokens = true` -- Without this, OIDC tokens are not stored in the session, and `GetUserAccessTokenAsync()` returns nothing. Token management silently fails.

- Missing `X-CSRF: 1` header in SPA fetch calls -- BFF returns 401 for API requests without the header. Centralize header injection in a fetch wrapper rather than adding it to each call site.

- Incorrect middleware order -- `UseBff()` must come after `UseRouting()` and before `UseAuthorization()`. Any deviation silently breaks anti-forgery enforcement without a clear error.

- Exposing access tokens to the frontend -- Returning token values from a local API endpoint to JavaScript completely defeats the BFF pattern and its token-theft protections.

- Using `SameSite=Strict` with a cross-site IDP -- After the OIDC redirect back from the IDP, the browser won't send the post-login session cookie on the first request because it was a cross-site navigation. Use `Lax` when the IDP is on a different site.

- Forgetting to revoke the refresh token on logout -- BFF does this automatically, but if `RevokeRefreshTokenOnLogout = false` is set, abandoned sessions retain valid refresh tokens indefinitely.

- Not configuring Data Protection in multi-instance deployments -- Cookie decryption failures manifest as users being perpetually logged out in load-balanced environments.

- YARP metadata key typos -- When using appsettings.json configuration for YARP, the metadata keys (`Duende.Bff.Yarp.TokenType`, `Duende.Bff.Yarp.AntiforgeryCheck`) are case-sensitive strings. A typo causes silent failure: no token is attached and no anti-forgery check is performed.

- Forgetting `UseAntiforgeryCheck()` in the YARP pipeline -- Unlike `MapRemoteBffApiEndpoint`, YARP's anti-forgery enforcement is not automatic. `proxyApp.UseAntiforgeryCheck()` must be explicitly added inside `MapReverseProxy`; omitting it leaves YARP routes unprotected.

---

## Resources

- [Duende BFF Overview](https://docs.duendesoftware.com/bff/)
- [Getting Started: Single Frontend](https://docs.duendesoftware.com/bff/getting-started/single-frontend/)
- [Embedded (Local) APIs](https://docs.duendesoftware.com/bff/fundamentals/apis/local/)
- [Proxying Remote APIs](https://docs.duendesoftware.com/bff/fundamentals/apis/remote/)
- [Multi-Frontend](https://docs.duendesoftware.com/bff/fundamentals/multi-frontend/)
- [Server-Side Sessions](https://docs.duendesoftware.com/bff/fundamentals/session/server-side-sessions/)
- [Token Management](https://docs.duendesoftware.com/bff/fundamentals/tokens/)
- [Extensibility: Tokens](https://docs.duendesoftware.com/bff/extensibility/tokens/)
- [Extensibility: HTTP Forwarder](https://docs.duendesoftware.com/bff/extensibility/http-forwarder/)
- [Session Management Endpoints](https://docs.duendesoftware.com/bff/fundamentals/session/management/)
- [BFF Options Reference](https://docs.duendesoftware.com/bff/fundamentals/options/)
- [ASP.NET Core Data Protection](https://docs.duendesoftware.com/general/data-protection/)
- [BFF v3 -> v4 Upgrade Guide](https://docs.duendesoftware.com/bff/upgrading/bff-v3-to-v4/)
- [NuGet: Duende.BFF](https://www.nuget.org/packages/Duende.BFF)
- [NuGet: Duende.BFF.Yarp](https://www.nuget.org/packages/Duende.BFF.Yarp)
- [NuGet: Duende.BFF.EntityFramework](https://www.nuget.org/packages/Duende.BFF.EntityFramework)
- Related skills: `duende-aspnetcore-authentication`, `duende-token-management`, `duende-identityserver-configuration`
