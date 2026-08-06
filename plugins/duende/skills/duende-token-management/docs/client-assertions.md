## Pattern 10: Client Assertions (private_key_jwt)

Use `IClientAssertionService` to authenticate with signed JWTs instead of shared client secrets. This is recommended for production deployments. This pattern extends the core `duende-token-management` skill.

```csharp
public class JwtClientAssertionService : IClientAssertionService
{
    private readonly SigningCredentials _signingCredentials;

    public JwtClientAssertionService(SigningCredentials signingCredentials)
    {
        _signingCredentials = signingCredentials;
    }

    public Task<ClientAssertion?> GetClientAssertionAsync(
        string? clientName = null,
        TokenRequestParameters? parameters = null)
    {
        var now = DateTime.UtcNow;

        var token = new SecurityTokenDescriptor
        {
            Issuer = "my_client_id",
            // OK CRITICAL: Audience must be the authorization server's issuer URL,
            // NOT the token endpoint URL -- see CVE-2025-27370 / CVE-2025-27371
            Audience = "https://identity.example.com",
            Expires = now.AddMinutes(5),
            IssuedAt = now,
            NotBefore = now,
            SigningCredentials = _signingCredentials,
            Claims = new Dictionary<string, object>
            {
                ["sub"] = "my_client_id",
                ["jti"] = Guid.NewGuid().ToString()
            }
        };

        var handler = new JsonWebTokenHandler();
        var jwt = handler.CreateToken(token);

        return Task.FromResult<ClientAssertion?>(new ClientAssertion
        {
            Type = OidcConstants.ClientAssertionTypes.JwtBearer,
            Value = jwt
        });
    }
}

// Registration
builder.Services.AddSingleton<IClientAssertionService, JwtClientAssertionService>();
```

### CRITICAL: Audience for Client Assertions

```csharp
// WRONG WRONG: Audience set to the token endpoint URL
// Root cause of CVE-2025-27370 and CVE-2025-27371
Audience = "https://identity.example.com/connect/token"

// OK CORRECT: Audience must be the authorization server's issuer URL
Audience = "https://identity.example.com"
```

> CVE-2025-27370 / CVE-2025-27371 -- These vulnerabilities were caused by setting the client assertion JWT audience to the token endpoint URL rather than the issuer URL. Authorization servers that accept both values are susceptible to token endpoint confusion attacks. Always set `Audience` to the issuer URL obtained from the OIDC discovery document (`issuer` claim).

### Pitfall: Incorrect Audience Value

```csharp
// WRONG Audience set to the token endpoint -- security vulnerability
// Root cause of CVE-2025-27370 and CVE-2025-27371
Audience = "https://identity.example.com/connect/token"

// OK Audience must be the authorization server's issuer URL
Audience = "https://identity.example.com"
```

> CVE-2025-27370 and CVE-2025-27371 were caused by this exact mistake. Authorization servers that accept both values allow token endpoint confusion attacks.

### Related Resources

- [Advanced: Client Assertions](https://docs.duendesoftware.com/accesstokenmanagement/advanced/client-assertions/)
