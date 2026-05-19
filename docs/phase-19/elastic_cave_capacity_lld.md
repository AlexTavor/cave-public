# Elastic Cave Capacity for Demand-Window Refill — Low-Level Design

## Status
Approved design for implementation.

## Scope
This document covers **only** the Cave elastic-capacity change needed to keep Cave's internal `food.max` and `heat.max` aligned with the existing demand-window target under higher body counts.

This document does **not** revisit:
- Cycle cost request cadence
- Transfer semantics
- Cave body-provider routing
- Shrink behavior for Cave capacity
- UI redesign

## Why

### Problem
The current implementation correctly computes a demand-window target for Cave refill, but Cave still uses fixed authored capacity for `food.max` and `heat.max`.

Grounded in the current code:
- `DEFAULT_WORLD_ENTITY` still boots Cave with `food.max = 100` and `heat.max = 100` via `createDefaultWorldState()` in `src/data/schemas/v2/systemDefaults.ts` and `src/data/schemas/v2/caveWorldDefaults.ts`.
- World auto-request now computes a demand-window target in `src/data/schemas/v2/worldRuleBuilders.ts` using:
  - `baseDemandPerSecond`
  - `bodyDemandPerBodyPerSecond`
  - `windowSeconds`
- Cave refill need is still derived from the target state and current Cave stock, but transfer headroom is clamped against `state.<resource>.max` by `src/engine/runtime/handlers/capacityUtils.ts`.
- Body upkeep still consumes immediately from the Cave-side provider, while Cave refill remains non-immediate.

Result:
- When body count rises, the configured demand-window target rises.
- Cave capacity does **not** rise with it.
- Incoming refill is still capped by the fixed max.
- Cave therefore drains faster than it can maintain the intended window, even though the new demand formula is correct.

### Required outcome
Cave `food.max` and `heat.max` must grow to support the same demand-window target that already drives Cave refill.

## What
Implement **grow-only elastic max capacity** for Cave food and heat.

For each Cave-managed resource (`food`, `heat`):
1. Add an authored **minimum capacity floor** in world defaults.
2. Keep computing the existing demand-window **target**.
3. On the world auto-request cadence, raise `state.<resource>.max` when the persisted target exceeds the current max.
4. Never lower `state.<resource>.max` as part of this feature.
5. Keep Cave refill need driven by the demand-window **target**, not by `state.<resource>.max`.

## Design constraints
- Use the existing world auto-request machinery in `src/data/schemas/v2/worldRuleBuilders.ts`.
- Use the existing behavior `MUTATE` path for `.max` writes.
- Use the existing `UPDATE_STATE` handler and max application logic.
- Keep all new authored Cave data in `src/data/schemas/v2/systemDefaults.ts`.
- Do not add new engine mutation types.
- Do not add new expression features.
- Do not change transfer resolution or capacity clamping behavior.

## Existing mechanisms reused without change
These files are intentionally reused as-is:

### `src/engine/runtime/systems/behavior/actionExecutorMutateHelpers.ts`
**Why reused:** already supports `MUTATE` targets of the form `self.state.<key>.max` and emits `UPDATE_STATE` with the `max` field populated.

### `src/engine/runtime/handlers/UpdateStateHandler.ts`
**Why reused:** already applies max changes through the standard command pipeline.

### `src/engine/runtime/handlers/stateEntryNumeric.ts`
**Why reused:** already defines the exact grow/shrink semantics for max updates. In particular, increasing max leaves current value unchanged; decreasing max can clamp or scale current value. This design intentionally depends on the existing "increase does not alter value" behavior.

### `src/engine/runtime/handlers/capacityUtils.ts`
**Why reused:** transfer headroom already respects dynamic `state.<resource>.max` plus incoming ledger amounts. Once Cave max grows, the existing clamping behavior automatically allows larger incoming refill.

### `src/ui/runtime/world/selection/cave/CaveCardView.tsx`
**Why reused:** Cave bars already read `state.food.max` and `state.heat.max`. Dynamic max values will appear automatically with no UI change.

