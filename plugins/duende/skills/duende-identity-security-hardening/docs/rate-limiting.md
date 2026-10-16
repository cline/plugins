# Rate Limiting for IdentityServer Endpoints

## Pattern 10: Rate Limiting

Protect the token endpoint from brute-force, credential stuffing, and enumeration attacks using ASP.NET Core's built-in rate limiting middleware.

```csharp
// OK Rate limiting for the token endpoint
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global sliding window limit for the token endpoint
    options.AddPolicy("token-endpoint", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            // Partition by client IP address
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                // 20 token requests per minute per IP
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0 // No queuing -- reject immediately when limit is reached
            }));

    // Stricter policy for authorization endpoint (interactive login)
    options.AddPolicy("authorize-endpoint", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

app.UseRateLimiter();
```

Apply the rate limiter policies to specific routes:

```csharp
// OK Apply rate limit policies to IdentityServer endpoints
app.MapGroup("/connect/token")
    .RequireRateLimiting("token-endpoint");

app.MapGroup("/connect/authorize")
    .RequireRateLimiting("authorize-endpoint");
```

> Tip: In cloud deployments behind a load balancer, the `RemoteIpAddress` is the proxy address. Use `X-Forwarded-For` (after configuring `ForwardedHeaders`) or a client identifier claim for more accurate partitioning.
