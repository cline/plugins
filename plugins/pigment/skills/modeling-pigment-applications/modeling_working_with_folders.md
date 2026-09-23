# Working with Folders

When building Applications, there are certain folders and structures we use in almost every use case Application. Typical exceptions are a data hub and specific Admin applications.

This folder structure allows us to order the Blocks intentionally, separate out the Blocks that serve important functions, and maintain flexibility to add new Blocks as the Application scope and complexity evolves.

Folder naming conventions (numeric prefixes, order): see [Naming Conventions - Folders](./modeling_naming_conventions.md#folders).

### System folders in every application

Every Pigment application has a few system folders that always exist:

- No folder - A default placeholder for blocks that are not assigned to any folder. Do not create new blocks in "No folder"; always assign them to an explicit folder (see [Placing new blocks](#placing-new-blocks)). Blocks left there are hard to find and clutter the app.
- Security - Exists by default in every application. It cannot be renamed. You can add blocks (e.g. AR metrics, mapping metrics) and create subfolders inside it. Do not create a separate folder named "Security" in the Blocks tree-use this one.
- Calendar - Created automatically by the application when you create a Calendar. It contains the time dimension blocks (e.g. Month, Quarter, Year) defined by that calendar. This folder can be renamed (e.g. add a numeric prefix like `0. Calendar` to order it at the top).

Example folder structure:

```
- Boards
  - 0
    - All Boards
- Blocks
  - All Blocks
    - > 0. Settings
    - > 1. Dimensions
    - > 2. Library
    - > 10. Data Loads
    - > 11. Data Checks
    - > 20. [Themed] Data
    - > 21. [Themed] Assumptions
    - > 22. [Themed] Forecast/Results
```

Boards vs Blocks: Boards have their own folder structure under the application's Boards section. They are not placed in the Blocks area. Do not create a block folder named "Board" or "Boards"-boards are organized in their own hierarchy (e.g. `0. Admin`, `10. Data`, `20. Planning`). Use the naming conventions for board folders (see [Naming Conventions - Boards](./modeling_naming_conventions.md#boards)).

Flexibility in folder structure

Do not treat the structure above as rigid. Existing applications may use different patterns-for example a functional structure (e.g. `2.1 Process step 1`, `2.2 Process step 2`) or theme-based numbering. When working in an app, observe the existing folder names and hierarchy and align with them. If the app has no clear structure, propose one following the patterns below; otherwise place new blocks in the folder that best matches their purpose.

## The "0X" Folders (Settings & Setup)

These appear at the top of the application and contain frequently referenced blocks.

- 0. Settings: Contains all blocks used for settings in the application-any blocks created to configure/tailor the application or for technical purposes. Examples include mapping metrics, variable metrics (e.g., "Load Month"), and configuration blocks.

- 1. Dimensions: Contains all dimensions that are specific to this application. Having this dimension folder appear at the top makes it convenient to quickly find all of your application-specific dimensions as you're modeling.

- 2. Library: Used to visualize the inflows (Pull) and outflows (Push) metrics between your application and others in the workspace. It usually contains both Push and Pull metrics:
  - Push metrics: Sanitized versions of end result metrics that need to be shared with other applications
  - Pull metrics: Receiving blocks from other applications' Push metrics
  - Name them with prefixes as per [Naming Conventions - Metrics](./modeling_naming_conventions.md#metrics) (e.g. `PUSH_`, `PULL_`).

- 3. Assumptions: Dedicated folder for model assumptions (e.g., conversion rates, growth percentages, allocation factors). If a model requires more than a few assumptions, it can be clearer to keep them with the "themed" folders (see below), but if you have fewer assumptions, an assumptions-specific folder helps keep them accessible.

## Data Folders (1X Range)

In the 1X range, create folders for data loads and checks to help consolidate and validate the data being used in your application.

- 10. Data Loads: All transaction lists containing data coming from external sources, as well as the metrics used to aggregate data from those transaction lists (staging metrics).

- 11. Data Checks: Metrics used to check the quality of the data, fill missing mappings, run number checks, and display validation results on boards.

## Themed Folders (2X Range and Beyond)

In the 2X range and beyond, create themed folders based on the calculation step or business process of the model.

Example patterns:

Pattern 1: Data -> Assumptions -> Results
- 20. [Theme] Data: Metrics aggregating relevant data from transaction lists
- 21. [Theme] Assumptions: Metrics used to input or calculate assumptions
- 22. [Theme] Forecast/Results: Forecast or calculation result metrics

Pattern 2: Load -> Data -> Assumptions -> Results
- 20. [Theme] Load: Transaction lists for this theme
- 21. [Theme] Data: Aggregated data metrics
- 22. [Theme] Assumptions: Assumption metrics
- 23. [Theme] Forecast/Results: Result metrics

Pattern 3: Combined Load & Data
- 30. [Theme] Load & Data: Transaction lists and aggregated metrics together
- 31. [Theme] Assumptions: Assumption metrics
- 32. [Theme] Forecast/Results: Result metrics

Example applications:

| Supply Chain Planning | Sales Operations | Product Management |
| :------------------- | :--------------- | :----------------- |
| > 0. Settings        | > 0. Settings   | > 0. Settings     |
| > 1. Dimensions      | > 1. Dimensions | > 1. Dimensions   |
| > 2. Library         | > 2. Library    | > 2. Library      |
| > 10. Data Loads      | > 10. Data Loads | > 10. Data Loads   |
| > 11. Data Checks     | > 11. Data Checks| > 11. Data Checks  |
| > 20. Inventory Data | > 20. Pipeline Data | > 20. Feature Data |
| > 21. Inventory Assumptions | > 21. Pipeline Assumptions | > 21. Feature Assumptions |
| > 22. Inventory Forecast | > 22. Pipeline Forecast | > 22. Feature Adoption |

By structuring folders in this way, all frequently referenced blocks are easily visible at the top (the 0X folders), and the rest of the blocks are organized thematically in an easy-to-navigate way.

## Subfolders

Creating subfolders is useful when a folder would otherwise contain too many blocks or when you need to segment blocks by sub-purpose (e.g. by process step, by data source, or by report type). Use a numeric prefix with a dot between the main and secondary level: `main.secondary` (e.g. `2.1 Process step 1`, `2.2 Process step 2`, `10.1 ERP Loads`, `10.2 CRM Loads`). Numbering restarts at each level (see [Naming Conventions - Folders](./modeling_naming_conventions.md#folders)). Subfolders keep the block list scannable and make it easier to find the right place for new blocks.

## Reorganizing folders and blocks

You can rename folders and move blocks between folders or subfolders to improve organization. If you see folders that are poorly named, inconsistent, or overloaded, you can propose:

- Adding subfolders - Split a crowded folder into subfolders (e.g. `10. Data Loads` -> `10.1 ERP`, `10.2 CRM`) and move blocks into the appropriate subfolder.
- Renaming folders - Suggest clearer or more consistent names (e.g. align with naming conventions, fix typos, or match the app's theme).
- Moving blocks - Move blocks (metrics, lists, tables) into the folder or subfolder that best matches their type and purpose (use the [Placing new blocks](#placing-new-blocks) mapping). Moving a block does not change its formula or content; it only changes where it appears in the folder tree.

When proposing reorganization, respect the application's existing pattern where one exists; otherwise suggest a structure that follows the conventions (numeric prefixes, logical grouping) and offer to rename or move as needed (the user or the UI can perform renames and moves).

## Placing new blocks

Rule: Never create a block in "No Folder". Always create (or move) every new block into an explicit folder.

Before creating any block:

1. List the existing Blocks folders (and subfolders) in the application.
2. Choose the folder that best matches the block's type and purpose, using the mapping below. If the application uses a different structure (e.g. functional steps), pick the folder that corresponds to the block's role in that structure.
3. If no folder fits (e.g. a new theme), create a new folder following the naming conventions and the app's existing pattern, then create the block inside it.

Block type and purpose -> suggested folder:

| Block type / purpose | Suggested folder (adapt to existing app structure) |
| -------------------- | -------------------------------------------------- |
| Dimension (list) | Folder that groups dimensions (often named like "1. Dimensions" or similar). |
| Transaction list | Data loads folder (e.g. "10. Data Loads") or themed "Load" folder for the relevant process. |
| Metric - settings, mappings, config (SET_, MAP_, VAR_, ADM_) | Settings-type folder (e.g. "0. Settings"). |
| Metric - shared out (PUSH_) | Library folder (e.g. "2. Library"). |
| Metric - pulled from other app (PULL_) | Library folder (e.g. "2. Library"). |
| Metric - staging from transaction lists (DATA_) | Data loads folder or themed "Data" folder. |
| Metric - assumptions (ASM_) | Dedicated assumptions folder (e.g. "3. Assumptions") or themed "Assumptions" folder. |
| Metric - inputs, calcs, outputs (INPUT_, CALC_, OUTPUT_, RES_, etc.) | Themed folder that matches the process (e.g. "21. [Theme] Assumptions", "22. [Theme] Forecast/Results"). If no theme applies, use the folder that is closest in purpose (Data, Assumptions, or Results). |
| Table | Themed folder that matches the table's use (input, reporting, process step), or a dedicated tables folder if the app has one. |
