# LLD: Triggered Actions ability and cycle throttle shutdown on conditional deactivation

## Document purpose

This document defines the low-level design for two features:

1. A new authored ability that dispatches existing `BehaviorAction[]` on trigger.
2. A correction to cycle conditional activation so an active cycle throttles down to `0` as soon as its activation conditions go false within the existing phase contract.

This design is grounded in the uploaded codebase and in the project contracts:

- Runtime commands are the only mutation path.
- Systems are read-only and emit commands only.
- The tick loop is phase-based and buffered.
- Scope expansion and speculative abstractions are prohibited.
- Tests must verify behavior and honor the runtime contract.

## Scope

### In scope

- A new array ability named `triggeredActions`.
- Editor schema, compiler wiring, conditional-activation targeting, validation, editor UI wiring, and save-time sanitization for `triggeredActions`.
- Cycle conditional activation compile logic so cycle throttle shutdown is emitted from the same system phase in which the activation gate evaluates false.
- Unit, integration, and view/store tests required by the project testing standards.

### Out of scope

- Arbitrary terminal command dispatch from authored content.
- New `BehaviorAction` variants.
- New runtime command types or command handlers for feature 1.
- Changes to generic conditional activation timing for non-cycle abilities.
- Refactors outside the files listed below.

---

# Feature 1: Triggered Actions ability

## Why

The engine already has a typed imperative action pipeline:

- `BehaviorActionSchema` already supports `KILL_ALL_BODIES_EXCEPT` and other authored actions.
- `ActionExecutor` already converts these authored actions into runtime commands.
- Existing authored abilities such as `draft`, `spawner`, `production`, and `updater` compile into behavior rules with typed actions.

The missing capability is not "run arbitrary commands". The missing capability is "author an ability whose payload is an existing `BehaviorAction[]` and whose execution is constrained by existing trigger and condition semantics".

Using terminal commands here would be the wrong layer because terminal commands are string-parsed and are not the authored-content contract. The authored-content contract is `BehaviorRule -> BehaviorAction -> RuntimeCommand`.

## What

Add a new array ability named `triggeredActions` with this authored contract:

- Each entry is an authored unit with its own identity, triggers, conditions, and action list.
- Each entry compiles to exactly one behavior rule.
- The compiled rule executes only through existing `BehaviorAction` execution.
- The ability does not introduce freeform command strings.
- The ability participates in conditional activation exactly like `draft`, `spawner`, `production`, and `updater`.
- The ability requires a cycle only when one of its triggers includes `cycle_complete`.

### Authored interface contract

Each `triggeredActions` entry has:

- `id: string`
- `triggers: AbilityTriggerKind[]`
- `conditions: string[]`
- `actions: BehaviorAction[]`

### Validation contract

- `actions` must contain at least one `BehaviorAction`.
- `triggers` defaults to `['cycle_complete']`.
- `conditions` defaults to `[]`.
- If any entry includes `cycle_complete` and the blueprint has no `cycle` ability, validation must produce the same class of dependency error already used by other triggered abilities.

### Compile contract

For each authored entry, the compiler must emit one `BehaviorRule` with:

- deterministic id prefix for this ability
- trigger conditions from `buildAbilityTriggerConditions`
- authored condition lines appended via `appendRuleConditions`
- conditional activation appended via `appendConditionalActivationActiveState` when selected
- actions copied verbatim from the authored entry

No translation to terminal command strings is allowed.

## How

### Data flow

Authored blueprint data
-> `TriggeredActionsAbilitySchema`
-> `EditorAbilitiesSchema.triggeredActions`
-> `CompilerService`
-> `triggeredActionsCompiler`
-> compiled `BehaviorRule.actions`
-> existing `BehaviorSystem`
-> existing `ActionExecutor`
-> existing runtime commands and handlers

### Behavior semantics

- Trigger evaluation is shared with existing triggered abilities.
- Condition parsing is shared with existing authored condition line compilation.
- Conditional activation targeting is shared with existing per-entry target selection.
- Action execution is shared with existing behavior runtime execution.
- No new runtime execution path is introduced.

### Naming decision

Use `triggeredActions` as the editor key and schema/compiler/UI name.

