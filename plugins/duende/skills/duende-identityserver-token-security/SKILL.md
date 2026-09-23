---
name: duende-identityserver-token-security
description: Advanced token security features in Duende IdentityServer including DPoP, mTLS certificate binding, Pushed Authorization Requests (PAR), JWT Secured Authorization Requests (JAR), and FAPI 2.0 compliance configuration.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Advanced Token Security (DPoP, mTLS, PAR, JAR, FAPI)

## When to Use This Skill

- Implementing Proof-of-Possession (PoP) tokens with DPoP or mTLS
- Configuring Pushed Authorization Requests (PAR) for front-channel parameter security
- Setting up JWT Secured Authorization Requests (JAR) for tamperproof authorize requests
- Building FAPI 2.0 compliant authorization servers
- Choosing between DPoP and mTLS for sender-constrained tokens
- Configuring APIs to validate proof-of-possession tokens
- Meeting regulatory or industry security requirements (open banking, e-health, e-government)

Docs: https://docs.duendesoftware.com/identityserver/tokens/security

## Proof-of-Possession Tokens: Why They Matter

Default OAuth access tokens are bearer tokens -- anyone who possesses the token can use it. If a token leaks, a malicious third party can impersonate the client/user.

Proof-of-Possession (PoP) tokens are cryptographically bound to the client that requested them via the `cnf` (confirmation) claim:

```json
{
  "iss": "https://identity.example.com",
  "aud": "urn:api",
  "client_id": "web_app",
  "sub": "88421113",
  "cnf": "confirmation_method"
}
```

When using reference tokens, the `cnf` claim is returned from the introspection endpoint.

## DPoP vs mTLS: Decision Matrix

| Factor                    | DPoP                               | mTLS                                               |
| ------------------------- | ---------------------------------- | -------------------------------------------------- |
| Edition required      | Enterprise                         | All editions (binding); Enterprise (some features) |
| Minimum version       | 6.3                                | All versions                                       |
| Key management        | Application-layer JWK (dynamic)    | X.509 certificate (TLS layer)                      |
| Infrastructure        | No TLS changes needed              | Requires TLS client certificate infrastructure     |
| Deployment complexity | Lower                              | Higher (certificate distribution, renewal)         |
| Protocol layer        | HTTP headers (`DPoP` header)       | TLS channel                                        |
| Public clients        | Supported (mobile/SPA)             | Harder for public clients                          |
| FAPI 2.0              | Accepted                           | Accepted                                           |
| Replay protection     | Nonce mechanism + `iat` validation | TLS channel binding                                |
| Recommendation        | Start here for most use cases      | When TLS infrastructure already exists             |

## Mutual TLS (mTLS)

### How It Works

IdentityServer embeds the SHA-256 thumbprint of the client's X.509 certificate into the access token via the `cnf` claim:

```json
{
  "cnf": { "x5t#S256": "bwcK0esc3ACC3DB2Y5_lESsXE8o9ltc05O89jdN-dg2" }
}
```

The client must use the same certificate when calling APIs. APIs validate the `cnf` claim against the TLS client certificate thumbprint.

### mTLS for Client Authentication

Configure IdentityServer to accept client certificates:

```csharp
// Program.cs
var idsvrBuilder = builder.Services.AddIdentityServer(options =>
{
    options.MutualTls.Enabled = true;
    options.MutualTls.DomainName = "mtls"; // mTLS endpoints on mtls subdomain
    options.MutualTls.ClientCertificateAuthenticationScheme = "Certificate";
});

idsvrBuilder.AddMutualTlsSecretValidators();

builder.Services.AddAuthentication()
    .AddCertificate("Certificate", options =>
    {
        options.AllowedCertificateTypes = CertificateTypes.SelfSigned;
        options.ValidateCertificateUse = true;
    });
```

Configure the client with certificate-based secrets:

