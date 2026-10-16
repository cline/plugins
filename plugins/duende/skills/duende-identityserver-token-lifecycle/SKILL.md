---
name: duende-identityserver-token-lifecycle
description: "Guide for implementing token types, refresh token management, token exchange (RFC 8693), extension grants, IProfileService claims customization, and token lifetime best practices in Duende IdentityServer."
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# IdentityServer Token Types, Refresh Tokens, and Token Exchange

## When to Use This Skill

- Choosing between JWT and reference access tokens for a client
- Configuring refresh token rotation, sliding expiration, or replay detection
- Implementing token exchange (RFC 8693) for impersonation or delegation
- Building an extension grant validator (`IExtensionGrantValidator`)
- Customizing which claims appear in identity tokens, access tokens, or userinfo responses via `IProfileService`
- Setting token lifetime policies for access tokens and refresh tokens
- Issuing internal tokens from extensibility code via `IIdentityServerTools`
- Understanding identity tokens vs access tokens and their intended audiences

Docs: https://docs.duendesoftware.com/identityserver/tokens

## Token Types Overview

Duende IdentityServer issues three primary token types:

| Token Type     | Purpose                                            | Audience                              | Format           |
| -------------- | -------------------------------------------------- | ------------------------------------- | ---------------- |
| Identity Token | Communicates authentication event to the client    | Client application only (`aud` claim) | Always JWT       |
| Access Token   | Authorizes access to a protected resource (API)    | API / Resource Server                 | JWT or Reference |
| Refresh Token  | Obtains new access tokens without user interaction | Token endpoint only                   | Opaque handle    |

### Key Principles

- Identity tokens are solely for the client application that initiated the authentication. Never send an identity token to an API.
- Access tokens are for APIs. They contain client ID, scopes, expiration, and optionally user claims.
- Refresh tokens enable long-lived API access by allowing the client to request new access tokens silently.

## Identity Tokens

Identity tokens are JWTs that describe "what happened at the token service". They contain:

- `iss` -- the issuer (your IdentityServer URL)
- `sub` -- the authenticated user's unique identifier
- `aud` -- the client that requested authentication
- `auth_time` -- when the user authenticated
- `amr` -- authentication method (e.g., `pwd`)
- `idp` -- identity provider used (e.g., `local`)
- `sid` -- the session ID
- `nonce` -- ensures the token is consumed only once at the client

```json
{
  "iss": "https://localhost:5001",
  "nbf": 1609932802,
  "iat": 1609932802,
  "exp": 1609933102,
  "aud": "web_app",
  "amr": ["pwd"],
  "nonce": "63745529591...I3ZTIyOTZmZTNj",
  "sid": "F6E6F2EDE86EB8731EF609A4FE40ED89",
  "auth_time": 1609932794,
  "idp": "local",
  "sub": "88421113",
  "name": "Bob"
}
```

## Access Tokens: JWT vs Reference

### JWT Access Tokens

All claims are embedded in the token. The API validates the token by checking the signature using the issuer's public keys (from the JWKS endpoint). JWTs cannot be revoked before their expiration -- the only invalidation mechanism is waiting for `exp`.

```json
{
  "iss": "https://localhost:5001",
  "exp": 1609936401,
  "aud": "urn:resource1",
  "scope": "openid resource1.scope1 offline_access",
  "client_id": "web_app",
  "sub": "88421113",
  "jti": "2C56A356A306E64AFC7D2C6399E23A17"
}
```

### Reference Access Tokens

Reference tokens are pointers to token data stored in the persisted grant store. The API must call the introspection endpoint to validate the token. Reference tokens support immediate revocation by deleting the stored data.

```csharp
// Configure a client to use reference tokens
client.AccessTokenType = AccessTokenType.Reference;
```

The API consuming reference tokens must have a secret configured on the `ApiResource`:

```csharp
var api = new ApiResource("api1")
{
    ApiSecrets = { new Secret("secret".Sha256()) },
    Scopes = { "read", "write" }
};
```

### Decision Matrix: JWT vs Reference Tokens

