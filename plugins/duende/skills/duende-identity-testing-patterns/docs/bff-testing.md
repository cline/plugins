# BFF Endpoint Testing

## Pattern 7: Testing BFF Endpoints

BFF tests require cookie-based session simulation. The `WebApplicationFactory` needs to track cookies between requests to simulate a logged-in user.

```csharp
public sealed class BffFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            // Replace OIDC with a short-circuit test handler
            // that immediately signs in a test user on /bff/login
            services.Configure<OpenIdConnectOptions>("oidc", options =>
            {
                options.Events.OnRedirectToIdentityProvider = ctx =>
                {
                    // In tests, bypass the external redirect and sign in directly
                    ctx.HandleResponse();
                    return Task.CompletedTask;
                };
            });
        });
    }
}
```

### Cookie Jar for Session Tests

```csharp
public class BffUserEndpointTests : IClassFixture<BffFactory>
{
    private readonly HttpClient _client;

    public BffUserEndpointTests(BffFactory factory)
    {
        // OK Use a CookieContainer so session cookies are stored and sent automatically
        var cookieContainer = new CookieContainer();
        var handler = new HttpClientHandler
        {
            CookieContainer = cookieContainer,
            AllowAutoRedirect = false
        };
        _client = factory.CreateDefaultClient(handler);
    }

    [Fact]
    public async Task UserEndpoint_WithoutSession_ShouldReturn401()
    {
        // Act -- no prior login
        var response = await _client.GetAsync("/bff/user");

        // Assert -- BFF user endpoint returns 401, not a redirect
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ApiEndpoint_RequiresAntiForgeryHeader()
    {
        // OK BFF endpoints require x-csrf: 1 header
        _client.DefaultRequestHeaders.Add("x-csrf", "1");

        var response = await _client.GetAsync("/api/data");

        // Without a session this is 401, but the header check passes
        Assert.NotEqual(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ApiEndpoint_WithoutAntiForgeryHeader_ShouldReturn400()
    {
        // WRONG Missing x-csrf: 1
        var response = await _client.GetAsync("/api/data");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
```
