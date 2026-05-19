# LLD — Conditional Activation Redesign / Refactor

## 1. Why

The current Conditional Activation implementation is architecturally wrong in two specific ways.

First, it introduced a second condition language instead of reusing the existing Thoughts condition model. Thoughts currently use a structured schema in `data/schemas/thoughts.ts`, a dedicated compiler in `game/thoughts/thoughtConditionCompiler.ts`, and a structured editor in `ui/devtools/editors/config/thoughts/**`. Conditional Activation instead stores free-form string lines, validates them with `compileConditionText`, compiles them ad hoc in `engine/compiler/abilities/conditionalActivationCompiler.ts`, and inverts them with operator substitution in order to drive cycle on/off behavior. That is not the same mechanism as Thoughts, and it is the direct reason the implemented conditions do not match the intended design.

Second, the current implementation leaked Conditional Activation feature policy into generic locations. `src/lib/conditionalActivationState.ts` is not reusable library logic; it is a feature-specific runtime contract for Cycle + Conditional Activation, and it is currently imported by compiler code, runtime hooks, and JobCard rendering. The same feature also duplicates targetability policy through ad hoc `SUPPORTED` sets in both compiler and UI code. This violates the project rule that app-specific logic belongs with the feature that owns it, and it makes the implementation harder to reason about and harder to change safely.

The redesign therefore has three goals:

1. Generalize the structured Thoughts condition model into a shared condition domain.
2. Rebuild Conditional Activation on top of that shared domain.
3. Remove the incorrect implementation’s detritus: string-condition compilation, inversion hacks, unsupported feature constants scattered across unrelated layers, and feature-specific state keys in `src/lib`.

---

## 2. What

## 2.1 Redesign Scope

This redesign covers only:

1. the condition model used by Thoughts and Conditional Activation
2. the Conditional Activation editor and compiler path
3. the Cycle-specific runtime behavior for Conditional Activation
4. the cleanup of the incorrect implementation’s supporting files and tests

This redesign does **not** change:

1. string-based condition editing for existing abilities such as Production, Conversion, Spawner, Draft, Updater, or Notifications
2. the general runtime command pipeline
3. the JobCard layout other than the Conditional Activation throttle-hide behavior
4. Thoughts semantics beyond moving them onto the shared structured-condition implementation

## 2.2 Functional Contract

### 2.2.1 Shared Structured Conditions

A new shared structured condition domain will be the single source of truth for the condition shapes currently implemented inside `data/schemas/thoughts.ts`.

The shared structured condition kinds are exactly the existing Thoughts kinds:

- `fact_threshold`
- `world_state_threshold`

The shared operators are exactly the existing Thoughts operators:

- `>`
- `>=`
- `==`
- `<=`
- `<`

No free-form condition strings are permitted in Conditional Activation after this redesign.

### 2.2.2 Thoughts

Thoughts will continue to behave exactly as they do now:

- all configured conditions must evaluate true for the thought to be eligible
- fact-threshold conditions still read from `sys_world.<scope>.<factType>.<factAbout>`
- world-state-threshold conditions still read from `sys_world.state.<key>.value`

The only change is ownership:

- Thoughts no longer own their own private condition schema/editor/compiler
- Thoughts consume the shared structured-condition mechanism

### 2.2.3 Conditional Activation

Conditional Activation will store:

- `conditions: StructuredCondition[]`
- `targets: ConditionalActivationTarget[]`

where `StructuredCondition` is the same shared structured condition type used by Thoughts.

Conditional Activation semantics after redesign:

1. If no conditions are configured, Conditional Activation is inert and compiles no activation gate.
2. If conditions are configured, Conditional Activation compiles one hidden activation state on the target blueprint.
3. That hidden activation state is the single source of truth for whether selected abilities are active.
4. Rule-based abilities do not receive raw user conditions directly; they receive only a reference to the hidden activation state.
5. Cycle gets explicit on/off lifecycle handling driven by that same activation state.

### 2.2.4 Cycle Semantics

For Cycle, “inactive” means all of the following at runtime:

- `self.state.cycle_active.value = 0`
- `self.powerSink.throttle = 0`
- the throttle UI is hidden

For Cycle, “active” means all of the following at runtime:

- `self.state.cycle_active.value = 1`
- `self.powerSink.throttle` is restored from the hidden saved-throttle state
- the throttle UI is visible again, subject to the authored `showThrottleSlider` baseline

