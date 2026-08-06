# CORS and Content Security Policy for IdentityServer

## Pattern 8: CORS Configuration

CORS for the token endpoint must be locked to known client origins. Never use `AllowAnyOrigin` for IdentityServer endpoints.

### Per-Client CORS Origins

```csharp
// OK Restrict CORS to the specific origin of each client
new Client
{
    ClientId = "spa.bff",
    AllowedCorsOrigins =
    {
        "https://app.example.com"
        // No trailing slash, no wildcards, exact scheme+host+port
    }
}
```

### Custom CORS Policy Service

For dynamic tenant scenarios, implement `ICorsPolicyService`:

```csharp
// OK Custom CORS policy -- validates against a database of allowed origins
public sealed class TenantCorsPolicyService : ICorsPolicyService
{
    // NOTE: IClientStore only exposes FindClientByIdAsync(string clientId).
    // There is no FindEnabledClientsAsync() method. To enumerate all clients for
    // CORS origin checks you need a custom repository or direct DB query.
    // The example below uses a hypothetical IClientRepository; replace with your
    // own abstraction (e.g. direct EF Core DbContext query).
    private readonly IClientRepository _clientRepository;
    private readonly ILogger<TenantCorsPolicyService> _logger;

    public TenantCorsPolicyService(
        IClientRepository clientRepository,
        ILogger<TenantCorsPolicyService> logger)
    {
        _clientRepository = clientRepository;
        _logger = logger;
    }

    public async Task<bool> IsOriginAllowedAsync(string origin)
    {
        // Normalize: strip trailing slash, lowercase
        var normalizedOrigin = origin.TrimEnd('/').ToLowerInvariant();

        var allClients = await _clientRepository.GetAllClientsAsync();
        var isAllowed = allClients
            .SelectMany(c => c.AllowedCorsOrigins)
            .Select(o => o.TrimEnd('/').ToLowerInvariant())
            .Contains(normalizedOrigin);

        if (!isAllowed)
            _logger.LogWarning("CORS request from unlisted origin: {Origin}", origin);

        return isAllowed;
    }
}
```

Register it:

```csharp
// OK Replace the default CORS policy service
builder.Services.AddTransient<ICorsPolicyService, TenantCorsPolicyService>();
```

---

## Pattern 9: Content Security Policy

IdentityServer's login, consent, and logout UI pages must carry a strong Content Security Policy to prevent XSS and clickjacking attacks.

```csharp
// OK Add CSP middleware for IdentityServer UI pages
app.Use(async (context, next) =>
{
    // Apply CSP only to IdentityServer UI paths
    var path = context.Request.Path.Value ?? string.Empty;
    var isIdentityUiPath =
        path.StartsWith("/account", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/consent", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/connect", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/diagnostics", StringComparison.OrdinalIgnoreCase);

    if (isIdentityUiPath)
    {
        context.Response.Headers.Append("Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self'; " +          // No inline scripts
            "style-src 'self'; " +           // No inline styles
            "img-src 'self' data:; " +       // Allow data: for favicons
            "font-src 'self'; " +
            "frame-ancestors 'none'; " +      // Block embedding in iframes
            "form-action 'self'; " +          // Forms only POST to self
            "base-uri 'self'; " +
            "object-src 'none'");             // No plugins

        // Clickjacking defense -- belt-and-suspenders with CSP frame-ancestors
        context.Response.Headers.Append("X-Frame-Options", "DENY");

        // Force MIME type sniffing protection
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");

        // Referrer control
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    }

    await next();
});
```

> Note: If your IdentityServer UI uses a CDN for Bootstrap or other assets, add those origins to `style-src` and `script-src` with explicit `sha256-` or `nonce-` values rather than broad origins.
