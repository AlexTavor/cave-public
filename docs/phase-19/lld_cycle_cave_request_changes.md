# LLD: Cycle resource-cost request cadence and Cave body-provider demand buffer

## 1. Purpose

Implement two agreed changes, and nothing else:

1. **Cycle resource costs** must request resources using an authored **rate** and **cadence**, instead of immediately trying to fill the full local reservoir.
2. **Cave (`sys_world`)** must stop acting as generic storage. It must become a **body-only provider** with refill demand driven by its own authored demand plus body-added demand over a buffer window.

This design is intentionally narrow. It reuses the existing authored data flow, compiler patterns, transfer rules, and test style already present in the codebase.

---

## 2. Why

### 2.1 Cycle resource costs

Current cycle-cost behavior is compiled in `engine/compiler/abilities/cycleResourceCostCompiler.ts` and `engine/compiler/abilities/cycleResourceCostRuleFactories.ts`.

Today, each compiled cycle-cost reservoir:
- computes `need = total_cost - local_value`,
- waits for a 1-second timer,
- requests the **entire need** from `tag:storage:<resource>`.

That makes large costs behave like immediate claimers. A large action can strip available supply because its request amount is the full outstanding need, not an authored per-second acquisition rate.

### 2.2 Cave

Current Cave defaults are authored through `data/schemas/v2/systemDefaults.ts` and `data/schemas/v2/worldRuleBuilders.ts`.

Today, `sys_world`:
- is tagged as `storage:food` and `storage:heat`, so any generic `tag:storage:<resource>` pull can drain it,
- refills by computing `need = max - current` once per second,
- is also the direct upkeep source for bodies via `data/raw/example/modules/newbody.bp`.

That mixes two roles that must be separate:
- an internal Cave reserve for body survival,
- the public storage economy used by everything else.

The agreed design is to make Cave a **body-only provider** and refill it toward a **demand window target**, not merely toward `max`.

---

## 3. Scope and non-goals

### In scope

- Add authored cycle-cost request-rate and request-cadence fields.
- Compile those fields into capped request behavior.
- Move body upkeep sourcing from `sys_world` ID targeting to a dedicated provider tag.
- Remove Cave from generic `tag:storage:<resource>` sourcing.
- Add Cave demand-window data to defaults only.
- Change Cave refill need calculation from `max - current` to demand-window targeting.
- Add/adjust tests that lock the contract.

### Explicitly out of scope

- No change to transfer semantics in `TransferHandler`, `ResolveTransferHandler`, or `transferLogic`.
- No change to `upkeepCompiler.ts` request-source mechanics.
- No new Cave editor surface. Cave data remains authored via defaults only.
- No new system-config schema for world tuning. `config.settings.world` is already an untyped record in `data/schemas/v2/config.ts`.
- No change to passive-effect resolution semantics outside the minimum needed for these features. In particular, this task does **not** redesign passive effects or global transfer reservation.
- No balance pass beyond introducing the authored fields and default Cave demand-window data.

---

## 4. Contract

### 4.1 Cycle request contract

For each compiled cycle-cost reservoir grouped by resource:

- The reservoir remains a local storage state entry on the entity.
- The reservoir still requests from `tag:storage:<resource>`.
- The request is no longer `full outstanding need`.
- The request amount per dispatch is capped by:

`request_limit = requestPerSecondAtFullThrottle * requestCadenceSeconds * throttle_factor`

Where:
- `throttle_factor = self.powerSink.throttle` when the entity has a `powerSink`,
- `throttle_factor = 1` when the entity has no `powerSink`.

Dispatch happens only when the request timer reaches `requestCadenceSeconds`.

There are exactly two request modes per resource:
- **exact request** when `need <= request_limit`, amount = `need`
- **capped request** when `need > request_limit`, amount = `request_limit`

There is **no banking across cadences**. This task does not introduce a long-lived accumulated request budget.

### 4.2 Same-resource authored rows

`cycleResourceCostCompiler.ts` already groups resource costs by resource into a single reservoir. Therefore:

- all authored cycle-cost rows for the **same resource** must use the **same** `requestPerSecondAtFullThrottle` and `requestCadenceSeconds` values,
- mismatches are invalid authored data,
- the compiler must fail loudly and deterministically for that blueprint/resource pair.

This task must not silently merge conflicting cadence settings.

### 4.3 Cave provider contract

- `sys_world` must no longer advertise `storage:food` or `storage:heat`.
- `sys_world` must advertise the dedicated tag `body_provider`.
- body upkeep requests must source from `tag:body_provider`.
- generic storage pulls (`tag:storage:<resource>`) must therefore stop seeing Cave.

### 4.4 Cave refill target contract

For each Cave reserve resource (`food`, `heat`), the refill target is:

`target = (baseDemandPerSecond + (bodyDemandPerBodyPerSecond * sys_swarm.state.swarm.count.value)) * bufferWindowSeconds`

And the refill need is:

`need = target - current_resource_value`

Implementation detail:
- `current_resource_value` must continue to use the existing behavior-system value resolution path when computed in world behavior rules, so in-flight incoming transfers are counted the same way they are elsewhere in behavior evaluation.

The world request cadence remains 1 second. Transfer sourcing remains `tag:storage:<resource>`. Transfers remain non-immediate.

---

## 5. Data model

### 5.1 Cycle authored fields

Add two new fields to each cycle resource-cost row:

- `requestPerSecondAtFullThrottle: number > 0`
- `requestCadenceSeconds: number > 0`

Defaults:
- `requestPerSecondAtFullThrottle = 999999`
- `requestCadenceSeconds = 1`

Rationale for defaults:
- `999999` preserves legacy eager behavior for existing authored content unless the new feature is explicitly tuned.
- `1` matches the existing one-second request timer.

### 5.2 Cave default data

Add per-resource default tuning entries for world auto-request state.

For each of `food` and `heat`, add:
- `auto_req_<resource>_base_demand_per_s_<index>`
- `auto_req_<resource>_body_demand_per_body_per_s_<index>`
- `auto_req_<resource>_window_s_<index>`
- `auto_req_<resource>_target_<index>`

Existing keys remain:
- `auto_req_<resource>_timer_<index>`
- `auto_req_<resource>_need_<index>`

`target` is derived state, stored only so the generated rules are inspectable and testable.

This document defines the keys and formulas. The numeric default values are authored in `DEFAULT_WORLD_ENTITY` and are not derived in code.

---

## 6. Implementation design

## 6.1 Cycle resource-cost cadence

### Runtime behavior

For each resource reservoir compiled from cycle costs:

1. Keep the existing total-cost aggregation and local reservoir storage.
2. Keep the existing `timer` state.
3. Replace the single “request full need” rule with:
   - one rule that requests `need` when `need <= request_limit`
   - one rule that requests `request_limit` when `need > request_limit`
4. Reset the timer after either request rule fires.
5. Keep the existing power-sink throttle gate: no request when throttle is `<= 0`.
6. Keep the existing power-gate rule that zeroes input demand when the reservoir is short.

### Derived values

The compiler must materialize these hidden state values per grouped resource:
- `need`
- `request_limit`
- `timer`

`need` remains derived from the existing local reservoir and total cost.

`request_limit` is derived from authored request settings and, when present, the current throttle.

### Pseudocode

For each grouped cycle-cost resource:

- compute `total_required`
- compute `need = total_required - current_local_resource_value`
- compute `request_limit = requestPerSecondAtFullThrottle * requestCadenceSeconds`
- if entity has `powerSink`, multiply `request_limit` by `self.powerSink.throttle`
- if `timer >= requestCadenceSeconds` and `need >= min_request`:
  - if `need <= request_limit`, request `need`
  - else request `request_limit`
  - reset timer to `0`

### Required failure handling

If two authored cycle-cost rows for the same resource disagree on either new request field:
- throw a compiler error,
- include blueprint id,
- include resource name,
- include both conflicting row indexes.

No fallback behavior is allowed.

---

## 6.2 Cave body-provider demand window

### Runtime behavior

For Cave (`sys_world`):

1. Remove generic storage tags for `food` and `heat`.
2. Add the dedicated `body_provider` tag.
3. Change bodies to source upkeep from `tag:body_provider`.
4. Keep Cave refill sourcing from generic external storage (`tag:storage:<resource>`).
5. Replace Cave’s refill-need calculation from `max - current` to the demand-window target formula.
6. Keep Cave request cadence at 1 second.

### Pseudocode

For each Cave reserve resource (`food`, `heat`):

- `body_count = sys_swarm.state.swarm.count.value`
- `demand_rate = baseDemandPerSecond + (bodyDemandPerBodyPerSecond * body_count)`
- `target = demand_rate * bufferWindowSeconds`
- `need = target - current_cave_resource_value`
- if `timer >= 1` and `need >= 1`, transfer `need` from `tag:storage:<resource>` to `self`
- reset timer to `0` after transfer

### Important contract details

- Cave remains a normal transfer target and still uses existing transfer/capacity handling.
- Cave is no longer visible to generic storage selectors because the `storage:<resource>` tags are removed.
- Body upkeep still uses the existing upkeep compiler. Only the authored `requestSource` changes.

---

## 7. File-by-file change list

## 7.1 Production files

### `data/schemas/abilities/cycle.ts`

**Responsibility**
- Typed authored contract for the Cycle ability.

**Change**
- Add `requestPerSecondAtFullThrottle` and `requestCadenceSeconds` to `CycleResourceCostSchema`.
- Preserve backward compatibility via explicit defaults.

