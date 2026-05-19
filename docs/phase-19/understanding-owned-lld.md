# LLD — `understanding_owned` structured condition

## 1. Purpose

Implement a new structured fact condition type, `understanding_owned`, that behaves like the existing `habitus_owned` fact condition, but tracks cave-owned understanding instead of cave-owned habitus.

This document is based on the current codebase only. It does not infer new architecture or introduce unrelated refactors.

---

## 2. Why

### 2.1 Observed current state

The codebase already has all of the following:

- a generic structured fact-threshold condition pipeline
- a world fact store under `sys_world.<scope>.<factType>.<factAbout>`
- existing ownership facts for `habitus_owned`
- first-class cave-owned understanding state under `cave.ownedUnderstanding`
- a `GAIN_UNDERSTANDING` command and handler that mutates owned understanding

The missing piece is that understanding acquisition does **not** currently emit a fact that can be used by structured conditions.

### 2.2 Why this feature is needed

Without `understanding_owned`, authored conditions cannot gate behavior on whether a specific understanding has been acquired.

That creates a gap between:

- what the runtime stores (`cave.ownedUnderstanding`), and
- what the condition system can query (`fact_threshold` over world facts)

`understanding_owned` closes that gap using the same fact-based mechanism that already exists for `habitus_owned`.

---

## 3. Scope

## In scope

- add `understanding_owned` as an allowed `fact_threshold.factType`
- emit mirrored `run` and `permanent` facts when a new understanding is gained on `sys_world`
- expose correct authoring suggestions for `factAbout` when `factType === "understanding_owned"`
- add tests that lock the schema, runtime, and editor contract

## Out of scope

- changing the generic condition compiler
- changing the generic condition evaluator
- changing fact storage utilities
- changing `UPDATE_CAVE` semantics
- changing authored gameplay content to start using `understanding_owned`
- fixing unrelated `habitus_owned` autocomplete behavior

The last item is intentionally out of scope. `habitus_owned` currently falls back to blueprint-id suggestions in the editor. That existing behavior is not part of this task.

---

## 4. Existing behavior to preserve

The implementation must preserve these current contracts.

### 4.1 Structured fact conditions are world-scoped

For `fact_threshold` conditions, the compiler resolves most fact references to:

- `sys_world.<scope>.<factType>.<factAbout>`

This means `understanding_owned` must also be treated as a world fact, not as per-entity state.

### 4.2 `GAIN_UNDERSTANDING` mutates owned understanding directly

`GainUnderstandingHandler` currently:

- validates target entity existence
- validates that the target has a cave component
- validates that the understanding id exists in config
- deduplicates repeated acquisition
- writes the normalized list through `applyOwnedUnderstanding`
- synchronizes hidden resource-gain bonus state only when the target entity is `sys_world`

This direct mutation pattern must remain unchanged.

### 4.3 Existing generic mechanisms must be reused

The implementation must reuse:

- `FactTypeSchema` for authoring/schema validation
- `enqueueMirroredFactAdjust(...)` for fact emission
- `applyOwnedUnderstanding(...)` for cave mutation
- the existing structured condition compiler/evaluator without modification

---

## 5. Functional contract

## 5.1 Authoring contract

Authors can create a `fact_threshold` condition with:

- `factType: "understanding_owned"`
- `factAbout: <understanding id>`
- `scope: "run" | "permanent"`
- a numeric operator and value

The condition is valid schema input.

## 5.2 Runtime acquisition contract

When `GAIN_UNDERSTANDING` successfully adds a previously unowned understanding to `sys_world.cave.ownedUnderstanding`, the handler must:

1. update `ownedUnderstanding`
2. enqueue `ADJUST_FACT` for `run.understanding_owned.<understandingId>` with `delta = 1`
3. enqueue `ADJUST_FACT` for `permanent.understanding_owned.<understandingId>` with `delta = 1`
4. enqueue the existing hidden resource-gain-bonus state sync

## 5.3 Duplicate-acquisition contract

If the understanding is already present in `ownedUnderstanding`, the handler must:

- perform no mutation
- enqueue no `understanding_owned` fact updates
- enqueue no resource-gain-bonus state sync
- log nothing

This matches the current early-return pattern.

## 5.4 Non-world target contract

`GAIN_UNDERSTANDING` can technically target any entity with a cave component.

If the target entity is **not** `sys_world`, the handler must:

- still update that entity’s `ownedUnderstanding`
- **not** enqueue `understanding_owned` fact updates
- **not** enqueue hidden resource-gain-bonus state sync

Reason:

- structured fact conditions for ownership resolve against `sys_world`, not arbitrary cave entities
- the existing resource-gain-bonus sync is already world-only

This boundary must be explicit in the implementation and tests.

## 5.5 Evaluation contract

Once the fact has been emitted and applied, existing `fact_threshold` evaluation must work unchanged.

Example semantic result:

- if `sys_world.run.understanding_owned.insight === 1`
- then a condition `run understanding_owned insight >= 1` evaluates `true`

---

## 6. Design

## 6.1 Schema and authoring surface

Add `understanding_owned` to the `FactTypeSchema` enum.

This automatically updates all places that use the schema-driven fact type selector.

No additional schema refinement is required because:

- `understanding_owned` uses the standard `factAbout: string`
- unlike `cave_status`, it does not have a fixed closed set enforced in the schema layer

## 6.2 Runtime fact emission

Do **not** add a new command type.

Do **not** add a new fact utility.

Use the existing helper:

- `enqueueMirroredFactAdjust(commands, factType, factAbout, delta)`

`GainUnderstandingHandler` is the correct emission point because it is the existing acquisition boundary for owned understanding.

## 6.3 Command ordering inside `GainUnderstandingHandler`

For a successful first acquisition on `sys_world`, the handler must perform work in this order:

1. validate input and target
2. detect duplicate and early-return if already owned
3. write the updated `ownedUnderstanding` list using `applyOwnedUnderstanding`
4. enqueue mirrored fact updates for `understanding_owned`
5. enqueue hidden resource-gain-bonus sync

This ordering keeps all acquisition side effects deterministic and places the fact emission immediately after the successful ownership mutation.

## 6.4 Editor suggestion behavior

The fact type selector will pick up the new enum value automatically.

The `factAbout` autocomplete must be extended so that when:

- `factType === "understanding_owned"`

it returns the union of:

- linked cartridge understanding ids from `workspaceService.activeCartridge?.config?.understanding`
- drafted understanding ids from `state.sessions[filename]?.draft.config?.understanding`

sorted and deduplicated using the same pattern already used for blueprint and tutorial suggestions.

No new editor widget is required.

---

## 7. Files to change

## 7.1 `src/data/schemas/conditions.ts`

### Responsibility

Defines the allowed structured condition schema, including the canonical enum of fact types.

### Change

Add `"understanding_owned"` to `FactTypeSchema`.

### Logic

- place the new fact type alongside the existing ownership fact types
- do not add custom validation for `factAbout`
- do not change the structure of `FactThresholdConditionSchema`

### Interface contract

After the change, `StructuredConditionSchema.parse(...)` must accept:

- `kind: "fact_threshold"`
- `factType: "understanding_owned"`

with the same payload shape already used for other generic fact types.

---

## 7.2 `src/data/schemas/conditions.test.ts`

### Responsibility

Locks the schema contract for valid and invalid condition inputs.

### Change

Add a positive test that parses a `fact_threshold` using `factType: "understanding_owned"`.

### Logic

The test must prove only schema acceptance.

It must not assert runtime behavior.

### Interface contract

The schema test must fail if `understanding_owned` is removed from `FactTypeSchema` or becomes invalid input.

---

## 7.3 `src/game/handlers/GainUnderstandingHandler.ts`

### Responsibility

Handles the `GAIN_UNDERSTANDING` runtime command.

### Change

Extend the handler so that a successful first acquisition on `sys_world` also emits mirrored `understanding_owned` facts.

### Logic

The handler must continue to:

- validate entity existence
- validate cave presence
- validate config existence for the understanding id
- return early for duplicate ownership
- mutate `ownedUnderstanding` via `applyOwnedUnderstanding`

After successful mutation:

- if `entity.id !== "sys_world"`, return immediately
- if `entity.id === "sys_world"` and `context.commands` exists:
  - enqueue mirrored fact updates for `understanding_owned`
- then enqueue the existing hidden state sync for resource-gain bonuses

### Interface contract

Input interface remains unchanged:

- `GainUnderstandingCommand`
- payload: `{ entityId: string; understandingId: string }`

Output side effects for first acquisition on `sys_world` become:

- in-memory cave update
- buffered mirrored fact updates
- buffered hidden bonus-state updates

No other side effects are added.

---

## 7.4 `src/game/handlers/GainUnderstandingHandler.test.ts`

### Responsibility