| Criterion            | JWT                                 | Reference                            |
| -------------------- | ----------------------------------- | ------------------------------------ |
| Revocability         | No (expires naturally)              | Yes (immediate, delete from store)   |
| API call to validate | No (self-contained)                 | Yes (introspection endpoint)         |
| Network dependency   | None at validation time             | Requires IdentityServer availability |
| Token size           | Larger (contains all claims)        | Small (just a handle)                |
| Performance at scale | Better (no server call)             | Introspection adds latency           |
| Best for             | High-throughput APIs, microservices | Sensitive APIs needing revocation    |

### Controlling Token Format Per Client

```csharp
// Set on the Client model
client.AccessTokenType = AccessTokenType.Jwt;       // default
client.AccessTokenType = AccessTokenType.Reference;  // reference tokens
```

## Refresh Tokens

Refresh tokens allow clients to obtain new access tokens without user interaction. They are supported for authorization code, hybrid, and resource owner password credential flows.

### Requesting Refresh Tokens

The client must:

1. Have `AllowOfflineAccess = true` on its configuration
2. Request the `offline_access` scope in the authorize request

```
POST /connect/token
Content-Type: application/x-www-form-urlencoded

    client_id=client&
    client_secret=secret&
    grant_type=refresh_token&
    refresh_token=hdh922
```

Using Duende.IdentityModel:

```csharp
using Duende.IdentityModel.Client;

var client = new HttpClient();

var response = await client.RequestRefreshTokenAsync(new RefreshTokenRequest
{
    Address = TokenEndpoint,
    ClientId = "client",
    ClientSecret = "secret",
    RefreshToken = "..."
});
```

### Refresh Token Lifetime Settings

| Setting                        | Description                                              | Recommendation                                        |
| ------------------------------ | -------------------------------------------------------- | ----------------------------------------------------- |
| `AbsoluteRefreshTokenLifetime` | Maximum lifetime regardless of activity (seconds)        | Set based on security policy (e.g., 30 days)          |
| `SlidingRefreshTokenLifetime`  | Extends token life on each use, up to the absolute limit | Use for "remember me" scenarios (e.g., 1 day sliding) |
| `RefreshTokenExpiration`       | `Absolute` or `Sliding`                                  | Use `Sliding` with a reasonable absolute cap          |

### Rotation (OneTime vs ReUse)

Configured via `RefreshTokenUsage` on the client:

| Mode                         | Behavior                                               | Trade-offs                                                        |
| ---------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| `ReUse` (default since v7.0) | Same refresh token is reused across requests           | Robust to network failures, lower DB pressure                     |
| `OneTime`                    | New refresh token issued on each use; old one consumed | Limited security benefit, risk of losing token on network failure |

Why `ReUse` is the default: Rotating tokens on every use has limited security benefits regardless of client type. Reusable tokens are robust to network failures -- if a one-time-use token is used but the response is lost, the client cannot recover without forcing a new login. Reusable tokens also have better performance since they avoid extra writes to the persisted grant store.

### Accepting Consumed Tokens (Network Failure Resilience)

To make one-time-use tokens more resilient, subclass `DefaultRefreshTokenService` and override `AcceptConsumedTokenAsync`:

```csharp
public class ResilientRefreshTokenService : DefaultRefreshTokenService
{
    protected override Task<bool> AcceptConsumedTokenAsync(RefreshToken refreshToken)
    {
        // Allow consumed tokens for a short grace period
        var consumedAt = refreshToken.ConsumedTime ?? DateTime.UtcNow;
        if (DateTime.UtcNow - consumedAt < TimeSpan.FromSeconds(30))
        {
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }
}
```

Register it:

```csharp
builder.Services.TryAddTransient<IRefreshTokenService, ResilientRefreshTokenService>();
```

Important: For this to work, `PersistentGrantOptions.DeleteOneTimeOnlyRefreshTokensOnUse` must be `false` so consumed tokens are marked rather than deleted.

### Replay Detection

If a consumed refresh token is reused, it could indicate a replay attack. You can extend `AcceptConsumedTokenAsync` to revoke all access for the user/client:

- Delete all refresh tokens for the user/client
- Revoke reference access tokens
- End the user's server-side session
- Send back-channel logout notifications
- Alert the user

Caution: This is disruptive and can produce false positives from network failures or client bugs.

### Token Cleanup Configuration

```csharp
builder.Services.AddIdentityServer()
    .AddOperationalStore(options =>
    {
        options.EnableTokenCleanup = true;
        options.TokenCleanupInterval = 3600;           // seconds (default: 1 hour)
        options.RemoveConsumedTokens = true;            // also clean consumed tokens
        options.ConsumedTokenCleanupDelay = 300;        // wait 5 min after consumption
    });
```