Reason:

- It is explicit.
- It avoids collision with `BehaviorRule.actions` and generic "actions" terminology.
- It matches the already-discussed design intent.

---

# Feature 2: Cycle throttle shutdown on conditional deactivation

## Why

The current cycle conditional activation logic compiles cycle on/off rules that read `self.state.conditional_activation_active.value`.

That state is itself written by separate conditional activation rules in the same behavior phase.

Because the runtime is phase-based and buffered:

- rule conditions are evaluated against the current snapshot
- actions emit commands
- emitted commands are collected and applied in the next apply phase

Therefore, a cycle on/off rule that depends on `conditional_activation_active` cannot observe a change written by another rule in the same behavior phase. Sort key ordering does not fix this because mutations are not visible until the next apply phase.

Current consequence:

- when activation conditions go false, the generic conditional activation rule emits `conditional_activation_active = 0`
- the cycle-specific throttle-off rule still sees the old snapshot value in that same tick
- throttle shutdown is delayed by an extra tick beyond the minimum allowed by the runtime contract

The required behavior is narrower and explicit: when a cycle is active and the conditional activation gate becomes false, the cycle must emit throttle shutdown immediately from that system phase so the next apply phase sets throttle to `0`.

## What

Keep generic conditional activation exactly as it is for non-cycle abilities.

Change only the cycle-specific conditional activation compiler so that its cycle on/off rules use the compiled structured activation gates directly, rather than reading the intermediary `conditional_activation_active` state.

### Runtime contract

Given:

- a blueprint with `cycle`
- conditional activation with non-empty conditions
- `cycle` selected as a conditional activation target
- current runtime throttle greater than `0`

When the structured activation conditions evaluate false in a snapshot:

- the cycle-off rule must emit `UPDATE_POWER_SINK` with `throttle = 0` in that same behavior phase
- the next apply phase must set runtime throttle to `0`

This is the earliest possible effect under the project runtime laws and is therefore the correct contract.

### Preserve existing behavior

Do not change:

- the generic `conditional_activation_active` state mechanism
- saved throttle state storage
- throttle slider hide/show state
- cycle active state storage
- conditional activation semantics for non-cycle abilities

## How

### Compile strategy

In `applyCycleConditionalActivation`:

- build `onGate` from the structured activation conditions
- build `offGate` from the negated structured activation conditions
- use `onGate` as the condition for the cycle-on rule
- use `offGate` as the condition for the cycle-off rule

The actions of those rules remain the same:

Cycle on:

- set `self.state.cycle_active.value = 1`
- set `self.powerSink.throttle = self.state.conditional_activation_cycle_saved_throttle.value`
- set `self.state.conditional_activation_cycle_hide_throttle.value = 0`

Cycle off:

- set `self.state.cycle_active.value = 0`
- set `self.powerSink.throttle = 0`
- set `self.state.conditional_activation_cycle_hide_throttle.value = 1`

### Why this is correct

This reuses the exact authored conditions already used by generic conditional activation.

It removes only the unnecessary extra dependency on intermediary state for cycle throttle control.

It does not violate the runtime phase contract because the emitted throttle mutation still applies through the next apply phase.

---

# Files to add or change

Each file below is either required for one of the two features or required to keep the authored/editor/save contracts coherent.

## 1. `src/data/schemas/abilities/triggeredActions.ts` (new)

### Responsibility

Defines the authored schema and public type for the new `triggeredActions` ability.

### Logic

- Define `TriggeredActionsAbilitySchema`.
- Reuse `BehaviorActionSchema` for `actions`.
- Reuse `AbilityTriggersSchema` for `triggers`.
- Reuse `ConditionLinesSchema` for `conditions`.
- Require `actions.length >= 1`.
- Provide `id` default via `nanoid()`.

### Interface

Exports:

- `TriggeredActionsAbilitySchema`
- `TriggeredActionsAbilityConfig`

No runtime behavior belongs in this file.

## 2. `src/data/schemas/abilities/index.ts` (change)

### Responsibility

Registers all authored abilities in the editor schema.

### Logic

