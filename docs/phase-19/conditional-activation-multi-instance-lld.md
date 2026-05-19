# LLD: Multiple Conditional Activation Ability Instances

## Status
Design for implementation.

## Scope
Implement the requirement that a blueprint may define multiple `Conditional Activation` ability instances, and that each instance has a `priority` used to choose the `Inactive Explanation` shown when multiple conditional activations are currently false.

This design is grounded in the current codebase behavior observed in:

- `src/data/schemas/abilities/index.ts:21-46`
- `src/data/schemas/abilities/conditionalActivation.ts:23-39`
- `src/engine/compiler/CompilerService.ts:39-101`
- `src/engine/compiler/abilities/conditionalActivationCompiler.ts:21-117`
- `src/engine/compiler/abilities/cycleConditionalActivation.ts:17-111`
- `src/engine/runtime/conditionalActivationState.ts:1-37`
- `src/ui/devtools/editors/blueprint/mode/useDesignerAbilities.ts:21-110`
- `src/ui/devtools/editors/blueprint/mode/SingleAbilityRow.tsx:13-102`
- `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.tsx:19-98`
- `src/ui/runtime/world/selection/components/resolveConditionalActivationExplanation.ts:15-35`
- `src/ui/runtime/world/selection/components/ConditionalActivationNotice.tsx:17-53`
- `src/ui/runtime/world/selection/selectionUtils/resolveVisibleEntityDescription.ts:15-50`
- `src/engine/runtime/systems/BehaviorSystem.ts:107-118`

This design also preserves the project contracts in the uploaded context pack, prompt contract, and testing standards. fileciteturn0file0 fileciteturn0file1 fileciteturn0file2

---

## Why

### Current implementation is singleton-only

Today, `_editor.abilities.conditionalActivation` is a single optional object, not a list.

- Schema: `src/data/schemas/abilities/index.ts:21-46`
- Ability shape: `src/data/schemas/abilities/conditionalActivation.ts:28-32`
- Editor add/remove flow treats it as a single ability: `src/ui/devtools/editors/blueprint/mode/useDesignerAbilities.ts:43-66`, `src/ui/devtools/editors/blueprint/mode/SingleAbilityRow.tsx:13-102`
- Runtime explanation and passport hiding also read exactly one config: `src/ui/runtime/world/selection/components/resolveConditionalActivationExplanation.ts:23-34`, `src/ui/runtime/world/selection/selectionUtils/resolveVisibleEntityDescription.ts:19-33`

### Current runtime model has one shared activation flag

The compiler currently emits one hidden state entry, `conditional_activation_active`, and one pair of on/off rules.

- `src/engine/compiler/abilities/conditionalActivationCompiler.ts:48-96`
- `src/engine/runtime/conditionalActivationState.ts:4-22`

Targeted abilities then append one condition referencing that single state entry.

- `src/engine/compiler/abilities/conditionalActivationCompiler.ts:30-46`
- Representative call sites:
  - `src/engine/compiler/abilities/productionCompiler.ts:68-80`
  - `src/engine/compiler/abilities/conversionCompiler.ts:91-104`
  - `src/engine/compiler/abilities/spawnerCompiler.ts:20-29, 88-104`
  - `src/engine/compiler/abilities/samplerCompiler.ts:81-92`
  - `src/engine/compiler/abilities/draftCompiler.ts:30-57`
  - `src/engine/compiler/abilities/updaterCompiler.ts:21-44`
  - `src/engine/compiler/abilities/triggeredActionsCompiler.ts:23-43`

### Multiple instances require per-instance state and explanation selection

Because `BehaviorSystem.shouldRunRule()` evaluates all rule conditions as logical AND, the cleanest implementation is to let each matching conditional activation instance contribute its own state-reference condition to the targeted rule.

- `src/engine/runtime/systems/BehaviorSystem.ts:107-118`

That gives the needed semantics without adding a new runtime mechanism:

- one conditional activation instance -> one active-state reference
- multiple conditional activation instances targeting the same ability -> multiple active-state references
- rule runs only when all selected references are truthy

