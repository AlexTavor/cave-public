# LLD — Draft Guidance, `draft_opened`, and `draft_completed`

## 1. Purpose

This document specifies the exact low-level design for adding:

- a new guidance presentation: `draft_guidance`
- a run-scoped fact emitted when a draft opens: `draft_opened`
- a run-scoped fact emitted when a draft completes successfully: `draft_completed`

This design is grounded in the current codebase and is constrained by the existing runtime, tutorial, draft, and editor architecture.

This document is intentionally narrow. It does not redesign draft generation, tutorial sequencing, or the general guidance system beyond the minimum required to support draft tutorials correctly.

## 2. Why this change is necessary

### 2.1 Current tutorial system cannot express draft-specific enforcement

The authored tutorial system currently supports three guidance presentations:

- `node_callout`
- `screen_callout`
- `modal`

These are sufficient for node targeting, screen messaging, and modal explanations, but they do not model a draft as a first-class interactive surface.

A draft tutorial needs behavior that the current guidance system does not express:

- it must activate when a draft is opened
- it must constrain selection to exactly one option
- it must complete only after the selected option has been processed and the draft closes cleanly

### 2.2 Current fact types cannot express draft lifecycle

Structured conditions already support fact-threshold checks, but the fact type enum does not contain draft lifecycle events.

Without draft facts, there is no authored condition path for:

- “start this tutorial when pool `X` opens a draft”
- “end this tutorial when option `Y` completes”

### 2.3 Current runtime order makes the exact emission point important

The game currently registers systems in this order:

1. `FactsSystem`
2. `HardTutorialSystem`
3. gameplay systems
4. `DraftSystem`

Because of that order:

- draft-open facts must be emitted from the command handler that creates the draft so the tutorial can activate in the same tick
- draft-complete facts must be emitted from `DraftSystem`, not from `ResolveDraftHandler`, so the tutorial completes only after draft payload execution and draft clearing are already scheduled

That sequencing is required to keep tutorial state aligned with real runtime state.

## 3. Non-goals

This task does **not** include:

- changes to weighted-random draft generation logic
- tutorial forcing of draft options inside the tutorial system
- new runtime command types
- a new draft component field for tutorial restriction state
- screen-layer or modal-layer refactors unrelated to draft guidance
- global tooltip retrofits outside the touched editor controls for this feature

The draft generator remains the source of truth for what options appear. The tutorial system only constrains what can be selected **after** the draft is open.

## 4. Design summary

### 4.1 New authored guidance type

Add a new guidance presentation named `draft_guidance`.

Its authored contract is:

- `id`: string
- `presentation`: `draft_guidance`
- `attention`: array of general attention mechanisms already allowed for non-node guidance
- `targetOptionId`: string

It does **not** carry:

- `text`
- `title`
- `imageUrl`
- `target`
- `slot`
- `screenSlot`

### 4.2 New runtime tutorial binding field

Extend tutorial bindings with a frozen `targetOptionId` field.

Binding contract after this change:

- `bindingId`: string
- `guidanceId`: string
- `targetId`: string or null
- `targetOptionId`: string or null
- `textOverride`: string or null

Rules:

- `targetId` is used only for entity-targeted guidance flows
- `targetOptionId` is used only for `draft_guidance`
- for non-draft guidance, `targetOptionId` is always null
- for `draft_guidance`, `targetId` is always null

This keeps runtime state deterministic and self-contained. Neither the command handler nor the runtime draft UI needs to re-interpret authored guidance definitions after activation.

### 4.3 New fact types

Add two new fact types:

- `draft_opened`
- `draft_completed`

Semantics:

- `draft_opened` is emitted when a draft is successfully created and attached to `sys_world`
- `draft_completed` is emitted when a selected draft option is valid, its payload is executed, and draft clearing is scheduled

Both are **run-scoped only** in this design.

They must **not** be mirrored into permanent facts.

### 4.4 Draft restriction behavior

When an active tutorial binding contains a non-null `targetOptionId`:

- the draft UI disables every option whose `id` does not match that `targetOptionId`
- the authoritative runtime command handler rejects any non-target selection

This is a hard tutorial restriction, not a visual hint.

### 4.5 Missing-target failure mode

If a tutorial targets a `targetOptionId` that is not present in the currently open draft:

- the UI must not deadlock the player by disabling all options
- the UI must treat the draft as unrestricted
- the command handler must log loudly and fall back to normal draft resolution rules

