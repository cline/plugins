# Tag Detection

## Purpose

Resolve the 42Crunch platform tag associated with the OAS file, then announce
the result. Use the resolved tag in audit and scan command flags.

Free Trial mode: skip this entire document -- tag detection requires platform
access. Free Trial mode handling is described in `audit-workflow.md` and
`scan-workflow.md`.

---

## Step 1 -- Check the tags file (local fast path)

Resolve the tags file path for the current OS:

| OS            | Path                                   |
|---------------|----------------------------------------|
| macOS / Linux | `~/.42crunch/conf/tags`                |
| Windows       | `%APPDATA%\42Crunch\conf\tags`         |

If the file exists, parse it as YAML and look for an entry whose key matches
the absolute path of the current OAS file.

- Entry found -> jump directly to Announce: tag found. No user-facing
  announcement before this; it is instant.
- File missing or no entry for this OAS file -> proceed to Step 2.

---

## Step 2 -- Ask the user how to proceed

Call `AskUserQuestion`:

- question: `"This API doesn't have a platform tag assigned yet. Tags apply your organisation's Security Quality Gates, customisations, and data dictionaries. How would you like to proceed?"`
- options:
  - `"Assign a tag"` -- fetch tags from the platform and let the user pick one
  - `"Proceed without a tag"` -- continue without tag flags

If "Proceed without a tag": return to the calling workflow and continue
without `--tag`. `--report-sqg` is still passed -- the platform will apply
the organisation's default SQG. No further steps in this document.

If "Assign a tag": proceed to Step 3.

---

## Step 3 -- Fetch tags from the platform API

Announce:
> "Fetching available tags from the 42Crunch platform..."

Make an HTTP GET request:

```
GET <PLATFORM_HOST>/api/v2/tags
Headers:
  X-API-KEY: <API_KEY>
  X-42C-IDE: true
```

Parse `response.list[]`. The fields of interest per tag object are:
`categoryName`, `categoryDescription`, `tagName`, `tagDescription`.

On HTTP error or network failure:
> "Couldn't reach the 42Crunch platform to fetch tags (HTTP `<status>` /
> `<error>`). Check that your `API_KEY` and `PLATFORM_HOST` are correct,
> then try again."

Stop. Do not run audit or scan.

On success but `response.list` is empty:
> "No tags have been created on your 42Crunch platform yet. Ask your platform
> administrator to create a tag, then run this skill again."

Stop. Do not run audit or scan.

On success with tags returned -> proceed to Step 4.

---

## Step 4 -- Present tags and ask the user to pick one

Group the tags by `categoryName` and sort groups alphabetically. Within each
group, sort tags alphabetically by `tagName`.

Build a `categories` list where each entry has:
- `name` -- `categoryName`
- `description` -- `categoryDescription` (may be empty)
- `tags[]` -- all tags belonging to this category

Use two working counters, reset at the start of this step:
- `category_offset = 0`
- `tag_offset = 0`

---

### 4a -- Category selection (paginated)

Page size: 3 categories per page.

Compute the current page slice: `categories[category_offset : category_offset + 3]`.

Build the option list:
1. One option per category in the slice, labelled `<categoryName>`, with
   `categoryDescription` as the description (omit if empty).
2. If `category_offset + 3 < total categories` -> add a final option:
   `"More categories..."` -- description: `"Show the next set of categories"`

Call `AskUserQuestion`:
- question: `"Which category does <filename> belong to?"`
- options: the list built above (2-4 options)

If `"More categories..."` selected: set `category_offset += 3`, repeat 4a.

If a category is selected: record `selected_category`, set `tag_offset = 0`,
proceed to 4b.

---

### 4b -- Tag selection within a category (paginated)

Page size varies depending on whether "<- Back" is needed:
- `multiple_categories = (total categories > 1)`
- If `multiple_categories`: 2 tags per page (slots reserved for "More..." and "<- Back")
- If single category: 3 tags per page (slot reserved for "More..." only)

Compute the current page slice:
`selected_category.tags[tag_offset : tag_offset + page_size]`

Build the option list:
1. One option per tag in the slice, labelled `<tagName>`, with `tagDescription`
   as the description (omit if empty).
2. If there are more tags beyond this page -> add `"More tags..."` --
   description: `"Show the next set of tags in this category"`
3. If `multiple_categories` -> add `"<- Back to categories"` --
   description: `"Return to category selection"`

Call `AskUserQuestion`:
- question: `"Which tag should be applied to <filename>? (Category: <selected_category.name>)"`
- options: the list built above (2-4 options)

If `"More tags..."` selected: set `tag_offset += page_size`, repeat 4b.

If `"<- Back to categories"` selected: set `category_offset = 0`,
`tag_offset = 0`, return to 4a.

If a tag is selected: record `selected_tag`, proceed to 4c.

---

### 4c -- Save the selection

1. The `~/.42crunch/conf/` directory already exists (created during setup) --
   no need to create it.
2. Write or update the tags file. Add or update the entry for this OAS file:
   ```yaml
   <absolute-path-to-oas-file>: <selected_category.name>:<selected_tag.name>
   ```
   Preserve all other existing entries in the file.
3. Announce:
   > "`<selected_category.name>:<selected_tag.name>` saved. The audit will use
   > this tag going forward."
4. Proceed to Announce: tag found.

---

## Announce: tag found

> "This API is tagged on the 42Crunch platform as `<categoryName>:<tagName>`.
> The audit will run against this tag, which means platform SQGs,
> customisations, and data dictionaries associated with it will be applied
> automatically."

Set the following flags for the audit or scan command:
`--tag <categoryName>:<tagName>`, `--report-sqg`.
