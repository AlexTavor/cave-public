# LLD — First-class, Entity-wide Traits with Modifiers and Per-Entity Cycles

This LLD is written to satisfy the project’s determinism + command-buffer tick contract and the project’s testing standards. fileciteturn9file0 fileciteturn9file1 fileciteturn9file2

This document reflects the clarifications you provided:
- Traits are **on/off only** (no stacking for now).
- Trait cycles are **per-entity** and cycle counters live **inside the trait instance** on the entity.
- TraitSystem runs **before PassiveEffectsSystem**, and a cycle may trigger **multiple times** in a single tick.
- “Not applicable” effect/modifier → **skip**. Unknown trait id or invalid effect reference → **runtime warning** (no crash).

---

## 1. WHY

### 1.1 Problem
Traits are currently **body-only**:
- `ADD_TRAIT` / `REMOVE_TRAIT` mutate `context.self.body.traits` and enqueue `UPDATE_BODIES_BATCH`. (See `engine/runtime/systems/behavior/actionExecutorTraits.ts`.)  
- Trait modifiers are applied only in `BodySystem` via `applyTraitModifiers(...)` and xp multiplier via `resolveTraitXpMultiplier(...)` in `game/systems/body/traits.ts`.
- Trait rules are applied by patching blueprint behavior (`PATCH_BLUEPRINT`) via `game/systems/body/behaviorPatch.ts`.

This prevents traits from being generic and reusable across entity types and makes the trait mechanism coupled to `BodySystem` and blueprint patching.

### 1.2 Goal
Make Traits a **first-class, entity-wide mechanism** that is the standard way to apply reusable gameplay logic:
- **Modifiers**: generic “change to values” logic defined in the trait registry.
- **Cycles**: explicit periodic effects (e.g., “every 10 seconds apply X”) where the timer is per entity.

Blueprint **abilities** remain blueprint-specific custom logic; anything reusable across multiple blueprints becomes a trait.

---

## 2. WHAT (Contracts)

### 2.1 Trait Instances (entity-wide, canonical)
#### 2.1.1 Storage
A new optional component exists on any entity: `traits`.

#### 2.1.2 Trait instance schema (authoritative runtime shape)
Each active trait instance is:
- `id: string` — trait id (registry key)
- `remainingSeconds?: number` — if present, decremented by dt; when <= 0, trait is removed
- `cycles?: Record<string, { accumulatorSeconds: number }>` — per-cycle accumulator state keyed by cycle id (stored inside the trait instance)

**Invariants**
- No duplicates by id: an entity either has a trait id or not.
- Cycles state exists only for cycles defined in registry; extra keys are ignored (and warned).

### 2.2 Trait Definitions (registry)
The trait registry lives in sys config: `SysConfigSchema.traits` (already exists as `record<string, TraitDefinitionSchema>`).

Trait definitions are extended to support:
- `modifiers?: TraitModifier[]` — generic modifiers
- `cycles?: TraitCycle[]` — explicit periodic effects
- `rules?: BehaviorRule[]` — remains supported by schema, but **is not applied via PATCH_BLUEPRINT** after this change (see 2.5).

#### 2.2.1 Modifiers contract (on/off only)
A modifier is:
- `op: Op` (SET/ADD/SUB/MULT/DIV) — reuse existing Op enum (`data/schemas/primitives.ts`)
- `target: string` — a target path supported by the existing passive effect mutation layer:
  - `self.state.<key>.value`
  - `self.state.<key>.max`
  - `self.powerSink.baseDemand.<attr>`
- `value: GameValue` OR `source: string` (same as passive effects; use `PassiveEffectSchema`)

**Applicability**
- If `target` is not in the supported namespaces, skip + warn.
- If `target` references `self.state.<key>` and `<key>` does not exist on the entity’s state, skip + warn.
- No new state keys are created by trait modifiers.

**Execution**
Trait modifiers are applied by converting them into `PassiveEffect` entries and letting the existing PassiveEffects machinery compute and enqueue updates.

> This reuses existing mutation logic and avoids duplicating “how to apply ops to state/powerSink.”

#### 2.2.2 Cycles contract (per-entity accumulator; may multi-trigger)
A cycle is:
- `id: string` — unique within a trait definition
- `periodSeconds: number` (> 0)
- `effects: PassiveEffect[]` — what to apply each time the cycle fires

