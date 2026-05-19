# Guidance / Tutorial / Codex / Conditions Redesign — LLD

## Status

Approved redesign target for the codebase.

This document is grounded in the implementation currently present in the codebase.
It replaces the current step-based hard tutorial model and guidance-local condition model with a simpler composition model built on:

- reusable authored condition definitions
- reusable presentation-only guidances
- concurrent tutorial composition
- codex wrappers over guidances

This document contains the **why**, the **what**, and the **how**.
It contains no code.

---

## 1. Why this redesign is required

The current implementation in `src3` has four structural problems.

### 1.1 Guidance is overloaded

`src/data/schemas/guidances.ts` currently mixes:

- presentation (`node_callout`, `screen_callout`, `modal`)
- composition concerns (`enterConditionIds`, `completionConditionIds`)
- preset-based attention (`attentionPreset`)

This makes Guidance hard to reuse and makes the editor noisy.

### 1.2 Tutorial is too phase-oriented for the authored model

`src/data/schemas/tutorials.ts` and `src/game/systems/HardTutorialSystem.ts` currently assume:

- ordered steps
- step-local bindings
- step-local retry
- step progression state

The target authored model is not a multi-phase step machine.
A tutorial is a concurrent composition layer: one tutorial activates a set of guidances together and completes as a whole.

### 1.3 Conditions are authored at the wrong layer

The current `ConditionsEditor` edits raw `StructuredCondition[]` directly under `config.settings.conditions`.

Tutorials and knowledge entries then reference bare ids, while guidances also own condition ids.

The target design requires reusable **named authored condition definitions** which are referenced by composition layers.

### 1.4 The editor UX follows the wrong data shape

The existing editors reflect the overloaded runtime/data model:

- `GuidanceForm.tsx`
- `TutorialForm.tsx`
- `TutorialStepForm.tsx`
- `TutorialGuidanceUseForm.tsx`
- `KnowledgeRow.tsx`

The requested redesign is row-based and compositional:

- reusable condition definitions
- reusable presentation-only guidances
- tutorials composed from concurrent guidance uses
- codex entries wrapping one guidance plus unlock conditions

This redesign fixes those problems while reusing the existing editor/session/schema/runtime mechanisms already present in `src3`.

---

## 2. Scope

### 2.1 In scope

- redesign the authored data model for:
    - conditions
    - guidances
    - tutorials
    - codex entries (`knowledge` storage key retained)
- redesign the devtools editors for those four authored surfaces
- rewrite hard tutorial runtime orchestration to match the new tutorial model
- keep tutorial completion as a **permanent** fact across all games
- keep the runtime/tutorial/callout machinery grounded in the existing `sys_world.tutorial` component and node overlay pipeline
- fix the broken `.cave` config route tab ids for `conditions`, `guidances`, and `knowledge` while touching the editor flow

### 2.2 Out of scope

- player-facing codex runtime UI
- soft-guidance runtime orchestration beyond authored codex wrappers over guidances
- removing the legacy thought runtime/editor unless directly required by a touched file
- unrelated cleanup or refactor
- retry; retry is intentionally removed

---

## 3. Non-negotiable design decisions

These are locked.

1. **Guidance is presentation-only**
    - Guidance stores presentation, authored target where applicable, text/image content, and attention mechanisms.
    - Guidance stores **no enter conditions** and **no completion conditions**.

2. **Tutorial is concurrent composition, not a phase machine**
    - A tutorial has no steps.
    - All guidance uses in a tutorial are activated concurrently.
    - Tutorial completion is determined by the tutorial's exit conditions.

3. **Conditions are authored reusable definitions**
    - A condition definition is a named AND-list of structured conditions.
    - Tutorials and codex entries reference condition definition ids.

4. **Codex is a wrapper over one guidance**
    - Storage key remains `knowledge`.
    - UI label becomes `Codex`.

5. **Tutorial completion is permanent**
    - Completion is recorded in permanent runtime facts and survives rebirth/new runs.

6. **Target precedence is explicit**
    - If a tutorial/codex guidance use supplies a target override, it wins.
    - Otherwise the authored guidance target is used.

7. **Tutorial self resolution is explicit**
    - Tutorial `self` is defined by tutorial-level `selfDefinition`.
    - `auto` resolves to the first effective target-bearing guidance use after overrides.
    - If there is no target-bearing guidance use, `auto` resolves to `sys_world`.

8. **No retry in this redesign**
    - Retry is removed entirely.
    - All retry schema, editor fields, runtime evaluation, and tests are removed.

9. **Attention is compositional**
    - All three guidance types may author:
        - `stop_time`
        - `hide_time_controls`
        - `hide_notifications`
    - `node_callout` additionally may author:
        - `hide_all_but_self`
        - `show_attention_effect_on_self`

10. **Attention transitions must be flicker-free**
    - When a tutorial completes and another tutorial becomes eligible immediately because of the just-written completion fact, the runtime must transition directly to the next tutorial attention plan.
    - The runtime must not expose an intermediate empty-attention frame.
    - This is implemented by tutorial orchestration buffering, not by separate UI-only state.

11. **Missing/invalid runtime tutorial data must fail loudly**
    - Invalid active tutorial data logs loudly and clears/completes the tutorial deterministically.
    - Silent failure is forbidden.

---

## 4. Target authored model

## 4.1 Conditions (`config.settings.conditions`)

`config.settings.conditions` becomes an array of authored condition definitions.

Each entry contains:

- `id: string`
- `label: string`
- `conditions: StructuredCondition[]`

Semantics:

- the `conditions` list is an AND-list
- an empty `conditions` list evaluates to `true`
- condition definitions are referenced by id from tutorials and codex entries

### Structured condition model changes

Keep the existing structured condition mechanism.

Extend fact support with permanent tutorial completion by adding `tutorial_completed` to `FactTypeSchema`.

Do **not** add a second condition language.

### Rationale

This reuses:

- `StructuredConditionsField`
- `compileStructuredConditions`
- the existing fact infrastructure

It avoids building a second condition system.

## 4.2 Guidances (`config.settings.guidances`)

Guidance remains a discriminated union of presentation subtypes.

Persistence discriminator values:

- `node_callout`
- `screen_callout`
- `modal`

Editor labels:

- `Node Callout`
- `Window Callout` for `screen_callout`
- `Modal`

### Shared guidance fields

All guidances have:

- `id: string`
- `attention: GuidanceAttentionMechanism[]`

The common attention mechanisms available to **all** guidance types are:

- `stop_time`
- `hide_time_controls`
- `hide_notifications`

The node-only attention mechanisms are:

- `hide_all_but_self`
- `show_attention_effect_on_self`

Validation rule:

- `screen_callout` and `modal` may only author the common mechanisms
- `node_callout` may author both common and node-only mechanisms

### `node_callout`

Fields:

- `id`
- `presentation = node_callout`
- `target: EntityTargetSpec` (required)
- `slot: NodeCalloutSlot` (single primary slot, not an array)
- `text: string`
- `imageUrl: string | null`
- `attention: GuidanceAttentionMechanism[]`

