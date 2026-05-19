# LLD — Conditional Activation Ability

## Status
Proposed implementation design.

## Scope
This document defines the implementation for a new **Conditional Activation** blueprint ability and its interaction with existing abilities.

This scope includes:
- new authored ability schema
- blueprint editor support
- compiler support
- Cycle-specific inactive semantics
- runtime/UI support needed to make Cycle inactive semantics observable
- tests required by the project contract

This scope does **not** change the prior attention-alert design except where Conditional Activation affects Cycle runtime throttle visibility.

## Source Basis
This design is grounded in the current code paths and the supplied project contract documents:

- `src/data/schemas/abilities/index.ts`
- `src/data/schemas/abilities/cycle.ts`
- `src/data/schemas/abilities/production.ts`
- `src/data/schemas/abilities/conversion.ts`
- `src/data/schemas/abilities/spawner.ts`
- `src/data/schemas/abilities/sampler.ts`
- `src/data/schemas/abilities/draft.ts`
- `src/data/schemas/abilities/updater.ts`
- `src/data/schemas/abilities/notifications.ts`
- `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`
- `src/ui/devtools/editors/blueprint/mode/abilitySchemas.ts`
- `src/ui/devtools/editors/blueprint/mode/abilityListUtils.ts`
- `src/ui/devtools/editors/blueprint/mode/AbilityListSections.tsx`
- `src/ui/devtools/editors/blueprint/mode/SingleAbilityRow.tsx`
- `src/ui/devtools/editors/conditions/ConditionsField.tsx`
- `src/engine/compiler/CompilerService.ts`
- `src/engine/compiler/conditions/appendRuleConditions.ts`
- `src/lib/logic/compileConditionText.ts`
- `src/engine/compiler/abilities/cycleCompiler.ts`
- `src/engine/compiler/abilities/cycleCompilerAccum.ts`
- `src/engine/compiler/abilities/cycleCompiler.rules.ts`
- `src/engine/compiler/abilities/productionCompiler.ts`
- `src/engine/compiler/abilities/conversionCompiler.ts`
- `src/engine/compiler/abilities/spawnerCompiler.ts`
- `src/engine/compiler/abilities/samplerCompiler.ts`
- `src/engine/compiler/abilities/draftCompiler.ts`
- `src/engine/compiler/abilities/updaterCompiler.ts`
- `src/data/schemas/components/powerSink.ts`
- `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`
- `src/ui/runtime/world/selection/job-card/JobCard.tsx`
- `src/ui/runtime/world/selection/job-card/JobCard.throttleVisibility.test.tsx`
- `src/engine/runtime/handlers/UpdatePowerSinkHandler.ts`
- `/mnt/data/context-pack.md`
- `/mnt/data/prompt-contract.md`
- `/mnt/data/testing-standards.md`

The design obeys the following already-enforced project laws:
- commands propose change; apply decides reality
- no direct ECS mutation outside apply
- UI renders semantic runtime state only
- logic lives outside `.tsx`

---

## 1. Why

The codebase already supports per-ability authored conditions for several compilers by compiling condition lines into behavior-rule conditions via `compileConditionText(...)` and `appendRuleConditions(...)`. That mechanism is correct for rule-emitting abilities such as Production, Conversion, Draft, Spawner, Sampler, and Updater. It is not yet exposed as a cross-cutting authored ability that can gate other abilities from a single editor surface.

The requested feature is broader than per-ability conditions:
1. the author must be able to define one set of conditions centrally
2. the author must be able to select affected abilities through a checkbox list
3. affected abilities must remain inactive until the conditions are true
4. for Cycle specifically, inactive must mean both **no draw request** and **no visible throttle control**

The existing compiler/runtime architecture already contains enough primitives to do this without adding a new runtime subsystem:
- existing condition compilation
- existing behavior-rule conditions
- existing Cycle hidden state (`cycle_active`)
- existing `powerSink.throttle`
- existing command pipeline for persisted user throttle changes
- existing JobCard throttle visibility path