The only additional requirement beyond gating is explanation selection. That must become explicit and deterministic.

---

## What

## Required behavior contract

### 1. Blueprint/editor contract

`_editor.abilities.conditionalActivation` shall support multiple authored instances.

The authored instance shape is:

- `priority: number` (default `0`)
- `conditions: StructuredCondition[]` (default `[]`)
- `targets: ConditionalActivationTarget[]` (default `[]`)
- `inactiveExplanation?: string`

The editor shall author the canonical shape as an array of instances.

### 2. Backward-compatibility contract

Existing singleton-authored content shall remain readable.

The schema and helper layer shall accept both:

- legacy singleton object
- new array of objects

The editor shall only write the array form.

This avoids unrelated migration of existing authored content and existing fixtures that are still singleton-shaped.

### 3. Gating contract for non-cycle abilities

For every targeted non-cycle ability instance:

- every matching conditional activation instance contributes one active-state condition
- all contributed conditions must be true for the rule to run

Matching continues to use the existing target identity rules:

- singleton abilities match by `ability`
- array abilities match by `ability + targetId`

No new target matching semantics are introduced.

### 4. Gating contract for cycle

Cycle remains a special case because it controls:

- `self.state.cycle_active.value`
- `self.powerSink.throttle`
- `conditional_activation_cycle_saved_throttle`
- `conditional_activation_cycle_hide_throttle`

This special-case behavior already exists in `src/engine/compiler/abilities/cycleConditionalActivation.ts:17-111` and shall remain.

With multiple conditional activations targeting `cycle`:

- cycle is enabled only when all cycle-targeting conditional activation instances with authored conditions are active
- cycle is disabled when any cycle-targeting conditional activation instance with authored conditions is inactive
- the saved-throttle and hide-throttle state remain aggregate singletons, because they represent aggregate cycle UI/runtime behavior, not per-instance behavior

### 5. Explanation contract

The entity-level inactive explanation shall be resolved as follows:

A conditional activation instance is a candidate explanation source only when all of the following are true:

- its `inactiveExplanation` is non-blank
- it has at least one valid target under the current blueprint abilities
- its active state is currently false

The selected explanation is:

- the candidate with the highest `priority`
- if priorities tie, the earliest authored instance (lowest array index)

This selection is deterministic.

### 6. Passport presentation contract

Passport presentation remains hidden when passport is gated and inactive.

With multiple conditional activations, passport presentation is hidden when at least one inactive conditional activation instance validly targets `passport`.

### 7. Empty-condition contract

Current behavior is not normalized or “fixed”.

Observed current behavior:

- general targeted abilities append the active-state condition whenever the target is selected
- compiler only emits the hidden activation state and on/off rules when conditions are authored
- therefore, a selected non-cycle target with no authored conditions depends on a state key that is never compiled
- cycle is the exception and explicitly ignores empty conditions

This design preserves that behavior to avoid scope expansion.

---

## How

## Core implementation strategy

### A. Normalize conditional activation input once at every logic boundary

Introduce a shared normalization helper that accepts:

- `undefined`
- legacy singleton object
- array of objects

and returns an array in authored order.

This helper must be used in all runtime/compiler/UI logic that consumes `abilities.conditionalActivation`.

### B. Compile one active-state entry per authored instance

For each conditional activation instance at authored index `i`:

- if `conditions.length === 0`, emit no state and no on/off rules
- otherwise emit:
  - hidden state entry for that instance’s active flag
  - on-rule that sets the instance active flag to `1`
  - off-rule that sets the instance active flag to `0`

#### Active-state key contract

To minimize breakage and preserve existing semantics for the first authored instance:

- index `0` uses the existing key: `conditional_activation_active`
- index `n > 0` uses: `conditional_activation_active_<n>`

This preserves current single-instance expectations while extending the model for additional instances.

#### Rule-id contract

To preserve existing single-instance expectations:

- index `0` uses existing rule ids:
  - `sys_conditional_activation_on`
  - `sys_conditional_activation_off`
