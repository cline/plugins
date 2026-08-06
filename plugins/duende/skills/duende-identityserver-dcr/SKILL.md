---
name: duende-identityserver-dcr
description: "Configuring Dynamic Client Registration (DCR) in Duende IdentityServer: endpoint setup, authorization policies, custom validation with DynamicClientRegistrationValidator, software statement validation, IClientConfigurationStore, and separate DCR hosting."
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# Dynamic Client Registration (DCR)

## When to Use This Skill

- Setting up Dynamic Client Registration (DCR) at `/connect/dcr`
- Securing the DCR endpoint with authorization policies
- Customizing DCR validation with `DynamicClientRegistrationValidator`
- Implementing software statement validation
- Persisting dynamically registered clients with `IClientConfigurationStore`
- Hosting DCR in a separate application from IdentityServer

## Core Principles

- DCR requires the `Duende.IdentityServer.Configuration` NuGet package
- Requires Business Edition or higher license
- Always secure the `/connect/dcr` endpoint with an authorization policy -- never expose it unauthenticated
- Enforce PKCE and restrict allowed grant types in the DCR validator
- Use persistent stores (database) for dynamically registered clients in production

Docs: https://docs.duendesoftware.com/identityserver/configuration/dcr

## Overview

Dynamic Client Registration allows clients to register themselves at the `/connect/dcr` endpoint per RFC 7591. This feature requires the Business Edition or higher and has been available since version 6.3.

DCR uses a separate NuGet package and can be hosted in the same application as IdentityServer or in a separate host.

### Setup

```bash
dotnet add package Duende.IdentityServer.Configuration
```

```csharp
// Program.cs
builder.Services.AddIdentityServer()
    .AddInMemoryClients(Config.Clients)
    .AddInMemoryIdentityResources(Config.IdentityResources)
    .AddInMemoryApiScopes(Config.ApiScopes);

builder.Services.AddIdentityServerConfiguration();

var app = builder.Build();

app.UseIdentityServer();
app.UseAuthorization();

app.MapDynamicClientRegistration();

app.Run();
```

### Securing the DCR Endpoint

Apply standard ASP.NET Core authorization policies to the DCR endpoint:

```csharp
// Using JWT bearer for the DCR endpoint
builder.Services.AddAuthentication()
    .AddJwtBearer("dcr", options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "IdentityServer.Configuration";
        options.TokenValidationParameters.ValidTypes = ["at+jwt"];
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("dcr", policy =>
    {
        policy.AddAuthenticationSchemes("dcr");
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("scope", "IdentityServer.Configuration");
    });
});

app.MapDynamicClientRegistration()
    .RequireAuthorization("dcr");
```

### DCR Request and Response

Registration request:

```
POST /connect/dcr HTTP/1.1
Content-Type: application/json
Authorization: Bearer <access_token>

{
    "client_name": "My Dynamic App",
    "redirect_uris": ["https://app.example.com/callback"],
    "grant_types": ["authorization_code"],
    "response_types": ["code"],
    "token_endpoint_auth_method": "client_secret_basic"
}
```

Registration response:

```json
{
  "client_id": "generated-client-id",
  "client_secret": "generated-secret",
  "client_name": "My Dynamic App",
  "redirect_uris": ["https://app.example.com/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "registration_client_uri": "https://identity.example.com/connect/dcr?client_id=generated-client-id",
  "registration_access_token": "..."
}
```

### Customizing DCR Validation

Extend `DynamicClientRegistrationValidator` to add custom validation logic:

```csharp
public class CustomDcrValidator : DynamicClientRegistrationValidator
{
    protected override Task ValidateGrantTypesAsync(
        DynamicClientRegistrationContext context)
    {
        // Only allow authorization_code
        var grantTypes = context.Request.GrantTypes;
        if (grantTypes.Any(gt => gt != "authorization_code"))
        {
            context.SetError("Grant type not allowed");
            return Task.CompletedTask;
        }

        return base.ValidateGrantTypesAsync(context);
    }

    protected override Task ValidateRedirectUrisAsync(
        DynamicClientRegistrationContext context)
    {
        // Enforce HTTPS redirect URIs
        var uris = context.Request.RedirectUris;
        if (uris.Any(u => !u.StartsWith("https://", StringComparison.OrdinalIgnoreCase)))
        {
            context.SetError("Redirect URIs must use HTTPS");
            return Task.CompletedTask;
        }

        return base.ValidateRedirectUrisAsync(context);
    }

    protected override Task SetClientDefaultsAsync(
        DynamicClientRegistrationContext context)
    {
        // Set defaults for dynamically registered clients
        var client = context.Client;
        client.RequirePkce = true;
        client.AllowOfflineAccess = false;
        client.AccessTokenLifetime = 300; // 5 minutes

        return base.SetClientDefaultsAsync(context);
    }
}
```

Register:

```csharp
builder.Services.AddIdentityServerConfiguration()
    .AddDynamicClientRegistrationValidator<CustomDcrValidator>();
```

### DynamicClientRegistrationContext

The context object passed to validation methods contains:

| Property  | Purpose                                               |
| --------- | ----------------------------------------------------- |
| `Client`  | The IdentityServer `Client` being built               |
| `Request` | The raw DCR request                                   |
| `Caller`  | The `ClaimsPrincipal` of the authenticated DCR caller |
| `Items`   | Dictionary for passing data between validation steps  |

### Software Statements

Software statements are signed JWTs that contain pre-approved client metadata. Validate them by overriding `ValidateSoftwareStatementAsync`:

```csharp
public class SoftwareStatementDcrValidator : DynamicClientRegistrationValidator
{
    protected override async Task ValidateSoftwareStatementAsync(
        DynamicClientRegistrationContext context)
    {
        var softwareStatement = context.Request.SoftwareStatement;
        if (string.IsNullOrEmpty(softwareStatement))
        {
            context.SetError("Software statement required");
            return;
        }

        var handler = new JsonWebTokenHandler();
        var validationResult = await handler.ValidateTokenAsync(
            softwareStatement,
            new TokenValidationParameters
            {
                ValidIssuer = "https://trusted-authority.example.com",
                IssuerSigningKeys = await GetTrustedKeysAsync(),
                ValidateLifetime = true
            });

        if (!validationResult.IsValid)
        {
            context.SetError("Invalid software statement");
            return;
        }

        // Apply claims from software statement to the client
        var claims = validationResult.ClaimsIdentity;
        context.Client.ClientName = claims.FindFirst("software_name")?.Value;

        await base.ValidateSoftwareStatementAsync(context);
    }
}
```

### Other DCR Extensibility Points

| Interface                                     | Purpose                                  |
| --------------------------------------------- | ---------------------------------------- |
| `IDynamicClientRegistrationRequestProcessor`  | Process the DCR request (extend default) |
| `IDynamicClientRegistrationResponseGenerator` | Customize the DCR response               |

### Client Configuration Store

DCR needs a persistent store for dynamically registered clients. Use the Entity Framework implementation:

```bash
dotnet add package Duende.IdentityServer.Configuration.EntityFramework
```

```csharp
builder.Services.AddIdentityServerConfiguration()
    .AddClientConfigurationStore();
```

Or implement `IClientConfigurationStore` for a custom backing store:

```csharp
public class CustomClientConfigurationStore : IClientConfigurationStore
{
    public async Task AddAsync(Client client)
    {
        // Persist the dynamically registered client
    }

    public async Task<Client?> FindByClientIdAsync(string clientId)
    {
        // Retrieve a dynamically registered client
    }

    public async Task UpdateAsync(Client client)
    {
        // Update client configuration
    }

    public async Task DeleteAsync(string clientId)
    {
        // Remove a dynamically registered client
    }
}
```

### Separate DCR Host

DCR can be hosted in a separate application from IdentityServer:

```csharp
// Separate DCR host -- Program.cs
builder.Services.AddIdentityServerConfiguration(options =>
{
    options.IdentityServerBaseUrl = "https://identity.example.com";
});

builder.Services.AddAuthentication()
    .AddJwtBearer("dcr", options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "IdentityServer.Configuration";
    });

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
app.MapDynamicClientRegistration().RequireAuthorization("dcr");

app.Run();
```

## Common Anti-Patterns

- Exposing the DCR endpoint without authentication -- Always secure `/connect/dcr` with an authorization policy.

- Allowing dynamically registered clients to use any grant type -- Restrict allowed grant types and enforce PKCE in the DCR validator.

- Using in-memory stores for DCR clients in production -- Use persistent stores (database) for production deployments.

## Common Pitfalls

1. Business Edition requirement: `AddIdentityServerConfiguration()` requires a Business Edition or higher license. Community Edition does not support DCR.

2. Client secrets: Dynamically registered clients receive generated secrets. Ensure your `IClientConfigurationStore` stores these securely (hashed, not plaintext).

3. Software statement trust: Software statements must be validated against a trusted signing key. Do not accept software statements signed by unknown issuers.

4. Separate host connectivity: When hosting DCR separately, it must be able to communicate with IdentityServer's data stores. Ensure the `IClientConfigurationStore` is backed by the same database that IdentityServer reads from (or uses a shared data layer).

## Related Skills

- `duende-identityserver-configuration` -- IdentityServer host configuration, client types, grant types, secret management, and resource configuration
- `duende-identityserver-saml` -- SAML 2.0 Identity Provider (the other advanced IdentityServer feature)
- `duende-identityserver-stores` -- Persistent store patterns (useful for custom `IClientConfigurationStore`)
- `duende-aspnetcore-authorization` -- Authorization policies for securing the DCR endpoint
- `duende-identity-security-hardening` -- Security hardening including HTTPS enforcement
