# Version Dimension: Planning Cycles in Pigment

A Version Dimension is a regular Pigment Dimension created by the modeler to hold planning cycles (Budget, Forecast, Reforecast, Rolling Forecast). It is part of the Metric structure, supports cross-version formula references, and powers governance and locking. It is the canonical way to model planning cycles in Pigment.

MG12: model planning cycles as a Dimension, never as a Native Scenario.

## 1. When to Use a Version Dimension

Use a Version Dimension for:

- Any structured plan (Budget, Forecast, Reforecast, Rolling Forecast).
- Any cross-plan formula reference (e.g. a Reforecast references the previous cycle).
- Any per-plan access control (lock past plans).

### Examples

- Budget vs Actual with variance. Track Budget and Actual side by side and compute `'Variance' = 'Actual Revenue' - 'Budget Revenue'` per Account and Month.
- Rolling Forecast. Quarterly rolling forecast where each cycle builds on the previous one. Pattern: cycle-explicit Version Items (`Reforecast Q<n> FY<n>`); advance `Switchover Month` by one quarter per cycle; reference the previous Version via input Metrics of type Dimension `VAR_Current Reforecast Version` and `VAR_Previous Reforecast Version`:

```pigment
IF(
  'Version' = 'VAR_Current Reforecast Version',
  'Revenue'[SELECT: 'Version' = 'VAR_Previous Reforecast Version'] * (1 + 'Growth Factor'),
  BLANK
)
```

For ad-hoc what-if sensitivity that does not require cross-version references, see [planning_cycles_scenarios.md](./planning_cycles_scenarios.md).

## 2. Default Bootstrap: Version Dimension Setup Checklist

When the user asks to set up versions, planning cycles, a Budget, or a Forecast, deliver all of the following in a single pass. Nothing is deferred to a later phase.

### Checklist (atomic, all items mandatory)

- [ ] Create `Version` Dimension. Use business-friendly name (no `LST_` prefix unless the workspace already uses it). Default items: `Actual`, `Budget`, `Forecast`.
- [ ] Create companion `Version Type` Dimension. Items: `Actual`, `Budget`, `Forecast`, `Reforecast`, `Rolling Forecast`, `Long Range Planning`. This is mandatory, not optional.
- [ ] Add `Version Type` Property on `Version`, typed `Dimension(Version Type)`. Set each item: Actual -> Actual, Budget -> Budget, Forecast -> Forecast.
- [ ] Add `Switchover Month` Property on `Version`, typed `Dimension(Month)`. Populate immediately using calendar and current date (see defaults below). Use `Switchover Year` only if planning grain is Year.
- [ ] Add `Start Month` Property on `Version`, typed `Dimension(Month)`. Populate immediately.
- [ ] Add `End Month` Property on `Version`, typed `Dimension(Month)`. Populate immediately.
- [ ] Add `Active Version` Property (Boolean) on `Version`. Set TRUE for all initial items.
- [ ] Add `Lock Version` Property (Boolean) on `Version`. Set TRUE for Actual, FALSE for Budget and Forecast.
- [ ] Create IsVersion Boolean Metric at `Version x Month`. Formula: `'Version'.'Start Month' <= 'Month' AND 'Month' <= 'Version'.'End Month'`.
- [ ] Create IsActual Boolean Metric at `Version x Month`. Formula: `IsVersion AND 'Month' <= 'Version'.'Switchover Month'`.
- [ ] Create IsPlan Boolean Metric at `Version x Month`. Formula: `IsVersion AND 'Month' > 'Version'.'Switchover Month'`.

### Default Property Values (auto-populate from calendar + current date)

Read the fiscal year starting month from the application calendar. Current FY is the fiscal year that contains today's date. First month of current FY is that starting month in the active year; last month of current FY is the month before the next FY starts.

| Version Item | Version Type | Start Month | End Month | Switchover Month |
|---|---|---|---|---|
| Actual | Actual | Calendar start | Calendar end | Calendar start (actuals from calendar beginning) |
| Budget | Budget | First month of current FY | Last month of current FY | Last month of previous FY (full FY window is plan) |
| Forecast | Forecast | First month of current FY | Last month of current FY | Current month (actuals up to now, plan after) |

Derive every Month value from the calendar fiscal year start and today's date. Do not hardcode calendar month names or years.

Before creating the Version properties, verify that the calendar exposes `Month`, `Quarter`, and `Year`, with Quarter and Year available as properties on Month. If not, complete the calendar setup first. See [`../modeling-pigment-applications/modeling_time_and_calendars.md`](../modeling-pigment-applications/modeling_time_and_calendars.md).