**Execution rules**
- TraitSystem advances `accumulatorSeconds += dtSeconds`.
- While `accumulatorSeconds >= periodSeconds`:
  - apply the cycle’s `effects` once
  - subtract `periodSeconds`
- Effect applicability rules match modifiers (skip + warn if not applicable).

### 2.3 Upkeep: rename and obligate failure trait
`UpkeepAbilitySchema` changes:
- rename `failureState` → `failureTrait`
- `failureTrait` is required (no default)
- editor autocomplete uses trait ids from registry

Compiler output changes:
- no longer creates/uses `state.flag_*` for upkeep failure
- instead toggles the entity trait:
  - if `self.state.<resource>.value <= 0`: `ADD_TRAIT { traitId: failureTrait }`
  - if `self.state.<resource>.value > 0`: `REMOVE_TRAIT { traitId: failureTrait }`

### 2.4 Runtime warnings contract
- Unknown trait id in entity.traits: warn once per (entityId, traitId) per tick and skip.
- Not applicable modifier/effect target: warn once per (entityId, traitId, target) per tick and skip.
- Cycle references missing/invalid structure (e.g., periodSeconds <= 0): warn and skip that cycle.

### 2.5 Deprecation / removal of body-only trait mechanism
After this change:
- `ADD_TRAIT` / `REMOVE_TRAIT` no longer target `body.traits`
- `BodySystem` no longer applies trait modifiers via `game/systems/body/traits.ts`
- Blueprint patching for trait rules (`PATCH_BLUEPRINT` via `behaviorPatch.ts`) is removed from runtime behavior

Trait rules (BehaviorRule[]) may remain in schema for compatibility but are not applied by patching; any future execution of trait rules must be done via a dedicated trait overlay mechanism (explicitly out of scope for this LLD, which covers modifiers + cycles and removing patching).

---

## 3. HOW (Implementation: files, responsibilities, logic, interfaces)

### 3.1 Data schemas

#### File: `src/data/schemas/abilities/upkeep.ts` (CHANGE)
**Responsibility**: Validate upkeep ability config.  
**Logic**:
- Rename `failureState` → `failureTrait`
- Make `failureTrait` required: `z.string().min(1)`
- Remove default `"is_starving"`
**Interface**:
```ts
export const UpkeepAbilitySchema = z.object({
  resource: z.string().min(1),
  rate: ScalableValueSchema.default({ base: 0, perBody: 0 }),
  failureTrait: z.string().min(1),
  autoRequest: z.boolean().default(true),
});
```

#### File: `src/data/schemas/game/traits.ts` (CHANGE)
**Responsibility**: Trait registry definition schema.  
**Logic**: Extend `TraitDefinitionSchema` to include:
- `modifiers?: PassiveEffect[]` (reusing `PassiveEffectSchema` exactly)
- `cycles?: Array<{ id: string; periodSeconds: number; effects: PassiveEffect[] }>`
Keep existing fields (`rules`, existing body modifiers) only if required for backward compatibility; **but this LLD removes their runtime usage** (see 2.5).
**Interface**:
- import `PassiveEffectSchema` from `data/schemas/components.ts`
- import `Op` and `GameValueSchema` already implied by `PassiveEffectSchema`

> Using PassiveEffectSchema for modifiers removes ambiguity about supported ops/targets/value types.

#### File: `src/data/schemas/components.ts` (CHANGE)
**Responsibility**: Core component schemas.  
**Logic**: Add `TraitsComponentSchema` (new) and export it.  
**Interface**:
- `TraitsComponentSchema` as described in 2.1.2.
- Ensure `BlueprintSchema` can include `components.traits` (see below).

#### File: `src/data/schemas/blueprint.ts` (CHANGE)
**Responsibility**: Blueprint authoring schema.  
**Logic**: Allow `components.traits` to exist and be parsed at load.  
**Interface**: Add `traits: TraitsComponentSchema.optional()` to components.

---

### 3.2 Compiler

#### File: `src/engine/compiler/abilities/upkeepCompiler.ts` (CHANGE)
**Responsibility**: Convert upkeep abilities into concrete components/rules.  
**Logic**:
- Replace references to `failureState` with `failureTrait`.
- Remove generation of `state.flag_*` and any rules that mutate those flags.
- Add two BehaviorRules per upkeep entry (with deterministic ids):
  1) `ADD_TRAIT` when resource value <= 0
  2) `REMOVE_TRAIT` when resource value > 0
