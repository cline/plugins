---
name: duende-identityserver-deployment
description: "Guide for deploying Duende IdentityServer to production, covering reverse proxy configuration, data protection, health checks, distributed caching, multi-instance deployment, OpenTelemetry integration, logging, and common deployment pitfalls."
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# IdentityServer Deployment, Proxies, and Production Readiness

## When to Use This Skill

- Deploying IdentityServer behind a reverse proxy or load balancer
- Configuring ASP.NET Core Data Protection for production persistence
- Implementing health checks for monitoring IdentityServer instances
- Setting up distributed caching for multi-instance deployments
- Configuring OpenTelemetry for metrics, traces, and logs
- Troubleshooting common deployment issues (HTTPS downgrade, cookie problems, key rotation failures)
- Understanding the difference between Data Protection keys and IdentityServer signing keys
- Setting up logging and events for production monitoring

Docs: https://docs.duendesoftware.com/identityserver/deployment

## Deployment Architecture

IdentityServer is ASP.NET Core middleware. It can be hosted with the same diversity of technology as any ASP.NET Core application:

- Hosting: On-premises, cloud (Azure, AWS, GCP), containers, Kubernetes
- Web servers: Kestrel, IIS, Nginx, Apache
- Artifacts: Files, containers (no Dockerfile needed with `dotnet publish /t:PublishContainer`)
- Scaling: Horizontal with load balancers; requires shared state for multi-instance

## Reverse Proxy and Load Balancer Configuration

### The Problem

When IdentityServer runs behind a proxy that terminates TLS or changes the originating IP, the middleware sees incorrect request information. This causes:

- HTTPS requests downgraded to HTTP
- HTTP issuer published in `.well-known/openid-configuration` instead of HTTPS
- Incorrect host names in discovery document or redirects
- Cookies missing the `Secure` attribute (breaks `SameSite` behavior)

### Solution: ForwardedHeaders Middleware

Most proxies set `X-Forwarded-For` and `X-Forwarded-Proto` headers. Configure ASP.NET Core to read them.

#### Option 1: Environment Variable (Simplest)

Set `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true`. This automatically adds the middleware and accepts forwarded headers from any single proxy. Best for cloud-hosted environments and Kubernetes.

#### Option 2: Explicit Configuration (More Control)

```csharp
// Program.cs
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedHost |
                                ForwardedHeaders.XForwardedProto;

    // Add the IP address of your known proxy
    options.KnownProxies.Add(IPAddress.Parse("203.0.113.42"));

    // Or use a network range
    // var network = new IPNetwork(IPAddress.Parse("198.51.100.0"), 24);
    // options.KnownNetworks.Add(network);

    // Number of proxies in front of the app
    options.ForwardLimit = 1;
});
```

Important: The ForwardedHeaders middleware must run early in the pipeline, before IdentityServer middleware and ASP.NET authentication middleware.

### Default KnownNetworks

By default, `KnownNetworks` and `KnownProxies` support localhost (`127.0.0.1/8` and `::1`). This is useful for local development or when the proxy and .NET host are on the same machine. In production, configure the actual proxy addresses.

## ASP.NET Core Data Protection