## Explicit non-goals
1. **No shrink behavior**
   Cave max does not decrease when body count falls.

2. **No change to comfort formula**
   Comfort continues to be computed from `food.value / food.max` and `heat.value / heat.max`.
   After this change, comfort represents fill ratio against the elastic Cave capacity.

3. **No change to target/need semantics**
   World auto-request continues to use the existing hidden target state and need state pattern.

4. **No change to ResolveTransfer handling**
   Resolve-time deposits continue to add to receiver state without re-clamping on arrival. This design therefore remains grow-only.

## Data contract

### New authored defaults
For each world auto-request resource entry in `WORLD_AUTO_REQUEST_DEFAULTS`:
- `minCapacity: number`

Initial values for this change:
- `food.minCapacity = 100`
- `heat.minCapacity = 100`

### New hidden runtime state key
For each auto-request resource/index:
- `auto_req_<resource>_min_capacity_<index>`

This key is hidden and numeric.

## Runtime behavior contract
For each managed Cave resource:

### Definitions
- `baseDemandPerSecond` = existing authored Cave baseline demand
- `bodyDemandPerBodyPerSecond` = existing authored per-body demand contribution
- `windowSeconds` = existing authored demand buffer window
- `minCapacity` = new authored floor
- `target` = existing demand-window target
- `need` = existing Cave refill shortfall

### Rules
1. Cave computes `target` exactly as it does today.
2. Cave capacity floor is at least `minCapacity`.
3. Cave capacity grows to `target` when `target > current max`.
4. Cave capacity never shrinks due to this feature.
5. Cave refill need continues to be based on `target - current stock`, not on `max - current stock`.

### Pseudocode
For each `resource in { food, heat }` on the existing world auto-request cadence:

- compute and persist `target`
- if `state[resource].max < minCapacity`, set `state[resource].max = minCapacity`
- if persisted `target > state[resource].max`, set `state[resource].max = persisted target`
- compute and persist `need = persisted target - state[resource].value`
- if `need >= 1`, issue the existing non-immediate transfer from `tag:storage:<resource>`

## Important sequencing note
This design keeps the current behavior-rule execution model intact:
- behavior actions emit commands
- commands apply in the next apply phase
- hidden world auto-request state remains the source of truth for the auto-request loop

Therefore, Cave max growth follows the same deterministic command-buffer cadence as the current world auto-request logic. This change does **not** introduce mid-tick mutation or a new immediate path.

## File-by-file implementation

## 1) `src/data/schemas/v2/systemDefaults.ts`
**Change type:** modify

### Responsibility
Defines the default `sys_world` entity, including authored Cave/world defaults and the default hidden state generated for world auto-request.

### Required changes
1. Extend `WORLD_AUTO_REQUEST_DEFAULTS.food` with `minCapacity`.
2. Extend `WORLD_AUTO_REQUEST_DEFAULTS.heat` with `minCapacity`.
3. Keep the new authored Cave data in this file only.
4. Ensure the bootstrapped `sys_world.state.food` and `sys_world.state.heat` use the authored floor for both `value` and `max` at startup.

### Logic
- Materialize a base world state from `createDefaultWorldState()`.
- Override only the `food` and `heat` entries in `DEFAULT_WORLD_ENTITY.state` so that:
  - `food.value = WORLD_AUTO_REQUEST_DEFAULTS.food.minCapacity`
  - `food.max = WORLD_AUTO_REQUEST_DEFAULTS.food.minCapacity`
  - `heat.value = WORLD_AUTO_REQUEST_DEFAULTS.heat.minCapacity`
  - `heat.max = WORLD_AUTO_REQUEST_DEFAULTS.heat.minCapacity`
- Do not move this authored data into `caveWorldDefaults.ts`.

### Interface / contract
`WORLD_AUTO_REQUEST_DEFAULTS` becomes:
- `baseDemandPerSecond: number`
- `bodyDemandPerBodyPerSecond: number`
- `windowSeconds: number`
- `minCapacity: number`

`DEFAULT_WORLD_ENTITY.state` must boot with `food.max` and `heat.max` equal to the authored floor.

