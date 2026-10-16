# Client Types, Authentication Methods, and Properties Reference

## Decision Matrix: Choosing the Right Client Type

| Scenario                      | Grant Type                     | `RequireClientSecret` | Has User |
| ----------------------------- | ------------------------------ | --------------------- | -------- |
| Server-to-server (M2M)        | `GrantTypes.ClientCredentials` | `true`                | No       |
| Web application (server-side) | `GrantTypes.Code`              | `true`                | Yes      |
| SPA / mobile / native         | `GrantTypes.Code`              | `false`               | Yes      |
| Device (TV, IoT)              | `GrantTypes.DeviceFlow`        | varies                | Yes      |

## Machine-to-Machine Client

No interactive user, service-to-service communication:

```csharp
new Client
{
    ClientId = "service.client",
    ClientSecrets = { new Secret("secret".Sha256()) },

    AllowedGrantTypes = GrantTypes.ClientCredentials,
    AllowedScopes = { "api1", "api2.read_only" }
}
```

## Interactive Web Application Client

Authorization code flow with PKCE, back-channel token exchange, refresh tokens:

```csharp
new Client
{
    ClientId = "interactive",

    AllowedGrantTypes = GrantTypes.Code,
    AllowOfflineAccess = true,
    ClientSecrets = { new Secret("secret".Sha256()) },

    RedirectUris =           { "https://myapp.com/signin-oidc" },
    PostLogoutRedirectUris = { "https://myapp.com/" },
    FrontChannelLogoutUri =    "https://myapp.com/signout-oidc",

    AllowedScopes =
    {
        IdentityServerConstants.StandardScopes.OpenId,
        IdentityServerConstants.StandardScopes.Profile,
        IdentityServerConstants.StandardScopes.Email,
        "api1", "api2.read_only"
    }
}
```

## Client Properties Reference

### Basics

| Property               | Default    | Description                                      |
| ---------------------- | ---------- | ------------------------------------------------ |
| `ClientId`             | (required) | Unique client identifier                         |
| `ClientSecrets`        | empty      | Credentials for token endpoint                   |
| `RequireClientSecret`  | `true`     | Set `false` for public clients (SPA, mobile)     |
| `AllowedGrantTypes`    | (required) | Grant types the client can use                   |
| `RequirePkce`          | `true`     | Require PKCE for authorization code flow         |
| `AllowPlainTextPkce`   | `false`    | Allow plain text PKCE (not recommended)          |
| `RedirectUris`         | empty      | Allowed redirect URIs                            |
| `AllowedScopes`        | empty      | Scopes the client can request                    |
| `AllowOfflineAccess`   | `false`    | Allow refresh tokens                             |
| `RequireRequestObject` | `false`    | Require JWT-secured authorization requests (JAR) |

### Token Settings

| Property                           | Default       | Description                              |
| ---------------------------------- | ------------- | ---------------------------------------- |
| `AccessTokenLifetime`              | 3600 (1 hour) | Access token lifetime in seconds         |
| `IdentityTokenLifetime`            | 300 (5 min)   | Identity token lifetime in seconds       |
| `AuthorizationCodeLifetime`        | 300 (5 min)   | Authorization code lifetime in seconds   |
| `AccessTokenType`                  | `Jwt`         | `Jwt` or reference token                 |
| `IncludeJwtId`                     | `true`        | Include `jti` claim in JWT access tokens |
| `AlwaysIncludeUserClaimsInIdToken` | `false`       | Put user claims in id_token vs userinfo  |

### Refresh Token Settings

| Property                           | Default           | Description                                         |
| ---------------------------------- | ----------------- | --------------------------------------------------- |
| `AbsoluteRefreshTokenLifetime`     | 2592000 (30 days) | Max refresh token lifetime                          |
| `SlidingRefreshTokenLifetime`      | 1296000 (15 days) | Sliding window lifetime                             |
| `RefreshTokenUsage`                | `ReUse`           | `ReUse` (same handle) or `OneTimeOnly` (new handle) |
| `RefreshTokenExpiration`           | `Absolute`        | `Absolute` or `Sliding`                             |
| `UpdateAccessTokenClaimsOnRefresh` | `false`           | Refresh claims on token refresh                     |

