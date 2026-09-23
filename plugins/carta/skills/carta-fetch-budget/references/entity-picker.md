# Reference: pick the ManCo entity (always first option)

Only management companies carry budgets in Carta. Funds and SPVs
return empty from `fa:list:budgets`. This reference defines the entity
picker so the ManCo always shows up first, with a clear cue that the
others probably won't have a budget.

## Workflow

### 1. List entities under the active firm

```
fetch(command="fa:list:entities")
```

The response is a list of `{id, name, type, ...}` records -- entity-type
labels vary by firm and over time, so do not hard-code an exact
match. Treat the data defensively.

### 2. Classify each entity

Apply the following rules in order -- first match wins -- to label
each entity:

| Label | Heuristic |
|---|---|
| `ManCo` | name contains any of `Management`, `Mgmt`, `ManCo`, OR ends in `Capital, LLC` / `Partners Management`, AND does not contain `Fund`, `SPV`, `LP`, `Co-Invest`, `Bridge` |
| `Fund` | name contains `Fund` |
| `SPV` | name contains `SPV`, `Co-Invest`, `Bridge` |
| `Other` | anything else (don't guess -- leave as Other) |

If the firm has exactly one ManCo, that's the default. If the firm
has more than one, list them all but still first.

### 3. Build the picker

Use `ask the user` with this exact ordering:

1. The ManCo(s), each as a separate option labeled with the entity name.
   The first one gets `<- recommended` in its description.
2. Other entities (Fund / SPV / Other), grouped together below the
   ManCo, in the order returned by the API.
3. If the list exceeds 4 options total (the `ask the user` cap), keep
   the ManCo(s) + 2 other entities + a final "None of these -- let me
   type the name" option, instead of truncating arbitrarily.

Recommended question phrasing:

> Which entity's budget should I pull from Carta?
>
> (Only management companies carry budgets in Carta -- funds and SPVs
> usually return empty.)

The recommendation marker goes in the *description* of the recommended
option, not in the label.

### 4. Handle the picks

| User picks | What to do |
|---|---|
| The (or a) ManCo | Lock `<ENTITY_NAME>` and `<ENTITY_UUID>` and proceed. |
| A non-ManCo (Fund / SPV / Other) | Warn first: *"Heads up -- only management companies carry a budget in Carta. If I pull `<entity>`, the result will likely be empty. Want me to pick the ManCo instead?"* Wait for confirmation. |
| "None of these -- let me type the name" | Ask for the entity name via free-text, re-query `fa:list:entities` if needed, and re-run the classification. Do not free-type a UUID. |

### 5. If the user already named the entity in the original prompt

Skip the picker if exactly one entity in the firm's `fa:list:entities`
result matches the user's typed name (case-insensitive substring is
fine). If multiple match, run the picker with only those candidates. If
none match, surface the typed name and ask whether to use the closest
ManCo instead.

## Output to the calling skill

```
{
  entity_name: "Example Capital, LLC",
  entity_uuid: "<uuid>",
  entity_label: "ManCo" | "Fund" | "SPV" | "Other",
  user_warned_non_manco: true | false
}
```

The calling SKILL.md uses `entity_label` to decide whether to proceed
straight to fetching the budget (ManCo) or to confirm one more time
(non-ManCo).