The saved throttle remains ECS-owned hidden state and must continue to be updated through the existing command pipeline when the player moves the slider.

## 2.3 Cleanup Contract

The redesign must remove the following incorrect implementation patterns:

1. `conditionalActivation.conditions: string[]`
2. `compileConditionText`-based Conditional Activation compilation
3. operator inversion in `compileConditionalActivationInverseConditions`
4. feature-owned state keys in `src/lib/conditionalActivationState.ts`
5. duplicated `SUPPORTED` targetability sets living separately in UI and compiler code
6. Thoughts-only condition schema/editor/compiler ownership
7. any attempt to silently coerce legacy free-form Conditional Activation strings into the new structured schema

---

### 2.3.1 Legacy Data Contract

The incorrect implementation stored Conditional Activation conditions as free-form strings.
There is no deterministic translation from that data shape to the structured Thoughts condition model.

This redesign therefore does **not** attempt automatic migration from legacy string conditions to structured conditions.
Legacy Conditional Activation files using the wrong string shape are invalid after this redesign and must fail schema validation loudly.

## 3. How

## 3.1 Shared Condition Domain

A new shared structured-condition schema will be extracted from the current Thoughts schema.

A new shared compiler will convert those structured conditions into `LogicRule[]` using the same reference paths and comparison operators already used by Thoughts.

A new shared editor field will replace the current Thoughts-only condition row implementation. That field will operate on any array path in the session draft and will be used by both:

- `ThoughtForm`
- `ConditionalActivationAbilityForm`

This shared editor must continue to use the existing field widgets and suggestion sources where they already exist:

- `EnumField`
- `NumberField`
- `AutocompleteStringField`
- `SmartTooltip`
- blueprint suggestions via the current workspace/session sources

## 3.2 Conditional Activation Compile Model

Conditional Activation will no longer append the user-authored conditions directly to every selected rule.

Instead it will compile one hidden activation state and two system rules:

- activation-on rule
- activation-off rule

The activation-on rule will set the hidden activation state to `1` when **all** shared structured conditions are true.

The activation-off rule will set the hidden activation state to `0` when **not all** shared structured conditions are true.

This redesign explicitly forbids operator inversion.
The activation-off rule must be compiled by negating the aggregated compiled condition expression, not by rewriting operators.

### 3.2.1 Aggregated Gate Compilation

Pseudologic:

- `compiledConditions = compileStructuredConditions(conditions)`
- `allCompiled = AND(compiledConditions)`
- `notAllCompiled = NOT(allCompiled)`

`allCompiled` and `notAllCompiled` are written into `LogicRule.compiled` on the generated system rules.
`tokens` for those generated gate rules remain empty.

This design reuses the existing `LogicRuleSchema` and `JsonLogicAdapter` support for `compiled` expressions and avoids inventing a new evaluator.

## 3.3 Selected Rule-Based Abilities

The following currently targetable rule-based ability compilers remain targetable after redesign because they already emit behavior rules that can be gated safely:

- Production
- Conversion
- Spawner
- Sampler
- Draft
- Updater

For those compilers, Conditional Activation no longer appends the user-authored structured conditions.
It appends one condition only when the ability instance is selected:

- `self.state.<conditional_activation_active>.value`

That is the only Conditional Activation condition those rules may see.

## 3.4 Cycle Adapter

Cycle remains a special target because its runtime meaning of “inactive” is not merely “do not fire behavior rules.”

Cycle-specific Conditional Activation will therefore remain a dedicated adapter, but its input changes:

- it no longer compiles user-authored conditions
- it no longer inverts conditions
- it no longer owns the activation gate
- it reacts only to the shared hidden activation state

The Cycle adapter compiles:

1. hidden saved-throttle state
2. hidden hide-throttle state
3. cycle-on rule keyed by the shared active-state ref
4. cycle-off rule keyed by NOT(active-state ref)

## 3.5 Targetability Ownership

Targetability remains feature-specific policy and must not live in UI-only constants.

The redesign will define one Conditional Activation target-support contract in the feature domain. Both UI and compiler code will consume that same contract.

This contract owns:

- which ability keys are targetable today
- which target shapes are singleton vs array entries
- how to validate selected `targetId` values against authored ability entries

