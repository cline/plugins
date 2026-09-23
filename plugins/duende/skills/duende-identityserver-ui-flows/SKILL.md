---
name: duende-identityserver-ui-flows
description: "Guide for building login, logout, consent, error, and federation gateway UI pages in Duende IdentityServer, including IIdentityServerInteractionService usage, external provider integration, and Home Realm Discovery strategies."
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# IdentityServer UI Flows: Login, Logout, Consent, and Federation

## When to Use This Skill

- Building or customizing the login page (local credentials, MFA, passwordless)
- Integrating external identity providers (Google, Azure AD, SAML, etc.)
- Implementing the consent page for third-party client authorization
- Building the logout flow with session cleanup and client notifications
- Implementing a federation gateway with Home Realm Discovery (HRD)
- Handling and displaying error pages for protocol errors
- Using `IIdentityServerInteractionService` to interact with the protocol engine
- Redirecting users back to clients after login/logout

Docs: https://docs.duendesoftware.com/identityserver/ui

## Architecture Overview

IdentityServer separates the protocol engine from the user interface. The engine handles OAuth/OIDC endpoints and redirects to your UI pages as needed. Your UI code handles all user interaction and then communicates results back to the engine.

```
Browser -> IdentityServer Middleware -> UI Pages (Login, Consent, Logout, Error)
                                          <->
                                   IIdentityServerInteractionService
                                          <->
                                   IdentityServer Protocol Engine
```

### Required Pages

| Page    | Purpose                               | Default URL                               |
| ------- | ------------------------------------- | ----------------------------------------- |
| Login   | Establish authentication session      | Inferred from cookie handler `LoginPath`  |
| Logout  | Terminate session, notify clients     | Set via `opt.UserInteraction.LogoutUrl`   |
| Consent | Grant/deny client access to resources | `/consent`                                |
| Error   | Display protocol error information    | `/home/error`                             |

## Login Page

### Configuring the Login URL

```csharp
// Program.cs -- explicit configuration
builder.Services.AddIdentityServer(opt => {
    opt.UserInteraction.LoginUrl = "/path/to/login";
});
```

If not set, IdentityServer infers the URL from the cookie handler's `LoginPath`:

```csharp
// Program.cs -- with ASP.NET Identity
builder.Services.AddIdentityServer()
    .AddAspNetIdentity<ApplicationUser>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/path/to/login/for/aspnet_identity";
});
```

### Authorization Context

When IdentityServer redirects to the login page, it passes a `returnUrl` query parameter. Use `IIdentityServerInteractionService.GetAuthorizationContextAsync` to extract the original authorization request parameters:

```csharp
public class LoginModel : PageModel
{
    private readonly IIdentityServerInteractionService _interaction;

    public LoginModel(IIdentityServerInteractionService interaction)
    {
        _interaction = interaction;
    }

    public async Task<IActionResult> OnGet(string returnUrl)
    {
        var context = await _interaction.GetAuthorizationContextAsync(returnUrl);

        // context contains:
        // - Client (the requesting client)
        // - IdP (requested identity provider hint)
        // - AcrValues (requested authentication context)
        // - Tenant (requested tenant)
        // - LoginHint (suggested username)
        // - Parameters (raw protocol parameters)

        // Use context for branding, HRD, MFA decisions, etc.
    }
}
```

Important: Do not parse the `returnUrl` yourself. Always use the interaction service.

### Establishing the Authentication Session

After validating credentials, create the authentication session:

```csharp
var user = new IdentityServerUser("unique_id_for_your_user")
{
    DisplayName = "Bob Smith"
};

await HttpContext.SignInAsync(user);

// Redirect back to the authorization endpoint
return Redirect(returnUrl);
```

Or with explicit claims:

```csharp
var claims = new Claim[] {
    new Claim("sub", "unique_id_for_your_user"),
    new Claim("name", "Bob Smith"),
    new Claim("amr", "pwd"),
    new Claim("idp", "local")
};
var identity = new ClaimsIdentity(claims, "pwd");
var principal = new ClaimsPrincipal(identity);

await HttpContext.SignInAsync(principal);
```

### Well-Known Session Claims

| Claim       | Purpose                                                                   | Default                    |
| ----------- | ------------------------------------------------------------------------- | -------------------------- |
| `sub`       | Required. Unique user identifier. Must never change or be reassigned. | None -- you must provide it |
| `name`      | Display name of the user                                                  | None                       |
| `amr`       | Authentication method reference                                           | `pwd`                      |
| `auth_time` | Time user entered credentials (epoch)                                     | Current time               |
| `idp`       | Identity provider scheme name                                             | `local`                    |
| `tenant`    | Tenant identifier                                                         | None                       |

### Protecting Against Open Redirects

Always validate the `returnUrl` before redirecting:

```csharp
// Option 1: Use ASP.NET Core helper
if (Url.IsLocalUrl(returnUrl))
{
    return Redirect(returnUrl);
}

// Option 2: Use IdentityServer interaction service
if (await _interaction.IsValidReturnUrl(returnUrl))
{
    return Redirect(returnUrl);
}
```

