---
name: designing-pigment-boards
description: Always use when creating or editing a Board. This skill includes supporting files in this directory - explore as needed.
metadata:
  skill_path: /designing-pigment-boards/SKILL.md
  base_directory: /designing-pigment-boards
  includes:
    - "*.md"
---

# How to Use This Skill

Progressive Disclosure Pattern: This `SKILL.md` provides an overview. Most details live in supporting files.

This file alone is often not sufficient

Required workflow:

1. Read this file first - Understand available resources and when to use them
2. Identify relevant topics - Match your task to any of the supporting documents
3. Read supporting files - Use available Cline file-reading or search tools to access detailed documentation
4. Explore as needed - Use available Cline listing and search tools to discover additional resources in this directory (some might not be explicitly mentioned in this file)

# Pigment Board Design Knowledge Base

This skill provides comprehensive guidance for designing Boards in Pigment. It covers board structure, layout rules, widget sizing standards, content conventions, and proven board design patterns for common business use cases.

Board design in Pigment is the practice of translating business questions into clear, structured, and visually coherent dashboards. A well-designed Board improves readability, adoption, decision-making speed, and executive trust.

This skill focuses on what a Board should contain and how it should be laid out, not on modeling or formula logic.

---

## When to Use This Skill

Use this skill whenever you need to:

- Design a new Board from scratch
- Structure a Board logically with sections and hierarchy
- Apply consistent layout rules using Pigment's 12-column grid
- Choose appropriate widget sizes for KPIs, charts, and grids
- Ensure governance and consistency across Boards
- Translate business needs into dashboard structure
- Follow best practices for executive-ready dashboards

This skill should be used after modeling is done and before or during Board creation.

---

## Supporting documents

When doing the following tasks, you MUST read these documents:

- When creating or editing a Board:
  - Must read to the end: [board_design_rules.md](./board_design_rules.md)
  - Must read: [board_pages.md](./board_pages.md)
  - Apply the inline widget sizing rules in the Widget Sizing section below.

- When you need a View:
  - Read [relevant_views.md](./relevant_views.md) and [view_widgets.md](./view_widgets.md) (CRITICAL for widgets).
  - Use `tool:get_block_views` to see what exists. Reusing is optional: generic names (e.g. _View 1_) often mean you should create with `tool:create_view`. Do not block on a long "search for similar" pass.

---

## Core Principles of Board Design in Pigment

- Boards tell a story, not just display data
- Structure and hierarchy matter more than visual density
- Consistency across Boards improves usability and trust
- Boards describe _what should be displayed_, not _how it is calculated_
- Simplicity beats completeness for executive and operational dashboards
- Do not answer with too much detail to avoid overloading the user's chat.
- If the user asks to avoid new modeling blocks (e.g. no new Metrics, Lists, or structural changes), creating a Table block can still be appropriate: a Table bundles existing Metrics for visualization and/or input on a Board. It's a layout container, not a new structural object dimension.

---

### Design Principles

[board_design_rules.md](./board_design_rules.md) - Board design principles
Covers:

- Global Board Structure
- Widget Sizes Guidelines
- Column Layout Strategy

---

## Content Guidelines

### Supported Widget Types

- GOOD: Text widgets - Titles, descriptions, explanatory content
- GOOD: View widgets - Data visualizations (Grids, Charts, KPIs)
- GOOD: Spacer widgets - Visual separation between sections
- BAD: Do not use other widget types (ActionButton, Image) unless explicitly asked

### Text Widget Usage

Use text widgets for:

- Section titles and subtitles
- Explanatory text and commentary

Do NOT use text widgets for describing intended data visualizations. Use actual View widgets instead.

### View Widget Usage

Use View widgets for data visualizations (Grids, Charts, KPIs).

WARNING: CRITICAL: Every View widget requires a View ID. There is NO such thing as:

- BAD: "View ID: Not applicable"
- BAD: "Using the Metric directly for KPI/Chart display"
- BAD: Referencing only a Block ID without a View

Even for a simple KPI showing a single Metric value, you must:

1. Create or find a View that references the Metric
2. Configure the View appropriately
3. Reference that View ID in the View widget

### KPI Widget Usage

