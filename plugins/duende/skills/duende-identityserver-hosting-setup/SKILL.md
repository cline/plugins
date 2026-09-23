---
name: duende-identityserver-hosting-setup
description: Setting up and hosting Duende IdentityServer in ASP.NET Core applications, including DI registration, middleware pipeline, hosting patterns, essential options, license configuration, and ASP.NET Identity integration.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Setting Up and Hosting IdentityServer

## When to Use This Skill

- Setting up a new Duende IdentityServer project from scratch
- Configuring the ASP.NET Core DI system and middleware pipeline for IdentityServer
- Deciding between separate vs shared hosting patterns
- Integrating IdentityServer with ASP.NET Identity for user management
- Configuring `IdentityServerOptions` (issuer, key management, endpoints)
- Setting up proxy/load balancer forwarded headers
- Configuring data protection for production deployments
- Understanding the IdentityServer middleware pipeline ordering

Docs: https://docs.duendesoftware.com/identityserver/fundamentals

## Core Concepts

Duende IdentityServer is middleware that adds OpenID Connect and OAuth 2.0 endpoints to an ASP.NET Core host. It requires two setup steps: registering services in DI and adding middleware to the request pipeline.

### Architecture Decision: Separate vs Shared Host

IdentityServer should be in its own dedicated application to minimize the attack surface. While it is technically possible to co-host IdentityServer with clients or APIs, this is not recommended.

| Hosting Pattern                 | Pros                                                                 | Cons                                        |
| ------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| Separate host (recommended) | Minimal attack surface, independent scaling, clear security boundary | Additional deployment artifact              |
| Shared with web app         | Fewer projects                                                       | Larger attack surface, coupled deployments  |
| Shared with API             | Fewer projects                                                       | Security risk, conflicting middleware needs |

## Step 1: Install Templates and Create a Project

```bash
dotnet new install Duende.Templates
dotnet new duende-is-empty -n IdentityServer
```

The `duende-is-empty` template creates a minimal project with the IdentityServer NuGet package installed and basic configuration.

## Step 2: Register IdentityServer Services (DI)

Call `AddIdentityServer` on the service collection to register all necessary services. This method also calls `AddAuthentication` internally.

```csharp
// Program.cs
var idsvrBuilder = builder.Services.AddIdentityServer(options =>
{
    // Configure IdentityServerOptions here
});
```

### Adding Configuration Stores

The builder object returned by `AddIdentityServer` provides extension methods to add configuration stores for clients, resources, and scopes:

```csharp
// Program.cs
var idsvrBuilder = builder.Services.AddIdentityServer()
    .AddInMemoryClients(Config.Clients)
    .AddInMemoryIdentityResources(Config.IdentityResources)
    .AddInMemoryApiScopes(Config.ApiScopes);
```

Store options:

- In-memory stores - good for development, demos, and static configuration
- EntityFramework stores - production-ready, supports dynamic configuration
- Custom stores - implement the store interfaces for any backing store

### Minimal Working Example

```csharp
// Program.cs
builder.Services.AddIdentityServer()
    .AddInMemoryApiScopes(Config.ApiScopes)
    .AddInMemoryClients(Config.Clients);

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();
app.UseIdentityServer();
app.UseAuthorization();
app.MapDefaultControllerRoute();

app.Run();
```

## Step 3: Configure the Request Pipeline

Add `UseIdentityServer` middleware to the pipeline. Pipeline ordering is critical.

```csharp
// Program.cs
var app = builder.Build();
app.UseStaticFiles();

app.UseRouting();
app.UseIdentityServer();
app.UseAuthorization();

app.MapDefaultControllerRoute();
```

### Pipeline Ordering Rules

| Order | Middleware                    | Notes                                              |
| ----- | ----------------------------- | -------------------------------------------------- |
| 1     | `UseStaticFiles()`            | Before IdentityServer                              |
| 2     | `UseRouting()`                | Before IdentityServer                              |
| 3     | `UseIdentityServer()`         | Includes `UseAuthentication()` internally          |
| 4     | `UseAuthorization()`          | Required after IdentityServer, must not be omitted |
| 5     | `MapDefaultControllerRoute()` | UI framework endpoints                             |

### Common Pipeline Anti-Patterns

```csharp
// WRONG WRONG: UseAuthentication is redundant (UseIdentityServer includes it)
app.UseAuthentication();
app.UseIdentityServer();

// OK CORRECT: UseIdentityServer already calls UseAuthentication
app.UseIdentityServer();
app.UseAuthorization();
```

