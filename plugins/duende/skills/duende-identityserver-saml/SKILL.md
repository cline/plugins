---
name: duende-identityserver-saml
description: "Configuring Duende IdentityServer as a SAML 2.0 Identity Provider (IdP): service provider registration, SSO and SLO flows, claim mappings, extensibility interfaces, and production deployment patterns."
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# SAML 2.0 Identity Provider

## When to Use This Skill

- Setting up IdentityServer as a SAML 2.0 Identity Provider (IdP)
- Registering SAML Service Providers with the `SamlServiceProvider` model
- Configuring SP-initiated SSO and Single Logout (SLO) flows
- Customizing claim-to-attribute mappings via `ClaimMappings` or extensibility interfaces
- Implementing production SP stores (EF Core, custom `ISamlServiceProviderStore`)
- Extending SAML behavior (custom NameID generation, signing, metadata, multi-tenant issuer)
- Linking an external SAML IdP as a federated authentication source (SP mode)

## Core Principles

- SAML 2.0 IdP support is built into Duende.IdentityServer (v8.0+) -- no separate NuGet package
- Requires Advanced or Custom Edition license
- SP-initiated SSO is the default; IdP-initiated SSO is opt-in per service provider
- `SignAssertion` is the default and most interoperable signing behavior
- Use EF Core stores for service providers in production; in-memory is for development only
- Front-channel SLO uses iframes (not redirect chains); partial logout is expected behavior
- The claim pipeline flows: AllowedScopes -> RequestedClaimTypes -> ClaimMappings

Docs: https://docs.duendesoftware.com/identityserver/saml

## Setup

```csharp
builder.Services.AddIdentityServer()
    .AddInMemoryClients(Config.Clients)
    .AddInMemoryIdentityResources(Config.IdentityResources)
    .AddSaml()
    .AddInMemorySamlServiceProviders(Config.SamlServiceProviders);
```

Update the login page to call `DenyAuthenticationAsync` for SAML cancellation support (when user cancels login during a SAML flow).

## Endpoints

| Endpoint | Path | Purpose |
|----------|------|---------|
| Metadata | `/Saml2` | IdP metadata (certificates, endpoints, NameID formats) |
| Sign-in | `/Saml2/SSO` | Receives AuthnRequest (GET/POST) |
| Sign-in Callback | `/Saml2/SSO/Callback` | Builds SAML Response after authentication |
| Logout | `/Saml2/SLO` | Handles LogoutRequest/LogoutResponse |
| Logout Callback | `/Saml2/SLO/Callback` | Completes SLO round-trip |

Paths are customizable via `SamlOptions.Endpoints`.

## SamlServiceProvider Model

```csharp
new SamlServiceProvider
{
    // Required
    EntityId = "https://sp.example.com",
    DisplayName = "Example SP",

    // ACS endpoints (HTTP-POST only, indexed)
    AssertionConsumerServiceUrls =
    [
        new IndexedEndpoint
        {
            Location = "https://sp.example.com/acs",
            Binding = SamlBinding.HttpPost,
            Index = 0,
            IsDefault = true
        }
    ],

    // Single Logout (HTTP-Redirect only)
    SingleLogoutServiceUrls =
    [
        new SamlEndpointType
        {
            Location = "https://sp.example.com/saml/slo",
            Binding = SamlBinding.HttpRedirect
        }
    ],

    // Security
    SigningBehavior = SamlSigningBehavior.SignAssertion,
    RequireSignedAuthnRequests = true,
    Certificates =
    [
        new ServiceProviderCertificate
        {
            Certificate = spCert,
            Use = KeyUse.Signing
        }
    ],

    // Claims (identity resources the SP can access)
    AllowedScopes = ["openid", "profile", "email"],
    RequestedClaimTypes = ["email", "name"],  // optional narrowing
    ClaimMappings = new Dictionary<string, string>
    {
        ["email"] = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        ["name"] = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
    },

    // NameID
    DefaultNameIdFormat = SamlNameIdFormat.EmailAddress,

    // IdP-Initiated SSO (opt-in)
    AllowIdpInitiated = false
}
```

### Claim Pipeline

