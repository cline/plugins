---
name: duende-identity-testing-patterns
description: Testing patterns for IdentityServer-based systems including integration testing with WebApplicationFactory, mock token issuance, test authority configuration, protocol response validation, and end-to-end authentication flow testing.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Identity Testing Patterns

## When to Use This Skill

Use this skill when:
- Writing integration tests for applications that issue or validate tokens using Duende IdentityServer
- Hosting IdentityServer in-memory with `WebApplicationFactory<T>` to test grant flows end-to-end
- Creating mock JWT tokens for testing protected APIs without a live authority
- Testing custom `IProfileService` implementations or claim transformation logic
- Verifying `IAuthorizationHandler` and policy-based authorization against specific claim sets
- Testing BFF endpoints that rely on cookie-based sessions and proxied API calls

## Core Principles

1. Integration over unit -- Test token issuance, claim mapping, and policy enforcement against a real (in-process) IdentityServer instance. Avoid mocking the token pipeline itself; mock only external I/O (databases, downstream services).
2. In-process authority -- Use `WebApplicationFactory<T>` to host IdentityServer inside the test process. This avoids network round-trips, eliminates certificate trust issues, and makes tests deterministic.
3. Predictable signing keys -- Override key management in tests with a static development signing key so token signatures are verifiable without key rotation logic.
4. Minimal test clients -- Register only the clients, scopes, and resources each test needs. Over-broad test configurations mask permission bugs.
5. Test auth handler for API tests -- When testing protected APIs in isolation (without a live token endpoint), replace JWT Bearer authentication with a `TestAuthHandler` that accepts a fake scheme. Never disable authorization wholesale.
6. Builder pattern for test data -- Use fluent builders for `Client`, `ApiScope`, `ApiResource`, and test users to keep test setup readable and reduce duplication.

## Related Skills

- `duende-identityserver-configuration` -- Production client and resource registration patterns
- `duende-aspnetcore-authentication` -- OIDC and JWT Bearer handler configuration
- `duende-aspnetcore-authorization` -- Policy definitions and requirement handlers
- `duende-claims-authorization` -- `IProfileService` and claim pipeline internals
- `duende-bff` -- BFF session and proxy architecture being tested

Docs: https://docs.duendesoftware.com/identityserver/fundamentals

---

## Sub-Documents

| Document | Description | When to Load |
|----------|-------------|--------------|
| [docs/bff-testing.md](docs/bff-testing.md) | BFF endpoint testing with cookie simulation, antiforgery headers, and OIDC redirect bypass | BFF testing, CookieContainer, x-csrf header, BffFactory, session simulation |
| [docs/aspire-testing.md](docs/aspire-testing.md) | Full-stack Aspire testing with identity server health checks and token endpoint wiring | Aspire testing, DistributedApplicationTestingBuilder, WaitForResourceHealthyAsync, end-to-end |

---

## Testing Strategy Overview

| What to test | Recommended approach |
|---|---|
| Token issuance (client credentials, code flow) | In-process `WebApplicationFactory` hitting `/connect/token` |
| Claim mapping / `IProfileService` | Unit test with `DefaultProfileService` + mock context, or integration test |
| Authorization policy requirements | `IAuthorizationService` + `TestAuthHandler` in integration test |
| `IAuthorizationHandler` logic | Direct unit test with `AuthorizationHandlerContext` |
| Protected API access control | `WebApplicationFactory` with `TestAuthHandler` and constructed `ClaimsPrincipal` |
| BFF endpoints (login/logout/user) | `WebApplicationFactory` with cookie simulation |
| EF Core store implementations | In-memory EF provider or isolated SQL container |

---

## Pattern 1: WebApplicationFactory for IdentityServer

Host a complete IdentityServer in-memory. Override configuration to inject test clients, resources, and a static signing key.

### Required NuGet Packages

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="*" />
  <PackageReference Include="xunit" Version="*" />
  <PackageReference Include="xunit.runner.visualstudio" Version="*" />
  <PackageReference Include="Microsoft.NET.Test.Sdk" Version="*" />
  <PackageReference Include="IdentityModel" Version="*" />
