---
description: Detect SQL injection vulnerabilities in Forge apps using the Forge SQL API
globs:
alwaysApply: false
---

Context

- Forge SQL API provides `sql.executeRaw()` and `sql.prepare()` for database operations. SQL injection occurs when untrusted input is interpolated into query strings.
- Related CWE: CWE-89 (SQL Injection).
- Severity: Critical - can lead to data exfiltration, manipulation, and privilege escalation.
- Reference: Internal VULN Guide to SQL Injection in Forge Apps.

Scope & Signals

- Dangerous APIs:
  - `sql.executeRaw()` - Direct query execution (highest risk)
  - `sql.prepare()` without `bindParams()` - Prepared statement misuse
  - `migrationRunner.enqueue()` with dynamic content
- Sources: Resolver payloads, web trigger bodies, event data, user input from Custom UI.
- Sinks: Any SQL query construction using string interpolation/concatenation.

Vulnerable Patterns

```javascript
// CRITICAL - Direct interpolation in executeRaw
const userId = payload.userId;
sql.executeRaw(`SELECT * FROM users WHERE id = ${userId}`);

// CRITICAL - String concatenation
sql.executeRaw("SELECT * FROM users WHERE username = '" + username + "'");

// HIGH - Prepared statement without bindParams
sql.prepare(`SELECT * FROM users WHERE email = '${email}'`).execute();

// HIGH - Template literal in prepare (still vulnerable)
const query = `SELECT * FROM products WHERE category = '${category}'`;
sql.executeRaw(query);

// MEDIUM - Indirect flow through variable
const userQuery = `SELECT * FROM orders WHERE user_id = ${payload.userId}`;
// ... later ...
sql.executeRaw(userQuery);
```

Secure Patterns

```javascript
// SECURE - Parameterized query with bindParams
const query = sql.prepare(`SELECT * FROM users WHERE id = $1`);
query.bindParams({ $1: userId });
await query.execute();

// SECURE - Multiple parameters
const query = sql.prepare(
  `SELECT * FROM users WHERE username = $1 AND active = $2`
);
query.bindParams({ $1: username, $2: isActive });
await query.execute();

// SECURE - Named parameters (alternative style)
const query = sql.prepare(
  `SELECT * FROM users WHERE email = :email AND role = :role`
);
query.bindParams({ email: userEmail, role: userRole });
await query.execute();

// SECURE - Input validation + parameterization
if (!/^\d+$/.test(userId)) {
  throw new Error('Invalid user ID format');
}
const query = sql.prepare(`SELECT * FROM users WHERE id = $1`);
query.bindParams({ $1: parseInt(userId, 10) });
```

Detection Checklist

- [ ] Search for `sql.executeRaw` with template literals or string concatenation.
- [ ] Find `sql.prepare` calls without corresponding `bindParams()`.
- [ ] Trace variables used in SQL strings back to untrusted sources.
- [ ] Check `migrationRunner.enqueue` for dynamic schema/table names.
- [ ] Look for custom "sanitization" functions (often insufficient).

Severity Classification

| Severity | Pattern |
|----------|---------|
| Critical | Direct user input in `sql.executeRaw()` |
| High | `sql.prepare()` without `bindParams()` |
| Medium | Indirect flow with some transformations |
| Low | Input validated against strict allowlist |

Common Pitfalls

```javascript
// WRONG - Numeric values still need binding
sql.executeRaw(`SELECT * FROM products WHERE id = ${productId}`);

// WRONG - Custom escaping is insufficient
const safe = input.replace(/'/g, "''");
sql.executeRaw(`SELECT * FROM users WHERE name = '${safe}'`);

// WRONG - toString() doesn't sanitize
sql.executeRaw(`SELECT * FROM logs WHERE date = '${date.toString()}'`);
```

PoC / Test Leads

- Inject SQL metacharacters: `' OR '1'='1`, `'; DROP TABLE users; --`
- Test UNION-based injection: `' UNION SELECT * FROM sensitive_table --`
- Try time-based blind SQLi: `' AND SLEEP(5) --`
- Test in numeric fields: `1 OR 1=1`

Remediation Guidance (advisory)

- Always use `sql.prepare()` with `bindParams()` for all queries.
- Use positional (`$1`, `$2`) or named (`:param`) parameters.
- Validate input types before use (even with parameterization).
- For dynamic table/column names, use strict allowlists.
- Never use string concatenation or interpolation for SQL.

Semgrep Detection

```yaml
rules:
  - id: forge-sql-injection
    patterns:
      - pattern-either:
          - pattern: sql.executeRaw(`... ${$VAR} ...`)
          - pattern: sql.executeRaw("..." + $VAR + "...")
          - pattern: sql.prepare(`... ${$VAR} ...`).execute()
    message: "Potential SQL injection - use bindParams()"
    severity: ERROR
```

Reporting Guidance

- Cite file, function, and line where vulnerable SQL construction occurs.
- Show data flow from source (payload/input) to sink (SQL call).
- Provide PoC payload demonstrating injection.
- Map to CWE-89; include severity based on classification table.

