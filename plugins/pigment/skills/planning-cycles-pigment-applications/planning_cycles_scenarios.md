# Native Scenarios in Pigment

A Native Scenario is an application-level feature (not a Dimension) that creates an independent calculation environment with its own inputs. Use Scenarios for quick "what-if" sensitivity on top of an existing model, or for safe trialing of formula changes via Formula Groups.

For structured planning cycles (Budget, Forecast, Reforecast), do NOT use Native Scenarios. Use a Version Dimension instead, see [planning_cycles_versions.md](./planning_cycles_versions.md).

## 1. When to Use a Native Scenario

Use a Native Scenario only for:

- Ad-hoc sensitivity analysis (Optimistic, Pessimistic, Stress test) on top of an existing plan.
- Trialing a new formula in a Formula Group before porting it back to the main model.

### Example

- Simple what-if analysis. Compare three independent revenue projections (Base, Optimistic, Pessimistic) with their own assumptions and no need to reference each other.

## 2. Constraints

Before proposing a Native Scenario, the agent must know its constraints:

- Independent calculation environment with its own inputs.
- Cannot reference another Scenario's data in formulas.
- Lists must be consistent across Scenarios.
- Not a Dimension. Cannot enter a Metric structure or pivot on a Page.
- Shared vs Local is set at creation and cannot be reverted. Pick Shared if Shared Blocks must carry Scenario-specific assumptions across Applications. Otherwise Local.

## 3. Anti-Patterns

1. Modeling Budget, Actual or Forecast as Native Scenarios. Use a Version Dimension (see [planning_cycles_versions.md](./planning_cycles_versions.md)).
2. Treating Shared vs Local Scenarios as switchable. The choice is irreversible.

## 4. Combining Scenarios with a Version Dimension

Versions and Scenarios are complementary, not alternatives:

- Keep the structured plan in the Version Dimension (Budget, Forecast, Reforecast).
- Layer Native Scenarios on top for sensitivity or formula trials.

## See Also

- [planning_cycles_versions.md](./planning_cycles_versions.md): Version Dimension setup for planning cycles.
- [planning_cycles_snapshots.md](./planning_cycles_snapshots.md): Snapshots for freezing application state.
- [`../optimizing-pigment-performance/performance_auditing_application.md`](../optimizing-pigment-performance/performance_auditing_application.md): reviewing live Scenarios.
- [`../designing-pigment-boards/board_design_rules.md`](../designing-pigment-boards/board_design_rules.md): Scenario Planning Board pattern.
- Pigment KB: [Get started with Scenarios](https://kb.pigment.com/docs/get-started-scenarios).