- Continue generating `susceptible_to_<failureTrait>` tag (renamed).
**Interface**:
- Emits Behavior actions using existing `AddTraitActionSchema` / `RemoveTraitActionSchema` from `data/schemas/behavior.ts`.

#### File: `src/engine/compiler/abilities/upkeepCompiler.test.ts` (CHANGE)
**Responsibility**: Enforce compiler contract with tests.  
**Logic** (must assert):
- compiled output does not contain `flag_` state entries for upkeep
- emitted rules contain `ADD_TRAIT` / `REMOVE_TRAIT` with correct trait id
- `susceptible_to_<failureTrait>` tag is present

---

### 3.3 Runtime: entity-wide traits and updates

#### File: `src/engine/runtime/systems/behavior/actionExecutorTraits.ts` (CHANGE)
**Responsibility**: Execute ADD_TRAIT / REMOVE_TRAIT actions.  
**Logic**:
- Stop reading `context.self.body.traits`
- Read/write `context.self.traits` (new entity component)
- Enqueue a new command `UPDATE_TRAITS_BATCH` instead of `UPDATE_BODIES_BATCH`
- Trait is on/off only:
  - ADD_TRAIT: if present, no-op
  - REMOVE_TRAIT: if absent, no-op
**Interface**:
- Requires new command type + handler (below).
- Maintains invariant: unique trait ids.

#### File: `src/engine/runtime/types/index.ts` (CHANGE)
**Responsibility**: Runtime command types and payload typing.  
**Logic**: Add a new runtime command type:
- `RuntimeCommandType.UPDATE_TRAITS_BATCH`
Payload:
```ts
{ updates: Array<{ entityId: string; traits: TraitInstance[] }> }
```
**Interface**:
- included in union type `RuntimeCommand`.

#### File: `src/game/handlers/UpdateTraitsBatchHandler.ts` (ADD)
**Responsibility**: Apply-phase handler that writes entity.traits component.  
**Logic**:
- For each update:
  - if entity missing: log error; skip
  - write `entity.traits = { traits: normalizedTraits }`
  - normalization: unique by id; stable sort by id
**Interface**:
- Registered in `game/main.ts`.

---

### 3.4 TraitSystem (cycles + trait-derived passive effects)

#### File: `src/game/systems/TraitSystem.ts` (ADD)
**Responsibility**:
1) Maintain per-entity trait instance time state:
   - decrement `remainingSeconds` and remove expired traits
   - maintain `cycles.<cycleId>.accumulatorSeconds` inside each trait instance
2) Generate trait-derived passive effects and apply cycle triggers
3) Emit updates via command buffer (no direct mutation)

**Inputs**
- `TraitIndex` from `sysConfig.traits` (already produced in `game/main.ts`)

**Logic**
For each entity with `traits`:
1) Validate each trait id exists in registry; if missing -> warn, skip.
2) Duration:
   - if `remainingSeconds` exists: decrement by dtSeconds; if <=0 remove trait.
3) Build trait-derived passive effects list:
   - from `traitDef.modifiers` (PassiveEffect[])
   - filter by applicability (see below)
4) Cycle processing:
   - for each `traitDef.cycles[]`:
     - ensure `traitInstance.cycles[cycleId].accumulatorSeconds` exists
     - increment by dtSeconds
     - while >= periodSeconds: apply effects once, decrement by periodSeconds
     - effects filtered by applicability
5) Emit:
   - if traits were mutated (expiry or new cycle accumulator created/updated): enqueue `UPDATE_TRAITS_BATCH`
   - cycle and modifier effects are applied by reusing the existing passive effect execution utilities:
     - use `buildGlobalsProxy(snapshot, dtMs)` and `applyPassiveEffects(entity, globalsProxy, effects)` from `game/systems/passive-effects/passiveEffectUtils.ts`
     - then enqueue updates using `applyPendingUpdates(...)` from `passiveEffectsSystemUtils.ts`
   - TraitSystem must not duplicate the “apply op and enqueue update” logic.

**Applicability filtering (unambiguous)**
A PassiveEffect is applicable iff:
- target starts with `self.state.` or `self.powerSink.`
- if `self.state.<key>` target: entity has `state` and `state[<key>]` exists
- if `self.powerSink.baseDemand.<attr>` target: entity has `powerSink` component object
If not applicable: warn and drop that effect.

