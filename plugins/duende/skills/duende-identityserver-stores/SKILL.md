---
name: duende-identityserver-stores
description: Implement and customize Duende IdentityServer stores including configuration store, operational store, and Entity Framework Core integration. Covers migrations, custom store implementations, caching strategies, server-side sessions, signing key storage, token cleanup, and multi-tenant patterns.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Duende IdentityServer Stores

## When to Use This Skill

- You are wiring up `AddConfigurationStore()` or `AddOperationalStore()` with EF Core and need correct registration, migration assembly setup, and schema configuration.
- You are implementing a custom `IClientStore`, `IResourceStore`, `IPersistedGrantStore`, or `ISigningKeyStore` against a non-EF data source (Redis, Mongo, external API, etc.).
- You need to enable and tune configuration store caching (`AddConfigurationStoreCache()`, expiration windows, distributed cache setup) to reduce database load.
- You are managing EF Core migrations across IdentityServer versions and need to correctly handle schema drift for `ConfigurationDbContext` and `PersistedGrantDbContext`.
- You are enabling server-side sessions (`IServerSideSessionStore`) and need to understand session lifecycle, cleanup, and storage integration.
- You are troubleshooting stale client or resource data, expired token accumulation, or signing key rotation failures tied to store configuration.
- You are designing a multi-tenant IdentityServer deployment and need to choose between database-per-tenant and shared-database store strategies.

## Core Principles

Store interfaces decouple IdentityServer from persistence. All data access goes through store interfaces registered in the ASP.NET Core DI container. IdentityServer does not care what database backs them -- EF Core, Redis, MongoDB, or a static in-memory collection are all equally valid.

Two independent store categories exist: configuration and operational. They can be used independently or together. Configuration data is relatively static (clients, resources, CORS); operational data is dynamic and high-write (grants, sessions, signing keys). They should be sized, cached, and maintained with those distinct access patterns in mind.

Operational data is protected at rest. The `Data` payload of persisted grants and serialized signing keys is encrypted using the ASP.NET Core Data Protection API. Key rotation and Data Protection configuration must be coordinated -- a lost Data Protection key makes stored grants and signing keys unreadable.

Consumed grants are soft-deleted, not immediately removed. One-time-use grants (e.g., authorization codes, one-time refresh tokens) are marked with a `ConsumedTime` rather than deleted. This enables threat detection in custom `IRefreshTokenService` implementations. Do not confuse consumed with expired -- the token cleanup service only removes records past their `Expiration`, not consumed ones (unless `RemoveConsumedTokens` is enabled).

EF Core schema changes are your responsibility. Duende does not ship automatic migration scripts or schema upgrade tooling. You own migration creation, application, and data migration between IdentityServer versions.

Docs: https://docs.duendesoftware.com/identityserver/data

---

## NuGet Package

```bash
dotnet add package Duende.IdentityServer.EntityFramework
```

This package provides EF Core implementations for all configuration and operational store interfaces.

---

## Store Architecture

IdentityServer's data is split into two categories, each with its own set of store interfaces:

Configuration data:

- Clients
- API resources
- API scopes
- Identity resources
- Identity providers
- CORS policies

Operational data:

- Authorization codes
- Reference tokens
- Refresh tokens
- User consent
- Device codes
- Pushed authorization requests
- Signing keys
- Server-side sessions

Primary stores:

- `ConfigurationDbContext`: backs `IClientStore`, `IResourceStore`, `IIdentityProviderStore`, and `ICorsPolicyService`.
- `PersistedGrantDbContext`: backs `IPersistedGrantStore`, `IDeviceFlowStore`, `IPushedAuthorizationRequestStore`, `IServerSideSessionStore`, and `ISigningKeyStore`.

### Configuration Data

Stores static, rarely-changing data that describes how IdentityServer behaves:

| Interface | Contents |
|---|---|
| `IClientStore` | OAuth/OIDC clients (grant types, redirect URIs, secrets, claims, scopes) |
| `IResourceStore` | `IdentityResource`, `ApiResource`, and `ApiScope` definitions |
| `ICorsPolicyService` | CORS allowed-origin rules (derived from client configuration) |
| `IIdentityProviderStore` | Dynamic external identity provider registrations |

### Operational Data

