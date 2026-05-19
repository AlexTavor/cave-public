# Low-Level Design: Parent Entity Pulse Gating, Cycle Resource Gating, Cycle Bar Visibility, and Flyweight Hydration Fixes

## 1. Document Purpose

This document defines the exact low-level design for the following fixes in the existing codebase:

1. A parent entity display must not pulse when the total allocated draw in its descendant subtree is zero.
2. A cycle that has `resourceCosts` must draw no power until the required resource reservoir is full.
3. When a cycle-cost reservoir is shown on the job card, the cycle progress bar must also be shown.
4. Flyweight hydration must not discard blueprint-defined state fields when the saved state only contains a partial state entry.

This design is intentionally narrow. It changes only the files required to satisfy the above behavior using existing runtime, compiler, and display mechanisms.

---

## 2. Governing Constraints

This design must comply with the canonical project rules already supplied with the task:

- Runtime state is owned by ECS/runtime and all mutations must continue to flow through the command pipeline.
- UI must remain observational only.
- Scope must remain narrow; no unrelated refactors or speculative abstractions are allowed.
- Tests must cover behavior, negative paths, and edge cases, and must read like specifications.

Accordingly, this design does **not** add any direct UI mutation path, any mid-tick mutation, or any new system phase.

---

## 3. Verified Current Implementation

The following current behaviors were verified by reading the code.

### 3.1 Cycle resource-cost compilation

`src/engine/compiler/abilities/cycleResourceCostCompiler.ts` currently:

- groups authored `resourceCosts` by resource
- creates reservoir state for each grouped resource
- computes `vals_cycle_cost_total_<resource>`
- computes `cycle_cost_req_<resource>_timer` and `cycle_cost_req_<resource>_need`
- injects `has_cycle_cost_*` conditions into:
  - `sys_cycle_accumulate`
  - `sys_cycle_reset`
  - `sys_cycle_transition`
- emits:
  - `sys_cycle_cost_consume_<resource>`
  - `sys_cycle_cost_req_<resource>`
- appends a display bar for the resource reservoir when `visible !== false`

What it does **not** do:

- it does **not** gate `powerSink.baseDemand` while the resource reservoir is short
- it does **not** force a cycle bar to exist when only a cycle-cost reservoir bar is authored

### 3.2 Cycle progress display path

`src/ui/runtime/world/selection/job-card/jobAnalysis.cycle.ts` resolves cycle progress only from a display bar whose key is exactly `state.cycle`.

Therefore, if a blueprint shows a visible cycle-cost reservoir bar but has no `state.cycle` bar, the job card can show the reservoir without showing cycle progress.

### 3.3 Flyweight hydration

`src/engine/runtime/persistence/flyweightPersistence.ts` currently rebuilds blueprint-backed entities from the blueprint and overlays saved stateful components.

For `state`, it currently performs a **top-level shallow merge**:

- blueprint state is cloned into `base`
- saved state is sanitized
- merge result is `{ ...base, ...saved }`

This means a partial saved entry such as:

- `coin: { value: 0, visible: false }`

replaces the full blueprint entry such as:

- `coin: { value: 0, max: 20, visible: false, allowDeposit: true, allowWithdraw: false, priority: 1 }`

As a result, blueprint-defined fields such as `max`, `allowDeposit`, `allowWithdraw`, and `priority` are lost during hydrate.

### 3.4 Parent entity pulse path

`src/engine/phaser/display/DisplayInstanceManagerTick.ts` currently computes entity pulse as follows:

- it calls `isDisplayActive(...)`
- if active, it passes `deps.pulseEngine.getDemandPulse(spec.entityId, timeMs)` into the visual instance
- if inactive, it passes `0`

`src/engine/phaser/display/displayActivity.ts` currently evaluates activity as follows:

- if `readEntityCycle(entity)` returns `null`, it returns `true` immediately
- if the entity has a readable cycle, it suppresses pulse only for:
  - `powerSink.status === "blackout"`
  - `state.is_depleted.value === 1`
  - falsy `state.cycle_active.value`

`src/engine/phaser/display/modules/backgroundCycleReader.ts` returns `null` when the entity has no cycle with finite `value`, finite positive `max`, and a valid `state.cycle` shape.

Therefore, any non-cycle entity is currently treated as display-active without regard to:

- whether it is acting as a parent in the runtime hierarchy
- whether any descendant sink is actually drawing power
- whether the aggregate descendant draw is zero

