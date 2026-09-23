## Patterns 11-12: Token Request Customization & Custom Retrieval

These patterns provide advanced extensibility for `Duende.AccessTokenManagement` v4. They extend the core `duende-token-management` skill.

## Pattern 11: Custom Token Request Customization

Use `ITokenRequestCustomizer` (v4) to dynamically modify token request parameters per outgoing HTTP request -- useful for multi-tenant scenarios where different tenants require different API resources or scopes.

```csharp
public class TenantTokenRequestCustomizer : ITokenRequestCustomizer
{
    private readonly ITenantResolver _tenantResolver;
    private readonly ITenantConfigStore _tenantConfigStore;

    public TenantTokenRequestCustomizer(
        ITenantResolver tenantResolver,
        ITenantConfigStore tenantConfigStore)
    {
        _tenantResolver = tenantResolver;
        _tenantConfigStore = tenantConfigStore;
    }

    public async Task<TokenRequestParameters> Customize(
        HttpRequestMessage httpRequest,
        TokenRequestParameters baseParameters,
        CancellationToken cancellationToken)
    {
        var tenantId = await _tenantResolver.GetTenantIdAsync(httpRequest, cancellationToken);
        var tenantConfig = await _tenantConfigStore.GetConfigurationAsync(tenantId, cancellationToken);

        // OK Use 'with' expression to create a modified copy -- do not mutate baseParameters
        return baseParameters with
        {
            Resource = Resource.Parse(tenantConfig.ApiResource),
            Scope = Scope.Parse(tenantConfig.RequiredScopes),
        };
    }
}
```

### Registration

Pass the customizer instance to the `Add*Handler` registration methods:

```csharp
var customizer = new TenantTokenRequestCustomizer(tenantResolver, tenantConfigStore);

// OK Client credentials client with customizer
services.AddHttpClient("client-credentials-http-client")
    .AddClientCredentialsTokenHandler(customizer,
        ClientCredentialsClientName.Parse("api-client"));

// OK User access token client with customizer
services.AddHttpClient("user-access-http-client")
    .AddUserAccessTokenHandler(customizer);
```

---

## Pattern 12: Custom Token Retrieval

Implement `AccessTokenRequestHandler.ITokenRetriever` to completely replace the default token retrieval logic -- for example, to combine custom selection logic with the standard token manager:

```csharp
public class CustomTokenRetriever(
    IClientCredentialsTokenManager clientCredentialsTokenManager,
    ClientCredentialsClientName clientName) : AccessTokenRequestHandler.ITokenRetriever
{
    public async Task<TokenResult<AccessTokenRequestHandler.IToken>> GetTokenAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var param = new TokenRequestParameters
        {
            ForceTokenRenewal = request.GetForceRenewal() // for retry policies
        };

        var result = await clientCredentialsTokenManager
            .GetAccessTokenAsync(clientName, param, ct);

        if (!result.Succeeded)
        {
            return result.FailedResult;
        }

        return TokenResult.Success(result.Token);
    }
}
```

### Registration via `AddHttpMessageHandler`

```csharp
services.AddHttpClient<ApiClient>()
    .AddDefaultAccessTokenResiliency()
    .AddHttpMessageHandler(provider =>
    {
        var retriever = new CustomTokenRetriever(
            provider.GetRequiredService<IClientCredentialsTokenManager>(),
            ClientCredentialsClientName.Parse("api-client"));
        var logger = provider.GetRequiredService<ILogger<AccessTokenRequestHandler>>();
        var dPoPProofService = provider.GetRequiredService<IDPoPProofService>();
        var dPoPNonceStore = provider.GetRequiredService<IDPoPNonceStore>();

        return new AccessTokenRequestHandler(
            tokenRetriever: retriever,
            dPoPNonceStore: dPoPNonceStore,
            dPoPProofService: dPoPProofService,
            logger: logger);
    });
```

### Related Resources

- [Advanced: Extensibility](https://docs.duendesoftware.com/accesstokenmanagement/advanced/extensibility/)