The design therefore uses the current compiler pipeline and hidden ECS state, rather than introducing a separate activation engine.

---

## 2. What

## 2.1 New Authored Ability

Add a new singleton blueprint ability:
- name: `conditionalActivation`
- location: `_editor.abilities.conditionalActivation`

This ability contains:
- a list of condition lines
- a list of selected target abilities

## 2.2 Target Selection Contract

The Conditional Activation editor must render the abilities currently present on the same blueprint as a checkbox list.

Each rendered row represents exactly one authored ability instance:
- singleton abilities produce one row
- array abilities produce one row per entry

Rows must use stable target identity.
Array indices are **not** allowed as persisted target identity because deletion/reordering would silently retarget selections.

## 2.3 Supported vs Unsupported Targets

The checkbox list must show all authored abilities currently present on the blueprint, but not all ability types are targetable in the first implementation.

### Supported targets
These ability types are targetable because their current compiler paths already compile executable runtime rules that can be gated safely:
- `cycle`
- `production[]`
- `conversion[]`
- `spawner[]`
- `sampler[]`
- `draft[]`
- `updater[]`

### Unsupported targets
These ability types must render as disabled rows with an explanatory tooltip because “inactive” is not currently defined cleanly for their runtime semantics:
- `storage[]`
- `injection`
- `upkeep[]`
- `assignment`
- `body`
- `passport`
- `worldPresence`
- `notifications`

Disabled rows remain visible so the author sees the full blueprint surface, but they cannot be selected.

## 2.4 Exact Meaning of “Inactive”

### For rule-based supported abilities
For Production, Conversion, Spawner, Sampler, Draft, and Updater:
- inactive means the compiler-appended Conditional Activation conditions are false
- therefore the ability’s emitted rules do not fire
- no additional runtime state is required

### For Cycle
Cycle needs stronger semantics than rule gating alone.

For Cycle, inactive means all of the following are true:
- `self.state.cycle_active = 0`
- `self.powerSink.throttle = 0`
- the JobCard throttle slider is hidden even if authored `showThrottleSlider` is true
- the authored/user throttle intent is preserved for later restoration

When Cycle becomes active again:
- `self.state.cycle_active = 1`
- `self.powerSink.throttle` is restored from saved intent, not hardcoded
- throttle visibility returns to the authored baseline

This is the required Cycle contract.

---

## 3. How

## 3.1 Data Model

### 3.1.1 New schema: Conditional Activation

Add a new schema `ConditionalActivationAbilitySchema` with this authored shape:
- `conditions`: array of condition lines, default `[]`
- `targets`: array of target references, default `[]`

### 3.1.2 Target reference shape

Persisted target references must use this contract:
- `ability`: ability key
- `targetId`: optional stable id for array ability entries

Rules:
- singleton targets omit `targetId`
- array targets require `targetId`

Examples of valid persisted targets:
- `{ ability: "cycle" }`
- `{ ability: "production", targetId: "<stable-id>" }`
- `{ ability: "conversion", targetId: "<stable-id>" }`

### 3.1.3 Stable IDs for repeatable targetable abilities

To make persisted target references stable, the following targetable array ability schemas must gain hidden `id` fields with stable defaults:
- `production`
- `spawner`
- `sampler`
- `draft`
- `updater`

Existing notes:
- `conversion` already has an `id` field
- `notifications` already has ids but remains unsupported in this implementation

Draft creators must also populate those ids explicitly because the editor draft helpers currently bypass schema-default generation.

## 3.2 Compiler Strategy

The compiler must not perform a brittle post-pass over compiled rule ids.
Instead, Conditional Activation must be applied in the relevant ability compilers where the rule objects are created.

### 3.2.1 Rule-based abilities

For each supported non-Cycle ability compiler:
- resolve whether the current authored ability instance is selected by Conditional Activation
- if not selected, compile exactly as today
- if selected, append Conditional Activation conditions to the emitted rule using the existing condition pipeline