### Naming Patterns

Two naming patterns are valid. Pick based on intent:

Semantic names (default bootstrap): `Actual`, `Budget`, `Forecast`. Year is NOT embedded in the name. Year is managed via data slices or the calendar window. Use this when there is one active Budget and one active Forecast at a time.

Cycle-explicit names (rolling forecast / multi-cycle): `Budget FY<n>`, `Reforecast Q<n> FY<n>`. Year or cycle window IS in the name. Use this when multiple concurrent cycles coexist and the name must disambiguate them.

Do not mix patterns within the same Version Dimension.

## 3. Switchover Semantics

`Switchover Month` is the last month of actual data for that Version. Months strictly after it are Plan.

- `Budget`: `Switchover Month` = last month of previous FY -> the full current FY window (Start Month through End Month) is Plan.
- `Forecast`: `Switchover Month` = current month -> Actual from first month of current FY through switchover inclusive; Plan for remaining months in the FY window.

## 4. Layering Actuals and Plan

For each measure, create three Metrics at `<Driver Dimensions> x Version x Month`:

- `<Measure> Actual` gated by IsActual.
- `<Measure> Plan` from forward-looking assumptions.
- `<Measure>` (final): `IF(IsActual, '<Measure> Actual', '<Measure> Plan')`.

## 5. Optional: Dedicated `Actual` Version

The default bootstrap includes an `Actual` item. If the model does not need to isolate Actuals independently of any plan cycle, the modeler can remove it; but the default is to include it.

When present, update its `Switchover Month` each period to bring in the latest Actuals; never create one Item per fiscal year (e.g. separate `Actuals` items per year). The `Actual` Version is always locked for edit (the AR rule on `Lock Version` should reflect that).

## 6. Optional: Display Actual vs Plan in Views via Mapped Dimension

For richer reporting, build a `Data Type` Metric typed `Dimension(Data Type)` over `Version x Month` that returns `Actual` or `Plan` based on IsActual / IsPlan. Use it as a Mapped Dimension in the View; the View then shows `Actual` and `Plan` columns sourced from the same underlying Metric.

## 7. Do Not

- Period Type on Month or the calendar Actual vs Forecast toggle. One global switchover; cannot vary per Version. Use section 2 instead.
- Hardcoded month IFs for actual/plan split. Use IsActual / IsPlan from section 4.
- Partial setup. Items only, blank properties, or booleans deferred to a second prompt. Deliver section 2 in one pass.
- Native Scenarios for Budget / Actual / Forecast. MG12; use a Version Dimension.
- Hard-coded Version items in formulas. Use `VAR_` metrics or `'Version Type'` (MP02). See `skill:writing-pigment-formulas`.
- `REMOVE` on Version. Use `FILTER` or `SELECT`.
- Version on every metric. Skip pure Actuals and reference data.
- Direct formula edits on live Versions. Use the flag pattern in section 8.
- Stale Version lists. Archive via Snapshots ([planning_cycles_snapshots.md](./planning_cycles_snapshots.md)).

## 8. Boolean Logic Flag for Live Formula Changes

When a Version is live, never edit a formula directly. Add a Boolean Property on the Version Dimension (e.g. `Y+1 Logic Changes`):

```
IF('Y+1 Logic Changes', New formula, Old formula)
```

Set TRUE only on the Versions adopting the new logic. This makes transitions explicit and auditable.

## 9. Multi-Application

Create the Version Dimension in the Hub Application and share it with the spoke Apps. Reuse the same Version Dimension across as many Applications as possible. Create a separate one only when a clear business need requires a different cadence (e.g. Sales needing 10x more Versions). See [`../modeling-pigment-applications/modeling_architecture_design.md`](../modeling-pigment-applications/modeling_architecture_design.md).

## See Also

- [planning_cycles_scenarios.md](./planning_cycles_scenarios.md): Native Scenarios for ad-hoc sensitivity on top of Versions.
- [planning_cycles_snapshots.md](./planning_cycles_snapshots.md): Snapshots for archiving live Versions.
- [`../modeling-pigment-applications/modeling_principles.md`](../modeling-pigment-applications/modeling_principles.md): MG12 (planning cycles), MP02 (no hard-coding of Dimension Items).
- [`../optimizing-pigment-performance/performance_auditing_application.md`](../optimizing-pigment-performance/performance_auditing_application.md): reviewing live Versions.
- Pigment KB: [Versions and Scenarios](https://kb.pigment.com/docs/versions-scenarios), [Implement Versions and plans](https://kb.pigment.com/docs/managing-versions-in-pigment).