```csharp
new Client
{
    ClientId = "mtls.client",
    AllowedGrantTypes = GrantTypes.ClientCredentials,
    AllowedScopes = { "api1" },
    ClientSecrets =
    {
        // PKI-based (by distinguished name)
        new Secret(@"CN=client, OU=production, O=company", "client.dn")
        {
            Type = SecretTypes.X509CertificateName
        },
        // Self-issued (by thumbprint)
        new Secret("bca0d040847f843c5ee0fa6eb494837470155868", "mtls.tb")
        {
            Type = SecretTypes.X509CertificateThumbprint
        }
    }
}
```

### mTLS without Client Authentication

You can bind tokens to a client certificate without using the certificate for client authentication. This works with any authentication method, including public clients:

```csharp
// Program.cs
var idsvrBuilder = builder.Services.AddIdentityServer(options =>
{
    options.MutualTls.AlwaysEmitConfirmationClaim = true;
});
```

The client creates a certificate on the fly and uses it to establish the TLS channel:

```csharp
static X509Certificate2 CreateClientCertificate(string name)
{
    X500DistinguishedName distinguishedName = new X500DistinguishedName($"CN={name}");

    using (RSA rsa = RSA.Create(2048))
    {
        var request = new CertificateRequest(distinguishedName, rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        request.CertificateExtensions.Add(
            new X509KeyUsageExtension(
                X509KeyUsageFlags.DataEncipherment |
                X509KeyUsageFlags.KeyEncipherment |
                X509KeyUsageFlags.DigitalSignature, false));
        request.CertificateExtensions.Add(
            new X509EnhancedKeyUsageExtension(
                new OidCollection { new Oid("1.3.6.1.5.5.7.3.2") }, false));

        return request.CreateSelfSigned(
            new DateTimeOffset(DateTime.UtcNow.AddDays(-1)),
            new DateTimeOffset(DateTime.UtcNow.AddDays(10)));
    }
}
```

### .NET Client Requesting mTLS Token

```csharp
static async Task<TokenResponse> RequestTokenAsync()
{
    var handler = new SocketsHttpHandler();
    var cert = new X509Certificate2("client.p12", "password");
    handler.SslOptions.ClientCertificates = new X509CertificateCollection { cert };

    var client = new HttpClient(handler);

    var disco = await client.GetDiscoveryDocumentAsync(Constants.Authority);
    if (disco.IsError) throw new Exception(disco.Error);

    var response = await client.RequestClientCredentialsTokenAsync(new ClientCredentialsTokenRequest
    {
        Address = disco.MtlsEndpointAliases.TokenEndpoint,
        ClientCredentialStyle = ClientCredentialStyle.PostBody,
        ClientId = "mtls.client",
        Scope = "api1"
    });

    if (response.IsError) throw new Exception(response.Error);
    return response;
}
```

### Validating mTLS in APIs

Add custom middleware to compare the `cnf` claim against the TLS client certificate:

```csharp
// API middleware pipeline
app.UseAuthentication();
app.UseConfirmationValidation(); // custom middleware
app.UseAuthorization();
```

The middleware validates the `x5t#S256` value in the `cnf` claim against the SHA-256 thumbprint of the client certificate on the TLS channel.

## DPoP (Demonstrating Proof-of-Possession at the Application Layer)

Version: >= 6.3 (Enterprise Edition)

DPoP binds an asymmetric key (stored as a JWK) to an access token via the `cnf` claim:

```json
{
  "cnf": {
    "jkt": "JGSVlE73oKtQQI1dypYg8_JNat0xJjsQNyOI5oxaZf4"
  }
}
```

The client proves possession of the private key by sending a signed JWT (proof token) via the `DPoP` HTTP header on every request.

### Enabling DPoP in IdentityServer

DPoP can be used dynamically with no server configuration, or enforced per-client:

```csharp
new Client
{
    ClientId = "dpop_client",
    RequireDPoP = true,

    // Optional: control DPoP proof token expiration validation
    // DPoPValidationMode = DPoPTokenExpirationValidationMode.Iat (default)
    // DPoPClockSkew = TimeSpan.FromMinutes(5) (default)
}
```