### Completing Login with CompleteLoginAsync

After establishing the authentication session, redirect the user back to the `returnUrl`. This causes the browser to re-issue the original authorize request, allowing IdentityServer to complete the protocol workflow.

## External Login (Federation)

### Registering External Providers

```csharp
// Program.cs
builder.Services.AddIdentityServer();

builder.Services.AddAuthentication()
    .AddOpenIdConnect("AAD", "Employee Login", options =>
    {
        options.SignInScheme = IdentityServerConstants.ExternalCookieAuthenticationScheme;
        // configure authority, client ID, etc.
    });
```

### Triggering External Authentication

```csharp
var callbackUrl = Url.Action("MyCallback");

var props = new AuthenticationProperties
{
    RedirectUri = callbackUrl,
    Items =
    {
        { "scheme", "AAD" },
        { "returnUrl", returnUrl }
    }
};

return Challenge("AAD", props);
```

### Handling the Callback

```csharp
// 1. Read external identity from temporary cookie
var result = await HttpContext.AuthenticateAsync(
    IdentityServerConstants.ExternalCookieAuthenticationScheme);

if (result?.Succeeded != true)
    throw new Exception("External authentication error");

var externalUser = result.Principal;
var userId = externalUser.FindFirst("sub").Value;
var scheme = result.Properties.Items["scheme"];
var returnUrl = result.Properties.Items["returnUrl"] ?? "~/";

// 2. Find or provision local user
var user = FindUserFromExternalProvider(scheme, userId);

// 3. Establish session
await HttpContext.SignInAsync(new IdentityServerUser(user.SubjectId)
{
    DisplayName = user.DisplayName,
    IdentityProvider = scheme
});

// 4. Clean up external cookie
await HttpContext.SignOutAsync(IdentityServerConstants.ExternalCookieAuthenticationScheme);

// 5. Return to protocol processing
return Redirect(returnUrl);
```

### SignInScheme and SignOutScheme

| Scenario                 | SignInScheme                                                 | SignOutScheme                           |
| ------------------------ | ------------------------------------------------------------ | --------------------------------------- |
| Without ASP.NET Identity | `IdentityServerConstants.ExternalCookieAuthenticationScheme` | `IdentityServerConstants.SignoutScheme` |
| With ASP.NET Identity    | `IdentityServerConstants.ExternalCookieAuthenticationScheme` | `IdentityConstants.ApplicationScheme`   |

### State and URL Length

If external provider state makes the URL too long (>2000 chars), use the IdentityServer-provided `IDistributedCache`-backed data format:

```csharp
// Program.cs -- all OIDC handlers use server-side state
builder.Services.AddOidcStateDataFormatterCache();

// Or specific schemes only
builder.Services.AddOidcStateDataFormatterCache("aad", "demoidsrv");
```

## Logout Page

### Configuring the Logout URL

```csharp
// Program.cs
builder.Services.AddIdentityServer(opt => {
    opt.UserInteraction.LogoutUrl = "/path/to/logout";
});
```

### Logout Steps

1. End the IdentityServer session -- remove the authentication cookie
2. Sign out of external provider -- if an external login was used
3. Notify client applications -- via front-channel, back-channel, or JS-based notifications
4. Redirect back to client -- if the logout is client-initiated

### Client Notification Mechanisms

| Mechanism     | How It Works                                                         | Client Setting                       |
| ------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Front-channel | Render `<iframe>` on logged-out page pointing to client's logout URI | `FrontChannelLogoutUri`              |
| Back-channel  | Server-to-server HTTP call with a logout JWT (`typ: logout+jwt`)     | `BackChannelLogoutUri`               |
| JS-based      | Client monitors `check_session_iframe`                               | Built into spec-compliant JS clients |

Recommendation: Use back-channel notifications for cross-site architectures. Front-channel and JS-based notifications rely on cookies in iframes, which may not work reliably across different sites.

### Getting Logout Context

```csharp
var context = await _interaction.GetLogoutContextAsync(logoutId);

// context.SignOutIFrameUrl -- render in <iframe> for front-channel logout
// context.PostLogoutRedirectUri -- where to send the user after logout
```

### Back-Channel Logout

Back-channel logout happens automatically when you call `HttpContext.SignOutAsync()` -- IdentityServer uses `IBackChannelLogoutService` to notify all clients that have `BackChannelLogoutUri` configured.

For .NET clients: use the BFF framework which has built-in back-channel logout support, or see the IdentityServer samples.

## Consent Page

### When Consent Is Required

Consent is controlled per client via `RequireConsent` (default: `false`). When enabled, IdentityServer redirects to the consent page before completing authorization.

The `offline_access` scope always triggers consent when the client has consent enabled.

### Consent Page Flow

