## Pattern 9: Blazor Server Token Management

Blazor Server circuits outlive the initial HTTP request. Once a circuit is established, `HttpContext` is `null`, making the default cookie-based `IUserTokenStore` unusable. The library provides a dedicated extension for this scenario. This pattern extends the core `duende-token-management` skill.

> Why `HttpContext` is unavailable in Blazor circuits -- A Blazor Server circuit is a long-lived SignalR connection. The initial HTTP request that establishes the circuit has an `HttpContext`, but all subsequent interactions happen over the SignalR channel without one. Any code that reads `IHttpContextAccessor.HttpContext` or the authentication cookie store after circuit setup will find `null` or stale data.

### Registration

```csharp
// Program.cs
builder.Services.AddOpenIdConnectAccessTokenManagement()
    .AddBlazorServerAccessTokenManagement<ServerSideTokenStore>();
```

### Custom `IUserTokenStore` Implementation

You must implement `IUserTokenStore` backed by persistent storage (e.g., a database) so that tokens survive across circuit reconnections:

```csharp
public class ServerSideTokenStore : IUserTokenStore
{
    private readonly IDbContextFactory<AppDbContext> _dbFactory;

    public ServerSideTokenStore(IDbContextFactory<AppDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<UserToken> GetTokenAsync(
        ClaimsPrincipal user,
        UserTokenRequestParameters? parameters = null)
    {
        var sub = user.FindFirst("sub")?.Value;
        using var db = await _dbFactory.CreateDbContextAsync();
        var stored = await db.UserTokens.FindAsync(sub);
        return new UserToken
        {
            AccessToken = stored?.AccessToken,
            RefreshToken = stored?.RefreshToken,
            Expiration = stored?.Expiration ?? DateTimeOffset.MinValue
        };
    }

    public async Task StoreTokenAsync(
        ClaimsPrincipal user,
        UserToken token,
        UserTokenRequestParameters? parameters = null)
    {
        var sub = user.FindFirst("sub")?.Value;
        using var db = await _dbFactory.CreateDbContextAsync();
        var stored = await db.UserTokens.FindAsync(sub);
        if (stored == null)
        {
            stored = new StoredUserToken { SubjectId = sub! };
            db.UserTokens.Add(stored);
        }
        stored.AccessToken = token.AccessToken;
        stored.RefreshToken = token.RefreshToken;
        stored.Expiration = token.Expiration;
        await db.SaveChangesAsync();
    }

    public async Task ClearTokenAsync(
        ClaimsPrincipal user,
        UserTokenRequestParameters? parameters = null)
    {
        var sub = user.FindFirst("sub")?.Value;
        using var db = await _dbFactory.CreateDbContextAsync();
        var stored = await db.UserTokens.FindAsync(sub);
        if (stored != null)
        {
            db.UserTokens.Remove(stored);
            await db.SaveChangesAsync();
        }
    }
}
```

### Initializing Tokens via `OnTokenValidated`

Tokens must be captured during the initial OIDC authentication flow -- the only point where `HttpContext` is available. Capture them in `OnTokenValidated` and persist to the custom store:

```csharp
// Program.cs
builder.Services.AddAuthentication()
    .AddOpenIdConnect("oidc", options =>
    {
        // ... other OIDC config ...
        options.SaveTokens = true;
        options.Scope.Add("offline_access");

        options.Events.OnTokenValidated = async context =>
        {
            var store = context.HttpContext.RequestServices
                .GetRequiredService<IUserTokenStore>();
            var token = new UserToken
            {
                AccessToken = context.TokenEndpointResponse?.AccessToken,
                RefreshToken = context.TokenEndpointResponse?.RefreshToken,
                Expiration = DateTimeOffset.UtcNow.AddSeconds(
                    int.Parse(context.TokenEndpointResponse?.ExpiresIn ?? "3600"))
            };
            await store.StoreTokenAsync(context.Principal!, token);
        };
    });
```

### Pitfall: Using `HttpContext` to Access Tokens in Blazor Server Components

```csharp
// WRONG HttpContext is null after circuit establishment -- this will fail at runtime
var token = await HttpContext.GetUserAccessTokenAsync(); // throws NullReferenceException

// OK Use AddBlazorServerAccessTokenManagement<T>() with a custom IUserTokenStore
builder.Services.AddOpenIdConnectAccessTokenManagement()
    .AddBlazorServerAccessTokenManagement<ServerSideTokenStore>();
// Capture tokens in OnTokenValidated (see above)
```

### Related Resources

- [Blazor Server](https://docs.duendesoftware.com/accesstokenmanagement/blazor-server/)