- No row pivots
- `metricsLocation` MUST NOT be `Rows` - use `Columns` (default) or `Pages`. KPIs have no row pivots, so Rows produces a broken layout.
- The KPI widget displays as many columns as the underlying View.
- Do not put a Dimension in columns unless it has very few items.
- To display several Metrics side-by-side, prefer a single KPI Widget on a View with multiple Metrics in `values` (and `metricsLocation: Columns`) over multiple KPI Widgets - even if individual single-Metric Views already exist.
- Not available for List blocks (KPI requires a Metric or Table block).

### Spacer Widget Usage

Use spacer widgets for:

- Visual separation between sections
- Standard size: `width=12`, `height=1`

### Prioritization Rules

- Prioritize Blocks that directly support the Board's purpose
- Avoid unnecessary information
- Aim for clarity, hierarchy, and narrative flow
- Design Boards that are: visually clean, easy to scan, logically ordered

---

## Board Creation Workflow

Follow this 4-step workflow when creating a Board:

### Step 1: Define Board Purpose and Plan Board Pages

1. Define board purpose (1-2 sentences)
   - Example: "Track Q1 2024 actual performance against budget"

2. Use Search tool to check what Dimensions your Metrics have

3. Plan Board Page Selectors (not View Filters - defaults applied in Step 4):
   - Time Page Selector (Month, Quarter, Year) - only if Metrics have time Dimensions
   - Version Page Selector (Actuals, Budget, Forecast, or combinations) - only if Metrics have Version
   - Scenario Page Selector (Default or multiple scenarios) - only if Metrics have Scenario
   - Other dimensional Page Selectors as needed
   - See [board_pages.md](./board_pages.md) for detailed guidance

4. Before treating Board Page Selectors as shared context for every widget, verify that each View you intend to place on the Board includes a compatible page for every dimension you will set at board level (e.g. if the board should narrow by Year, each View must have Year in Pages-or a grouping page that resolves to Year-see board_pages.md). If a View is missing that dimension in Pages, edit or create the View first; the board cannot force a dimension onto a View that does not expose it in Pages.

### Step 2: Create Board Structure

1. Create a board with (in board settings):
   - Board name and description
   - Icon and color

2. Add sections and widgets:
   - Section titles and subtitles (text widgets)
   - View widgets for data visualizations
   - Spacer widgets between sections

### Step 3: Find or create Views, then add widgets

1. Identify Blocks for the story.

2. For each Block, `tool:get_block_views` - pick a reusable View only if name + pivots fit this board; otherwise `tool:create_view` (see [relevant_views.md](./relevant_views.md)). Ensure Pages align with [board_pages.md](./board_pages.md).

3. Add View widgets that reference those View IDs.

### Step 4: Update Board Pages

1. Use `tool:update_board` to set Board Page Selectors
2. Apply the Time, Version, Scenario, and other Page Selector defaults you defined in Step 1
3. Set default selected items for each Board Page at board level (e.g. default Year to FY25 / 2025 when that is the intended analytical context)
4. Confirm each View widget is linked to the Board Pages you care about (widgets do not "inherit" a dimension the View never had in Pages-see board_pages.md, Board-to-Widget Page Compatibility Rule)

Key Points:

- Plan Board Pages in Step 1, but apply defaults and selections in Step 4 (after Views are added)
- Only define Board Page Selectors for dimensions that at least one View exposes; for every widget that should follow a board-level Page Selector, that widget's View must include a compatible page on that dimension
- View widgets link to Board Page Selectors when their View has a matching page; they do not automatically narrow for dimensions absent from the View's Pages

---

## Learning Path: Read in This Order

### 1. START HERE: Board Structure

Based on the list of relevant Blocks to display, focus on:

- Board structure (title, description, sections hierarchy)
- For each section, selecting appropriate widgets (View, Text, Spacer, etc.) to display data and provide context

---

### 2. THEN: Content & Widgets

Focus on:

- Use View widgets to display data from Metrics, Lists, or Tables
- Use Text widgets for titles, descriptions, and context
- Use Spacer widgets for visual separation

---

### 3. FINALLY: Widget Sizing

You MUST follow these height guidelines. When a data widget has a title, add 1 to the minimum height.

| Widget type | Height |
|---|---|
| Text (title only) | 2 |
| Text (title + subtitle) | 3 |
| Spacer | 1 |
| KPI without title | 4-6 |
| KPI with title | 5-7 |
| Chart without title | 11-18 |
| Chart with title | 12-18 |
| Grid without title | 11-24 |
| Grid with title | 12-24 |

Chart/Grid height depends on data complexity (rows, columns, legends, axis labels).
