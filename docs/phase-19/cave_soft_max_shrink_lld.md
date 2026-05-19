# Cave Soft-Max Shrink With Surplus Preservation — Low-Level Design

## Status
Approved design for implementation.

## Scope
This document covers only the Cave food/heat max-alignment change required to make Cave track the **current** body-driven reserve target while **preserving surplus stock** when body count falls.

This document does **not** revisit:
- cycle-cost request cadence
- transfer semantics
- Cave body-provider routing
- comfort redesign
- generic engine-wide max semantics outside the explicit files listed below

## Why

### Problem in the current code
The current Cave auto-request loop already computes a live demand-window target and refill need in `src/data/schemas/v2/worldRuleBuilders.ts`:
- `target = (baseDemandPerSecond + bodyDemandPerBodyPerSecond * sys_swarm.state.swarm_count.value) * windowSeconds`
- `need = target - current_stock`

That part matches the intended refill model.

The bug is the interaction between three other code paths:

1. `src/data/schemas/v2/worldAutoRequestMaxRules.ts` is **grow-only**. It raises `state.food.max` and `state.heat.max` but never lowers them.
2. `src/engine/runtime/handlers/stateEntryNumeric.ts` clamps `value` to `newMax` on max decrease unless `scaleOnMaxChange` is enabled.
3. `src/data/schemas/v2/worldClampRules.ts` contains high-clamp rules that force `self.state.food.value = self.state.food.max` and `self.state.heat.value = self.state.heat.max` whenever value exceeds max.

Together, those rules mean Cave cannot express the intended behavior:
- when body count falls, Cave max does not follow the new lower target
- if max were lowered through the current handler path, existing stock would be deleted immediately
- even if a max decrease preserved current stock once, the world high-clamp rules would immediately destroy the surplus on the next behavior pass

There is a second code-level issue for existing saves:
- `src/engine/runtime/persistence/hydrateRuntime.ts` restores raw non-blueprint entities, including `sys_world`, from save data as-is
- `sys_world` is a raw system entity, not a flyweight blueprint entity
- therefore old saves keep stale Cave behavior/tags/state metadata unless hydration explicitly rebases `sys_world` onto the current config defaults

There is also a UI mismatch:
- `src/ui/runtime/world/selection/cave/CaveCardView.tsx` already binds Cave food/heat bars to live `state.food.max` and `state.heat.max`
- but `src/ui/runtime/world/selection/cave/CaveSustainmentSection.tsx` still hardcodes ` / 100` in the text readout

### Required outcome
Cave must always request enough food and heat for the **current** body count, while preserving already-stored surplus.

That means:
- Cave max must move **up and down** with the current demand-window target, subject to the authored minimum floor
- lowering max must **not** lower current stock
- if current stock is above the new max, Cave must simply stop refilling and keep consuming the surplus until stock falls back under max
- existing saves must pick up the new Cave behavior on hydrate

## What
Implement **soft max shrink** for Cave food and heat.

For each Cave-managed resource (`food`, `heat`):
1. Keep computing the existing demand-window `target`.
2. Define the live Cave max as `max(minCapacity, target)`.
3. Allow that max to move both upward and downward on the existing world auto-request cadence.
4. When max decreases, preserve the existing `value` unchanged.
5. If `value > max`, that state is legal and temporary.
6. While `value > target`, Cave must not request more of that resource.
7. Surplus must be consumed naturally by the existing body-upkeep path until `value <= max` again.
8. In-flight incoming transfers that arrive after a shrink remain legal and must still land.

## Runtime contract

### 1. Target and need contract
For each Cave resource:
- `target` remains the authored demand-window target already computed in `worldRuleBuilders.ts`
- `need` remains `target - current_value`
- transfer requests remain driven by `need >= 1`
- transfer source remains `tag:storage:<resource>`
- transfers remain non-immediate

