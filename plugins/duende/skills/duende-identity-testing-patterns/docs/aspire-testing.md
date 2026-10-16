# Aspire Full-Stack Identity Testing

## Pattern 8: Testing with Aspire (Full-Stack)

The identity-specific additions are:

```csharp
// In your AppHost project, expose IdentityServer as a named resource
var idp = builder.AddProject<Projects.IdentityServer>("idp")
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", "Development");

var api = builder.AddProject<Projects.Api>("api")
    .WithReference(idp)
    .WithEnvironment("Authentication__Authority", idp.GetEndpoint("https"));
```

```csharp
// In the Aspire test fixture, wait for the identity server to be healthy
await _app.ResourceNotifications.WaitForResourceHealthyAsync("idp", cts.Token);
await _app.ResourceNotifications.WaitForResourceHealthyAsync("api", cts.Token);

// Obtain tokens from the real in-process identity server
var idpBaseUrl = _app.GetEndpoint("idp", "https");
var tokenResponse = await httpClient.RequestClientCredentialsTokenAsync(
    new ClientCredentialsTokenRequest
    {
        Address = $"{idpBaseUrl}connect/token",
        ClientId = "e2e.test.client",
        ClientSecret = "e2e-secret",
        Scope = "api1"
    });

Assert.False(tokenResponse.IsError, tokenResponse.Error);
```

> Important: Always call `WaitForResourceHealthyAsync("idp", cts.Token)` before issuing tokens. IdentityServer may not be ready when the first test runs and requests will get connection refused errors.
