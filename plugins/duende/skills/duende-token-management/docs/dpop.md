## Pattern 5: DPoP (Demonstrating Proof-of-Possession)

DPoP binds an access token to an asymmetric key so that the token cannot be replayed by an attacker who steals it -- they would also need the private key. This pattern extends the core `duende-token-management` skill.

### Generate a JWK

```csharp
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

// OK Generate once and store securely (Key Vault, configuration secrets)
var rsaKey = new RsaSecurityKey(RSA.Create(2048));
var jwkKey = JsonWebKeyConverter.ConvertFromSecurityKey(rsaKey);
jwkKey.Alg = "PS256";
var jwk = JsonSerializer.Serialize(jwkKey);
```

Supported algorithms: RS, PS, and ES family keys (any JWK-compatible asymmetric key).

### Configure DPoP -- User Token (OpenIdConnect)

```csharp
// OK Set the JWK at startup; the library handles everything else automatically
builder.Services.AddOpenIdConnectAccessTokenManagement(options =>
{
    options.DPoPJsonWebKey = jwk;
});
```

The library automatically:
- Adds `dpop_jkt` to the authorize endpoint request
- Sends a DPoP proof token on every token endpoint call (including token refreshes)
- Sends a DPoP proof token on every outgoing API call made via factory clients

### Configure DPoP -- Client Credentials

```csharp
// OK Per-client DPoP key
services.AddClientCredentialsTokenManagement()
    .AddClient("catalog.client", client =>
    {
        client.TokenEndpoint = new Uri("https://sts.company.com/connect/token");
        client.ClientId = ClientId.Parse("...");
        client.ClientSecret = ClientSecret.Parse("...");
        client.DPoPJsonWebKey = jwk;
    });
```

### Custom DPoP Key Store

Implement `IDPoPKeyStore` to load or rotate the key at runtime rather than at startup:

```csharp
// OK Dynamic key resolution (e.g., from Azure Key Vault)
public sealed class KeyVaultDPoPKeyStore : IDPoPKeyStore
{
    private readonly IKeyVaultClient _keyVault;

    public KeyVaultDPoPKeyStore(IKeyVaultClient keyVault)
    {
        _keyVault = keyVault;
    }

    public async Task<string?> GetKeyAsync(string clientName, CancellationToken ct)
    {
        return await _keyVault.GetSecretAsync($"dpop-key-{clientName}", ct);
    }
}

// Registration
services.AddSingleton<IDPoPKeyStore, KeyVaultDPoPKeyStore>();
```

> DPoP and user session size -- When using DPoP with `AddOpenIdConnectAccessTokenManagement`, the DPoP proof key is stored per user session inside the OIDC `state` parameter and the authentication cookie. This increases cookie and state size. Configure `StateDataFormat` on the OIDC options and `SessionStore` on the cookie options if this becomes a concern.

### Pitfall: Regenerating DPoP Keys on Every Process Restart

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

### Related Resources

- [Advanced: DPoP](https://docs.duendesoftware.com/accesstokenmanagement/advanced/dpop/)
- Server-side DPoP validation: see `duende-identityserver-token-security` skill
