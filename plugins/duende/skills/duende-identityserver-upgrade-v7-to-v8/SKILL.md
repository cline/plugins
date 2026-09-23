---
name: duende-identityserver-upgrade-v7-to-v8
description: "Migrating Duende IdentityServer from v7.4 to v8.0: breaking changes, API replacements (ICache->HybridCache, IClock->TimeProvider), CancellationToken additions, EF migrations, and step-by-step upgrade guide."
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Upgrading IdentityServer v7 to v8

## When to Use This Skill

- Upgrading a Duende IdentityServer project from v7.4 to v8.0
- Fixing build errors after updating NuGet packages to v8
- Migrating custom stores/services to new v8 interfaces
- Running EF Core database migrations for v8 (SAML tables)
- Replacing deprecated APIs (ICache, IClock, IAuthorizationParametersMessageStore)

## Core Principles

- v8.0 requires .NET 10 -- update TFM before anything else
- All breaking changes are compile-time errors (no silent behavior changes)
- Migration is mechanical -- find/replace patterns work for most changes
- Run EF migrations even if you don't use SAML (schema must match)

Docs: https://docs.duendesoftware.com/identityserver/upgrades

## Step-by-Step Migration

### 1. Update Target Framework

```xml
<!-- WRONG Before -->
<TargetFramework>net8.0</TargetFramework>

<!-- OK After -->
<TargetFramework>net10.0</TargetFramework>
```

### 2. Update NuGet Packages

```xml
<PackageReference Include="Duende.IdentityServer" Version="8.0.0" />
<PackageReference Include="Duende.IdentityServer.EntityFramework" Version="8.0.0" />
<!-- Update all Duende.* packages to 8.0.0 -->
```

### 3. Run EF Database Migrations

```bash
dotnet ef migrations add Update_DuendeIdentityServer_v8_0 \
    -c ConfigurationDbContext
dotnet ef database update
```

