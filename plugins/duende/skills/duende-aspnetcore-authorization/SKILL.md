---
name: duende-aspnetcore-authorization
description: ASP.NET Core authorization patterns including policy-based authorization, IAuthorizationHandler implementations, scope-based authorization for APIs, authorization middleware configuration, and minimal API authorization.
---

## Cline Guardrails

- First identify the target Duende product, Duende package version, ASP.NET Core version, and .NET target framework from the workspace or ask the user. Do not assume version-specific APIs, licensing, or edition limits without that context.
- Do not print, persist, or invent tokens, authorization codes, refresh tokens, client secrets, signing keys, cookies, license keys, certificates, or production credentials. Use placeholders and point to secret managers or environment variables.
- Ask for explicit confirmation before changing production identity configuration, client registrations, redirect URIs, scopes, signing keys, cookie settings, database migrations, deployment settings, or other security-sensitive behavior.


# ASP.NET Core Authorization

## When to Use This Skill

Use this skill when:
- Implementing policy-based authorization in ASP.NET Core
- Protecting API endpoints with scope-based or claim-based checks
- Writing custom `IAuthorizationHandler` implementations
- Configuring authorization for Minimal APIs, controllers, or Razor Pages
- Enforcing role-based access control using OIDC claims
- Combining multiple authorization requirements into composite policies

## Core Principles

1. Policy-Based Over Role-Based -- Use authorization policies instead of `[Authorize(Roles = "...")]`. Policies are composable, testable, and decoupled from claim types.
2. Scope != Permission -- OAuth scopes represent what the *client* is allowed to do. User claims represent what the *user* is allowed to do. Combine both for proper API authorization.
3. Authorization is Separate from Authentication -- Authentication (see `duende-aspnetcore-authentication`) establishes identity. Authorization decides access based on that identity.
4. Fail Closed -- Default to denying access. Require explicit authorization on all endpoints.
5. Resource-Based When Needed -- For decisions that depend on the resource being accessed (e.g., "can this user edit this document?"), use `IAuthorizationService` with resource-based authorization.

## Related Skills

- `duende-aspnetcore-authentication` -- Authentication middleware that provides the identity
- `duende-claims-authorization` -- Advanced claims transformation and authorization patterns
- `duende-identityserver-configuration` -- Server-side scope and resource configuration
- `duende-oauth-oidc-protocols` -- Understanding scopes, claims, and token contents

Docs: https://docs.duendesoftware.com/identityserver/tokens/authorization

---

## Pattern 1: Basic Policy-Based Authorization

Define policies at startup and reference them on endpoints:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthorization(options =>
{
    // Policy that requires the user to be authenticated
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    // Policy requiring a specific scope in the access token
    options.AddPolicy("read:catalog", policy =>
        policy.RequireClaim("scope", "catalog.read"));

    // Policy requiring a specific role
    options.AddPolicy("admin", policy =>
        policy.RequireRole("admin"));

    // Policy combining multiple requirements
    options.AddPolicy("catalog-editor", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("scope", "catalog.write");
        policy.RequireClaim("department", "merchandising");
    });
});
```

### Applying Policies

```csharp
// Minimal API
app.MapGet("/products", () => Results.Ok())
    .RequireAuthorization("read:catalog");

// Controller
[Authorize(Policy = "catalog-editor")]
public class CatalogController : ControllerBase { }

// Razor Page
[Authorize(Policy = "admin")]
public class AdminModel : PageModel { }
```

---

## Pattern 2: Scope-Based Authorization for APIs

APIs protected by IdentityServer need to validate scopes from the access token. Scopes represent what the *client application* is permitted to do.

### Simple Scope Check

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("api.read", policy =>
        policy.RequireClaim("scope", "catalog.read"));

    options.AddPolicy("api.write", policy =>
        policy.RequireClaim("scope", "catalog.write"));
});

app.MapGet("/products", GetProducts).RequireAuthorization("api.read");
app.MapPost("/products", CreateProduct).RequireAuthorization("api.write");
```

### Scope as Space-Delimited String

When `EmitScopesAsSpaceDelimitedStringInJwt = true` on IdentityServer, scopes arrive as a single space-delimited string rather than an array. Use a custom handler:

```csharp
public class ScopeRequirement : IAuthorizationRequirement
{
    public string Scope { get; }
    public ScopeRequirement(string scope) => Scope = scope;
}

public class ScopeHandler : AuthorizationHandler<ScopeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ScopeRequirement requirement)
    {
        var scopeClaim = context.User.FindFirst("scope");
        if (scopeClaim is null)
        {
            return Task.CompletedTask; // Not handled = denied
        }

        // Handle both array claims and space-delimited string
        var scopes = scopeClaim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (scopes.Contains(requirement.Scope))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

// Registration
builder.Services.AddSingleton<IAuthorizationHandler, ScopeHandler>();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("catalog.read", policy =>
        policy.Requirements.Add(new ScopeRequirement("catalog.read")));
});
```