## Token Exchange (RFC 8693)

Token exchange allows translating between token types. Common use cases: impersonation, delegation, SAML-to-JWT conversion.

### Implementing Token Exchange

Implement `IExtensionGrantValidator`:

```csharp
public class TokenExchangeGrantValidator : IExtensionGrantValidator
{
    private readonly ITokenValidator _validator;

    public TokenExchangeGrantValidator(ITokenValidator validator)
    {
        _validator = validator;
    }

    public string GrantType => OidcConstants.GrantTypes.TokenExchange;

    public async Task ValidateAsync(ExtensionGrantValidationContext context)
    {
        context.Result = new GrantValidationResult(TokenRequestErrors.InvalidRequest);

        var customResponse = new Dictionary<string, object>
        {
            { OidcConstants.TokenResponse.IssuedTokenType, OidcConstants.TokenTypeIdentifiers.AccessToken }
        };

        var subjectToken = context.Request.Raw.Get(OidcConstants.TokenRequest.SubjectToken);
        var subjectTokenType = context.Request.Raw.Get(OidcConstants.TokenRequest.SubjectTokenType);

        if (string.IsNullOrWhiteSpace(subjectToken)) return;

        if (!string.Equals(subjectTokenType, OidcConstants.TokenTypeIdentifiers.AccessToken)) return;

        var validationResult = await _validator.ValidateAccessTokenAsync(subjectToken);
        if (validationResult.IsError) return;

        var sub = validationResult.Claims.First(c => c.Type == JwtClaimTypes.Subject).Value;
        var clientId = validationResult.Claims.First(c => c.Type == JwtClaimTypes.ClientId).Value;

        // Impersonation: set client_id to the original
        context.Request.ClientId = clientId;
        context.Result = new GrantValidationResult(
            subject: sub,
            authenticationMethod: GrantType,
            customResponse: customResponse);
    }
}
```

Register and configure:

```csharp
// Program.cs
idsvrBuilder.AddExtensionGrantValidator<TokenExchangeGrantValidator>();

// Client configuration
client.AllowedGrantTypes = { OidcConstants.GrantTypes.TokenExchange };
```

### Impersonation vs Delegation

| Pattern       | `client_id` in new token  | `act` claim                        | Use case                                      |
| ------------- | ------------------------- | ---------------------------------- | --------------------------------------------- |
| Impersonation | Original front-end client | Not present                        | API1 calls API2 "as if" it were the front-end |
| Delegation    | Original front-end client | Contains `{ "client_id": "api1" }` | API2 sees the full call chain                 |

Delegation adds an `act` claim to preserve the call chain:

```csharp
context.Request.ClientId = clientId;

var actor = new { client_id = context.Request.Client.ClientId };
var actClaim = new Claim(JwtClaimTypes.Actor,
    JsonSerializer.Serialize(actor),
    IdentityServerConstants.ClaimValueTypes.Json);

context.Result = new GrantValidationResult(
    subject: sub,
    authenticationMethod: GrantType,
    claims: new[] { actClaim },
    customResponse: customResponse);
```

To emit the `act` claim in tokens, your profile service must handle it:

```csharp
public class ProfileService : IProfileService
{
    public async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        if (context.Subject.GetAuthenticationMethod() == OidcConstants.GrantTypes.TokenExchange)
        {
            var act = context.Subject.FindFirst(JwtClaimTypes.Actor);
            if (act != null)
            {
                context.IssuedClaims.Add(act);
            }
        }
    }
}
```

### Sensitive Parameter Filtering

Extension grant input parameters are logged by default. Filter sensitive values:

```csharp
builder.Services.AddIdentityServer(options =>
{
    options.Logging.TokenRequestSensitiveValuesFilter.Add("custom_secret_param");
});
```

## Claims Customization with IProfileService

The profile service controls which claims are emitted in identity tokens, access tokens, and userinfo responses.

### Strategies

| Strategy                                | When to use                                                     |
| --------------------------------------- | --------------------------------------------------------------- |
| `context.AddRequestedClaims(claims)`    | Respects scopes/resources requested by client; supports consent |
| `context.IssuedClaims.AddRange(claims)` | Always emit claims regardless of request                        |
| Custom logic per user/client            | Conditional claims based on identity                            |

