# LLD — First-class, Entity-wide Traits with Modifiers, Per-Entity Cycles, and Structured Traits Editor

This LLD is compliant with determinism + command-buffer tick contract and the project’s testing standards. fileciteturn9file0 fileciteturn9file1 fileciteturn9file2

This revision incorporates:
- Traits are **on/off only** (no stacking).
- Trait cycles are **per-entity**, cycle counters stored **inside the trait instance**.
- TraitSystem runs **before PassiveEffectsSystem**, and cycles may trigger **multiple times per tick**.
- Trait effects/modifiers that are not applicable are **skipped**; errors are **runtime warnings**.
- A **structured-only Traits Editor** (no raw JSON editor), with standard UI and autocomplete.

---

## 1. WHY

### 1.1 Current state (grounded in code)
Traits are currently body-centric and applied via body-specific mechanisms:
- `ADD_TRAIT` / `REMOVE_TRAIT` currently mutate `context.self.body.traits` and enqueue `UPDATE_BODIES_BATCH` (see `src/engine/runtime/systems/behavior/actionExecutorTraits.ts`).
- Trait modifiers and xp multiplier are applied in `BodySystem` via `applyTraitModifiers(...)` / `resolveTraitXpMultiplier(...)` in `src/game/systems/body/traits.ts`.
- Trait rules are applied by patching blueprint behavior (`PATCH_BLUEPRINT`) via `src/game/systems/body/behaviorPatch.ts` and called from body processing (e.g., `processEntity.ts`).

This prevents traits from being reusable across entity types and duplicates “effect logic” across systems.

### 1.2 Target state
Traits become a first-class, entity-wide way to apply reusable gameplay logic:
- **Modifiers**: defined in the trait registry; applied generically (no body-only modifier path).
- **Cycles**: explicit per-trait periodic effects with per-entity counters.
- Designers edit traits frequently, so traits require a **structured editor** with validation and autocomplete.

Blueprint abilities remain blueprint-specific; anything reusable becomes a trait.

---

## 2. WHAT (Contracts)

### 2.1 Trait instances: canonical, entity-wide
A new optional component exists on any entity: `traits`.

Trait instance schema (runtime, authoritative):
- `id: string` — trait id (registry key)
- `remainingSeconds?: number` — if present, decremented by dt; when <= 0 trait is removed
- `cycles?: Record<string, { accumulatorSeconds: number }>` — per-cycle accumulator state keyed by cycle id

Invariants:
- Trait is on/off only: no duplicates by id.
- `cycles` keys not in registry are ignored and warned.

### 2.2 Trait registry definition (sys config)
Trait registry exists in sys config and is edited in `.cave` config sessions. The editor path used in UI is `blueprint.settings.traits` (see existing config editors).

Trait definition supports:
- `modifiers?: PassiveEffect[]`
- `cycles?: Array<{ id: string; periodSeconds: number; effects: PassiveEffect[] }>`
- `rules?: BehaviorRule[]` remains in schema for compatibility, but **PATCH_BLUEPRINT is removed** (see 2.5). This LLD does not define a new execution path for `rules` beyond modifiers/cycles.

#### 2.2.1 Modifiers contract
Modifiers reuse the existing PassiveEffect schema exactly:
- `op: Op`
- `target: string`
- `source?: string`
- `value?: number`

Applicability:
- Only targets supported by PassiveEffects mutation layer are valid:
  - `self.state.<key>.value`
  - `self.state.<key>.max`
  - `self.powerSink.baseDemand.<attr>`
- If target is not applicable to a given entity, skip and warn.
- No new state keys are created by trait modifiers.

Execution:
- Trait modifiers are applied using the same utilities as PassiveEffectsSystem (no duplicate op logic).

#### 2.2.2 Cycles contract (explicit, per-entity, multi-trigger)
Cycle definition:
- `id: string` (unique within trait)
- `periodSeconds: number` (> 0)
- `effects: PassiveEffect[]`

Execution:
- TraitSystem: accumulator += dtSeconds.
- While accumulator >= periodSeconds:
  - apply effects once
  - accumulator -= periodSeconds
- Effects are subject to the same applicability rules; non-applicable targets are skipped with warnings.