### Session Settings

| Property                            | Default | Description                            |
| ----------------------------------- | ------- | -------------------------------------- |
| `UserSsoLifetime`                   | `null`  | Max duration since last authentication |
| `CoordinateLifetimeWithUserSession` | `false` | Tie token lifetimes to user session    |

## Client Authentication Methods

### Recommendation

Use asymmetric credentials (`private_key_jwt` or mTLS) over shared secrets in production.

### Method Comparison

| Method                | Security                   | Complexity | Use Case                        |
| --------------------- | -------------------------- | ---------- | ------------------------------- |
| Shared secret     | Lower (secret transmitted) | Low        | Development, simple M2M         |
| Private Key JWT   | Higher (asymmetric)        | Medium     | Production confidential clients |
| mTLS certificates | Highest (TLS-bound)        | High       | High-security, FAPI compliance  |

### Shared Secrets

```csharp
// Production: load hash from secure storage
var hash = loadSecretHash();
var secret = new Secret(hash);

// Prototyping only - NEVER use in production
var compromisedSecret = new Secret("just for demos, not prod!".Sha256());
```

```csharp
// WRONG WRONG: Clear text secret in source code
var client = new Client
{
    ClientSecrets = { new Secret("MyProductionSecret".Sha256()) }
};

// OK CORRECT: Load secret hash from configuration or vault
var client = new Client
{
    ClientSecrets = { new Secret(Configuration["ClientSecretHash"]) }
};
```

### Private Key JWT

Register a client with X.509 certificate or JWK secret:

```csharp
var client = new Client
{
    ClientId = "client.jwt",
    ClientSecrets =
    {
        new Secret
        {
            Type = IdentityServerConstants.SecretTypes.X509CertificateBase64,
            Value = "MIID...xBXQ="
        },
        new Secret
        {
            Type = IdentityServerConstants.SecretTypes.JsonWebKey,
            Value = "{'e':'AQAB','kid':'...','kty':'RSA','n':'...'}"
        }
    },
    AllowedGrantTypes = GrantTypes.ClientCredentials,
    AllowedScopes = { "api1", "api2" }
};
```

Enable the JWT bearer client authentication in DI:

```csharp
// Implicitly enabled when using AddJwtBearerClientAuthentication
idsvrBuilder.AddJwtBearerClientAuthentication();
```

### mTLS Client Certificates

```csharp
new Client
{
    ClientId = "mtls.client",
    AllowedGrantTypes = GrantTypes.ClientCredentials,
    AllowedScopes = { "api1" },
    ClientSecrets =
    {
        new Secret(@"CN=client, OU=production, O=company", "client.dn")
        {
            Type = IdentityServerConstants.SecretTypes.X509CertificateName
        },
        new Secret("bca0d040847f843c5ee0fa6eb494837470155868", "mtls.tb")
        {
            Type = IdentityServerConstants.SecretTypes.X509CertificateThumbprint
        }
    }
}
```

Enable mTLS validators:

```csharp
// Program.cs
var idsvrBuilder = builder.Services.AddIdentityServer(options =>
{
    options.MutualTls.Enabled = true;
});

idsvrBuilder.AddMutualTlsSecretValidators();
```

### Secret Rollover

Assign multiple secrets to a client for zero-downtime secret rotation:

```csharp
var primary = new Secret("foo");
var secondary = new Secret("bar");

client.ClientSecrets = new[] { primary, secondary };
```

## CORS Configuration

For JavaScript/SPA clients that make cross-origin requests, configure `AllowedCorsOrigins`:

```csharp
var spaClient = new Client
{
    ClientId = "spa",
    AllowedCorsOrigins = { "https://spa.example.com" },
    // ...
};
```

IdentityServer's built-in CORS policy service (both in-memory and EF) uses this property automatically.
