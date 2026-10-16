---
description: Detect prototype pollution vulnerabilities in Forge apps and RuntimeV2 escalation risks
globs:
alwaysApply: false
---

Context

- Prototype pollution in Forge RuntimeV2 can enable cross tenant data leakage and privilege escalation from asUser to asApp by injecting fetch headers.
- Related CWE: CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes).
- Forge-specific: Default libraries in RuntimeV2 allow attackers to exploit prototype pollution for privilege escalation.

Scope & Signals

- Sources: JSON parsing, object merging, query/body parsing, deserialization.
- Sinks: Object property assignment, deep merge utilities, spread operators with untrusted keys.
- Red flags:
  - `__proto__`, `prototype`, `constructor` in property paths from user input.
  - Deep merge without prototype guards (lodash < 4.17.12, jQuery.extend, etc.).
  - Object.assign with untrusted objects.

Forge-Specific Escalation Path

```javascript
// In RuntimeV2, prototype pollution can upgrade asUser() to asApp()
// by injecting headers into fetch calls

// If attacker can pollute Object.prototype:
Object.prototype.headers = {
  'x-forge-oauth': 'app'  // Hypothetical escalation header
};

// Subsequent asUser() calls may inherit polluted headers
const api = asUser();
await api.requestJira(route`/rest/api/3/issue/TEST-1`);
// Request now uses app-level permissions
```

Vulnerable Patterns

```javascript
// VULNERABLE - Merge user input without guards
const config = {};
Object.assign(config, JSON.parse(payload.settings));

// VULNERABLE - Deep merge with untrusted data
import merge from 'lodash.merge';
const merged = merge(defaults, userInput);

// VULNERABLE - Bracket notation with user key
const key = payload.key;
obj[key] = payload.value;  // key could be "__proto__"

// VULNERABLE - Recursive object assignment
function deepSet(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] = current[keys[i]] || {};
  }
  current[keys[keys.length - 1]] = value;
}
deepSet({}, payload.path, payload.value);  // path = "__proto__.polluted"
```

Secure Patterns

```javascript
// SECURE - Reject dangerous keys
function safeSet(obj, key, value) {
  if (['__proto__', 'prototype', 'constructor'].includes(key)) {
    throw new Error('Invalid key');
  }
  obj[key] = value;
}

// SECURE - Use Object.create(null) for prototype-less objects
const config = Object.create(null);
Object.assign(config, sanitizedInput);

// SECURE - Use Map instead of objects for dynamic keys
const userSettings = new Map();
userSettings.set(payload.key, payload.value);

// SECURE - Schema validation with allowlisted keys
import { z } from 'zod';
const SettingsSchema = z.object({
  theme: z.string(),
  language: z.string()
}).strict();  // Reject unknown keys

const settings = SettingsSchema.parse(payload.settings);

// SECURE - Updated lodash with prototype guards
import merge from 'lodash.merge';  // v4.17.21+
// Still recommend explicit key validation
```

Detection Checklist

- [ ] Search for `__proto__`, `prototype`, `constructor` in code.
- [ ] Find Object.assign, spread operators with untrusted sources.
- [ ] Check for deep merge utilities and their versions.
- [ ] Identify bracket notation property access with dynamic keys.
- [ ] Look for recursive object traversal/assignment functions.
- [ ] Check package.json for vulnerable lodash, hoek, jQuery versions.

PoC / Test Leads

```javascript
// Test payload for prototype pollution
const maliciousPayload = {
  "__proto__": {
    "polluted": true
  }
};

// Or via constructor
const payload2 = {
  "constructor": {
    "prototype": {
      "polluted": true
    }
  }
};

// Verify pollution
console.log({}.polluted);  // Should be undefined, true if polluted
```

Remediation Guidance (advisory)

- Reject `__proto__`, `prototype`, `constructor` keys at input validation.
- Use schema validators (zod, joi) with strict mode to allowlist keys.
- Create objects with `Object.create(null)` when prototype not needed.
- Use Map/Set for dynamic key storage.
- Update lodash to 4.17.21+ and other merge libraries.
- Freeze prototypes in sensitive contexts: `Object.freeze(Object.prototype)`.

Reporting Guidance

- Document the merge/assignment pattern and untrusted data source.
- Explain Forge-specific escalation risk (asUser to asApp) and cross tenant data access.
- Provide PoC payload demonstrating pollution.
- Map to CWE-1321; note affected library versions.