This is the direct cause of parent entities continuing to pulse even when they are no longer connected to any active downstream draw.

---

## 4. Problem Statements and Root Causes

### 4.1 `lodging_hommlet` never receives coin

Root cause: flyweight hydrate overwrites a full blueprint storage entry with a partial saved state entry.

Impact:

- `lodging_hommlet.state.coin.max` can be lost after hydrate.
- storage auto-request logic depends on the storage entry retaining its authored shape.
- once `max` is lost, the auto-request path cannot correctly compute missing capacity.

### 4.2 Cycle job draws power before cycle-cost reservoir is filled

Root cause: cycle-cost compilation already gates cycle accumulation and completion, but it does not gate `powerSink.baseDemand` while the cycle-cost reservoir is still below the required total.

Impact:

- the job can draw body, mind, or social power before it is eligible to progress.
- this violates the required contract: no power draw before the reservoir is full.

### 4.3 Cycle-cost reservoir bar appears without cycle progress bar

Root cause: cycle progress is shown only when `display.bars` contains `state.cycle`; visible cycle-cost compilation currently appends only the resource reservoir bar.

Impact:

- the UI can show the required resource for a cycle without showing the cycle itself.

### 4.4 Parent entity pulses even when total downstream draw is zero

Root cause: non-cycle entities are treated as display-active unconditionally. Parent entities are not gated by descendant draw.

Impact:

- a parent entity can keep receiving a non-zero pulse value even when no descendant sink in its subtree is drawing any body, mind, or social power.
- the display continues to communicate activity where none exists.

---

## 5. Design Goals

The implementation must satisfy the following exact contract.

### 5.1 Hydration contract

For blueprint-backed entities:

- hydrate must preserve blueprint-defined state-entry fields unless the saved state explicitly overrides them with a non-null value.
- sanitized saved `vals_*` entries must continue to be ignored.
- other stateful components must keep current behavior.

### 5.2 Cycle-cost gating contract

For any cycle with one or more grouped `resourceCosts`:

- if `self.state.<resource>.value < self.state.vals_cycle_cost_total_<resource>.value`, then the cycle must draw zero power from all authored cycle input attributes.
- if the grouped reservoir becomes sufficient, power draw must resume through the existing passive-effect and power-sink pipeline; no special resume state may be introduced.
- cycle accumulation, reset, and transition gating must remain unchanged.

### 5.3 Cycle display contract

If cycle-cost compilation appends any visible reservoir bar, the compiled display bars must also contain `state.cycle`.

This is a compile-time responsibility, not a UI-layer inference.

### 5.4 Parent entity pulse contract

For display pulse activity:

- entities with a readable cycle must keep the current activity contract.
- non-cycle entities that are **not** parents must keep the current activity contract.
- a non-cycle entity that **is** a parent must pulse if and only if the sum of descendant `allocatedDraw.body`, `allocatedDraw.mind`, and `allocatedDraw.social` is greater than `0`.
- the descendant check must include the full descendant subtree, not just direct children.
- missing, non-numeric, negative, or absent `allocatedDraw` values must be treated as `0`.
- the activity check must be read-only and must not write runtime state.

The full-subtree requirement is mandatory because a parent can remain part of an active routed chain due to deeper descendants even when an immediate child has no own draw.

---

## 6. Production File Changes

No new production files are required.

### 6.1 `src/engine/runtime/persistence/flyweightPersistence.ts`

#### Responsibility

Hydrate and serialize blueprint-backed runtime entities while preserving the blueprint-defined shape of stateful components.

#### Existing interface

The exported interfaces remain unchanged:

- `serializeFlyweightEntity(entity): RuntimeEntity`
- `hydrateFlyweightEntity(runtime, savedEntity): RuntimeEntity`

No caller contract changes.

#### Required logic change

Only the internal `state` overlay semantics change.

##### Current behavior to replace

`mergeStateForHydrate(baseState, savedState)` currently shallow-merges state entries at the top level.

##### New behavior

`mergeStateForHydrate(baseState, savedState)` must merge **per state entry**.

For each sanitized saved state key:

1. If the saved entry is not a plain object, replace the base entry with the saved entry clone.
2. If the saved entry is a plain object and the base entry is also a plain object, merge field-by-field.
3. During field merge:
   - `undefined` from saved data must not overwrite blueprint data.
   - `null` from saved data must not overwrite blueprint data.
   - any other saved value must overwrite the blueprint value.