This applies to:
- `productionCompiler`
- `conversionCompiler`
- `spawnerCompiler`
- `samplerCompiler`
- `draftCompiler`
- `updaterCompiler`

The result is additive:
- existing per-ability conditions remain in place
- Conditional Activation conditions are appended alongside them
- the rule executes only when both its own authored conditions and Conditional Activation conditions are true

### 3.2.2 Cycle

Cycle cannot rely on appended positive conditions only because it also needs an explicit inactive path.

Cycle must gain compiler-emitted lifecycle rules when it is selected by Conditional Activation.

#### Required hidden state entries for selected Cycle
The compiler must emit hidden state entries only when Conditional Activation targets Cycle:
- `conditional_activation_cycle_saved_throttle`
  - numeric
  - initial value: authored initial throttle intent (`startActive ? 1 : 0`)
  - visible: false
- `conditional_activation_cycle_hide_throttle`
  - numeric boolean
  - initial value depends on whether Conditional Activation has any conditions
  - visible: false

Initial-value contract:
- if Cycle is targeted and Conditional Activation has at least one condition:
  - compile Cycle initially inactive
  - `cycle_active = 0`
  - `powerSink.throttle = 0`
  - `conditional_activation_cycle_hide_throttle = 1`
  - `conditional_activation_cycle_saved_throttle = authored startActive intent`
- if Cycle is targeted but Conditional Activation has zero conditions:
  - compile no Conditional Activation lifecycle override for Cycle
  - existing authored Cycle semantics remain unchanged

#### Activation rule
Emit one activation rule when Cycle is targeted and Conditional Activation has conditions.

Activation rule contract:
- conditions: all Conditional Activation conditions as-authored
- actions:
  - set `self.state.cycle_active = 1`
  - set `self.powerSink.throttle = self.state.conditional_activation_cycle_saved_throttle.value`
  - set `self.state.conditional_activation_cycle_hide_throttle.value = 0`

#### Deactivation rules
Because the current behavior condition system is an AND-only list of simple comparisons, the compiler must generate one deactivation rule per authored condition line using the inverse of that condition.

This is required so deactivation semantics remain expressible without changing the rule engine.

For each authored condition line, emit one deactivation rule with:
- condition: the inverse of that one line
- actions:
  - set `self.state.cycle_active = 0`
  - set `self.powerSink.throttle = 0`
  - set `self.state.conditional_activation_cycle_hide_throttle.value = 1`

Inverse operator mapping is fixed:
- `==` → `!=`
- `!=` → `==`
- `<` → `>=`
- `<=` → `>`
- `>` → `<=`
- `>=` → `<`

This produces the correct OR-style deactivation behavior through multiple single-condition rules.

### 3.2.3 Tick semantics

All Conditional Activation state changes still obey the existing command/apply contract.
That means:
- conditions are evaluated during system execution
- changes are applied on the next apply phase
- there is no mid-tick state mutation

This implies Cycle activation/deactivation is tick-delayed by one apply cycle.
This is acceptable and must be documented as the feature contract.

## 3.3 Runtime/UI Strategy for Cycle Throttle Visibility

The JobCard must remain a pure view over semantic ECS state.

Therefore throttle hiding for inactive Cycle must be driven by ECS state, not local UI state and not mutated blueprint data.

### Visibility rule
The JobCard must show the throttle slider only when both are true:
- `powerSink.showThrottleSlider !== false`
- `entity.state.conditional_activation_cycle_hide_throttle.value !== 1`

This preserves authored `showThrottleSlider` as the static baseline while allowing Conditional Activation to suppress the control dynamically.

### Saved throttle synchronization
The current `usePowerSinkThrottle(...)` hook must be extended so that when the user changes the throttle on an entity that carries `conditional_activation_cycle_saved_throttle`, it also enqueues `UPDATE_STATE` for that hidden state key.

Required behavior:
- active Cycle: user drag updates both runtime `powerSink.throttle` and saved throttle intent
- inactive Cycle: slider is hidden, so no user change path exists
- later reactivation: compiler-emitted activation rule restores from the saved throttle intent