The editor may continue to render unsupported authored abilities as disabled rows with an explanatory tooltip, but that support decision must come from the shared feature contract, not from duplicated `SUPPORTED` sets.

## 3.6 Runtime/UI Ownership

Cycle Conditional Activation runtime data remains ECS-owned hidden state.

`JobCard` and `usePowerSinkThrottle` must stop importing Conditional Activation constants from `src/lib`.
Instead they consume the feature-owned runtime state contract module.

The render rule for slider visibility is:

- `showsThrottle = sink.showThrottleSlider !== false AND conditionalActivationHideThrottle !== true`

The update rule for saved throttle is:

- whenever the user changes the throttle for an entity carrying the saved-throttle state key, enqueue `UPDATE_STATE` to keep the saved throttle in sync

This preserves the project rules:

- UI observes runtime state only
- all mutation still flows through commands
- there is no React shadow state for saved throttle or visibility

---

## 4. File-by-File Design

## 4.1 Add — `src/data/schemas/conditions.ts`

### Responsibility

Single shared schema/type definition for the structured condition model currently embedded inside Thoughts.

### Logic

Move the following definitions out of `data/schemas/thoughts.ts` into this file:

- fact scope enum
- fact type enum
- structured operator enum
- `fact_threshold` condition schema
- `world_state_threshold` condition schema
- structured condition union type

### Interface

This file exports:

- `FactScopeSchema`
- `FactTypeSchema`
- `StructuredConditionOperatorSchema`
- `StructuredConditionSchema`
- `StructuredCondition`

### Constraints

No Conditional Activation-specific fields may live here.
This file is the shared condition domain for both Thoughts and Conditional Activation.

## 4.2 Change — `src/data/schemas/thoughts.ts`

### Responsibility

Own Thoughts schema only.

### Logic

Remove the in-file structured condition definitions.
Import the shared structured condition schema/types from `src/data/schemas/conditions.ts`.
Keep `ThoughtDefinitionSchema` and `ThoughtsSchema` ownership in this file.

### Interface

`ThoughtDefinitionSchema.conditions` continues to be an array of structured conditions.
The serialized Thoughts data shape does not change.

### Constraints

Thought-specific schema logic remains limited to thought ids, body text, remember scope, and duplicate-id validation.

## 4.3 Change — `src/data/schemas/abilities/conditionalActivation.ts`

### Responsibility

Own Conditional Activation authored data shape.

### Logic

Replace `ConditionLinesSchema` with the shared structured condition schema array.
Retain `targets` ownership here.
Retain `ability` + optional `targetId` target shape.

### Interface

After redesign:

- `conditions` is `StructuredCondition[]`
- `targets` is unchanged structurally

### Constraints

This file must not import `compileConditionText`.
This file must not validate execution semantics.
It owns only authored data shape.

## 4.4 Add — `src/engine/compiler/conditions/compileStructuredConditions.ts`

### Responsibility

Shared compiler from structured conditions to `LogicRule[]`.

### Logic

For each structured condition:

- resolve the canonical reference path
- emit one `LogicRule` using `compiled`, not string parsing
- keep tokens empty

Reference-path rules are exactly the current Thoughts rules:

- `fact_threshold` => `sys_world.<scope>.<factType>.<factAbout>`
- `world_state_threshold` => `sys_world.state.<key>.value`

### Interface

This file exports:

- `compileStructuredConditions(conditions): LogicRule[]`
- `compileStructuredConditionAllGate(conditions): LogicRule | null`
- `compileStructuredConditionNotAllGate(conditions): LogicRule | null`

`compileStructuredConditionAllGate` returns one rule whose compiled expression is the logical AND of all condition expressions.
`compileStructuredConditionNotAllGate` returns one rule whose compiled expression is the negation of that AND.

### Constraints

No caller may invert operators manually after this file exists.

## 4.5 Delete — `src/game/thoughts/thoughtConditionCompiler.ts`

### Responsibility

Retired.

### Reason

Its responsibility is replaced completely by `src/engine/compiler/conditions/compileStructuredConditions.ts`.

### Replacement

All callers move to the shared structured-condition compiler.

## 4.6 Change — `src/game/thoughts/thoughtEligibility.ts`

### Responsibility

Evaluate thought eligibility.

### Logic