### 2.3 Upkeep: rename + obligation
Upkeep ability changes:
- rename `failureState` → `failureTrait`
- `failureTrait` is required (no default)
- editor autocomplete uses trait ids from registry

Compiler changes:
- Upkeep no longer creates/uses `state.flag_*` for failure.
- Instead toggles entity trait:
  - if `self.state.<resource>.value <= 0`: ADD_TRAIT(failureTrait)
  - if `self.state.<resource>.value > 0`: REMOVE_TRAIT(failureTrait)

### 2.4 Warnings contract
- Unknown trait id on entity → warn and skip.
- Not applicable modifier/effect target → warn and skip.
- Invalid cycle config (periodSeconds <= 0) → warn and skip that cycle.

Warnings must be rate-limited per tick by (entityId, traitId, target/cycleId).

### 2.5 Removal of body-only trait application
After this change:
- Trait actions no longer target `body.traits` or enqueue `UPDATE_BODIES_BATCH`.
- BodySystem no longer applies trait modifiers via `game/systems/body/traits.ts`.
- Runtime no longer applies trait rules via blueprint patching (`PATCH_BLUEPRINT`), and BodySystem must not call the patch pipeline.

---

## 3. HOW (Implementation plan)

### 3.1 Data schemas (engine + UI)

#### 3.1.1 CHANGE — `src/data/schemas/abilities/upkeep.ts`
**Responsibility:** upkeep ability config schema.  
**Logic:** rename + require failureTrait; remove default.  
**Interface:** `failureTrait: z.string().min(1)`

#### 3.1.2 CHANGE — `src/data/schemas/game/traits.ts`
**Responsibility:** trait definition schema for registry.  
**Logic:** extend TraitDefinitionSchema to include:
- `modifiers: z.array(PassiveEffectSchema).optional()`
- `cycles: z.array(z.object({ id, periodSeconds, effects })).optional()`
and keep existing `rules` for backward compatibility (not executed via patching after this change).
**Interface:** must import `PassiveEffectSchema`.

#### 3.1.3 ADD — `src/data/schemas/components/traits.ts`
**Responsibility:** entity-level trait instance schema.  
**Logic:** defines `TraitsComponentSchema`.  
**Interface:** exported and used by blueprint/component schemas and runtime entity typing.

#### 3.1.4 CHANGE — `src/data/schemas/components.ts`
**Responsibility:** component schema exports.  
**Logic:** export TraitsComponentSchema.

#### 3.1.5 CHANGE — `src/data/schemas/blueprint.ts`
**Responsibility:** blueprint authoring schema.  
**Logic:** allow `components.traits` as optional initial traits.  
**Interface:** add `traits?: TraitsComponent` under components.

#### 3.1.6 CHANGE — `src/data/schemas/components.ts` (metadata for editor autocomplete)
**Responsibility:** expose UI metadata in schema descriptions.  
**Logic:** annotate `PassiveEffectSchema.target` with a UI meta tag to enable autocomplete in structured editor:
- `.describe("ui:autocomplete:passive-effect-target")`
**Interface:** SchemaField will render a dedicated autocomplete field for any string schema with this meta tag.

---

### 3.2 Compiler

#### 3.2.1 CHANGE — `src/engine/compiler/abilities/upkeepCompiler.ts`
**Responsibility:** compile upkeep ability into concrete rules/components.  
**Logic:**
- Use `failureTrait` (required)
- Remove flag state generation and any flag-setting rules
- Emit two deterministic rules per upkeep entry:
  - ADD_TRAIT when resource value <= 0
  - REMOVE_TRAIT when resource value > 0
- Update tag name to `susceptible_to_<failureTrait>`
**Interface:** emits existing behavior actions `ADD_TRAIT` / `REMOVE_TRAIT`.

#### 3.2.2 CHANGE — `src/engine/compiler/abilities/upkeepCompiler.test.ts`
**Responsibility:** verify compiler contract.  
**Logic:** asserts:
- no `flag_` state keys generated for failure
- trait toggle rules exist with correct id
- susceptible tag uses failureTrait

---

### 3.3 Runtime: entity-wide traits actions + storage

