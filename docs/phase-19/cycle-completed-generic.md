# LLD: Make `cycle_completed` generic and independent of draft

## Status
Design only. No runtime code changes are included in this task.

## Objective
Move `cycle_completed` fact emission out of `TriggerDraftHandler` so cycle completion is tracked for every completed cycle, whether or not the cycle triggers a draft.

## Problem statement
Today `cycle_completed` is incremented only from the draft path:

- `game/handlers/TriggerDraftHandler.ts` calls `mirrorDraftCycleCompleted(...)`
- `game/handlers/triggerDraftHandlerHelpers.ts` maps that to mirrored fact updates

That means `cycle_completed` changes only when a completed cycle also triggers `TRIGGER_DRAFT`.
Regular cycle completions that only trigger spawners, conversions, triggered actions, or nothing at all do not update the fact.

Result: conditional activation authored against `run.cycle_completed.<blueprintId>` does not turn off for normal completed cycles.

## Scope
In scope:

- emit `cycle_completed` for any entity whose cycle is complete in the current snapshot
- key the fact by `entity.blueprintId`
- mirror the fact to `run` and `permanent`, preserving current fact semantics
- remove the draft-specific increment to avoid double counting
- add focused tests for the new generic path and the removed draft coupling

Out of scope:

- changing authoring syntax for conditions
- changing conditional activation behavior
- introducing new blueprint fields
- refactoring unrelated fact systems
- adding generic runtime event infrastructure

## Constraints
- Follow the existing deterministic runtime loop
- Keep ECS mutation in apply only
- Systems remain read-only and emit commands only
- No direct UI or blueprint mutation for this feature
- Keep the change minimal and local

## Current state
### Completion semantics
Cycle completion is already defined by behavior rules via `cycleCompleteConditions()`:

- `self.state.cycle.value >= self.state.cycle.max`
- `self.state.cycle.max > 0`

The reset path is compiled in `engine/compiler/abilities/cycleCompiler.rules.ts`.

### Incorrect fact ownership
`cycle_completed` is currently emitted by the draft handler, not by the cycle runtime.
That couples a generic cycle fact to one downstream trigger type.

## Proposed design
## 1. Add a dedicated runtime system for cycle completion facts
Create a new registered system:

- file: `game/systems/CycleCompletedFactsSystem.ts`

Responsibility:

- scan the snapshot for entities with completed cycles
- emit mirrored `ADJUST_FACT` commands for `cycle_completed`
- do nothing for entities without `blueprintId`
- do nothing for entities without valid cycle state

This keeps the feature in the command pipeline and does not require new behavior action types.

## 2. Detection rule
For each entity in the snapshot:

1. Read `entity.state?.cycle?.value`
2. Read `entity.state?.cycle?.max`
3. Read `entity.blueprintId`
4. Emit `cycle_completed` only when all are true:
   - `blueprintId` is a non-empty string
   - `value` is a finite number
   - `max` is a finite number
   - `max > 0`
   - `value >= max`

The system intentionally matches the existing cycle-complete gate used by compiled behavior.

## 3. Command emission
Use existing helpers from `game/facts/factCommands.ts`:

- `enqueueMirroredFactAdjust(commands, "cycle_completed", blueprintId, 1)`

No new runtime command types are needed.

## 4. Registration order
Register `CycleCompletedFactsSystem` in `game/main.ts` as a normal registered system, adjacent to `FactsSystem`.

Recommended order:

1. `FactsSystem`
2. `CycleCompletedFactsSystem`
3. remaining registered systems

Reason:

- both systems are fact producers
- ordering remains explicit
- command application still happens on the next apply phase, so no same-tick mutation coupling is introduced

## 5. Remove draft-specific increment
Delete the draft-owned increment path:

- remove `mirrorDraftCycleCompleted(...)` from `game/handlers/triggerDraftHandlerHelpers.ts`
- remove its call site from `game/handlers/TriggerDraftHandler.ts`

Keep `draft_opened` emission unchanged.

This prevents duplicate fact updates when a completed cycle also opens a draft.

## Why this design
This is the smallest change that fixes the ownership problem.

It avoids:

- adding a new behavior action schema
- adding a new runtime event bus
- teaching each ability compiler to increment facts independently

It also places responsibility where it belongs: runtime cycle completion detection produces the cycle fact.

## Runtime flow after the change
1. Snapshot enters system phase with an entity whose cycle is complete.
2. `BehaviorSystem` emits its normal cycle-complete commands such as reset, spawner, draft, conversion, or triggered actions.
3. `CycleCompletedFactsSystem` sees the same completion state in the same snapshot and emits mirrored `ADJUST_FACT` commands keyed by `blueprintId`.
4. Apply phase on the next tick resets cycle state and updates facts.
5. Any conditional activation authored against `cycle_completed` now observes the updated fact on the next stable snapshot.

## Edge cases
- Missing `blueprintId`: emit nothing
- Missing `state.cycle`: emit nothing
- `cycle.max <= 0`: emit nothing
- `cycle.value < cycle.max`: emit nothing
- One-off cycles: emit once per completion, same as repeatable cycles
- Completed cycle that also triggers draft: emit once from the generic system only

## Files to change in implementation
### New
- `game/systems/CycleCompletedFactsSystem.ts`
- `game/systems/CycleCompletedFactsSystem.test.ts`

### Modified
- `game/main.ts`
- `game/handlers/TriggerDraftHandler.ts`
- `game/handlers/triggerDraftHandlerHelpers.ts`
- `game/handlers/TriggerDraftHandler.cycle.test.ts`

## Test plan
### Unit tests for `CycleCompletedFactsSystem`
1. Emits mirrored `cycle_completed` facts when `value >= max` and `max > 0`
2. Does not emit when cycle is incomplete
3. Does not emit when `max` is zero or negative
4. Does not emit when `blueprintId` is missing
5. Does not emit when cycle state is missing

### Regression tests for draft coupling
1. Update `TriggerDraftHandler.cycle.test.ts` to assert that `TriggerDraftHandler` no longer emits `cycle_completed`
2. Keep existing draft behavior tests for `draft_opened` and `onComplete`

### Runtime regression
Add one integration-style test covering the original failure mode:

- compile a cycle blueprint with conditional activation on `run.cycle_completed.<blueprintId> < 1`
- run one completion through behavior plus registered systems
- apply emitted commands
- assert the fact increment exists
- assert the next behavior pass emits cycle shutdown behavior

## Sonar and maintainability notes
- Keep the new system single-purpose
- Keep guard clauses explicit
- Reuse existing fact helpers
- Do not add shared abstractions unless required by the implementation

## Acceptance criteria
- `cycle_completed` no longer depends on `TRIGGER_DRAFT`
- any completed cycle increments `cycle_completed` for its blueprint
- draft-triggered completions do not double count
- conditional activation keyed to `cycle_completed` turns off on the next stable snapshot
- tests cover happy path, negative path, and edge cases
