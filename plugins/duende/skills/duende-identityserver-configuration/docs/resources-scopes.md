# Resources and Scopes: Identity Resources, API Scopes, and API Resources

## Resource Types: The Three Pillars

IdentityServer manages access to resources through three distinct types. Understanding when to use each is fundamental.

### Decision Matrix: Which Resource Type to Use

| Need                                    | Resource Type         | Purpose                                                |
| --------------------------------------- | --------------------- | ------------------------------------------------------ |
| User identity claims (name, email)      | Identity Resource | Groups claims requested via `scope` parameter          |
| API access control                      | API Scope         | Defines what operations a client can perform           |
| API grouping, audience (`aud`), signing | API Resource      | Groups scopes under a logical API with shared settings |

## Identity Resources

An identity resource is a named group of claims about a user, requested using the `scope` parameter.

The `openid` scope is mandatory per the OpenID Connect spec and returns the `sub` (subject id) claim.

### Standard Identity Resources

```csharp
public static IEnumerable<IdentityResource> IdentityResources =>
    new List<IdentityResource>
    {
        new IdentityResources.OpenId(),   // required: returns sub claim
        new IdentityResources.Profile(),  // name, family_name, etc.
        new IdentityResources.Email(),    // email, email_verified
        new IdentityResources.Phone(),    // phone_number, phone_number_verified
        new IdentityResources.Address()   // address JSON
    };
```

### Custom Identity Resources

```csharp
public static IEnumerable<IdentityResource> IdentityResources =>
    new List<IdentityResource>
    {
        new IdentityResources.OpenId(),
        new IdentityResource(
            name: "profile",
            userClaims: new[] { "name", "email", "website" },
            displayName: "Your profile data")
    };
```

### Granting Access to Identity Resources

```csharp
var client = new Client
{
    ClientId = "client",
    AllowedScopes = { "openid", "profile" }
};
```

The client requests the resource via the scope parameter:

```
https://identity.example.com/connect/authorize?client_id=client&scope=openid profile
```

## API Scopes

API Scopes define the scope of access a client requests. They represent operations or permissions.

### Defining API Scopes

```csharp
public static IEnumerable<ApiScope> ApiScopes =>
    new List<ApiScope>
    {
        new ApiScope(name: "read",   displayName: "Read your data."),
        new ApiScope(name: "write",  displayName: "Write your data."),
        new ApiScope(name: "delete", displayName: "Delete your data.")
    };
```

### Scopes with User Claims

Add user claims to access tokens when a scope is granted:

```csharp
var writeScope = new ApiScope(
    name: "write",
    displayName: "Write your data.",
    userClaims: new[] { "user_level" });
```

### Scope Authorization in Tokens

When a scope is granted, it appears in the access token:

```json
{
  "typ": "at+jwt",
  "client_id": "mobile_app",
  "sub": "123",
  "scope": "read write delete"
}
```

### Important: Scopes Authorize Clients, Not Users

Scopes control what a client can do, not what a user is permitted to do. User-level authorization is application logic and not covered by OAuth.

```csharp
// WRONG WRONG mental model: "write" scope = user can write
// OK CORRECT mental model: "write" scope = client is allowed to invoke write operations
```

### Audience Behavior Without API Resources

When using only API Scopes (without API Resources), no `aud` claim is added to tokens. To get an audience claim, either:

- Use API Resources (recommended for multi-API systems)
- Enable `EmitStaticAudienceClaim` on the options (emits `{issuer}/resources`)

### Parameterized Scopes

For scopes with dynamic parameters (e.g., `transaction:123`):

```csharp
public class ParameterizedScopeParser : DefaultScopeParser
{
    public ParameterizedScopeParser(ILogger<DefaultScopeParser> logger) : base(logger)
    { }

    public override void ParseScopeValue(ParseScopeContext scopeContext)
    {
        const string transactionScopeName = "transaction";
        const string separator = ":";
        const string transactionScopePrefix = transactionScopeName + separator;

        var scopeValue = scopeContext.RawValue;

        if (scopeValue.StartsWith(transactionScopePrefix))
        {
            var parts = scopeValue.Split(separator, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 2)
            {
                scopeContext.SetParsedValues(transactionScopeName, parts[1]);
            }
            else
            {
                scopeContext.SetError("transaction scope missing transaction parameter value");
            }
        }
        else if (scopeValue != transactionScopeName)
        {
            base.ParseScopeValue(scopeContext);
        }
        else
        {
            scopeContext.SetIgnore();
        }
    }
}
```

## API Resources

API Resources group scopes under a logical API, providing:

- JWT `aud` (audience) claim based on the resource name
- Common user claims across all contained scopes
- Introspection support via API secrets
- Per-resource signing algorithm configuration

### Defining API Resources

```csharp
public static IEnumerable<ApiScope> ApiScopes =>
    new List<ApiScope>
    {
        new ApiScope(name: "invoice.read",   displayName: "Reads your invoices."),
        new ApiScope(name: "invoice.pay",    displayName: "Pays your invoices."),
        new ApiScope(name: "customer.read",  displayName: "Reads customer information."),
        new ApiScope(name: "customer.contact", displayName: "Allows contacting customers."),
        new ApiScope(name: "manage",         displayName: "Provides administrative access."),
        new ApiScope(name: "enumerate",      displayName: "Allows enumerating data.")
    };

public static IEnumerable<ApiResource> ApiResources =>
    new List<ApiResource>
    {
        new ApiResource("invoice", "Invoice API")
        {
            Scopes = { "invoice.read", "invoice.pay", "manage", "enumerate" }
        },
        new ApiResource("customer", "Customer API")
        {
            Scopes = { "customer.read", "customer.contact", "manage", "enumerate" }
        }
    };
```

### Token Audience Examples

Requesting `invoice.read` and `invoice.pay`:

```json
{
  "aud": "invoice",
  "scope": "invoice.read invoice.pay"
}
```

Requesting `invoice.read` and `customer.read`:

```json
{
  "aud": ["invoice", "customer"],
  "scope": "invoice.read customer.read"
}
```

Requesting `manage` (shared scope):

```json
{
  "aud": ["invoice", "customer"],
  "scope": "manage"
}
```

### API Resource User Claims

Add claims to access tokens regardless of which scope is requested:

```csharp
var customerResource = new ApiResource("customer", "Customer API")
{
    Scopes = { "customer.read", "customer.contact", "manage", "enumerate" },
    UserClaims = { "department_id", "sales_region" }
};
```

### Per-Resource Signing Algorithm

```csharp
var invoiceApi = new ApiResource("invoice", "Invoice API")
{
    Scopes = { "invoice.read", "invoice.pay", "manage", "enumerate" },
    AllowedAccessTokenSigningAlgorithms = { SecurityAlgorithms.RsaSsaPssSha256 }
};
```

### Resource Isolation (Enterprise Edition)

Use the `resource` parameter (RFC 8707) to request tokens scoped to a single API resource, preventing over-privileged tokens.

```csharp
var resources = new[]
{
    new ApiResource("urn:invoices")
    {
        Scopes = { "read", "write" },
        RequireResourceIndicator = true  // audience only included when explicitly requested
    }
};
```