### Client-Side DPoP Configuration

Use `Duende.AccessTokenManagement` for automatic DPoP proof token handling.

Client credentials flow:

```csharp
// Program.cs
builder.Services.AddClientCredentialsTokenManagement()
    .AddClient("demo_dpop_client", client =>
    {
        client.TokenEndpoint = "https://identity.example.com/connect/token";
        client.DPoPJsonWebKey = "..."; // JWK string
    });
```

Authorization code flow:

```csharp
// Program.cs
builder.Services.AddAuthentication(...)
    .AddCookie("cookie", ...)
    .AddOpenIdConnect("oidc", ...);

builder.Services.AddOpenIdConnectAccessTokenManagement(options =>
{
    options.DPoPJsonWebKey = "..."; // JWK string
});
```

### Creating a DPoP JWK

```csharp
var rsaKey = new RsaSecurityKey(RSA.Create(2048));
var jsonWebKey = JsonWebKeyConverter.ConvertFromSecurityKey(rsaKey);
jsonWebKey.Alg = "PS256";
string jwk = JsonSerializer.Serialize(jsonWebKey);
```

The `DPoPJsonWebKey` is a critical secret. If lost, tokens bound to it cannot be used. If leaked, the security benefits of DPoP are lost.

### DPoP Client Settings Reference

| Property             | Default                                 | Description                                     |
| -------------------- | --------------------------------------- | ----------------------------------------------- |
| `RequireDPoP`        | `false`                                 | Require DPoP for this client                    |
| `DPoPValidationMode` | `DPoPTokenExpirationValidationMode.Iat` | Validate via client `iat` and/or server `nonce` |
| `DPoPClockSkew`      | 5 minutes                               | Clock skew for `iat` claim validation           |

### Validating DPoP in APIs

Install the DPoP validation package:

```bash
dotnet add package Duende.AspNetCore.Authentication.JwtBearer
```

Configure JWT bearer with DPoP:

```csharp
// API Program.cs
builder.Services.AddAuthentication("token")
    .AddJwtBearer("token", options =>
    {
        options.Authority = Constants.Authority;
        options.TokenValidationParameters.ValidateAudience = false;
        options.MapInboundClaims = false;
        options.TokenValidationParameters.ValidTypes = new[] { "at+jwt" };
    });

// Extend with DPoP processing and validation
builder.Services.ConfigureDPoPTokensForScheme("token");
```

DPoP validation requires a distributed cache for replay detection:

```csharp
// Use any IDistributedCache implementation (Redis, CosmosDB, SQL Server, etc.)
builder.Services.AddDistributedMemoryCache(); // in-memory for development only
```

### DPoP Validation Steps (handled by the library)

1. Validate the access token as normal
2. Validate the DPoP proof token from the `DPoP` HTTP request header
3. Ensure the authorization header uses the `DPoP` scheme
4. Validate the JWT format of the proof token
5. Verify the `cnf` claim matches between tokens
6. Validate the HTTP method and URL match the request
7. Detect replay attacks using distributed cache storage
8. Manage nonce generation and validation
9. Handle clock skew between systems
10. Return appropriate error response headers when validation fails

## Pushed Authorization Requests (PAR)

Version: >= 7.0 (Business and Enterprise Edition)

PAR moves authorization parameters from the front channel (browser redirect URLs) to the back channel (direct HTTP POST), preventing parameter leakage and tampering.

### Why PAR

- Prevents exposure of authorization parameters (PII in scopes, claims)
- Prevents tampering with parameters (attacker changing scope)
- Keeps request URLs short (avoids browser/infrastructure URL length limits)
- Required by FAPI 2.0 Security Profile

### Server Configuration