### 2. Max alignment contract
For each Cave resource:
- `desiredMax = max(minCapacity, target)`
- on each world auto-request cadence, `state.<resource>.max` must be aligned to `desiredMax`
- increasing max must leave current value unchanged
- decreasing max must also leave current value unchanged

### 3. Surplus contract
When `state.<resource>.value > state.<resource>.max`:
- Cave must retain that value
- Cave must not be clamped down to max by world behavior rules
- refill headroom may be zero; no special-case refill path is introduced
- normal consumption may continue reducing the value until it drops back under max

### 4. Save hydration contract
When hydrating a saved runtime:
- raw saved `sys_world` must be rebased onto the **current** configured system-world defaults
- saved runtime state values must be preserved
- current Cave behavior, tags, and state-entry metadata must come from the current config, not from stale saved `sys_world` content

### 5. UI contract
The Cave sustainment readout must display live `current / max` values for food and heat. It must not show a hardcoded denominator.

## Existing mechanisms reused without change
The implementation must reuse these existing mechanisms as-is:

### `src/data/schemas/v2/worldRuleBuilders.ts`
Why reused:
- already computes the demand-window `target`
- already computes `need = target - current`
- already uses the existing timer/cadence pattern
- already uses `buildAutoReqTransferRule(...)` for non-immediate refill transfers

### `src/engine/compiler/abilities/autoRequestRuleBuilder.ts`
Why reused:
- already builds the exact transfer rule shape needed for Cave auto-request

### `src/engine/runtime/handlers/capacityUtils.ts`
Why reused:
- current transfer headroom logic already prevents new deposits when `value + incoming >= max`
- once max is lowered, headroom naturally becomes zero until Cave consumes back under the new max

### `src/engine/runtime/handlers/ResolveTransferHandler.ts`
Why reused:
- current resolve logic adds arrived payload directly to receiver state without re-clamping on arrival
- that already matches the required “late arrivals still land” behavior

### `src/ui/runtime/world/entity-state-link/**`
Why reused:
- the existing live text and live bar binding infrastructure already supports live `valuePath` and `maxPath`
- no new UI state mechanism is needed

## Explicit non-goals
1. **No transfer-logic redesign**
   `TransferHandler`, `ResolveTransferHandler`, and `capacityUtils.ts` keep their current semantics.

2. **No comfort redesign**
   `WORLD_COMFORT_RULES` continue to compute comfort from `food.value / food.max` and `heat.value / heat.max`, with the existing high clamp to `1` retained.

3. **No generic engine-wide soft-max system**
   This change is scoped to the explicit Cave state-entry flag and the files listed below. It does not redefine every max-bearing state entry in the runtime.

4. **No cycle-cost changes**
   Cycle request cadence remains out of scope.

## File-by-file implementation

## 1) `src/data/schemas/components.ts`
**Change type:** modify

### Responsibility
Defines the typed schema for runtime state entries authored in blueprints and defaults.

### Required changes
Add a new optional state-entry field:
- `preserveValueOnMaxDecrease: boolean`

### Logic
This field marks entries whose `value` must be preserved when `max` is lowered.

This field is definition metadata, not a command payload field.

### Interface / contract
`StateComponentSchema` entries now support:
- existing fields unchanged
- `preserveValueOnMaxDecrease?: boolean`

No existing field semantics change.

---

## 2) `src/engine/runtime/handlers/stateEntryNumeric.ts`
**Change type:** modify

### Responsibility
Implements numeric state-entry clamping and max-change behavior.

### Required changes
Extend `applyMaxChange(...)` to honor `preserveValueOnMaxDecrease`.

### Logic
`applyMaxChange(entry, newMax)` must behave in this exact order:

1. Update `entry.max` to `newMax`.
2. If `entry.value` is not numeric, stop.
3. If the max is increasing, leave `value` unchanged.
4. If the max is decreasing and `entry.scaleOnMaxChange === true`, keep the current proportional-scaling behavior unchanged.
5. If the max is decreasing and `entry.preserveValueOnMaxDecrease === true`, leave `value` unchanged even when `value > newMax`.
6. Otherwise keep the existing hard-clamp behavior unchanged.

