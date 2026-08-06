---
name: duende-identityserver-aspire
description: Orchestrate Duende IdentityServer in .NET Aspire AppHost -- dependency graphs, authority URL wiring, health checks, and multi-instance.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Orchestrating IdentityServer with .NET Aspire

## When to Use This Skill

Use this skill when:
- Adding Duende IdentityServer to an Aspire-orchestrated solution
- Configuring service dependencies so clients and APIs wait for IdentityServer
- Passing IdentityServer's authority URL to dependent services via Aspire
- Wiring database resources for IdentityServer configuration and operational stores
- Ensuring IdentityServer exposes health checks for Aspire startup ordering
- Adding IdentityServer telemetry sources to Aspire service defaults
- Running multiple IdentityServer replicas in Aspire
- Integration testing an Aspire solution that includes IdentityServer

## Core Principles

1. IdentityServer is a startup dependency -- Every client app and API depends on IdentityServer being available for discovery, token validation, and OIDC flows. Model this with `WithReference()` + `WaitFor()`.
2. Explicit configuration over service discovery -- Pass the authority URL, client IDs, and scopes as explicit environment variables. App code reads `IConfiguration`/`IOptions<T>`, never Aspire service discovery.
3. Health checks enable startup ordering -- Aspire's `WaitFor()` requires the target to expose a healthy health check endpoint. IdentityServer must be configured with health checks for startup ordering to work.
4. Cross-reference, don't duplicate -- General Aspire and IdentityServer patterns are covered by existing skills. This skill covers only the unique orchestration intersection.

## Related Skills

- `duende-identityserver-hosting-setup` -- IdentityServer DI and middleware pipeline
- `duende-identityserver-deployment` -- production deployment, data protection, health check implementations
- `duende-identityserver-stores` -- EF Core stores for configuration and operational data

Docs: https://docs.duendesoftware.com/identityserver/aspire

---

## Pattern 1: AppHost Orchestration Basics

IdentityServer is added to an Aspire AppHost like any ASP.NET Core project. The key
addition is wiring its database dependency so the database is ready before IdentityServer
starts.

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var sqlServer = builder.AddSqlServer("sql");
var identityDb = sqlServer.AddDatabase("identitydb");

var identityServer = builder.AddProject<Projects.IdentityServer>("identity-server")
    .WithReference(identityDb)
    .WaitFor(sqlServer);

builder.Build().Run();
```

`WaitFor(sqlServer)` ensures the database is accepting connections before IdentityServer
starts. This matters because IdentityServer connects to EF Core stores on startup for
configuration and operational data.

> Important: The IdentityServer project itself is a standard ASP.NET Core application.
> See `duende-identityserver-hosting-setup` for DI registration and middleware pipeline setup.
> This skill focuses only on how the AppHost orchestrates it.

---

## Pattern 2: Service Dependency Graph

This is the most critical pattern. Clients and APIs must depend on IdentityServer
because:

- Clients download the discovery document (`.well-known/openid-configuration`) at
  startup to configure OIDC flows
- APIs configured with JWT Bearer authentication download JWKS (signing keys) from
  IdentityServer at startup to validate tokens
- OIDC login redirects fail if IdentityServer isn't running when a user tries to
  sign in

Without explicit dependency ordering, services start in parallel and fail with cryptic
"unable to obtain configuration" errors.

### Full dependency graph

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var sqlServer = builder.AddSqlServer("sql");
var identityDb = sqlServer.AddDatabase("identitydb");

var identityServer = builder.AddProject<Projects.IdentityServer>("identity-server")
    .WithReference(identityDb)
    .WaitFor(sqlServer);

var api = builder.AddProject<Projects.WeatherApi>("weather-api")
    .WithReference(identityServer)
    .WaitFor(identityServer);

var webApp = builder.AddProject<Projects.WebApp>("web-app")
    .WithReference(identityServer)
    .WaitFor(identityServer)
    .WithReference(api);

builder.Build().Run();
```

### What each call does

