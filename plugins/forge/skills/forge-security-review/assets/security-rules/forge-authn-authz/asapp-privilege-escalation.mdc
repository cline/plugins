---
description: Detect privilege escalation risks via asApp() calls without proper authorization checks
globs:
alwaysApply: false
---

Context

- `asApp()` operates with the app's full permissions, which typically exceed those of `asUser()`. This creates privilege escalation risks when asApp is used without verifying the requesting user has permission for the action.
- For user-invoked actions, default to `asUser()` when possible. If `asApp()` is required, perform explicit permission verification for the same target resource before the `asApp()` sink.
- Related CWE: CWE-269 (Improper Privilege Management), CWE-862 (Missing Authorization).
- Past issues: EPSP-301, VULN-1628326 (Rovo A4J elevated privileges).

Scope & Signals

- Sources: Resolver payloads, web trigger requests, event payloads, Rovo agent actions.
- Sinks: `api.asApp().requestJira()`, `api.asApp().requestConfluence()`, `api.asApp().requestBitbucket`, `api.asApp().requestGraph` and other request types, storage mutations, any state-changing operations.
- Red flags:
  - `asApp()` calls immediately after receiving payload without permission checks.
  - Authorization checks that are missing, generic, or not bound to the same resource ID used by the sink call.
  - Using `asApp()` for operations the requesting user couldn't perform directly and not checking user permissions.
  - Missing validation that the user owns or has access to the target resource.

Vulnerable Patterns

```javascript
// VULNERABLE - user-controlled target reaches asApp sink with no authz check
resolver.define('updateIssue', async ({ payload }) => {
  await api.asApp().requestJira(route`/rest/api/3/issue/${payload.issueId}`, {
    method: 'PUT',
    body: JSON.stringify(payload.fields)
  });
});

// VULNERABLE - check is not coupled to the same resource used in asApp sink
resolver.define('transitionIssue', async ({ payload }) => {
  // Checks permission on payload.issueId ...
  const canEdit = await authorize().onJiraIssue(payload.issueId).canEdit();
  if (!canEdit) throw new Error('Forbidden');

  // ... but mutates payload.targetIssueId (attacker-controlled)
  await api.asApp().requestJira(route`/rest/api/3/issue/${payload.targetIssueId}/transitions`, {
    method: 'POST',
    body: JSON.stringify({ transition: { id: payload.transitionId } })
  });
});
```

Secure Patterns

```javascript
// SECURE - prefer asUser when operation should respect caller permissions
resolver.define('updateIssueAsUser', async ({ payload }) => {
  return api.asUser().requestJira(route`/rest/api/3/issue/${payload.issueId}`, {
    method: 'PUT',
    body: JSON.stringify(payload.fields)
  });
});

// SECURE - asApp only after explicit permission check on same resource
resolver.define('updateIssueAsApp', async ({ payload }) => {
  const canEdit = await authorize().onJiraIssue(payload.issueId).canEdit();
  if (!canEdit) {
    throw new Error('Forbidden');
  }

  return api.asApp().requestJira(route`/rest/api/3/issue/${payload.issueId}`, {
    method: 'PUT',
    body: JSON.stringify(payload.fields)
  });
});

// SECURE - explicit permission check via Forge auth + permissions/check endpoint
resolver.define('updateIssueWithExplicitPermissionEndpoint', async ({ payload }) => {
  const permissionRes = await api.asUser().requestJira(route`/rest/api/3/permissions/check`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectPermissions: [
        {
          permissions: ['EDIT_ISSUES'],
          issues: [Number(payload.issueId)]
        }
      ]
    })
  });

  const permissionJson = await permissionRes.json();
  const canEdit = permissionJson?.projectPermissions?.some(
    (grant) =>
      grant.permission === 'EDIT_ISSUES' &&
      Array.isArray(grant.issues) &&
      grant.issues.includes(Number(payload.issueId))
  ) === true;
  if (!canEdit) {
    throw new Error('Forbidden');
  }

  // Uses the same issueId that was authorized above.
  return api.asApp().requestJira(route`/rest/api/3/issue/${payload.issueId}`, {
    method: 'PUT',
    body: JSON.stringify(payload.fields)
  });
});
```

Detection Checklist

- [ ] Identify all `asApp()` usage sites in resolvers, functions, and handlers.
- [ ] For each `asApp()` call in a user-invoked flow, verify an explicit permission check exists before the sink.
- [ ] Confirm the authorization check is coupled to the same resource ID(s) used by the `asApp()` operation.
- [ ] Reject generic checks (for example, global role checks) when object-level permissions are required.
- [ ] Confirm asUser() is used when the operation should respect user's permissions.
- [ ] Review Rovo agent actions for asApp usage without Convo AI authorization context.

Prototype Pollution to asApp Escalation

In RuntimeV2, prototype pollution can enable asUser-to-asApp escalation by injecting headers:

```javascript
// If attacker can pollute Object.prototype with fetch options,
// asUser() calls may be upgraded to asApp() by injecting headers
const people = {
  joshua: { team: "EcoAppSec" }
};

function unsafe_merge(tgt, src) {
  let { ident, keys } = src;
  let foo = tgt[ident];
  for (const k of Object.keys(keys)) {
    foo[k] = keys[k];
  }
}

// payload is an attacker controlled object
async function vulnerable_function({ payload }) {
  unsafe_merge(people, payload);
  // Object.prototype is potentially polluted past this point
}

resolver.define("anon", vulnerable_function);
```

PoC / Test Leads

- Call resolver with arbitrary resource IDs (issueId, attachmentId, pageId) as a low-privilege user.
- Verify operations fail when targeting resources the user shouldn't access.
- Test cross-project and cross-space access with asApp-backed resolvers.
- For Rovo agents, test if agent actions respect user's content restrictions.

Remediation Guidance (advisory)

- Default to `asUser()` unless app-level permissions are explicitly required.
- Treat user-invoked `asApp()` mutations as high risk unless explicit permission checks are present.
- Always verify user permission before any `asApp()` operation on user-specified resources.
- Use Forge Authorize API or product permission APIs, and bind checks to the exact target resource IDs used in the sink call.
- Document why asApp is necessary for each use case.
- Consider using the Authorize API or explicit permissions API pattern for sensitive mutations.

Reporting Guidance

- Cite specific resolver/function and the asApp call site.
- Document the missing authorization check and the potential impact (IDOR, privilege escalation).
- Provide test case with resource ID manipulation.
- Map to CWE-269, CWE-862; reference EPSP-301 pattern.

