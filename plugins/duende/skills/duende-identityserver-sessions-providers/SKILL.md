---
name: duende-identityserver-sessions-providers
description: "Guide for configuring server-side sessions, session management and querying, inactivity timeout, dynamic identity providers, and CIBA (Client Initiated Backchannel Authentication) in Duende IdentityServer."
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# IdentityServer Sessions, Dynamic Providers, and CIBA

## When to Use This Skill

- Enabling and configuring server-side sessions for authentication state management
- Implementing session querying, revocation, and administrative tooling via `ISessionManagementService`
- Configuring inactivity timeout across IdentityServer and client applications
- Setting up the Entity Framework Core session store or implementing a custom `IServerSideSessionStore`
- Adding dynamic identity providers loaded from a database at runtime
- Implementing custom non-OIDC dynamic provider types (Google, SAML, etc.)
- Building a CIBA (Client Initiated Backchannel Authentication) flow
- Understanding edition requirements (Business vs Enterprise) for these features

Docs: https://docs.duendesoftware.com/identityserver/ui/sessions

## Server-Side Sessions

### What Problem Do They Solve?

By default, ASP.NET Core stores all authentication session state in a self-contained cookie. This creates several challenges:

| Problem                      | Impact                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Cookie size growth           | As clients are tracked, the cookie grows; large cookies can exceed browser limits |
| No session visibility        | Cannot query how many active sessions exist                                       |
| No administrative revocation | Cannot terminate a session from outside the user's browser                        |
| No server-side coordination  | Cannot detect inactivity or synchronize session expiration across clients         |

Server-side sessions store authentication state on the server, keeping only a session reference in the cookie.

### Edition Requirements

Server-side sessions are part of the Duende IdentityServer Business and Enterprise Edition.

### Enabling Server-Side Sessions

```csharp
// Program.cs
builder.Services.AddIdentityServer()
    .AddServerSideSessions();
```

Important: This call must come after any custom `IRefreshTokenService` implementation registration. Order matters in the ASP.NET Core service provider.

By default, sessions are stored in-memory. For production, use Entity Framework Core or a custom store.

### Using Entity Framework Core Store

```csharp
// Program.cs
builder.Services.AddIdentityServer()
    .AddServerSideSessions()
    .AddOperationalStore(options =>
    {
        options.ConfigureDbContext = builder =>
            builder.UseSqlServer(connectionString,
                sql => sql.MigrationsAssembly(migrationsAssembly));
    });
```

The EF Core implementation is included in the operational store and supports the `IServerSideSessionStore` interface automatically.

### Custom Session Store

Implement `IServerSideSessionStore` and register it:

```csharp
// Program.cs -- two-step registration
builder.Services.AddIdentityServer()
    .AddServerSideSessions()
    .AddServerSideSessionStore<YourCustomStore>();

// Or one-step registration
builder.Services.AddIdentityServer()
    .AddServerSideSessions<YourCustomStore>();
```

### Data Stored Server-Side

The session stores the serialized ASP.NET Core `AuthenticationTicket` (all claims + `AuthenticationProperties.Items`). The data is protected using ASP.NET Core's Data Protection API.

Queryable indices extracted from the session:

| Index        | Source                                            |
| ------------ | ------------------------------------------------- |
| Subject ID   | `sub` claim value                                 |
| Session ID   | `sid` claim value                                 |
| Display Name | Configurable claim type (e.g., `name` or `email`) |

Configure the display name claim. Note: `UserDisplayNameClaimType` is unset (null) by default due to PII concerns. You must explicitly set it if you want display names stored in the session index:

```csharp
// Program.cs
builder.Services.AddIdentityServer(options => {
    options.ServerSideSessions.UserDisplayNameClaimType = "name";
}).AddServerSideSessions();
```

## Session Management with ISessionManagementService

### Querying Sessions

```csharp
var userSessions = await _sessionManagementService.QuerySessionsAsync(new SessionQuery
{
    CountRequested = 10,
    SubjectId = "12345",
    DisplayName = "Bob",
});
```

