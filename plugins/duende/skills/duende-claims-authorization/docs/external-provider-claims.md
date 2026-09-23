# Claims from External Identity Providers

## Claims from External Providers

When a user authenticates through an external provider, IdentityServer receives claims from that provider in a temporary external cookie. The login callback is where you normalize them into your internal claim model.

### Callback Pattern

```csharp
// ExternalController.cs (login callback)
public async Task<IActionResult> Callback()
{
    // Read the external cookie written by the OIDC/OAuth handler
    var result = await HttpContext.AuthenticateAsync(
        IdentityServerConstants.ExternalCookieAuthenticationScheme);

    if (result?.Succeeded != true)
    {
        throw new InvalidOperationException("External authentication error");
    }

    var externalUser = result.Principal
        ?? throw new InvalidOperationException("No external principal");

    // Extract the provider's user identifier
    // Different providers use different claim types for their user id
    var userIdClaim = externalUser.FindFirst(JwtClaimTypes.Subject)
        ?? externalUser.FindFirst(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Unknown userid");

    var provider = result.Properties.Items["scheme"]
        ?? throw new InvalidOperationException("No scheme in external result");

    var providerUserId = userIdClaim.Value;

    // Find or provision the local user
    var user = await _userService.FindByExternalProviderAsync(provider, providerUserId)
        ?? await _userService.ProvisionUserAsync(provider, providerUserId, externalUser.Claims);

    // Sign in with the internal subject id -- IProfileService handles claim loading
    var identityServerUser = new IdentityServerUser(user.SubjectId)
    {
        DisplayName = user.DisplayName,
        IdentityProvider = provider,
        AdditionalClaims = MapProviderClaims(externalUser.Claims, provider)
    };

    await HttpContext.SignInAsync(identityServerUser, result.Properties);
    await HttpContext.SignOutAsync(IdentityServerConstants.ExternalCookieAuthenticationScheme);

    var returnUrl = result.Properties.Items["returnUrl"] ?? "~/";
    return Redirect(returnUrl);
}

private static ICollection<Claim> MapProviderClaims(
    IEnumerable<Claim> externalClaims,
    string provider)
{
    return provider switch
    {
        "google" => MapGoogleClaims(externalClaims),
        "aad"    => MapAzureAdClaims(externalClaims),
        _        => []
    };
}

private static ICollection<Claim> MapGoogleClaims(IEnumerable<Claim> claims)
{
    var mapped = new List<Claim>();
    var hd = claims.FirstOrDefault(c => c.Type == "hd")?.Value;
    if (hd is not null)
    {
        mapped.Add(new Claim("google_hd", hd));  // hosted domain
    }
    return mapped;
}

private static ICollection<Claim> MapAzureAdClaims(IEnumerable<Claim> claims)
{
    var mapped = new List<Claim>();

    // AAD "oid" -> internal "aad_oid" for correlation
    var oid = claims.FirstOrDefault(c => c.Type == "oid")?.Value;
    if (oid is not null)
    {
        mapped.Add(new Claim("aad_oid", oid));
    }

    // Map AAD groups to local roles
    foreach (var group in claims.Where(c => c.Type == "groups"))
    {
        if (AadGroupRoleMap.TryGetValue(group.Value, out var role))
        {
            mapped.Add(new Claim(JwtClaimTypes.Role, role));
        }
    }

    return mapped;
}
```

### Using Claim Actions (Remote Authentication Handlers)

For OIDC handlers where you configure the handler declaratively, use `ClaimActions` to whitelist and remap incoming claims:

```csharp
// OK Whitelist and rename specific claims from Azure AD
builder.Services.AddAuthentication()
    .AddOpenIdConnect("aad", "Azure AD", options =>
    {
        options.Authority = "https://login.microsoftonline.com/{tenantId}/v2.0";
        options.ClientId = "...";
        options.MapInboundClaims = false;
        options.SignInScheme = IdentityServerConstants.ExternalCookieAuthenticationScheme;

        // Remove all default claim mappings
        options.ClaimActions.Clear();

        // Explicitly map only what you need
        options.ClaimActions.MapJsonKey(JwtClaimTypes.Subject, "oid");
        options.ClaimActions.MapJsonKey(JwtClaimTypes.Email, "email");
        options.ClaimActions.MapJsonKey(JwtClaimTypes.Name, "name");
        options.ClaimActions.MapJsonKey("department", "department");

        // Map AAD groups to role claims
        options.ClaimActions.MapJsonKey(JwtClaimTypes.Role, "roles");
    });
```