Node-only attention mechanism semantics:

- `hide_all_but_self`
    - tutorial attention plan must:
        - set `focusEntityIds = [self]`
        - set `blockNonFocusedInteraction = true`
- `show_attention_effect_on_self`
    - tutorial attention plan must set `ringEntityIds = [self]`

Common mechanism semantics:

- `stop_time`
    - tutorial attention plan must set `pauseGame = true`
- `hide_time_controls`
    - tutorial attention plan must set `hideTimeControls = true`
- `hide_notifications`
    - tutorial attention plan must set `hideNotifications = true`

### `screen_callout`

Fields:

- `id`
- `presentation = screen_callout`
- `screenSlot: ScreenCalloutSlot`
- `text: string`
- `imageUrl: string | null`
- `attention: GuidanceAttentionMechanism[]`

No authored target.

Allowed attention mechanisms:

- `stop_time`
- `hide_time_controls`
- `hide_notifications`

### `modal`

Fields:

- `id`
- `presentation = modal`
- `title: string`
- `text: string`
- `imageUrl: string | null`
- `attention: GuidanceAttentionMechanism[]`

No authored target.

Allowed attention mechanisms:

- `stop_time`
- `hide_time_controls`
- `hide_notifications`

## 4.3 Tutorials (`config.settings.tutorials`)

A tutorial definition becomes:

- `id: string`
- `selfDefinition: TutorialSelfDefinition`
- `enterConditionIds: string[]`
- `guidances: TutorialGuidanceUse[]`
- `exitConditionIds: string[]`

### `TutorialSelfDefinition`

Discriminated union:

- `auto`
- `entity_id`
- `entity_tag`

Semantics:

- `entity_id` and `entity_tag` resolve exactly like the existing tutorial target resolution
- `auto` uses the first effective target-bearing guidance use after overrides
- if `auto` finds no target-bearing guidance use, `self` is `sys_world`

### `TutorialGuidanceUse`

Each tutorial guidance use contains:

- `guidanceId: string`
- `targetOverride?: EntityTargetSpec`
- `textOverride?: string`

Semantics:

- multiple guidance uses are concurrent
- array order is stable and meaningful
- array order defines:
    - binding order
    - overlay precedence
    - fallback precedence when slot collisions must be resolved

### Tutorial activation/completion semantics

- enter conditions are evaluated against tutorial `self`
- exit conditions are evaluated against tutorial `self`
- empty enter conditions mean “always eligible”
- empty exit conditions mean “immediately complete on the first completion check”

## 4.4 Codex (`config.settings.knowledge`)

Storage key remains `knowledge`.
UI label becomes `Codex`.

Each codex entry contains:

- `id: string`
- `label: string`
- `description: string`
- `guidanceId: string`
- `targetOverride?: EntityTargetSpec`
- `textOverride?: string`
- `unlockConditionIds: string[]`

Semantics:

- one codex entry wraps one guidance
- unlock conditions are ANDed authored condition definitions
- empty unlock conditions mean “always unlocked”
- this redesign changes authored data and editor UX only
- it does **not** add a player-facing codex runtime UI

---

## 5. Runtime behavior after redesign

## 5.1 Hard tutorial selection

Only one hard tutorial may be active at a time.

Selection algorithm:

1. If `sys_world.tutorial.active` is `true`, continue evaluating the active tutorial only.
2. If no tutorial is active:
    - scan authored tutorials in array order
    - skip any tutorial whose permanent fact `tutorial_completed::<tutorial.id>` is already `>= 1`
    - for the first tutorial whose enter conditions evaluate to `true`, activate it
3. If no tutorial is eligible, keep tutorial state inactive and empty.

### Permanent completion tracking

On tutorial completion, enqueue one `ADJUST_FACT` command with:

- `scope = permanent`
- `factType = tutorial_completed`
- `factAbout = tutorial.id`
- `delta = 1`

This reuses the existing permanent fact mechanism already used by thought persistence/rebirth handling.

## 5.2 Tutorial activation

When a tutorial activates:

1. resolve tutorial `self` from `selfDefinition`
2. resolve each tutorial guidance use to an effective runtime binding:
    - load guidance by `guidanceId`
    - determine effective target:
        - `targetOverride` if present
        - otherwise authored guidance target
    - resolve effective target to one concrete entity id if the guidance subtype is target-bearing
    - freeze that resolved entity id into the runtime binding
3. merge attention mechanisms from all active guidance uses into one runtime attention plan
4. write the active tutorial state into `sys_world.tutorial`

Invalid activation is handled deterministically.

Invalid cases include:

- missing guidance id
- missing condition id
- target-bearing guidance with no resolvable target
- `selfDefinition` requiring a target but failing to resolve

All of the above must:

- log a loud error
- mark the tutorial as completed immediately for this transition
- enqueue the permanent tutorial completion fact for that tutorial id
- continue the same-tick tutorial-selection pass using that completion overlay
- if no next tutorial is eligible, clear active tutorial state

## 5.3 Tutorial completion

While a tutorial is active:

- evaluate tutorial exit conditions against frozen tutorial `self`

When exit conditions become true:

1. enqueue permanent tutorial completion fact
2. continue the tutorial-selection pass immediately in the same system tick, treating the just-completed tutorial as completed
3. if another tutorial is now eligible, activate it immediately and write its bindings/attention plan directly
4. otherwise clear tutorial state

There is:

- no per-guidance completion logic
- no tutorial steps
- no step progression state
- no retry

## 5.4 Frozen target semantics

Target resolution happens once on activation and is frozen for the lifetime of the active tutorial.

If a frozen target becomes invalid while the tutorial is active:

- log a loud error
- complete the tutorial immediately
- enqueue permanent tutorial completion fact
- continue the same-tick tutorial-selection pass using that completion overlay
- if no next tutorial is eligible, clear tutorial state

This matches the agreed rule for invalid composition state: complete it and log loudly, without trying to recover silently.

## 5.5 Buffered attention transitions

Attention removal/add is buffered at tutorial orchestration time.

This is a runtime rule, not a UI-only rule.

Required behavior:

- the runtime must emit at most one final visible tutorial attention state per tutorial-system tick
- if tutorial A completes and tutorial B activates immediately because tutorial A completion fact made tutorial B eligible, the runtime must not emit a “cleared attention” tutorial state between them
- the UI must therefore never render a one-frame attention flicker between chained tutorials

Implementation rule:

- `HardTutorialSystem` must compute the post-completion result before emitting its final `SET_TUTORIAL_STATE` command for the tick
- clearing attention is only emitted when no replacement tutorial is activated in that same selection pass

---

## 6. Runtime UI behavior after redesign

## 6.1 Runtime tutorial component shape

`sys_world.tutorial` must be simplified.

Required fields:

- `active: boolean`
- `tutorialId: string | null`
- `primaryTargetId: string | null`
- `bindings: RuntimeTutorialGuidanceBinding[]`
- `attention: ResolvedTutorialAttentionPlan`

Removed fields:

- `stepIndex`
- `stepStartedAtGameSeconds`
- `completed`

`RuntimeTutorialGuidanceBinding` must contain:

- `bindingId: string`
- `guidanceId: string`
- `targetId: string | null`
- `textOverride: string | null`

`bindingId` must be deterministic and unique per active tutorial binding.

Required format:

- `<tutorialId>::<bindingIndex>`

This fixes the current duplicate-guidance rendering bug caused by using `guidance.id` as the overlay key.

## 6.2 Attention plan

`ResolvedTutorialAttentionPlan` stays in `sys_world.tutorial`, but it is built from guidance mechanisms rather than preset enums.

Fields retained:

- `hideNotifications`
- `hideTimeControls`
- `pauseGame`
- `focusEntityIds`
- `ringEntityIds`
- `cameraFocusEntityId`
- `blockNonFocusedInteraction`

Merge rules:

- booleans merge by OR
- `focusEntityIds` and `ringEntityIds` merge by stable deduped append in tutorial guidance order
- `cameraFocusEntityId` is the first `focusEntityIds` entry if any exist, otherwise `null`

Mechanism translation:

- common mechanisms on any guidance subtype contribute:
    - `stop_time` -> `pauseGame = true`
    - `hide_time_controls` -> `hideTimeControls = true`
    - `hide_notifications` -> `hideNotifications = true`
- node-only mechanisms contribute:
    - `hide_all_but_self` -> add target to `focusEntityIds`, set `blockNonFocusedInteraction = true`
    - `show_attention_effect_on_self` -> add target to `ringEntityIds`

Attention application/removal rule:

- runtime UI derives attention from the single committed tutorial component state after tutorial-system buffering has settled for the tick
- runtime UI does not implement a separate temporal hold state

## 6.3 Callout rendering

Node and screen guidance callouts continue to render through the node overlay viewport.

Changes required:

- render by `bindingId`, not `guidance.id`
- use one layout resolver for all guidance callouts in the active tutorial
- collision handling is **callout vs callout only**
- ambient node telemetry remains untouched and is not part of guidance collision resolution

### Node callout slot behavior

- authored guidance stores one primary slot
- collision resolver derives an ordered fallback sequence from that primary slot
- fallback order is deterministic and fixed in one helper
- if every fallback still collides, keep the primary slot

### Screen callout slot behavior

- authored guidance stores one screen slot
- screen callouts also participate in guidance-callout collision checks
- if a screen callout collides, it tries the remaining screen slots in deterministic order
- if every fallback still collides, keep the authored slot

## 6.4 Modal rendering

`RuntimeTutorialModal.tsx` stays the modal renderer for active modal guidances.

Rules:

- render the first active modal guidance in binding order
- display `textOverride` if present, otherwise guidance-authored text
- display guidance-authored title and image
- modal rendering itself is unchanged in principle

This redesign does not add codex runtime playback.

---

## 7. Editor behavior after redesign

## 7.1 Conditions Editor

The Conditions Editor becomes a list of authored condition definitions.

Each row contains:

- editable id
- editable label
- structured condition list editor

This editor must reuse:

- `ComponentRow`
- `EditableTraitId`
- `StructuredConditionsField`
- `SmartTooltip`
- existing session store/updateDraft machinery

The old raw `StructuredConditionsField` mounted directly at `config.settings.conditions` is removed.

## 7.2 Condition Row / Conditions List

A new shared UI pair is required:

- `ConditionReferenceRow`
- `ConditionReferenceList`

These are used by:

- Tutorial Editor enter conditions
- Tutorial Editor exit conditions
- Codex Editor unlock conditions

Behavior:

- each row shows a dropdown/select of authored condition ids from `config.settings.conditions`
- each row includes remove control
- the list includes add control
- the list header includes one button that opens the Conditions Editor route for the same file
- every interactable control is wrapped in `SmartTooltip`

These components do **not** author structured conditions inline.
They only manage references.

## 7.3 Guidance Editor

The Guidance Editor becomes subtype-driven and presentation-only.

### Shared layout

- `Id`
- `Type`
- subtype-specific form
- `Preview`

### Node Callout subtype form

- target selector kind (`tag` or `id`)
- target selector value
- node slot dropdown (single slot)
- image URL field
- text field
- attention mechanism CRUD list

### Window Callout subtype form

- screen slot dropdown
- image URL field
- text field
- attention mechanism CRUD list (common mechanisms only)

### Modal subtype form

- title field
- image URL field
- text field
- attention mechanism CRUD list (common mechanisms only)

Guidance Editor must reuse:

- `ComponentRow`
- `EditableTraitId`
- `StringField`
- `AutocompleteStringField`
- `EnumField`
- existing blueprint/tag suggestion hooks from `structuredConditionAutocomplete.ts`
- `SmartTooltip`

Editor prevention rules:

- Node Callout requires authored target and node slot.
- Window Callout cannot expose target and may only expose common attention mechanisms.
- Modal cannot expose target and may only expose common attention mechanisms.

## 7.4 Guidance Preview

A new preview section is required in Guidance Editor.

Behavior:

- build a preview runtime from the current module draft
- reuse the existing preview pattern from blueprint visuals:
    - `createGameRuntime`
    - preview runtime factory
    - `LayoutWorldAdapter`
    - `LayoutRuntimeCanvas`
    - `useLayoutEditorTicker`
- inject a synthetic active tutorial state into preview `sys_world.tutorial` containing exactly one binding for the guidance currently being edited
- for node callout preview, use the guidance's effective authored target
- if the guidance target cannot resolve in preview, show an explicit empty-state message instead of rendering broken UI

Preview runtime rules:

- spawn preview system entities via existing `applyPreviewSystemEntities`
- spawn one deterministic preview entity for each compileable blueprint that can render as a positioned entity
- place preview entities in a deterministic grid around world center
- do not mutate the real runtime

The preview is editor-only and disposable.

## 7.5 Tutorial Editor

The Tutorial Editor becomes a concurrent composition editor.

Tutorial form layout:

- `Id`
- `Definition of Self`
- `Enter Conditions List`
- `Guidances list`
- `Exit Conditions List`

### Definition of Self editor

Modes:

- `Auto`
- `Tag`
- `Id`

Rules:

- `Auto` is default
- UI must show the currently resolved display target for `Auto`:
    - first effective target-bearing guidance if one exists
    - otherwise `sys_world`
- `Tag` uses blueprint tag autocomplete
- `Id` uses free text

### Tutorial guidances list

Each row contains:

- `guidanceId` selector
- optional target override kind (`tag` or `id`)
- optional target override value
- optional text override
- remove control

Rules:

- rows are concurrent, not steps
- row order is meaningful and user-controlled by list order
- tutorial completion is not row-based; it is tutorial exit-condition based

