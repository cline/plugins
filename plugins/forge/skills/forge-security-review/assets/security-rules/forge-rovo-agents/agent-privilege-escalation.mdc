---
description: Detect privilege escalation risks in Forge Rovo agents and actions
globs:
alwaysApply: false
---

Context

- Forge Rovo agents can execute actions with elevated privileges via `asApp()`. A known AuthZ gap (AGRC-15320) allows agents to perform actions with higher privileges than the requesting user.
- Related CWE: CWE-269 (Improper Privilege Management), CWE-862 (Missing Authorization).
- Reference: Rovo Forge A4J Risk documentation.

Scope & Signals

- Manifest: `rovo:agent` and `rovo:action` modules.
- Risk patterns:
  - Actions using `asApp()` without user permission verification.
  - Missing authorization checks before invoking Forge functions.
  - LLM-influenced actions without validation.
  - Actions on restricted content without access verification.

Rovo-Specific Concerns

- Rovo Forge Actions documentation lacks `asUser` vs `asApp` guidance (unlike regular Forge Actions).
- Convo AI should prevent unauthorized actions but gaps exist.
- Forge agents may not respect app access rules for restrictions.
- Browser context URLs consumed by agents are user-controlled.

Vulnerable Patterns

```javascript
// VULNERABLE - asApp without authorization check
export async function deleteIssueAction({ issueId }) {
  const api = asApp();
  
  // No check if user can delete this issue!
  await api.requestJira(route`/rest/api/3/issue/${issueId}`, {
    method: 'DELETE'
  });
  
  return { success: true };
}

// VULNERABLE - Trusting LLM-provided identifiers
export async function updateContentAction({ pageId, content }) {
  const api = asApp();
  
  // pageId comes from LLM, could reference any page
  await api.requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify({ body: content })
  });
}

// VULNERABLE - No validation of agent-provided context
export async function accessResourceAction({ resourceUrl }) {
  // resourceUrl from browser context - user controlled!
  const data = await fetch(resourceUrl);  // SSRF risk
  return processData(data);
}
```

Secure Patterns

```javascript
// SECURE - Verify user permission before asApp action
export async function deleteIssueAction({ issueId }, context) {
  // First verify user has permission
  const userApi = asUser();
  const permissions = await userApi.requestJira(
    route`/rest/api/3/mypermissions?issueId=${issueId}&permissions=DELETE_ISSUES`
  );
  
  if (!permissions.permissions.DELETE_ISSUES.havePermission) {
    throw new Error('You do not have permission to delete this issue');
  }
  
  // Now safe to use asApp
  const api = asApp();
  await api.requestJira(route`/rest/api/3/issue/${issueId}`, {
    method: 'DELETE'
  });
  
  return { success: true };
}

// SECURE - Validate and constrain LLM inputs
export async function updateContentAction({ pageId, content }, context) {
  // Validate pageId format
  if (!isValidPageId(pageId)) {
    throw new Error('Invalid page ID');
  }
  
  // Verify user has access to this page
  const userApi = asUser();
  try {
    await userApi.requestConfluence(route`/wiki/api/v2/pages/${pageId}`);
  } catch (e) {
    throw new Error('You do not have access to this page');
  }
  
  // Sanitize content from LLM
  const sanitizedContent = sanitizeContent(content);
  
  const api = asApp();
  await api.requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify({ body: sanitizedContent })
  });
}

// SECURE - Validate URLs from browser context
export async function processUrlAction({ url }, context) {
  // Allowlist of acceptable URL patterns
  const ALLOWED_PATTERNS = [
    /^https:\/\/.*\.atlassian\.net\//,
  ];
  
  if (!ALLOWED_PATTERNS.some(p => p.test(url))) {
    throw new Error('Invalid URL');
  }
  
  // Process validated URL
}
```

Detection Checklist

- [ ] Identify all `rovo:agent` and `rovo:action` modules in manifest.
- [ ] Review each action function for `asApp()` usage.
- [ ] Verify authorization checks precede all `asApp()` operations.
- [ ] Check for user permission validation on sensitive actions.
- [ ] Look for LLM-provided input used without validation.
- [ ] Assess browser context URL handling.
- [ ] Verify actions respect content restrictions.

Agent-Specific Authorization Flow

```
1. User invokes agent via Convo AI
2. Agent determines action to take
3. Action receives:
   - Parameters (may be LLM-influenced)
   - Context (includes accountId)
4. Action MUST:
   a. Validate all parameters
   b. Verify user permission for operation
   c. Only then use asApp() if needed
```

PoC / Test Leads

- Test action with resource IDs the user shouldn't access.
- Verify actions fail for restricted content.
- Test LLM prompt injection to manipulate action parameters.
- Check if app access rules are enforced.
- Test cross-product access via agent.

Remediation Guidance (advisory)

- Always verify user permission before `asApp()` operations in agent actions.
- Validate and sanitize all parameters, especially LLM-influenced ones.
- Use `asUser()` when user's permission level is appropriate.
- Implement allowlists for URLs and resource identifiers.
- Log all agent actions for audit trail.
- Document authorization model in agent action code.

Reporting Guidance

- Document each agent action and its authorization model.
- Highlight `asApp()` usage without preceding checks.
- Explain LLM-influenced data flows.
- Provide PoC for privilege escalation.
- Map to CWE-269, CWE-862; reference AGRC-15320.