Replace the import of `compileThoughtConditions` with the shared structured-condition compiler.
Behavior remains unchanged:

- all conditions must evaluate true
- seen-thought filtering remains unchanged
- draft-active / thought-active suppression remains unchanged

### Interface

No public signature change.

### Constraints

Thought eligibility must not gain Conditional Activation knowledge.

## 4.7 Add — `src/engine/runtime/conditionalActivationState.ts`

### Responsibility

Feature-owned runtime contract for Conditional Activation hidden state keys and feature-specific state readers.

### Logic

Define the hidden state keys required by Conditional Activation/Cycle runtime behavior:

- shared active-state key
- cycle saved-throttle key
- cycle hide-throttle key

Provide helper readers used by runtime/UI consumers so those consumers do not hardcode string keys.

### Interface

This file exports:

- active-state key constant
- cycle saved-throttle key constant
- cycle hide-throttle key constant
- helper to read whether throttle is hidden on an entity
- helper to read whether saved-throttle state exists on an entity

### Constraints

This file is app-specific feature code.
It must not live in `src/lib`.

## 4.8 Delete — `src/lib/conditionalActivationState.ts`

### Responsibility

Retired.

### Reason

It violates the project rule that app-specific feature logic does not belong in generic `src/lib`.

### Replacement

`src/engine/runtime/conditionalActivationState.ts`

## 4.9 Add — `src/data/schemas/abilities/conditionalActivationSupport.ts`

### Responsibility

Own the shared Conditional Activation target-support contract.

### Logic

Define the supported targetable ability keys and the shared target-matching helpers used by both compiler and editor code.

This file owns:

- which authored abilities are currently targetable
- how singleton targets and array targets are identified
- the shared matcher for `ability` + optional `targetId`

### Interface

This file exports:

- supported targetable ability keys
- `isConditionalActivationTargetableAbility(...)`
- target-match helper(s) used by compiler and editor code

### Constraints

This file is feature-specific policy and must not live in `src/lib`.

## 4.10 Change — `src/engine/compiler/abilities/conditionalActivationCompiler.ts`

### Responsibility

Own Conditional Activation compile-time behavior.

### Logic

Rewrite this file completely.
After redesign it owns exactly three concerns:

1. validate selected targets against the authored abilities
2. compile the shared activation-state rules from the shared structured conditions
3. append the shared active-state ref to selected rule-based ability rules

This file no longer:

- parses free-form condition text
- inverts operators
- compiles raw user conditions into selected rules

Pseudologic:

- if no `conditionalActivation` ability => no-op
- validate selected targets against authored abilities and target-support contract
- if conditions array empty => no activation state/rules emitted
- else:
    - ensure hidden active state entry exists with initial value `0`
    - emit system rule that sets active state to `1` when `allGate` is true
    - emit system rule that sets active state to `0` when `notAllGate` is true
- for any selected rule-based target, append one condition ref to the emitted rule: `self.state.<activeState>.value`

### Interface

This file continues to expose helper(s) used by targetable ability compilers, but the helper contract changes:

- selection helper remains
- raw-condition append helper is replaced by active-state append helper

### Constraints

No `compileConditionText` import.
No operator inversion table.
No cycle-specific saved-throttle or hide-throttle logic.

## 4.11 Change — `src/engine/compiler/abilities/cycleConditionalActivation.ts`

### Responsibility

Own Cycle’s Conditional Activation adapter only.

### Logic

Rewrite this file so that it reacts exclusively to the shared active-state key and no longer compiles user-authored conditions.

Required behavior:

- if cycle is not selected by Conditional Activation => no-op
- if Conditional Activation is selected but has no conditions => no-op
- ensure cycle saved-throttle hidden state exists, initialized from authored `startActive`
- ensure cycle hide-throttle hidden state exists, initialized to hidden
- set initial `cycle_active = 0`
- set initial `powerSink.throttle = 0`
- emit cycle-on rule keyed by shared active-state ref
- emit cycle-off rule keyed by NOT(shared active-state ref)

Cycle-on actions:

- set `self.state.cycle_active.value = 1`
- set `self.powerSink.throttle = self.state.<savedThrottle>.value`
- set `self.state.<hideThrottle>.value = 0`

Cycle-off actions:

- set `self.state.cycle_active.value = 0`
- set `self.powerSink.throttle = 0`
- set `self.state.<hideThrottle>.value = 1`

