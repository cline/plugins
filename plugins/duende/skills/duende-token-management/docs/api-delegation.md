## Pattern 6: API-to-API Token Delegation

An API that receives a user request and needs to call a downstream API can use either the user's access token (delegation) or a client credentials token (machine identity). Both approaches integrate cleanly with `IHttpClientFactory`. This pattern extends the core `duende-token-management` skill.

### Approach A -- Forward the User Token (Downstream API Trusts Upstream's Token)

When the downstream API accepts the same audience as the upstream token, forward it directly:

```csharp
// In the calling API's Program.cs
builder.Services.AddOpenIdConnectAccessTokenManagement();

builder.Services.AddUserAccessTokenHttpClient(
    "downstream",
    configureClient: client =>
    {
        client.BaseAddress = new Uri("https://downstream.company.com/api/");
    });
```

```csharp
// In the controller
public sealed class UpstreamController(IHttpClientFactory factory) : ControllerBase
{
    [HttpGet("data")]
    public async Task<IActionResult> GetData(CancellationToken ct)
    {
        // OK Forwards the current user's access token to the downstream API
        var client = factory.CreateClient("downstream");
        var response = await client.GetAsync("resource", ct);
        return Ok(await response.Content.ReadAsStringAsync(ct));
    }
}
```

### Approach B -- Use a Dedicated Client Credentials Token

When the downstream API requires a service identity rather than a user identity:

```csharp
// In the calling API's Program.cs
services.AddClientCredentialsTokenManagement()
    .AddClient("downstream.client", client =>
    {
        client.TokenEndpoint = new Uri("https://sts.company.com/connect/token");
        client.ClientId = ClientId.Parse("upstream-service");
        client.ClientSecret = ClientSecret.Parse("...");
        client.Scope = Scope.Parse("downstream:read");
    });

services.AddClientCredentialsHttpClient(
    "downstream",
    ClientCredentialsClientName.Parse("downstream.client"),
    client => { client.BaseAddress = new Uri("https://downstream.company.com/api/"); });
```

### Decision Guide

| Scenario | Approach |
|----------|----------|
| Downstream API accepts the same user token audience | A -- forward user token |
| Downstream API requires a service identity | B -- client credentials |
| OAuth 2.0 Token Exchange (RFC 8693) is needed | See `duende-identityserver-token-lifecycle` skill |