This adds 5 SAML-related tables (required even if you don't use SAML).

### 4. Replace ICache<T> with HybridCache

```csharp
// WRONG Before (v7)
public class MyService
{
    private readonly ICache<MyData> _cache;
    public MyService(ICache<MyData> cache) => _cache = cache;

    public async Task<MyData> GetAsync(string key)
    {
        return await _cache.GetOrAddAsync(key,
            TimeSpan.FromMinutes(5),
            () => LoadFromDbAsync(key));
    }
}

// OK After (v8) -- use Microsoft HybridCache
public class MyService
{
    private readonly HybridCache _cache;
    public MyService([FromKeyedServices("ConfigurationStoreCache")] HybridCache cache)
        => _cache = cache;

    public async Task<MyData> GetAsync(string key, CancellationToken ct)
    {
        return await _cache.GetOrCreateAsync(key,
            async token => await LoadFromDbAsync(key, token),
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(5)
            }, cancellationToken: ct);
    }
}
```

Key: use keyed service `"ConfigurationStoreCache"` (`ServiceProviderKeys.ConfigurationStoreCache`). `CachingOptions.CacheLockTimeout` is obsolete.

### 5. Replace IClock with TimeProvider

```csharp
// WRONG Before (v7)
public class MyService
{
    private readonly IClock _clock;
    public MyService(IClock clock) => _clock = clock;
    public DateTime Now => _clock.UtcNow.UtcDateTime;
}

// OK After (v8)
public class MyService
{
    private readonly TimeProvider _timeProvider;
    public MyService(TimeProvider timeProvider) => _timeProvider = timeProvider;
    public DateTime Now => _timeProvider.GetUtcNow().UtcDateTime;
}
```

Note: `GetUtcNow()` (method) replaces `UtcNow` (property).

### 6. Add CancellationToken to All Async Interfaces

All store and service interfaces now require `CancellationToken ct` as the last parameter:

```csharp
// WRONG Before (v7)
public Task<Client?> FindClientByIdAsync(string clientId)

// OK After (v8)
public Task<Client?> FindClientByIdAsync(string clientId, CancellationToken ct)
```

Affected interfaces include: `IClientStore`, `IResourceStore`, `IPersistedGrantStore`, `IDeviceFlowStore`, `ICorsPolicyService`, `IProfileService`, and all custom stores/services.

Also: `ICancellationTokenProvider` is removed entirely.

### 7. Add GetAllClientsAsync to IClientStore

```csharp
// OK New required method
public Task<IReadOnlyCollection<Client>> GetAllClientsAsync(CancellationToken ct)
```

Used by Financial-Grade Security features and conformance reports.

### 8. Update Refresh Token Service

```csharp
// WRONG Before (v7) -- individual parameters
public Task<string> CreateRefreshTokenAsync(
    ClaimsPrincipal subject, Token accessToken, Client client)

// OK After (v8) -- request objects
public Task<string> CreateRefreshTokenAsync(RefreshTokenCreationRequest request, CancellationToken ct)
public Task<string> UpdateRefreshTokenAsync(RefreshTokenUpdateRequest request, CancellationToken ct)
```

### 9. Remove IAuthorizationParametersMessageStore

```csharp
// WRONG Removed in v8 -- use PAR (Pushed Authorization Requests) instead
services.AddTransient<IAuthorizationParametersMessageStore, MyStore>();

// OK PAR is the replacement for passing large authorization parameters
```

### 10. Fix Return Type Changes

Nine interfaces changed `IEnumerable<T>` -> `IReadOnlyCollection<T>`:

```csharp
// WRONG Before
public Task<IEnumerable<ApiScope>> FindApiScopesByNameAsync(IEnumerable<string> scopeNames)

// OK After
public Task<IReadOnlyCollection<ApiScope>> FindApiScopesByNameAsync(
    IEnumerable<string> scopeNames, CancellationToken ct)
```

### 11. Fix DPoP Type Names

```csharp
// WRONG Typo in v7
DPoPProofValidatonContext  -> DPoPProofValidationContext
DPoPProofValidatonResult   -> DPoPProofValidationResult
```

### 12. Update Licensing Code

```csharp
// WRONG Before (v7)
var license = IdentityServerLicense.Current;
var edition = summary.LicenseEdition;

// OK After (v8)
var info = LicenseInformation.Current;  // from Duende.IdentityServer.Licensing
var skus = summary.EntitledSkus;        // collection replaces single edition
```

### 13. Update EF Identity Provider Store

```csharp
// WRONG Before (v7)
public IdentityProviderStore(IServiceProvider sp, ConfigurationDbContext ctx)

// OK After (v8) -- new required parameter
public IdentityProviderStore(
    IServiceProvider sp, ConfigurationDbContext ctx, IIdentityProviderFactory factory)
```

## Other Notable Changes

- NRT enabled: All assemblies use nullable reference types. Fix nullable warnings.
- HTTP 303: POST endpoint redirects now unconditionally use 303 (FAPI 2.0 compliance).
- `PersistedGrantFilter.ClientIds`/`Types`: Now non-nullable with empty collection defaults.
- IUserSession: Three new SAML session methods added (implement as no-op if not using SAML).
- Log levels: Secret validation failures changed log levels -- review log filtering.

## Migration Checklist

1. [ ] Update TFM to `net10.0`
2. [ ] Update all Duende.* packages to `8.0.0`
3. [ ] Run EF migration (`Update_DuendeIdentityServer_v8_0`)
4. [ ] Replace `ICache<T>` -> keyed `HybridCache`
5. [ ] Replace `IClock` -> `TimeProvider`
6. [ ] Add `CancellationToken` to all async store/service methods
7. [ ] Add `GetAllClientsAsync` to custom `IClientStore`
8. [ ] Update `IRefreshTokenService` implementations
9. [ ] Remove `IAuthorizationParametersMessageStore` (use PAR)
10. [ ] Fix `IEnumerable<T>` -> `IReadOnlyCollection<T>` return types
11. [ ] Fix DPoP type name typos
12. [ ] Update licensing references
13. [ ] Fix nullable reference type warnings
14. [ ] Test build and run

## Common Pitfalls

1. Forgetting EF migration: Even without SAML, the schema must be updated or EF will throw at runtime.
2. HybridCache keyed service: Must use `[FromKeyedServices("ConfigurationStoreCache")]` -- plain `HybridCache` injection gets a different instance.
3. CancellationToken propagation: Don't pass `CancellationToken.None` everywhere -- propagate from the method parameter for proper request cancellation.
4. GetAllClientsAsync performance: Return all clients from your store; used rarely but must be implemented.
5. PAR migration: If you used `IAuthorizationParametersMessageStore` for large auth requests, switch clients to use PAR (`require_pushed_authorization_requests`).

## Related Skills

- `duende-identityserver-configuration` -- IdentityServer host configuration and options
- `duende-identityserver-stores` -- Store implementation patterns (affected by CancellationToken changes)
- `duende-identityserver-saml` -- SAML 2.0 support (new in v8, requires EF migration)
- `duende-identityserver-usermanagement` -- User Management (new in v8)