Locks the runtime contract for the understanding-acquisition command handler.

### Change

Extend the test suite to cover:

1. successful first acquisition on `sys_world`
2. duplicate acquisition on `sys_world`
3. explicit error cases already enforced by the handler
4. successful acquisition on a non-`sys_world` cave entity

### Logic

#### Test: first acquisition on `sys_world`

Given:

- `sys_world` with `cave.ownedUnderstanding = []`
- understanding config containing the target id

When:

- `GAIN_UNDERSTANDING` is handled

Then:

- `ownedUnderstanding` contains the new id
- the command buffer contains:
  - `ADJUST_FACT` for `run.understanding_owned.<id>`
  - `ADJUST_FACT` for `permanent.understanding_owned.<id>`
  - the existing hidden `UPDATE_STATE` sync command(s)

#### Test: duplicate acquisition

Given:

- `sys_world` with `cave.ownedUnderstanding` already containing the id

When:

- `GAIN_UNDERSTANDING` is handled

Then:

- `ownedUnderstanding` is unchanged
- no fact commands are enqueued
- no hidden state sync commands are enqueued

#### Test: invalid inputs

Preserve and, if necessary, extend explicit error coverage for:

- missing entity
- missing cave component
- unknown understanding id

#### Test: non-world cave entity

Given:

- a non-`sys_world` entity with a cave component
- valid understanding config

When:

- `GAIN_UNDERSTANDING` is handled for that entity

Then:

- the entity’s `ownedUnderstanding` is updated
- no `understanding_owned` fact commands are enqueued
- no hidden world bonus sync commands are enqueued

### Interface contract

These tests define the authoritative runtime behavior for `understanding_owned` emission.

---

## 7.5 `src/game/conditions/evaluateStructuredConditionSet.test.ts`

### Responsibility

Locks end-to-end structured-condition evaluation behavior using the real compiled condition path.

### Change

Add a test that evaluates a `fact_threshold` condition using `factType: "understanding_owned"`.

### Logic

Given:

- a snapshot containing `sys_world.run.understanding_owned.<id> = 1`

When:

- `evaluateStructuredConditionSet(...)` is called with a matching `fact_threshold`

Then:

- the result is `true`

Add the corresponding negative case with the fact missing or zero.

### Interface contract

This test proves that no compiler or evaluator changes are required and prevents regressions in world-fact path resolution for the new fact type.

---

## 7.6 `src/ui/devtools/editors/conditions/structuredConditionAutocomplete.ts`

### Responsibility

Builds suggestion sets for structured condition authoring in the devtools editor.

### Change

Extend this module so it can provide understanding-id suggestions for `understanding_owned`.

### Logic

Add understanding-id collection using the same linked-plus-draft pattern already used elsewhere in the file:

- linked ids from active cartridge config
- drafted ids from the current session draft config
- dedupe
- locale-sort

Extend `useStructuredConditionSuggestions(filename)` to return `understandingIds`.

Extend `resolveStructuredFactAboutSuggestions(...)` so that:

- when `factType === "understanding_owned"`, it returns `understandingIds`

All existing cases must remain unchanged.

### Interface contract

`resolveStructuredFactAboutSuggestions(...)` will gain one new input:

- `understandingIds: string[]`

Its output remains:

- `string[]`

No existing caller may lose its current behavior.

---

## 7.7 `src/ui/devtools/editors/conditions/StructuredConditionFieldSets.tsx`

### Responsibility

Wires the structured-condition field components to schemas and autocomplete sources.

### Change

Pass `understandingIds` into the `resolveStructuredFactAboutSuggestions(...)` call path.

### Logic

Extend `FactThresholdFields` props with:

- `understandingIds: string[]`

Forward that prop into the suggestion resolver.

No other rendering behavior changes.

### Interface contract

`FactThresholdFields` prop contract changes by one additional required prop:

- `understandingIds`

Rendered field structure remains unchanged.

---

## 7.8 `src/ui/devtools/editors/conditions/StructuredConditionRow.tsx`

### Responsibility

Selects the correct field set for each structured condition row and passes authoring suggestions into fact-threshold rows.

### Change

Pass `suggestions.understandingIds` into `FactThresholdFields`.

### Logic

No new business logic is added.

This file only propagates the newly available suggestion set.

### Interface contract

The rendered condition row remains identical except for correct `factAbout` suggestions when the author selects `understanding_owned`.

---