This preserves recoverability while still surfacing the authored/runtime mismatch.

## 5. Contract-level invariants

These are mandatory.

### 5.1 Guidance invariants

- A `draft_guidance` must contain exactly one `targetOptionId`
- A `draft_guidance` must not contain text fields or target fields
- Attention items `hide_all_but_self` and `show_attention_effect_on_self` remain invalid for all non-node guidance, including `draft_guidance`

### 5.2 Tutorial binding invariants

- A tutorial may have **at most one** active `draft_guidance` binding
- A `draft_guidance` tutorial use must not use `textOverride`
- A `draft_guidance` tutorial use must not use `targetOverride`
- `draft_guidance` must not contribute to `primaryTargetId`
- if a tutorial resolves only draft guidance and no entity target, `selfId` resolves exactly as it does today: `sys_world` when `selfDefinition.kind === "auto"`

### 5.3 Fact invariants

- `draft_opened` uses `factAbout = poolId`
- `draft_completed` uses `factAbout = optionId`
- both are emitted through the existing `ADJUST_FACT` command pipeline
- both use `scope = run`
- neither fact is emitted on error paths

### 5.4 UI invariants

- the runtime UI does not own tutorial restriction state
- the runtime UI derives restriction state from `sys_world.tutorial.bindings`
- the runtime UI never mutates draft state directly
- the command handler remains authoritative for allowed selection

## 6. End-to-end behavior

### 6.1 Draft open path

When `TriggerDraftHandler` successfully creates a draft:

1. resolve pool and filter entries exactly as today
2. select options exactly as today
3. set the draft component on `sys_world`
4. enqueue `ADJUST_FACT` with:
   - `scope = run`
   - `factType = draft_opened`
   - `factAbout = poolId`
   - `delta = 1`

Result:

- the fact is applied in the same tick’s apply phase because it came from a command handler
- `HardTutorialSystem` sees it later in that same tick and may activate a tutorial immediately
- the draft is already active when the tutorial becomes active

### 6.2 Draft selection path

When the player clicks a draft option:

1. `ResolveDraftHandler` validates that a draft is active
2. it resolves the active tutorial target option from `sys_world.tutorial.bindings`
3. if no target option is active, selection logic behaves exactly as today
4. if a target option is active and present in the draft:
   - only that option is allowed
   - any other selected option is rejected with a loud error log
   - draft state is left unchanged
5. if a target option is active but missing from the draft:
   - log loudly
   - fall back to normal draft resolution
6. on valid selection:
   - preserve one-off bookkeeping exactly as today
   - set `draft.selectedOptionId`

No fact is emitted here.

### 6.3 Draft completion path

When `DraftSystem` sees a valid `selectedOptionId`:

1. resolve the selected option exactly as today
2. resolve the trigger entity exactly as today
3. execute payload actions exactly as today
4. enqueue `ADJUST_FACT` with:
   - `scope = run`
   - `factType = draft_completed`
   - `factAbout = option.id`
   - `delta = 1`
5. enqueue `CLEAR_DRAFT`

Result on the next tick:

- payload commands apply
- `draft_completed` fact applies
- `CLEAR_DRAFT` applies
- `HardTutorialSystem` then evaluates exit conditions against a world where the draft has already closed

This is the required “end the draft state cleanly” behavior.

## 7. File-by-file design

Only files listed below are in scope.

---

## 7.1 `src/data/schemas/conditions.ts`

### Responsibility

Authoritative schema and type source for structured condition fact types.

### Change

Extend `FactTypeSchema` with:

- `draft_opened`
- `draft_completed`

### Logic

No other condition kinds change.

### Interface contract

Structured condition authors may now target:

- `factType = draft_opened`, with `factAbout = <draft pool id>`
- `factType = draft_completed`, with `factAbout = <draft option id>`

---

## 7.2 `src/data/schemas/conditions.test.ts`

### Responsibility

Schema behavior test for authored condition definitions.

### Change

Add coverage proving that the new fact types parse successfully inside `fact_threshold` conditions.

### Logic

This test must verify parsing only. It does not verify runtime emission.

---

## 7.3 `src/data/schemas/guidances.ts`

### Responsibility

Authoritative schema and type source for authored guidance definitions.

### Change

Add a new discriminated union member:

- `presentation = draft_guidance`
- `targetOptionId: string`

Refactor the schema file so that only guidance variants that actually render text/image surfaces own those fields.