```
AllowedScopes (identity resources) -> filters available claim types
    +vv
RequestedClaimTypes (optional narrowing) -> selects specific claims
    +vv
ClaimMappings (OIDC claim name -> SAML attribute URI) -> output as <saml:Attribute>
```

Use `SamlOptions.DefaultClaimMappings` for global defaults; per-SP `ClaimMappings` override them.

## Configuration (SamlOptions)

```csharp
builder.Services.AddIdentityServer(options =>
{
    options.Saml.EntityId = "https://idp.example.com/Saml2"; // default: {host}/Saml2
    options.Saml.WantAuthnRequestsSigned = true;             // default: true
    options.Saml.RequireSignedLogoutResponses = true;        // default: true
    options.Saml.DefaultSigningBehavior = SamlSigningBehavior.SignAssertion;
    options.Saml.DefaultClockSkew = TimeSpan.FromMinutes(5);
    options.Saml.DefaultRequestMaxAge = TimeSpan.FromMinutes(5);
    options.Saml.DefaultAssertionLifetime = TimeSpan.FromMinutes(5);
    options.Saml.SupportedNameIdFormats = [SamlNameIdFormat.EmailAddress, SamlNameIdFormat.Unspecified];
    options.Saml.MaxRelayStateLength = 80; // SAML spec requirement

    // Global claim mappings
    options.Saml.DefaultClaimMappings = new Dictionary<string, string>
    {
        ["name"] = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        ["email"] = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        ["role"] = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    };

    // AuthnContext mappings (acr/amr -> SAML AuthnContext URIs)
    options.Saml.DefaultAuthnContextMappings = new Dictionary<string, string>
    {
        ["pwd"] = "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport"
    };
});
```

### Metadata Options

```csharp
options.Saml.Metadata.CacheDuration = TimeSpan.FromHours(12);
options.Saml.Metadata.ExpiryDuration = TimeSpan.FromDays(5);
```

## Service Provider Stores

### In-Memory (Development)

```csharp
.AddInMemorySamlServiceProviders(new[]
{
    new SamlServiceProvider { EntityId = "...", /* ... */ }
});
```

### EF Core (Production -- Recommended)

```csharp
.AddConfigurationStore(options =>
{
    options.ConfigureDbContext = b =>
        b.UseSqlServer(connectionString);
})
```

Run EF migrations: `dotnet ef migrations add Update_DuendeIdentityServer_v8_0`

### Custom Store

```csharp
.AddSamlServiceProviderStore<MySamlSpStore>()

public class MySamlSpStore : ISamlServiceProviderStore
{
    public Task<SamlServiceProvider?> FindByEntityIdAsync(
        string entityId, CancellationToken ct)
    { /* lookup from your backend */ }

    public IAsyncEnumerable<SamlServiceProvider> GetAllSamlServiceProvidersAsync(
        CancellationToken ct)
    { /* stream all SPs */ }
}
```

### Caching & Validation

```csharp
// Add HybridCache layer to any custom store
.AddSamlServiceProviderStoreCache<MySamlSpStore>()
```

All stores are automatically wrapped with `ValidatingSamlServiceProviderStore<T>` that checks: EntityId required, >=1 ACS URL (HTTP-POST only), >=1 AllowedScopes, positive lifetimes. Invalid SPs are treated as non-existent.

## Single Logout (SLO)

SLO uses front-channel logout via iframes (not redirect chains):

1. SP sends LogoutRequest to `/Saml2/SLO`
2. IdentityServer ends local session
3. Renders iframes sending LogoutRequests to all other active SPs
4. Collects LogoutResponses from SPs
5. Sends final LogoutResponse to originating SP

Key points:
- Partial logout is normal (some SPs may not respond)
- User must stay on logout page for iframes to complete
- Use `ISamlLogoutSessionStore` for distributed deployments (tracks which SPs have active sessions)
- Short session lifetimes serve as SLO fallback

## Extensibility