> Cross-cutting concern: Data protection is critical for all Duende products -- both IdentityServer and BFF. See [ASP.NET Core Data Protection](https://docs.duendesoftware.com/general/data-protection/) for comprehensive guidance covering all Duende SDKs.

### Why It Matters

Data Protection is critical for IdentityServer. It encrypts and signs sensitive data including:

- Signing keys at rest (when automatic key management is used)
- Persisted grants at rest
- Server-side session data at rest
- State parameters for external OIDC providers
- UI message payloads (logout context, error context)
- Authentication session cookies
- Anti-forgery tokens

### Production Configuration

```csharp
// Program.cs
builder.Services.AddDataProtection()
    // Choose a persistence method
    .PersistKeysToFoo()       // PersistKeysToFileSystem, PersistKeysToDbContext,
                               // PersistKeysToAzureBlobStorage, PersistKeysToAWSSystemsManager,
                               // PersistKeysToStackExchangeRedis
    // Choose a key protection method
    .ProtectKeysWithBar()     // ProtectKeysWithCertificate, ProtectKeysWithAzureKeyVault
    // Set explicit application name
    .SetApplicationName("My.IdentityServer");
```

### Critical Rules

1. Always persist keys to durable storage using a `.PersistKeysTo...()` method
2. Ensure the storage itself is durable -- e.g., if using Redis, configure Redis persistence (RDB/AOF)
3. Always set an explicit application name with `.SetApplicationName()` to prevent key isolation issues
4. Share keys across all load-balanced instances
5. Consider a key escrow sink -- for backup/restore of corrupted data protection keys, configure an `IXmlEncryptor`-based escrow

### Data Protection Keys vs Signing Keys

| Aspect       | Data Protection Keys                               | IdentityServer Signing Keys                                               |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| Purpose      | Encrypt/sign sensitive data at rest and in cookies | Sign JWT tokens (id_tokens, access tokens)                                |
| Cryptography | Symmetric (private key)                            | Asymmetric (public/private key pair)                                      |
| Visibility   | Internal to the application                        | Public keys published via discovery/JWKS                                  |
| Managed by   | ASP.NET Core framework                             | IdentityServer (automatic key management)                                 |
| Storage      | Configured via `.PersistKeysTo...()`               | File system (default), EF operational store, or custom `ISigningKeyStore` |

Both are critical secrets. Losing either causes failures.

### Common Data Protection Problems

| Problem                                     | Symptom                                                 | Solution                                                  |
| ------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| No shared keys in load-balanced environment | `CryptographicException`: key not found in key ring     | Configure shared key persistence                          |
| Keys generated in dev included in build     | Keys from wrong environment can't be read in production | Exclude `~/keys` directory from source control and builds |
| Application name mismatch                   | Keys from one deployment can't be read by another       | Set explicit `SetApplicationName()` consistently          |
| IIS lacking permissions                     | Ephemeral keys generated every restart                  | Follow Microsoft's IIS Data Protection configuration      |
| .NET 6 path normalization change            | Keys break between .NET versions                        | Always set explicit application name (reverted in .NET 7+) |

### Symptoms of Data Protection Failure

- `CryptographicException` in logs
- Error messages like "Error unprotecting key with kid {Signing Key ID}"
- "The key {Data Protection Key ID} was not found in the key ring"
- Automatic signing key management fails silently

## IdentityServer Data Stores for Multi-Instance

### Configuration Data

For multi-instance deployments, configuration data must be shared:

| Scenario                      | Recommendation                                                        |
| ----------------------------- | --------------------------------------------------------------------- |
| Rarely changing configuration | In-memory stores loaded from config files (with redeploy for changes) |
| Dynamic configuration (SaaS)  | Database via EF Core stores or custom stores                          |

### Operational Data

Operational data must always be shared in multi-instance deployments:

- Authorization codes, tokens, consent -- via persisted grant store
- Signing keys -- via `ISigningKeyStore` (EF operational store or custom)
- Server-side sessions -- via `IServerSideSessionStore`

Use Entity Framework Core or a persistent cache like Redis.

## Distributed Caching

Some optional features require ASP.NET Core's `IDistributedCache`:

| Feature                       | Why It Needs Distributed Cache                               |
| ----------------------------- | ------------------------------------------------------------ |
| OIDC state data formatter     | Stores external provider state server-side instead of in URL |
| JWT replay cache              | Prevents JWT client credentials replay                       |
| Device flow throttling        | Rate-limits polling across instances                         |
| Authorization parameter store | Stores PAR request data                                      |

Configure a distributed cache for multi-instance deployments:

```csharp
// Program.cs -- Example using Redis
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = "localhost:6379";
});
```

## Health Checks

### Discovery Endpoint Health Check

Tests that IdentityServer can process requests and communicate with the configuration store:

```csharp
public class DiscoveryHealthCheck : IHealthCheck
{
    private readonly IEnumerable<Hosting.Endpoint> _endpoints;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public DiscoveryHealthCheck(IEnumerable<Hosting.Endpoint> endpoints,
        IHttpContextAccessor httpContextAccessor)
    {
        _endpoints = endpoints;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var endpoint = _endpoints.FirstOrDefault(
                x => x.Name == IdentityServerConstants.EndpointNames.Discovery);
            if (endpoint != null)
            {
                var handler = _httpContextAccessor.HttpContext.RequestServices
                    .GetRequiredService(endpoint.Handler) as IEndpointHandler;
                if (handler != null)
                {
                    var result = await handler.ProcessAsync(
                        _httpContextAccessor.HttpContext);
                    if (result is DiscoveryDocumentResult)
                    {
                        return HealthCheckResult.Healthy();
                    }
                }
            }
        }
        catch { }

        return new HealthCheckResult(context.Registration.FailureStatus);
    }
}
```

### JWKS Health Check

Tests that IdentityServer can access its signing keys:

```csharp
public class DiscoveryKeysHealthCheck : IHealthCheck
{
    private readonly IEnumerable<Hosting.Endpoint> _endpoints;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public DiscoveryKeysHealthCheck(IEnumerable<Hosting.Endpoint> endpoints,
        IHttpContextAccessor httpContextAccessor)
    {
        _endpoints = endpoints;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var endpoint = _endpoints.FirstOrDefault(
                x => x.Name == IdentityServerConstants.EndpointNames.Jwks);
            if (endpoint != null)
            {
                var handler = _httpContextAccessor.HttpContext.RequestServices
                    .GetRequiredService(endpoint.Handler) as IEndpointHandler;
                if (handler != null)
                {
                    var result = await handler.ProcessAsync(
                        _httpContextAccessor.HttpContext);
                    if (result is JsonWebKeysResult)
                    {
                        return HealthCheckResult.Healthy();
                    }
                }
            }
        }
        catch { }

        return new HealthCheckResult(context.Registration.FailureStatus);
    }
}
```

Note: Finding endpoints by name requires IdentityServer v6.3+.

## OpenTelemetry Integration

IdentityServer emits traces, metrics, and logs via the .NET OpenTelemetry SDK (added in v6.1, expanded in v7.0).

### Setup

```bash
dotnet add package OpenTelemetry
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
```

```csharp
// Program.cs
using OpenTelemetry.Resources;

// Add OpenTelemetry logging to correlate logs with traces
builder.Logging.AddOpenTelemetry();

var openTelemetry = builder.Services.AddOpenTelemetry();

openTelemetry.ConfigureResource(r => r
    .AddService(builder.Environment.ApplicationName));

openTelemetry.WithMetrics(m => m
    .AddMeter("Duende.IdentityServer")   // Telemetry.ServiceName == "Duende.IdentityServer"
    .AddPrometheusExporter());

openTelemetry.WithTracing(t => t
    .AddSource(IdentityServerConstants.Tracing.Basic)
    .AddSource(IdentityServerConstants.Tracing.Cache)
    .AddSource(IdentityServerConstants.Tracing.Services)
    .AddSource(IdentityServerConstants.Tracing.Stores)
    .AddSource(IdentityServerConstants.Tracing.Validation)
    .AddAspNetCoreInstrumentation()
    .AddConsoleExporter());

// Add Prometheus scraping endpoint
app.UseOpenTelemetryPrometheusScrapingEndpoint();
```

### Tracing Sources

| Source                                       | What It Traces                                                  |
| -------------------------------------------- | --------------------------------------------------------------- |
| `IdentityServerConstants.Tracing.Basic`      | High-level request processing (validators, response generators) |
| `IdentityServerConstants.Tracing.Cache`      | Cache operations                                                |
| `IdentityServerConstants.Tracing.Services`   | Service-layer operations                                        |
| `IdentityServerConstants.Tracing.Stores`     | Store operations (database calls)                               |
| `IdentityServerConstants.Tracing.Validation` | Detailed validation operations                                  |

In production, you may want only `Basic` tracing. Use all sources during development and troubleshooting.

### Key Metrics (v7.0+)

The meter name is `Duende.IdentityServer` (accessible via `Telemetry.ServiceName`).

| Metric          | Counter Name                            | Description                                      |
| --------------- | --------------------------------------- | ------------------------------------------------ |
| Operations      | `tokenservice.operation`                | Aggregated success/failure/internal_error counts |
| Active Requests | `active_requests`                       | Current requests being processed by endpoints    |
| Token Issuance  | `tokenservice.token_issued`             | Successful/failed token issuance attempts        |
| Client Auth     | `tokenservice.client.secret_validation` | Client authentication success/failure            |
| Introspection   | `tokenservice.introspection`            | Token introspection counts                       |
| Revocation      | `tokenservice.revocation`               | Token revocation counts                          |

### UI Metrics (From Quickstart)

| Metric      | Counter Name              | Tags                                    |
| ----------- | ------------------------- | --------------------------------------- |
| User Login  | `tokenservice.user_login` | client, idp, error                      |
| User Logout | `user_logout`             | idp                                     |
| Consent     | `tokenservice.consent`    | client, scope, consent (granted/denied) |

## Logging

IdentityServer uses ASP.NET Core's standard `ILogger`. Logs are written under the `Duende.IdentityServer` category.

### Log Levels

| Level         | Usage                                               |
| ------------- | --------------------------------------------------- |
| `Trace`       | Sensitive data (tokens); never enable in production |
| `Debug`       | Internal flow and decisions; short-term debugging   |
| `Information` | General application flow; long-term value           |
| `Warning`     | Abnormal or unexpected events                       |
| `Error`       | Failed validation, unhandled exceptions             |
| `Critical`    | Missing store implementations, invalid key material |

### Configuration

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Duende.IdentityServer": "Information"
    }
  }
}
```

In production, default to `Warning` to avoid excessive log volume.

### Filtering Exceptions

```csharp
builder.Services.AddIdentityServer(options =>
{
    options.Logging.UnhandledExceptionLoggingFilter = (ctx, ex) =>
    {
        // Return false to suppress, true to log
        if (ctx.RequestAborted.IsCancellationRequested && ex is OperationCanceledException)
            return false; // Already the default
        return true;
    };
});
```

### OpenTelemetry Log Correlation

Logs written to `ILogger` in .NET 8+ can be exported to OpenTelemetry traces. Add `builder.Logging.AddOpenTelemetry()` to correlate logs with trace IDs.

## Events System

Events provide higher-level structured data about operations, suitable for APM integration.

### Enabling Events

```csharp
builder.Services.AddIdentityServer(options =>
{
    options.Events.RaiseSuccessEvents = true;
    options.Events.RaiseFailureEvents = true;
    options.Events.RaiseErrorEvents = true;
    options.Events.RaiseInformationEvents = true;
});
```

### Raising Events

```csharp
public async Task<IActionResult> Login(LoginInputModel model)
{
    if (_users.ValidateCredentials(model.Username, model.Password))
    {
        var user = _users.FindByUsername(model.Username);
        await _events.RaiseAsync(
            new UserLoginSuccessEvent(user.Username, user.SubjectId, user.Username));
    }
    else
    {
        await _events.RaiseAsync(
            new UserLoginFailureEvent(model.Username, "invalid credentials"));
    }
}
```

### Custom Event Sink

```csharp
public class SeqEventSink : IEventSink
{
    private readonly Logger _log;