This approach preserves user intent without adding new runtime command types and without storing shadow state in React.

---

## 4. File-by-File Design

## 4.1 Add — `src/data/schemas/abilities/conditionalActivation.ts`

### Responsibility
Defines the authored schema and exported config type for Conditional Activation.

### Logic
Add:
- `ConditionalActivationTargetSchema`
- `ConditionalActivationAbilitySchema`

### Interface
Exports:
- target schema
- ability schema
- inferred config type

### Constraints
No runtime behavior belongs here.
Schema only.

## 4.2 Change — `src/data/schemas/abilities/index.ts`

### Responsibility
Authoritative `_editor.abilities` schema.

### Logic
Add optional singleton:
- `conditionalActivation: ConditionalActivationAbilitySchema.optional()`

### Interface
`EditorAbilities` gains `conditionalActivation`.

### Constraints
No other ability schema semantics change here.

## 4.3 Change — targetable repeatable ability schemas

### Files
- `src/data/schemas/abilities/production.ts`
- `src/data/schemas/abilities/spawner.ts`
- `src/data/schemas/abilities/sampler.ts`
- `src/data/schemas/abilities/draft.ts`
- `src/data/schemas/abilities/updater.ts`

### Responsibility
Add stable hidden ids for persisted target references.

### Logic
Add `id: z.string().default(() => nanoid())`.

### Interface
The id is schema-owned and required at runtime/editor data level, but is not surfaced in the form.

### Constraints
No user-facing label or behavior changes beyond id stability.

## 4.4 Change — `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`

### Responsibility
Default draft creation for blueprint abilities.

### Logic
Add:
- `createConditionalActivationAbilityDraft()`

Also update draft creators for targetable repeatable abilities so they produce stable ids explicitly:
- production
- spawner
- sampler
- draft
- updater

### Interface
New drafts must contain valid ids immediately, without relying on a later schema parse.

### Constraints
No other draft defaults change.

## 4.5 Change — `src/ui/devtools/editors/blueprint/mode/abilitySchemas.ts`

### Responsibility
Designer-mode schema registry.

### Logic
Add `conditionalActivation` as a singleton ability schema.

### Interface
This makes the new ability visible to add/remove flows.

## 4.6 Change — `src/ui/devtools/editors/blueprint/mode/abilityListUtils.ts`

### Responsibility
Centralized ability labels and stable React keys.

### Logic
Add label for `conditionalActivation`.
Update key builders for targetable repeatable abilities to use stable ids instead of index-derived or content-derived keys where applicable.

### Interface
React row identity becomes stable for the newly targetable repeatable abilities.

## 4.7 Add — `src/ui/devtools/editors/blueprint/mode/conditionalActivationTargetOptions.ts`

### Responsibility
Pure editor-side logic for building the checkbox list model.

### Logic
Given current `EditorAbilities`, return an ordered array of checkbox rows.
Each row contains:
- persisted target reference
- label text
- targetable boolean
- disabled reason when unsupported
- checked boolean resolver input

Label contract:
- singleton abilities reuse the existing section label
- array abilities reuse the same display naming conventions already used in section rows

### Interface
Used by the new form only.
No JSX inside this file.

### Constraints
No runtime/compiler logic belongs here.

## 4.8 Add — `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.tsx`

### Responsibility
Render the Conditional Activation editor.

### Logic
This component must be view-only and delegate target-building logic to `conditionalActivationTargetOptions.ts`.
It renders:
- a `ConditionsField`
- a checkbox list for current blueprint abilities
- disabled rows with tooltip text when unsupported

### Interface
Consumes `rootPath` or `basePath` in the same style as existing ability forms.
Writes only to `_editor.abilities.conditionalActivation`.

### Constraints
No business logic beyond view wiring.

## 4.9 Change — `src/ui/devtools/editors/blueprint/mode/SingleAbilityRow.tsx`

### Responsibility
Singleton ability row rendering.