- index `n > 0` uses:
  - `sys_conditional_activation_on_<n>`
  - `sys_conditional_activation_off_<n>`

### C. Append all matching active-state refs to targeted rules

Replace the current “append one active state” behavior with “append all matching active states”.

For each targeted rule:

- iterate authored conditional activation instances in array order
- for each instance that selects the target, append a condition referencing that instance’s active-state key

Because `BehaviorSystem.shouldRunRule()` already ANDs rule conditions, this produces the correct multi-instance gating semantics without introducing a new execution model.

### D. Aggregate cycle gating over matching instance active states

`cycleConditionalActivation.ts` shall stop recompiling structured conditions directly for multiple instances. Instead, it shall derive cycle enable/disable from the already-compiled per-instance active-state keys.

#### Cycle-on rule

The cycle-on rule shall require all matched cycle-targeting instance active-state refs.

#### Cycle-off rule

The cycle-off rule shall use the logical negation of “all matched cycle-targeting instance active-state refs are true”.

This preserves the existing cycle-specialized side effects while reusing the general conditional activation state model.

### E. Resolve explanation by scanning all instances

The explanation resolver shall:

- normalize all configs
- evaluate each instance independently by index
- keep only candidates that are inactive, non-blank, and validly targeted
- select the highest-priority candidate
- break ties by lower index

### F. Keep UI render-only and put logic in pure helpers

No business logic is added to React view components.

All selection logic, state-key resolution, config normalization, and target scanning remain in pure `.ts` helpers, which is consistent with the project architecture. fileciteturn0file0

---

## File-by-file implementation plan

## 1. Data schema and normalization

### `src/data/schemas/abilities/conditionalActivation.ts`

**Responsibility**

Define the conditional activation authored shape, target shape, and accepted persisted/editor input shape.

**Change**

- Split the current single-object schema into:
  - a single-instance entry schema
  - a property schema that accepts either a singleton entry or an array of entries
- Add `priority: z.number().default(0)` to the entry schema
- Export a normalization helper that converts `undefined | singleton | array` into `ConditionalActivationAbilityConfig[]`

**Interface**

The file shall expose:

- `ConditionalActivationTargetSchema` (unchanged)
- `ConditionalActivationAbilityEntrySchema` (new)
- `ConditionalActivationAbilitySchema` (property-level schema; accepts singleton or array)
- `ConditionalActivationAbilityConfig` = single instance type
- `ConditionalActivationAbilityValue` = property input type (`undefined | singleton | array`)
- `normalizeConditionalActivationConfigs(value)` -> `ConditionalActivationAbilityConfig[]`

**Required logic**

- authored order is preserved exactly
- normalization never sorts, deduplicates, or mutates entries
- `priority` defaults to `0`

### `src/data/schemas/abilities/index.ts`

**Responsibility**

Expose the editor abilities schema.

**Change**

No behavioral restructuring. Keep the `conditionalActivation` property name, but bind it to the updated schema.

**Interface**

`_editor.abilities.conditionalActivation` remains a single property name. Only its accepted value shape changes.

### `src/data/schemas/abilities/conditionalActivationSupport.ts`

**Responsibility**

Own targetability, target equality, and target validity helpers.

**Change**

Keep existing target semantics unchanged.

Add plural-instance helpers needed by runtime/compiler consumers if and only if they reduce duplication without changing behavior. At minimum, this file may consume the normalization helper or expose helpers that operate on normalized arrays.

**Interface**

The following existing contracts remain unchanged:

- targetable ability list
- target equality = `ability + targetId`
- target validity rules for singleton vs array abilities

No new target types are introduced.

---

## 2. Runtime state helpers

### `src/engine/runtime/conditionalActivationState.ts`

**Responsibility**

Resolve hidden runtime state keys and interpret them as booleans.

**Change**

Add indexed active-state support.

**Interface**

Keep existing exports for cycle throttle state unchanged:

- `CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY`
- `CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY`
- `isConditionalActivationThrottleHidden(...)`
- `hasConditionalActivationSavedThrottleState(...)`