4. Keys absent from saved data must remain exactly as authored in the blueprint clone.

##### Why `null` must be treated as absent

The authored runtime state schema uses `GameValueSchema` and does not define `null` as a valid state field value. Therefore, a hydrated `null` must not erase a valid authored `max` or other state metadata.

#### Postconditions

After hydrate:

- blueprint-defined `max`, `allowDeposit`, `allowWithdraw`, `priority`, and `scaleOnMaxChange` survive if the save omitted them
- saved `value` and `visible` still overlay the blueprint entry when present
- `vals_*` saved entries remain excluded
- non-state stateful components keep current overlay behavior

#### Error handling

No new logging path is introduced. Invalid blueprint lookup behavior remains unchanged.

---

### 6.2 `src/engine/compiler/abilities/cycleResourceCostRuleFactories.ts`

#### Responsibility

Build behavior rules used by cycle resource-cost compilation.

#### Existing interface

Existing exports remain unchanged.

#### Required addition

Add one new exported factory for cycle-cost power gating.

##### New factory contract

Factory name:

- `createCycleCostPowerGateRule`

Inputs:

- `resource`: grouped resource key, for example `coin`
- `amountRef`: exact total required amount reference, for example `self.state.vals_cycle_cost_total_coin.value`
- `demandAttributes`: array of authored cycle input attributes to gate; valid values are `body`, `mind`, `social`

Output:

- one `BehaviorRule`

##### Exact rule semantics

Rule id:

- `sys_cycle_cost_power_gate_<resource>`

Rule sort key:

- `sys_000`

Rule conditions:

- one condition only
- condition id: `missing_cycle_cost_<resource>`
- condition expression:
  - `self.state.<resource>.value < amountRef`

Rule actions:

- one `MUTATE SET 0` action for each attribute in `demandAttributes`
- target form:
  - `self.powerSink.baseDemand.<attribute>`

##### Required exclusions

- the rule must not mutate `maxDemand`
- the rule must not mutate `throttle`
- the rule must not introduce any state key or fact

#### Why this file changes

Rule construction is already centralized in this file for cycle-cost request and consume rules. The power-gate rule must be added in the same location to keep cycle-cost rule authoring coherent and local.

---

### 6.3 `src/engine/compiler/abilities/cycleResourceCostCompiler.ts`

#### Responsibility

Compile authored cycle resource-cost config into runtime state, passive effects, display bars, and behavior rules.

#### Existing interface

The exported interface remains unchanged:

- `cycleResourceCostCompiler(draft, config): void`

#### Required logic change A: power gating

For each grouped resource reservoir:

1. Keep all existing grouped-total, need, timer, consume, and request logic unchanged.
2. Determine the authored cycle input attributes from `config.inputs`.
3. The gated attribute set is exactly the subset of `body`, `mind`, `social` for which `config.inputs[attribute]` is defined.
4. If the gated attribute set is non-empty, append the rule produced by `createCycleCostPowerGateRule(resource, amountRef, gatedAttributes)`.

##### Why attributes must come from `config.inputs`

The existing conversion input gate derives demand attributes by scanning passive effects for positive literal values. That is not sufficient here because a cycle input may have:

- `base = 0`
- `perBody > 0` and/or `multPerBody > 0`

In that case, a passive-effect scan for positive literal values is not reliable. `config.inputs` is the authored source of truth and is already present in this compiler.

##### Required outcome

When the grouped cycle-cost reservoir is short, behavior emits `UPDATE_POWER_SINK` commands that set authored cycle input `baseDemand` values to zero.

When the grouped reservoir is full, the power-gate rule stops firing. The existing `PassiveEffectsSystem` continues to be the mechanism that restores authored base demand on subsequent ticks.

No new restore rule may be introduced.

#### Required logic change B: cycle bar exposure

When at least one grouped cycle-cost reservoir is visible and `components.display` exists:

1. Append the visible resource reservoir bar exactly as today.
2. Call the existing `appendCycleBar(draft)` helper.

This file must reuse the existing `appendCycleBar` helper from `cycleCompilerBar.ts`.

No UI-layer inference and no duplicate bar insertion logic may be added.

#### Required non-changes

This file must **not**:

- change cycle completion rules
- change request cadence logic
- create a display component when one does not already exist
- move cycle-bar logic into UI code
- alter the grouped-resource model

---

### 6.4 `src/engine/phaser/display/displayActivity.ts`

#### Responsibility

Resolve whether an entity should receive a non-zero display pulse value during display ticking.

#### Existing interface

Current export:

- `isDisplayActive(entity: RuntimeEntity): boolean`

#### Required interface change

Change the export to accept runtime context:

- `isDisplayActive(entity: RuntimeEntity, runtime: Runtime | null): boolean`

No new export is required.

#### Required logic change

Keep the existing cycle-specific behavior intact, then add parent gating for non-cycle entities.

##### Step 1: keep the current cycle path unchanged

If `readEntityCycle(entity)` returns a readable cycle:

- return `false` for blackout sinks exactly as today
- return `false` for depleted one-off entities exactly as today
- return `false` when `cycle_active` is falsy exactly as today
- otherwise return `true`

##### Step 2: identify whether the non-cycle entity is a parent

For entities where `readEntityCycle(entity)` returns `null`:

1. If `runtime` is `null`, return `true`.
2. If `entity.id` is absent or empty, return `true`.
3. Build the parent-to-children index by reusing the existing `collectChildrenByParent(runtime.getEntities())` helper from `src/game/systems/energy/parentThrottle.ts`.
4. If the entity id does not exist as a key in that map, return `true`.

This preserves existing behavior for non-parent, non-cycle entities.

##### Step 3: compute descendant aggregate allocated draw

For parent entities:

1. Traverse the full descendant subtree rooted at `entity.id`.
2. Sum positive numeric values from each descendant's:
   - `powerSink.allocatedDraw.body`
   - `powerSink.allocatedDraw.mind`
   - `powerSink.allocatedDraw.social`
3. Treat missing, non-numeric, `undefined`, `null`, and negative values as `0`.
4. Return `true` if the total is greater than `0`.
5. Return `false` if the total is exactly `0`.

##### Step 4: cycle-safety during traversal

The subtree traversal must use a visited-id set.

If a parent cycle is encountered in runtime data:

- traversal must stop following the repeated branch
- the function must log loudly with `console.error`
- the function must still return a deterministic boolean based on the draw collected from the non-repeated branches already visited

This matches the existing project rule that illegal states must log loudly and must not silently loop forever.

#### Why this file changes

This file already owns the display-activity decision. The bug is activity eligibility, not pulse waveform generation and not instance rendering.

The fix belongs here because it changes the boolean contract that determines whether a non-zero pulse is allowed.

#### Required non-changes

This file must **not**:

- mutate runtime state
- create any cache outside the function scope
- change cycle-entity activity semantics
- inspect or mutate UI-only state

---

### 6.5 `src/engine/phaser/display/DisplayInstanceManagerTick.ts`

#### Responsibility

Tick one display instance safely and provide the resolved pulse value.

#### Existing interface

The exported interface remains unchanged:

- `tickInstanceSafe(instance, deps, spec, entity, timeMs, deltaMs): void`

#### Required logic change

Pass runtime into the activity resolver.

##### Current behavior to replace

The file currently calls:

- `isDisplayActive(entity)`

##### New behavior

The file must call:

- `isDisplayActive(entity, deps.getRuntime())`

No other logic in this file changes.

#### Why this file changes

`displayActivity.ts` needs runtime access to inspect parent-child relationships. `DisplayInstanceManagerTick.ts` already owns the call site that has access to `deps.getRuntime()`.

---

## 7. Files Explicitly Not Changed

These files already provide the correct mechanism and must remain unchanged.

### 7.1 `src/engine/compiler/abilities/cycleCompilerBar.ts`

Reason:

- it already owns the `appendCycleBar` helper
- it already deduplicates the cycle bar
- `cycleResourceCostCompiler.ts` must reuse it rather than duplicate its behavior

### 7.2 `src/ui/runtime/world/selection/job-card/jobAnalysis.cycle.ts`

Reason:

- the UI already resolves cycle progress from a compiled `state.cycle` display bar
- the bug is missing compile output, not missing UI logic

### 7.3 `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts`

Reason:

- it already resolves cycle-cost reservoir bars from `display.bars`
- it is not responsible for deciding whether a cycle bar should exist

### 7.4 `src/game/systems/passive-effects/*`

Reason:

- passive effects already provide the existing base-demand restoration path
- the required fix is to transiently zero `baseDemand` via behavior rules while the reservoir is short, not to create a second demand-authoring mechanism

### 7.5 `src/engine/runtime/handlers/UpdatePowerSinkHandler.ts`

Reason:

- it already merges per-attribute `baseDemand` updates correctly
- the defect is rule emission, not power-sink update handling

---

## 8. Test Design

No new test infrastructure is required. Existing test style and factories must be reused.

### 8.1 `src/engine/runtime/persistence/hydrateRuntime.flyweight.test.ts`

#### Responsibility

Integration-style coverage for blueprint-backed hydrate behavior.

#### Add test case A

Name:

- `preserves blueprint-defined state entry metadata when saved state entry is partial`

Setup:

- blueprint-backed entity with storage-like state entry containing `value`, `max`, `visible`, `allowDeposit`, `allowWithdraw`, `priority`
- saved entity contains only `value` and `visible` for that same key

Assertions:

- hydrated entity keeps blueprint `max`
- hydrated entity keeps blueprint `allowDeposit`
- hydrated entity keeps blueprint `allowWithdraw`
- hydrated entity keeps blueprint `priority`
- hydrated entity uses saved `value`
- hydrated entity uses saved `visible`

#### Add test case B

Name:

- `ignores saved null fields when blueprint provides a valid state field`

Setup:

- blueprint-backed entity with `state.cycle.max = 50`
- saved entity contains `state.cycle.max = null` and a valid saved `value`

Assertions:

- hydrated `state.cycle.max === 50`
- hydrated `state.cycle.value` uses the saved value

---

### 8.2 `src/engine/compiler/abilities/cycleResourceCostCompiler.test.ts`

#### Responsibility

Unit coverage for compiler output.

#### Add test case A

Name:

- `adds cycle bar when a visible cycle-cost reservoir bar is compiled`

Setup:

- compiled cycle ability with:
  - visible resource cost
  - `showProgressBar` omitted or `false`
  - existing display component

Assertions:

- `display.bars` contains the resource reservoir bar
- `display.bars` contains exactly one `state.cycle` bar

#### Add test case B

Name:

- `adds cycle-cost power gate rule for authored cycle input attributes`

Setup:

- compiled cycle ability with inputs on one or more attributes and one visible or hidden resource cost

Assertions:

- `behavior.rules` contains `sys_cycle_cost_power_gate_<resource>`
- the rule condition compares the grouped resource value against `state.vals_cycle_cost_total_<resource>.value`
- the rule actions set `self.powerSink.baseDemand.<attribute>` to `0` for each authored input attribute
- no action targets `maxDemand`

#### Add test case C

Name:

- `does not add a cycle-cost power gate rule when the cycle has no authored input attributes`

Setup:

- cycle with resource costs and empty `inputs`

Assertions:

- no rule id starting with `sys_cycle_cost_power_gate_` exists

---

### 8.3 `src/engine/runtime/systems/behavior/cycleResourceCostBehavior.test.ts`

#### Responsibility

Behavior-system coverage for compiled cycle-cost rules.

#### Extend existing insufficient-reservoir case

Add assertions:

- emitted commands include `UPDATE_POWER_SINK` for each authored input attribute with `baseDemand.<attribute> = 0`
- no consume command is emitted
- no cycle reset command is emitted

#### Add sufficient-reservoir negative-path assertion

For the existing sufficient-reservoir case, add:

- no `UPDATE_POWER_SINK` command setting `baseDemand` to zero is emitted

This proves the gate is active only while the reservoir is short.

---

### 8.4 `src/engine/phaser/display/displayActivity.test.ts`

#### Responsibility

Unit coverage for display-activity resolution.

#### Preserve existing cycle tests

The existing tests covering:

- active cycle entities
- blackout cycle entities
- depleted one-off entities
- non-cycle entities remaining active

must remain, with signatures updated for the new runtime parameter where needed.

#### Add test case A

Name:

- `keeps a parent entity active when a descendant subtree has positive allocated draw`

Setup:

- runtime with a non-cycle parent entity
- at least one descendant sink with positive allocated draw on any attribute

Assertions:

- `isDisplayActive(parent, runtime)` returns `true`

#### Add test case B

Name:

- `stops a parent entity pulse when descendant subtree draw is zero`

Setup:

- runtime with a non-cycle parent entity
- descendants exist
- every descendant allocated draw is zero or absent