| Call | Effect |
|------|--------|
| `.WithReference(identityServer)` | Makes the IdentityServer endpoint URL available to the dependent service via service discovery |
| `.WaitFor(identityServer)` | Holds the dependent service from starting until IdentityServer's health check returns healthy |

Both are needed. `WithReference` alone provides the URL but doesn't prevent premature
startup. `WaitFor` alone doesn't expose the endpoint URL.

### Dependency flow

```
sqlServer ++-+>> identity-server ++-+>> weather-api
                               ++-+>> web-app ++-++-+>> weather-api
```

> Important: Without `WaitFor(identityServer)`, the API and web app may start before
> IdentityServer is ready, causing `HttpRequestException` when fetching the discovery
> document or JWKS. This leads to `InvalidOperationException: IDX20803: Unable to obtain
> configuration from 'https://.../.well-known/openid-configuration'` errors at startup.

---

## Pattern 3: Authority URL and OIDC Configuration

`WithReference(identityServer)` makes the endpoint available via Aspire service discovery,
but client applications need explicit configuration for the OIDC authority URL, client ID,
and scopes. Use `WithEnvironment` to pass these as standard configuration values.

### Web application (OIDC client)

```csharp
var webApp = builder.AddProject<Projects.WebApp>("web-app")
    .WithReference(identityServer)
    .WaitFor(identityServer)
    .WithEnvironment("Authentication__Authority", identityServer.GetEndpoint("https"))
    .WithEnvironment("Authentication__ClientId", "web-app")
    .WithEnvironment("Authentication__Scopes__0", "openid")
    .WithEnvironment("Authentication__Scopes__1", "profile")
    .WithEnvironment("Authentication__Scopes__2", "weather.read");
```

### API (JWT Bearer)

```csharp
var api = builder.AddProject<Projects.WeatherApi>("weather-api")
    .WithReference(identityServer)
    .WaitFor(identityServer)
    .WithEnvironment("Authentication__Authority", identityServer.GetEndpoint("https"));
```

### Issuer URI consideration

By default, IdentityServer infers the issuer URI from incoming requests, which works
correctly within Aspire's network. Only override if the internal URL differs from what
clients see:

```csharp
var identityServer = builder.AddProject<Projects.IdentityServer>("identity-server")
    .WithReference(identityDb)
    .WaitFor(sqlServer)
    .WithEnvironment("IdentityServer__IssuerUri", identityServer.GetEndpoint("https"));
```

> Important: Do NOT set `IssuerUri` unless the internal Aspire URL differs from what
> clients see. Mismatched issuer URIs cause token validation failures -- the `iss` claim in
> tokens won't match the expected authority.

See `aspire-configuration` for the general pattern of reading these values via `IOptions<T>`
in the app project.

> When generating app code: The environment variables above map to standard
> `IConfiguration` keys (`Authentication:Authority`, `Authentication:ClientId`,
> `Authentication:Scopes:0`, etc.). When scaffolding the web app, configure
> `AddOpenIdConnect` to read `Authority` and `ClientId` from
> `builder.Configuration["Authentication:Authority"]` and
> `builder.Configuration["Authentication:ClientId"]`. Bind scopes from the
> `Authentication:Scopes` configuration section. For the API, configure
> `AddJwtBearer` with `options.Authority` from
> `builder.Configuration["Authentication:Authority"]`.
> See `duende-aspnetcore-authentication` for full OIDC and JWT Bearer middleware setup.
> See `aspire-configuration` for the general `IOptions<T>` binding pattern.

---

## Pattern 4: Database and Store Wiring

IdentityServer typically needs its own database for configuration and operational stores.
Other services in the solution use separate databases for application data.

### Separate databases per service

```csharp
var sqlServer = builder.AddSqlServer("sql");
var identityDb = sqlServer.AddDatabase("identitydb");
var appDb = sqlServer.AddDatabase("appdb");

var identityServer = builder.AddProject<Projects.IdentityServer>("identity-server")
    .WithReference(identityDb)
    .WaitFor(sqlServer);

var api = builder.AddProject<Projects.WeatherApi>("weather-api")
    .WithReference(appDb)
    .WaitFor(sqlServer)
    .WithReference(identityServer)
    .WaitFor(identityServer);
```