Extend active-state support with:

- `getConditionalActivationActiveStateKey(index: number): string`
- `isConditionalActivationActive(entity, index?: number): boolean`

**Required logic**

- `index === 0` resolves to existing key `conditional_activation_active`
- `index > 0` resolves to `conditional_activation_active_<index>`
- `isConditionalActivationActive(entity)` with omitted index continues to mean index `0`

This preserves current single-instance behavior and adds deterministic indexed lookup.

---

## 3. Compiler: shared conditional activation preparation

### `src/engine/compiler/abilities/conditionalActivationCompiler.ts`

**Responsibility**

Validate conditional activation targets, compile hidden activation state/rules, and append activation-state conditions to targeted behavior rules.

**Change**

Convert the implementation from singleton-only to instance-array aware.

**Interface**

Keep the current high-level responsibilities, but change the internal contract from “one config” to “zero or more configs”.

Required exports:

- `hasConditionalActivationConditions(config)` stays entry-scoped
- `isConditionalActivationSelected(config, target)` stays entry-scoped
- `prepareConditionalActivation(draft, abilities)` becomes plural-aware internally
- replace `appendConditionalActivationActiveState(...)` with `appendConditionalActivationActiveStates(...)`
- if cycle aggregation needs a reusable negated-all-active compiled condition helper, export it from this file

**Required logic**

1. Normalize `abilities.conditionalActivation` into authored-order array.
2. Validate targets per instance.
3. For each instance with authored conditions:
   - emit hidden active-state entry for that index
   - emit on/off rules for that index
4. When appending rule conditions for a target:
   - iterate all normalized instances in authored order
   - append one active-state ref condition for every matching instance

**Validation/logging contract**

Warnings must become instance-specific.

The warning message must include the authored instance index so the failing authored row is unambiguous.

**Do not change**

- target validity rules
- meaning of `targets`
- existing empty-condition semantics

### `src/engine/compiler/CompilerService.ts`

**Responsibility**

Thread authored abilities into all compilers.

**Change**

Continue to call `prepareConditionalActivation(...)` before other ability compilers.

Pass the conditional activation property value through unchanged; downstream helpers normalize.

**Interface**

No new compiler ordering is introduced.

The ordering remains:

1. `prepareConditionalActivation(...)`
2. ability compilers

This is required so per-instance active-state entries exist before rule assembly consumes them.

---

## 4. Compiler: individual gated abilities

The following files all retain their current responsibility: compile one authored ability entry into behavior/state artifacts.

Their only conditional activation change is to append all matching conditional activation active-state refs, rather than a single shared ref.

### `src/engine/compiler/abilities/productionCompiler.ts`

**Responsibility**

Compile one production ability entry.

**Change**

Replace the single-state append helper call with the plural helper.

**Interface**

Fourth parameter remains the raw `conditionalActivation` property value.

Rule behavior contract:

- if zero matching conditional activation instances target this production entry, no activation-state condition is appended
- if one matching instance targets it, one activation-state condition is appended
- if multiple matching instances target it, one condition per matching instance is appended

### `src/engine/compiler/abilities/conversionCompiler.ts`

Same responsibility and interface contract as production compiler, but for one conversion ability entry.

### `src/engine/compiler/abilities/spawnerCompiler.ts`

Same responsibility and interface contract as production compiler, but for one spawner ability entry.

### `src/engine/compiler/abilities/samplerCompiler.ts`

Same responsibility and interface contract as production compiler, but for one sampler ability entry.

### `src/engine/compiler/abilities/draftCompiler.ts`

Same responsibility and interface contract as production compiler, but for one draft ability entry.

### `src/engine/compiler/abilities/updaterCompiler.ts`

Same responsibility and interface contract as production compiler, but for one updater ability entry.

### `src/engine/compiler/abilities/triggeredActionsCompiler.ts`

Same responsibility and interface contract as production compiler, but for one triggered actions ability entry.

---

## 5. Compiler: cycle special case

### `src/engine/compiler/abilities/cycleConditionalActivation.ts`

**Responsibility**