</ItemGroup>
```

### IdentityServer WebApplicationFactory

```csharp
// OK Factory that runs a real IdentityServer in-process
public sealed class IdentityServerFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureTestServices(services =>
        {
            // Remove any existing IdentityServer registration to replace it cleanly
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IConfigureOptions<IdentityServerOptions>));
            if (descriptor is not null)
                services.Remove(descriptor);

            services.AddIdentityServer(options =>
            {
                options.Events.RaiseErrorEvents = true;
                options.Events.RaiseFailureEvents = true;

                // Disable automatic key management -- use a static key for predictability
                options.KeyManagement.Enabled = false;
            })
            .AddInMemoryClients(TestConfig.Clients)
            .AddInMemoryApiScopes(TestConfig.ApiScopes)
            .AddInMemoryApiResources(TestConfig.ApiResources)
            .AddInMemoryIdentityResources(TestConfig.IdentityResources)
            .AddTestUsers(TestConfig.Users)
            // Static development signing key -- never use this in production
            .AddDeveloperSigningCredential(persistKey: false);
        });
    }
}
```

### Requesting a Token in a Test

```csharp
[Collection("IdentityServer")]
public class TokenEndpointTests : IClassFixture<IdentityServerFactory>
{
    private readonly HttpClient _client;

    public TokenEndpointTests(IdentityServerFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ClientCredentials_ShouldReturnAccessToken()
    {
        var response = await _client.RequestClientCredentialsTokenAsync(
            new ClientCredentialsTokenRequest
            {
                Address = "https://localhost/connect/token",
                ClientId = "test.service",
                ClientSecret = "test-secret",
                Scope = "api1"
            });

        Assert.False(response.IsError, response.Error);
        Assert.NotEmpty(response.AccessToken);
        Assert.Equal("Bearer", response.TokenType);
    }

    [Fact]
    public async Task ClientCredentials_InvalidScope_ShouldReturnError()
    {
        var response = await _client.RequestClientCredentialsTokenAsync(
            new ClientCredentialsTokenRequest
            {
                Address = "https://localhost/connect/token",
                ClientId = "test.service",
                ClientSecret = "test-secret",
                Scope = "not.allowed"  // WRONG scope not granted to this client
            });

        Assert.True(response.IsError);
        Assert.Equal("invalid_scope", response.Error);
    }
}
```

---

## Pattern 2: Test Configuration Builders

Use static builders -- not scattered inline literals -- so every test builds from a consistent baseline.

```csharp
public static class TestConfig
{
    public static IEnumerable<Client> Clients =>
    [
        ClientBuilder.ClientCredentials("test.service", "test-secret")
            .WithScopes("api1", "api2.read")
            .Build(),

        ClientBuilder.AuthorizationCode("test.webapp", "webapp-secret")
            .WithRedirectUri("https://testapp/signin-oidc")
            .WithScopes("openid", "profile", "api1")
            .Build()
    ];

    public static IEnumerable<ApiScope> ApiScopes =>
    [
        new ApiScope("api1", "Primary API"),
        new ApiScope("api2.read", "Read from API 2")
    ];

    public static IEnumerable<ApiResource> ApiResources =>
    [
        new ApiResource("api1-resource", "API 1 Resource")
        {
            Scopes = { "api1" }
        }
    ];

    public static IEnumerable<IdentityResource> IdentityResources =>
    [
        new IdentityResources.OpenId(),
        new IdentityResources.Profile()
    ];

    public static List<TestUser> Users =>
    [
        TestUserBuilder.Active("alice", "Password1!")
            .WithClaim("email", "alice@example.com")
            .WithClaim("role", "admin")
            .Build(),

        TestUserBuilder.Active("bob", "Password1!")
            .WithClaim("email", "bob@example.com")
            .Build()
    ];
}
```

### Client Builder

```csharp
public sealed class ClientBuilder
{
    private readonly Client _client = new();

    public static ClientBuilder ClientCredentials(string clientId, string secret)
    {
        var builder = new ClientBuilder();
        builder._client.ClientId = clientId;
        builder._client.AllowedGrantTypes = GrantTypes.ClientCredentials;
        builder._client.ClientSecrets = [new Secret(secret.Sha256())];
        return builder;
    }

    public static ClientBuilder AuthorizationCode(string clientId, string secret)
    {
        var builder = new ClientBuilder();
        builder._client.ClientId = clientId;
        builder._client.AllowedGrantTypes = GrantTypes.Code;
        builder._client.RequirePkce = true;
        builder._client.ClientSecrets = [new Secret(secret.Sha256())];
        builder._client.AllowOfflineAccess = true;
        return builder;
    }

