---
description: Detect remote code execution and unsafe dynamic code evaluation in Forge apps
globs:
alwaysApply: false
---

Context

- Forge apps may execute user-provided code via `AsyncFunction`, `Function()`, `eval()`, or similar constructs. In RuntimeV2, this executes in a shared AWS Lambda context with tenant isolation risks.
- Related CWE: CWE-94 (Code Injection), CWE-95 (Eval Injection).
- Past issues: JMCF RCE Investigation - scripted fields executing user code in shared global scope.
- Severity: Critical - enables arbitrary code execution, data exfiltration, tenant data leakage.

Scope & Signals

- Dangerous APIs (same global scope - CRITICAL):
  - `eval(userScript)`
  - `new Function('param', userScript)`
  - `new AsyncFunction('param', userScript)` (AsyncFunction = `async function(){}.constructor`)
  - `setTimeout(userScript, delay)` with string argument
  - `setInterval(userScript, delay)` with string argument
- Somewhat isolated (controlled context):
  - `vm.runInNewContext(script, context)`
  - `vm.createContext()` + `vm.runInContext()`
- Process isolated (still risky):
  - `child_process.exec(command)`
  - `child_process.spawn(cmd, args)`

Vulnerable Patterns

```javascript
// CRITICAL - User script in same global scope
const AsyncFunction = async function () {}.constructor;

export async function runUserScript(userScript, issue) {
  // User code runs in same scope, can access/modify globals
  const f = new AsyncFunction('issue', 'api', userScript);
  return await f(issue, api);
}

// CRITICAL - Direct eval
resolver.define('evaluate', async ({ payload }) => {
  return eval(payload.expression);  // Arbitrary code execution
});

// CRITICAL - Function constructor
const calculate = new Function('x', 'y', payload.formula);
const result = calculate(10, 20);

// HIGH - setTimeout with string (rarely used but dangerous)
setTimeout(payload.callback, 1000);  // If callback is a string
```

Lambda Warm Start Vulnerabilities

In RuntimeV2, AWS Lambda reuses containers across invocations:

```javascript
// Module-level variables persist across Lambda invocations
let globalCache = {};  // Shared across tenants!

// Malicious user script can:
// 1. Pollute global scope
globalThis.__proto__.malicious = () => { /* exploit */ };

// 2. Modify module-level state
globalCache.otherTenantData = stolenData;

// 3. Override built-in functions
console.error = () => {};  // Suppress security logging

// 4. Access data from previous invocations
const previousData = globalCache.sensitiveData;
```

Secure Patterns

```javascript
// BETTER - VM isolation (still same process but isolated context)
const vm = require('vm');

function runUserScript(userScript, context) {
  const sandbox = vm.createContext({
    issue: context.issue,
    api: restrictedApi,
    console: safeConsole
  });
  
  return vm.runInContext(userScript, sandbox, {
    timeout: 5000,  // Prevent infinite loops
    displayErrors: false
  });
}

// BEST - Use Deno subprocesses for true isolation
// Deno provides V8 sandboxing with permission controls
// https://docs.deno.com/runtime/fundamentals/security/

// RECOMMENDED - Use QuickJS for embedded execution
// QuickJS provides true memory and process isolation
import QuickJS from 'quickjs';
const vm = new QuickJS.VM();
const context = vm.createContext({ issue, api });
const result = await vm.evalCode(userScript, context);
```

Detection Checklist

- [ ] Search for `AsyncFunction`, `new Function()`, `eval()` in codebase.
- [ ] Trace the script/code argument to untrusted sources.
- [ ] Identify module-level variables that could leak between invocations.
- [ ] Check for global scope modifications in user-executable code.
- [ ] Review caches and state that persist across Lambda warm starts.

Scanning Patterns

```javascript
// Pattern 1: AsyncFunction constructor
const AsyncFunction = async function () {}.constructor
new AsyncFunction('param1', 'param2', script)

// Pattern 2: Function constructor
new Function('param1', 'param2', script)

// Pattern 3: eval
eval(script)

// Pattern 4: Global state
globalThis.property = value
global.property = value
```

PoC / Test Leads

- Execute script that modifies `globalThis.__proto__`.
- Store data in global variable, verify it persists to next invocation.
- Override `console.log` and verify it affects subsequent requests.
- Access `process.env` to extract environment secrets.
- Test `require()` to load sensitive modules.

Remediation Guidance (advisory)

- Avoid user-provided code execution if possible; use configuration-based customization.
- If code execution is required:
  - Use QuickJS or Deno for true process/memory isolation.
  - Use VM module with isolated context as minimum.
  - Never use `eval`, `Function`, `AsyncFunction` with untrusted input.
- Reset global state at start of each invocation.
- Clear all caches and module-level variables between tenant requests.
- Implement strict timeouts and resource limits.
- Audit what APIs are exposed to user scripts.

Reporting Guidance

- Document the code execution mechanism and where user input enters.
- Explain Lambda warm start implications for tenant isolation.
- Provide PoC showing global state pollution or cross-tenant leakage.
- Map to CWE-94, CWE-95; reference JMCF investigation.