```csharp
// 1. Get authorization context
var context = await _interaction.GetAuthorizationContextAsync(returnUrl);

// 2. Show user: client info, requested scopes/resources
// context.Client -- the requesting client
// Use IClientStore and IResourceStore for additional details

// 3. User grants or denies consent
await _interaction.GrantConsentAsync(context, new ConsentResponse
{
    ScopesValuesConsented = new[] { "openid", "profile", "api1" },
    RememberConsent = true  // persist for future requests
});

// 4. Redirect back
return Redirect(returnUrl);
```

### Denying Consent

```csharp
await _interaction.DenyAuthorizationAsync(context, AuthorizationError.AccessDenied);
```

### Validating returnUrl

```csharp
// Use interaction service
if (await _interaction.IsValidReturnUrl(returnUrl))
{
    return Redirect(returnUrl);
}
// Or check if GetAuthorizationContextAsync returns non-null
```

## Error Page

### Configuration

```csharp
// Program.cs
builder.Services.AddIdentityServer(opt => {
    opt.UserInteraction.ErrorUrl = "/path/to/error";
    opt.UserInteraction.ErrorId = "ErrorQueryStringParamName"; // default: "errorId"
});
```

### Retrieving Error Details

```csharp
var errorContext = await _interaction.GetErrorContextAsync(errorId);

// errorContext contains:
// - Error (error code)
// - ErrorDescription
// - RequestId
// - ClientId
// - DisplayMode
// - UiLocales
```

Errors are commonly due to misconfiguration. The error page should inform the user something went wrong without exposing sensitive details.

## Federation Gateway and Home Realm Discovery

### What Is a Federation Gateway?

A federation gateway architecture shields clients from authentication complexity. Clients trust only IdentityServer; the gateway coordinates with external providers, handling protocol bridging (OIDC, SAML, WS-Fed), claim transformation, and trust management.

### Home Realm Discovery (HRD) Strategies

| Strategy                       | Description                                        | Best For                               |
| ------------------------------ | -------------------------------------------------- | -------------------------------------- |
| Show all providers             | Present a list of available authentication methods | Simple setups with few providers       |
| Email/identifier-based         | Ask for email, infer provider from domain          | SaaS with corporate federation         |
| Client hint via `acr_values`   | Client passes `idp:provider_name`                  | Known provider per client/URL          |
| `IdentityProviderRestrictions` | Restrict available providers per client            | Multi-tenant with per-client providers |

### Restricting Providers Per Client

```csharp
var client = new Client
{
    ClientId = "tenant_a_app",
    IdentityProviderRestrictions = { "AAD", "local" }
    // Only Azure AD and local login are available
};
```

### HRD via acr_values

Clients can hint at the desired provider:

```
GET /connect/authorize?
    client_id=app&
    acr_values=idp:AAD&
    ...
```

Your login page checks `context.IdP` from `GetAuthorizationContextAsync` and can skip the login UI entirely, redirecting straight to the external provider.

## Common Anti-Patterns

- WRONG Parsing `returnUrl` manually to extract authorization parameters
- OK Use `IIdentityServerInteractionService.GetAuthorizationContextAsync(returnUrl)`

- WRONG Redirecting to `returnUrl` without validation, enabling open redirect attacks
- OK Validate with `Url.IsLocalUrl()` or `_interaction.IsValidReturnUrl()`

- WRONG Forgetting to delete the external authentication cookie after callback processing
- OK Always call `HttpContext.SignOutAsync(IdentityServerConstants.ExternalCookieAuthenticationScheme)`

- WRONG Using front-channel logout across different sites/domains (cookie/iframe issues)
- OK Use back-channel logout for cross-site architectures

- WRONG Issuing the authentication session without a `sub` claim
- OK The `sub` claim is required -- it uniquely identifies the user and must never change

- WRONG Hardcoding external provider list without checking both static schemes and dynamic providers
- OK Query `IAuthenticationSchemeProvider` for static schemes and `IIdentityProviderStore` for dynamic providers

## Common Pitfalls

1. Login page does not preserve `returnUrl`: The `returnUrl` must survive across all page transitions (post-backs, external redirects, MFA steps). Store it in hidden form fields, route data, or the `AuthenticationProperties.Items` dictionary.

2. Cookie handler `LoginPath` mismatch: If no explicit `LoginUrl` is configured, IdentityServer infers it from the cookie handler's `LoginPath`. Make sure the cookie handler `LoginPath` matches your actual login page route. The `LogoutUrl` is not inferred from the cookie handler -- it must always be set explicitly via `opt.UserInteraction.LogoutUrl`.

3. SignOutScheme differs with ASP.NET Identity: When using ASP.NET Identity, the `SignOutScheme` for external providers should be `IdentityConstants.ApplicationScheme`, not `IdentityServerConstants.SignoutScheme`.

4. Consent persistence is temporary by default: The consent result between the consent page and authorization endpoint is stored in a cookie. For custom persistence, implement `IConsentMessageStore`.

5. Error messages are deliberately brief: For security, error messages returned to clients are minimal. Check the IdentityServer logs (at `Debug` level) for full error details.

6. External provider `sub` is provider-specific: The `sub` claim from an external provider is that provider's unique ID. Map it to your local user database -- do not use it directly as the IdentityServer `sub`.