| Interface | Purpose |
|-----------|---------|
| `ISamlNameIdGenerator` | Custom NameID value derivation (e.g., from employee_id claim) |
| `ISamlSigningService` | HSM/Key Vault signing certificate integration |
| `ISaml2MetadataResponseGenerator` | Custom metadata extensions (org info, federation) |
| `ISaml2IssuerNameService` | Multi-tenant: dynamic entity ID per tenant |
| `ISaml2SsoInteractionResponseGenerator` | Custom step-up auth logic during SSO |
| `ISaml2SsoResponseGenerator` | Custom SAML Response generation |
| `ISamlLogoutNotificationService` | Selective SLO targeting (choose which SPs get notified) |
| `ISamlLogoutSessionStore` | Distributed SLO state (Redis, EF Core) |
| `ISaml2FrontChannelLogoutRequestBuilder` | Custom logout request structure |
| `ISamlResourceResolver` | Dynamic scope filtering per SP |
| `IIdpInitiatedSsoService` | Portal "My Apps" dashboard for IdP-initiated flows |
| `IAuthnRequestValidator` | Custom SP access rules, IP/time-based controls |
| `ILogoutRequestValidator` | Custom SLO authorization rules |
| `ISamlSigninStateStore` | Distributed sign-in state (for multi-node deployments) |
| `ISamlServiceProviderConfigurationValidator` | Custom SP config validation rules |

### Example: Custom NameID Generator

```csharp
public class EmployeeNameIdGenerator : ISamlNameIdGenerator
{
    public Task<NameIdGenerationResult> GenerateAsync(
        NameIdGenerationContext context, CancellationToken ct)
    {
        var employeeId = context.Subject.FindFirst("employee_id")?.Value;
        if (employeeId is null)
            return Task.FromResult(NameIdGenerationResult.Failure(
                StatusCodes.Responder, StatusCodes.UnknownPrincipal,
                "Employee ID claim not found."));

        return Task.FromResult(NameIdGenerationResult.Success(
            new NameId(employeeId, context.ResolvedFormat)));
    }
}
```

### SAML Authentication Context in Login UI

Inject `IIdentityServerInteractionService` and call `GetSamlAuthenticationContextAsync(returnUrl)` to access `SamlAuthenticationContext` (requesting SP, required AuthnContext) for customizing login flows per SP.

## Using IdentityServer as a SAML Service Provider (SP Mode)

IdentityServer can consume SAML assertions from external IdPs via federation. Add a SAML authentication handler (e.g., `Sustainsys.Saml2` or `ITfoxtec.Identity.Saml2`) and configure it as an external provider in IdentityServer's login UI -- same pattern as any external authentication scheme.

## Common Anti-Patterns

WRONG Enabling `AllowIdpInitiated` on all SPs -- only enable where explicitly required (less secure)
WRONG Using `DoNotSign` outside of local testing
WRONG Using in-memory SP stores in production
WRONG Omitting `AllowedScopes` -- SP gets no claims in the assertion
WRONG Configuring ACS URLs with HTTP-Redirect binding (only HTTP-POST is supported)

## Common Pitfalls

1. Edition requirement: `AddSaml()` requires Advanced or Custom Edition license.
2. ACS binding: Only HTTP-POST is supported for AssertionConsumerServiceUrls. HTTP-Redirect will fail validation.
3. Clock skew: Default 5 minutes. Increase if SPs report "response not yet valid" errors.
4. Partial SLO: Front-channel logout via iframes means some SPs may not respond. This is expected -- don't treat it as an error.
5. DenyAuthenticationAsync: Login page must call this for SAML cancellation. Without it, users get stuck if they cancel.
6. Operational stores: For multi-node deployments, configure `ISamlSigninStateStore` and `ISamlLogoutSessionStore` (e.g., EF Core, Redis). Without them, SSO/SLO state is lost across nodes.
7. Certificate rotation: Metadata is cached (default 12h). SPs may not pick up new signing certs until cache expires.
8. ClaimMappings vs AllowedScopes: If `AllowedScopes` doesn't include a resource containing a claim type, that claim won't reach `ClaimMappings`.

## Related Skills

- `duende-identityserver-configuration` -- IdentityServer host configuration and options
- `duende-identityserver-stores` -- Persistent store patterns (EF Core, custom stores)
- `duende-identity-security-hardening` -- Key rotation, HTTPS enforcement
- `duende-identityserver-ui-flows` -- Login/logout UI flows that SAML integrates with
- `duende-identityserver-upgrade-v7-to-v8` -- Migration guide including SAML EF migrations
