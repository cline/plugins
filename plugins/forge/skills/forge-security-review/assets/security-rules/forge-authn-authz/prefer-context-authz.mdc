---
description: Context object should be preferred over explicit inclusion in function payload
alwaysApply: true
---

Context

- This rule uses terms which may have more up-to-date explanations from the Forge MCP server
- Forge functions may be distinguished from other JS functions by:
    - Being exported, and furthermore,
    - Being named under `modules.functions.[].handler`, as the last name in a `.`-separated chain
- Forge functions receive two arguments: a module-specific payload, and an object containing contextual information for
  the function invocation. Call the latter one the "context object." See the signature described under "Forge Function
  Signature"
- There are also forge resolver functions, which appear as the second argument of `foo.define()` calls, where `foo` is a
  variable constructed from a `@forge/resolver` `Resolver` object.
- Forge resolver functions have a signature described under "Resolver Function Signature" in this rule, with a context
  object of type `Context`, and a payload named `payload`.
- The context object is validated in full by the Forge platform. Some apps use an anti-pattern of passing information
  avilable in this object (commonly `accountId`) explicitly through the payload object instead. Since the latter is not
  validated, the app must validate it iself, but this may result in incorrect validation or even absent validation, and
  should be avoided.

Resolver Function Signature

```typescript
type Context = {
  accountId?: string;
  accountType?: 'licensed' | 'unlicensed' | 'customer' | 'anonymous';
  cloudId?: string;
  workspaceId?: string;
  localId: string;
  installContext: string;
  environmentId: string;
  environmentType: string;
  extension: {
    config?: { [key: string]: any } // defined for macro extensions
    [key: string]: any;
  },
  installation?: {
    ari: {
      installationId: string;
      toString: () => string;
    },
    contexts: [
      {
        cloudId?: string,
        workspaceId?: string,
        toString: () => string
      }
    ]
  }
};

function define(
  functionKey: string,
  // IMPORTANT: this parameter receives the resolver dunction definition
  cb: (request: {
    payload: { [key in number | string]: any;},
    context: Context
  }) => Promise<{ [key: string]: any } | string | void> | { [key: string]: any } | string | void,
): this
```

Forge Function Signature

```typescript
// The type of the context object
export type Context = {
  installContext: string;
  principal?: Principal;
  license?: License;
  installation?: Installation;
  workspaceId?: string;
}

export type Principal = {
  accountId: string;
}

export type License = {
  isActive: boolean;
  billingPeriod?: string | null;
  capabilitySet?: string | null;
  ccpEntitlementId?: string | null;
  ccpEntitlementSlug?: string | null;
  isEvaluation?: boolean | null;
  subscriptionEndDate?: string | null;
  supportEntitlementNumber?: string | null;
  trialEndDate?: string | null;
  type?: string | null;
};

export type Installation = {
  ari: InstallationAri;
  contexts: ContextAri[];
}

export type InstallationAri = {
    installationId: string;
    toString: () => string;
};

export type ContextAri = {
  cloudId?: string;
  workspaceId?: string;
  toString: () => string;
}

// IMPORTANT: This is the forge function
export const handler = (payload, context: Context) => {
  // Does something
}
```

Scope & Signals

- Manifest location of interest: `modules.functions.[].handler`
- Any resolver functions defined by `.define()` calls on a variable of type `Resolver`
- Risk indicators:
  - The payload object contains fields that are identical or likely contain the same information as fields available in
    the context object. Note that the fields available in this object will depend on whether it is a resolver function
    or not

Detection Process

```md
1. Extract all forge function `handler` keys from the manifest
2. Extract all `resolver` keys present, at any depth, under the `modules` key in the manifest
3. Treat all functions identified by (1) as forge functions, and all from (2) as resolver functions
4. Find the definition of each function in the source code
5. Check, as thoroughly as you can, how each of these functions use their payload objects. Look for field names or
   accesses which are likely to contain information similar to the context fields available for that type of function
   a. Pay closer attention to fields which are eventually passed to `asApp()` endpoint calls
6. If any likely such use is found, flag the function for review
```

Reporting Guidance

- Call out functions which are passing context-object information in their payloads. Prioritize functions based on
  certainty that this is the case, and on the likelihood they are failing to validate these fields before use.
    - Especially prioritize those that pass these values to calls made `asApp()`
- If a usage is not likely, but you still flagged it, merely point to its location for further investigation
- Unless you can verify that the payload field is passed without validation, this is probably not a vulnerability, but a
  significant weakness.
- The weakness is much more likely to be exploitable if this information is passed in a network request to APIs other
  than Jira, Confluence or Bitbucket.
- Always recommend the specific context field that contains the information as a replacement