Assertions:

- `isDisplayActive(parent, runtime)` returns `false`

#### Add test case C

Name:

- `keeps a non-parent non-cycle entity active`

Setup:

- runtime with a non-cycle entity that has no children

Assertions:

- `isDisplayActive(entity, runtime)` returns `true`

#### Add test case D

Name:

- `counts deeper descendants, not only direct children`

Setup:

- runtime with hierarchy `root -> intermediate -> sink`
- `intermediate` has no own allocated draw
- `sink` has positive allocated draw

Assertions:

- `isDisplayActive(root, runtime)` returns `true`

#### Add test case E

Name:

- `returns true for non-cycle entities when runtime is unavailable`

Setup:

- non-cycle entity
- runtime argument is `null`

Assertions:

- `isDisplayActive(entity, null)` returns `true`

---

### 8.5 `src/engine/phaser/display/DisplayInstanceManagerTick.test.ts`

#### Responsibility

Unit coverage for pulse-value wiring from activity resolution into instance ticking.

#### Preserve existing inactive-cycle case

The existing case that verifies `0` pulse for inactive cycle entities remains.

#### Add test case A

Name:

- `passes a zero pulse to inactive parent entities when descendant draw is zero`

Setup:

- runtime containing a non-cycle parent entity with descendants whose total allocated draw is zero
- display manager deps return that runtime
- pulse engine returns a non-zero waveform sample

Assertions:

- the pulse argument passed into `instance.tick(...)` is `0`

#### Add test case B

Name:

- `passes the sampled pulse to parent entities when descendant draw is positive`

Setup:

- runtime containing a non-cycle parent entity with positive descendant allocated draw
- pulse engine returns a known non-zero waveform sample

Assertions:

- the pulse argument passed into `instance.tick(...)` equals the sampled non-zero value

---

## 9. Acceptance Criteria

The implementation is complete only when all of the following are true.

### 9.1 Runtime hydration

- a blueprint-backed partial saved state entry no longer removes authored metadata fields
- `lodging_hommlet`-style storage entries retain their authored capacity and permissions after hydrate
- `cycle.max` authored in the blueprint is not erased by saved `null`

### 9.2 Cycle-cost behavior

- an insufficient cycle-cost reservoir causes zero power draw on authored cycle input attributes
- the cycle still does not accumulate until the reservoir is full
- once the reservoir is full, power draw resumes through the existing passive-effect and power-sink flow
- no new runtime state keys or systems are introduced

### 9.3 UI behavior

- when a cycle-cost reservoir bar is visible, the compiled display bars also include `state.cycle`
- the UI shows cycle progress through the existing job-card path with no new UI logic

### 9.4 Parent entity pulse behavior

- cycle entities retain their existing pulse gating behavior
- non-parent non-cycle entities retain their existing pulse behavior
- parent entities stop receiving a non-zero pulse when descendant subtree total draw is zero
- parent entities receive a non-zero pulse when descendant subtree total draw is positive
- deeper descendants correctly keep ancestors active

### 9.5 Scope discipline

- only the files listed in this document are changed
- no unrelated refactors are introduced
- all affected tests are green

---

## 10. Final File List

### Production files changed

1. `src/engine/runtime/persistence/flyweightPersistence.ts`
2. `src/engine/compiler/abilities/cycleResourceCostRuleFactories.ts`
3. `src/engine/compiler/abilities/cycleResourceCostCompiler.ts`
4. `src/engine/phaser/display/displayActivity.ts`
5. `src/engine/phaser/display/DisplayInstanceManagerTick.ts`

### Test files changed

6. `src/engine/runtime/persistence/hydrateRuntime.flyweight.test.ts`
7. `src/engine/compiler/abilities/cycleResourceCostCompiler.test.ts`
8. `src/engine/runtime/systems/behavior/cycleResourceCostBehavior.test.ts`
9. `src/engine/phaser/display/displayActivity.test.ts`
10. `src/engine/phaser/display/DisplayInstanceManagerTick.test.ts`

### Files intentionally unchanged

- `src/engine/compiler/abilities/cycleCompilerBar.ts`
- `src/ui/runtime/world/selection/job-card/jobAnalysis.cycle.ts`
- `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts`
- `src/game/systems/passive-effects/*`
- `src/engine/runtime/handlers/UpdatePowerSinkHandler.ts`
