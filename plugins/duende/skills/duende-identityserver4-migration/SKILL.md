---
name: duende-identityserver4-migration
description: Migrating from IdentityServer4 to Duende IdentityServer v8. Covers NuGet package replacement, namespace changes, API surface changes, EF Core database schema migrations, .NET target framework upgrade, license configuration, signing key migration, data protection, and UI template updates.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Migrating from IdentityServer4 to Duende IdentityServer

> Scope: IdentityServer4 only. This skill covers migrating from IdentityServer4 (v3.x and v4.x) to Duende IdentityServer. It does not cover migrating from IdentityServer3 (the older Thinktecture/`IdentityServer3` NuGet package that ran on OWIN/Katana and .NET Framework). IdentityServer3 is a fundamentally different product with a different API surface, configuration model, and hosting stack. If you are on IdentityServer3, you must first port to IdentityServer4 on ASP.NET Core before using this guide.

## When to Use This Skill

- Planning a migration from IdentityServer4 to Duende IdentityServer -- running the migration analysis tool
- Upgrading a project from IdentityServer4 (v3.x or v4.x) to Duende IdentityServer v8
- Replacing IdentityServer4 NuGet packages with Duende equivalents
- Updating `IdentityServer4.*` namespaces to `Duende.IdentityServer.*`
- Migrating EF Core database schemas from IdentityServer4 to Duende IdentityServer
- Upgrading the .NET target framework from `netcoreapp3.1` or `net5.0` to a current LTS version
- Resolving breaking API changes between IdentityServer4 and Duende IdentityServer
- Converting `Startup.cs`/`Program.cs` hosting patterns from Generic Host to minimal hosting
- Configuring the Duende IdentityServer license key after migration
- Determining the right Duende license edition based on client inventory (interactive vs. non-interactive)
- Preserving the issuer URI to maintain token and client trust continuity
- Migrating signing keys from IdentityServer4 developer signing credential to Duende automatic key management
- Verifying third-party authentication scheme compatibility with the new .NET version
- Updating UI templates (login, logout, consent) from IdentityServer4 Quickstart UI to Duende templates

## Core Principles

Migration has two stages if starting from v3.x. IdentityServer4 v3 -> v4 introduced breaking changes in the `ApiResource`/`ApiScope` relationship (parent-child to many-to-many). If you are on v3, first migrate to v4 semantics, then migrate from v4 to Duende. If you are already on IdentityServer4 v4.x, you can go directly to Duende.

Duende IdentityServer is the direct successor to IdentityServer4. The API surface is intentionally similar -- most code changes are namespace and package renames. Behavioral changes are minimal, but the database schema has new tables and columns for features like automatic key management, server-side sessions, DPoP, and PAR.

The .NET target framework must be upgraded alongside the IdentityServer migration. IdentityServer4 ran on `netcoreapp3.1` or `net5.0`. Duende IdentityServer v8 requires `net10.0`. You must follow Microsoft's ASP.NET Core migration guides for each major version jump.

Database migrations require careful handling to avoid data loss. The v3 -> v4 schema change renames tables and restructures relationships. A naive EF Core migration will drop and recreate tables, losing data. Use the provided delta SQL scripts or manually craft migrations that preserve data.

Licensing is required for production use. Duende IdentityServer requires a valid license key for production. Without one, it runs in community/trial mode and logs a warning on startup.

Docs: https://docs.duendesoftware.com/identityserver/upgrades

---

## Migration Path Overview

```
IdentityServer4 v3.x or v4.x
    |
    v (Step 0: Run Migration Analysis Tool against running instance)
    |
    v (Stage 1: v3 -> v4 API changes + DB migration -- skip if already on v4)
IdentityServer4 v4.x
    |
    v (Stage 2: packages + namespaces + .NET upgrade + DB migration)
Duende IdentityServer v8.x
```

If already on IdentityServer4 v4.x, skip directly to Stage 2.

---

## Step 0: Run the Migration Analysis Tool (Recommended)