## 2) `src/data/schemas/v2/worldRuleBuilders.ts`
**Change type:** modify

### Responsibility
Builds the hidden world auto-request state and the behavior rules that maintain Cave demand-window target, refill need, and resource transfers.

### Required changes
1. Extend `WorldAutoRequestDefaults` with `minCapacity: number`.
2. Extend `buildWorldAutoRequestState()` to emit the hidden state entry:
   - `auto_req_<resource>_min_capacity_<index>`
3. Extend `buildWorldAutoRequestRules()` to add two new rules per resource:
   - a floor rule
   - a grow-max rule
4. Preserve the existing transfer rule builder and non-immediate transfer path.
5. Preserve the existing target/need hidden-state pattern.

### Logic
#### A. State builder
`buildWorldAutoRequestState(resource, index, defaults)` must return all existing keys plus:
- `auto_req_<resource>_min_capacity_<index>` with the authored `minCapacity` and `visible: false`

#### B. Rule builder
For each resource/index, `buildWorldAutoRequestRules()` must return rules in this exact order:

1. **Target/need rule**
   - keep the existing rule id
   - keep the existing timer condition
   - keep the existing target calculation
   - keep the existing need calculation pattern

2. **Floor-max rule**
   - new rule id: `sys_auto_req_<resource>_floor_max_<index>`
   - sort key: immediately after the existing target/need rule
   - conditions:
     - existing timer condition
     - `self.state.<resource>.max < self.state.auto_req_<resource>_min_capacity_<index>.value`
   - action:
     - `MUTATE self.state.<resource>.max SET self.state.auto_req_<resource>_min_capacity_<index>.value`

3. **Grow-max rule**
   - new rule id: `sys_auto_req_<resource>_grow_max_<index>`
   - sort key: immediately after the floor-max rule
   - conditions:
     - existing timer condition
     - `self.state.auto_req_<resource>_target_<index>.value > self.state.<resource>.max`
   - action:
     - `MUTATE self.state.<resource>.max SET self.state.auto_req_<resource>_target_<index>.value`

4. **Transfer rule**
   - preserve `buildAutoReqTransferRule(...)`
   - move its sort key so it remains last in the auto-request sequence for that resource
   - keep source as `tag:storage:<resource>`
   - keep transfer non-immediate

### Interface / contract
`WorldAutoRequestDefaults` must expose:
- `baseDemandPerSecond`
- `bodyDemandPerBodyPerSecond`
- `windowSeconds`
- `minCapacity`

`buildWorldAutoRequestState()` must return a hidden min-capacity state key.

`buildWorldAutoRequestRules()` must emit:
- one existing target/need rule
- one new floor-max rule
- one new grow-max rule
- one existing transfer rule

### Deterministic behavior contract
- If `target <= current max`, Cave max does not change.
- If `target > current max`, Cave max increases to the persisted target.
- If `current max < minCapacity`, Cave max increases to `minCapacity`.
- No rule in this file decreases Cave max.

## 3) `src/data/schemas/v2/worldRuleBuilders.test.ts`
**Change type:** modify

### Responsibility
Unit-tests the schema-level world auto-request builders.

### Required test changes
Add or update tests to verify:

1. **State shape**
   `buildWorldAutoRequestState()` includes:
   - `auto_req_food_min_capacity_0`
   - `auto_req_heat_min_capacity_0`

2. **Default values**
   The new min-capacity key is hidden and numeric.

3. **Rule set shape**
   `buildWorldAutoRequestRules("food", 0)` contains:
   - the existing target/need rule
   - a floor-max rule with the exact resource max target
   - a grow-max rule with the exact resource max target
   - the existing transfer rule

4. **Transfer invariants**
   The transfer rule remains:
   - sourced from `tag:storage:food`
   - targeted to `self`
   - non-immediate

### Test contract
These tests are unit tests only. They validate emitted state/rule structure, not runtime execution.

## 4) `src/engine/runtime/runtimeWorld.test.ts`
**Change type:** modify

### Responsibility
Verifies bootstrap behavior for singleton system entities.