### Tutorial completion condition dependency

Because tutorials are concurrent and no longer stepped, a new permanent tutorial-completion fact must be usable from Conditions Editor by authored condition definitions.

## 7.6 Codex Editor

Storage key remains `knowledge`.
Editor title becomes `Codex Editor`.

Each codex entry row contains:

- `id`
- `label`
- `description`
- `guidanceId`
- optional target override kind/value
- optional text override
- `Unlock Conditions List`

This editor must reuse:

- `ComponentRow`
- `EditableTraitId`
- `ConditionReferenceList`
- blueprint/tag suggestion hooks
- `SmartTooltip`

No codex runtime UI is added in this change.

---

## 8. File-by-file implementation plan

Every file listed here is either changed, added, or removed.

## 8.1 Data schema files

### CHANGE `src/data/schemas/conditions.ts`

**Responsibility**

- Define the structured condition language and the authored condition-definition container.

**Logic**

- Keep the existing structured condition union.
- Extend `FactTypeSchema` with `tutorial_completed`.
- Replace `ConditionsSchema = StructuredCondition[]` with `ConditionsSchema = ConditionDefinition[]`.
- Add `ConditionDefinitionSchema`:
    - `id`
    - `label`
    - `conditions`
- Keep duplicate-id validation at the definition level.

**Interface**

- Export:
    - `ConditionDefinitionSchema`
    - `ConditionsSchema`
    - existing `StructuredCondition*` exports
- Existing import sites continue to import `ConditionsSchema` by name.

### ADD `src/data/schemas/targetSpec.ts`

**Responsibility**

- Hold the shared target selector schema used by guidances, tutorial overrides, and codex overrides.

**Logic**

- Define `EntityTargetSpecSchema` as a discriminated union:
    - `entity_id`
    - `entity_tag`
- Export its inferred type.

**Interface**

- Imported by `guidances.ts`, `tutorials.ts`, and `knowledge.ts`.
- No runtime logic lives here.

### CHANGE `src/data/schemas/guidances.ts`

**Responsibility**

- Define reusable presentation-only guidance definitions.

**Logic**

- Remove `enterConditionIds`.
- Remove `completionConditionIds`.
- Remove `GuidanceAttentionPresetSchema`.
- Add `GuidanceAttentionMechanismSchema`.
- Change node callout from `slots: string[]` to `slot: string`.
- Add authored target to node callout using `EntityTargetSpecSchema`.
- Add optional `imageUrl` to node, screen, and modal callouts where applicable.
- Keep `modal` subtype.
- Keep duplicate-id validation.
- Validate allowed attention mechanisms by subtype:
    - all guidance types: `stop_time`, `hide_time_controls`, `hide_notifications`
    - node only: `hide_all_but_self`, `show_attention_effect_on_self`

**Interface**

- Export updated `GuidanceDefinitionSchema` and inferred types.
- Persistence discriminator values remain:
    - `node_callout`
    - `screen_callout`
    - `modal`

### CHANGE `src/data/schemas/tutorials.ts`

**Responsibility**

- Define hard tutorial wrappers as concurrent compositions over guidances.

**Logic**

- Remove `TutorialStepSchema`.
- Remove `TutorialRetrySchema`.
- Remove `steps`.
- Add `TutorialSelfDefinitionSchema`:
    - `auto`
    - `entity_id`
    - `entity_tag`
- Add `TutorialGuidanceUseSchema`:
    - `guidanceId`
    - `targetOverride?`
    - `textOverride?`
- Redefine `TutorialDefinitionSchema` to:
    - `id`
    - `selfDefinition`
    - `enterConditionIds`
    - `guidances`
    - `exitConditionIds`
- Keep duplicate tutorial-id validation.

**Interface**

- Export the new tutorial types.
- All callers must stop referencing `steps`.

### CHANGE `src/data/schemas/knowledge.ts`

**Responsibility**

- Define codex-entry wrappers over one guidance.

**Logic**

- Keep storage array name under `knowledge`.
- Replace entry shape:
    - remove `key`
    - remove `buttonLabel`
- New shape:
    - `id`
    - `label`
    - `description`
    - `guidanceId`
    - `targetOverride?`
    - `textOverride?`
    - `unlockConditionIds`
- Keep duplicate-id validation.

**Interface**

- Export updated schema/type under the existing file path.
- Editor title may say `Codex`, but storage key remains `knowledge`.

### CHANGE `src/data/schemas/components/tutorial.ts`

**Responsibility**

- Define runtime tutorial state stored on `sys_world`.

**Logic**

- Remove `stepIndex`.
- Remove `stepStartedAtGameSeconds`.
- Remove `completed`.
- Add `bindingId` to each runtime binding.
- Keep `active`, `tutorialId`, `primaryTargetId`, `bindings`, `attention`.
- Update default component accordingly.

**Interface**

- Existing systems/hooks continue to read `sys_world.tutorial`, but against the simplified shape.

### CHANGE `src/data/schemas/guidances.test.ts`

**Responsibility**

- Schema unit coverage for the new guidance model.

**Logic**

- Replace tests for condition-bearing guidances with tests for:
    - node callout with authored target + single slot + attention mechanisms
    - screen callout with image/text + common attention
    - modal guidance + common attention
    - duplicate ids rejected

**Interface**

- Unit test only.

### CHANGE `src/data/schemas/tutorials.test.ts`

**Responsibility**

- Schema unit coverage for the concurrent tutorial model.

**Logic**

- Replace step-based tests with tests for:
    - tutorial self definition
    - concurrent guidance uses
    - enter/exit condition refs
    - duplicate ids rejected

**Interface**

- Unit test only.

### CHANGE `src/data/schemas/knowledge.test.ts`

**Responsibility**

- Schema unit coverage for codex entry model.

**Logic**

- Replace old `key/buttonLabel` expectations with new `id/label/description` entry shape.

**Interface**

- Unit test only.

### ADD coverage in `src/data/schemas/conditions.test.ts`

**Responsibility**

- Unit coverage for authored condition definitions.

**Logic**

- Add tests for:
    - condition definition parse
    - duplicate condition ids rejected
    - `tutorial_completed` accepted in `FactTypeSchema`

**Interface**

- Extend the existing conditions schema test file.

## 8.2 Runtime / game logic files

### CHANGE `src/game/tutorials/resolveConditionRefs.ts`

**Responsibility**

- Resolve condition definition ids to flattened `StructuredCondition[]`.

**Logic**

- Input map changes from `condition id -> StructuredCondition` to `condition id -> ConditionDefinition`.
- Output is the concatenation of all referenced definition `conditions` arrays in reference order.
- Missing ids are returned as missing, exactly as today.

**Interface**

- Keep file path to minimize churn.
- Update function signature and tests.

### CHANGE `src/game/tutorials/resolveTutorialBindings.ts`

**Responsibility**

- Resolve one tutorial definition into:
    - frozen primary target id
    - runtime guidance bindings

**Logic**