```csharp
// WRONG WRONG: Missing UseAuthorization - required for the Duende UI template
app.UseIdentityServer();
app.MapDefaultControllerRoute();

// OK CORRECT: Always include UseAuthorization after UseIdentityServer
app.UseIdentityServer();
app.UseAuthorization();
app.MapDefaultControllerRoute();
```

```csharp
// WRONG WRONG: IdentityServer before routing
app.UseIdentityServer();
app.UseRouting();

// OK CORRECT: Routing before IdentityServer
app.UseRouting();
app.UseIdentityServer();
```

## Step 4: Configure Essential IdentityServerOptions

```csharp
// Program.cs
var idsvrBuilder = builder.Services.AddIdentityServer(options =>
{
    // IssuerUri: Not recommended to set; inferred from request URL by default.
    // Set only when IdentityServer is accessed on a different address than the
    // expected issuer (e.g., internal Kubernetes address).
    // options.IssuerUri = "https://identity.example.com";

    // Emit scopes as space-delimited string per RFC 9068
    options.EmitScopesAsSpaceDelimitedStringInJwt = false; // default, array format

    // Emit static audience claim in format {issuer}/resources
    options.EmitStaticAudienceClaim = false; // default

    // Emit iss response parameter on authorize responses (RFC 9207)
    options.EmitIssuerIdentificationResponseParameter = true; // default
});
```

### Key Configuration Properties

| Property                                    | Default           | Purpose                                           |
| ------------------------------------------- | ----------------- | ------------------------------------------------- |
| `IssuerUri`                                 | inferred from URL | Token issuer name in discovery and tokens         |
| `LowerCaseIssuerUri`                        | `true`            | Lowercase inferred issuer URIs                    |
| `AccessTokenJwtType`                        | `"at+jwt"`        | `typ` header in JWT access tokens (RFC 9068)      |
| `EmitScopesAsSpaceDelimitedStringInJwt`     | `false`           | Scope claim format in JWTs                        |
| `EmitStaticAudienceClaim`                   | `false`           | Static `aud` claim in `{issuer}/resources` format |
| `EmitIssuerIdentificationResponseParameter` | `true`            | `iss` param on authorize responses (RFC 9207)     |

## Step 5: Configure the License Key

Duende IdentityServer requires a valid license for production use. Without a license key, IdentityServer runs in trial/community mode and will log a warning on startup.

Set the license key via `options.LicenseKey` or via configuration:

```csharp
// Option 1: Inline in AddIdentityServer (not recommended for production -- keep out of source control)
builder.Services.AddIdentityServer(options =>
{
    options.LicenseKey = "YOUR_LICENSE_KEY";
});

// Option 2: From configuration (recommended)
builder.Services.AddIdentityServer(options =>
{
    options.LicenseKey = builder.Configuration["IdentityServer:LicenseKey"];
});
```

Store the key in a secret manager, environment variable, or key vault -- never in source-controlled `appsettings.json`.

## Step 6: ASP.NET Identity Integration

To use ASP.NET Identity as the user store for IdentityServer, install the integration package and configure both systems:

```bash
dotnet add package Duende.IdentityServer.AspNetIdentity
```

```csharp
// Program.cs
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddIdentityServer()
    .AddAspNetIdentity<ApplicationUser>();
```

### What AddAspNetIdentity Configures

`AddAspNetIdentity<TUser>` registers the following IdentityServer implementations:

- `IProfileService` - uses `IUserClaimsPrincipalFactory` to add claims to tokens
- `IResourceOwnerPasswordValidator` - supports the password grant type
- `IUserClaimsPrincipalFactory` - a wrapper implementation that calls through to the previously registered factory and adds extra IdentityServer-specific claims

### Custom IUserClaimsPrincipalFactory

If you register a custom `IUserClaimsPrincipalFactory` before calling `AddAspNetIdentity`, the IdentityServer registration will resolve your factory and call through to it, layering additional claims on top:

```csharp
// Program.cs

// Register custom factory BEFORE AddAspNetIdentity
builder.Services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, CustomClaimsPrincipalFactory>();

builder.Services.AddIdentityServer()
    .AddAspNetIdentity<ApplicationUser>();
```

### Inactive User Handling

ASP.NET Identity has no built-in concept of inactive users. The default `IsActiveAsync` implementation returns `true`. To support enable/disable functionality:

```csharp
public class CustomProfileService : ProfileService<ApplicationUser>
{
    public CustomProfileService(
        UserManager<ApplicationUser> userManager,
        IUserClaimsPrincipalFactory<ApplicationUser> claimsFactory)
        : base(userManager, claimsFactory)
    { }

    protected override Task<bool> IsUserActiveAsync(ApplicationUser user)
    {
        return Task.FromResult(user.IsEnabled); // your custom property
    }
}
```

### Template Alternative

Use the `duende-is-aspid` template for a pre-configured ASP.NET Identity integration:

```bash
dotnet new duende-is-aspid -n IdentityServer
```

## Production Deployment: Proxy and Load Balancer Configuration

When behind a reverse proxy or load balancer, the proxy obscures request scheme and IP address. This causes common symptoms:

- HTTPS downgraded to HTTP in discovery document
- Incorrect host names in discovery or redirects
- Cookies missing the `secure` attribute

### Solution: Forwarded Headers Middleware

Option 1: Environment variable (simple)
Set `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` for cloud/Kubernetes environments.

Option 2: Explicit configuration (production)

```csharp
// Program.cs
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedHost |
                                ForwardedHeaders.XForwardedProto;

    options.KnownProxies.Add(IPAddress.Parse("203.0.113.42"));
    options.ForwardLimit = 1;
});
```

Add `UseForwardedHeaders()` early in the pipeline, before `UseIdentityServer()`.

## Production Deployment: Data Protection

Data protection is critical for IdentityServer. It protects signing keys at rest, persisted grants, server-side sessions, and authentication cookies. See [ASP.NET Core Data Protection](https://docs.duendesoftware.com/general/data-protection/) for comprehensive guidance covering all Duende SDKs.

```csharp
// Program.cs
builder.Services.AddDataProtection()
    .PersistKeysToFoo()       // Choose persistence (FileSystem, DbContext, Azure, Redis, etc.)
    .ProtectKeysWithBar()     // Choose key protection (Certificate, Azure Key Vault, etc.)
    .SetApplicationName("My.IdentityServer"); // Prevent key isolation issues
```

### Data Protection Checklist

| Requirement                               | Why                                                          |
| ----------------------------------------- | ------------------------------------------------------------ |
| Persist keys to durable storage           | Keys are lost on restart without persistence                 |
| Share keys across load-balanced instances | Each instance must read data protected by other instances    |
| Set explicit application name             | Prevents key isolation across deployments                    |
| Ensure storage durability                 | Redis without persistence or ephemeral filesystems lose keys |

### Data Protection Keys vs Signing Keys

These are completely separate:

|                  | Data Protection Keys                          | IdentityServer Signing Keys          |
| ---------------- | --------------------------------------------- | ------------------------------------ |
| Purpose      | Encrypt/sign sensitive data (cookies, grants) | Sign tokens (JWT, id_token)          |
| Cryptography | Symmetric (private key)                       | Asymmetric (public/private key pair) |
| Framework    | ASP.NET Core Data Protection                  | IdentityServer Key Management        |
| Public       | No                                            | Public keys published in discovery   |

## Common Pitfalls

1. Missing `UseAuthorization()` - The Duende UI template requires authorization middleware. Omitting it causes authorization failures in the UI pages.

2. Redundant `UseAuthentication()` - `UseIdentityServer()` already includes `UseAuthentication()`. Adding both is unnecessary but not harmful.

3. Data protection not configured for production - The default file-based key storage does not survive container restarts or work across load-balanced instances. Always configure persistent, shared key storage.

4. Issuer mismatch - If `IssuerUri` is set manually, clients must know this exact value. Prefer letting IdentityServer infer the issuer from request URLs.

5. Keys directory in source control - The `~/keys` directory created by automatic key management contains cryptographic secrets and must be excluded from source control via `.gitignore`.

6. Shared hosting with APIs/clients - Co-hosting IdentityServer with other applications increases the attack surface. Use a dedicated host.

7. Not calling `AddAspNetIdentity` after `AddIdentity` - When using ASP.NET Identity, you must call both. `AddIdentity` configures ASP.NET Identity; `AddAspNetIdentity` bridges it to IdentityServer.

---

## Related Skills

- `duende-identityserver-configuration` -- client definitions, resources, scopes
- `duende-identityserver-deployment` -- production deployment, data protection, health checks
- `duende-identityserver-aspire` -- orchestrating IdentityServer in Aspire AppHost