`WithReference(identityDb)` sets `ConnectionStrings__identitydb` automatically. The
IdentityServer project's EF stores must use this connection string name:

```csharp
// In IdentityServer's Program.cs
builder.Services.AddIdentityServer()
    .AddConfigurationStore(options =>
    {
        options.ConfigureDbContext = b =>
            b.UseSqlServer(builder.Configuration.GetConnectionString("identitydb"));
    })
    .AddOperationalStore(options =>
    {
        options.ConfigureDbContext = b =>
            b.UseSqlServer(builder.Configuration.GetConnectionString("identitydb"));
    });
```

### Migration strategies

- Option A: Startup migration -- Call `Database.MigrateAsync()` in `Program.cs`. Simple
  and suitable for development.
- Option B: Dedicated migration service -- Add a separate migration runner project that
  runs before IdentityServer:

```csharp
var migrations = builder.AddProject<Projects.MigrationRunner>("migrations")
    .WithReference(identityDb)
    .WaitFor(sqlServer);

var identityServer = builder.AddProject<Projects.IdentityServer>("identity-server")
    .WithReference(identityDb)
    .WaitFor(migrations);  // Wait for migrations to complete
```

See `duende-identityserver-stores` for EF Core store configuration details and migration
patterns.

---

## Pattern 5: Health Checks for Startup Readiness

Aspire's `WaitFor()` polls the target's `/health` endpoint. If IdentityServer doesn't
expose a health check, `WaitFor()` has no readiness signal and dependent services may
start too early or the AppHost may time out waiting.

### Minimal health check setup

```csharp
// In IdentityServer's Program.cs
builder.Services.AddHealthChecks();

// After building the app
app.MapHealthChecks("/health");
```

### Enhanced health checks with readiness validation

For production-grade startup ordering, add checks that validate IdentityServer can
actually serve discovery documents and signing keys:

```csharp
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddCheck<DiscoveryDocumentHealthCheck>("discovery", tags: ["ready"])
    .AddCheck<DiscoveryKeysHealthCheck>("jwks", tags: ["ready"]);

app.MapHealthChecks("/health");
app.MapHealthChecks("/alive", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("live")
});
app.MapHealthChecks("/ready", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("ready")
});
```

The `DiscoveryDocumentHealthCheck` and `DiscoveryKeysHealthCheck` verify that IdentityServer
can serve its discovery document and signing keys. These checks catch configuration errors
(missing signing credentials, database connection failures) before dependent services try
to connect.

> Important: The `DiscoveryDocumentHealthCheck` and `DiscoveryKeysHealthCheck`
> implementations are covered in the `duende-identityserver-deployment` skill. Use them to ensure
> IdentityServer is fully operational before dependent services start.

If using `AddServiceDefaults()` from the Aspire service defaults project, the `/health`
and `/alive` endpoints are already mapped. You still need to register the
IdentityServer-specific health checks in the DI container.

---

## Pattern 6: Service Defaults Integration

IdentityServer emits OpenTelemetry traces and metrics under specific source names. To see
them in the Aspire dashboard, add these sources in the shared service defaults project.

### Tracing sources

Add IdentityServer activity sources to `ConfigureOpenTelemetry` in the service defaults
`Extensions.cs`:

```csharp
tracing
    .AddSource(builder.Environment.ApplicationName)
    // Duende IdentityServer trace sources
    .AddSource("Duende.IdentityServer")
    .AddSource("Duende.IdentityServer.Cache")
    .AddSource("Duende.IdentityServer.Services")
    .AddSource("Duende.IdentityServer.Stores")
    .AddSource("Duende.IdentityServer.Validation")
    .AddAspNetCoreInstrumentation()
    .AddHttpClientInstrumentation();
```

### Metrics

Add the IdentityServer meter:

```csharp
metrics
    .AddMeter("Duende.IdentityServer")
    .AddAspNetCoreInstrumentation()
    .AddHttpClientInstrumentation()
    .AddRuntimeInstrumentation();
```

