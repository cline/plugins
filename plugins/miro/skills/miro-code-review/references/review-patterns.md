# Code Review Patterns

Common patterns and anti-patterns to look for during code review.

## Security Anti-Patterns

### Injection Vulnerabilities

```javascript
// Avoid: SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

// OK: Parameterized Query
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

```javascript
// Avoid: Command Injection
exec(`ls ${userInput}`);

// OK: Safe Alternative
execFile('ls', [sanitizedPath]);
```

### Authentication Issues

```javascript
// Avoid: Weak comparison
if (password == storedPassword) { ... }

// OK: Timing-safe comparison
if (crypto.timingSafeEqual(Buffer.from(password), Buffer.from(storedPassword))) { ... }
```

```javascript
// Avoid: Hardcoded credentials
const apiKey = 'sk_live_abc123';

// OK: Environment variable
const apiKey = process.env.API_KEY;
```

### Data Exposure

```javascript
// Avoid: Sensitive data in logs
console.log('User login:', { email, password, token });

// OK: Redacted logging
console.log('User login:', { email, password: '[REDACTED]' });
```

## Architecture Anti-Patterns

### Tight Coupling

```javascript
// Avoid: Direct database access in controller
class UserController {
  async getUser(id) {
    return await db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// OK: Repository pattern
class UserController {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  async getUser(id) {
    return await this.userRepository.findById(id);
  }
}
```

### God Objects

Watch for classes/modules with:
- 500+ lines of code
- 10+ dependencies
- Mixed responsibilities
- Generic names like "Utils", "Manager", "Handler"

### Circular Dependencies

```
// Avoid: Circular dependency
// a.js imports b.js
// b.js imports a.js

// OK: Extract shared code
// shared.js contains common code
// a.js imports shared.js
// b.js imports shared.js
```

## Performance Patterns

### N+1 Queries

```javascript
// Avoid: N+1 query
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
}

// OK: Eager loading
const users = await User.findAll({
  include: [{ model: Post }]
});
```

### Memory Leaks

```javascript
// Avoid: Growing array without cleanup
const cache = [];
function addToCache(item) {
  cache.push(item);
}

// OK: Bounded cache
const cache = new Map();
const MAX_SIZE = 1000;
function addToCache(key, item) {
  if (cache.size >= MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, item);
}
```

## Error Handling Patterns

### Swallowed Exceptions

```javascript
// Avoid: Silent failure
try {
  await riskyOperation();
} catch (e) {
  // nothing
}

// OK: Proper handling
try {
  await riskyOperation();
} catch (e) {
  logger.error('Operation failed', { error: e.message });
  throw new OperationError('Failed to complete operation', { cause: e });
}
```

### Information Disclosure

```javascript
// Avoid: Stack trace to client
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack });
});

// OK: Safe error response
app.use((err, req, res, next) => {
  logger.error('Request failed', { error: err });
  res.status(500).json({ error: 'Internal server error' });
});
```

## Testing Patterns

### Test Coverage Gaps

Look for:
- Untested error paths
- Missing edge cases
- No integration tests for APIs
- Mocked dependencies that hide bugs

### Brittle Tests

```javascript
// Avoid: Brittle - depends on timing
expect(result).toEqual({ createdAt: new Date() });

// OK: Flexible
expect(result.createdAt).toBeInstanceOf(Date);
```

## Code Quality Indicators

### Positive Signs
- Clear function/variable names
- Single responsibility
- Comprehensive error handling
- Meaningful test coverage
- Documentation for complex logic

### Warning Signs
- Magic numbers/strings
- Deep nesting (3+ levels)
- Long functions (50+ lines)
- Boolean parameters
- Comments explaining "what" not "why"
- TODO/FIXME without tracking

## Review Questions

For each change, consider:

1. What could go wrong? - Edge cases, failures, attacks
2. What's the blast radius? - Impact if it fails
3. Is this testable? - Can we verify it works?
4. Is this maintainable? - Can others understand it?
5. Does this follow conventions? - Consistency with codebase