### Required test changes
Extend the `sys_world` bootstrap assertions to verify:
1. `auto_req_food_min_capacity_0` exists in state.
2. `auto_req_heat_min_capacity_0` exists in state.
3. `sys_world.state.food.max === sys_world.state.auto_req_food_min_capacity_0.value`.
4. `sys_world.state.heat.max === sys_world.state.auto_req_heat_min_capacity_0.value`.
5. `sys_world.state.food.value === sys_world.state.food.max` at bootstrap.
6. `sys_world.state.heat.value === sys_world.state.heat.max` at bootstrap.

### Test contract
This test remains a bootstrap-level integration test for system entity creation only. It does not simulate ticks.

## 5) `src/engine/runtime/behavior.integration.test.ts`
**Change type:** modify

### Responsibility
Verifies end-to-end runtime behavior execution through the real command pipeline.

### Required test changes
Add one integration test proving that a behavior `MUTATE` targeting `self.state.<resource>.max` updates max through the runtime pipeline without changing current value when max grows.

### Required scenario
Given:
- a runtime entity with `state.food.value = 100` and `state.food.max = 100`
- a behavior rule that always executes `MUTATE self.state.food.max SET 200`

When:
- the runtime advances enough to execute the behavior rule and apply the emitted command

Then:
- `state.food.max === 200`
- `state.food.value === 100`

### Why this test is required
This design depends on the existing mutate-to-max command path. This test locks that contract at the integration layer instead of relying only on handler unit tests.

## Files intentionally not changed

### `src/data/schemas/v2/caveWorldDefaults.ts`
No change.

Reason:
- The user requirement is that new Cave-authored data remains in `systemDefaults` only for now.
- This file stays a generic base-state factory.

### `src/engine/runtime/handlers/UpdateStateHandler.ts`
No change.

Reason:
- Existing `max` update handling is already correct for this feature.

### `src/engine/runtime/handlers/stateEntryNumeric.ts`
No change.

Reason:
- Existing increase behavior is exactly what this feature needs.
- Existing shrink behavior is intentionally left unused by this design.

### `src/engine/runtime/handlers/ResolveTransferHandler.ts`
No change.

Reason:
- This feature is explicitly grow-only.
- No resolve-time re-clamping is introduced.

### `src/ui/runtime/world/selection/cave/CaveCardView.tsx`
No change.

Reason:
- Existing live max-path binding already renders elastic capacity.

## Acceptance criteria
The implementation is complete only when all of the following are true:

1. `sys_world` boots with `food.max` and `heat.max` equal to the authored floor in `systemDefaults.ts`.
2. Each world auto-request resource has a hidden min-capacity state key.
3. World auto-request rules raise Cave max when persisted target exceeds current max.
4. World auto-request rules restore Cave max to at least the authored floor if it is below floor.
5. No rule introduced by this change lowers Cave max.
6. Transfer routing remains unchanged and non-immediate.
7. Existing Cave UI bars reflect the new max without UI edits.
8. All modified tests pass.

## Risks and retained behavior
1. **Grow-only by design**
   If body count falls, Cave max stays at its previously reached high-water mark.

2. **Comfort meaning changes with max growth**
   This is intentional. Comfort now reflects fill ratio against the elastic Cave capacity.

3. **Command-buffer latency remains**
   Max growth follows the current behavior-command lifecycle. This change does not bypass the apply phase.

4. **No resolve-time safety clamp introduced**
   Because this change does not modify resolve-time deposit handling, it must remain grow-only.

## Test plan summary

### Unit
- `src/data/schemas/v2/worldRuleBuilders.test.ts`
  - state shape
  - rule shape
  - transfer invariants

### Bootstrap / integration
- `src/engine/runtime/runtimeWorld.test.ts`
  - default sys_world state consistency with authored floor

### Runtime integration
- `src/engine/runtime/behavior.integration.test.ts`
  - max mutation through the real behavior → command → apply pipeline

## Final implementation rule
Use existing builder, behavior, command, and handler mechanisms. Do not introduce a parallel Cave-capacity system.
