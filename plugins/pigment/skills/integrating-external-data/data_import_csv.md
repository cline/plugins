# CSV Data Import

## Overview

CSV import populates dimensions or transaction lists with external data. Each CSV row represents an item, each CSV column maps to a property.

---
## Working with File Attachments

The user may attach files (CSVs, PDFs) to the conversation. All attached files remain available throughout the conversation.

### File Identification
Each file has:
- File Name: The user-visible name (e.g., "sales_data.csv")
- Metadata: Size, row count, columns, preview data

### Handling Multiple Files with the Same Name

When multiple files share the same name:

1. Examine the metadata, order and preview to differentiate files
2. If genuinely ambiguous, ask the user to clarify and give them the name, metadata, preview data, and order

## 1. CSV Analysis

Understanding the CSV structure before import.

### Column Filtering

Exclude from import:
- Empty columns (no header or no data)
- Columns with technical/generated names: `_1`, `_2`, `_internal_id`, `sys_key`, `row_id`, names starting with `_`
- System timestamps: `created_at`, `updated_at`, `last_modified`, `updated_timestamp`
- Free-text comments (unless explicitly requested)

CRITICAL: Do not create properties for excluded columns.

### Column Classification

| Column Type | Characteristics | Examples |
|-------------|-----------------|----------|
| Categorical (low cardinality) | Values repeat across rows | Country: "France", "Germany", "France" |
| Unique (high cardinality) | Distinct value per row | Order ID, Description, Amount |
| Numeric | Numbers, quantities, amounts | Price, Quantity, Total |
| Temporal | Dates, timestamps | Order Date, Created At |

### Number/Date Format Detection

After filtering the relevant columns, examine the preview rows to detect:

- Date columns: If any, determine the appropriate date format before calling the MCP tool
- Number columns: If any, determine the appropriate number format before calling the MCP tool

If dates are ambiguous (e.g., '01/02/2023' could be Jan 2nd or Feb 1st) or if the preview doesn't contain enough examples to confidently determine the format, ask the user for confirmation.

---

## 2. Dimension vs Transaction List

### Recognition Patterns

| CSV Pattern | Likely Type | Rationale |
|-------------|-------------|-----------|
| Mostly categorical columns, no unique ID per row | Dimension | Master data (products, customers, regions) |
| Has a unique ID column + categorical columns | Transaction List | Transactional data (orders, sales, movements) |

---

## 3. Categorical Columns and Referenced Dimensions

Categorical columns (low cardinality, repeated values) can be handled in two ways:

| Approach | When to Use | Example |
|----------|-------------|---------|
| Create separate dimensions | For reusability across the application | Create dimension "Country", then TL "Sales" with property "Country" referencing it |
| Simple Text properties | For quick import without reusability needs | Create TL "Sales" with property "Country" as Text |

Creating separate dimensions enables:
- Reuse across multiple lists
- Hierarchies (Country -> Region)
- Additional properties on the dimension itself (Country.Population, Country.Currency)

CRITICAL: When categorical columns are detected, ALWAYS present both options to the user. Do not assume which approach to use. Choosing Text properties when dimensions are needed later requires recreating the list.

### After the user chooses:

If user chooses "Create separate dimensions":
- First, create one dimension per categorical column (e.g., dimension "Country", dimension "Product", dimension "Customer")
- Then, create the target list with properties of type Dimension referencing them
- Finally, import the CSV

If user chooses "Text properties":
- Create the target list with Text properties
- Import the CSV directly

---

## 4. Mapping Rules

### 4.1 New Dimension or Transaction List

When creating a new target for import:

Properties match CSV columns: Create one property per CSV column (after filtering). The mapping is 1:1 - each CSV column maps to the property with the same name.

No uniqueness constraints for transaction lists: Do not create properties with uniqueness constraints. The preview only shows a sample; duplicates may exist in the full data and would cause import failure.

Example:
```
CSV columns (filtered): Date, Customer, Product, Amount
-> Create TL "Sales" with properties: Date, Customer, Product, Amount
-> Mapping: {"Date": "Date", "Customer": "Customer", "Product": "Product", "Amount": "Amount"}
```

### 4.2 Existing Dimension or Transaction List

When importing into an existing target:

Semantic matching: Match CSV columns to existing properties using:

| Match Type | CSV Column | Property |
|------------|------------|----------|
| Exact | "Country" | "Country" |
| Translation | "Pays", "Produit" | "Country", "Product" |
| Abbreviation | "Dept", "Qty", "Amt" | "Department", "Quantity", "Amount" |
| Synonym | "Client", "Item", "Location" | "Customer", "Product", "Region" |

Missing properties: If a CSV column has no matching property, propose adding new properties to the target (one per relevant column).

Dimension-type properties: If a property references another dimension (e.g., property "Country" references dimension "Country"), map the CSV column directly to that property. The backend resolves references automatically.

---

## 5. Import Scope

Rule: Import only into the target requested by the user.

When importing into a dimension or transaction list that has properties referencing other dimensions:

| Action | Correct? |
|--------|----------|
| Import into TL "Sales" with mapping `{"Country": "Country", "Product": "Product", ...}` | GOOD: Yes |
| Import separately into dimension "Country", then dimension "Product", then TL "Sales" | BAD: No |

The backend handles reference resolution internally. Do not perform multiple imports on referenced dimensions.

---

## 6. Post-Import Verification

CRITICAL: After every import, fetch the target dimension or transaction list and verify that the number of items is greater than 0. If the count is 0, the import has failed. Inform the user and suggest using the Pigment UI to perform the import manually.