**Warnings**
- Warnings use runtime telemetry adapter channel `"errors"` (existing telemetry interface) if available; otherwise console.warn.
- Warnings are rate-limited by (entityId, traitId, target) within a tick.

#### File: `src/game/main.ts` (CHANGE)
**Responsibility**: System registration and ordering; handler registration.  
**Logic**:
- Register `TraitSystem(traitIndex, runtime.getGlobalEffectsIndexer()?)` as needed **before** PassiveEffectsSystem.
- Register new `UpdateTraitsBatchHandler`.
- Remove `BodySystem(traitIndex)` dependency on traitIndex once body-only modifiers are removed (BodySystem no longer needs traitIndex after this LLD).

> `BodySystem` currently takes `traitIndex`; this LLD requires removing that parameter to prevent leftover body-only trait application.

---

### 3.5 Removal of body-only trait logic (must not remain active)

#### File: `src/game/systems/body/traits.ts` (CHANGE)
**Responsibility** (post-change): None for runtime trait application.  
**Logic**:
- Remove `resolveTraitXpMultiplier`, `applyTraitModifiers`, `collectTraitRules` from runtime use.
- Keep `TraitIndex` type alias if needed by TraitSystem.

#### File: `src/game/systems/body/behaviorPatch.ts` (CHANGE)
**Responsibility**: Trait rule patching (deprecated).  
**Logic**:
- Must no longer be called from BodySystem.
- Existing tests updated to reflect removal from runtime pipeline.

#### File: `src/game/systems/BodySystem.ts` (CHANGE)
**Responsibility**: Body progression only; no trait patching/modifiers.  
**Logic**:
- Remove callsite(s) that patch behavior with traits.
- Remove traitIndex param (and update call in `game/main.ts`).

---

## 4. Tests (must satisfy standards) fileciteturn9file2

### 4.1 Upkeep schema test (optional but recommended)
**File**: `src/data/schemas/abilities/upkeep.test.ts` (ADD)
- Asserts `failureTrait` required
- Asserts `failureState` rejected (or ignored only if you explicitly keep backward compatibility; this LLD mandates rejection)

### 4.2 Upkeep compiler tests
**File**: `src/engine/compiler/abilities/upkeepCompiler.test.ts` (CHANGE)
Must cover:
- emits `ADD_TRAIT` / `REMOVE_TRAIT` rules with correct traitId
- does not emit any `flag_*` state keys for upkeep failure
- tag naming uses `susceptible_to_<failureTrait>`

### 4.3 Behavior action executor tests (traits)
**File**: `src/engine/runtime/systems/behavior/ActionExecutor.traits.test.ts` (CHANGE)
Must cover:
- ADD_TRAIT updates entity-wide traits component via `UPDATE_TRAITS_BATCH`
- REMOVE_TRAIT removes it
- duplicates are prevented (on/off semantics)

### 4.4 UpdateTraitsBatchHandler tests
**File**: `src/game/handlers/UpdateTraitsBatchHandler.test.ts` (ADD)
Must cover:
- applying updates writes `entity.traits` correctly
- normalization: unique + sorted
- missing entity logs error and does not throw

### 4.5 TraitSystem tests
**File**: `src/game/systems/TraitSystem.test.ts` (ADD)
Must cover:
- duration expiry removes trait and emits UPDATE_TRAITS_BATCH
- cycle accumulator stored in trait instance and updated
- multi-trigger in one tick (dt > period) applies multiple times
- not applicable effect is skipped and warns
- unknown trait id warns and applies nothing

### 4.6 Integration ordering test
**File**: `src/game/main.systemOrder.test.ts` (ADD) or equivalent existing integration suite
Must assert:
- TraitSystem runs before PassiveEffectsSystem in `registeredSystems` order.
- Observable proof: create an entity whose trait modifier would change state if applied; verify it is applied before PassiveEffectsSystem runs (using a test harness that executes one tick and inspects enqueued command order or final applied state).

---

## 5. Completion Criteria
This change is complete when:
- All unit tests pass.
- No runtime path still mutates `body.traits` via `UPDATE_BODIES_BATCH` for trait actions.
- No runtime path still PATCH_BLUEPRINT for trait rules.
- TraitSystem runs before PassiveEffectsSystem and applies cycle triggers deterministically.
- Unknown trait ids and non-applicable targets warn and skip without crashing.