Translate conditional activation into cycle runtime side effects:

- `cycle_active`
- throttle restore/shutdown
- hide/show throttle slider

**Change**

Make the file aggregate multiple cycle-targeting conditional activation instances.

**Interface**

Input remains:

- `draft`
- `cycle`
- raw `conditionalActivation` property value

**Required logic**

1. Normalize all conditional activation configs.
2. Select only instances that target `cycle`.
3. From those, keep only instances with authored conditions for cycle-side-effect compilation.
4. If none remain, return without changing existing cycle behavior.
5. Preserve current aggregate cycle state keys:
   - `cycle_active`
   - `conditional_activation_cycle_saved_throttle`
   - `conditional_activation_cycle_hide_throttle`
6. Preserve current single-instance rule ids for the aggregate cycle gate:
   - `sys_conditional_activation_cycle_on`
   - `sys_conditional_activation_cycle_off`
7. Cycle-on requires all selected cycle-targeting active-state refs.
8. Cycle-off is the logical negation of that aggregate condition.

**Important preservation rule**

This file continues to ignore cycle-targeting instances with zero authored conditions, because that is the current observed cycle behavior.

### `src/engine/compiler/abilities/cycleCompiler.ts`

**Responsibility**

Compile cycle ability and delegate cycle conditional activation.

**Change**

No structural change beyond continuing to pass the `conditionalActivation` property into `applyCycleConditionalActivation(...)`.

---

## 6. Editor: ability list and authored shape

### `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`

**Responsibility**

Provide default authored values for new ability entries.

**Change**

Change `createConditionalActivationAbilityDraft()` so the returned entry includes:

- `priority: 0`
- `conditions: []`
- `targets: []`

**Interface**

This function now creates one conditional activation entry, not the entire property container.

### `src/ui/devtools/editors/blueprint/mode/abilitySchemas.ts`

**Responsibility**

Define which abilities are singleton vs array-authored in the designer.

**Change**

Move `conditionalActivation` into `arrayAbilities`.

**Interface**

Designer behavior contract after change:

- `conditionalActivation` can be added multiple times
- `canAddAbility("conditionalActivation")` must return `true` even when one instance already exists

### `src/ui/devtools/editors/blueprint/mode/abilityListMutations.ts`

**Responsibility**

Add array-authored ability items.

**Change**

Add `conditionalActivation` to:

- `ArrayAbilityKey`
- `ArrayAbilityItemMap`
- `arrayAbilityFactories`

**Interface**

`addArrayAbilityItem(abilities, "conditionalActivation")` appends one new entry created by `createConditionalActivationAbilityDraft()`.

### `src/ui/devtools/editors/blueprint/mode/useDesignerAbilities.ts`

**Responsibility**

Drive add/remove ability behavior in the blueprint designer.

**Change**

Remove the singleton special-case branch for `conditionalActivation`.

After the change, adding `conditionalActivation` must flow through the existing array-ability path.

**Interface**

- `addAbility("conditionalActivation")` appends one entry
- `removeAbilityItem("conditionalActivation", index)` removes one entry
- when the last entry is removed, the `conditionalActivation` property is deleted, matching existing array-ability behavior

### `src/ui/devtools/editors/blueprint/mode/SingleAbilityRow.tsx`

**Responsibility**

Render singleton-authored ability rows.

**Change**

Remove `conditionalActivation` from:

- `SingleAbilityKey`
- `SINGLE_ABILITY_KEYS`
- single-row form rendering

**Interface**

After the change, this file no longer owns any conditional activation rendering path.

### `src/ui/devtools/editors/blueprint/mode/ArrayAbilityList.tsx`

**Responsibility**

Render array-authored ability sections.

**Change**

Render the new conditional activation section using the existing array-list pattern.

**Interface**

The section input is `abilities.conditionalActivation ?? []`.

### `src/ui/devtools/editors/blueprint/mode/ConditionalActivationAbilitySection.tsx` (new)

**Responsibility**

Render one `ComponentRow` per authored conditional activation instance.

**Change**

New file.