#### 3.3.1 CHANGE — `src/engine/runtime/systems/behavior/actionExecutorTraits.ts`
**Responsibility:** execute ADD_TRAIT/REMOVE_TRAIT.  
**Logic:**
- Mutate `context.self.traits` (entity component) rather than `body.traits`
- Trait is on/off only:
  - ADD_TRAIT: if present => no-op; else add instance with empty cycles map
  - REMOVE_TRAIT: if absent => no-op; else remove
- Enqueue `UPDATE_TRAITS_BATCH` command (new)
**Interface:** requires new command type + handler.

#### 3.3.2 CHANGE — `src/engine/runtime/types/index.ts` (or equivalent command types file)
**Responsibility:** define command type + payload.  
**Logic:** add `RuntimeCommandType.UPDATE_TRAITS_BATCH` with payload:
`{ updates: Array<{ entityId: string; traits: TraitInstance[] }> }`

#### 3.3.3 ADD — `src/game/handlers/UpdateTraitsBatchHandler.ts`
**Responsibility:** apply-phase handler to write entity traits component.  
**Logic:**
- For each update:
  - if entity missing: log error; skip
  - write normalized unique-by-id list (sorted by id)
**Interface:** registered in `src/game/main.ts`.

#### 3.3.4 ADD — `src/game/handlers/UpdateTraitsBatchHandler.test.ts`
**Responsibility:** enforce handler behavior.  
**Logic:** asserts normalization and missing entity does not throw.

---

### 3.4 TraitSystem: cycles + trait-derived passive effects

#### 3.4.1 ADD — `src/game/systems/TraitSystem.ts`
**Responsibility:**
- duration expiry
- per-entity per-trait per-cycle accumulator maintenance (inside trait instance)
- apply trait modifiers and cycle effects by reusing passive-effect execution utilities
- enqueue UPDATE_TRAITS_BATCH when trait component changes

**Logic (per entity with traits):**
1) Resolve each trait id in registry. If missing: warn and skip.
2) Expire duration: decrement remainingSeconds; remove if <= 0.
3) Apply trait modifiers:
   - collect `traitDef.modifiers` (PassiveEffect[])
   - filter by applicability
   - apply using passive effect utils and enqueue updates
4) Cycles:
   - ensure `traitInstance.cycles[cycleId].accumulatorSeconds` exists
   - accumulator += dtSeconds
   - while accumulator >= periodSeconds:
     - apply cycle effects using passive effect utils
     - accumulator -= periodSeconds
5) If trait instance changed (expiry, accumulator created/changed): enqueue UPDATE_TRAITS_BATCH.

**Applicability filter (authoritative):**
- Only allow targets in the namespaces supported by the passive-effect updater:
  - `self.state.<key>.value`, `self.state.<key>.max`
  - `self.powerSink.baseDemand.<attr>`
- If `self.state.<key>` missing => warn + skip.
- If component missing (e.g., powerSink) => warn + skip.

**Interface:**
- constructed with trait index (registry) and global effects indexer if needed (not required for this LLD).
- must be registered before PassiveEffectsSystem.

#### 3.4.2 CHANGE — `src/game/main.ts`
**Responsibility:** system ordering + handler registration.  
**Logic:**
- register TraitSystem before PassiveEffectsSystem
- register UpdateTraitsBatchHandler
- remove BodySystem dependency on trait index (since trait modifiers and trait patching are removed)

#### 3.4.3 ADD — `src/game/systems/TraitSystem.test.ts`
**Responsibility:** enforce cycle + expiry + warning semantics.  
**Logic:** must cover:
- duration expiry removes trait and enqueues UPDATE_TRAITS_BATCH
- cycle accumulator stored in trait instance, updated deterministically
- multi-trigger when dt > period
- non-applicable targets skipped with warning
- unknown trait id warns and does nothing

---

### 3.5 Removal of body-only trait usage

#### 3.5.1 CHANGE — `src/game/systems/body/traits.ts`
**Responsibility:** currently contains body-only trait modifier logic.  
**Logic:** remove runtime usage of `applyTraitModifiers`, `resolveTraitXpMultiplier`, and `collectTraitRules`. If kept, file may remain only for shared types; otherwise delete and update imports.

#### 3.5.2 CHANGE — `src/game/systems/body/behaviorPatch.ts`
**Responsibility:** blueprint patching for trait rules (deprecated).  
**Logic:** ensure it is not called from runtime path after this change; update/delete tests accordingly.