## 7.9 `src/ui/devtools/editors/conditions/structuredConditionAutocomplete.test.ts`

### Responsibility

Locks suggestion behavior for structured condition authoring.

### Change

Add a test that verifies:

- `resolveStructuredFactAboutSuggestions("understanding_owned", ...)`
- returns the supplied understanding ids

### Logic

Preserve existing assertions for:

- `cave_status`
- `elapsed_real_seconds`
- `blueprint_spawned`

### Interface contract

The test must fail if `understanding_owned` falls back to blueprint suggestions or world suggestions.

---

## 8. Files explicitly not changed

These files already satisfy the feature through generic behavior and must remain unchanged.

### `src/engine/compiler/conditions/compileStructuredConditions.ts`

Reason:

- generic `fact_threshold` compilation already resolves world facts by `factType` and `factAbout`

### `src/game/conditions/evaluateStructuredConditionSet.ts`

Reason:

- evaluation is generic over the compiled world-fact path

### `src/game/facts/factCommands.ts`

Reason:

- `enqueueMirroredFactAdjust(...)` already provides the exact fact-emission behavior needed

### `src/engine/runtime/handlers/UpdateCaveHandler.ts`

Reason:

- `GAIN_UNDERSTANDING` already mutates the cave directly and should continue to do so
- the new feature is fact emission, not cave-update semantics

### `src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts`

Reason:

- command payload shape does not change

### authored data files under `src/data/raw/example/modules/**`

Reason:

- this task adds support for the new fact type
- it does not require authored gameplay content migration

---

## 9. Pseudocode

## 9.1 Handler pseudocode

For `GainUnderstandingHandler.handle(command, context)`:

- resolve entity by id
- if missing: log explicit error and return
- if cave missing: log explicit error and return
- if understanding id missing from config: log explicit error and return
- read current `ownedUnderstanding`
- if already owned: return
- write normalized list using `applyOwnedUnderstanding`
- if target entity is not `sys_world`: return
- if command buffer exists:
  - enqueue mirrored fact adjust for `understanding_owned`
- enqueue existing hidden resource-gain-bonus sync

## 9.2 Autocomplete pseudocode

For `resolveStructuredFactAboutSuggestions(...)`:

- if `factType === "cave_status"`: return cave-status keys
- if fact type is a world sentinel type: return `["world"]`
- if `factType === "tutorial_completed"`: return tutorial ids
- if `factType === "draft_opened"`: return draft pool ids
- if `factType === "draft_completed"`: return draft option ids
- if `factType === "understanding_owned"`: return understanding ids
- otherwise: return blueprint ids

---

## 10. Test plan

The implementation is complete only when the following tests exist and pass.

## 10.1 Unit tests

- schema accepts `understanding_owned`
- autocomplete returns understanding ids for `understanding_owned`
- structured condition evaluation succeeds and fails correctly for `understanding_owned`

## 10.2 Runtime handler tests

- first acquisition on `sys_world` emits mirrored facts and hidden state sync
- duplicate acquisition emits nothing
- missing entity logs explicitly
- missing cave logs explicitly
- unknown understanding id logs explicitly
- non-`sys_world` acquisition updates cave ownership only

## 10.3 Test style requirements

Tests must follow the uploaded project testing contract:

- Given / When / Then structure
- real data objects where practical
- no mocking of plain JSON data structures
- no UI-business-logic assertions in view tests

---

## 11. Acceptance criteria

The feature is done when all of the following are true.

1. `StructuredConditionSchema` accepts `factType: "understanding_owned"`.
2. `GAIN_UNDERSTANDING` on `sys_world` emits `run` and `permanent` `understanding_owned` facts exactly once for first acquisition.
3. repeated acquisition of the same understanding is a no-op.
4. non-`sys_world` cave entities do not emit world ownership facts.
5. a `fact_threshold` condition using `understanding_owned` evaluates correctly without compiler or evaluator changes.
6. the devtools condition editor suggests understanding ids when `understanding_owned` is selected.
7. no unrelated files or behaviors are changed.

---

## 12. Implementation summary

This feature is a narrow extension of an existing pattern.

- schema: add one fact type
- runtime: emit mirrored facts from the existing understanding-acquisition handler
- editor: provide correct `factAbout` suggestions for the new fact type
- tests: lock schema, runtime, evaluation, and editor behavior

No new architecture is required.
No generic systems need refactoring.
The implementation should be built entirely on the existing fact, command, cave-mutation, and editor-suggestion mechanisms.