Before making any code changes, run the Migration Analysis Tool against your running IdentityServer4 instance. This tool inspects your live configuration and produces a report with specific recommendations.

The tool is a single file, [`MigrationAnalysisController.cs`](https://docs.duendesoftware.com/identityserver/upgrades/identityserver4-upgrade-analysis/), that you drop into your existing IdentityServer4 project. It does not require additional NuGet packages.

### What the tool inspects

| Data Point | Why It Matters |
|------------|---------------|
| .NET runtime version | Flags if you need to upgrade to .NET 10 |
| IdentityServer4 version | Determines if Stage 1 (v3 -> v4) is needed before proceeding |
| Client inventory | Counts interactive (authorization code) vs. non-interactive (client credentials) clients -- this determines which [Duende license edition](https://duendesoftware.com/products/identityserver) you need |
| Issuer URI | Reports the configured `IssuerUri` -- must be preserved in Duende to avoid breaking existing tokens and client trust relationships |
| Signing credential store type | Identifies custom signing stores that may need compatibility updates |
| Signing credential key ID | Records the current key ID for signing key migration planning |
| Data protection application name | Flags missing or path-based discriminators that will break after .NET upgrade |
| Data protection repository type | Warns if keys are stored ephemerally (lost on restart) instead of a persistent store |
| Authentication schemes | Lists all registered authentication handlers -- third-party handlers (non-Microsoft, non-IdentityServer4) may need version updates for the new ASP.NET Core version |

### Usage

1. Download `MigrationAnalysisController.cs` and add it to your IdentityServer4 project
2. Update the authorization check in the `Index()` method -- the default placeholder checks for username `"scott"` which you must replace with your own authorization logic
3. Build, run, and navigate to `/MigrationAnalysis` while authenticated
4. Review the report and use it to plan your migration

The tool loads clients from in-memory configuration or EF Core stores automatically. If you use a custom client store, you will need to modify the constructor to wire up your client retrieval.

> Note: Duende also offers a [free IdentityServer4 upgrade assessment](https://duendesoftware.com) to walk through your upgrade path.

---

## Stage 1: IdentityServer4 v3.x -> v4.x

Skip this section if you are already on IdentityServer4 v4.x.

### Step 1.1: Update NuGet Packages to v4

```xml
<!-- Old (v3) -->
<PackageReference Include="IdentityServer4" Version="3.1.4" />
<PackageReference Include="IdentityServer4.EntityFramework" Version="3.1.4" />
<PackageReference Include="IdentityServer4.AspNetIdentity" Version="3.1.4" />

<!-- New (v4) -->
<PackageReference Include="IdentityServer4" Version="4.1.2" />
<PackageReference Include="IdentityServer4.EntityFramework" Version="4.1.2" />
<PackageReference Include="IdentityServer4.AspNetIdentity" Version="4.1.2" />
```

### Step 1.2: Register API Scopes Separately

In v3, `ApiScope` was a child of `ApiResource`. In v4, scopes are independent top-level objects with a many-to-many relationship to API resources. You must register them separately:

```csharp
// v3: Scopes nested inside ApiResource
new ApiResource("api1", "My API")
{
    Scopes = { new Scope("api1.read"), new Scope("api1.write") }
}

// v4: Scopes are independent; ApiResource references scope names
public static IEnumerable<ApiScope> ApiScopes => new[]
{
    new ApiScope("api1.read", "Read access to API 1"),
    new ApiScope("api1.write", "Write access to API 1")
};

public static IEnumerable<ApiResource> ApiResources => new[]
{
    new ApiResource("api1", "My API")
    {
        Scopes = { "api1.read", "api1.write" } // string references, not Scope objects
    }
};

// Register both:
services.AddIdentityServer()
    .AddInMemoryApiScopes(Config.ApiScopes)       // NEW in v4
    .AddInMemoryApiResources(Config.ApiResources)
    .AddInMemoryClients(Config.Clients);
```

### Step 1.3: Fix Breaking API Changes (v3 -> v4)

HttpContext.SignInAsync signature change:

```csharp
// v3
await HttpContext.SignInAsync(user.SubjectId, user.Username, props);

// v4
var isuser = new IdentityServerUser(user.SubjectId)
{
    DisplayName = user.Username
};
await HttpContext.SignInAsync(isuser, props);
```

AuthorizationRequest property changes:

```csharp
// v3
var clientId = request.ClientId;
var scopes = request.ScopesRequested;
var isPkce = await _clientStore.IsPkceClientAsync(context.ClientId);

// v4
var clientId = request.Client.ClientId;
var scopes = request.ValidatedResources.RawScopeValues;
var isPkce = context.IsNativeClient();
```

Consent response changes:

```csharp
// v3
var grantedConsent = new ConsentResponse
{
    ScopesConsented = consentedScopes
};

// v4
var grantedConsent = new ConsentResponse
{
    ScopesValuesConsented = consentedScopes  // renamed property
};
```

Grant management method renames:

```csharp
// v3
await _interaction.GetAllUserConsentsAsync();

// v4
await _interaction.GetAllUserGrantsAsync();
```

External provider callback consolidation:

```csharp
// v3: separate methods per protocol
ProcessLoginCallbackForOidc();
ProcessLoginCallbackForWsFed();
ProcessLoginCallbackForSaml2p();

// v4: single unified method
ProcessLoginCallback();
```

### Step 1.4: Migrate the Database (v3 -> v4)

PersistedGrantDbContext -- Standard EF migration:

```bash
dotnet ef migrations add Grants_v4 -c PersistedGrantDbContext -o Migrations/PersistedGrantDb
dotnet ef database update -c PersistedGrantDbContext
```

New columns added: `ConsumedTime`, `Description`, `SessionId` on `PersistedGrants` and `DeviceCodes`.

ConfigurationDbContext -- Requires custom SQL to preserve data:

The v3 -> v4 schema change renames tables:
- `ApiClaims` -> `ApiResourceClaims`
- `ApiProperties` -> `ApiResourceProperties`
- `ApiSecrets` -> `ApiResourceSecrets`
- `IdentityClaims` -> `IdentityResourceClaims`
- `IdentityProperties` -> `IdentityResourceProperties`

And restructures the `ApiScopes` relationship (scopes become independent, linked via `ApiResourceScopes` join table).

Do not rely on auto-generated EF migrations for this step -- they will drop and recreate tables, losing data. Instead:

1. Create the migration scaffold:
   ```bash
   dotnet ef migrations add Config_v4 -c ConfigurationDbContext -o Migrations/ConfigurationDb
   ```

2. Embed a custom delta SQL script that migrates data before dropping old tables:
   ```sql
   -- Move data from old tables to new tables
   INSERT INTO ApiResourceClaims (Id, [Type], ApiResourceId)
   SELECT Id, [Type], ApiResourceId FROM ApiClaims;

   INSERT INTO ApiResourceProperties (Id, [Key], [Value], ApiResourceId)
   SELECT Id, [Key], [Value], ApiResourceId FROM ApiProperties;

   INSERT INTO ApiResourceSecrets (Id, [Description], [Value], [Expiration], [Type], [Created], ApiResourceId)
   SELECT Id, [Description], [Value], [Expiration], [Type], [Created], ApiResourceId FROM ApiSecrets;

   INSERT INTO IdentityResourceClaims (Id, [Type], IdentityResourceId)
   SELECT Id, [Type], IdentityResourceId FROM IdentityClaims;

   INSERT INTO IdentityResourceProperties (Id, [Key], [Value], IdentityResourceId)
   SELECT Id, [Key], [Value], IdentityResourceId FROM IdentityProperties;

   -- Migrate scope-resource relationship to join table
   INSERT INTO ApiResourceScopes ([Scope], [ApiResourceId])
   SELECT [Name], [ApiResourceId] FROM ApiScopes;

   -- Remove old foreign key column from ApiScopes
   -- (handled by EF migration after data is moved)
   ```

3. Modify the generated migration to execute the SQL script before the destructive operations.

4. Apply: `dotnet ef database update -c ConfigurationDbContext`

Reference implementation: [UpgradeSample-IdentityServer4-v3](https://github.com/DuendeSoftware/UpgradeSample-IdentityServer4-v3)

---

## Stage 2: IdentityServer4 v4.x -> Duende IdentityServer v8.x

### Step 2.1: Update .NET Target Framework

Update from `netcoreapp3.1` or `net5.0` to `net10.0` (required by Duende IdentityServer v8):

```xml
<!-- Old -->
<TargetFramework>netcoreapp3.1</TargetFramework>

<!-- New -->
<TargetFramework>net10.0</TargetFramework>
```

Follow the Microsoft ASP.NET Core migration guides for each major version jump. Key changes include:
- Minimal hosting model (`WebApplication.CreateBuilder` replaces `Startup.cs` + `Program.cs` pattern)
- Nullable reference types enabled by default
- `ImplicitUsings` enabled by default
- Updated `Microsoft.EntityFrameworkCore.*` packages to match the .NET version

### Step 2.2: Replace NuGet Packages

```xml
<!-- Old (IdentityServer4) -->
<PackageReference Include="IdentityServer4" Version="4.1.2" />
<PackageReference Include="IdentityServer4.EntityFramework" Version="4.1.2" />
<PackageReference Include="IdentityServer4.AspNetIdentity" Version="4.1.2" />
<PackageReference Include="IdentityModel" Version="5.2.0" />

<!-- New (Duende) -->
<PackageReference Include="Duende.IdentityServer" Version="8.0.0" />
<PackageReference Include="Duende.IdentityServer.EntityFramework" Version="8.0.0" />
<PackageReference Include="Duende.IdentityServer.AspNetIdentity" Version="8.0.0" />
<PackageReference Include="Duende.IdentityModel" Version="8.0.0" />
```

Also update EF Core and other ASP.NET Core packages to match the new target framework:

```xml
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="10.0.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.0" />
```

### Step 2.3: Update Namespaces

Search and replace all `IdentityServer4` namespaces with `Duende.IdentityServer`:

```csharp
// Old
using IdentityServer4;
using IdentityServer4.Models;
using IdentityServer4.Services;
using IdentityServer4.Stores;
using IdentityServer4.Extensions;
using IdentityServer4.Events;
using IdentityServer4.Test;
using IdentityServer4.Validation;
using IdentityServer4.EntityFramework.DbContexts;
using IdentityServer4.EntityFramework.Mappers;
using IdentityServer4.EntityFramework.Options;
using IdentityModel;

// New
using Duende.IdentityServer;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;
using Duende.IdentityServer.Stores;
using Duende.IdentityServer.Extensions;
using Duende.IdentityServer.Events;
using Duende.IdentityServer.Test;
using Duende.IdentityServer.Validation;
using Duende.IdentityServer.EntityFramework.DbContexts;
using Duende.IdentityServer.EntityFramework.Mappers;
using Duende.IdentityServer.EntityFramework.Options;
using Duende.IdentityModel;
```

Also update any fully-qualified type references in code and configuration files.

### Step 2.4: Convert to Minimal Hosting (Recommended)

If migrating from `netcoreapp3.1`, convert the `Startup.cs` + `Program.cs` pattern to minimal hosting:

```csharp
// Old: Startup.cs + Program.cs pattern
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddIdentityServer()
            .AddConfigurationStore(options => { /* ... */ })
            .AddOperationalStore(options => { /* ... */ });
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        app.UseRouting();
        app.UseIdentityServer();
        app.UseAuthorization();
        app.UseEndpoints(e => e.MapDefaultControllerRoute());
    }
}

// New: Minimal hosting in Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddIdentityServer()
    .AddConfigurationStore(options => { /* ... */ })
    .AddOperationalStore(options => { /* ... */ });

var app = builder.Build();

app.UseRouting();
app.UseIdentityServer();
app.UseAuthorization();
app.MapDefaultControllerRoute();

app.Run();
```

### Step 2.5: Preserve the Issuer URI

The issuer URI (`iss` claim) must remain identical after migration. If it changes, all existing tokens become invalid and client trust relationships break.

```csharp
// If you had an explicit IssuerUri in IdentityServer4, keep it:
builder.Services.AddIdentityServer(options =>
{
    options.IssuerUri = "https://identity.example.com";
});

// If the issuer was inferred from the request URL in IS4 (no explicit IssuerUri set),
// verify that the Duende host uses the same URL/port/scheme.
```

If your IS4 instance inferred the issuer from the request (no explicit `IssuerUri` configured), check the `/.well-known/openid-configuration` of your old instance, note the `issuer` value, and explicitly set it in the Duende configuration to be safe.

### Step 2.6: Configure the Duende License Key

Add the license key configuration -- required for production:

```csharp
builder.Services.AddIdentityServer(options =>
{
    options.LicenseKey = builder.Configuration["IdentityServer:LicenseKey"];
});
```

Store the license key in a secret manager, environment variable, or key vault -- never in source-controlled `appsettings.json`.

Without a license key, IdentityServer runs in community/trial mode and logs a warning on startup. This is acceptable for local development.

Choosing the right edition: The license edition depends on your client inventory. Count interactive clients (those using `authorization_code` grant type -- typically web apps, SPAs, native apps) vs. non-interactive clients (those using `client_credentials` -- typically machine-to-machine). Run the Migration Analysis Tool (Step 0) to get these counts automatically. See [Duende IdentityServer Pricing](https://duendesoftware.com/products/identityserver) for edition thresholds.

### Step 2.7: Remove AddDeveloperSigningCredential

IdentityServer4 projects commonly used `AddDeveloperSigningCredential()` for development signing keys. Duende IdentityServer includes automatic key management (Business/Enterprise editions):

```csharp
// Old (remove)
services.AddIdentityServer()
    .AddDeveloperSigningCredential();

// New: Automatic key management is built-in (Business/Enterprise)
// No explicit call needed -- keys are created and rotated automatically

// Or for Community edition, configure a static signing credential:
builder.Services.AddIdentityServer()
    .AddSigningCredential(new X509Certificate2("signing.pfx", "password"));
```

### Step 2.8: Migrate the Database Schema (v4 -> Duende v8)

Create EF Core migrations for both contexts:

```bash
dotnet ef migrations add UpdateToDuende_v8 -c PersistedGrantDbContext \
    -o Data/Migrations/IdentityServer/PersistedGrantDb

dotnet ef migrations add UpdateToDuende_v8 -c ConfigurationDbContext \
    -o Data/Migrations/IdentityServer/ConfigurationDb
```

Apply:

```bash
dotnet ef database update -c PersistedGrantDbContext
dotnet ef database update -c ConfigurationDbContext
```

New tables and columns in Duende IdentityServer v8:

| Context | Change | Purpose |
|---------|--------|---------|
| Operational | `Keys` table (new) | Automatic key management storage |
| Operational | `ServerSideSessions` table (new) | Server-side session management |
| Operational | `PushedAuthorizationRequests` table (new) | PAR support |
| Operational | `SamlSignInStates` table (new) | SAML SSO state |
| Operational | `SamlLogoutSessions` table (new) | SAML SLO session tracking |
| Operational | `ConsumedTime` index on `PersistedGrants` | Performance optimization |
| Configuration | `IdentityProviders` table (new) | Dynamic OIDC provider configuration |
| Configuration | `SamlServiceProviders` table (new) | SAML SP registration |
| Configuration | `RequireResourceIndicator` column on `ApiResources` | Resource indicator support |
| Configuration | Timestamp columns on entities | Created, updated, last accessed tracking |
| Configuration | Unique constraints on child tables | Prevent duplicate entries |
| Client | `InitiateLoginUri` | Third-party initiated login |
| Client | `RequireDPoP`, `DPoPValidationMode`, `DPoPClockSkew` | DPoP enforcement |
| Client | `RequirePushedAuthorization`, `PushedAuthorizationLifetime` | PAR requirement |

Note on redirect URI column length: The `RedirectUri` column length was reduced from 2000 to 400 characters. This is safe unless you use redirect URIs longer than 400 characters, which is extremely uncommon.

### Step 2.9: Configure Data Protection

Set an explicit application name to prevent data protection key invalidation when paths change between .NET versions. See [ASP.NET Core Data Protection](https://docs.duendesoftware.com/general/data-protection/) for comprehensive guidance -- this is a cross-cutting concern for all Duende SDKs.

```csharp
builder.Services.AddDataProtection()
    .PersistKeysToDbContext<DataProtectionKeyContext>()
    .SetApplicationName("YourIdentityServer");
```

Why this matters: The default application name (content root path) changed between .NET versions:
- .NET 3.1-5: content root without trailing separator
- .NET 6: content root with trailing separator (breaking change)
- .NET 7+: content root without trailing separator

If you relied on the default, tokens encrypted before the .NET upgrade will not decrypt after it.

Persistent key storage is required in production. If data protection has no explicit repository configured (`PersistKeysToDbContext`, `PersistKeysToFileSystem`, `PersistKeysToAzureBlobStorage`, etc.), keys are stored in-memory and lost on restart -- meaning all encrypted data (persisted grants, cookies, antiforgery tokens) becomes unreadable. The Migration Analysis Tool (Step 0) flags this as `(not set)` in the data protection repository type check. If you see this, add persistent key storage before migrating.

### Step 2.10: Migrate Signing Keys

Decision tree for signing key migration:

1. Can you restart all client applications and APIs? -> Remove old key, use automatic key management. All clients will fetch the new key from the discovery document.

2. Cannot restart everything? -> Export the old signing key and configure it alongside automatic key management so existing tokens remain valid during the transition period.

```csharp
// Transitional: keep old key while automatic key management creates new keys
builder.Services.AddIdentityServer()
    .AddSigningCredential(existingRsaKey)  // old key for validation
    // automatic key management handles new token signing
```

### Step 2.11: Verify Authentication Scheme Compatibility

Third-party authentication handlers registered in your IdentityServer4 project may need updates for the target ASP.NET Core version. The Migration Analysis Tool (Step 0) lists all registered authentication schemes and flags non-Microsoft, non-IdentityServer4 handlers.

Common handlers that need updates:

| Old Handler | Action |
|-------------|--------|
| WS-Federation (`Microsoft.AspNetCore.Authentication.WsFederation`) | Update NuGet package to match target .NET version |
| SAML2P (e.g., Sustainsys.Saml2, ITfoxtec.Identity.Saml2) | Update to a version compatible with .NET 10; note that Duende v8 has built-in SAML 2.0 IdP support (see `duende-identityserver-saml` skill) |
| Social providers (Google, Facebook, Twitter, etc.) | Update `Microsoft.AspNetCore.Authentication.*` packages to match target framework |
| Custom `IAuthenticationHandler` implementations | Verify interface compatibility -- `AuthenticateAsync`, `ChallengeAsync`, `ForbidAsync` signatures are stable, but constructor-injected types may have changed |

After migration, verify all external login flows work end-to-end. Missing or incompatible handlers will cause runtime errors when users attempt to authenticate via those schemes.

### Step 2.12: Update UI Templates

Not all IdentityServer4 projects have a UI layer. Projects that only configure stores, clients, and resources (e.g., headless API-only hosts or database migration utilities) have no UI to migrate -- skip this step entirely.

If your project includes the IdentityServer4 Quickstart UI (login, logout, consent, error pages -- typically MVC controllers with Razor views under `Views/` and `Controllers/`, or Razor Pages under `Pages/`), those templates must be updated. The IdentityServer4 Quickstart UI and the Duende IdentityServer UI templates have diverged significantly since 2018.

#### What Changed in the UI

- Controller -> Razor Pages migration: Duende's newer templates use Razor Pages (`Pages/`) instead of MVC controllers (`Controllers/` + `Views/`). Your existing MVC-based UI will still compile and work after the namespace update, but you will miss newer UI flows.
- New pages: Duende templates include pages for device flow authorization, CIBA (Client-Initiated Backchannel Authentication), dynamic identity provider management, and server-side session management that did not exist in IdentityServer4.
- API changes in view code: Razor views that use `IIdentityServerInteractionService` must be updated for v4 API changes (e.g., `request.ClientId` -> `request.Client.ClientId`, `ScopesConsented` -> `ScopesValuesConsented`, `GetAllUserConsentsAsync` -> `GetAllUserGrantsAsync`).
- Namespace updates in views: Any `@using IdentityServer4` directives in `.cshtml` files must become `@using Duende.IdentityServer`. Check `_ViewImports.cshtml` and individual view files.
- Updated CSS and JavaScript: Layout, styling, and client-side scripts have been refreshed.

#### Recommended Approaches

1. Preferred: Start fresh with Duende templates and port your customizations:
   ```bash
   dotnet new install Duende.Templates
   dotnet new duende-is-ui
   ```
   This scaffolds the current Duende UI pages into your project. Diff the output against your existing UI to identify where your customizations belong.

2. Alternative: Incremental -- use a diff tool to compare your current UI with the Duende templates and apply changes surgically. This is practical when your UI has heavy customizations and starting fresh would lose too much work.

3. Minimum viable update (for projects that just need to compile): Update namespaces in all `.cshtml` files and `_ViewImports.cshtml`, fix v4 API changes in controllers/page models, and defer the full UI refresh. This gets you running but leaves you on the older layout.

---

## Migration Checklist

Use this checklist to track your migration progress:

- [ ] Run the Migration Analysis Tool (Step 0) to get a baseline report of your current configuration
- [ ] Determine starting version -- v3.x requires Stage 1 first; v4.x goes directly to Stage 2
- [ ] Inventory clients -- count interactive vs. non-interactive for license edition selection
- [ ] Update .NET target framework to `net10.0`
- [ ] Replace NuGet packages -- `IdentityServer4.*` -> `Duende.IdentityServer.*`
- [ ] Update all namespaces -- `IdentityServer4` -> `Duende.IdentityServer`; `IdentityModel` -> `Duende.IdentityModel`
- [ ] Fix breaking API changes (v3 -> v4 if applicable)
- [ ] Convert to minimal hosting (if migrating from `netcoreapp3.1`)
- [ ] Preserve issuer URI -- set `IssuerUri` explicitly to match existing deployment
- [ ] Configure license key via configuration/secret manager
- [ ] Remove `AddDeveloperSigningCredential` -- use automatic key management or static credential
- [ ] Create and apply database migrations for both `ConfigurationDbContext` and `PersistedGrantDbContext`
- [ ] Configure data protection with explicit `SetApplicationName` and persistent key storage
- [ ] Migrate or rotate signing keys
- [ ] Verify authentication scheme compatibility -- update third-party auth handlers for new .NET version
- [ ] Update UI templates -- fresh start or incremental diff (skip if project has no UI layer)
- [ ] Verify discovery document at `/.well-known/openid-configuration`
- [ ] Test token issuance and validation end-to-end
- [ ] Check application logs for warnings or errors

---

## Common Migration Issues

`IdentityServer4` namespace not found after package update -- You replaced the NuGet package but didn't update namespaces. Search and replace `using IdentityServer4` with `using Duende.IdentityServer` across all files.

`Scope` type not found in v4 -- In v4, `Scope` was removed as a nested type. API scopes are now top-level `ApiScope` objects. Update `ApiResource.Scopes` from `Scope` objects to string scope names.

EF migration drops and recreates tables (v3 -> v4) -- The auto-generated migration will destroy data. Use the custom delta SQL script approach described in Step 1.4.

Data protection keys invalid after .NET upgrade -- The default application discriminator changed between .NET versions. Set `SetApplicationName()` explicitly to maintain key continuity.

Data protection keys lost on restart -- If no persistent key repository is configured, data protection uses an ephemeral in-memory store. All encrypted data (persisted grants, cookies) becomes unreadable after restart. Configure `PersistKeysToDbContext`, `PersistKeysToFileSystem`, or `PersistKeysToAzureBlobStorage`.

Issuer URI changed after migration -- If the `iss` claim in tokens no longer matches what clients/APIs expect, all existing tokens and trust relationships break. Set `options.IssuerUri` explicitly to match the value from your old `/.well-known/openid-configuration`.

Third-party authentication handler fails at runtime -- External auth handlers (WS-Fed, SAML2P, social providers) compiled against older ASP.NET Core versions may fail to load. Update their NuGet packages to versions compatible with your target .NET version.

Discovery document shows HTTP instead of HTTPS -- If behind a reverse proxy, configure forwarded headers. This is not migration-specific but commonly surfaces during deployment changes.

`AddDeveloperSigningCredential` method not found -- This method still exists in Duende but is intended for development only. For production, use automatic key management or a static signing credential.

`IsPkceClientAsync` method not found -- This was removed in v4. Use `context.IsNativeClient()` or check `request.Client.RequirePkce` directly.

`ConsentResponse.ScopesConsented` property not found -- Renamed to `ScopesValuesConsented` in v4.

Existing persisted grants fail to decrypt after migration -- Ensure ASP.NET Core Data Protection keys from the old deployment are still available. Data protection encrypts the `Data` column in persisted grants. If keys are lost, stored grants become unreadable.

---

## Version Compatibility Reference

| IdentityServer Version | .NET Version | EF Core Version |
|------------------------|-------------|-----------------|
| IdentityServer4 v3.x | .NET Core 3.1 | EF Core 3.1 |
| IdentityServer4 v4.x | .NET Core 3.1 / .NET 5 | EF Core 3.1 / 5.0 |
| Duende IdentityServer v5.x | .NET 5 / .NET 6 | EF Core 5.0 / 6.0 |
| Duende IdentityServer v6.x | .NET 6 / .NET 7 | EF Core 6.0 / 7.0 |
| Duende IdentityServer v7.x | .NET 8 | EF Core 8.0 |
| Duende IdentityServer v8.x | .NET 10 | EF Core 10.0 |

---

## Resources

- [Migration Analysis Tool](https://docs.duendesoftware.com/identityserver/upgrades/identityserver4-upgrade-analysis/) -- pre-migration configuration inspector
- [Official Duende Migration Guide: IdentityServer4 to Duende v8](https://docs.duendesoftware.com/identityserver/upgrades/identityserver4-to-duende-identityserver/)
- [UpgradeSample-IdentityServer4-v3 (reference project)](https://github.com/DuendeSoftware/UpgradeSample-IdentityServer4-v3)
- [Duende IdentityServer Upgrade Overview](https://docs.duendesoftware.com/identityserver/upgrades/)
- [Microsoft ASP.NET Core Migration Guides](https://learn.microsoft.com/en-us/aspnet/core/migration/)
- [Duende IdentityServer Templates](https://www.nuget.org/packages/Duende.Templates)
- Related skill: `duende-identityserver-hosting-setup` -- setting up and hosting Duende IdentityServer
- Related skill: `duende-identityserver-stores` -- EF Core store configuration and migrations
- Related skill: `duende-identityserver-configuration` -- client and resource configuration
- Related skill: `duende-identityserver-key-management` -- signing key management and rotation
- Related skill: `duende-identityserver-upgrade-v7-to-v8` -- additional v8 breaking changes (HybridCache, TimeProvider, CancellationToken on all interfaces)