Stores dynamic, high-write runtime state that IdentityServer creates and manages during request processing:

| Interface | Contents |
|---|---|
| `IPersistedGrantStore` | Authorization codes, refresh tokens, reference tokens, user consent records |
| `IDeviceFlowStore` | Device authorization flow codes and user codes |
| `ISigningKeyStore` | Dynamically managed signing keys (used by automatic key management) |
| `IServerSideSessionStore` | Server-side authentication session data for interactive users |
| `IPushedAuthorizationRequestStore` | Pushed authorization request (PAR) data |

---

## EF Core Integration

The `Duende.IdentityServer.EntityFramework` NuGet package provides EF Core-backed implementations of all store interfaces. It ships two `DbContext` types:

- `ConfigurationDbContext` -- backs `IClientStore`, `IResourceStore`, `ICorsPolicyService`, `IIdentityProviderStore`
- `PersistedGrantDbContext` -- backs `IPersistedGrantStore`, `IDeviceFlowStore`, `ISigningKeyStore`, `IServerSideSessionStore`

### Registering Both Stores

```csharp
// OK Correct: register both stores with explicit migration assembly
var migrationsAssembly = typeof(Program).Assembly.GetName().Name;
var connectionString = builder.Configuration.GetConnectionString("IdentityServer");

builder.Services.AddIdentityServer()
    .AddConfigurationStore(options =>
    {
        options.ConfigureDbContext = b =>
            b.UseSqlServer(connectionString, sql =>
                sql.MigrationsAssembly(migrationsAssembly));
    })
    .AddOperationalStore(options =>
    {
        options.ConfigureDbContext = b =>
            b.UseSqlServer(connectionString, sql =>
                sql.MigrationsAssembly(migrationsAssembly));

        options.EnableTokenCleanup = true;
        options.TokenCleanupInterval = 3600; // seconds; default 1 hour
    });
```

```csharp
// WRONG Wrong: omitting MigrationsAssembly when migrations live in the host project
builder.Services.AddIdentityServer()
    .AddConfigurationStore(options =>
    {
        options.ConfigureDbContext = b => b.UseSqlServer(connectionString);
        // EF will look for migrations in Duende.IdentityServer.EntityFramework.dll
        // and fail to find them
    });
```

### Separate Schemas

Isolate configuration and operational tables using `DefaultSchema` to avoid naming collisions and simplify backup strategies:

```csharp
// OK Recommended for production: dedicated schemas per store
builder.Services.AddIdentityServer()
    .AddConfigurationStore(options =>
    {
        options.DefaultSchema = "idscfg";
        options.ConfigureDbContext = b =>
            b.UseSqlServer(connectionString, sql =>
            {
                sql.MigrationsAssembly(migrationsAssembly);
                sql.MigrationsHistoryTable("__ConfigMigrationsHistory", "idscfg");
            });
    })
    .AddOperationalStore(options =>
    {
        options.DefaultSchema = "idsop";
        options.ConfigureDbContext = b =>
            b.UseSqlServer(connectionString, sql =>
            {
                sql.MigrationsAssembly(migrationsAssembly);
                sql.MigrationsHistoryTable("__OperationalMigrationsHistory", "idsop");
            });
    });
```

---

## Migrations

EF Core migrations must be created in the host assembly. IdentityServer does not generate or apply migrations automatically.

### Creating Migrations

```shell
# Configuration store migration
dotnet ef migrations add InitialIdentityServerConfigurationDb \
  --context ConfigurationDbContext \
  --output-dir Data/Migrations/IdentityServer/ConfigurationDb

# Operational store migration
dotnet ef migrations add InitialIdentityServerOperationalDb \
  --context PersistedGrantDbContext \
  --output-dir Data/Migrations/IdentityServer/OperationalDb
```

### Applying Migrations at Startup

```csharp
// OK Apply EF migrations on startup (suitable for dev/staging; use a deploy pipeline in production)
public static void InitializeDatabase(IApplicationBuilder app)
{
    using var serviceScope = app.ApplicationServices
        .GetRequiredService<IServiceScopeFactory>()
        .CreateScope();

    serviceScope.ServiceProvider
        .GetRequiredService<PersistedGrantDbContext>()
        .Database
        .Migrate();

    var configContext = serviceScope.ServiceProvider
        .GetRequiredService<ConfigurationDbContext>();
    configContext.Database.Migrate();

    // Seed initial configuration data if empty
    if (!configContext.Clients.Any())
    {
        foreach (var client in Config.Clients)
            configContext.Clients.Add(client.ToEntity());
        configContext.SaveChanges();
    }
}
```