### Paging Through Results

```csharp
// First page
var userSessions = await _sessionManagementService.QuerySessionsAsync(new SessionQuery
{
    CountRequested = 10,
});

// Next page
userSessions = await _sessionManagementService.QuerySessionsAsync(new SessionQuery
{
    ResultsToken = userSessions.ResultsToken,
    CountRequested = 10,
});

// Previous page
userSessions = await _sessionManagementService.QuerySessionsAsync(new SessionQuery
{
    ResultsToken = userSessions.ResultsToken,
    RequestPriorResults = true,
    CountRequested = 10,
});
```

### Performance Note on Querying

When listing sessions, prefer `GetSessionsAsync` over `QuerySessionsAsync`. The `QuerySessionsAsync` method performs a full-text search and may be slower. Use `QuerySessionsAsync` only when advanced filtering is needed.

### Terminating Sessions

Terminate sessions and optionally revoke tokens, consents, and send back-channel logout notifications:

```csharp
// Revoke everything for a user
await _sessionManagementService.RemoveSessionsAsync(new RemoveSessionsContext
{
    SubjectId = "12345"
});
```

Selective revocation (filtering by `SessionId` or `ClientIds` is also supported):

```csharp
// Only revoke refresh tokens, keep session and consents
await _sessionManagementService.RemoveSessionsAsync(new RemoveSessionsContext
{
    SubjectId = "12345",
    SessionId = "abc123",        // optional: target a specific session
    ClientIds = { "my_app" },    // optional: target specific clients
    RevokeTokens = true,
    RemoveServerSideSession = false,
    RevokeConsents = false,
    SendBackchannelLogoutNotification = false,
});
```

### What Gets Cleaned Up

| Flag                                                | Effect                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `RemoveServerSideSession` (default: true)           | Deletes the session record from the store                        |
| `RevokeTokens` (default: true)                      | Revokes refresh tokens and reference access tokens               |
| `RevokeConsents` (default: true)                    | Removes persisted consent grants                                 |
| `SendBackchannelLogoutNotification` (default: true) | Sends back-channel logout to clients with `BackChannelLogoutUri` |

Internally, this uses `IServerSideTicketStore`, `IPersistedGrantStore`, and `IBackChannelLogoutService`.

## Inactivity Timeout

### The Challenge

OpenID Connect does not natively provide distributed session management based on user inactivity. Multiple artifacts (cookies, refresh tokens, access tokens) have independent lifetimes controlled by different entities. Coordinating their expiration is non-trivial.

### Design: Centralized Session Tracking

Server-side sessions at IdentityServer provide the central record for monitoring user activity:

1. Activity signals: As the user's client uses refresh tokens, introspection, or userinfo, these protocol calls extend the server-side session automatically via an internal `ISessionCoordinationService` (this is an implementation detail, not a public API for consumers).
2. Inactivity detection: When no activity occurs within the session timeout, the session expires and cleanup is triggered (back-channel logout, token revocation).

### Configuration at IdentityServer

Three features must be enabled:

```csharp
// Program.cs
builder.Services.AddIdentityServer(options =>
{
    // 1. Enable server-side sessions
    // (done separately via .AddServerSideSessions())

    // 2. Coordinate client token lifetimes with the user session
    options.Authentication.CoordinateClientLifetimesWithUserSession = true;

    // 3. Trigger back-channel logout when sessions expire
    // This is already true by default, shown here for explicitness
    options.ServerSideSessions.ExpiredSessionsTriggerBackchannelLogout = true;
}).AddServerSideSessions();
```

Note: `ExpiredSessionsTriggerBackchannelLogout` defaults to `true`, so step 3 is technically optional. The only setting you must explicitly enable is `CoordinateClientLifetimesWithUserSession` (step 2).

Alternatively, enable coordination per-client:

```csharp
var client = new Client
{
    ClientId = "my_app",
    CoordinateLifetimeWithUserSession = true
};
```