### Interface

The public function remains `applyCycleConditionalActivation(...)`.
Its input remains the drafted blueprint, cycle config, and conditional activation config.

### Constraints

This file must not compile structured conditions directly.
It must consume only the shared active-state contract.

## 4.12 Change — `src/engine/compiler/CompilerService.ts`

### Responsibility

Assemble blueprint compilation.

### Logic

Keep current high-level compile order, but use the rewritten Conditional Activation compiler behavior.

Required compile sequence:

1. clone and strip generated rules as today
2. validate/prepare Conditional Activation from authored abilities
3. compile body/passport/world presence as today
4. compile cycle, which will invoke the Cycle Conditional Activation adapter if needed
5. compile repeatable targetable abilities, which append the shared active-state ref when selected

### Interface

No public signature change.

### Constraints

`CompilerService` must not own target support rules or raw condition compilation.
It only orchestrates existing compilers.

## 4.13 Change —

- `src/engine/compiler/abilities/productionCompiler.ts`
- `src/engine/compiler/abilities/conversionCompiler.ts`
- `src/engine/compiler/abilities/spawnerCompiler.ts`
- `src/engine/compiler/abilities/samplerCompiler.ts`
- `src/engine/compiler/abilities/draftCompiler.ts`
- `src/engine/compiler/abilities/updaterCompiler.ts`

### Responsibility

Compile their own ability behavior rules.

### Logic

Retain current rule emission.
Change Conditional Activation handling only:

- stop appending raw user-authored conditions
- append the shared active-state condition only when the ability instance is selected

### Interface

No public signature change.
These compilers may continue receiving the Conditional Activation config.

### Constraints

No ability compiler other than Cycle may own Conditional Activation lifecycle policy.

## 4.14 Add — `src/ui/devtools/editors/conditions/StructuredConditionsField.tsx`

### Responsibility

Shared UI field for editing structured conditions at an arbitrary draft path.

### Logic

This field renders:

- section label
- one structured condition row per entry
- add-condition action

It delegates draft mutation to the shared hook in the same folder.

### Interface

Props:

- `filename`
- `path`

This is the same path-driven contract used by the existing string `ConditionsField`.

### Constraints

This field owns presentation only.
It must not contain schema compilation logic.

## 4.15 Add — `src/ui/devtools/editors/conditions/StructuredConditionRow.tsx`

### Responsibility

Render one structured condition row.

### Logic

This row reuses the existing Thoughts row controls and tooltips:

- kind selector
- reset-kind-shape action
- world-state fields when `kind = world_state_threshold`
- fact-threshold fields when `kind = fact_threshold`
- remove-row action

### Interface

Props:

- `filename`
- `path`
- `conditionIndex`
- condition-mutator callbacks from the shared hook

### Constraints

No Thoughts-specific naming or ownership may remain in this component.

## 4.16 Add — `src/ui/devtools/editors/conditions/useStructuredConditionsField.ts`

### Responsibility

Draft mutation hook for the shared structured-condition editor.

### Logic

Provide the same operations the current Thoughts session mutators provide, but path-based and generic:

- read items at path
- add default condition
- remove condition at index
- replace condition kind at index with the default shape for that kind

### Interface

Returns:

- items
- add
- remove
- setKind

### Constraints

This hook must not depend on Thoughts.

## 4.17 Add — `src/ui/devtools/editors/conditions/structuredConditionDefaults.ts`

### Responsibility

Own default structured-condition instances for editor insertion.

### Logic

Create default conditions by parsing the shared structured condition schema.
Defaults remain equivalent to the current Thoughts defaults.

### Interface

Exports:

- `createDefaultStructuredCondition(kind?)`

### Constraints

No Thoughts-only naming.

## 4.18 Add — `src/ui/devtools/editors/conditions/structuredConditionAutocomplete.ts`

### Responsibility

Own shared suggestion sources for structured-condition editing.

### Logic

Move the current Thoughts autocomplete support here:

- blueprint suggestions
- world-state key suggestions
- fact-about suggestions derived from fact type

### Interface

Exports the same suggestion helpers needed by the shared condition row.

### Constraints

No Thoughts-specific file ownership after extraction.

## 4.19 Delete — `src/ui/devtools/editors/config/thoughts/ThoughtConditionRow.tsx`

### Responsibility