Required variant contracts after the change:

- `node_callout`: retains `text`, `target`, `slot`, `imageUrl`
- `screen_callout`: retains `text`, `screenSlot`, `imageUrl`
- `modal`: retains `title`, `text`, `imageUrl`
- `draft_guidance`: owns only `targetOptionId` plus shared `id` and `attention`

### Logic

Validation rules for invalid attention remain exactly aligned with current behavior:

- `hide_all_but_self` invalid for any non-node guidance
- `show_attention_effect_on_self` invalid for any non-node guidance

That includes `draft_guidance`.

### Interface contract

`draft_guidance` is a behavioral guidance, not a visual callout.

It must not expose orphaned visual fields in authored data.

---

## 7.4 `src/data/schemas/guidances.test.ts`

### Responsibility

Schema behavior test for authored guidance definitions.

### Change

Add tests that prove:

- `draft_guidance` parses with `targetOptionId`
- `draft_guidance` rejects extra subtype-invalid fields such as `text` or `target`
- `draft_guidance` rejects node-only attention items

---

## 7.5 `src/data/schemas/components/tutorial.ts`

### Responsibility

Authoritative schema and type source for the runtime tutorial component stored on `sys_world`.

### Change

Extend `TutorialGuidanceBindingSchema` with:

- `targetOptionId: string | null`

No change to the attention plan shape.

### Logic

Defaults and cloning behavior must continue to work exactly as they do today.

### Interface contract

Every runtime tutorial binding must now always carry both:

- `targetId`
- `targetOptionId`

with one or both set to null depending on presentation.

---

## 7.6 `src/game/tutorials/resolveTutorialBindings.ts`

### Responsibility

Resolve authored tutorial guidance uses into frozen runtime bindings.

### Change

Extend binding resolution logic to support `draft_guidance`.

### Logic

Required behavior:

1. For `draft_guidance`:
   - `targetOptionId` is copied from the authored guidance definition into the binding
   - `targetId` is forced to null
2. For all non-draft guidance:
   - existing target resolution stays unchanged
   - `targetOptionId` is null
3. `primaryTargetId` continues to be derived only from the first non-null `targetId`
4. `selfId` resolution remains unchanged
5. Invalid authored combinations must return an error, not guess:
   - missing guidance id
   - unresolved node target (existing behavior)
   - more than one `draft_guidance` binding in a single tutorial
   - `textOverride` provided for a `draft_guidance`
   - `targetOverride` provided for a `draft_guidance`

### Interface contract

This function remains the single point where authored tutorial uses become runtime-safe bindings.

No other system or UI layer is allowed to reinterpret draft guidance authoring rules.

---

## 7.7 `src/game/tutorials/resolveTutorialBindings.test.ts`

### Responsibility

Unit tests for binding resolution.

### Change

Add tests that prove:

- `draft_guidance` binds `targetOptionId` and leaves `targetId = null`
- auto self falls back to `sys_world` when the tutorial has only draft guidance
- multiple draft-guidance bindings reject the tutorial
- `textOverride` on `draft_guidance` rejects the tutorial
- `targetOverride` on `draft_guidance` rejects the tutorial

---

## 7.8 `src/game/tutorials/resolveTutorialAttentionPlan.ts`

### Responsibility

Merge resolved guidance attention into a runtime attention plan.

### Change

Type-level update only: this function must accept bindings that now also contain `targetOptionId`.

### Logic

Behavior stays unchanged.

`draft_guidance` contributes only shared non-node attention semantics and never contributes focus/ring/camera targeting.

### Interface contract

This function must remain presentation-agnostic except for the existing node-only rules.

---

## 7.9 `src/game/tutorials/resolveTutorialAttentionPlan.test.ts`

### Responsibility

Unit test for deterministic attention merging.

### Change

Add a case proving that `draft_guidance` does not create focus/ring side effects and still honors shared attention items.

---

## 7.10 `src/game/handlers/TriggerDraftHandler.ts`

### Responsibility

Command handler that materializes an authored draft into runtime state.

### Change

After successfully calling `setDraftComponent`, enqueue a run-scoped `draft_opened` fact.

### Logic

Required emission point:

- after the draft has been successfully attached to `sys_world`
- before returning from the handler

Required payload:

- `scope = run`
- `factType = draft_opened`
- `factAbout = command.payload.poolId`
- `delta = 1`

Do not emit the fact when:

- `sys_world` is missing
- the pool is missing
- the filtered draft is empty
- selection fails
- the handler exits through `onComplete` without opening a draft

### Interface contract

No new command type is introduced. This handler must use the existing `ADJUST_FACT` command path.

---

## 7.11 `src/game/handlers/ResolveDraftHandler.ts`

### Responsibility

Authoritative command handler for draft option selection.

### Change

Add tutorial-target enforcement based on the active tutorial binding stored on `sys_world`.

### Logic

Required algorithm:

1. read active draft exactly as today
2. read the active tutorial binding target option from `sys_world.tutorial.bindings`
3. if there is no active target option, keep current behavior
4. if there is one active target option and the current draft contains it:
   - reject any selected option id that does not match it
   - log loudly
   - leave draft state unchanged
5. if there is one active target option and the current draft does **not** contain it:
   - log loudly
   - continue with normal draft validation and selection
6. preserve one-off bookkeeping and `selectedOptionId` assignment exactly as today on valid selection

Do not emit `draft_completed` here.

### Interface contract

This handler is the authority on whether a selection is legal.

The UI may disable buttons for affordance, but the handler must not trust the UI.

---

## 7.12 `src/game/handlers/ResolveDraftHandler.test.ts`

### Responsibility

Unit tests for draft selection command handling.

### Change

Add a new test file.

### Required tests

- valid target option is accepted when guided
- non-target option is rejected when guided and draft remains active
- unguided selection still behaves exactly as today
- missing guided target logs loudly and falls back to normal selection rules

The tests must verify behavior, not internal helper calls.

---

## 7.13 `src/game/systems/DraftSystem.ts`

### Responsibility

Execute the selected draft option and schedule draft teardown.

### Change

After payload execution and before `CLEAR_DRAFT`, enqueue a run-scoped `draft_completed` fact.

### Logic

Required payload:

- `scope = run`
- `factType = draft_completed`
- `factAbout = selected option id`
- `delta = 1`

Emit this only on the successful path where:

- the selected option exists
- the trigger entity exists
- the payload loop executes

Do not emit it on missing option or missing trigger entity paths.

### Interface contract

This is the only place where a draft is considered “completed” for tutorial purposes.

---

## 7.14 `src/game/systems/DraftSystem.test.ts`

### Responsibility

Integration-style unit tests for draft execution.

### Change

Extend existing tests to prove:

- successful draft execution enqueues `draft_completed` and `CLEAR_DRAFT`
- missing trigger entity still only clears the draft and does not emit the fact
- missing selected option still only clears the draft and does not emit the fact

---

## 7.15 `src/ui/runtime/draft/DraftOverlay.tsx`

### Responsibility

Render the active draft modal and wire user selection to runtime commands.

### Change

Derive the active guided target option id from runtime tutorial state and disable all non-target cards when the target exists in the current draft.

### Logic

Required behavior:

- if no active draft guidance target exists, all options remain enabled
- if an active draft guidance target exists and is present in `draft.options`, only that option is enabled
- if an active draft guidance target exists but is absent from `draft.options`, all options remain enabled

The overlay must **not** own tutorial state.

It must consume a selector/hook that derives the active target from runtime state.

### Interface contract

`DraftOverlay` passes a `disabled` prop into each `DraftCard`.

It does not perform logging.

---

## 7.16 `src/ui/runtime/draft/DraftCard.tsx`

### Responsibility

Render a single selectable draft card.

### Change

Accept a `disabled` prop and forward it to the underlying `Button`-based `CardRoot`.

### Logic

When disabled:

- the card is visually disabled using existing `Button` behavior
- click dispatch is suppressed by the existing button implementation

No highlighting is added.

### Interface contract

New prop:

- `disabled: boolean`

No other prop shape changes.

---

## 7.17 `src/ui/runtime/draft/DraftCard.styles.ts`

### Responsibility

Visual styling for the draft card button.

### Change

No behavioral redesign.

Only adjust styles if needed to ensure disabled cards remain readable while clearly non-interactive.

### Logic

Use the existing `Button` disabled state as the primary mechanism.

No custom tutorial-only styling is required.

---

## 7.18 `src/ui/runtime/draft/DraftOverlay.test.tsx`

### Responsibility

View tests for draft modal rendering and interaction wiring.

### Change

Add tests that prove:

- with no active draft guidance, all cards are enabled
- with an active valid `targetOptionId`, exactly one card is enabled
- with an active invalid `targetOptionId`, all cards remain enabled

