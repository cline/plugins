---
description: Detect hardcoded secrets, credentials, and API keys in Forge app source code
globs:
alwaysApply: false
---

Context

- Hardcoded credentials in source code enable unauthorized access if code is exposed. Forge apps should use `storage.setSecret()` or Forge environment variables for sensitive values.
- Related CWE: CWE-798 (Use of Hard-coded Credentials), CWE-259 (Use of Hard-coded Password).
- Reference: Internal Forge VULN Guide to Hardcoded Basic Auth.

Scope & Signals

- Secrets to detect:
  - Basic auth headers: `Basic [base64]`
  - Bearer tokens: `Bearer [token]`
  - API keys: `api_key`, `apiKey`, `api-key` with literal values
  - AWS credentials: `AKIA...`, secret access keys
  - Private keys: `-----BEGIN PRIVATE KEY-----`
  - OAuth secrets: `client_secret` with literal values
  - Database connection strings with passwords
- Locations: Source files, config files (excluding node_modules, test fixtures).

Detection Patterns

```bash
# Basic Auth detection (refined)
grep -rlE '"Basic [A-Za-z0-9+/]*={1,2}"' --exclude-dir={node_modules,webpack} .
grep -rlE "'Basic [A-Za-z0-9+/]*={1,2}'" --exclude-dir={node_modules,webpack} .

# Bearer tokens
grep -rE 'Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' .

# API keys (common patterns)
grep -rE '(api[_-]?key|apiKey)\s*[:=]\s*["\047][A-Za-z0-9]{20,}["\047]' .

# AWS access keys
grep -rE 'AKIA[0-9A-Z]{16}' .
```

Vulnerable Patterns

```javascript
// VULNERABLE - Hardcoded Basic auth
const headers = {
  'Authorization': 'Basic dXNlcm5hbWU6cGFzc3dvcmQ='
};

// VULNERABLE - Hardcoded API key
const API_KEY = 'sk-1234567890abcdef1234567890abcdef';
const response = await fetch(url, {
  headers: { 'X-API-Key': API_KEY }
});

// VULNERABLE - Hardcoded in config
const config = {
  database: {
    password: 'super_secret_password'
  }
};

// VULNERABLE - Hardcoded OAuth secret
const clientSecret = 'abc123-client-secret-xyz789';

// VULNERABLE - Hardcoded in environment-like object
const ENV = {
  STRIPE_SECRET_KEY: 'sk_live_abcdefghijklmnop'
};
```

Secure Patterns

```javascript
// SECURE - Use Forge storage for secrets
import { storage } from '@forge/api';

async function getApiKey() {
  return await storage.getSecret('external-api-key');
}

// SECURE - Use Forge environment variables
// Set via: forge variables set API_KEY "value" --encrypt
const apiKey = process.env.API_KEY;

// SECURE - Use External Auth for OAuth
import { auth } from '@forge/api';

async function getExternalToken() {
  const token = await auth.getExternalAuth('my-external-service');
  return token.accessToken;
}

// SECURE - Retrieve at runtime, never hardcode
async function initializeClient() {
  const credentials = await storage.getSecret('service-credentials');
  return new ServiceClient(JSON.parse(credentials));
}
```

Detection Checklist

- [ ] Search for Base64-encoded Basic auth headers.
- [ ] Look for Bearer token patterns (JWT format).
- [ ] Find API key variable assignments with literal strings.
- [ ] Check for AWS access key patterns (AKIA...).
- [ ] Search for private key file contents.
- [ ] Review config objects for password/secret fields with values.
- [ ] Exclude test fixtures and mock data from findings.

False Positive Handling

```javascript
// FALSE POSITIVE - Placeholder in example/documentation
const API_KEY = 'YOUR_API_KEY_HERE';
const token = 'example-token-replace-me';

// FALSE POSITIVE - Test fixture
const mockAuth = 'Basic dGVzdDp0ZXN0';  // test:test

// FALSE POSITIVE - Schema/type definition
interface Config {
  apiKey: string;  // Not a hardcoded value
}

// TRUE POSITIVE - Real credential
const auth = 'Basic cHJvZHVjdGlvbjpyZWFsX3NlY3JldA==';  // Decodes to real secret
```

Semgrep Rules

```yaml
rules:
  - id: hardcoded-basic-auth
    patterns:
      - pattern-regex: "Basic [A-Za-z0-9+/]{10,}={0,2}"
    message: "Potential hardcoded Basic auth credential"
    severity: ERROR

  - id: hardcoded-api-key
    patterns:
      - pattern: $VAR = "..."
      - metavariable-regex:
          metavariable: $VAR
          regex: (api[_-]?key|apiKey|API_KEY)
      - pattern-not: $VAR = "YOUR_API_KEY"
      - pattern-not: $VAR = ""
    message: "Potential hardcoded API key"
    severity: WARNING
```

PoC / Test Leads

- Decode Base64 Basic auth headers to verify they're real credentials.
- Check if hardcoded keys are valid by testing against external services.
- Verify the app works without the hardcoded secret (indicates it's used).

Remediation Guidance (advisory)

- Remove all hardcoded secrets from source code immediately.
- Rotate any exposed credentials.
- Use `storage.setSecret()` / `storage.getSecret()` for runtime secrets.
- Use Forge environment variables with `--encrypt` for deployment secrets.
- Use External Auth for OAuth integrations.
- Add secret scanning to CI/CD pipeline.

Reporting Guidance

- Provide file path and line number for each hardcoded secret.
- Indicate secret type (Basic auth, API key, etc.).
- Note if the secret appears to be real vs. placeholder.
- Assess exposure risk (public repo, marketplace app).
- Map to CWE-798; recommend immediate rotation.