- Add `triggeredActions: z.array(TriggeredActionsAbilitySchema).optional()` to `EditorAbilitiesSchema`.
- Export the new ability type through existing `EditorAbilities` inference only; no custom wrapper type is needed.

### Interface

`EditorAbilities['triggeredActions']` becomes the canonical authored storage shape for the new ability.

## 3. `src/data/schemas/abilities/conditionalActivation.ts` (change)

### Responsibility

Defines the set of ability keys that conditional activation can address.

### Logic

- Add `triggeredActions` to `ConditionalActivationAbilityKeys`.

### Interface

Conditional activation target objects may now legally reference:

- `{ ability: 'triggeredActions', targetId: <entry id> }`

## 4. `src/data/schemas/abilities/conditionalActivationSupport.ts` (change)

### Responsibility

Declares which ability types have defined inactive semantics and validates target existence.

### Logic

- Add `triggeredActions` to `CONDITIONAL_ACTIVATION_TARGETABLE_ABILITIES`.
- Do not change the validation algorithm; array-entry validation by `id` already matches the new ability shape.

### Interface

`isConditionalActivationTargetableAbility('triggeredActions')` must return `true`.

## 5. `src/engine/compiler/abilities/triggeredActionsCompiler.ts` (new)

### Responsibility

Compiles one authored `triggeredActions` entry into one behavior rule.

### Logic

For each entry:

1. Resolve triggers with existing defaults.
2. If cycle is required by triggers and the blueprint has no compiled cycle state, log the same class of warning already used by `draft`, `spawner`, `production`, and `updater`.
3. Create one `BehaviorRule`.
4. Use `buildAbilityTriggerConditions(triggers)`.
5. Append authored `conditions` via `appendRuleConditions`.
6. Append conditional activation active-state gating via `appendConditionalActivationActiveState` using target `{ ability: 'triggeredActions', targetId: config.id }`.
7. Set `rule.actions` to the authored `actions` verbatim.
8. Append the rule to `draft.components.behavior.rules`.

### Interface

Function signature:

- input: `(draft, config, index, conditionalActivation?)`
- output: mutates the already-cloned blueprint draft in place, matching the compiler convention used elsewhere

No new helper abstraction is required.

## 6. `src/engine/compiler/CompilerService.ts` (change)

### Responsibility

Owns compiler orchestration order.

### Logic

- After `draft` compilation and before or after `updater` compilation, iterate `abilities.triggeredActions ?? []` and call `triggeredActionsCompiler` for each entry.
- Pass through `conditionalActivation` exactly the way other targeted array abilities do.

### Interface

`CompilerService.compile()` must include `triggeredActions` in the compiled behavior output when present.

## 7. `src/engine/compiler/validation/collisionDetector.ts` (change)

### Responsibility

Aggregates editor validation issues.

### Logic

- Include a validation branch for `triggeredActions` cycle dependency.
- Reuse `requiresCycleAbility` on `abilities.triggeredActions`.
- Emit an error when any entry depends on `cycle_complete` and no `cycle` ability exists.

### Interface

Validation issue contract must match existing dependency issues:

- stable id
- severity `error`
- ability key `triggeredActions`
- unambiguous message

## 8. `src/engine/compiler/validation/collisionDetectorExtras.ts` or `src/engine/compiler/validation/collisionDetectorUtils.ts` (change)

### Responsibility

Holds dependency helpers used by `collisionDetector.ts`.

### Logic

- Add one helper function for `triggeredActions` cycle dependency if the implementation follows the existing split used for `draft`, `spawner`, and `sampler`.
- Do not introduce a generic abstraction unless the implementation is a literal copy of the existing pattern and remains local to validation.

### Interface

The helper returns `ValidationIssue[]` only.

## 9. `src/engine/compiler/abilities/cycleConditionalActivation.ts` (change)

### Responsibility

Compiles cycle-specific conditional activation state, throttle save/restore, and throttle visibility rules.

### Logic

Replace rule conditions that currently read `conditional_activation_active` with directly compiled activation gates derived from the structured conditional activation conditions.

Specifically:

- keep initial state initialization exactly as today
- keep saved throttle and hidden throttle state keys exactly as today
- keep initial compiled throttle forced to `0` exactly as today when cycle is targeted
- replace cycle-on rule condition with the direct positive gate
- replace cycle-off rule condition with the direct negated gate
- keep cycle-on and cycle-off actions unchanged

### Interface

Input and in-place mutation contract stay unchanged:

- `(draft, cycle, conditionalActivation?) => void`

No new runtime handler or new state key is introduced.

## 10. `src/ui/devtools/editors/blueprint/mode/abilitySchemas.ts` (change)

### Responsibility

Maps editor ability keys to the zod schemas used by the designer UI.

### Logic

- Add `triggeredActions: TriggeredActionsAbilitySchema.array()`.
- Add `triggeredActions` to `arrayAbilities`.

### Interface

The designer add-ability menu will automatically recognize the new key through existing generic logic.

## 11. `src/ui/devtools/editors/blueprint/mode/abilityListMutations.ts` (change)

### Responsibility

Creates default drafts for array abilities when the user adds an entry.

### Logic

- Add `triggeredActions` to `ArrayAbilityKey`.
- Add a factory mapping for `createTriggeredActionsAbilityDraft`.

### Interface

`addArrayAbilityItem(abilities, 'triggeredActions')` must append one new default entry.

## 12. `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts` (change)

### Responsibility

Provides default editor drafts for authored abilities.

### Logic

Add `createTriggeredActionsAbilityDraft()` returning:

- generated `id`
- default `conditions: []`
- default `actions: []`
- allow trigger default to come from schema or set `['cycle_complete']` explicitly if the form relies on immediate materialization

### Interface

The returned object must be shape-compatible with `TriggeredActionsAbilitySchema` except for the intentionally incomplete `actions` field, which the editor will fill and save-time sanitization will remove if left empty.

## 13. `src/ui/devtools/editors/blueprint/mode/abilityListUtils.ts` (change)

### Responsibility

Defines human-readable labels and stable React keys for ability sections.

### Logic

- Add `buildTriggeredActionsKey(entry)` based on `entry.id`.
- Add `triggeredActions: 'Triggered Actions'` to `abilityLabels`.

### Interface

The section title for the add menu and rendered rows becomes stable and readable.

## 14. `src/ui/devtools/editors/blueprint/mode/ArrayAbilityList.tsx` (change)

### Responsibility

Renders all array ability sections in designer mode.

### Logic

- Import and render `TriggeredActionsAbilitySection`.
- Wire `onRemoveItem(index) => onRemoveItem('triggeredActions', index)`.
- Place it near other triggered rule-based abilities (`draft`, `updater`) for consistency.

### Interface

The designer must render every existing `triggeredActions` entry in the blueprint.

## 15. `src/ui/devtools/editors/blueprint/mode/TriggeredActionsAbilitySection.tsx` (new)

### Responsibility

Renders one `ComponentRow` per `triggeredActions` entry.

### Logic

For each entry:

- compute a stable React key from `entry.id`
- derive title as:
  - `Triggered Actions N` when no better summary exists, or
  - a short action-derived title only if the implementation can do so without introducing parsing logic duplication
- render `TriggeredActionsAbilityForm`
- wire delete to the provided callback

### Interface

Props:

- `entries`
- `rootPath`
- `onRemoveItem(index)`

This file is a view wrapper only. No business logic.

## 16. `src/ui/devtools/editors/blueprint/mode/forms/TriggeredActionsAbilityForm.tsx` (new)

### Responsibility

Editor form for one `triggeredActions` entry.

### Logic

Compose existing field components only:

- `AbilityTriggerField`
- `ConditionsField`
- `BehaviorActionArrayField`

Field order:

1. Triggers
2. Conditions
3. Actions

This form must not implement new parsing logic. It must reuse the existing behavior action text compiler already used by `DraftAbilityForm`.

### Interface

Props:

- `basePath`

Paths written:

- `${basePath}.triggers`
- `${basePath}.conditions`
- `${basePath}.actions`

## 17. `src/ui/devtools/editors/blueprint/mode/conditionalActivationTargetOptions.ts` (change)

### Responsibility

Builds the list of selectable conditional activation targets shown in the designer.