These tests must assert visible behavior only.

---

## 7.19 `src/ui/runtime/tutorials/useActiveDraftGuidanceTargetOptionId.ts`

### Responsibility

Single-purpose runtime selector for the currently active draft-guidance target option.

### Change

Add a new hook.

### Logic

The hook reads `sys_world.tutorial` via `useEntitySelector` and returns:

- the first non-null `binding.targetOptionId` when the tutorial is active
- null otherwise

This hook must not consult authored guidance definitions.

It relies entirely on frozen runtime bindings.

### Interface contract

Return type:

- `string | null`

This hook is read-only and presentation-safe.

---

## 7.20 `src/ui/runtime/tutorials/resolveRuntimeGuidances.ts`

### Responsibility

Resolve the runtime tutorial component plus authored guidance index into a list of runtime guidance views.

### Change

Update the binding type used by this module so it includes `targetOptionId`.

### Logic

No behavior change is required here beyond type completeness.

The returned views may include `draft_guidance`, but downstream visual systems decide whether to render them.

### Interface contract

This module remains a resolver, not a renderer.

---

## 7.21 `src/ui/runtime/world/node-overlays/resolveGuidanceCalloutLayout.ts`

### Responsibility

Convert runtime guidance views into placed node/screen callout models.

### Change

Explicitly ignore `draft_guidance`.

### Logic

Current behavior branches for:

- `modal`
- `screen_callout`
- node-targeted callouts

After the change, `draft_guidance` must exit early with no layout model.

This prevents accidental fallthrough into node layout logic.

### Interface contract

Only world/screen callouts are placeable by this module.

Draft guidance is not.

---

## 7.22 `src/ui/runtime/world/node-overlays/resolveGuidanceCalloutLayout.test.ts`

### Responsibility

Layout behavior test for guidance callout placement.

### Change

Add a test that proves `draft_guidance` produces no layout entries.

---

## 7.23 `src/ui/devtools/editors/conditions/structuredConditionAutocomplete.ts`

### Responsibility

Suggestion source for structured condition editors.

### Change

Extend this module with draft-aware suggestion sources.

Required new suggestion outputs:

- draft option ids from session draft + active cartridge
- draft pool ids from session draft + active cartridge

Required `factAbout` routing:

- `elapsed_real_seconds` → `world`
- `elapsed_game_seconds` → `world`
- `purge_began` → `world`
- `tutorial_completed` → tutorial ids
- `draft_opened` → draft pool ids
- `draft_completed` → draft option ids
- all other fact types → blueprint ids

### Logic

Suggestion arrays must be:

- unique
- alphabetically sorted
- safe when session data is absent

### Interface contract

This file remains the single source for condition-editor identifier suggestions.

---

## 7.24 `src/ui/devtools/editors/conditions/StructuredConditionFieldSets.tsx`

### Responsibility

Render the field sets for structured conditions.

### Change

Update fact-threshold field rendering so the `About` autocomplete reflects the new draft fact semantics.

### Logic

`FactThresholdFields` must now receive:

- blueprint ids
- tutorial ids
- draft option ids
- draft pool ids

and pass them into the suggestion resolver.

### Interface contract

The `About` field remains an `AutocompleteStringField`.

No raw text field is allowed here for the new identifiers.

---

## 7.25 `src/ui/devtools/editors/conditions/StructuredConditionRow.tsx`

### Responsibility

Render one structured condition row and choose the correct subtype field set.

### Change

Fetch the new draft pool and draft option suggestion lists and pass them into `FactThresholdFields`.

### Logic

This component remains a wiring layer only.

It must not own suggestion construction logic.

### Interface contract

Behavior for non-fact condition kinds remains unchanged.

---

## 7.26 `src/ui/devtools/editors/config/guidances/guidanceFieldSchemas.ts`

### Responsibility

Local field schemas and enums for the guidance editor.

### Change

Extend the presentation enum with `draft_guidance`.

Add a local schema for `targetOptionId` if needed for field typing.

### Logic

Existing presentation options remain unchanged.

### Interface contract

The guidance editor uses this file as the local field authority.

---

## 7.27 `src/ui/devtools/editors/config/guidances/GuidanceForm.tsx`

### Responsibility

Render the editable form for one guidance definition.

### Change

Make the form presentation-aware for the new `draft_guidance` subtype.

Required behavior:

- summary text for `draft_guidance` must show the selected option id, not “Empty”
- `Text` field must not render for `draft_guidance`
- `Title` field must not render for `draft_guidance`
- `Image URL` field must not render for `draft_guidance`
- subtype fields must render the `targetOptionId` autocomplete for `draft_guidance`

### Logic

This form must continue to use the existing editor flow:

- read draft state from `useSessionStore`
- normalize draft authoring via existing hooks where applicable
- render per-subtype fields through `GuidanceSubtypeFields`

### Interface contract

Only fields that are valid for the active presentation may be rendered.

---

## 7.28 `src/ui/devtools/editors/config/guidances/GuidanceSubtypeFields.tsx`

### Responsibility

Render presentation-specific guidance fields.

### Change

Add a `draft_guidance` branch.

Required controls for `draft_guidance`:

- `Target Option ID` as `AutocompleteStringField`

Suggestion source:

- all known draft option ids from the current session and active cartridge

### Logic

Existing branches remain unchanged:

- `node_callout` keeps target + slot fields
- `screen_callout` keeps screen slot
- `modal` keeps no subtype-specific controls here

### Interface contract

This component remains the only place that maps guidance presentation to subtype fields.

---

## 7.29 `src/ui/devtools/editors/config/guidances/createGuidancePreviewRuntime.ts`

### Responsibility

Build a preview runtime for guidance visualization in the editor.

### Change

Return no preview runtime for `draft_guidance`.

### Logic

`draft_guidance` has no standalone world/screen rendering surface.

It is only meaningful inside an active draft overlay.

### Interface contract

The editor must not attempt to fake a world preview for a draft-only behavioral guidance.

---

## 7.30 `src/ui/devtools/editors/config/guidances/GuidancesEditor.test.tsx`

### Responsibility

Smoke/integration tests for the guidance editor.

### Change

Add coverage proving:

- switching to `draft_guidance` shows `Target Option ID`
- `Text`, `Title`, and `Image URL` are absent for `draft_guidance`
- preview is unavailable or absent for `draft_guidance` as specified by the implementation contract

---

## 7.31 `src/ui/devtools/editors/config/tutorials/TutorialGuidanceRow.tsx`

### Responsibility

Render one tutorial guidance-use row.

### Change

Make this row guidance-presentation-aware.

Required behavior:

- when the selected guidance id points to a `draft_guidance` definition:
  - hide `Text Override`
  - hide the target-override toggle and any target-override fields
- when the selected guidance id points to any non-draft guidance:
  - preserve current behavior

### Logic

This component already has access to authored guidance definitions from session draft state.

Use that source of truth instead of duplicating lookup logic elsewhere.

### Interface contract

The tutorial-use editor must never expose controls that are invalid for the selected guidance presentation.

---

## 7.32 `src/ui/devtools/editors/config/tutorials/useNormalizeTutorialGuidanceDraft.ts`

### Responsibility

Normalize tutorial-guidance draft authoring state.

### Change

Extend normalization so that when the selected guidance is `draft_guidance`, stale invalid fields are removed from the tutorial-use draft object:

- `textOverride`
- `targetOverride`

### Logic

This prevents hidden-but-still-authored invalid state.

The existing target-override normalization remains unchanged for non-draft guidance.

### Interface contract

Normalization must be idempotent.

It must not mutate unrelated fields.

---

## 7.33 `src/ui/devtools/editors/config/tutorials/TutorialGuidanceRow.test.tsx`

### Responsibility

View test for tutorial-guidance row behavior.

### Change

Add tests that prove:

- selecting a `draft_guidance` hides `Text Override`
- selecting a `draft_guidance` hides target-override controls
- stale `textOverride` and `targetOverride` are normalized away when the guidance becomes `draft_guidance`

---

## 7.34 Editor tooltip contract for all touched controls

This work must use `SmartTooltip` for every **new or modified interactive control** in the touched editor files above.

This requirement is intentionally scoped to the feature diff so the implementation does not expand into unrelated editor retrofits.

### Required tooltip coverage

#### In the guidance editor

- `Presentation`
- `Target Kind`
- `Target Tag`
- `Target ID`
- `Node Slot`
- `Screen Slot`
- `Target Option ID`
- `Text`
- `Title`
- `Image URL`
- `+ Add Guidance`
- `+ Add Attention`
- `Remove Attention`

#### In the tutorial guidance-use row