**Interface**

Props:

- `entries: NonNullable<EditorAbilities["conditionalActivation"]> | ConditionalActivationAbilityConfig[]`
- `rootPath: string`
- `onRemoveItem: (index: number) => void`

**Required logic**

- render one row per authored instance, in array order
- row title format: `Conditional Activation <1-based index>`
- row summary remains “Gate other abilities by shared conditions”
- row delete removes only that instance
- form base path for index `i` is `${rootPath}._editor.abilities.conditionalActivation.${i}`

No reordering behavior is introduced.

### `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.tsx`

**Responsibility**

Render the form for one conditional activation authored instance.

**Change**

Convert from singleton-root-path form to per-entry base-path form.

**Interface**

Props become:

- `basePath: string`

The form shall render and persist exactly these fields for the current entry:

1. `Priority` -> number field -> `${basePath}.priority`
2. `Inactive Explanation` -> string/textarea -> `${basePath}.inactiveExplanation`
3. `Conditions` -> structured conditions field -> `${basePath}.conditions`
4. target checkboxes -> mutate `${basePath}.targets`

**Required logic**

- target options continue to be derived from the whole authored abilities object
- checked state and mutations operate only on the current entry’s `targets`
- mutating one entry must not mutate sibling conditional activation entries

---

## 7. Runtime UI: explanation and passport visibility

### `src/ui/runtime/world/selection/components/resolveConditionalActivationExplanation.ts`

**Responsibility**

Return the entity-level inactive explanation string, or `null`.

**Change**

Convert from singleton config evaluation to multi-instance scanning with deterministic priority selection.

**Interface**

Function signature remains:

- `resolveConditionalActivationExplanation(entityId, runtime): string | null`

**Required logic**

1. Normalize the authored configs.
2. For each config at index `i`:
   - resolve non-blank explanation
   - verify at least one valid target
   - check inactive state via `isConditionalActivationActive(entity, i)`
3. Keep only candidate failures.
4. Select highest `priority`.
5. Break ties by lowest `i`.
6. Return that explanation, else `null`.

### `src/ui/runtime/world/selection/components/ConditionalActivationNotice.tsx`

**Responsibility**

Render the inactive explanation notice when one is available.

**Change**

Keep the component render-only.

Update any pre-check logic so it is compatible with multiple authored instances.

**Interface**

Rendered output contract stays unchanged:

- no notice when resolver returns `null`
- one notice block when resolver returns text

The component never renders multiple notices.

### `src/ui/runtime/world/selection/selectionUtils/resolveVisibleEntityDescription.ts`

**Responsibility**

Hide passport-derived presentation when passport is conditionally inactive.

**Change**

Convert from singleton config evaluation to multi-instance scanning.

**Interface**

Public function signatures remain unchanged.

**Required logic**

Passport presentation is hidden when any normalized conditional activation instance:

- validly targets `passport`, and
- is currently inactive for its own index

---

## Tests

The tests must validate behavior, not implementation details, and must follow the existing testing standards. fileciteturn0file2

## Unit tests

### `src/data/schemas/abilities/conditionalActivation.test.ts`

**Change**

Add explicit coverage for:

- legacy singleton input is accepted
- array input is accepted
- `priority` defaults to `0`
- authored order is preserved after normalization

### `src/engine/compiler/abilities/conditionalActivationCompiler.test.ts`

**Change**

Replace singleton assumptions with plural-instance assertions.

**Required coverage**

- multiple instances compile multiple active-state entries/rule pairs
- index `0` preserves current unsuffixed state key/rule ids
- later indexes use suffixed state keys/rule ids
- appending activation-state refs adds one ref per matching instance
- warning messages include authored instance index

### `src/engine/runtime/conditionalActivationState.test.ts`

**Change**

Add indexed-state coverage.

**Required coverage**

- index `0` reads existing unsuffixed key
- index `1+` reads suffixed keys
- missing indexed keys resolve to inactive

### Gated compiler tests

Update the following files so each asserts that multiple matching conditional activation instances produce multiple rule conditions, not one:

- `src/engine/compiler/abilities/productionCompiler.conditionalActivation.test.ts`
- `src/engine/compiler/abilities/conversionCompiler.conditionalActivation.test.ts`
- `src/engine/compiler/abilities/spawnerCompiler.conditionalActivation.test.ts`
- `src/engine/compiler/abilities/samplerCompiler.conditionalActivation.test.ts`
- `src/engine/compiler/abilities/draftCompiler.conditionalActivation.test.ts`
- `src/engine/compiler/abilities/updaterCompiler.conditionalActivation.test.ts`
- `src/engine/compiler/abilities/triggeredActionsCompiler.conditionalActivation.test.ts`

**Required coverage for each**

- zero matching instances -> no appended activation-state ref
- one matching instance -> one appended activation-state ref
- two matching instances -> two appended activation-state refs

### `src/engine/compiler/abilities/cycleCompiler.conditionalActivation.test.ts`

**Change**

Extend from singleton cycle gate to aggregate cycle gate.

**Required coverage**

- multiple cycle-targeting instances compile one aggregate cycle-on rule and one aggregate cycle-off rule
- saved throttle and hide-throttle state keys remain the existing singleton keys
- cycle-targeting instances with no conditions are ignored by cycle-side-effect compilation

### `src/ui/runtime/world/selection/components/resolveConditionalActivationExplanation.test.ts`

**Change**

Add multi-instance explanation resolution coverage.

**Required coverage**

- highest-priority inactive explanation wins
- equal priority resolves by lower authored index
- blank explanations are ignored
- active instances are ignored
- instances without valid targets are ignored

## Integration tests

### `src/engine/runtime/systems/behavior/CycleConditionalActivationThrottle.integration.test.ts`

**Change**

Extend to multi-instance aggregate cycle gating.

**Required coverage**

- cycle restore occurs only when all targeted cycle gates are active
- cycle shutdown occurs when any targeted cycle gate is inactive

## View tests

### `src/ui/devtools/editors/blueprint/mode/DesignerMode.abilities.test.tsx`

**Change**

Add conditional activation array-authoring coverage.

**Required coverage**

- `Conditional Activation` can be added more than once
- each add creates a distinct row

### `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.test.tsx`

**Change**

Convert expectations from singleton property shape to per-entry array shape.

**Required coverage**

- target toggles update only the addressed array entry
- sibling entries are unchanged

### `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.explanation.test.tsx`

**Change**

Extend to cover `priority` and array-path persistence.

**Required coverage**

- explanation persists to the correct array index
- priority persists to the correct array index

### `src/ui/runtime/world/selection/components/ConditionalActivationNotice.test.tsx`

**Change**

Add coverage that the rendered notice uses the highest-priority failing explanation.

### `src/ui/runtime/world/selection/conditionalActivationTestUtils.tsx`

**Change**

Update fixture helpers so tests can author:

- one conditional activation instance
- multiple instances
- indexed active-state entries

The helper must default to the new canonical array shape.

---

## Non-goals

The following are explicitly out of scope and must not be changed by this implementation:

- targetable ability list
- target matching semantics
- explanation rendering format
- card-specific explanation routing
- cycle saved-throttle/hide-throttle key names
- any unrelated editor refactor
- any migration of existing authored raw example files, because singleton input remains readable

---

## Acceptance criteria

Implementation is complete only when all of the following are true:

1. Blueprints can author multiple `conditionalActivation` instances in the designer.
2. Each instance has a persisted `priority` field.
3. Non-cycle targeted abilities are gated by the logical AND of all matching conditional activation instances.
4. Cycle is gated by the logical AND of all cycle-targeting conditional activation instances that have authored conditions.
5. When multiple conditional activations are false, the notice shows exactly one explanation: the highest-priority failing instance, ties broken by authored order.
6. Passport presentation is hidden when any inactive conditional activation instance targets `passport`.
7. Existing singleton-authored content remains readable.
8. Tests cover schema, compiler, runtime integration, and UI behavior under the new contract.
9. No code outside this design scope is changed.

