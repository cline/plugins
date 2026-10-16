---
name: fullstory-comparisons
description: Structure A versus B comparisons in Fullstory. Use with the Fullstory MCP when deciding whether a comparison should be modeled as an event-level breakdown or as separate user-level segments.
---

# Fullstory Comparisons

Use this skill when a Fullstory analytics question compares two or more groups.

## Choose The Mechanism

The comparison axis determines the correct shape:

- Event or session properties should usually be a single top-N metric grouped by that property.
- User-level properties should usually be separate segments, with the same metric computed once per segment.

If you cannot tell whether a property is event-level or user-level and the distinction affects the answer, ask the user to clarify before computing.

## Event And Session Properties

Use metric dimensionality when the property describes an event at the moment it happened. Examples include device type, browser, operating system, page URL, page title, referrer, element, and error type.

Example: "rage clicks on mobile vs desktop" should be a top-N metric grouped by device type. Do not build a "mobile users" segment for that question, because one user can use both mobile and desktop during the same time range.

To refine an existing comparison metric, update the same metric with the new filter or output shape rather than rebuilding from scratch.

## User-Level Properties

Use separate segments when the property describes the user or account rather than the event. Examples include plan tier, company, account ID, signed-up status, first-seen date, last-seen date, total sessions, and custom user properties.

Build one segment per cohort and one shared metric. Compute the metric for each cohort and present the results side by side. Reuse segment IDs and metric IDs throughout the conversation.

User properties can change over time. Unless the user asks for point-in-time attribution, segment comparisons usually mean the user's canonical or current value.

## Why It Matters

Segments for event properties can misattribute events. If Alice used mobile once but all of her rage clicks happened on desktop, a mobile-users segment can incorrectly count her desktop rage clicks as mobile-user behavior. A device-type metric dimension keeps each event with the device that actually generated it.

Dimensionality for user properties can split one user's behavior across old and new values. If Bob upgraded from free to enterprise halfway through the month, grouping events by plan can split his events between both tiers. A segment comparison can answer whether current enterprise users had more errors overall.

## Presenting Comparisons

State which mechanism you used and why. Include time range, cohort definitions, metric definition, and any caveat about point-in-time versus current user properties. If the comparison could be interpreted either way, ask before computing or show both options as alternatives.
