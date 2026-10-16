# Board Design Principles

## Basic Board Setup

- Never include a title or description in the Board as a Text widget, use the properties of the Board instead
- Define an icon that matches the Board's intent
- Set the full-width property of the Board to true (recommended default)
- Never use H1, bold, italic, or underline for section titles

---

## Column Layout Strategy

### Understanding the 12-Column Grid

- Board content spans across 12 columns
- Each widget width can be defined from 1 to 12 columns
- Choose between wide (12 columns), medium (10 columns), or narrow (8 columns) layouts, by leaving 1 or 2 columns of margin on each side
- Balance cognitive bandwidth vs information density

### When to Use Wide 12-Column Layout

Use full 12 columns when:

- Horizontal comparison is the primary task
- Designing monitoring dashboards
- Displaying 3+ numeric KPIs in a row
- Showing large numeric grids
- Presenting time series charts that benefit from horizontal resolution
- Users need to scan the screen left-to-right continuously

Typical use cases:

- Executive KPI dashboards
- Budget vs forecast comparisons
- Monthly trend charts with dense data

### When to Use Narrow 10 or 8-Column Layout

Use 10 or 8 columns (centered with margins) when:

- The Board reads top-to-bottom and resembles a document more than a dashboard
- Displaying 1-2 charts per section
- Content is narrative in nature
- Widgets contain text explanations
- The goal is insight, not monitoring

Typical use cases:

- Department deep-dives
- Review screens
- Approval flows
- Scenario explanations
- Manager-focused operational Boards

### Layout Consistency Rule

Critical: Never alternate between wide and narrow layouts within a single Board. Choose one layout strategy early and maintain it throughout the entire Board design.

---

## Board Content Organization

### Section-Based Structure

Always structure Boards using Sections to optimize information architecture and content hierarchy.

Section characteristics:

- Sections combine multiple related widgets
- Each section stacks vertically below the previous one
- Sections typically span the full width of the Board (12, 10, or 8 columns depending on your layout choice)

Side-by-side sections (use sparingly):

- Only use when necessary: Maximum 2 sections side-by-side, no more
- Each section spans half the Board width
- Both sections must have the same height
- Each side-by-side section typically contains only a single widget due to limited width
- This is a rare layout pattern - use only when absolutely needed

Section separation:

- Always use a spacer widget between sections
- This creates clear visual separation and structure
- See Widget Height Guidelines below for spacer sizing

### How to Build a Section

Step 1: Section Header (Text Widget)

- Create a text widget spanning the full width of the section
- Include a short, descriptive title explaining what the section contains
- Use H2 text style for the title
- Optional: Add a subtitle for additional context (use paragraph text style in the same widget)
- See Widget Height Guidelines below for section header sizing

Step 2: Section Content (Data Widgets)

- Display widgets below the section title
- Use data widgets: Grids, Lists, Charts, KPIs - all related to the section topic
- Content can span multiple rows
- Limit to maximum 3 widgets per row
- When using multiple widgets per row: Make them symmetrical with matching height and width

Widget Titles (Optional)

When to omit widget titles:

- When omitting a title, keep the text content, but set the widget boolean property `show_title` to false
- Widget content is self-explanatory from its data
- Section title and context make widget purpose clear
- Most of the time, widget titles are not needed - avoid redundant visual noise

When to use widget titles:

- Content spans multiple rows and structure is complex
- Widget titles add necessary hierarchy

Widget title consistency rule:

- If using widget titles on one widget in a section, use them on all widgets in that section (per-section basis)
- Exception: KPI widgets directly below the section title don't need titles - they feel integrated with the section header

### When to Skip Section Titles

Default: Always use section titles - they're essential for organizing and structuring Board content.

Exceptions (use rarely):

1. Very simple Boards:
   - Board has only a couple of widgets
   - Thinking in terms of sections is still good practice, but titles may be unnecessary
   - Widget titles alone may be sufficient for structure

2. Opening KPI section:
   - The very first section contains only a row of KPIs
   - KPIs introduce the Board context on their own
   - An additional section title may be redundant

---

## Global Board Structure

### Standard Board Pattern

For reporting, monitoring, and comparison Boards, use this classic structure:

1. KPI Overview Section (may not need a title)
   - Display high-level KPIs
   - Provide general context and overview of main indicators

2. Visual Analysis Section
   - Show charts for visual data representation
   - Enable trend and pattern recognition

3. Detailed Data Section
   - Present grids with complete data
   - Allow deep-dive analysis

### Adapt to User Needs

Important: No one-size-fits-all approach exists.

- Base Board structure on user needs and intent
- Match the design to user expectations
- Many layouts are valid based on content and Board purpose
- Maintain structure, organization, and readability above all

---

## Core Design Principles

### Principle 1: Optimize Reading Flow

Prioritize readability above all:

- Structure Boards as simply as a document
- Consider how users will read and scan the Board
- Organize content left-to-right, top-to-bottom
- Stack sections sequentially

Avoid common mistakes:

- Don't leave massive white gaps
- Don't misalign widgets
- Don't create unnecessary visual noise

Apply design fundamentals:

- Keep everything symmetrical
- Make content instantly parseable
- Leverage graphic design best practices
- Follow worldwide UX/UI design principles

### Principle 2: Create Clear Information Hierarchy

Structure the Board effectively:

- Create strong information hierarchy through sections
- Use section organization to achieve great layout
- Prevent user confusion through clear grouping

Ensure clarity:

- Users should easily identify which content relates to which group
- Make title-to-section relationships obvious
- Group related information together visually

### Principle 3: Use Familiar Patterns

Optimize for functional design and usability, not creativity.

User expectations:

- Users need to identify data pieces as fast and easily as possible
- Users don't want to re-learn visual systems for every Board
- Users value speed and efficiency above everything
- Users shouldn't get confused, misread data, or waste time due to unconventional design

Design approach:

- Board design is not a creative exercise
- Focus on efficient, well-structured layouts
- Follow standard interface guidelines users already know
- Don't re-invent existing design patterns

Outcome: Boards should follow the simple structure of an easy-to-read dashboard or document - no more, no less.