### Logic
Add `conditionalActivation` to:
- `SingleAbilityKey`
- `SINGLE_ABILITY_KEYS`
- icon map
- summary map
- form switch

### Interface
The new ability appears in the same single-ability row flow as Cycle and Assignment.

## 4.10 Change — `src/engine/compiler/CompilerService.ts`

### Responsibility
Orchestrates ability compilation.

### Logic
Read `abilities.conditionalActivation` once and pass it to all supported compilers that need it.

Affected call sites:
- `cycleCompiler`
- `productionCompiler`
- `conversionCompiler`
- `spawnerCompiler`
- `samplerCompiler`
- `draftCompiler`
- `updaterCompiler`

### Interface
Compiler signatures for supported targetable abilities gain one additional optional argument for Conditional Activation config.

### Constraints
No global post-pass over compiled rules.

## 4.11 Add — `src/engine/compiler/abilities/conditionalActivationCompiler.ts`

### Responsibility
Shared compiler helper for Conditional Activation targeting and condition compilation.

### Logic
This file owns:
- target-selection matching
- positive condition compilation for selected rule-based abilities
- condition inversion for Cycle deactivation rules
- helper predicates such as “is this authored ability selected?”

### Interface
Exports pure functions used by the affected compilers.

Required helper surface:
- resolve whether a target is selected
- compile positive condition objects from Conditional Activation config
- compile inverse condition objects from Conditional Activation config
- resolve whether Cycle is selected

### Constraints
No direct mutation of blueprints outside the passed-in compiler-owned rule creation path.

## 4.12 Change — targetable non-Cycle compilers

### Files
- `src/engine/compiler/abilities/productionCompiler.ts`
- `src/engine/compiler/abilities/conversionCompiler.ts`
- `src/engine/compiler/abilities/spawnerCompiler.ts`
- `src/engine/compiler/abilities/samplerCompiler.ts`
- `src/engine/compiler/abilities/draftCompiler.ts`
- `src/engine/compiler/abilities/updaterCompiler.ts`

### Responsibility
Gate selected abilities via appended Conditional Activation conditions.

### Logic
For each compiler:
1. resolve the authored ability’s target reference using its stable id
2. check whether Conditional Activation selects it
3. if selected, append Conditional Activation conditions to the rule being emitted
4. otherwise emit unchanged behavior

### Interface
Each compiler gains an additional optional Conditional Activation config argument.

### Constraints
Existing per-ability conditions remain intact.
No rule ids or action ids are renamed.

## 4.13 Change — `src/engine/compiler/abilities/cycleCompiler.ts`

### Responsibility
Compile Cycle and, when selected by Conditional Activation, emit Cycle-specific activation/deactivation semantics.

### Logic
When Cycle is not selected by Conditional Activation:
- compile exactly as today

When Cycle is selected and Conditional Activation has conditions:
- emit hidden state keys for saved throttle and hide-throttle
- override initial compiled Cycle state to inactive
- emit one activation rule using positive conditions
- emit one deactivation rule per inverse condition

When Cycle is selected but Conditional Activation has no conditions:
- do not emit lifecycle override rules
- compile Cycle exactly as today

### Interface
The existing `fullAbilities` parameter may be reused to access `conditionalActivation`.
No new runtime command type is introduced.

### Constraints
The existing accumulation, reset, one-off, bar, and transition logic remains unchanged except for the added lifecycle rules/state described above.

## 4.14 Add — shared state key module

### Suggested file
- `src/lib/conditionalActivationState.ts`

### Responsibility
Single source of truth for Conditional Activation runtime state keys used across compiler and UI.

### Logic
Exports exact string constants for:
- `conditional_activation_cycle_saved_throttle`
- `conditional_activation_cycle_hide_throttle`

### Interface
Imported by:
- `cycleCompiler.ts`
- `usePowerSinkThrottle.ts`
- `JobCard.tsx`
- tests

### Constraints
No runtime behavior; constants only.

## 4.15 Change — `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`

### Responsibility
User throttle interaction wiring.