- `Guidance ID`
- `+ New Guidance`
- `Text Override` when shown
- `Enable/Disable Target Override` when shown
- `Target Override Kind` when shown
- `Target Override Tag` when shown
- `Target Override ID` when shown
- `Remove Guidance`

#### In the structured condition row and field sets touched by this feature

- `Kind`
- `Scope`
- `Fact Type`
- `About`
- `Operator`
- `Value`
- `Reset Kind Shape`
- `Remove Condition`

### Tooltip semantics

Tooltips must describe either:

- what the control edits
- where autocomplete suggestions come from
- or what effect the control has on authored runtime behavior

Tooltips must not restate the label with no information.

## 8. Exact editor autocomplete contract

### 8.1 Guidance editor

`draft_guidance.targetOptionId` must use `AutocompleteStringField`.

Suggestion source:

- keys of `sessions[filename].draft.draftOptions`
- merged with keys of `workspaceService.activeCartridge?.draftOptions`
- unique
- sorted

### 8.2 Conditions editor

For `fact_threshold.factAbout`, autocomplete must behave exactly as follows:

- `draft_opened` → draft pool ids
- `draft_completed` → draft option ids
- `tutorial_completed` → tutorial ids
- world-level time/purge facts → `world`
- all remaining fact types → blueprint ids

No free-text downgrade is allowed for these new draft fact types.

## 9. Error handling contract

All illegal states must log loudly and must not silently trap the player.

### 9.1 ResolveDraftHandler errors

Must log when:

- guided selection chooses a non-target option
- guided target option is absent from the active draft

Behavior:

- wrong guided selection → reject and keep draft unchanged
- missing guided target → log and fall back to normal selection rules

### 9.2 Tutorial resolution errors

Must return binding-resolution errors when:

- more than one `draft_guidance` binding exists in one tutorial
- `textOverride` is authored for `draft_guidance`
- `targetOverride` is authored for `draft_guidance`

### 9.3 UI behavior on invalid authored/runtime combinations

The UI must never create a deadlocked draft where every option is disabled.

If the guided target option is not present in the current draft, the UI must behave as unrestricted.

## 10. Tests required for completion

The implementation is not complete until all tests below are added or updated and green.

### 10.1 Schema tests

- `src/data/schemas/conditions.test.ts`
- `src/data/schemas/guidances.test.ts`

### 10.2 Tutorial resolution tests

- `src/game/tutorials/resolveTutorialBindings.test.ts`
- `src/game/tutorials/resolveTutorialAttentionPlan.test.ts`

### 10.3 Draft runtime tests

- `src/game/handlers/ResolveDraftHandler.test.ts` (new)
- `src/game/systems/DraftSystem.test.ts`
- `src/game/handlers/TriggerDraftHandler...` test file updated or new focused fact test

### 10.4 Runtime UI tests

- `src/ui/runtime/draft/DraftOverlay.test.tsx`
- `src/ui/runtime/world/node-overlays/resolveGuidanceCalloutLayout.test.ts`

### 10.5 Editor tests

- `src/ui/devtools/editors/config/guidances/GuidancesEditor.test.tsx`
- `src/ui/devtools/editors/config/tutorials/TutorialGuidanceRow.test.tsx`

## 11. Implementation order

The implementation order must be:

1. schema changes (`conditions`, `guidances`, tutorial binding component)
2. tutorial binding resolution
3. draft fact emission in runtime handler/system
4. draft selection restriction in handler
5. runtime UI consumption of `targetOptionId`
6. callout layout ignore branch
7. editor autocomplete + editor visibility rules + tooltip coverage
8. tests

This order keeps type breakage localized and ensures runtime correctness before editor polish.

## 12. Acceptance criteria

This feature is complete only when all of the following are true:

1. authored config can define `draft_guidance` with `targetOptionId`
2. tutorial bindings freeze `targetOptionId` at activation time
3. `draft_opened` is emitted on successful draft creation
4. `draft_completed` is emitted only after successful draft execution
5. a guided draft disables every non-target option in the runtime UI
6. the command handler rejects non-target option selection even if the UI is bypassed
7. invalid guided-target absence logs loudly and does not deadlock the player
8. condition editor autocompletes pool ids for `draft_opened`
9. condition editor autocompletes option ids for `draft_completed`
10. guidance editor autocompletes `targetOptionId`
11. touched editor controls expose `SmartTooltip` as specified above
12. all tests are green and behavior matches the contracts in this document