```csharp
// Program.cs
builder.Services.AddIdentityServer(options =>
{
    // Require PAR globally
    options.PushedAuthorization.Required = false; // default

    // Lifetime of pushed authorization requests in seconds (default: 600 = 10 minutes)
    options.PushedAuthorization.Lifetime = 600; // seconds (int, not TimeSpan)

    // Allow redirect URIs not pre-registered (default: false)
    options.PushedAuthorization.AllowUnregisteredPushedRedirectUris = false;
});
```

### Per-Client Configuration

```csharp
new Client
{
    ClientId = "par_client",
    RequirePushedAuthorization = true,  // require PAR for this client
    PushedAuthorizationLifetime = 600   // 10 minutes, overrides global
}
```

### Client Usage (.NET 9+)

```csharp
// Program.cs
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
    })
    .AddCookie()
    .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, oidcOptions =>
    {
        // PushedAuthorizationBehavior.UseIfAvailable is the default in .NET 9+
        // To require PAR:
        oidcOptions.PushedAuthorizationBehavior = PushedAuthorizationBehavior.Require;
    });
```

### Disabling PAR (Starter Edition)

PAR requests are not processed in the Starter edition. Disable the endpoint to reflect this in discovery:

```csharp
// Program.cs
builder.Services.AddIdentityServer(options =>
{
    options.Endpoints.EnablePushedAuthorizationEndpoint = false;
});
```

### PAR Configuration Reference

| Property                                                  | Default    | Description                      |
| --------------------------------------------------------- | ---------- | -------------------------------- |
| `PushedAuthorization.Required`                            | `false`    | Require PAR globally             |
| `PushedAuthorization.Lifetime`                            | `600` (seconds, `int`) | PAR request lifetime             |
| `PushedAuthorization.AllowUnregisteredPushedRedirectUris` | `false`    | Allow unregistered redirect URIs |
| `Client.RequirePushedAuthorization`                       | `false`    | Per-client PAR requirement       |
| `Client.PushedAuthorizationLifetime`                      | `null`     | Per-client lifetime override     |
| `Endpoints.EnablePushedAuthorizationEndpoint`             | `true`     | Enable/disable PAR endpoint      |

## JWT Secured Authorization Requests (JAR)

JAR packages authorization request parameters in a signed JWT, making them tamperproof and enabling front-channel client authentication.

### Server Configuration

Configure the client to require signed request objects:

```csharp
var client = new Client
{
    ClientId = "foo",
    RequireRequestObject = true,

    ClientSecrets =
    {
        new Secret
        {
            // X509 cert base64-encoded
            Type = IdentityServerConstants.SecretTypes.X509CertificateBase64,
            Value = Convert.ToBase64String(cert.Export(X509ContentType.Cert))
        },
        new Secret
        {
            // RSA key as JWK
            Type = IdentityServerConstants.SecretTypes.JsonWebKey,
            Value = "{'e':'AQAB','kid':'...','kty':'RSA','n':'...'}"
        }
    }
};
```

The same key can be shared between client authentication (private_key_jwt) and signed authorize requests.

### Request JWTs by Reference

If using `request_uri`, IdentityServer fetches the JWT from the specified URL:

```csharp
// Program.cs
idsvrBuilder.AddJwtRequestUriHttpClient(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
})
    .AddTransientHttpErrorPolicy(policy => policy.WaitAndRetryAsync(new[]
    {
        TimeSpan.FromSeconds(1),
        TimeSpan.FromSeconds(2),
        TimeSpan.FromSeconds(3)
    }));
```

Request URI processing is disabled by default. Enable it on the `Endpoints` options.

### Accessing Request Object Data

- In `ValidatedAuthorizeRequest`: use the `RequestObjectValues` dictionary
- In UI code: call `IIdentityServerInteractionService.GetAuthorizationContextAsync`, then access `RequestObjectValues` on the returned `AuthorizationRequest`

## FAPI 2.0 Compliance

Version: >= 7.3 (Enterprise Edition)