### Logic
If the current entity carries `conditional_activation_cycle_saved_throttle`, enqueue an additional `UPDATE_STATE` command that mirrors the user-selected throttle into that hidden state entry.

### Interface
No hook signature change.

### Constraints
Still uses the existing command pipeline only.
No direct runtime mutation.

## 4.16 Change — `src/ui/runtime/world/selection/job-card/JobCard.tsx`

### Responsibility
Render throttle visibility from semantic runtime state.

### Logic
Replace the current visibility check with the combined rule:
- authored `showThrottleSlider` allows display
- Conditional Activation hide state may suppress display

### Interface
No prop signature change.

### Constraints
The component remains view-only.

---

## 5. Explicit Behavior Sequences

## 5.1 Rule-based selected ability

Given:
- Conditional Activation targets a Production entry
- Conditional Activation conditions are false

When:
- runtime ticks

Then:
- the Production rule’s combined condition list is false
- the Production action does not execute

When:
- conditions become true

Then:
- the same rule becomes eligible and executes normally on subsequent ticks

## 5.2 Cycle selected, conditions initially false

Given:
- Conditional Activation targets Cycle
- Conditional Activation has at least one condition
- authored Cycle `startActive = true`

When:
- blueprint is compiled

Then:
- compiled runtime starts with:
  - `cycle_active = 0`
  - `powerSink.throttle = 0`
  - hidden throttle state = hidden
  - saved throttle = `1`

When:
- conditions later evaluate true and the activation rule applies

Then:
- `cycle_active = 1`
- `powerSink.throttle = 1`
- throttle slider visibility returns to authored baseline

## 5.3 Cycle selected, user had chosen throttle 0.4

Given:
- Conditional Activation targets Cycle
- conditions are true
- user drags throttle to `0.4`

When:
- `usePowerSinkThrottle` emits commands

Then:
- runtime `powerSink.throttle` becomes `0.4`
- hidden saved throttle state becomes `0.4`

When:
- conditions later become false

Then:
- runtime `powerSink.throttle` becomes `0`
- throttle slider is hidden
- hidden saved throttle remains `0.4`

When:
- conditions become true again

Then:
- runtime `powerSink.throttle` restores to `0.4`
- slider becomes visible again if authored `showThrottleSlider` is true

---

## 6. Error Handling

The implementation must handle error cases explicitly and loudly.

### 6.1 Unsupported selected target in persisted draft

If Conditional Activation references a target whose ability type is unsupported:
- compiler logs a warning with blueprint id and target reference
- target is ignored

### 6.2 Stale selected target id

If Conditional Activation references an array entry id that no longer exists on the blueprint:
- compiler logs a warning with blueprint id and target reference
- target is ignored

### 6.3 Inversion failure

If a Conditional Activation condition line cannot be inverted because its compiled operator is not one of the supported comparison operators:
- compiler logs loudly
- Cycle lifecycle override is not emitted for that line
- compile continues for other valid lines

### 6.4 Empty conditions

If Conditional Activation has zero conditions:
- rule-based abilities receive no extra conditions
- Cycle lifecycle override is not emitted
- the ability is effectively a no-op
- no warning is required

Silent failure is forbidden.

---

## 7. Tests

All tests must follow the supplied testing standards:
- behavior-first
- Given / When / Then structure
- no business logic tested in `.tsx`
- real runtime world for integration coverage where applicable

## 7.1 Unit tests

### Add — `src/engine/compiler/abilities/conditionalActivationCompiler.test.ts`

Required coverage:
- resolves singleton target selection correctly
- resolves array target selection by stable id correctly
- ignores stale ids correctly
- compiles positive conditions correctly
- inverts each supported comparison operator correctly
- logs loudly on unsupported inversion input

### Add — `src/ui/devtools/editors/blueprint/mode/conditionalActivationTargetOptions.test.ts`

Required coverage:
- returns one row per authored ability instance
- marks supported targets selectable
- marks unsupported targets disabled with reasons
- uses stable ids for targetable repeatable abilities
- preserves display order matching the editor list order