> Important: Use string literals (not `IdentityServerConstants.Tracing.*` or
> `Telemetry.ServiceName`) in service defaults to avoid adding a Duende.IdentityServer
> package reference to the shared project. Only the IdentityServer project itself should
> reference the Duende package.

See `aspire-service-defaults` for the full service defaults setup pattern and
`duende-identityserver-deployment` for detailed telemetry guidance.

---

## Pattern 7: Multi-Instance Considerations

Aspire supports running multiple instances of a project with `WithReplicas`:

```csharp
var identityServer = builder.AddProject<Projects.IdentityServer>("identity-server")
    .WithReference(identityDb)
    .WaitFor(sqlServer)
    .WithReplicas(3);
```

Running multiple IdentityServer instances requires shared state across all replicas:

- Shared signing key store -- All instances must access the same signing keys via a
  shared `ISigningKeyStore` (EF operational store or custom implementation)
- Shared data protection keys -- All instances must share ASP.NET Data Protection keys
  (Redis, database, or blob storage). Without this, authentication cookies encrypted by
  one instance can't be decrypted by another.
- Shared operational store -- Persisted grants, device codes, and server-side sessions
  must be in a shared database
- Distributed cache -- Required if using the OIDC state data formatter, JWT replay
  cache, or Pushed Authorization Requests (PAR)

See `duende-identityserver-deployment` for data protection and operational store configuration.
See `duende-identityserver-stores` for EF Core store setup.

> Important: Do NOT use `.WithReplicas(n)` without first configuring shared state.
> Multiple instances with file-based signing keys or in-memory stores will produce token
> validation failures, lost sessions, and authentication cookie errors.

---

## Pattern 8: Integration Testing with IdentityServer

When integration testing an Aspire solution that includes IdentityServer, the key
challenge is that the authority URL uses a dynamic port assigned at runtime. Test clients
must discover the URL from the test fixture.

```csharp
public sealed class IdentityAspireFixture : IAsyncLifetime
{
    private DistributedApplication? _app;

    public async Task InitializeAsync()
    {
        var builder = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.MyApp_AppHost>();

        _app = await builder.BuildAsync();
        await _app.StartAsync();

        // Wait for IdentityServer to be healthy before running tests
        await _app.ResourceNotifications
            .WaitForResourceHealthyAsync("identity-server");
    }

    public Uri GetAuthorityUrl() =>
        _app!.GetEndpoint("identity-server", "https");

    public HttpClient CreateApiClient() =>
        _app!.CreateHttpClient("weather-api");

    public async Task DisposeAsync()
    {
        if (_app is not null)
        {
            await _app.StopAsync();
            await _app.DisposeAsync();
        }
    }
}
```

The important details:

- `WaitForResourceHealthyAsync("identity-server")` ensures IdentityServer is fully
  ready before any test runs. The resource name matches the name in the AppHost.
- `GetEndpoint("identity-server", "https")` returns the dynamic `https://localhost:{port}`
  URL. Use this as the authority when configuring test `HttpClient` instances.
- `CreateHttpClient("weather-api")` creates a client pre-configured with the API's
  dynamic base address.

---

## Do / Don't Checklist

Do
- Use `WithReference()` + `WaitFor()` for every service that depends on IdentityServer
- Pass authority URLs and OIDC settings as explicit environment variables
- Register health checks in IdentityServer for Aspire startup ordering
- Add IdentityServer telemetry sources to service defaults as string literals
- Use separate databases for IdentityServer and application data

Don't
- Start APIs or web apps without `WaitFor(identityServer)` -- causes discovery failures
- Reference Duende packages from the shared service defaults project
- Use `WithReplicas()` without configuring shared state (signing keys, data protection, operational store)
- Set `IssuerUri` unless the internal and external URLs actually differ
- Duplicate Aspire or IdentityServer patterns covered by other skills -- cross-reference them

---

## Resources
- .NET Aspire orchestration: https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/app-host
- Aspire service dependencies: https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/app-host#waiting-for-resources
- Duende IdentityServer documentation: https://docs.duendesoftware.com/