Retired.

### Reason

Its behavior is replaced by the shared structured-condition editor components.

## 4.20 Delete — `src/ui/devtools/editors/config/thoughts/thoughtSessionMutators.ts`

### Responsibility

Retired.

### Reason

Its condition-row add/remove/reset logic is replaced by the shared path-based structured-condition hook.

## 4.21 Delete — `src/ui/devtools/editors/config/thoughts/thoughtConditionAutocomplete.ts`

### Responsibility

Retired.

### Reason

Its autocomplete behavior moves to the shared structured-condition editor domain.

## 4.22 Change — `src/ui/devtools/editors/config/thoughts/ThoughtForm.tsx`

### Responsibility

Render one thought editor form.

### Logic

Replace the explicit mapping of `ThoughtConditionRow` with one shared `StructuredConditionsField` bound to `config.settings.thoughts.<index>.conditions`.
Retain all other thought editing behavior.

### Interface

No public prop change.

### Constraints

ThoughtForm must no longer own condition-row rendering.

## 4.23 Change — `src/ui/devtools/editors/config/thoughts/useThoughtsSession.ts`

### Responsibility

Thought list/session management.

### Logic

Remove condition-row add/remove/reset APIs because those move to the shared structured-condition field hook.
Retain thought list add/remove/rename behavior only.

### Interface

The hook no longer returns:

- `addCondition`
- `removeCondition`
- `setConditionKind`

### Constraints

Thought session management remains limited to thought list management.

## 4.24 Change — `src/ui/devtools/editors/config/thoughts/thoughtEditorDefaults.ts`

### Responsibility

Thought defaults.

### Logic

Remove ownership of default structured condition creation.
Retain only thought-definition defaults.

### Interface

`createDefaultThought(...)` remains.
`createDefaultCondition(...)` is removed.

## 4.25 Change — `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.tsx`

### Responsibility

Render Conditional Activation ability editing UI.

### Logic

Replace string `ConditionsField` with shared `StructuredConditionsField`.
Keep the checkbox list.
Keep target mutation through `updateDraft`.

### Interface

No prop change.

### Constraints

This form must not import `compileConditionText` or string-condition editor code.

## 4.26 Change — `src/ui/devtools/editors/blueprint/mode/conditionalActivationTargetOptions.ts`

### Responsibility

Build checkbox rows for Conditional Activation targets.

### Logic

Retain row ordering and label derivation.
Remove its private `SUPPORTED` set.
Consume the shared Conditional Activation target-support contract instead.

### Interface

Function signature remains:

- `buildConditionalActivationTargetOptions(abilities, targets)`

### Constraints

Targetability policy must not be duplicated locally.

## 4.27 Change — `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`

### Responsibility

Maintain local slider state and enqueue power-sink updates.

### Logic

Stop importing feature keys from `src/lib`.
Read Conditional Activation saved-throttle participation through the feature-owned runtime state module.
Continue mirroring the user-selected throttle into hidden saved-throttle state when that state exists.

### Interface

Hook signature remains unchanged.

### Constraints

All runtime state updates still use commands only.

## 4.28 Change — `src/ui/runtime/world/selection/job-card/JobCard.tsx`

### Responsibility

Render job selection card.

### Logic

Stop importing feature keys from `src/lib`.
Use the feature-owned helper to determine whether the throttle should be hidden by Conditional Activation.
Continue respecting authored `showThrottleSlider` on the sink.

### Interface

No prop change.

### Constraints

No business logic beyond rendering the resolved visibility boolean.

---

## 5. Deleted / Retired Tests and Replacements

## 5.1 Retire

- `src/game/thoughts/thoughtConditionCompiler.test.ts`
- the current string/inversion expectations in `src/engine/compiler/abilities/conditionalActivationCompiler.test.ts`

These tests encode the wrong implementation shape and must be replaced, not updated in place to preserve the old design assumptions.

---

## 6. Tests Required

All tests must follow the project testing standards: behavior-first, Given/When/Then structure, colocated with the source under test, and no UI business-logic assertions inside `.tsx` tests.

## 6.1 Add — `src/engine/compiler/conditions/compileStructuredConditions.test.ts`

### Required coverage