### Client-Side Configuration

| Client Type                               | How Activity Is Signaled                  | How Inactivity Is Detected                                     |
| ----------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| Client with refresh tokens                | Refresh token requests extend the session | Handle refresh token failure, or implement back-channel logout |
| Client with reference tokens (no refresh) | Introspection extends the session         | Handle `401` from API, or implement back-channel logout        |
| Client without access tokens              | Cannot signal activity                    | Must implement back-channel logout                             |

Critical: Configure access token lifetime to be shorter than the server-side session lifetime at IdentityServer, so that refresh token usage naturally keeps the session alive.

## Session Expiration and Cleanup

When a session cookie expires without explicit logout, the server-side session record remains in the store. An automatic cleanup job periodically scans for and removes these expired records.

### Expiration Configuration Options

All options are on `options.ServerSideSessions`:

| Option | Default | Description |
| ------ | ------- | ----------- |
| `RemoveExpiredSessions` | `true` | Enables periodic cleanup of expired sessions |
| `RemoveExpiredSessionsFrequency` | 10 minutes | How often the cleanup job runs |
| `RemoveExpiredSessionsBatchSize` | 100 | Number of expired records removed per batch |
| `ExpiredSessionsTriggerBackchannelLogout` | `true` | Send back-channel logout notifications when expired sessions are cleaned up |
| `FuzzExpiredSessionRemovalStart` | `true` | Randomize the first cleanup run to avoid multi-instance conflicts |

### Customizing the Cleanup Interval

```csharp
// Program.cs
builder.Services.AddIdentityServer(options => {
    options.ServerSideSessions.RemoveExpiredSessionsFrequency = TimeSpan.FromSeconds(60);
}).AddServerSideSessions();
```

### Disabling Automatic Cleanup

```csharp
builder.Services.AddIdentityServer(options => {
    options.ServerSideSessions.RemoveExpiredSessions = false;
}).AddServerSideSessions();
```

### Configuring Session Lifetime

The server-side session lifetime is inherited from the cookie authentication handler:

- Default (no ASP.NET Identity): Controlled by `options.Authentication.CookieLifetime` (defaults to 10 hours)
- With ASP.NET Core Identity: Controlled by `ConfigureApplicationCookie(options => options.ExpireTimeSpan = ...)` (defaults to 14 days)

## Dynamic Identity Providers

### Edition Requirements

Dynamic identity providers are part of the Duende IdentityServer Enterprise Edition.

### Problem Statement

Statically registering many authentication handlers via `AddOpenIdConnect()` has performance penalties in ASP.NET Core's DI system. It also requires application restart for configuration changes.

### Solution

Dynamic providers are loaded from a store at runtime, avoiding DI overhead and enabling live configuration changes.

### Store Options

| Store                 | Implementation                     |
| --------------------- | ---------------------------------- |
| In-memory             | `AddInMemoryIdentityProviders()`   |
| Entity Framework Core | Via `ConfigurationDbContext`       |
| Custom                | Implement `IIdentityProviderStore` |

### Adding a Dynamic OIDC Provider (In-Memory)

```csharp
// Program.cs
builder.Services.AddIdentityServer()
    .AddInMemoryIdentityProviders(new[]
    {
        new OidcProvider
        {
            Scheme = "oidc",
            DisplayName = "Sample provider",
            Enabled = true,
            // ... more properties
        }
    });
```

### Adding a Dynamic OIDC Provider (Entity Framework)

```csharp
// SeedData.cs
private static async Task SeedDynamicProviders(ConfigurationDbContext context)
{
    if (!context.IdentityProviders.Any())
    {
        context.IdentityProviders.Add(new OidcProvider
        {
            Scheme = "demoidsrv",
            DisplayName = "IdentityServer (dynamic)",
            Authority = "https://demo.duendesoftware.com",
            ClientId = "login",
        }.ToEntity());

        await context.SaveChangesAsync();
    }
}
```

### Caching Dynamic Providers