#### 3.5.3 CHANGE — `src/game/systems/BodySystem.ts` and `src/game/systems/body/processEntity.ts`
**Responsibility:** body progression only.  
**Logic:** remove any call that patches behavior with traits; remove traitIndex param and update construction.

---

## 3.6 Structured Traits Editor (no JSON editor)

### 3.6.1 CHANGE — `src/ui/devtools/editors/config/TraitsEditor.tsx`
**Responsibility:** Provide a structured-only editor for the trait registry.  
**Logic:**
- Replace `SessionJsonEditor` usage entirely.
- Render a `SchemaForm` bound to the trait registry schema (record of trait definitions).
- The editor root path remains `blueprint.settings.traits` (consistent with other sys config editors).

**Interface:**
- `ToolFrame title="Global Traits"` remains.
- Uses `SchemaForm schema={TraitsRegistrySchema} filename={filename} rootPath="blueprint.settings.traits"`.
- `TraitsRegistrySchema` is defined in this file as `z.record(z.string(), TraitDefinitionSchema).default({})`.

### 3.6.2 ADD — `src/ui/devtools/editors/fields/string-field/AutocompleteStringField.tsx`
**Responsibility:** A reusable structured-editor input for string fields with autocomplete suggestions.  
**Logic:**
- Controlled input with a suggestion dropdown.
- Suggestions are filtered by current input substring.
- Commit value on selection or blur.
- No freeform JSON mode; string editing remains structured.

**Interface:**
- Props: `label, filename, path, schema, suggestions: string[]`.
- Uses existing session store update mechanism (same as StringField’s `useStringField`).

### 3.6.3 CHANGE — `src/ui/devtools/editors/fields/SchemaField.tsx`
**Responsibility:** Render appropriate field UI based on schema type + metadata.  
**Logic:**
- If string field description contains `ui:autocomplete:passive-effect-target`, render `AutocompleteStringField` with suggestions:
  - `["self.state.", "self.powerSink.baseDemand."]` as prefixes (authoritative set for this LLD; aligns to supported target namespaces in TraitSystem).
- Otherwise use existing StringField.

**Interface:**
- No other behavior changes to SchemaField.
- This metadata-driven approach means autocomplete applies everywhere PassiveEffect targets are edited, not just TraitsEditor.

### 3.6.4 UI Tests
#### CHANGE — `src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.test.tsx`
**Responsibility:** ensure config editor mapping still resolves traits to TraitsEditor.  
**Logic:** update snapshots/expectations only if needed due to UI text changes (none required).

#### ADD — `src/ui/devtools/editors/config/TraitsEditor.test.tsx`
**Responsibility:** ensure TraitsEditor is structured-only.  
**Logic:** asserts:
- `SessionJsonEditor` is not rendered.
- `SchemaForm` is rendered and bound to `rootPath="blueprint.settings.traits"`.

#### ADD — `src/ui/devtools/editors/fields/string-field/AutocompleteStringField.test.tsx`
**Responsibility:** enforce autocomplete behavior.  
**Logic:** asserts:
- suggestions show for prefix matches
- selecting a suggestion updates session draft at `path`
- blur commits typed value

---

## 4. Tests (must satisfy standards) fileciteturn9file2

Required tests are enumerated in sections:
- 3.2.2 upkeep compiler tests
- 3.3.4 update traits handler tests
- 3.4.3 TraitSystem tests
- 3.6.4 UI tests for structured editor and autocomplete

Additionally:
- `src/engine/runtime/systems/behavior/ActionExecutor.traits.test.ts` must be updated to assert entity-wide traits updates via UPDATE_TRAITS_BATCH.

---

## 5. Completion Criteria
Done when:
- All tests pass.
- Traits are stored on entity-level `traits` component; trait actions no longer touch body.traits.
- TraitSystem runs before PassiveEffectsSystem and applies:
  - trait modifiers (via PassiveEffect reuse)
  - cycles with per-entity accumulators and multi-trigger behavior
- Structured TraitsEditor is the only editing surface for traits (no SessionJsonEditor).
- Autocomplete exists for PassiveEffect targets via schema metadata.