1. compiles `fact_threshold` to the correct `sys_world.<scope>.<factType>.<factAbout>` ref
2. compiles `world_state_threshold` to the correct `sys_world.state.<key>.value` ref
3. compiles the aggregated AND gate correctly
4. compiles the NOT(AND(...)) gate correctly
5. returns `null` gates for empty condition arrays

## 6.2 Change — `src/engine/compiler/abilities/conditionalActivationCompiler.test.ts`

### Required coverage

1. selected singleton and array targets still resolve correctly
2. stale targets still warn loudly
3. selected rule-based targets append only the active-state ref condition
4. the compiler emits the hidden active state when structured conditions exist
5. the compiler emits activation-on and activation-off rules from the aggregated gate
6. there is no operator inversion behavior left in the file

## 6.3 Change — `src/engine/compiler/abilities/cycleCompiler.conditionalActivation.test.ts`

### Required coverage

1. targeted Cycle emits hidden saved-throttle and hide-throttle state entries
2. targeted Cycle starts inactive when Conditional Activation has conditions
3. cycle-on rule is keyed off the shared active-state ref
4. cycle-off rule is keyed off the negated active-state ref
5. unselected or conditionless Conditional Activation leaves Cycle unchanged

## 6.4 Change —

- `src/engine/compiler/abilities/productionCompiler.conditionalActivation.test.ts`
- `src/engine/compiler/abilities/conversionCompiler.conditionalActivation.test.ts`
- `src/engine/compiler/abilities/draftCompiler.conditionalActivation.test.ts`
- `src/engine/compiler/abilities/updaterCompiler.conditionalActivation.test.ts`

### Required coverage

1. selected targets append the hidden active-state ref condition
2. unselected targets do not append that condition
3. raw structured condition details do not appear directly on the selected rule

## 6.5 Add — `src/ui/devtools/editors/conditions/StructuredConditionsField.test.tsx`

### Required coverage

1. renders one row per structured condition entry
2. adds a new default condition row
3. switches row shape when kind changes
4. removes a row
5. renders the correct controls for each kind

## 6.6 Change — `src/ui/devtools/editors/blueprint/mode/conditionalActivationTargetOptions.test.ts`

### Required coverage

1. row ordering remains stable
2. supported rows derive targetability from the shared target-support contract
3. unsupported rows remain disabled with an explanatory reason

## 6.7 Change — `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.test.tsx`

### Required coverage

1. renders the shared structured-condition editor instead of the string Conditions field
2. still renders one checkbox row per authored ability instance in editor order
3. keeps target toggle wiring intact

## 6.8 Add — `src/data/schemas/abilities/conditionalActivation.test.ts`

### Required coverage

1. accepts the redesigned structured condition shape
2. rejects legacy free-form string conditions
3. preserves valid `targets` entries

## 6.9 Change — `src/ui/runtime/world/selection/job-card/JobCard.throttleVisibility.test.tsx`

### Required coverage

1. still hides slider when `powerSink.showThrottleSlider === false`
2. hides slider when Conditional Activation hide-throttle state is true
3. shows slider when authored throttle visibility is true and Conditional Activation hide-throttle state is false

## 6.10 Add — `src/game/thoughts/thoughtEligibility.structuredConditions.test.ts`

### Required coverage

1. Thoughts still become eligible when all shared structured conditions evaluate true
2. Thoughts remain ineligible when any shared structured condition is false
3. seen-thought suppression still works unchanged

---

## 7. Acceptance Criteria

The redesign is complete only when all of the following are true:

1. Thoughts and Conditional Activation use the same shared structured condition schema.
2. Thoughts and Conditional Activation use the same shared structured condition editor.
3. Thoughts and Conditional Activation use the same shared structured condition compiler.
4. Conditional Activation no longer stores free-form condition strings.
5. Conditional Activation no longer imports or depends on `compileConditionText`.
6. Conditional Activation no longer uses operator inversion.
7. `src/lib/conditionalActivationState.ts` is deleted.
8. Feature-owned Conditional Activation state keys live outside `src/lib`.
9. Rule-based targetable abilities gate on the shared active-state ref only.
10. Cycle inactive semantics are exactly: `cycle_active = 0`, `throttle = 0`, throttle hidden.
11. Cycle active semantics restore the saved throttle and show the slider again.
12. All tests listed above are green.
13. No UI layer mutates runtime state directly.
14. No silent fallback to the incorrect string-condition model remains anywhere in Conditional Activation.