By default, dynamic provider configuration is loaded from the store on every request. Enable caching:

- EF stores: Use `AddConfigurationStoreCache()`
- Custom stores: Use `AddIdentityProviderStoreCache<T>()`

### Listing Dynamic Providers on the Login Page

Merge static and dynamic providers:

```csharp
// Login.cshtml.cs
var schemes = await _schemeProvider.GetAllSchemesAsync();

var providers = schemes
    .Where(x => x.DisplayName != null)
    .Select(x => new ExternalProvider
    {
        DisplayName = x.DisplayName ?? x.Name,
        AuthenticationScheme = x.Name
    }).ToList();

var dynamicSchemes = (await _identityProviderStore.GetAllSchemeNamesAsync())
    .Where(x => x.Enabled)
    .Select(x => new ExternalProvider
    {
        AuthenticationScheme = x.Scheme,
        DisplayName = x.DisplayName
    });

providers.AddRange(dynamicSchemes);
```

### Callback Path Convention

Dynamic providers follow the convention `~/federation/{scheme}/{suffix}`:

| Path                                    | Purpose                                            |
| --------------------------------------- | -------------------------------------------------- |
| `/federation/{scheme}/signin`           | OIDC redirect URI (`CallbackPath`)                 |
| `/federation/{scheme}/signout-callback` | Post-logout redirect URI (`SignedOutCallbackPath`) |
| `/federation/{scheme}/signout`          | Front-channel logout URI (`RemoteSignOutPath`)     |

Customize the prefix:

```csharp
builder.Services.AddIdentityServer(options =>
{
    options.DynamicProviders.PathPrefix = "/fed";
});
```

### Custom (Non-OIDC) Dynamic Providers

To add providers like Google or SAML:

Step 1: Create a custom `IdentityProvider` type:

```csharp
public class GoogleIdentityProvider : IdentityProvider
{
    public const string ProviderType = "google";

    public GoogleIdentityProvider() : base(ProviderType) { }

    public string? ClientId
    {
        get => this["ClientId"];
        set => this["ClientId"] = value;
    }

    public string? ClientSecret
    {
        get => this["ClientSecret"];
        set => this["ClientSecret"] = value;
    }
}
```

Step 2: Register the handler mapping:

```csharp
// Program.cs
builder.Services.AddIdentityServer(options =>
{
    options.DynamicProviders
        .AddProviderType<GoogleHandler, GoogleOptions, GoogleIdentityProvider>(
            GoogleIdentityProvider.ProviderType);
});
```

Step 3: Configure options mapping:

```csharp
class GoogleDynamicConfigureOptions
    : ConfigureAuthenticationOptions<GoogleOptions, GoogleIdentityProvider>
{
    public GoogleDynamicConfigureOptions(IHttpContextAccessor httpContextAccessor,
        ILogger<GoogleDynamicConfigureOptions> logger) : base(httpContextAccessor, logger) { }

    protected override void Configure(
        ConfigureAuthenticationContext<GoogleOptions, GoogleIdentityProvider> context)
    {
        var googleProvider = context.IdentityProvider;
        var googleOptions = context.AuthenticationOptions;

        googleOptions.ClientId = googleProvider.ClientId;
        googleOptions.ClientSecret = googleProvider.ClientSecret;
        googleOptions.SignInScheme = context.DynamicProviderOptions.SignInScheme;
        googleOptions.CallbackPath = context.PathPrefix + "/signin";
    }
}
```

Register it:

```csharp
builder.Services.ConfigureOptions<GoogleDynamicConfigureOptions>();
```

### Customizing OpenIdConnectOptions for Dynamic Providers

Implement `IConfigureNamedOptions<OpenIdConnectOptions>` for per-scheme customization:

```csharp
public class CustomConfig : IConfigureNamedOptions<OpenIdConnectOptions>
{
    public void Configure(string name, OpenIdConnectOptions options)
    {
        if (name == "MyScheme")
        {
            // customize options
        }
    }

    public void Configure(OpenIdConnectOptions options) { }
}
```

