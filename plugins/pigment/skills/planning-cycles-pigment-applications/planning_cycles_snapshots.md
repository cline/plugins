# Snapshots and Lifecycle in Pigment

A Snapshot is a point-in-time copy of an entire Pigment Application. It is the only way to freeze state in Pigment because the platform is a live calculation engine. Use Snapshots to close planning cycles, archive past Versions, and keep the live Version count under control.

## 1. When to Snapshot

- At the end of a planning cycle. Close the prior Budget Version once the new Budget Version is live.
- At each cycle for Rolling Forecasting. Snapshot the Application monthly (or per cycle cadence) so each cycle has a frozen reference.
- Before a major model change that may affect prior results.

## 2. Cycle Workflow

For each new planning cycle:

1. Snapshot the Application at the end of the previous cycle (or monthly for Rolling Forecasting).
2. Add a new Version Item in the Version Dimension. Use Clone data to to copy assumptions from the previous Version. Update `Switchover Month` on the new Version.

This pairs naturally with the Version Dimension pattern. See [planning_cycles_versions.md](./planning_cycles_versions.md) for the Version setup.

## 3. Performance Budget

- Target ~6-10 live Versions in the Version Dimension; review when above 10.
- Archive older Versions via Snapshots; do not leave them as live Items.
- Live Versions inflate recalculation cost.

## 4. Lifecycle Guidance

- Frozen reference -> use a Snapshot. Snapshots cannot be edited.
- Active plan -> use a live Version in the Version Dimension.
- Closing a Version -> Snapshot the App, then optionally remove the Version Item if no longer needed.

## Anti-Patterns

1. Keeping more than 10 live Versions without review instead of archiving via Snapshots.
2. Editing data in a frozen cycle by re-adding live Versions instead of restoring from a Snapshot.

## See Also

- [planning_cycles_versions.md](./planning_cycles_versions.md): Version Dimension setup.
- [planning_cycles_scenarios.md](./planning_cycles_scenarios.md): Native Scenarios for sensitivity.
- [`../optimizing-pigment-performance/performance_auditing_application.md`](../optimizing-pigment-performance/performance_auditing_application.md): reviewing live Versions.
- Pigment KB: [Compare Data with Data slices](https://kb.pigment.com/docs/compare-versions-with-data-slices).