---

## Pattern 3: Custom Authorization Handlers

For complex authorization logic, implement `IAuthorizationHandler`:

```csharp
// Requirement -- what needs to be satisfied
public class MinimumTenureRequirement : IAuthorizationRequirement
{
    public int MinimumYears { get; }
    public MinimumTenureRequirement(int years) => MinimumYears = years;
}

// Handler -- how to evaluate the requirement
public class MinimumTenureHandler : AuthorizationHandler<MinimumTenureRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        MinimumTenureRequirement requirement)
    {
        var hireDateClaim = context.User.FindFirst("hire_date");
        if (hireDateClaim is null)
        {
            return Task.CompletedTask;
        }

        if (DateTimeOffset.TryParse(hireDateClaim.Value, out var hireDate))
        {
            var tenure = DateTimeOffset.UtcNow - hireDate;
            if (tenure.TotalDays >= requirement.MinimumYears * 365.25)
            {
                context.Succeed(requirement);
            }
        }

        return Task.CompletedTask;
    }
}

// Registration
builder.Services.AddSingleton<IAuthorizationHandler, MinimumTenureHandler>();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("senior-staff", policy =>
        policy.Requirements.Add(new MinimumTenureRequirement(5)));
});
```

### Multiple Handlers for One Requirement

When any handler succeeding should grant access (OR logic):

```csharp
// Both handlers evaluate the same requirement
// If EITHER succeeds, the requirement is satisfied
public class AdminByRoleHandler : AuthorizationHandler<AdminRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, AdminRequirement requirement)
    {
        if (context.User.IsInRole("admin"))
            context.Succeed(requirement);
        return Task.CompletedTask;
    }
}

public class AdminByDepartmentHandler : AuthorizationHandler<AdminRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, AdminRequirement requirement)
    {
        if (context.User.HasClaim("department", "it-operations"))
            context.Succeed(requirement);
        return Task.CompletedTask;
    }
}
```

> Key concept: Multiple requirements in a policy use AND logic (all must be satisfied). Multiple handlers for the same requirement use OR logic (any can satisfy it).

---

## Pattern 4: Resource-Based Authorization

When authorization depends on the resource being accessed, use `IAuthorizationService`:

```csharp
public class DocumentAuthorizationHandler
    : AuthorizationHandler<OperationAuthorizationRequirement, Document>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        OperationAuthorizationRequirement requirement,
        Document resource)
    {
        var userId = context.User.FindFirst("sub")?.Value;

        if (requirement == Operations.Read)
        {
            // Anyone in the same department can read
            if (context.User.HasClaim("department", resource.Department))
                context.Succeed(requirement);
        }
        else if (requirement == Operations.Edit)
        {
            // Only the owner can edit
            if (resource.OwnerId == userId)
                context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

public static class Operations
{
    public static readonly OperationAuthorizationRequirement Read = new() { Name = nameof(Read) };
    public static readonly OperationAuthorizationRequirement Edit = new() { Name = nameof(Edit) };
}
```

### Using in a Controller

```csharp
public class DocumentsController : ControllerBase
{
    private readonly IAuthorizationService _authz;
    private readonly IDocumentRepository _docs;

    public DocumentsController(IAuthorizationService authz, IDocumentRepository docs)
    {
        _authz = authz;
        _docs = docs;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var document = await _docs.GetAsync(id);
        if (document is null) return NotFound();

        var result = await _authz.AuthorizeAsync(
            User,
            document,
            Operations.Read);

        if (!result.Succeeded) return Forbid();

        return Ok(document);
    }
}
```

---

## Pattern 5: Minimal API Authorization

Minimal APIs use the same authorization system with a fluent API:

```csharp
// Require authentication on all endpoints by default
app.MapGet("/public", () => "Anyone can see this")
    .AllowAnonymous();

app.MapGet("/products", GetProducts)
    .RequireAuthorization("read:catalog");

app.MapPost("/products", CreateProduct)
    .RequireAuthorization("catalog-editor");

// Inline policy
app.MapDelete("/products/{id}", DeleteProduct)
    .RequireAuthorization(policy =>
        policy.RequireClaim("scope", "catalog.write")
              .RequireRole("admin"));

// Group-level authorization
var adminGroup = app.MapGroup("/admin")
    .RequireAuthorization("admin");

adminGroup.MapGet("/users", GetUsers);
adminGroup.MapPost("/users", CreateUser);
```