Register: `builder.Services.ConfigureOptions<CustomConfig>();`

For customizations that need access to the `OidcProvider` data (e.g., the `Properties` bag), derive from `ConfigureAuthenticationOptions<OpenIdConnectOptions, OidcProvider>` instead.

## CIBA (Client Initiated Backchannel Authentication)

### Edition Requirements

CIBA is part of the Duende IdentityServer Enterprise Edition.

### What Is CIBA?

CIBA allows a user to authenticate on a different device than the one running the client application. Example: a user at a bank kiosk authenticates via their mobile phone.

### CIBA Flow

1. Client sends a backchannel authentication request to IdentityServer's `/connect/ciba` endpoint
2. IdentityServer validates the request and identifies the user via `IBackchannelAuthenticationUserValidator` (you must implement this)
3. IdentityServer creates a pending login request in the `IBackchannelAuthenticationRequestStore`
4. IdentityServer notifies the user via `IBackchannelAuthenticationUserNotificationService` (you must implement this -- e.g., push notification, email, SMS)
5. User reviews and approves/denies the request; your UI calls `IBackchannelAuthenticationInteractionService.CompleteLoginRequestAsync`
6. Client polls the token endpoint and receives tokens (or an error if denied/timed out)

### Required Implementations

| Interface                                           | Your Responsibility                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `IBackchannelAuthenticationUserValidator`           | Validate the request and return the user's `sub` claim                          |
| `IBackchannelAuthenticationUserNotificationService` | Notify the user (push, email, SMS, etc.) with the `BackchannelUserLoginRequest` |

### Completing the Login Request

```csharp
// In your CIBA approval UI
var request = await _cibaInteraction.GetLoginRequestByInternalIdAsync(internalId);

await _cibaInteraction.CompleteLoginRequestAsync(new CompleteBackchannelLoginRequest(internalId)
{
    ScopesValuesConsented = request.ValidatedResources.RawScopeValues,
    // Or a subset if the user partially consents
});
```

IdentityServer supports the `poll` mode for clients to obtain results.

## Common Anti-Patterns

- WRONG Using in-memory session store in production -- sessions are lost on restart
- OK Use Entity Framework Core or a custom durable store for production

- WRONG Registering hundreds of static authentication handlers via `AddOpenIdConnect()`
- OK Use dynamic identity providers for scalable provider management

- WRONG Assuming inactivity timeout works automatically without enabling `CoordinateClientLifetimesWithUserSession`
- OK Explicitly enable coordination at the global or per-client level

- WRONG Using `QuerySessionsAsync` for simple session listing
- OK Prefer `GetSessionsAsync` -- it is faster; use `QuerySessionsAsync` only for advanced filtering

- WRONG Forgetting to implement `IBackchannelAuthenticationUserValidator` and `IBackchannelAuthenticationUserNotificationService` for CIBA
- OK Both interfaces must be implemented and registered in DI -- IdentityServer does not provide defaults

## Common Pitfalls

1. Registration order matters: `AddServerSideSessions()` must be called after any custom `IRefreshTokenService` registration.

2. Data Protection dependency: Server-side session data is protected using ASP.NET Core Data Protection. Ensure Data Protection keys are persisted and shared across load-balanced instances.

3. Session expiration vs cookie expiration: The server-side session has its own lifetime. When a session expires server-side, the user's cookie becomes invalid even if the cookie itself hasn't expired.

4. Dynamic provider store is read-only: `IIdentityProviderStore` only has query methods. To add/update/delete providers, use `ConfigurationDbContext` directly (for EF) or your own mechanism (for custom stores).

5. CIBA requires Enterprise Edition: Attempting to use CIBA features without the Enterprise Edition license will fail at runtime.

6. Access token lifetime must be shorter than session timeout: For inactivity timeout to work, refresh token usage must happen regularly enough to signal activity. If the access token lives longer than the session timeout, the client won't refresh in time.