- Accept one tutorial definition, current snapshot, and guidance index.
- Resolve tutorial `selfDefinition`.
- For each tutorial guidance use:
    - load guidance
    - compute effective target from override-or-authored-target precedence
    - resolve effective target to one concrete entity id when required
    - freeze the resolved target id
    - construct deterministic `bindingId = <tutorialId>::<guidanceIndex>`
- Return either a fully resolved binding set or an explicit error string.
- Resolve `entity_tag` exactly the same way the current implementation does:
    - query by tag
    - sort ids lexicographically
    - take the first id

**Interface**

- Keep the filename.
- Replace the current step-based input shape with tutorial-level input.

### DELETE `src/game/tutorials/resolveTutorialStepConditions.ts`

**Responsibility retired**

- Step-scoped condition resolution is obsolete because tutorials no longer have steps and guidances no longer own conditions.

**Replacement**

- `HardTutorialSystem` resolves tutorial-level `enterConditionIds` and `exitConditionIds` through `resolveConditionRefs.ts` directly.

### DELETE `src/game/tutorials/resolveTutorialRetry.ts`

**Responsibility retired**

- Retry is intentionally removed.

### CHANGE `src/game/tutorials/resolveTutorialAttentionPlan.ts`

**Responsibility**

- Convert active tutorial guidance bindings into one runtime attention plan.

**Logic**

- Consume guidance definitions plus resolved bindings.
- Translate common mechanisms for all guidance subtypes:
    - `stop_time`
    - `hide_time_controls`
    - `hide_notifications`
- Translate node-only mechanisms only for `node_callout` and only when a target is present:
    - `hide_all_but_self`
    - `show_attention_effect_on_self`
- Deduplicate arrays while preserving tutorial guidance order.
- Set `cameraFocusEntityId` to the first focused entity, if any.

**Interface**

- Input no longer references `attentionPreset`.
- Output shape remains `ResolvedTutorialAttentionPlan`.

### CHANGE `src/game/tutorials/tutorialStateUtils.ts`

**Responsibility**

- Read/write the runtime tutorial component in its new shape.

**Logic**

- Update defaults and accessors to the simplified component state.

**Interface**

- `getTutorialComponent` and `setTutorialComponent` stay exported.

### CHANGE `src/game/systems/HardTutorialSystem.ts`

**Responsibility**

- Own hard-tutorial runtime orchestration.

**Logic**

- Remove all step logic.
- Remove retry logic.
- Remove `completed` short-circuit based on tutorial component.
- New behavior:
    1. read active tutorial component
    2. if active:
        - resolve the authored tutorial by `tutorialId`
        - if missing or invalid, log loudly, treat it as completed, and continue the same-tick selection pass
        - evaluate tutorial exit conditions against frozen tutorial `self`
        - on success, treat current tutorial as completed and continue the same-tick selection pass
    3. same-tick selection pass:
        - scan authored tutorials in array order
        - skip tutorials permanently completed in world facts
        - also skip tutorials completed earlier in the current tick selection pass
        - resolve tutorial enter conditions against tutorial `self`
        - activate the first eligible tutorial
    4. emit exactly one final `SET_TUTORIAL_STATE` command for the tick:
        - next tutorial active state if one was selected
        - otherwise cleared tutorial state
    5. emit permanent completion `ADJUST_FACT` commands for tutorials completed during the tick

This is the mechanism that buffers attention removal/add and prevents flicker.

**Interface**

- Constructor inputs remain getters for authored conditions/guidances/tutorials.
- Output remains command emission only.
- No new runtime command type is introduced.

### ADD `src/game/systems/HardTutorialSystem.test.ts`

**Responsibility**

- Integration coverage for tutorial orchestration.

**Logic**

- Use a real isolated world/runtime setup.
- Cover:
    - first eligible incomplete tutorial activates
    - tutorial completion writes permanent `tutorial_completed`
    - permanently completed tutorial does not reactivate
    - override target precedence over authored guidance target
    - auto self resolution to first effective target-bearing guidance
    - auto self fallback to `sys_world`
    - invalid tutorial logs loudly and clears or chains correctly
    - completion of tutorial A can activate tutorial B in the same system tick without emitting an intermediate cleared attention state

**Interface**

- Runtime integration test only.

### ADD `src/game/tutorials/resolveTutorialBindings.test.ts`

**Responsibility**

- Unit coverage for tutorial binding resolution.

**Logic**

- Cover:
    - entity id resolution
    - entity tag deterministic first-id resolution
    - override target precedence
    - auto self first-effective-target behavior
    - auto self `sys_world` fallback
    - target-bearing guidance failure when no target resolves

**Interface**

- Pure helper unit test.

### ADD `src/game/tutorials/resolveConditionRefs.test.ts`

**Responsibility**

- Unit coverage for condition-definition ref flattening.

**Logic**

- Cover:
    - referenced definitions flatten in order
    - missing ids are reported
    - empty refs return empty list

**Interface**

- Pure helper unit test.

### ADD `src/game/tutorials/resolveTutorialAttentionPlan.test.ts`

**Responsibility**

- Unit coverage for attention-plan merge logic.

**Logic**

- Cover:
    - no mechanisms => empty plan
    - common mechanisms from screen/modal/node merge identically
    - node-only mechanisms require node target
    - focus/ring arrays dedupe in authored order
    - camera focus chooses first focused entity

**Interface**

- Pure helper unit test.

## 8.3 Compiler / structured-condition support

### CHANGE `src/engine/compiler/conditions/compileStructuredConditions.ts`

**Responsibility**

- Compile structured conditions into logic rules.

**Logic**

- No new condition language is added.
- `tutorial_completed` is handled automatically as another fact-threshold fact type.
- `resolveStructuredFactAboutSuggestions` in the editor will provide tutorial ids when this fact type is chosen.

**Interface**

- No public API change.
- Add/update tests only where needed to assert tutorial-completion fact support.

## 8.4 Runtime UI / overlay files

### CHANGE `src/ui/runtime/tutorials/resolveRuntimeGuidances.ts`

**Responsibility**

- Convert active runtime tutorial component state into UI-readable active guidance views.

**Logic**

- Read the simplified tutorial component shape.
- Preserve binding order.
- Expose `bindingId` from runtime state.
- Do not synthesize ids from `guidance.id`.

**Interface**

- `RuntimeGuidanceView.binding` must now include `bindingId`.

### CHANGE `src/ui/runtime/tutorials/useActiveTutorialAttention.ts`

**Responsibility**

- Read the merged attention plan from the active runtime tutorial.

**Logic**

- No behavioral change beyond the updated runtime state shape.

**Interface**

- Return contract remains `attention | null`.

### CHANGE `src/ui/runtime/tutorials/RuntimeTutorialModal.tsx`

**Responsibility**

- Render the first active modal guidance.

**Logic**

- Keep first-modal-in-binding-order behavior.
- Continue to reuse `TutorialDisplay`.
- Use `textOverride` when present.
- Respect common attention mechanisms through the merged tutorial attention plan, not through modal-local logic.

