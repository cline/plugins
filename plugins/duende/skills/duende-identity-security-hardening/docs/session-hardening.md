# Session Security Hardening for IdentityServer

## Pattern 11: Session Security

Server-side sessions provide centralized session control with absolute lifetimes, idle timeouts, and back-channel logout propagation.

```csharp
// OK Server-side session configuration with hardened lifetimes
builder.Services.AddIdentityServer(options =>
{
    // NOTE: Server-side sessions are enabled by calling AddServerSideSessions()
    // on the IdentityServer builder (see below) -- there is no Enabled property here.
    options.ServerSideSessions.RemoveExpiredSessions = true;
    options.ServerSideSessions.RemoveExpiredSessionsFrequency = TimeSpan.FromMinutes(10);

    // Trigger back-channel logout when a session expires server-side
    options.ServerSideSessions.ExpiredSessionsTriggerBackchannelLogout = true;

    // Tie client token lifetimes to the user session
    options.Authentication.CoordinateClientLifetimesWithUserSession = true;

    // Absolute cookie lifetime -- session cannot outlive this
    options.Authentication.CookieLifetime = TimeSpan.FromHours(8);

    // No sliding expiration -- prevents indefinitely-extended sessions
    options.Authentication.CookieSlidingExpiration = false;
});

// Enable server-side sessions (Business/Enterprise edition) -- call on the builder
idsvrBuilder.AddServerSideSessions();
```

### Back-Channel Logout

Configure clients for back-channel logout so that IdentityServer can notify them when a session ends:

```csharp
// OK Client with back-channel logout
new Client
{
    ClientId = "web.app",
    AllowedGrantTypes = GrantTypes.Code,
    RequirePkce = true,

    // Back-channel logout: server-to-server notification (preferred over front-channel)
    BackChannelLogoutUri = "https://app.example.com/bff/backchannel",
    BackChannelLogoutSessionRequired = true,

    CoordinateLifetimeWithUserSession = true
}
```