    public ClientBuilder WithScopes(params string[] scopes)
    {
        foreach (var scope in scopes)
            _client.AllowedScopes.Add(scope);
        return this;
    }

    public ClientBuilder WithRedirectUri(string uri)
    {
        _client.RedirectUris.Add(uri);
        return this;
    }

    public Client Build() => _client;
}
```

### TestUser Builder

```csharp
public sealed class TestUserBuilder
{
    private readonly TestUser _user = new();

    public static TestUserBuilder Active(string username, string password)
    {
        var builder = new TestUserBuilder();
        builder._user.SubjectId = Guid.NewGuid().ToString("N");
        builder._user.Username = username;
        builder._user.Password = password;
        builder._user.IsActive = true;
        return builder;
    }

    public TestUserBuilder WithSubject(string subjectId)
    {
        _user.SubjectId = subjectId;
        return this;
    }

    public TestUserBuilder WithClaim(string type, string value)
    {
        _user.Claims.Add(new Claim(type, value));
        return this;
    }

    public TestUser Build() => _user;
}
```

---

## Pattern 3: Mock Token Issuance

When testing a protected API in isolation (no live IdentityServer needed), issue a self-signed JWT in the test and configure the API to trust it. This avoids spinning up an IdentityServer host for every API test.

### Generating a Self-Signed Test Token

```csharp
public static class TestTokenFactory
{
    // Static key shared between the token factory and the test auth configuration
    private static readonly RsaSecurityKey TestSigningKey = CreateRsaKey();

    public static SecurityKey SigningKey => TestSigningKey;

    private static RsaSecurityKey CreateRsaKey()
    {
        var rsa = RSA.Create(2048);
        return new RsaSecurityKey(rsa) { KeyId = "test-key-1" };
    }

    public static string CreateAccessToken(
        string subject,
        string audience,
        IEnumerable<Claim> claims,
        TimeSpan? lifetime = null)
    {
        var allClaims = new List<Claim>
        {
            new(JwtClaimTypes.Subject, subject),
            new(JwtClaimTypes.JwtId, Guid.NewGuid().ToString())
        };
        allClaims.AddRange(claims);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(allClaims),
            Audience = audience,
            Issuer = "https://test-authority",
            Expires = DateTime.UtcNow.Add(lifetime ?? TimeSpan.FromMinutes(5)),
            SigningCredentials = new SigningCredentials(
                TestSigningKey,
                SecurityAlgorithms.RsaSha256),
            // OK RFC 9068: access tokens must carry typ=at+jwt
            TokenType = "at+jwt"
        };

        var handler = new JsonWebTokenHandler();
        return handler.CreateToken(tokenDescriptor);
    }
}
```

### Configuring the API to Trust the Test Token

```csharp
// OK In WebApplicationFactory for the API project
protected override void ConfigureWebHost(IWebHostBuilder builder)
{
    builder.ConfigureTestServices(services =>
    {
        // Remove production JWT Bearer authentication
        var jwtDescriptor = services.FirstOrDefault(
            d => d.ServiceType == typeof(IConfigureOptions<JwtBearerOptions>));
        if (jwtDescriptor is not null)
            services.Remove(jwtDescriptor);

        // Replace with test-friendly JWT Bearer that trusts our static key
        services.AddAuthentication("Bearer")
            .AddJwtBearer("Bearer", options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = TestTokenFactory.SigningKey,
                    ValidateIssuer = true,
                    ValidIssuer = "https://test-authority",
                    ValidateAudience = true,
                    ValidAudience = "my-api",
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });
    });
}
```

### Using the Test Token in a Test

```csharp
[Fact]
public async Task GetProducts_WithValidToken_ShouldReturn200()
{
    var token = TestTokenFactory.CreateAccessToken(
        subject: "user-123",
        audience: "my-api",
        claims: [new Claim("scope", "api1"), new Claim("role", "viewer")]);

    _client.SetBearerToken(token);

    var response = await _client.GetAsync("/api/products");
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
}

[Fact]
public async Task GetProducts_WithoutToken_ShouldReturn401()
{
    var response = await _client.GetAsync("/api/products");
    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
}