**Interface**

- No external API change.

### ADD `src/ui/runtime/world/node-overlays/resolveGuidanceCalloutLayout.ts`

**Responsibility**

- Pure placement resolver for active guidance callouts.

**Logic**

- Accept:
    - viewport size
    - camera state
    - resolved runtime guidance views
- Resolve each callout in binding order.
- For node callouts:
    - start with authored primary slot
    - try deterministic slot fallback list
    - return first non-overlapping slot
    - if none fit, keep primary slot
- For screen callouts:
    - start with authored screen slot
    - try deterministic screen fallback list
    - if none fit, keep authored slot
- Only callout-vs-callout overlap is considered.
- Telemetry overlays are not part of guidance-callout collision.

**Interface**

- Pure helper returning positioned callout models for rendering.

### CHANGE `src/ui/runtime/world/node-overlays/useGuidanceCalloutModels.ts`

**Responsibility**

- Bridge runtime + camera + viewport data into positioned guidance callout models.

**Logic**

- Remove inline placement logic.
- Remove telemetry occupancy dependency.
- Delegate placement to `resolveGuidanceCalloutLayout.ts`.
- Use `bindingId` as model id.

**Interface**

- Signature no longer accepts telemetry occupancy input.
- Returns models keyed by `bindingId`.

### CHANGE `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

**Responsibility**

- Render node overlays and guidance callouts.

**Logic**

- Stop passing telemetry overlays into guidance-callout placement.
- Render `GuidanceCalloutCard` keyed by `bindingId`.

**Interface**

- No public API change.

### CHANGE `src/ui/runtime/world/node-overlays/GuidanceCalloutCard.tsx`

**Responsibility**

- Render guidance callout cards.

**Logic**

- Support optional `imageUrl` for node, screen, and modal-derived card content where applicable.
- Continue to show text.
- Keep this as presentation-only.

**Interface**

- Model prop expands to include optional `imageUrl` and `bindingId`.

### ADD `src/ui/runtime/world/node-overlays/resolveGuidanceCalloutLayout.test.ts`

**Responsibility**

- Unit coverage for callout placement logic.

**Logic**

- Cover:
    - node callout fallback when preferred slot collides
    - screen callout fallback
    - deterministic ordering
    - primary-slot fallback when all candidates collide

**Interface**

- Pure helper unit test.

### CHANGE `src/ui/runtime/world/node-overlays/NodeOverlayViewport.test.tsx`

**Responsibility**

- Smoke coverage for rendered guidance callouts.

**Logic**

- Add case proving duplicate guidance definitions used twice render two distinct cards because keys use `bindingId`.

**Interface**

- View smoke test only.

## 8.5 Devtools editor files

### CHANGE `src/ui/devtools/shell/window-manager/tabIds.ts`

**Responsibility**

- Generate tab ids for config editor routes.

**Logic**

- Add missing `conditions`, `guidances`, and `knowledge` kinds to `TabIdParams` and `makeTabId`.
- Do not rename route kinds.

**Interface**

- Existing route handlers continue to call `makeTabId`.
- This fixes the current no-op click bug in `.cave` System Config.

### CHANGE `src/ui/devtools/editors/file/SystemConfigEditor.tsx`

**Responsibility**

- Entry dashboard for config editors.

**Logic**

- Keep existing routes.
- Update card copy:
    - `Knowledge` label becomes `Codex`
    - Tutorials description reflects concurrent tutorial composition instead of steps/retry

**Interface**

- Route strings stay:
    - `conditions::${filename}`
    - `guidances::${filename}`
    - `tutorials::${filename}`
    - `knowledge::${filename}`

### CHANGE `src/ui/devtools/editors/config/conditions/ConditionsEditor.tsx`

**Responsibility**

- Author condition definitions.

**Logic**

- Replace direct `StructuredConditionsField` mount with a list of authored condition-definition rows.
- Reuse session store and `ComponentRow` pattern.

**Interface**

- Same route/component identity.
- New editor title remains `Conditions Editor`.

### ADD `src/ui/devtools/editors/config/conditions/ConditionDefinitionForm.tsx`

**Responsibility**

- Render one condition-definition row.

**Logic**

- Fields:
    - editable id
    - label
    - nested `StructuredConditionsField`
    - remove button
- Reuse `EditableTraitId` and `StructuredConditionsField`.

**Interface**

- Used only by `ConditionsEditor.tsx`.

### ADD `src/ui/devtools/editors/config/conditions/conditionEditorDefaults.ts`

**Responsibility**

- Create new default authored condition definitions.

**Logic**

- Default shape:
    - `id = condition_<n>`
    - `label = "New Condition"`
    - `conditions = []`

**Interface**

- Used by the conditions session hook.

### ADD `src/ui/devtools/editors/config/conditions/useConditionDefinitionsSession.ts`

**Responsibility**

- Session CRUD for authored condition definitions.

**Logic**

- Mirror the existing patterns used by `useGuidancesSession.ts` and `useTutorialsSession.ts`.
- Provide:
    - items
    - add
    - remove
    - rename

**Interface**

- Used only by `ConditionsEditor.tsx`.

### ADD `src/ui/devtools/editors/conditions/ConditionReferenceRow.tsx`

**Responsibility**

- One dropdown row for choosing a referenced authored condition id.

**Logic**

- Render a select/dropdown of authored condition ids.
- Include remove control.
- Include one tooltip on the field and one on remove.

**Interface**

- Used by `ConditionReferenceList.tsx`.

### ADD `src/ui/devtools/editors/conditions/ConditionReferenceList.tsx`

**Responsibility**

- Shared CRUD wrapper for condition-reference lists.

**Logic**

- Render list header, add button, and optional `Open Conditions Editor` button.
- Open Conditions Editor by calling the existing shell route flow for `conditions::${filename}`.
- Persist as string id array at the supplied draft path.

**Interface**

- Props:
    - `filename`
    - `path`
    - `label`
    - `openEditorButton?: boolean`

### CHANGE `src/ui/devtools/editors/conditions/structuredConditionAutocomplete.ts`

**Responsibility**

- Provide autocomplete suggestions for structured condition editor fields.

**Logic**

- Extend `resolveStructuredFactAboutSuggestions` so `factType = tutorial_completed` returns tutorial ids from the current draft plus linked workspace module.
- Keep existing blueprint/tag/world-state suggestions.

**Interface**

- Existing exports remain available.
- Reuse the same hooks in new tutorial/guidance/codex forms; do not duplicate blueprint/tag suggestion logic.

### CHANGE `src/ui/devtools/editors/config/guidances/guidanceEditorDefaults.ts`

**Responsibility**

- Default new guidance definitions.

**Logic**

- New default should be a simple `modal` guidance with title/text and no composition fields.
- Remove attention preset defaults and condition defaults.

**Interface**

- Same function export name may be kept.