### Recommended Pattern

Extend `DefaultProfileService` and use `AddRequestedClaims`:

```csharp
public class SampleProfileService : DefaultProfileService
{
    public override async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        var claims = await GetClaimsFromDatabaseAsync(context.Subject);
        context.AddRequestedClaims(claims);
    }
}
```

### Client Claims

Client claims are defined per-client and emitted in access tokens (prefixed with `client_` by default):

```csharp
var client = new Client
{
    ClientId = "client",
    Claims = { new ClientClaim("customer_id", "123") }
    // Emitted as "client_customer_id" in access tokens
};
```

Change or remove the prefix:

```csharp
client.ClientClaimsPrefix = "";  // no prefix
```

By default, client claims are only sent in client credentials flow. To include them in all flows:

```csharp
client.AlwaysSendClientClaims = true;
```

### Claim Serialization

Claims are serialized based on `ClaimValueType`:

- No type specified -> string
- `ClaimValueTypes.Integer`, `Integer32`, `Integer64`, `Double`, `Boolean` -> parsed as corresponding type
- `IdentityServerConstants.ClaimValueTypes.Json` -> serialized as JSON

## Issuing Internal Tokens

When extensibility code needs to call other APIs, use `IIdentityServerTools` instead of the protocol endpoints:

```csharp
app.MapGet("/myAction", async (IIdentityServerTools tools) =>
{
    var token = await tools.IssueClientJwtAsync(
        clientId: "client_id",
        lifetime: 3600,
        audiences: new[] { "backend.api" });

    // Use token to call backend API
});
```

## Token Lifetime Best Practices

| Token                    | Recommended Lifetime                      | Rationale                                        |
| ------------------------ | ----------------------------------------- | ------------------------------------------------ |
| Identity Token           | 5 minutes (default: 300s)                 | Only used once during authentication             |
| JWT Access Token         | 5-15 minutes (default: 3600s = 1 hour)    | Short-lived; cannot be revoked                   |
| Reference Access Token   | 5-60 minutes                              | Can be revoked, so slightly longer is acceptable |
| Refresh Token (absolute) | Hours to days depending on security needs | Balance UX vs risk                               |
| Refresh Token (sliding)  | Shorter than absolute (e.g., 1 hour)      | Auto-expire unused tokens                        |

## Common Anti-Patterns

- WRONG Sending identity tokens to APIs for authorization -- they are for the client only
- OK Use access tokens (JWT or reference) for API authorization

- WRONG Using very long-lived JWT access tokens (hours/days) with no revocation mechanism
- OK Keep JWT lifetimes short (5-15 min) and use refresh tokens for longevity

- WRONG Enabling `OneTime` refresh token rotation without considering network failure scenarios
- OK Use `ReUse` (default) or implement `AcceptConsumedTokenAsync` with a grace period

- WRONG Putting all user claims directly into access tokens, creating bloated JWTs
- OK Use `AddRequestedClaims` to emit only claims requested by scopes; use the userinfo endpoint for additional claims

- WRONG Parsing the `returnUrl` manually instead of using `GetAuthorizationContextAsync`
- OK Always use the interaction service to extract authorization context

- WRONG Forgetting to set `AllowOfflineAccess = true` on the client and then wondering why no refresh token is issued
- OK Configure both the client property and request the `offline_access` scope

## Common Pitfalls

1. Reference tokens require introspection: APIs consuming reference tokens must call the introspection endpoint. Without a configured `ApiSecret` on the `ApiResource`, introspection will fail with `401`.

2. Refresh token cleanup: Enable `EnableTokenCleanup` in the operational store options. Without it, expired and consumed tokens accumulate indefinitely.

3. Token exchange client configuration: The client performing token exchange must have `AllowedGrantTypes` set to `urn:ietf:params:oauth:grant-type:token-exchange` (use `OidcConstants.GrantTypes.TokenExchange`).

4. Profile service `Subject` differs by caller: When called for userinfo requests, the `Subject` property contains claims from the access token, not the authentication session. Check `context.Caller` to determine the source.

5. Client claims prefix collision: Client claims are prefixed with `client_` by default. Adjust `ClientClaimsPrefix` if this collides with existing user claim types.