    public SeqEventSink()
    {
        _log = new LoggerConfiguration()
            .WriteTo.Seq("http://localhost:5341")
            .CreateLogger();
    }

    public Task PersistAsync(Event evt)
    {
        if (evt.EventType == EventTypes.Success ||
            evt.EventType == EventTypes.Information)
        {
            _log.Information("{Name} ({Id}), Details: {@details}",
                evt.Name, evt.Id, evt);
        }
        else
        {
            _log.Error("{Name} ({Id}), Details: {@details}",
                evt.Name, evt.Id, evt);
        }
        return Task.CompletedTask;
    }
}
```

Events work well with structured logging stores like ELK, Seq, or Splunk.

## Production Readiness Checklist

| Item                                                  | Status                                 | Notes                                   |
| ----------------------------------------------------- | -------------------------------------- | --------------------------------------- |
| Data Protection keys persisted to durable storage     | Required                               | `.PersistKeysTo...()`                   |
| Data Protection keys shared across instances          | Required for multi-instance            | Same storage for all instances          |
| Explicit application name set                         | Required                               | `.SetApplicationName("My.IdentityServer")` |
| ForwardedHeaders configured (if behind proxy)         | Required                               | Match your proxy's headers              |
| Operational store configured with durable persistence | Required                               | EF Core or custom store                 |
| Token cleanup enabled                                 | Recommended                            | `EnableTokenCleanup = true`             |
| Configuration store cache enabled                     | Recommended                            | `AddConfigurationStoreCache()`          |
| Distributed cache configured (if multi-instance)      | Recommended                            | Redis, SQL, etc.                        |
| Health checks implemented                             | Recommended                            | Discovery + JWKS endpoints              |
| OpenTelemetry configured                              | Recommended                            | Metrics + traces for monitoring         |
| Events enabled                                        | Recommended                            | For auditing and APM                    |
| Signing key store uses durable storage                | Required for multi-instance            | EF operational store or custom          |
| Logging level set to Warning+ for production          | Recommended                            | Avoid log bloat                         |
| `~/keys` directory excluded from source control       | Required if using file-based key store | Prevent dev keys in production          |

## Common Anti-Patterns

- WRONG Deploying without configuring ForwardedHeaders behind a reverse proxy
- OK Always configure ForwardedHeaders when behind a proxy; test by checking the discovery document's issuer URL

- WRONG Using default (ephemeral) Data Protection keys in production
- OK Always persist keys to durable, shared storage with `.PersistKeysTo...()`

- WRONG Not setting `SetApplicationName()` causing key isolation between deployments
- OK Always set an explicit, consistent application name

- WRONG Using file-system signing key store in containerized/multi-instance deployments
- OK Use EF operational store or a shared `ISigningKeyStore` implementation

- WRONG Enabling `Trace` or `Debug` logging in production -- exposes tokens and sensitive data
- OK Use `Warning` level in production; use `Information` temporarily for troubleshooting

- WRONG Not enabling token cleanup -- database grows indefinitely
- OK Enable `EnableTokenCleanup = true` and configure appropriate intervals

## Common Pitfalls

1. Discovery document shows HTTP issuer: The most common deployment issue. Always configure ForwardedHeaders or the `ASPNETCORE_FORWARDEDHEADERS_ENABLED` environment variable when behind a TLS-terminating proxy.

2. CryptographicException on startup: Usually means Data Protection keys from one environment are being used in another. Check that keys are persisted correctly and the application name is consistent.

3. Signing keys not shared across instances: The default file-system key store is per-instance. Use `AddOperationalStore()` which includes `ISigningKeyStore`, or configure a custom shared store.

4. Redis losing Data Protection keys on restart: If using `PersistKeysToStackExchangeRedis`, configure Redis with persistence (RDB snapshots or AOF) to survive restarts.

5. IIS Data Protection permissions: IIS may lack permissions to persist Data Protection keys. Follow Microsoft's IIS-specific Data Protection documentation.

6. Multiple proxies in chain: If you have more than one proxy, set `ForwardLimit` to match the number of proxies, and add all proxy addresses to `KnownProxies` or `KnownNetworks`.

7. Cookie SameSite failures behind proxy: If the proxy strips HTTPS, cookies won't get the `Secure` attribute, causing `SameSite=None` cookies to be rejected by browsers. Fix the proxy configuration first.

8. OpenTelemetry trace source selection: In production, subscribing to all trace sources (`Stores`, `Validation`, etc.) can generate excessive trace data. Start with `Basic` and add more sources as needed for troubleshooting.

---

## Related Skills

- `duende-identityserver-hosting-setup` -- DI registration and middleware pipeline
- `duende-identityserver-stores` -- EF Core stores, migrations, token cleanup
- `duende-identityserver-aspire` -- orchestrating IdentityServer in Aspire AppHost