The FAPI 2.0 Security Profile is a set of OAuth security best practices for high-value scenarios (open banking, e-health, e-government).

### FAPI 2.0 Authorization Server Requirements Checklist

| Requirement                                      | IdentityServer Status                  | Configuration Needed                                |
| ------------------------------------------------ | -------------------------------------- | --------------------------------------------------- |
| Distribute discovery metadata                    | Default behavior                       | None                                                |
| Reject resource owner password grant             | Default behavior (when not configured) | None                                                |
| Only support confidential clients                | Configure per-client                   | Set `RequireClientSecret = true`                    |
| Only issue sender-constrained tokens             | Configure                              | Enable DPoP or mTLS                                 |
| Authenticate via mTLS or `private_key_jwt`       | Configure                              | Set client secrets accordingly                      |
| No open redirectors                              | Default behavior                       | None                                                |
| Accept only issuer as `aud` in client assertions | Enable strict validation               | `StrictClientAssertionAudienceValidation`           |
| No refresh token rotation (except extraordinary) | Configure                              | Set `RefreshTokenUsage = ReUse`                     |
| DPoP server-provided nonce                       | Configure                              | Set `DPoPValidationMode`                            |
| Authorization code max 60 seconds                | Configure                              | Set `AuthorizationCodeLifetime = 60`                |
| JWT clock skew max 10 seconds future             | Configure                              | `JwtValidationClockSkew = TimeSpan.FromSeconds(10)` |
| PAR required                                     | Configure per-client or globally       | Set `RequirePushedAuthorization = true` on client or `PushedAuthorization.Required = true` globally |
| PKCE required                                    | Configure per-client                   | Set `RequirePkce = true` on client (strongly recommended) |

### FAPI 2.0 Server Setup

```csharp
builder.Services.AddIdentityServer(opt =>
{
    // Key management with PS256 support
    opt.KeyManagement.SigningAlgorithms.Add(
        new SigningAlgorithmOptions(SecurityAlgorithms.RsaSsaPssSha256));

    // DPoP signing algorithms
    opt.DPoP.SupportedDPoPSigningAlgorithms = [
        SecurityAlgorithms.RsaSsaPssSha256,
        SecurityAlgorithms.RsaSsaPssSha384,
        SecurityAlgorithms.RsaSsaPssSha512,
        SecurityAlgorithms.EcdsaSha256,
        SecurityAlgorithms.EcdsaSha384,
        SecurityAlgorithms.EcdsaSha512
    ];

    // Client assertion signing algorithms
    opt.SupportedClientAssertionSigningAlgorithms = [
        SecurityAlgorithms.RsaSsaPssSha256,
        SecurityAlgorithms.RsaSsaPssSha384,
        SecurityAlgorithms.RsaSsaPssSha512,
        SecurityAlgorithms.EcdsaSha256,
        SecurityAlgorithms.EcdsaSha384,
        SecurityAlgorithms.EcdsaSha512
    ];

    // Request object signing algorithms
    opt.SupportedRequestObjectSigningAlgorithms = [
        SecurityAlgorithms.RsaSsaPssSha256,
        SecurityAlgorithms.RsaSsaPssSha384,
        SecurityAlgorithms.RsaSsaPssSha512,
        SecurityAlgorithms.EcdsaSha256,
        SecurityAlgorithms.EcdsaSha384,
        SecurityAlgorithms.EcdsaSha512
    ];

    // FAPI 2.0 clock skew requirement
    opt.JwtValidationClockSkew = TimeSpan.FromSeconds(10);
});
```

### FAPI 2.0 Client Configuration

```csharp
new Client
{
    ClientId = "fapi_client",
    ClientSecrets = [
        new Secret
        {
            Type = IdentityServerConstants.SecretTypes.JsonWebKey,
            Value = "<JWT Key goes here>"
        }
    ],
    AllowedGrantTypes = GrantTypes.Code,
    RedirectUris = [
        "https://example.com/callback",
    ],
    AllowOfflineAccess = true,
    AllowedScopes = [ "openid", "profile", "api" ],
    RequireDPoP = true,                    // sender-constrained tokens
    RequirePushedAuthorization = true       // PAR required
}
```