### Interface / contract
The local `StateEntry` type in this file must include:
- `preserveValueOnMaxDecrease?: boolean`

No change to `clampNumeric(...)`.

---

## 3) `src/data/schemas/v2/systemDefaults.ts`
**Change type:** modify

### Responsibility
Defines the default `sys_world` entity and its authored Cave state.

### Required changes
For `state.food` and `state.heat` on `DEFAULT_WORLD_ENTITY`:
- keep bootstrap `value = minCapacity`
- keep bootstrap `max = minCapacity`
- add `preserveValueOnMaxDecrease: true`

### Logic
Only Cave food and heat get the new flag in this task.

All existing world auto-request authored defaults remain in this file.

### Interface / contract
At bootstrap:
- `sys_world.state.food.value === minCapacity`
- `sys_world.state.food.max === minCapacity`
- `sys_world.state.food.preserveValueOnMaxDecrease === true`
- the same is true for `heat`

No other default world state entry gains this flag.

---

## 4) `src/data/schemas/v2/worldAutoRequestMaxRules.ts`
**Change type:** modify

### Responsibility
Builds the Cave max-alignment rules that run inside the world auto-request sequence.

### Required changes
Replace the current grow-only rule set with a mutually exclusive two-rule alignment set.

### Logic
The file must continue to return `BehaviorRule[]` and continue to use the current input signature.

For each resource/index, emit exactly these rules in this order:

1. **Set-floor-max rule**
   - id: `sys_auto_req_<resource>_set_floor_max_<index>`
   - sort key: immediately after the target/need rule
   - conditions:
     - existing timer-ready condition
     - `target < minCapacity`
     - `state.<resource>.max != minCapacity`
   - action:
     - `MUTATE self.state.<resource>.max SET minCapacity`

2. **Set-target-max rule**
   - id: `sys_auto_req_<resource>_set_target_max_<index>`
   - sort key: immediately after the floor-max rule
   - conditions:
     - existing timer-ready condition
     - `target >= minCapacity`
     - `state.<resource>.max != target`
   - action:
     - `MUTATE self.state.<resource>.max SET target`

These two rules are mutually exclusive by construction.

### Interface / contract
The builder output must align Cave max to `max(minCapacity, target)` without introducing overlapping max-mutation rules in the same behavior pass.

The file must not emit any grow-only or never-shrink semantics after this change.

---

## 5) `src/data/schemas/v2/worldClampRules.ts`
**Change type:** modify

### Responsibility
Defines Cave food/heat low/high clamps and comfort computation.

### Required changes
Keep the existing low clamps unchanged.

Modify the food and heat **high-clamp** conditions so they do **not** execute when the corresponding state entry has `preserveValueOnMaxDecrease === true`.

### Logic
The high clamp for each resource must require both:
- `value > max`
- `preserveValueOnMaxDecrease` is not enabled for that entry

Because the runtime behavior resolver already treats booleans as numeric `1/0`, this guard must be expressed using the existing logic-token path system and no new expression feature.

### Interface / contract
For `sys_world.state.food` and `sys_world.state.heat`, the high clamps must no longer destroy preserved surplus after a max decrease.

Comfort rules remain unchanged.

---

## 6) `src/engine/runtime/persistence/hydrateRuntime.ts`
**Change type:** modify

### Responsibility
Rebuilds a fresh runtime from serialized save data.

### Required changes
Add a `sys_world` hydration special case for raw saved system-world entities.

### Logic
When hydrating an entity:
- if the entity is **not** raw `sys_world`, keep the current logic unchanged
- if the entity **is** raw `sys_world` (id `sys_world`, no blueprint flyweight rehydration path), do the following:

1. Parse the current system config with `SysConfigSchema` from the runtime cartridge settings.
2. Deep-clone the current `config.world` as the canonical base world entity.
3. Preserve the saved entity id.
4. For `state`:
   - start from the cloned current base state
   - merge saved runtime values using the existing state-merge mechanism so current authored fields remain authoritative
   - additionally preserve saved numeric `max` values for state entries when present, because raw saved `sys_world` stores runtime max and the new Cave behavior must restore the player’s actual stock/max situation
5. For other existing stateful keys already treated as runtime data (`physics`, `cave`, `run`, `permanent`, `thought`, etc.), overlay the saved values onto the cloned current base entity
6. Do **not** carry forward saved `tags`, `passiveEffects`, `behavior`, or other stale structural fields from the raw saved `sys_world`; the current config world definition is authoritative for those

### Interface / contract
After hydrate:
- `sys_world` behavior comes from the current config/world defaults
- `sys_world` state values come from the save where appropriate
- `sys_world.state.food.preserveValueOnMaxDecrease === true`
- stale saved Cave rules do not survive hydration

No change to flyweight blueprint hydration.

---

## 7) `src/ui/runtime/world/selection/cave/CaveSustainmentSection.tsx`
**Change type:** modify

### Responsibility
Renders the Cave food/heat sustainment section in the selection card.

### Required changes
Replace the hardcoded ` / 100` text for food and heat with live current/max rendering driven by the existing entity-state-link text mechanism.

### Logic
Reuse the existing live-binding infrastructure already used elsewhere in the selection UI:
- bind food text to `state.food.value` and `state.food.max`
- bind heat text to `state.heat.value` and `state.heat.max`
- keep the existing bar fill refs, labels, tooltip, and layout

No new store, hook family, or business logic is introduced here.

### Interface / contract
The section must display live `current / max` values for food and heat.

It must not display a hardcoded denominator.

## Files intentionally not changed

### `src/data/schemas/v2/worldRuleBuilders.ts`
No change.

Reason:
- the existing target and need formulas are already correct
- the file already sequences target/need before max rules and transfer rules
- changing `worldAutoRequestMaxRules.ts` is sufficient

### `src/engine/compiler/abilities/autoRequestRuleBuilder.ts`
No change.

Reason:
- the existing transfer-rule builder already matches the required non-immediate refill contract

### `src/engine/runtime/handlers/capacityUtils.ts`
No change.

Reason:
- current headroom calculation already blocks refill when Cave is at or above the new max

### `src/engine/runtime/handlers/ResolveTransferHandler.ts`
No change.

Reason:
- current resolve behavior already preserves late arrivals above max, which is required

### `src/ui/runtime/world/selection/cave/CaveCardView.tsx`
No change.

Reason:
- the existing food/heat bar refs already bind to live `state.food.max` and `state.heat.max`

## Test plan

## 1) `src/engine/runtime/handlers/UpdateStateHandler.test.ts`
**Change type:** modify

### Responsibility
Locks the command-handler behavior for max changes.

### Required test changes
Add a case proving:
- when a state entry has `preserveValueOnMaxDecrease: true`
- and `max` decreases below the current `value`
- the handler updates `max`
- and leaves `value` unchanged

Keep the existing hard-clamp and scale-on-max-change cases unchanged.

### Contract
This is a unit test for the handler behavior only.

---

## 2) `src/data/schemas/v2/worldRuleBuilders.test.ts`
**Change type:** modify

### Responsibility
Verifies emitted world auto-request rule/state structure.

### Required test changes
Update the rule-shape assertions so that `buildWorldAutoRequestRules("food", 0)` contains, in order:
1. `sys_auto_req_food_need_0`
2. `sys_auto_req_food_set_floor_max_0`
3. `sys_auto_req_food_set_target_max_0`
4. `sys_auto_req_food_xfer_0`

Also verify:
- the floor rule writes `self.state.food.max = self.state.auto_req_food_min_capacity_0.value`
- the target rule writes `self.state.food.max = self.state.auto_req_food_target_0.value`
- the transfer rule remains sourced from `tag:storage:food`, targeted to `self`, and non-immediate

### Contract
Unit test only. No runtime simulation.