## 7.2 Compiler tests

### Add — `src/engine/compiler/abilities/cycleCompiler.conditionalActivation.test.ts`

Required coverage:
- selected Cycle with conditions compiles initial inactive state
- selected Cycle compiles saved throttle hidden state correctly from `startActive`
- selected Cycle emits one activation rule with positive conditions
- selected Cycle emits one deactivation rule per authored condition
- selected Cycle with zero conditions compiles no lifecycle override
- unselected Cycle compiles unchanged behavior

### Add — `src/engine/compiler/abilities/productionCompiler.conditionalActivation.test.ts`

Required coverage:
- selected Production receives appended Conditional Activation conditions
- unselected Production is unchanged

### Add — `src/engine/compiler/abilities/conversionCompiler.conditionalActivation.test.ts`

Required coverage:
- selected Conversion receives appended Conditional Activation conditions
- unselected Conversion is unchanged

### Add — `src/engine/compiler/abilities/spawnerCompiler.conditionalActivation.test.ts`

Required coverage:
- selected Spawner receives appended Conditional Activation conditions
- unselected Spawner is unchanged

### Add — `src/engine/compiler/abilities/samplerCompiler.conditionalActivation.test.ts`

Required coverage:
- selected Sampler receives appended Conditional Activation conditions
- unselected Sampler is unchanged

### Add — `src/engine/compiler/abilities/draftCompiler.conditionalActivation.test.ts`

Required coverage:
- selected Draft receives appended Conditional Activation conditions
- unselected Draft is unchanged

### Add — `src/engine/compiler/abilities/updaterCompiler.conditionalActivation.test.ts`

Required coverage:
- selected Updater receives appended Conditional Activation conditions
- unselected Updater is unchanged

## 7.3 Editor/view tests

### Add — `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.test.tsx`

Required coverage:
- renders the conditions editor
- renders a checkbox row for each authored ability instance on the blueprint
- supported rows are interactive
- unsupported rows are disabled and show explanatory tooltip text
- toggling a supported row updates `_editor.abilities.conditionalActivation.targets`

### Change — `src/ui/devtools/editors/blueprint/mode/CycleAbilityForm.test.tsx`

Required coverage addition:
- no regression in Cycle form rendering after adding Conditional Activation to the single-ability list

## 7.4 Runtime/view wiring tests

### Change — `src/ui/runtime/world/selection/job-card/JobCard.throttleVisibility.test.tsx`

Required coverage addition:
- hides slider when Conditional Activation hide state is `1` even if `showThrottleSlider` is true
- still hides when authored `showThrottleSlider` is false
- shows slider only when both authored baseline and Conditional Activation state allow it

### Add — `src/ui/runtime/world/selection/usePowerSinkThrottle.conditionalActivation.test.ts`

Required coverage:
- emits `UPDATE_POWER_SINK` as before
- emits mirrored `UPDATE_STATE` for saved throttle when the hidden state key exists
- does not emit mirrored state update for entities without the hidden state key

---

## 8. Acceptance Criteria

The implementation is complete only when all of the following are true:

1. The blueprint editor can add/remove a new Conditional Activation ability.
2. The Conditional Activation form renders a conditions editor and a checkbox list of current blueprint abilities.
3. Supported targets can be checked and unchecked.
4. Unsupported targets are visible but disabled with clear tooltip text.
5. Target persistence uses stable ids for repeatable supported abilities.
6. Selected non-Cycle supported abilities are gated by appended Conditional Activation conditions in their own compilers.
7. Selected Cycle compiles to explicit active/inactive lifecycle behavior.
8. Inactive Cycle means `cycle_active = 0`, `throttle = 0`, and hidden throttle slider.
9. React does not hold shadow activation state; the JobCard renders from ECS state only.
10. User-selected Cycle throttle intent is preserved across deactivation/reactivation.
11. No new runtime command type is introduced.
12. Silent failures do not exist; stale/unsupported targets log loudly and are ignored.
13. All new and changed tests pass.