### Handling Schema Updates Across Versions

When upgrading IdentityServer, always check the [upgrade guide](https://docs.duendesoftware.com/identityserver/upgrades/) for schema changes before applying the new package version:

1. Review the changelog for any new columns or tables in `ConfigurationDbContext` or `PersistedGrantDbContext`.
2. Scaffold a new EF migration: `dotnet ef migrations add UpgradeToV7x --context ConfigurationDbContext`.
3. Review the generated migration SQL -- especially for columns with `NOT NULL` constraints that require backfill.
4. Apply to a staging environment and validate before production.

```csharp
// WRONG Never auto-apply migrations in production startup without a health gate
// This causes downtime on multi-instance deployments where one instance
// applies the migration while others still run against the old schema
app.ApplicationServices.GetRequiredService<ConfigurationDbContext>()
    .Database.Migrate(); // Dangerous in multi-node deployments
```

---

## Caching Configuration Data

Configuration data (clients, resources, CORS) is read on every token request. Without caching, every request hits the database.

### EF Store Caching (Recommended)

```csharp
// OK Enable cache for the EF configuration store (v8: uses HybridCache)
builder.Services.AddIdentityServer()
    .AddConfigurationStore(options => { /* ... */ })
    .AddConfigurationStoreCache(); // wraps EF stores with HybridCache
```

`AddConfigurationStoreCache()` wraps each configuration store with a caching decorator backed by Microsoft `HybridCache`. Cache expiration is controlled through `IdentityServerOptions.Caching`:

```csharp
builder.Services.AddIdentityServer(options =>
{
    options.Caching.ClientStoreExpiration = TimeSpan.FromMinutes(5);
    options.Caching.ResourceStoreExpiration = TimeSpan.FromMinutes(5);
    options.Caching.CorsExpiration = TimeSpan.FromMinutes(5);
    options.Caching.IdentityProviderCacheDuration = TimeSpan.FromMinutes(60);
})
    .AddConfigurationStore(options => { /* ... */ })
    .AddConfigurationStoreCache();
```

### Custom Store Caching

When using a custom `IClientStore`, wrap it with the caching decorator explicitly:

```csharp
// OK Cache applied to a custom store implementation
builder.Services.AddIdentityServer()
    .AddClientStore<MongoClientStore>()
    .AddResourceStore<MongoResourceStore>()
    .AddClientStoreCache<MongoClientStore>()
    .AddResourceStoreCache<MongoResourceStore>();
```

### Distributed Cache for Multi-Node Deployments

In-memory cache is node-local -- a client update only invalidates the cache on the node where the change was made. For multi-node deployments, configure `HybridCache` with a distributed backend:

```csharp
// OK Configure HybridCache with Redis backend for multi-node scenarios
builder.Services.AddHybridCache();
builder.Services.AddStackExchangeRedisCache(options =>
    options.Configuration = builder.Configuration["Redis:ConnectionString"]);

builder.Services.AddIdentityServer()
    .AddConfigurationStore(options => { /* ... */ })
    .AddConfigurationStoreCache();
```

> Note: In v8, `ICache<T>` is replaced by Microsoft `HybridCache`. If you have custom `ICache<T>` implementations, migrate to `HybridCache` with keyed services (`ServiceProviderKeys.ConfigurationStoreCache`). See the `duende-identityserver-upgrade-v7-to-v8` skill for migration patterns.
> 
> After a client or resource update, explicitly evict the cache entry or wait for expiration. There is no built-in cache invalidation webhook.

---

## Custom Stores

Implement custom stores when EF Core is unsuitable -- for example, when client definitions live in an external system, or when operational data must be stored in Redis or a document database.

### In-Memory Stores (Development Only)

For development and testing, in-memory stores avoid database setup entirely:

```csharp
// OK In-memory stores -- development and testing only
builder.Services.AddIdentityServer()
    .AddInMemoryClients(Config.Clients)
    .AddInMemoryApiScopes(Config.ApiScopes)
    .AddInMemoryApiResources(Config.ApiResources)
    .AddInMemoryIdentityResources(Config.IdentityResources);
```

In-memory stores are created once at startup and cannot be updated at runtime without restarting the application. They do not survive restarts and should never be used for operational data in production.

> Version Note -- CancellationToken parameters (v8+):
> The store interface signatures below include `CancellationToken` parameters, which were added in Duende IdentityServer v8. In v7 and earlier, these interfaces do not accept `CancellationToken` -- omit the parameter when targeting v7. Additionally, `IClientStore.GetAllClientsAsync` is a new method in v8; it does not exist in v7.

### `IClientStore`

```csharp
// OK Custom client store reading from an external API
public sealed class ExternalApiClientStore : IClientStore
{
    private readonly IExternalClientApi _api;

    public ExternalApiClientStore(IExternalClientApi api)
        => _api = api;

    public async Task<Client?> FindClientByIdAsync(string clientId, CancellationToken ct = default)
    {
        var dto = await _api.GetClientAsync(clientId);
        return dto is null ? null : dto.ToIdentityServerClient();
    }

    public async IAsyncEnumerable<Client> GetAllClientsAsync(CancellationToken ct = default)
    {
        await foreach (var dto in _api.GetAllClientsAsync(ct))
            yield return dto.ToIdentityServerClient();
    }
}
```

```csharp
// OK Registration -- use helper method, not AddTransient directly
builder.Services.AddIdentityServer()
    .AddClientStore<ExternalApiClientStore>();
```

### `IResourceStore`

```csharp
// OK Custom resource store -- must implement all five query methods
public sealed class DatabaseResourceStore : IResourceStore
{
    private readonly ResourceRepository _repo;

    public DatabaseResourceStore(ResourceRepository repo) => _repo = repo;

    public Task<IEnumerable<IdentityResource>> FindIdentityResourcesByScopeNameAsync(
        IEnumerable<string> scopeNames, CancellationToken ct = default)
        => _repo.GetIdentityResourcesAsync(scopeNames);

    public Task<IEnumerable<ApiScope>> FindApiScopesByNameAsync(
        IEnumerable<string> scopeNames, CancellationToken ct = default)
        => _repo.GetApiScopesAsync(scopeNames);

    public Task<IEnumerable<ApiResource>> FindApiResourcesByScopeNameAsync(
        IEnumerable<string> scopeNames, CancellationToken ct = default)
        => _repo.GetApiResourcesByScopeAsync(scopeNames);

    public Task<IEnumerable<ApiResource>> FindApiResourcesByNameAsync(
        IEnumerable<string> apiResourceNames, CancellationToken ct = default)
        => _repo.GetApiResourcesByNameAsync(apiResourceNames);

    public Task<Resources> GetAllResourcesAsync(CancellationToken ct = default)
        => _repo.GetAllAsync();
}
```

### `IPersistedGrantStore`

```csharp
// OK Custom persisted grant store -- all methods must be implemented
public sealed class RedisPersistedGrantStore : IPersistedGrantStore
{
    private readonly IDatabase _redis;

    public RedisPersistedGrantStore(IConnectionMultiplexer mux)
        => _redis = mux.GetDatabase();

    public async Task StoreAsync(PersistedGrant grant, CancellationToken ct = default)
    {
        var json = JsonSerializer.Serialize(grant);
        var expiry = grant.Expiration.HasValue
            ? grant.Expiration.Value - DateTimeOffset.UtcNow
            : TimeSpan.FromDays(30);
        await _redis.StringSetAsync(grant.Key, json, expiry);
    }

    public async Task<PersistedGrant?> GetAsync(string key, CancellationToken ct = default)
    {
        var value = await _redis.StringGetAsync(key);
        return value.IsNull ? null : JsonSerializer.Deserialize<PersistedGrant>(value!);
    }

    public async Task<IEnumerable<PersistedGrant>> GetAllAsync(PersistedGrantFilter filter, CancellationToken ct = default)
    {
        // Redis requires a secondary index (e.g., SET per subjectId) for filtered queries
        // Implementation depends on your indexing strategy
        throw new NotImplementedException("Implement with a subject-keyed index");
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
        => _redis.KeyDeleteAsync(key);

    public Task RemoveAllAsync(PersistedGrantFilter filter, CancellationToken ct = default)
    {
        // Requires secondary index lookup
        throw new NotImplementedException("Implement with a subject-keyed index");
    }
}
```

```csharp
// OK Registration for custom operational stores -- register directly, not through builder helpers
builder.Services.AddIdentityServer();
builder.Services.AddTransient<IPersistedGrantStore, RedisPersistedGrantStore>();
builder.Services.AddTransient<IDeviceFlowStore, YourCustomDeviceFlowStore>();
```

---

## Server-Side Sessions Store

Server-side sessions (added in IdentityServer 6.1) keep authentication session data server-side rather than in the cookie, enabling centralized session management, inactivity timeouts, and back-channel logout across all sessions for a user.

### Enabling with EF Core

```csharp
// OK Server-side sessions backed by the EF operational store
builder.Services.AddIdentityServer()
    .AddServerSideSessions()     // must be called to enable the feature
    .AddOperationalStore(options =>
    {
        options.ConfigureDbContext = b =>
            b.UseSqlServer(connectionString, sql =>
                sql.MigrationsAssembly(migrationsAssembly));
        options.EnableTokenCleanup = true;
    });
```

### Custom `IServerSideSessionStore`

```csharp
// OK Custom server-side session store
builder.Services.AddIdentityServer()
    .AddServerSideSessions<YourCustomSessionStore>();

// Equivalent to:
builder.Services.AddIdentityServer()
    .AddServerSideSessions()
    .AddServerSideSessionStore<YourCustomSessionStore>();
```

The `IServerSideSessionStore` interface provides methods for `CreateSessionAsync`, `GetSessionAsync`, `UpdateSessionAsync`, `DeleteSessionAsync`, and bulk query/management methods used by session expiration and back-channel logout coordination. All methods must be implemented -- there are no default no-op implementations.

### Session Cleanup

Session records accumulate over time. Token cleanup (`EnableTokenCleanup`) removes expired sessions from the EF operational store. For custom stores, you must implement your own cleanup background service.

---

## Signing Key Store

Duende IdentityServer's automatic key management feature dynamically creates and rotates signing keys. Keys must be persisted across restarts and shared across nodes.

### Default: File System

The default `ISigningKeyStore` persists keys to the file system. This is suitable for single-node deployments only:

```csharp
// OK File system key store (default) -- single node only
builder.Services.AddIdentityServer()
    .AddDeveloperSigningCredential(); // development only

// For production single-node: nothing extra needed; file system is the default
```

### EF Core Key Store

`AddOperationalStore()` automatically registers `ISigningKeyStore` against `PersistedGrantDbContext`:

```csharp
// OK EF-backed signing key store -- required for multi-node deployments
builder.Services.AddIdentityServer()
    .AddOperationalStore(options =>
    {
        options.ConfigureDbContext = b =>
            b.UseSqlServer(connectionString, sql =>
                sql.MigrationsAssembly(migrationsAssembly));
    });
// ISigningKeyStore is now backed by PersistedGrantDbContext
```

### Custom `ISigningKeyStore`

```csharp
// OK Register a custom signing key store
builder.Services.AddIdentityServer()
    .AddSigningKeyStore<YourCustomSigningKeyStore>();
```

The `ISigningKeyStore` interface has three methods (CancellationToken parameters are v8+ only -- see version note above):
- `LoadKeysAsync(CancellationToken ct)` -- returns all `SerializedKey` records; called on startup and periodically
- `StoreKeyAsync(SerializedKey key, CancellationToken ct)` -- persists a newly created key
- `DeleteKeyAsync(string id, CancellationToken ct)` -- removes a retired key

### Data Protection Considerations

The `Data` property of `SerializedKey` may be encrypted via ASP.NET Core Data Protection (check `DataProtected == true`). When implementing a custom store:

- Do not re-encrypt data returned from `LoadKeysAsync` -- IdentityServer decrypts it internally.
- Ensure Data Protection keys are shared across all nodes in a multi-node deployment. If node A encrypts a signing key and node B cannot decrypt it, token signing will fail.
- Store Data Protection keys in a shared location (Azure Blob, SQL, Redis) and protect them with a shared certificate or key vault key.

```csharp
// OK Share Data Protection keys across nodes (Azure Blob + Key Vault example)
builder.Services.AddDataProtection()
    .PersistKeysToAzureBlobStorage(/* blob container */)
    .ProtectKeysWithAzureKeyVault(/* key vault key id */);
```

---

## Token Cleanup

Operational data accumulates continuously. Without cleanup, the `PersistedGrants` table grows unbounded, degrading query performance.

### Enabling Automatic Cleanup

```csharp
// OK Enable token cleanup in the EF operational store
builder.Services.AddIdentityServer()
    .AddOperationalStore(options =>
    {
        options.ConfigureDbContext = b =>
            b.UseSqlServer(connectionString, sql =>
                sql.MigrationsAssembly(migrationsAssembly));

        options.EnableTokenCleanup = true;
        options.TokenCleanupInterval = 3600;      // seconds; default 1 hour

        // Remove consumed one-time tokens (e.g., used refresh tokens with OneTime usage)
        options.RemoveConsumedTokens = true;
        options.ConsumedTokenCleanupDelay = 0;    // seconds to wait before deleting consumed tokens

        // Fuzz startup time to reduce multi-node cleanup conflicts (default: true)
        options.FuzzTokenCleanupStart = true;
    });
```

### OperationalStoreOptions Reference

| Option                      | Type                              | Default | Description                                                                  |
| --------------------------- | --------------------------------- | ------- | ---------------------------------------------------------------------------- |
| `ConfigureDbContext`        | `Action<DbContextOptionsBuilder>` | --       | Configure the `PersistedGrantDbContext`                                      |
| `DefaultSchema`             | `string`                          | --       | Default database schema for operational tables                               |
| `EnableTokenCleanup`        | `bool`                            | `false` | Enable automatic cleanup of expired grants and pushed authorization requests |
| `RemoveConsumedTokens`      | `bool`                            | `false` | Also remove consumed grants during cleanup (added >= 5.1)                    |
| `TokenCleanupInterval`      | `int`                             | `3600`  | Cleanup interval in seconds                                                  |
| `TokenCleanupBatchSize`     | `int`                             | `100`   | Number of expired tokens removed per cleanup cycle                           |
| `ConsumedTokenCleanupDelay` | `int`                             | `0`     | Seconds to wait after consumption before cleaning up (added >= 6.3)          |
| `FuzzTokenCleanupStart`     | `bool`                            | `true`  | Randomize first cleanup run to avoid multi-instance conflicts (added >= 7.0) |

### What Token Cleanup Removes

The `TokenCleanupService` removes:
- Persisted grants where `Expiration < UtcNow`
- Consumed tokens when `RemoveConsumedTokens = true` and `ConsumedTime + ConsumedTokenCleanupDelay < UtcNow`
- Expired device flow codes
- Expired pushed authorization requests
- Expired server-side sessions

It does not remove:
- Active (non-expired) refresh tokens that have been marked consumed -- these are retained for threat detection unless `RemoveConsumedTokens = true`

### Grant Lifecycle States

| State                                                 | Meaning                           |
| ----------------------------------------------------- | --------------------------------- |
| Record exists, no `ConsumedTime`, within `Expiration` | Grant is valid                    |
| `ConsumedTime` is set                                 | Grant has been used (soft delete) |
| Past `Expiration`                                     | Grant is expired                  |
| Record deleted                                        | Grant is revoked                  |

One-time-use grants (authorization codes, optionally refresh tokens) use the consumption mechanism instead of immediate deletion to enable replay detection and grace periods. The `Data` property of persisted grants is the authoritative payload -- other properties like `Created` and `Expiration` are read-only indices. Modifying index properties directly in the database will not change runtime behavior.

### Multi-Node Cleanup Conflicts

When multiple nodes all run cleanup at the same interval, they race to delete the same rows. `FuzzTokenCleanupStart = true` (the default) randomises the first cleanup run within the interval window. For very high-scale deployments, consider disabling cleanup on all nodes and running it as a dedicated background job:

```csharp
// OK Disable cleanup on web nodes; run in a dedicated worker service
// In web node Program.cs:
options.EnableTokenCleanup = false;

// In a dedicated worker:
public sealed class TokenCleanupWorker : BackgroundService
{
    private readonly TokenCleanupService _cleanup;

    public TokenCleanupWorker(TokenCleanupService cleanup) => _cleanup = cleanup;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await _cleanup.CleanupGrantsAsync();
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
```

---

## Persisted Grant Service

For higher-level programmatic access to grants (e.g., building an admin UI or user consent management page), use `IPersistedGrantService` rather than querying `IPersistedGrantStore` directly:

```csharp
// OK Query and revoke grants via the high-level service
public sealed class GrantManagementService
{
    private readonly IPersistedGrantService _grantService;

    public GrantManagementService(IPersistedGrantService grantService)
        => _grantService = grantService;

    public async Task<IEnumerable<Grant>> GetUserGrantsAsync(string subjectId)
        => await _grantService.GetAllGrantsAsync(subjectId);

    public async Task RevokeClientGrantsAsync(string subjectId, string clientId)
        => await _grantService.RemoveAllGrantsAsync(subjectId, clientId);
}
```

This service abstracts and aggregates different grant types (authorization codes, refresh tokens, reference tokens, consent) into a unified API. It is the recommended way to implement user-facing grant/consent management rather than querying the low-level `IPersistedGrantStore`.

---

## Multi-Tenant Patterns

Multi-tenant IdentityServer deployments require careful consideration of store boundaries.

### Shared Database (Recommended for Most Cases)

A single `ConfigurationDbContext` and `PersistedGrantDbContext` shared across all tenants. Tenant isolation is enforced at the application layer by scoping queries to a `TenantId` column.

```csharp
// OK Shared database with tenant-scoped custom stores
public sealed class TenantAwareClientStore : IClientStore
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public TenantAwareClientStore(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task<Client?> FindClientByIdAsync(string clientId)
    {
        var entity = await _db.Clients
            .Where(c => c.TenantId == _tenantContext.TenantId && c.ClientId == clientId)
            .FirstOrDefaultAsync();
        return entity?.ToIdentityServerClient();
    }
}
```

### Database-per-Tenant

Each tenant gets its own connection string and EF `DbContext` instance. This provides the strongest data isolation, is appropriate for compliance requirements (GDPR data residency, SOC2 segmentation), and simplifies tenant offboarding.

```csharp
// OK Database-per-tenant using a factory pattern for the DbContext
builder.Services.AddIdentityServer()
    .AddClientStore<TenantRoutingClientStore>();

public sealed class TenantRoutingClientStore : IClientStore
{
    private readonly IDbContextFactory<ConfigurationDbContext> _factory;
    private readonly ITenantConnectionStringProvider _connectionStrings;
    private readonly ITenantContext _tenantContext;

    public TenantRoutingClientStore(
        IDbContextFactory<ConfigurationDbContext> factory,
        ITenantConnectionStringProvider connectionStrings,
        ITenantContext tenantContext)
    {
        _factory = factory;
        _connectionStrings = connectionStrings;
        _tenantContext = tenantContext;
    }

    public async Task<Client?> FindClientByIdAsync(string clientId)
    {
        var connStr = await _connectionStrings.GetAsync(_tenantContext.TenantId);
        var options = new DbContextOptionsBuilder<ConfigurationDbContext>()
            .UseSqlServer(connStr)
            .Options;

        await using var ctx = new ConfigurationDbContext(options, new ConfigurationStoreOptions());
        var entity = await ctx.Clients
            .Include(c => c.AllowedScopes)
            .Include(c => c.RedirectUris)
            .FirstOrDefaultAsync(c => c.ClientId == clientId);

        return entity?.ToModel();
    }
}
```

```csharp
// WRONG Avoid: sharing PersistedGrantDbContext across tenants without tenant isolation
// A token issued for tenant A can be looked up by tenant B's store -- a security boundary violation
builder.Services.AddOperationalStore(options =>
{
    options.ConfigureDbContext = b => b.UseSqlServer(sharedConnectionString);
    // No tenant filtering applied -- all tenants share the same grant store
});
```

---

## Store Implementation Decision Matrix

| Scenario                                      | Recommendation                                     |
| --------------------------------------------- | -------------------------------------------------- |
| Prototyping / local development               | In-memory stores (`AddInMemory*`)                  |
| Small deployment, rare config changes          | In-memory stores loaded from config files          |
| Production with relational database            | EF Core stores with `AddConfigurationStoreCache()` |
| High-traffic production                        | EF Core stores + caching + tuned cleanup intervals |
| Non-relational database (Redis, Cosmos, etc.)  | Custom store implementations                       |
| SaaS with dynamic configuration                | EF Core or custom stores with API for management   |

---

## Common Pitfalls

Missing `MigrationsAssembly` -- The most common EF setup error. When migrations live in the host project (not in `Duende.IdentityServer.EntityFramework`), you must call `sql.MigrationsAssembly(migrationsAssembly)`. Without this, `dotnet ef migrations add` and runtime startup fail.

Calling `AddConfigurationStoreCache()` without `AddInMemoryCaching()` -- `AddConfigurationStoreCache()` wraps the EF stores automatically and includes its own `IMemoryCache` registration. `AddInMemoryCaching()` is needed when you are manually registering caching decorators on custom stores with `AddClientStoreCache<T>()`.

In-memory caching in multi-node deployments -- The default `IMemoryCache`-backed cache is node-local. If you update a client configuration and one node caches the old value, token requests on that node will use the stale configuration until the cache expires. Use a distributed cache (`IDistributedCache`) to share cache state, or set a short expiration and accept eventual consistency.

Not enabling server-side sessions before the operational store -- `AddServerSideSessions()` must be called before or alongside `AddOperationalStore()`. Reversing the order or omitting `AddServerSideSessions()` means session data is never persisted, and session management features silently degrade.

Assuming `EnableTokenCleanup = true` removes consumed tokens -- By default, consumed tokens are not cleaned up. You must also set `RemoveConsumedTokens = true`. Consumed tokens from one-time-use refresh token flows will otherwise accumulate indefinitely.

Rotating Data Protection keys without migrating encrypted grant data -- Signing keys and grant payloads encrypted with an old Data Protection key become unreadable after key rotation. Always keep retired Data Protection keys available for decryption for at least as long as the longest-lived grant (typically refresh token lifetime).

Running EF migrations in multi-instance startup -- Calling `Database.Migrate()` in `Program.cs` on every startup causes migration races in multi-node deployments. Run migrations as a deployment pre-step (e.g., a Kubernetes init container or a CI/CD migration job), not in the application startup path.

Using in-memory stores in production -- `AddInMemoryClients()`, `AddInMemoryApiResources()`, etc. are designed for development and testing only. In-memory stores cannot be updated at runtime without restarting the application and do not survive restarts.

---

## Resources

- [Data Stores & Persistence overview](https://docs.duendesoftware.com/identityserver/data/) -- authoritative top-level docs
- [Configuration Data](https://docs.duendesoftware.com/identityserver/data/configuration/) -- store interfaces, custom registration, caching, in-memory stores
- [Operational Data](https://docs.duendesoftware.com/identityserver/data/operational/) -- grants, signing keys, server-side sessions, custom store registration
- [EF Core Integration](https://docs.duendesoftware.com/identityserver/data/ef/) -- `AddConfigurationStore`, `AddOperationalStore`, `OperationalStoreOptions`, schema options, token cleanup options
- [EF Quickstart](https://docs.duendesoftware.com/identityserver/quickstarts/4-entity-framework/) -- end-to-end walkthrough including migration creation
- [ISigningKeyStore reference](https://docs.duendesoftware.com/identityserver/reference/stores/signing-key-store/)
- [IServerSideSessionStore reference](https://docs.duendesoftware.com/identityserver/reference/stores/server-side-sessions/)
- [IPersistedGrantStore reference](https://docs.duendesoftware.com/identityserver/reference/stores/persisted-grant-store/)
- [Key Management fundamentals](https://docs.duendesoftware.com/identityserver/fundamentals/key-management/)
- [Server-Side Sessions overview](https://docs.duendesoftware.com/identityserver/ui/server-side-sessions/)
- [Duende EF migrations sample](https://github.com/DuendeSoftware/products/tree/main/identity-server/migrations/IdentityServerDb) -- reference SQL Server migration project maintained by Duende
- Related skill: `duende-identityserver-configuration` -- client and resource model configuration
- Related skill: `efcore-patterns` -- EF Core best practices applicable to `ConfigurationDbContext` and `PersistedGrantDbContext`
- Related skill: `database-performance` -- indexing, query optimization for high-write operational tables
