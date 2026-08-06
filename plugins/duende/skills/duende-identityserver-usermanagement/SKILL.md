---
name: duende-identityserver-usermanagement
description: "Setting up Duende User Management with IdentityServer: passwordless authentication (OTP, TOTP, passkeys), storage configuration, user lifecycle, and migration from ASP.NET Identity."
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# User Management

## When to Use This Skill

- Adding user management to a Duende IdentityServer project
- Setting up passwordless authentication (OTP, TOTP, passkeys)
- Configuring storage providers (PostgreSQL, SQL Server, SQLite)
- Integrating User Management with IdentityServer for claims and login/logout
- Managing user profiles, roles, and groups
- Migrating users from ASP.NET Identity

## Core Principles

- Duende User Management is passwordless-first -- OTP email/SMS is the default flow
- Requires `Duende.UserManagement.IdentityServer8` NuGet package + .NET 10
- Storage is document-based (no EF migrations needed) -- schema auto-creates at startup
- Configuration goes inside `AddUserManagement()`, not at top level
- Use `app.UseIdentityServer()` (not `UseAuthentication()` separately)

Docs: https://docs.duendesoftware.com/identityserver/usermanagement

## Setup

### 1. Add Packages

```bash
dotnet add package Duende.IdentityServer
dotnet add package Duende.UserManagement.IdentityServer8
dotnet add package Duende.Storage.Sqlite  # or .PostgreSQL, .Mssql
```

### 2. Configure Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddIdentityServer(options =>
{
    options.UserInteraction.LoginUrl = "/Account/Login";
    options.UserInteraction.LogoutUrl = "/Account/Logout";
})
    .AddInMemoryClients(Config.Clients)
    .AddInMemoryIdentityResources(Config.IdentityResources)
    .AddUserManagement(options =>
    {
        // Storage (pick one)
        options.AddSqliteStore("Data Source=users.db");
        // options.AddPostgreSqlStore(connectionString);
        // options.AddSqlServerStore(connectionString);

        // OTP delivery
        options.UseSmtpOtpDispatcher(smtp =>
            builder.Configuration.GetSection("Smtp").Bind(smtp));
    });

var app = builder.Build();

// Auto-create database schema
var schema = app.Services.GetRequiredService<IDatabaseSchema>();
await schema.CreateIfNotExistsAsync();

app.UseIdentityServer();
app.MapRazorPages();
app.Run();
```

### 3. OTP Dispatcher

Console (development):
```csharp
builder.Services.AddSingleton<IOtpDispatcher, ConsoleOtpDispatcher>();
```

SMTP (production):
```csharp
options.UseSmtpOtpDispatcher(x =>
{
    x.Host = "smtp.example.com";
    x.Port = 587;
    x.Username = "noreply@example.com";
    x.Password = "secret";
    x.FromAddress = "noreply@example.com";
});
```

## Authentication Methods

| Method | Description | Setup |
|--------|-------------|-------|
| OTP (default) | One-time codes via email/SMS | `IOtpDispatcher` implementation |
| TOTP | Authenticator apps (RFC 6238) | Built-in, user enrollment required |
| Passkeys | WebAuthn/FIDO2 phishing-resistant | Built-in, browser support required |
| Passwords | Traditional username/password (PBKDF2) | Opt-in, not recommended as primary |
| External | OAuth 2.0 / OIDC federated login | Standard ASP.NET Core auth handlers |
| Recovery codes | Single-use backup codes | Auto-generated during 2FA setup |

## IdentityServer Integration

`AddUserManagement()` is called on the IdentityServer builder -- it automatically:
- Registers `IProfileService` for claims delivery
- Handles login/logout flows
- Maps user attributes to identity token claims

### Claims Mapping

User profile attributes are mapped to claims based on requested scopes:
- `openid` -> `sub`
- `profile` -> `name`, `given_name`, `family_name`, etc.
- `email` -> `email`, `email_verified`

Custom attributes are available through custom identity resources.

## Storage

| Provider | Package | Connection |
|----------|---------|------------|
| SQLite | `Duende.Storage.Sqlite` | `Data Source=users.db` |
| PostgreSQL | `Duende.Storage.PostgreSQL` | Standard connection string |
| SQL Server | `Duende.Storage.Mssql` | Standard connection string |
| In-Memory | (built-in) | `Data Source=:memory:` (testing only) |

Storage is document-based -- no EF Core migrations needed. Call `IDatabaseSchema.CreateIfNotExistsAsync()` at startup to ensure schema exists.

## User Lifecycle

- Creation: Users are created on first authentication (passwordless) or via admin APIs
- Profiles: Custom attributes stored as key-value pairs, organized in attribute groups
- Roles & Groups: RBAC support with group membership and role inheritance
- Deletion: Full user deletion with cascade

## Migration from ASP.NET Identity

```csharp
options.AddAspNetIdentityMigration(migrationOptions =>
{
    migrationOptions.ConnectionString = "existing-aspnet-identity-db";
});
```

Key points:
- Imports users, roles, and claims from existing ASP.NET Identity tables
- Password hashes are preserved (users can still log in with existing passwords)
- Migration runs once; subsequent runs skip already-imported users
- After migration, users can enroll in passwordless methods

## Common Anti-Patterns

WRONG Configuring storage outside `AddUserManagement()` -- storage config must be inside the options lambda
WRONG Using `UseAuthentication()` instead of `UseIdentityServer()` -- IdentityServer middleware handles auth
WRONG Skipping `CreateIfNotExistsAsync()` -- database tables won't exist on first run
WRONG Using in-memory storage in production -- data is lost on restart

## Common Pitfalls

1. Storage configuration location: `AddSqliteStore()`/`AddPostgreSqlStore()` must be called inside the `AddUserManagement(options => { })` lambda, not on the top-level builder.
2. .NET 10 required: User Management requires .NET 10 SDK or later.
3. OTP dispatcher required: Without an `IOtpDispatcher`, the default OTP flow cannot send codes. Register `ConsoleOtpDispatcher` for development.
4. LoginUrl/LogoutUrl: Must be set in IdentityServer options to point to your account pages.
5. Schema creation: Call `IDatabaseSchema.CreateIfNotExistsAsync()` before the app starts handling requests.

## Related Skills

- `duende-identityserver-configuration` -- IdentityServer host configuration and options
- `duende-identityserver-ui-flows` -- Login/logout UI flows
- `duende-identityserver-upgrade-v7-to-v8` -- Migration guide for v8 (includes User Management as new feature)
- `duende-aspnetcore-authentication` -- ASP.NET Core authentication fundamentals