### Logic

- Add `triggeredActions` to the display order.
- Because each entry has an `id`, the existing array-target logic can be reused unchanged.

### Interface

`buildConditionalActivationTargetOptions()` must now surface one selectable row per `triggeredActions` entry.

## 18. `src/ui/devtools/editors/blueprint/mode/conditionalActivationTargetLabels.ts` (change)

### Responsibility

Provides display labels for conditional activation target rows.

### Logic

Add a label rule for `triggeredActions`:

- `Triggered Actions N`

Do not inspect action payloads for labels; that would duplicate behavior-action formatting logic and is not necessary for this feature.

### Interface

The label must be stable, deterministic, and independent of runtime state.

## 19. `src/ui/devtools/state/moduleStore.abilitySanitizer.triggeredActions.ts` (new)

### Responsibility

Removes incomplete `triggeredActions` entries before blueprint/module save.

### Logic

- Treat an entry with `actions.length === 0` as incomplete and remove it during save sanitization.
- Reuse `sanitizeConditionsInList` for authored condition lines on surviving entries.

Reason this file is required:

- the editor add-entry flow creates an incomplete draft entry first
- the schema requires at least one action
- without save-time sanitization, blueprint/module save would fail on an untouched newly-added entry

### Interface

Returns:

- sanitized `triggeredActions` list
- `removed` count
- `conditionsRemoved` count

This must match the shape used by the existing draft and updater sanitizers.

## 20. `src/ui/devtools/state/moduleStore.abilitySanitizer.ts` (change)

### Responsibility

Aggregates per-ability sanitization before save.

### Logic

- Run the new `triggeredActions` sanitizer.
- Include its removed count in the total removed count.
- Include its condition removals in the total conditions-removed count.
- Write sanitized output back into `blueprint._editor.abilities.triggeredActions`.

### Interface

The existing `sanitizeBlueprintAbilities()` and `sanitizeModuleAbilities()` contracts remain unchanged.

## 21. `src/ui/devtools/state/moduleStore.actions.module.ts` (change, only if sanitizer message text is generalized)

### Responsibility

Logs save-time sanitization warnings during whole-module save.

### Logic

If the existing warning string still claims removal was due to "empty resource", generalize it so the message remains truthful once `triggeredActions` entries can also be removed.

### Interface

No behavior change beyond accurate user-facing log text.

## 22. `src/ui/devtools/state/moduleStore.actions.blueprints.ts` (change, only if sanitizer message text is generalized)

### Responsibility

Logs save-time sanitization warnings during single-blueprint save.

### Logic

Apply the same wording generalization as the module-level save path if file 21 is changed.

### Interface

No behavior change beyond accurate user-facing log text.

---

# Files intentionally not changed

These files already provide the required behavior and must remain unchanged for this work:

- `src/data/schemas/behavior.ts`
  - already defines the action union used by the new ability
- `src/engine/runtime/systems/behavior/ActionExecutor.ts`
  - already executes the required action types
- `src/game/handlers/KillAllBodiesExceptHandler.ts`
  - already handles the target action through the runtime command pipeline
- terminal command registry and terminal command handlers
  - explicitly out of scope for authored abilities

---

# Test design

Tests must verify behavior, not internal implementation details. They must honor the phase contract: systems emit commands; apply phase mutates state.

## Feature 1 tests

### 1. `src/data/schemas/abilities/triggeredActions.test.ts` (new)

Responsibility:

- schema contract

Assertions:

- parses a valid entry with one action
- rejects an entry with empty `actions`
- defaults triggers and conditions as defined

### 2. `src/engine/compiler/abilities/triggeredActionsCompiler.test.ts` (new)

Responsibility:

- compiler unit behavior

Assertions:

- compiles one rule per entry
- preserves authored `actions` exactly
- uses trigger conditions from `buildAbilityTriggerConditions`
- appends authored condition lines
- appends conditional activation active-state condition only when selected
- logs a warning when `cycle_complete` is used without cycle state

### 3. `src/engine/compiler/validation/collisionDetector.test.ts` (change)

Responsibility:

- cycle dependency validation

Assertions:

- emits a `triggeredActions` dependency error when `cycle_complete` is present and no cycle ability exists
- emits no such error when only `assignment_complete` is used

### 4. `src/engine/runtime/systems/behavior/TriggeredActions.integration.test.ts` (new)

Responsibility:

- compiler-to-runtime integration

Assertions:

- a compiled `triggeredActions` entry with `KILL_ALL_BODIES_EXCEPT` emits the corresponding runtime command with behavior-rule provenance metadata
- no terminal command parsing is involved

### 5. `src/ui/devtools/editors/blueprint/mode/forms/TriggeredActionsAbilityForm.test.tsx` (new)

Responsibility:

- view smoke and interaction wiring

Assertions:

- renders without crashing in designer mode
- displays `Triggers` and `Actions`
- adding a valid action through `BehaviorActionArrayField` persists it at `...triggeredActions[0].actions`
- invalid action text shows the existing parse error inline

### 6. `src/ui/devtools/state/moduleStore.sanitization.test.ts` and/or `src/ui/devtools/state/moduleStore.sanitization.module.test.ts` (change)

Responsibility:

- save-time sanitization behavior

Assertions:

- incomplete `triggeredActions` entries are removed before save
- surviving entries retain valid condition lines only
- save continues successfully after sanitization
- warning logging still occurs

### 7. `src/ui/devtools/editors/blueprint/mode/conditionalActivationTargetOptions.test.ts` (change)

Responsibility:

- conditional activation editor targeting

Assertions:

- one option row is emitted for each `triggeredActions` entry
- the option is targetable and checkable by `id`

## Feature 2 tests

### 8. `src/engine/compiler/abilities/cycleCompiler.conditionalActivation.test.ts` (change)

Responsibility:

- cycle conditional activation compile contract

Assertions:

- initial cycle throttle remains forced to `0` when cycle is targeted
- saved-throttle and hide-throttle state entries are still created
- cycle on/off rules are present
- compile output still preserves cycle active state handling

This test must not lock onto internal intermediary-state details that are no longer part of the cycle-specific rule condition contract.

### 9. `src/engine/runtime/systems/behavior/CycleConditionalActivationThrottle.integration.test.ts` (new)

Responsibility:

- behavior-phase contract for throttle shutdown

Assertions:

Given a compiled cycle with targeted conditional activation:

- when the activation condition is true, the cycle-on rule emits throttle restore using saved throttle
- when the activation condition becomes false in a snapshot where throttle is currently greater than `0`, the same behavior phase emits `UPDATE_POWER_SINK` with `throttle = 0`
- the following apply phase sets runtime throttle to `0`

This is the core regression test for the feature.

### 10. Optional follow-up test: `src/engine/runtime/systems/behavior/CycleConditionalActivationThrottle.restore.test.ts` (new only if restoration coverage is missing)

Responsibility:

- protect existing restore behavior while the shutdown logic changes

Assertions:

- after deactivation and later reactivation, throttle restores from `conditional_activation_cycle_saved_throttle`

This test is recommended but not required to satisfy the stated feature request.

---

# Acceptance criteria

Implementation is complete only when all of the following are true:

1. `triggeredActions` can be authored in the designer.
2. `triggeredActions` compiles into ordinary behavior rules using only existing `BehaviorAction` execution.
3. `triggeredActions` can target `KILL_ALL_BODIES_EXCEPT` without any terminal command bridge.
4. `triggeredActions` can be selected by conditional activation.
5. save-time sanitization prevents empty new `triggeredActions` entries from breaking saves.
6. when a cycle is conditionally active and currently throttled above zero, a false activation gate causes throttle shutdown to be emitted from that behavior phase and applied on the next apply phase.
7. no new direct ECS mutation path is introduced.
8. no arbitrary terminal command execution path is introduced.
9. all added and changed tests pass.

---

# Implementation order

1. Add schema and compiler for `triggeredActions`.
2. Wire validation and conditional activation support.
3. Wire designer UI and target-selection UI.
4. Add save-time sanitization.
5. Update cycle conditional activation compile logic.
6. Add and pass tests in the order listed above.

This order keeps the work incremental while preserving the project contracts at each step.