**Interface**
- Input: authored blueprint cycle resource-cost rows.
- Output: parsed cycle config with concrete defaults.

**Rules**
- both fields must be positive numbers.
- defaults are `999999` and `1`.

---

### `ui/devtools/editors/blueprint/mode/forms/CycleResourceCostsSection.tsx`

**Responsibility**
- Add/remove authored cycle resource-cost rows.

**Change**
- Update `createCost()` so new rows include the new request fields with schema-matching defaults.

**Interface**
- No new props.
- The stored draft row shape now includes the two new fields.

---

### `ui/devtools/editors/blueprint/mode/forms/CycleResourceCostRow.tsx`

**Responsibility**
- Editor UI for one authored cycle resource-cost row.

**Change**
- Add two numeric fields:
  - `Request / s @ 100% throttle`
  - `Request cadence (s)`

**Interface**
- No prop changes.
- The component must read and write:
  - `${path}.requestPerSecondAtFullThrottle`
  - `${path}.requestCadenceSeconds`

**Rules**
- Use existing `NumberField`.
- Tooltips must describe rate semantics and cadence semantics only.
- No new editor abstractions.

---

### `engine/compiler/abilities/cycleResourceCostKeys.ts`

**Responsibility**
- Canonical key naming for compiled cycle-cost state entries.

**Change**
- Add helper functions for the request timer, request need, and request limit keys.

**Interface**
- Pure string helpers.
- No side effects.

**Rules**
- Keys must remain deterministic and resource-normalized, matching existing conventions in this file.

---

### `engine/compiler/abilities/cycleResourceCostCompiler.ts`

**Responsibility**
- Compile authored cycle resource costs into runtime state, passive effects, and behavior rules.

**Change**
- Extend the grouped per-resource compile path to carry the two new authored request fields.
- Validate same-resource consistency.
- Materialize compiled hidden state for `need`, `timer`, and `request_limit`.
- Generate exact/capped request rules instead of the single full-need rule.

**Interface**
- Input: `Blueprint`, parsed `CycleAbilityConfig`.
- Output: mutated compiled blueprint components.

**Rules**
- Existing total-cost aggregation remains unchanged.
- Existing local reservoir state remains unchanged.
- Existing visibility and priority behavior remains unchanged.
- Same-resource request-field mismatch is a compile-time error.

---

### `engine/compiler/abilities/cycleResourceCostRuleFactories.ts`

**Responsibility**
- Factory functions for cycle-cost behavior rules.

**Change**
- Replace the single request-rule factory with a factory that returns two request rules:
  - exact request rule
  - capped request rule
- Keep the existing power-gate and consume-rule factories.

**Interface**
- Input must include:
  - resource name,
  - `needRef`,
  - `limitRef`,
  - `timerKey`,
  - authored cadence,
  - `hasSink`
- Output: deterministic `BehaviorRule[]`.

**Rules**
- Rules must use the existing transfer action format.
- Rules must reset the timer after dispatch.
- Rules must not introduce immediate transfers.

---

### `data/schemas/v2/systemDefaults.ts`

**Responsibility**
- Authoritative default `sys_world` and `sys_swarm` entity definitions.

**Change**
- Remove `storage:food` and `storage:heat` from `DEFAULT_WORLD_ENTITY.tags`.
- Add `body_provider` to `DEFAULT_WORLD_ENTITY.tags`.
- Continue to materialize world auto-request state/effects/rules through `worldRuleBuilders.ts`.

**Interface**
- No schema changes.
- The emitted default world entity shape changes only in tags and default state entries.

**Rules**
- This is the only place where Cave provider identity is authored by default in this task.

---

### `data/schemas/v2/worldRuleBuilders.ts`

**Responsibility**
- Generate the default Cave auto-request state, passive effects, and behavior rules.

**Change**
- Extend `buildWorldAutoRequestState()` to add the new demand-window state keys.
- Change `buildWorldAutoRequestRules()` so `target` and `need` are derived from authored demand rates and `sys_swarm.state.swarm.count.value`.
- Reuse `buildAutoReqTransferRule()` for the transfer rule instead of hand-assembling a duplicate transfer action.

**Interface**
- Existing exported function names remain unchanged.
- Returned state/rules now include the demand-window fields and formulas.

**Rules**
- World request cadence remains 1 second.
- Transfer source remains `tag:storage:<resource>`.
- Transfer remains non-immediate.
- `target` is stored as hidden state for observability and testability.

---

### `data/raw/example/modules/newbody.bp`

**Responsibility**
- Authored example body blueprint used by the bootstrap content.

**Change**
- Change upkeep `requestSource` for `food` and `heat` from `sys_world` to `tag:body_provider`.

**Interface**
- No compiler/runtime API change.
- This is pure authored-data routing.