[Fact]
public async Task DeleteProduct_WithViewerRole_ShouldReturn403()
{
    var token = TestTokenFactory.CreateAccessToken(
        subject: "user-123",
        audience: "my-api",
        claims: [new Claim("scope", "api1"), new Claim("role", "viewer")]); // WRONG missing "admin"

    _client.SetBearerToken(token);

    var response = await _client.DeleteAsync("/api/products/1");
    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}
```

---

## Pattern 4: TestAuthHandler for Protected API Tests

For APIs that use `[Authorize]`, replace the authentication handler entirely with a `TestAuthHandler` that accepts any pre-built `ClaimsPrincipal`. This gives full control over identity in each test without token serialization.

```csharp
// OK TestAuthHandler -- injects a ClaimsPrincipal directly into the pipeline
public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";

    private readonly ITestClaimsProvider _claimsProvider;

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ITestClaimsProvider claimsProvider)
        : base(options, logger, encoder)
    {
        _claimsProvider = claimsProvider;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = _claimsProvider.GetClaims();
        if (claims is null)
            return Task.FromResult(AuthenticateResult.NoResult());

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

// Swap this per-test to change the authenticated user
public interface ITestClaimsProvider
{
    IEnumerable<Claim>? GetClaims();
}

public sealed class TestClaimsProvider : ITestClaimsProvider
{
    private IEnumerable<Claim>? _claims;

    public void SetClaims(IEnumerable<Claim> claims) => _claims = claims;
    public void ClearClaims() => _claims = null;
    public IEnumerable<Claim>? GetClaims() => _claims;
}
```

### Factory Registration

```csharp
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    // Expose so tests can configure the identity per-test
    public TestClaimsProvider ClaimsProvider { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<ITestClaimsProvider>(ClaimsProvider);

            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }
}
```

### Test Using the Handler

```csharp
public class ProductsApiTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public ProductsApiTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetProducts_AsAdmin_ShouldSucceed()
    {
        _factory.ClaimsProvider.SetClaims(
        [
            new Claim(JwtClaimTypes.Subject, "user-001"),
            new Claim(JwtClaimTypes.Name, "Alice"),
            new Claim("role", "admin"),
            new Claim("scope", "api1")
        ]);

        var response = await _client.GetAsync("/api/products");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetProducts_Unauthenticated_ShouldReturn401()
    {
        _factory.ClaimsProvider.ClearClaims(); // No claims = not authenticated

        var response = await _client.GetAsync("/api/products");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
```

---

## Pattern 5: Testing IProfileService

Unit test `IProfileService` implementations directly against the `ProfileDataRequestContext` contract. Use real `ProfileDataRequestContext` instances -- do not mock the context.

```csharp
public class CustomProfileServiceTests
{
    private readonly CustomProfileService _sut;
    private readonly Mock<IUserRepository> _userRepo;

    public CustomProfileServiceTests()
    {
        _userRepo = new Mock<IUserRepository>();
        _sut = new CustomProfileService(_userRepo.Object);
    }

    [Fact]
    public async Task GetProfileData_ShouldIncludeRoleClaimsForAccessToken()
    {
        // Arrange: a subject with known sub claim
        var subject = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(JwtClaimTypes.Subject, "user-123")
        ]));

        _userRepo
            .Setup(r => r.GetRolesAsync("user-123", CancellationToken.None))
            .ReturnsAsync(["admin", "billing"]);

        var context = new ProfileDataRequestContext(
            subject: subject,
            client: new Client { ClientId = "test.client" },
            caller: "test",
            requestedClaimTypes: [JwtClaimTypes.Role]);

        // Act
        await _sut.GetProfileDataAsync(context);

        // Assert
        var roles = context.IssuedClaims
            .Where(c => c.Type == JwtClaimTypes.Role)
            .Select(c => c.Value)
            .ToList();

        Assert.Contains("admin", roles);
        Assert.Contains("billing", roles);
    }

    [Fact]
    public async Task IsActive_WithDeactivatedUser_ShouldSetIsActiveFalse()
    {
        var subject = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(JwtClaimTypes.Subject, "user-deactivated")
        ]));

        _userRepo
            .Setup(r => r.IsActiveAsync("user-deactivated", CancellationToken.None))
            .ReturnsAsync(false);

        var context = new IsActiveContext(
            subject: subject,
            client: new Client { ClientId = "test.client" },
            caller: "test");

        await _sut.IsActiveAsync(context);

        Assert.False(context.IsActive);
    }
}
```

> Note: `ProfileDataRequestContext` and `IsActiveContext` constructors are internal to Duende IdentityServer in some versions. If the constructors are inaccessible, test through the in-process `WebApplicationFactory` by issuing a real token and inspecting its claims with `JsonWebTokenHandler`.

---

## Pattern 6: Testing Authorization Policies

### Unit Testing an IAuthorizationHandler

Test `IAuthorizationHandler` implementations in isolation by constructing `AuthorizationHandlerContext` with synthetic claims.

```csharp
public class MinimumAgeHandlerTests
{
    private readonly MinimumAgeHandler _sut = new();