### CHANGE `src/ui/devtools/editors/config/guidances/guidanceFieldSchemas.ts`

**Responsibility**

- Local editor schemas/constants for guidance fields.

**Logic**

- Remove attention preset enum.
- Add guidance attention mechanism enum.
- Add target kind enum.
- Keep screen-slot enum.
- Add node-slot enum as single-slot schema.

**Interface**

- Reused by `GuidanceForm.tsx`.

### CHANGE `src/ui/devtools/editors/config/guidances/GuidanceForm.tsx`

**Responsibility**

- Author one presentation-only guidance definition.

**Logic**

- Render subtype-specific form based on guidance presentation.
- Remove all condition fields.
- Render node target editor only for `node_callout`.
- Render attention mechanism CRUD for all subtypes:
    - common mechanisms for all
    - node-only mechanisms only for `node_callout`
- Render preview section under the form.
- Use `SmartTooltip` on every interactable control.

**Interface**

- Same parent usage from `GuidancesEditor.tsx`.

### ADD `src/ui/devtools/editors/config/guidances/GuidancePreview.tsx`

**Responsibility**

- Render the live runtime-context preview for one guidance draft.

**Logic**

- Build a preview runtime from the current module draft.
- Inject synthetic tutorial state with one binding.
- Tick preview runtime with `useLayoutEditorTicker`.
- Render via `LayoutWorldAdapter` + `LayoutRuntimeCanvas`.
- Show explicit empty-state when preview target is unresolved or unsupported.

**Interface**

- Used by `GuidanceForm.tsx` only.

### ADD `src/ui/devtools/editors/config/guidances/createGuidancePreviewRuntime.ts`

**Responsibility**

- Factory for editor-only guidance preview runtime.

**Logic**

- Reuse the preview-runtime pattern already used by blueprint visuals.
- Deep-clone the draft module.
- Apply preview system entities.
- Spawn deterministic preview entities for compileable visible blueprints.
- Seed `sys_world.tutorial` with one active guidance binding and merged attention plan.
- Return a disposable runtime instance.

**Interface**

- Called by `GuidancePreview.tsx`.

### CHANGE `src/ui/devtools/editors/config/guidances/GuidancesEditor.tsx`

**Responsibility**

- List and create guidances.

**Logic**

- No structural change beyond using the redesigned `GuidanceForm`.
- Editor title remains `Guidances Editor`.

**Interface**

- Same route/component identity.

### CHANGE `src/ui/devtools/editors/config/tutorials/tutorialEditorDefaults.ts`

**Responsibility**

- Default tutorial creation.

**Logic**

- Default tutorial shape:
    - `id`
    - `selfDefinition = auto`
    - `enterConditionIds = []`
    - `guidances = []`
    - `exitConditionIds = []`

**Interface**

- Same function export name may be kept.

### CHANGE `src/ui/devtools/editors/config/tutorials/tutorialFieldSchemas.ts`

**Responsibility**

- Local tutorial editor schemas/constants.

**Logic**

- Remove step/retry schemas.
- Add tutorial self-definition kind schema.
- Add override target kind schema.

**Interface**

- Reused by tutorial form/rows.

### CHANGE `src/ui/devtools/editors/config/tutorials/TutorialForm.tsx`

**Responsibility**

- Author one concurrent tutorial wrapper.

**Logic**

- Remove step rendering completely.
- New layout:
    - tutorial id
    - self-definition editor
    - enter conditions list
    - guidance-use list
    - exit conditions list
- Use `ConditionReferenceList` for enter/exit.
- Use `TutorialGuidanceRow` for guidance-use rows.

**Interface**

- Same parent usage from `TutorialsEditor.tsx`.

### ADD `src/ui/devtools/editors/config/tutorials/TutorialGuidanceRow.tsx`

**Responsibility**

- Render one concurrent tutorial guidance-use row.

**Logic**

- Fields:
    - guidance id selector
    - optional target override kind/value
    - optional text override
    - remove control
- No completion logic.
- No step semantics.

**Interface**

- Used by `TutorialForm.tsx`.

### ADD `src/ui/devtools/editors/config/tutorials/TutorialSelfDefinitionField.tsx`

**Responsibility**

- Render and explain tutorial `selfDefinition`.

**Logic**

- Modes:
    - auto
    - entity_tag
    - entity_id
- Display current auto-resolution summary beneath the control:
    - resolved first target-bearing guidance id/tag if any
    - otherwise `sys_world`

**Interface**

- Used by `TutorialForm.tsx`.

### DELETE `src/ui/devtools/editors/config/tutorials/TutorialStepForm.tsx`

**Responsibility retired**

- Step authoring is obsolete.

### DELETE `src/ui/devtools/editors/config/tutorials/TutorialGuidanceUseForm.tsx`

**Responsibility retired**

- Replaced by `TutorialGuidanceRow.tsx` for concurrent guidance-use authoring.

### CHANGE `src/ui/devtools/editors/config/tutorials/TutorialsEditor.tsx`

**Responsibility**

- List and create tutorial wrappers.

**Logic**

- No structural change beyond updated summary and updated `TutorialForm`.
- Summary should show count of concurrent guidance uses, not steps.

**Interface**

- Same route/component identity.

### CHANGE `src/ui/devtools/editors/config/tutorials/useTutorialsSession.ts`

**Responsibility**

- Session CRUD for redesigned tutorials.

**Logic**

- Keep add/remove/rename behavior.
- Remove any assumptions about `steps`.

**Interface**

- Same hook export.

### DELETE `src/ui/devtools/editors/config/tutorials/TutorialPreviewModal.tsx`

**Responsibility retired**

- It is based on obsolete tutorial fields and is not part of the redesigned editor.

### CHANGE `src/ui/devtools/editors/config/knowledge/KnowledgeEditor.tsx`

**Responsibility**

- Edit codex entries under the existing `knowledge` storage key.

**Logic**

- UI title becomes `Codex Editor`.
- Replace old `KnowledgeRow` shape with codex-entry form rows.
- Use `ConditionReferenceList` for unlock conditions.

**Interface**

- Route and storage key remain `knowledge`.

### CHANGE `src/ui/devtools/editors/config/knowledge/KnowledgeRow.tsx`

**Responsibility**

- Render one codex entry row.

**Logic**

- Replace old `key/guidanceId/buttonLabel/unlockConditionIds` form with:
    - id
    - label
    - description
    - guidance id
    - optional target override
    - optional text override
    - unlock conditions list
- Use `EditableTraitId` and `ConditionReferenceList`.

**Interface**

- Keep the file path to minimize routing/resolver churn.

### CHANGE `src/ui/devtools/editors/config/SystemConfigEditor.test.tsx`

### CHANGE `src/ui/devtools/editors/file/SystemConfigEditor.test.tsx`

**Responsibility**

- Keep smoke coverage for system-config cards and routes.

**Logic**

- Update expected card labels/copy where `Knowledge` becomes `Codex`.
- Add route assertions for the fixed config tab ids if not already present.