**Rules**
- Both upkeep entries must use the same provider tag.
- No other body-upkeep fields change.

---

## 7.2 Test files

### `engine/compiler/abilities/cycleResourceCostCompiler.test.ts`

**Responsibility**
- Unit-test compiled cycle-cost state and rule generation.

**Change**
Add coverage for:
- new compiled hidden keys for request timer/need/limit,
- exact and capped request rule ids,
- authored request defaults,
- mismatch failure for same-resource rows with conflicting cadence/rate.

**Contract**
- tests assert compiled structure, not implementation accidents.

---

### `engine/runtime/systems/behavior/cycleResourceCostRequestCadence.test.ts` **(new)**

**Responsibility**
- Integration-test runtime behavior of cycle-cost request cadence.

**Cases**
- does not request before cadence is ready,
- requests exact need when `need <= limit`,
- requests capped amount when `need > limit`,
- throttle `0` blocks request when a power sink exists,
- partial throttle scales request limit deterministically.

**Contract**
- real `BehaviorSystem`, real snapshot, no DOM.

---

### `ui/devtools/editors/blueprint/mode/forms/CycleResourceCostRow.test.tsx`

**Responsibility**
- View test for cycle-cost row wiring.

**Change**
- Assert the two new numeric field labels render.

**Contract**
- presentation and wiring only.

---

### `ui/devtools/editors/blueprint/mode/forms/CycleResourceCostsSection.test.tsx`

**Responsibility**
- View test for add/remove row behavior.

**Change**
- After adding a row, assert the new request fields are present via the rendered row.

**Contract**
- no business-logic assertions here.

---

### `data/schemas/v2/worldRuleBuilders.test.ts` **(new)**

**Responsibility**
- Unit-test generated world auto-request state and behavior rules.

**Cases**
- state builder emits the new demand-window keys,
- need rule computes `target` and `need` from base demand, per-body demand, and `sys_swarm.state.swarm.count.value`,
- transfer rule sources from `tag:storage:<resource>` and remains non-immediate.

**Contract**
- test generated data shape and formulas, not downstream runtime side effects.

---

### `engine/runtime/runtimeWorld.test.ts`

**Responsibility**
- Integration-test system-entity bootstrapping.

**Change**
- Assert bootstrapped `sys_world` includes `body_provider` and does not include `storage:food` / `storage:heat`.
- Assert the new demand-window state keys exist on the spawned world entity.

**Contract**
- verify spawned runtime entity state, not source implementation details.

---

### `engine/compiler/abilities/newbodyBlueprintContent.test.ts` **(new)**

**Responsibility**
- Content lock for authored bootstrap body upkeep sourcing.

**Cases**
- bootstrap `newbody` content uses `tag:body_provider` for food upkeep,
- bootstrap `newbody` content uses `tag:body_provider` for heat upkeep.

**Contract**
- this is a content regression test, using the same bootstrap-content pattern already used elsewhere in the repository.

---

## 8. Explicit non-changes

The following files must remain unchanged for this task unless implementation reveals a hard blocker:

- `engine/compiler/abilities/upkeepCompiler.ts`
- `engine/compiler/abilities/autoRequestRuleBuilder.ts`
- `engine/runtime/handlers/TransferHandler.ts`
- `engine/runtime/handlers/ResolveTransferHandler.ts`
- `engine/balancing/transferLogic.ts`
- `game/systems/passive-effects/passiveEffectUtils.ts`
- `ui/devtools/editors/config/WorldEntityEditor.tsx`
- `data/schemas/v2/config.ts`

Reason:
- the agreed changes fit existing request-source, transfer, and defaults mechanisms without reopening those systems.

---

## 9. Acceptance criteria

The implementation is complete only when all of the following are true:

1. A cycle cost can be authored with a request rate and request cadence in the Cycle Cost editor.
2. Compiled cycle-cost request behavior uses exact/capped dispatch, not full-need dispatch.
3. Same-resource cycle-cost rows with conflicting cadence/rate fail loudly at compile time.
4. `sys_world` is no longer selected by generic `tag:storage:food` / `tag:storage:heat` lookups.
5. Bodies source upkeep from `tag:body_provider`.
6. Cave refill target uses the demand-window formula and includes `sys_swarm.state.swarm.count.value`.
7. No transfer runtime semantics are changed outside the agreed request shaping.
8. All changed and added tests are green.

---

## 10. Notes for implementation

- This design intentionally uses the existing cadence/timer pattern already present in storage auto-request compilation.
- This design intentionally uses the existing `sys_swarm.state.swarm.count` aggregate instead of introducing a new body-counting system for Cave.
- This design intentionally keeps Cave tuning in defaults only for now.
- This design intentionally keeps legacy cycle-cost behavior for existing content by using a very high default request rate.