    [Fact]
    public async Task HandleRequirement_WithSufficientAge_ShouldSucceed()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(JwtClaimTypes.BirthDate, "1990-01-01")
        ], "Bearer"));

        var requirement = new MinimumAgeRequirement(18);
        var context = new AuthorizationHandlerContext(
            [requirement], user, resource: null);

        await _sut.HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task HandleRequirement_WithInsufficientAge_ShouldNotSucceed()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(JwtClaimTypes.BirthDate,
                DateTime.UtcNow.AddYears(-10).ToString("yyyy-MM-dd"))
        ], "Bearer"));

        var requirement = new MinimumAgeRequirement(18);
        var context = new AuthorizationHandlerContext(
            [requirement], user, resource: null);

        await _sut.HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }
}
```

### Integration Testing Policy Enforcement

Verify that policies enforce correctly against real endpoints using `TestAuthHandler`:

```csharp
[Fact]
public async Task AdminEndpoint_WithoutAdminRole_ShouldReturn403()
{
    _factory.ClaimsProvider.SetClaims(
    [
        new Claim(JwtClaimTypes.Subject, "user-002"),
        new Claim("role", "viewer") // WRONG not an admin
    ]);

    var response = await _client.DeleteAsync("/api/admin/users/42");

    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}

[Fact]
public async Task AdminEndpoint_WithAdminRole_ShouldReturn204()
{
    _factory.ClaimsProvider.SetClaims(
    [
        new Claim(JwtClaimTypes.Subject, "user-001"),
        new Claim("role", "admin")
    ]);

    var response = await _client.DeleteAsync("/api/admin/users/42");

    Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
}
```

---

## Pattern 7: Testing BFF Endpoints

BFF tests require cookie-based session simulation using `CookieContainer` + `HttpClientHandler`. Set `AllowAutoRedirect = false` so session redirects don't swallow status codes. Include `x-csrf: 1` header on all BFF local API calls -- missing it returns 400. Override the OIDC `OnRedirectToIdentityProvider` event to bypass external redirects in tests.

> See [docs/bff-testing.md](docs/bff-testing.md) for the complete `BffFactory`, `CookieContainer` setup, and antiforgery header test examples.

---

## Pattern 8: Testing with Aspire (Full-Stack)

Wire IdentityServer as a named Aspire resource, then use `WaitForResourceHealthyAsync("idp", cts.Token)` before requesting tokens. Obtain `idp` endpoint via `_app.GetEndpoint("idp", "https")` and pass it to `RequestClientCredentialsTokenAsync`.

> See [docs/aspire-testing.md](docs/aspire-testing.md) for the complete AppHost wiring and test fixture setup.

---

## Pattern 9: Validating Issued Token Claims

After issuing a token through the in-process IdentityServer, parse the JWT and assert on its claims without making a separate network call.

```csharp
[Fact]
public async Task IssuedToken_ShouldContainExpectedClaims()
{
    var tokenResponse = await _client.RequestClientCredentialsTokenAsync(
        new ClientCredentialsTokenRequest
        {
            Address = "https://localhost/connect/token",
            ClientId = "test.service",
            ClientSecret = "test-secret",
            Scope = "api1"
        });

    Assert.False(tokenResponse.IsError);

    // OK Parse without validation (signature not verifiable externally)
    //    or configure validation parameters matching the dev signing key
    var handler = new JsonWebTokenHandler();
    var jwt = handler.ReadJsonWebToken(tokenResponse.AccessToken);

    Assert.Equal("test.service", jwt.GetClaim(JwtClaimTypes.ClientId).Value);
    Assert.Contains("api1", jwt.GetClaim(JwtClaimTypes.Scope).Value.Split(' '));
    Assert.Equal("https://localhost", jwt.Issuer);
    Assert.True(jwt.ValidTo > DateTime.UtcNow);
}
```

---

## Common Pitfalls

### 1. Not Disabling Automatic Key Management in Tests

```csharp
// WRONG WRONG -- Automatic key management tries to write key files to disk in CI
services.AddIdentityServer();