---

## 3) `src/engine/runtime/runtimeWorld.test.ts`
**Change type:** modify

### Responsibility
Verifies default bootstrap state for singleton system entities.

### Required test changes
Extend the `sys_world` bootstrap assertions to verify:
- `food.preserveValueOnMaxDecrease === true`
- `heat.preserveValueOnMaxDecrease === true`
- existing `value === max === minCapacity` bootstrap behavior remains true

### Contract
Bootstrap integration only. No tick simulation.

---

## 4) `src/engine/runtime/behavior.elasticCapacity.integration.test.ts`
**Change type:** modify

### Responsibility
Verifies Cave max-alignment behavior through the real runtime tick and command pipeline.

### Required test changes
Add or replace coverage with these cases:

1. **Shrink preserves surplus**
   Given Cave food has `value > target` and a larger current max,
   when body count falls and the auto-request cadence executes,
   then:
   - Cave `food.max` shrinks to the new aligned max
   - Cave `food.value` is unchanged

2. **No refill while surplus remains**
   In the same overstocked state,
   when the auto-request cadence executes,
   then no pending food transfer is emitted.

3. **Refill resumes after surplus is consumed below target**
   Given the same runtime after shrink,
   when Cave food is later reduced below the live target and the cadence executes again,
   then a food transfer is emitted from generic storage.

### Contract
Real runtime integration test:
- no DOM
- no mocked ECS world
- real command pipeline

---

## 5) `src/engine/runtime/persistence/hydrateRuntime.test.ts`
**Change type:** modify

### Responsibility
Verifies runtime hydration behavior.

### Required test changes
Add a case proving that a raw saved `sys_world` is rebased onto the current config world definition while preserving saved Cave runtime state.

The test must verify all of the following after hydrate:
- `sys_world.state.food.preserveValueOnMaxDecrease === true`
- saved `food.value` is preserved
- saved `food.max` is preserved
- current Cave behavior rule ids are present
- stale saved Cave structural fields are not carried through

### Contract
Hydration integration test only. No gameplay ticking required.

---

## 6) `src/ui/runtime/world/selection/cave/CaveSustainmentSection.test.tsx` **(new)**
**Change type:** add

### Responsibility
Verifies Cave sustainment presentation and live binding.

### Required test coverage
Add a view test proving that the section renders live food and heat `current / max` text from runtime state, and does not render a hardcoded ` / 100` denominator.

### Contract
View test only:
- verify presentation and wiring
- do not test business logic

## Acceptance criteria
The implementation is complete only when all of the following are true:

1. Cave `target` and `need` remain driven by the existing demand-window formula.
2. Cave `food.max` and `heat.max` align to `max(minCapacity, target)` on the existing world auto-request cadence.
3. Lowering Cave max does not lower existing Cave stock.
4. Cave food/heat surplus above max is legal and persists until consumed.
5. World high-clamp rules no longer destroy preserved Cave surplus.
6. Refill requests stop while Cave stock remains above the current target and resume only after stock falls below target.
7. Existing transfer headroom and resolve semantics remain unchanged.
8. Hydrating an old raw saved `sys_world` yields the current Cave behavior and current state-entry metadata.
9. The Cave sustainment UI displays live `current / max` text for food and heat.
10. All modified and added tests are green.

## Retained behavior and risks
1. **Late arrivals can still land above max**
   This is intentional and follows the unchanged `ResolveTransferHandler` behavior.

2. **Comfort remains saturated while overfull**
   Because comfort still uses `value / max` and is clamped to `1`, Cave remains fully comfortable while it is above the new max. This task does not change that.

3. **Save migration is narrow**
   This task only rebases raw `sys_world` during hydrate. It does not introduce a generic migration framework for every raw entity.

## Final implementation rule
Use the existing world auto-request rule chain, existing mutate-to-max command path, existing transfer headroom/resolve semantics, existing state-merge helpers, and existing entity-state-link UI wiring. Do not introduce a parallel Cave resource system.