### FAPI 2.0 API Configuration

```csharp
builder.Services.AddAuthentication()
    .AddJwtBearer(options =>
    {
        options.Authority = configuration.Authority;
        options.TokenValidationParameters.ValidateAudience = false;
        options.MapInboundClaims = false;
        options.TokenValidationParameters.ValidTypes = ["at+jwt"];
    });

builder.Services.ConfigureDPoPTokensForScheme(JwtBearerDefaults.AuthenticationScheme,
    dpopOptions =>
    {
        dpopOptions.ProofTokenValidationParameters.ValidAlgorithms =
        [
            SecurityAlgorithms.RsaSsaPssSha256,
            SecurityAlgorithms.RsaSsaPssSha384,
            SecurityAlgorithms.RsaSsaPssSha512,
            SecurityAlgorithms.EcdsaSha256,
            SecurityAlgorithms.EcdsaSha384,
            SecurityAlgorithms.EcdsaSha512
        ];
    });
```

### FAPI 2.0 HTTP Redirects

Starting in v8.0, IdentityServer unconditionally uses HTTP 303 (See Other) redirects from POST endpoints, in compliance with FAPI 2.0 Section 5.3.2.2.

### Private Key JWT vs mTLS for FAPI 2.0

Start with private key JWTs. mTLS is relatively challenging to maintain in production. Both are supported and FAPI 2.0 compliant.

## Edition Requirements Summary

| Feature                       | Starter | Business | Enterprise  |
| ----------------------------- | ------- | -------- | ----------- |
| Static key management         | Yes     | Yes      | Yes         |
| Automatic key management      | No      | Yes      | Yes         |
| PAR                           | No      | Yes      | Yes         |
| DPoP                          | No      | No       | Yes         |
| Resource isolation (RFC 8707) | No      | No       | Yes         |
| FAPI 2.0 conformance report   | No      | No       | Yes (v8.0+) |
| mTLS client authentication    | Yes     | Yes      | Yes         |
| mTLS token binding            | Yes     | Yes      | Yes         |
| JAR (signed requests)         | Yes     | Yes      | Yes         |

## Common Pitfalls

1. Using `ClientCredentialStyle.AuthorizationHeader` with mTLS - The default `AuthorizationHeader` style does not work in mTLS scenarios. Use `ClientCredentialStyle.PostBody` instead.

2. Missing distributed cache for DPoP - DPoP replay detection requires `IDistributedCache`. Without it, replay attacks are possible. Use Redis, SQL Server, or another durable cache in production.

3. PAR lifetime too short - The default 10 minutes balances security (FAPI 2.0 recommendation) with usability. If users take longer to authenticate (MFA, consent), increase the lifetime.

4. DPoP key management - The `DPoPJsonWebKey` must persist for the lifetime of tokens bound to it. Losing the key makes bound tokens unusable. Leaking it nullifies DPoP's security benefits.

5. Confusing DPoP with client authentication - DPoP proves token possession at the application layer. It is separate from client authentication (which proves client identity at the token endpoint). A client can use shared secrets for authentication and DPoP for token binding.

6. Not enabling `AlwaysEmitConfirmationClaim` for mTLS without mTLS auth - If you want certificate binding without certificate-based client authentication, you must set `MutualTls.AlwaysEmitConfirmationClaim = true`.

7. Forgetting to configure DPoP proof validation algorithms - For FAPI 2.0, explicitly set `ProofTokenValidationParameters.ValidAlgorithms` on the API side. Without this, the API may accept weaker algorithms.

8. PAR not available in Starter edition - PAR requests are rejected in the Starter edition. Disable the endpoint via `options.Endpoints.EnablePushedAuthorizationEndpoint = false` so discovery accurately reflects this.