// OK CORRECT -- Use a static developer key in tests
services.AddIdentityServer(options =>
{
    options.KeyManagement.Enabled = false;
})
.AddDeveloperSigningCredential(persistKey: false);
```

### 2. Disabling Authorization Entirely in Tests

```csharp
// WRONG WRONG -- Removing authorization makes every endpoint open; you can't test 403 behavior
services.AddSingleton<IAuthorizationHandler, AllowAllHandler>();

// OK CORRECT -- Use TestAuthHandler to control the identity per-test
// Authorization runs normally; only the authentication source changes
```

### 3. Hard-Coding Localhost Ports

```csharp
// WRONG WRONG -- Port conflicts in CI
new ClientCredentialsTokenRequest
{
    Address = "http://localhost:5001/connect/token",
    ...
}

// OK CORRECT -- Use the client's BaseAddress via the factory
_client = factory.CreateClient(); // BaseAddress is set to the test server
new ClientCredentialsTokenRequest
{
    Address = new Uri(_client.BaseAddress!, "connect/token").ToString(),
    ...
}
```

### 4. Forgetting to Add the openid Scope for Interactive Flows

```csharp
// WRONG WRONG -- Without openid scope, no ID token is returned
new Client
{
    AllowedGrantTypes = GrantTypes.Code,
    AllowedScopes = { "profile", "api1" } // Missing openid!
}

// OK CORRECT
new Client
{
    AllowedGrantTypes = GrantTypes.Code,
    AllowedScopes =
    {
        IdentityServerConstants.StandardScopes.OpenId,
        IdentityServerConstants.StandardScopes.Profile,
        "api1"
    }
}
```

### 5. Sharing a Single HttpClient Across Tests with TestAuthHandler

```csharp
// WRONG WRONG -- Identity set in one test bleeds into the next
public class MyTests : IClassFixture<ApiFactory>
{
    private static readonly HttpClient _sharedClient = factory.CreateClient();
    // ClaimsProvider state is shared and can be set by different tests in parallel

// OK CORRECT -- Create a fresh client per test, or reset ClaimsProvider in IAsyncLifetime
public async Task InitializeAsync()
{
    _factory.ClaimsProvider.ClearClaims();
    await Task.CompletedTask;
}
```

### 6. Not Awaiting Token Endpoint During Aspire Startup

```csharp
// WRONG WRONG -- IdentityServer may not be ready when the first test runs
await _app.StartAsync(cts.Token);
// Immediately request a token -- connection refused

// OK CORRECT -- Wait for the identity service to be healthy first
await _app.ResourceNotifications.WaitForResourceHealthyAsync("idp", cts.Token);
```

### 7. Incorrect Audience in Self-Signed Test Tokens

```csharp
// WRONG WRONG -- Audience in token doesn't match API's expected audience
var token = TestTokenFactory.CreateAccessToken(
    subject: "user-1",
    audience: "wrong-api",  // API expects "my-api"
    claims: []);

// OK CORRECT -- Audience must match ValidAudience in the token validation parameters
var token = TestTokenFactory.CreateAccessToken(
    subject: "user-1",
    audience: "my-api",
    claims: []);
```

---

## Resources

- [Duende IdentityServer Quickstarts](https://docs.duendesoftware.com/identityserver/quickstarts/)
- [Duende IdentityServer Samples -- GitHub](https://github.com/DuendeSoftware/Samples/tree/main/IdentityServer)
- [ASP.NET Core Integration Tests with WebApplicationFactory](https://learn.microsoft.com/aspnet/core/test/integration-tests)
- [IProfileService Reference -- Duende Docs](https://docs.duendesoftware.com/identityserver/reference/services/profile-service/)
- [Protecting APIs with JWT -- Duende Docs](https://docs.duendesoftware.com/identityserver/apis/aspnetcore/jwt/)
- [ASP.NET Core Authorization Tests -- Microsoft Docs](https://learn.microsoft.com/aspnet/core/security/authorization/policies)
- [IdentityModel Client Library](https://docs.duendesoftware.com/identitymodel/)
- [Duende BFF Samples](https://docs.duendesoftware.com/bff/samples/)