**Interface**

- View smoke tests only.

### CHANGE `src/ui/devtools/editors/config/tutorials/TutorialsEditor.test.tsx`

**Responsibility**

- Smoke coverage for redesigned Tutorials Editor.

**Logic**

- Replace add-step assertions with:
    - add tutorial
    - add/remove guidance row
    - change self definition
    - condition-list wiring

**Interface**

- View smoke test only.

### ADD `src/ui/devtools/editors/config/conditions/ConditionsEditor.test.tsx`

**Responsibility**

- Smoke coverage for the condition-definition editor.

**Logic**

- Cover add/remove condition definition and nested structured-condition authoring mount.

**Interface**

- View smoke test only.

### ADD `src/ui/devtools/editors/config/guidances/GuidancesEditor.test.tsx`

**Responsibility**

- Smoke coverage for redesigned Guidance Editor.

**Logic**

- Cover subtype switching, target fields appearing only for node callout, common attention appearing for all subtypes, and preview mount.

**Interface**

- View smoke test only.

### ADD `src/ui/devtools/editors/config/knowledge/KnowledgeEditor.test.tsx`

**Responsibility**

- Smoke coverage for Codex Editor.

**Logic**

- Cover add/remove codex entry and unlock-condition list wiring.

**Interface**

- View smoke test only.

## 8.6 Parser / persistence / adapter tests

### CHANGE `src/ui/devtools/state/moduleStore.io.tutorials.test.ts`

**Responsibility**

- Persistence coverage for `.cave` fragments containing the redesigned tutorial/guidance config.

**Logic**

- Replace step-based sample data with concurrent tutorial shape.
- Assert save/reload retains redesigned guidances/tutorials data.

**Interface**

- Integration test on module-store IO only.

### CHANGE `src/engine/terminal/commands/projectCartridgeAdapter.test.ts`

**Responsibility**

- Adapter coverage for guidance/tutorial/knowledge settings passthrough.

**Logic**

- Replace old sample data with redesigned `guidances`, `tutorials`, and `knowledge` shapes.
- Assert these survive conversion into module cartridge settings.

**Interface**

- Unit test on adapter only.

### CHANGE `src/ui/devtools/shell/window-manager/tabIdToVirtualPath.test.ts`

**Responsibility**

- Route/id coverage for config editors.

**Logic**

- Add or keep assertions that `conditions`, `guidances`, and `knowledge` tab ids round-trip correctly.

**Interface**

- Unit test only.

---

## 9. Migration plan

This redesign is a hard cut on authored data.

Rules:

- old tutorial data dies
- old guidance-local condition data dies
- old retry data dies
- old knowledge `key/buttonLabel` shape dies
- persistence **mechanism** remains, but old authored ids/data are not preserved

Migration steps:

1. land schema changes
2. land editor changes so new config can be authored
3. land runtime changes (`HardTutorialSystem`, bindings, attention, tutorial component shape)
4. land overlay/callout changes (`bindingId`, placement resolver)
5. update parser/persistence/adapter tests
6. remove obsolete tutorial-step files and retry helper

No compatibility bridge is added.

---

## 10. Validation and editor-prevention rules

These rules are mandatory.

### 10.1 Editor prevention

- node callout guidance cannot be saved without authored target kind/value and slot
- window callout guidance cannot show target and may only expose common attention mechanisms
- modal guidance cannot show target and may only expose common attention mechanisms
- condition-reference lists only offer authored condition ids that exist in the current draft
- guidance selectors only offer guidance ids that exist in the current draft

### 10.2 Compiler rejection

Compiler/schema validation must reject:

- duplicate condition ids
- duplicate guidance ids
- duplicate tutorial ids
- duplicate codex entry ids
- invalid target selector shapes
- invalid subtype/field combinations
- invalid attention mechanism for guidance subtype

### 10.3 Runtime loud error backstop

Runtime must loudly log and deterministically complete/clear or chain the active tutorial when:

- an active tutorial id does not exist in authored config
- a referenced guidance id is missing
- a referenced condition id is missing
- a required target cannot be resolved on activation
- a frozen target becomes invalid during an active tutorial

Silent failure is forbidden.

---

## 11. Testing plan

This plan follows the project testing contract.

### 11.1 Unit tests

Target: pure helpers and schema/compiler logic.

Required unit coverage:

- `src/data/schemas/*.test.ts` updates listed above
- `resolveConditionRefs.test.ts`
- `resolveTutorialBindings.test.ts`
- `resolveTutorialAttentionPlan.test.ts`
- `resolveGuidanceCalloutLayout.test.ts`
- `compileStructuredConditions.test.ts` updates if needed for `tutorial_completed`
- `structuredConditionAutocomplete` suggestion test updates if present or newly added

### 11.2 Integration tests

Target: runtime systems and persistence.

Required integration coverage:

- `HardTutorialSystem.test.ts`
- updated `moduleStore.io.tutorials.test.ts`
- updated `projectCartridgeAdapter.test.ts`

Integration tests must use real isolated worlds/runtime/module data, not mocked ECS worlds.

### 11.3 View/smoke tests

Target: editor components and overlay rendering.

Required smoke coverage:

- `ConditionsEditor.test.tsx`
- `GuidancesEditor.test.tsx`
- updated `TutorialsEditor.test.tsx`
- `KnowledgeEditor.test.tsx`
- updated `NodeOverlayViewport.test.tsx`
- updated system-config editor tests

No business logic assertions belong in these tests beyond wiring/presentation.

---

## 12. Final implementation constraints

1. Use the existing session-store/updateDraft/editor field/component patterns already present in `src3`.
2. Reuse `StructuredConditionsField`; do not build a second structured-condition editor.
3. Reuse the existing blueprint/tag suggestion hooks in `structuredConditionAutocomplete.ts`; do not duplicate that logic.
4. Reuse the existing preview-runtime pattern from blueprint visuals for guidance preview.
5. Keep route/storage keys `conditions`, `guidances`, `tutorials`, and `knowledge` to minimize churn.
6. Keep persistence through the existing permanent fact mechanism; do not add a second persistence store.
7. Do not preserve step/retry compatibility.
8. Do not add codex runtime UI.
9. Do not move business logic into `.tsx`.
10. Every invalid runtime state touched by this redesign must log loudly.

---

## 13. Deliverable summary

After implementation, `src3` will have:

- one reusable **Conditions Editor** for authored condition definitions
- one reusable **Guidances Editor** for presentation-only guidance definitions with preview
- one concurrent **Tutorials Editor** with self definition, condition references, and concurrent guidance composition
- one **Codex Editor** backed by `knowledge`, wrapping guidances plus unlock conditions
- one simplified hard tutorial runtime that activates one concurrent tutorial at a time and records completion permanently
- one flicker-free tutorial attention transition path when one tutorial completion immediately unlocks another
- one deterministic guidance-callout renderer keyed by runtime binding id
- no retry
- no step machine
- no guidance-local conditions