---

## Pattern 6: Combining Client Scope + User Claims

In APIs protected by IdentityServer, proper authorization often requires checking *both* the client's scope and the user's claims:

```csharp
public class ApiWriteRequirement : IAuthorizationRequirement { }

public class ApiWriteHandler : AuthorizationHandler<ApiWriteRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ApiWriteRequirement requirement)
    {
        // Check 1: Client must have the write scope
        var hasScope = context.User.HasClaim(c =>
            c.Type == "scope" && c.Value.Split(' ').Contains("catalog.write"));

        // Check 2: User must be in the editor role
        var isEditor = context.User.IsInRole("editor");

        if (hasScope && isEditor)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
```

> Why both? A malicious client could request broad scopes, but the user may not have permission. A privileged user operating through a restricted client should be limited by that client's scopes.

---

## Pattern 7: Fallback and Default Policies

```csharp
builder.Services.AddAuthorization(options =>
{
    // DefaultPolicy: applied when [Authorize] has no policy name
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    // FallbackPolicy: applied to endpoints with NO [Authorize] attribute
    // Setting this makes all endpoints require authentication by default
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});
```

| Policy | Applied When | Use Case |
|--------|-------------|----------|
| `DefaultPolicy` | `[Authorize]` with no policy name | Basic "must be logged in" check |
| `FallbackPolicy` | Endpoints with no `[Authorize]` attribute | Secure-by-default for APIs |

> Tip: Set `FallbackPolicy` to require authentication, then use `[AllowAnonymous]` only on endpoints that genuinely need it (health checks, public assets).

---

## Common Pitfalls

### 1. Using Role Strings Instead of Policies

```csharp
// WRONG WRONG -- Hardcoded role strings scattered across controllers
[Authorize(Roles = "admin,superadmin,it-ops")]
public IActionResult Dashboard() { }

// OK CORRECT -- Centralized policy
options.AddPolicy("dashboard-access", policy =>
    policy.RequireRole("admin", "superadmin", "it-ops"));

[Authorize(Policy = "dashboard-access")]
public IActionResult Dashboard() { }
```

### 2. Not Registering Authorization Handlers

```csharp
// WRONG WRONG -- Handler exists but never registered
// Policy silently denies because no handler evaluates the requirement

// OK CORRECT -- Register the handler in DI
builder.Services.AddSingleton<IAuthorizationHandler, ScopeHandler>();
```

### 3. Calling context.Fail() in Handlers

`context.Fail()` actively denies authorization regardless of what other handlers say -- it's a hard veto. Not calling `context.Succeed()` simply means "I have no opinion"; other handlers can still satisfy the requirement.

```csharp
// WRONG WRONG -- Fail() is a hard veto: it denies even if another handler would succeed
protected override Task HandleRequirementAsync(...)
{
    if (!context.User.HasClaim("scope", "api.read"))
        context.Fail(); // Forces denial -- blocks all other handlers permanently!
    return Task.CompletedTask;
}

// OK CORRECT -- Simply don't call Succeed(); let other handlers try
protected override Task HandleRequirementAsync(...)
{
    if (context.User.HasClaim("scope", "api.read"))
        context.Succeed(requirement);
    // Not calling Succeed() means "I don't know" -- other handlers may still succeed
    return Task.CompletedTask;
}
```

> Only call `context.Fail()` when you need to guarantee denial even if other handlers would approve (e.g., a security blocklist check). In most cases, simply omit the `Succeed()` call.

### 4. Ignoring Client vs User Authorization

```csharp
// WRONG WRONG -- Only checking user role, ignoring client scope
options.AddPolicy("write", p => p.RequireRole("editor"));
// A client without the write scope could still pass this check

// OK CORRECT -- Check both scope and user claims
options.AddPolicy("write", p =>
{
    p.RequireClaim("scope", "catalog.write"); // Client permission
    p.RequireRole("editor");                   // User permission
});
```

---

## Resources

- [Authorization in ASP.NET Core -- Microsoft Docs](https://learn.microsoft.com/aspnet/core/security/authorization/introduction)
- [Policy-Based Authorization -- Microsoft Docs](https://learn.microsoft.com/aspnet/core/security/authorization/policies)
- [Resource-Based Authorization -- Microsoft Docs](https://learn.microsoft.com/aspnet/core/security/authorization/resourcebased)
- [Protecting APIs -- Duende Docs](https://docs.duendesoftware.com/identityserver/latest/apis/)
- [API Authorization -- Duende Docs](https://docs.duendesoftware.com/identityserver/latest/apis/aspnetcore/authorization/)
