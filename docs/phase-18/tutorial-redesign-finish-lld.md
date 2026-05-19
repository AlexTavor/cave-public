# Tutorial Redesign Finish LLD

## Status

This document is a **delta LLD** for finishing the tutorial redesign in the current codebase snapshot.

It is intentionally **not** a restatement of the approved redesign target.
It only covers the remaining work required to make the current implementation conform to the approved redesign and the project contract.

This document is grounded in direct inspection of the current source tree.
It does not propose speculative improvements, unrelated cleanup, or replacement patterns.

---

## 1. Governing constraints

This implementation must remain inside the existing project contract.

1. Runtime behavior must stay deterministic and phase-correct.
2. Silent failures are forbidden.
3. UI must remain presentation-only; business logic must not migrate into `.tsx` files.
4. Existing session-store, runtime, condition, and preview mechanisms must be reused where they already solve the problem.
5. Completion is not achieved by partial landing. The final implementation must include the required tests for the touched logic and UI surfaces.

This document therefore defines only the remaining changes required to satisfy:

- the approved tutorial redesign contract
- the context pack
- the prompt contract
- the testing standards

---

## 2. Current-state assessment

### 2.1 Already implemented and not to be redesigned again

The following redesign work is already present in the current codebase and must be treated as the baseline, not redone:

1. The authored schema model has already been migrated away from tutorial steps and retry at the top level.
   - `src/data/schemas/tutorials.ts`
   - `src/data/schemas/guidances.ts`
   - `src/data/schemas/knowledge.ts`
   - `src/data/schemas/conditions.ts`
   - `src/data/schemas/targetSpec.ts`

2. The Conditions editor has already been converted to authored condition definitions.
   - `src/ui/devtools/editors/config/conditions/ConditionsEditor.tsx`
   - `src/ui/devtools/editors/config/conditions/ConditionDefinitionForm.tsx`
   - `src/ui/devtools/editors/config/conditions/useConditionDefinitionsSession.ts`
   - `src/ui/devtools/editors/conditions/ConditionReferenceList.tsx`
   - `src/ui/devtools/editors/conditions/ConditionReferenceRow.tsx`

3. Guidance preview infrastructure already exists.
   - `src/ui/devtools/editors/config/guidances/GuidancePreview.tsx`
   - `src/ui/devtools/editors/config/guidances/createGuidancePreviewRuntime.ts`

4. The main route wiring for `conditions`, `guidances`, `tutorials`, and `knowledge` is already present.
   The remaining issue on the system-config dashboard is stale copy, not missing route support.

### 2.2 Remaining contract gaps

The remaining work is concentrated in five areas:

1. **Hard tutorial orchestration is not contract-correct.**
2. **Frozen tutorial self is not persisted, so frozen-self exit semantics cannot be guaranteed.**
3. **Guidance callout placement is still inline, incomplete, and uses the wrong collision model.**
4. **Several editor surfaces are partially redesigned but still expose obsolete or incomplete UX.**
5. **The test surface is incomplete and still contains stale contract assertions.**

---

## 3. Why the remaining changes are required

### 3.1 Hard tutorial orchestration still behaves like a moving selector, not a frozen active composition

The active tutorial is not treated as a frozen active composition.
The current system can re-scan and replace the active tutorial while that tutorial is still active.
That violates the redesign rule that an active hard tutorial must continue evaluating itself until it completes or fails deterministically.

### 3.2 Exit-condition evaluation is not using frozen tutorial self

The redesign contract requires enter and exit condition evaluation against tutorial `self`.
The current runtime does resolve `self` during binding resolution, but the active runtime tutorial component does not persist that resolved self.
As a result, exit evaluation is currently using `primaryTargetId`, which is not equivalent to tutorial self.

### 3.3 Invalid runtime composition does not always fail loudly and deterministically

Missing authored references and invalid activation state are still handled inconsistently.
Some cases are silently skipped during selection instead of being loudly logged and deterministically completed.
That violates the project law that silent failure is forbidden.

### 3.4 Callout placement still reflects transitional implementation, not the final contract

Node and screen callout placement is still partially inline and incomplete.
The current logic does not provide deterministic fallback ordering for node callouts, does not let screen callouts participate in the same collision pass, and still relies on the wrong occupancy model.

### 3.5 Editor and tests still expose pre-final redesign assumptions

Several editor files are structurally close to the target but still retain stale assumptions:

- tutorial auto-self summary is incomplete
- codex rows cannot author target override
- tutorial guidance rows cannot truly omit target override
- guidance editor still exposes subtype-inappropriate fields and uses a preview modal instead of an embedded preview section
- stale tests still assert the removed step/retry model

---

## 4. What must change

The remaining changes are mandatory.
The scope of this LLD is the exact set of files below.
No additional architectural refactor is in scope.

---

## 5. File-by-file implementation design

## 5.1 Runtime tutorial state and orchestration

### CHANGE `src/data/schemas/components/tutorial.ts`

**Responsibility**

Define the persisted runtime tutorial component stored on `sys_world`.

**Why this file must change**

The current runtime component stores `primaryTargetId` and bindings, but it does not store the resolved frozen tutorial self.
Because the active tutorial is evaluated in later ticks, frozen-self semantics cannot be enforced without persisting that resolved self id.

**Required logic**

Add one new persisted field:

- `selfId: string | null`

Rules:

1. `selfId` is the frozen resolved tutorial self for the active tutorial.
2. When no tutorial is active, `selfId` is `null`.
3. `primaryTargetId` remains unchanged and continues to mean “first target-bearing active guidance binding if any”.
4. `selfId` and `primaryTargetId` are intentionally distinct fields.

**Required interface**

The exported tutorial component type and default value must include:

- `selfId`
- updated `DEFAULT_TUTORIAL_COMPONENT`

No other field names are to be changed.

---

### CHANGE `src/game/tutorials/resolveTutorialBindings.ts`

**Responsibility**

Resolve one authored tutorial into one frozen runtime activation payload.

**Why this file must change**

This file already resolves bindings and tutorial self, but its output currently serves a runtime state shape that does not persist `selfId`.
It must become the single canonical source for frozen activation data.

**Required logic**

Keep the current responsibilities and preserve all existing correct behavior:

1. load guidance definitions by `guidanceId`
2. apply target override precedence over authored node target
3. resolve `entity_tag` by query, lexicographic sort, first id
4. freeze resolved target ids into runtime bindings
5. derive deterministic `bindingId = <tutorialId>::<guidanceIndex>`
6. resolve tutorial `selfDefinition`

Add or formalize the following output contract:

1. Return a success payload containing:
   - `bindings`
   - `primaryTargetId`
   - `selfId`
2. Return an explicit error result, never a partial success, when:
   - a referenced guidance id is missing
   - a node callout has no resolvable effective target
   - tutorial self cannot resolve
3. `auto` self resolution must use the first **effective** target-bearing guidance use, meaning:
   - target override if present
   - otherwise authored node guidance target
4. If no target-bearing effective guidance exists, `auto` must resolve to `sys_world`.

**Required interface**

Keep the existing filename and overall function role.
The success result must explicitly contain `selfId` and must remain the sole source used by tutorial activation.

---

### CHANGE `src/game/tutorials/tutorialStateUtils.ts`

**Responsibility**

Read and write the runtime tutorial component using the canonical shape.

**Why this file must change**

It must align utility accessors/defaulting with the new `selfId` field.

**Required logic**

1. Update any normalization/defaulting to preserve `selfId`.
2. Keep the file as a thin runtime-state helper.
3. Do not add orchestration logic here.

**Required interface**

Existing exports must remain available.
No behavioral policy belongs in this file.

---

### CHANGE `src/game/systems/hardTutorialSystemUtils.ts`

**Responsibility**

Provide pure orchestration helpers for `HardTutorialSystem`.

**Why this file must change**

The current helper behavior is the largest remaining runtime contract gap.
It currently:

- silently skips invalid activation candidates during selection
- evaluates exit conditions against `primaryTargetId` instead of frozen `selfId`
- does not encode same-tick completion overlay behavior clearly enough

**Required logic**

This file must be the pure helper layer for the final system behavior.
Its logic must be revised as follows.

#### `clearTutorialState`

Return a fully cleared tutorial state using the updated runtime component shape, including `selfId = null`.

#### `readPermanentTutorialCompletion`

Keep the current role.
No change in meaning.

#### Selection helper behavior

Replace the current “find first eligible tutorial and silently skip invalid ones” behavior with explicit candidate evaluation.

For a candidate tutorial, helper logic must report one of these outcomes only:

- eligible activation payload
- not eligible
- invalid authored/runtime composition with explicit error message

A missing condition reference or invalid binding resolution must no longer be treated as a silent `false` case.
Those must surface as explicit invalid outcomes so the system can log loudly, mark the tutorial complete for the same tick, and continue scanning.

#### Exit-completion helper behavior

Exit completion must evaluate against:

- `active.selfId` when present
- never `active.primaryTargetId`

If `selfId` is missing while the tutorial is active, that is invalid active runtime state.
That case must be surfaced as invalid, not silently coerced.

#### Activation payload helper behavior

When building active tutorial state, the helper must produce:

- `active: true`
- `tutorialId`
- `selfId`
- `primaryTargetId`
- `bindings`
- `attention`

**Required interface**

Keep the file path and helper-oriented role.
The helpers must return explicit outcomes that let `HardTutorialSystem` perform same-tick completion chaining without duplicating low-level logic.

---

### CHANGE `src/game/tutorials/resolveTutorialAttentionPlan.ts`

**Responsibility**

Translate resolved active bindings and guidance definitions into the merged runtime attention plan.

**Why this file must change**

Most of the required behavior is already present, but the runtime backstop should match the subtype contract explicitly.
The runtime must not rely solely on schema/editor prevention for node-only attention semantics.

**Required logic**

Preserve the current correct behavior:

1. booleans merge by OR
2. focus and ring arrays dedupe while preserving authored order
3. `cameraFocusEntityId` becomes the first focused id

Tighten the following rules:

1. Common mechanisms must be honored on all subtypes.
2. Node-only mechanisms must only contribute when:
   - the guidance subtype is `node_callout`
   - and a concrete target id exists
3. The file must remain pure.

**Required interface**

Keep the current export and output shape.
No UI dependencies may be introduced.

---

### CHANGE `src/game/systems/HardTutorialSystem.ts`

**Responsibility**

Own the hard tutorial runtime orchestration for one tick.

**Why this file must change**

This file currently violates the redesign contract in four ways:

1. it can replace the active tutorial by re-running global selection even when the active tutorial is still active
2. it does not loudly handle a missing authored active tutorial id
3. it clears after invalid activation instead of continuing the same-tick pass
4. it emits behavior that does not guarantee a single final committed tutorial state for chained completion

**Required logic**

The final system behavior must be exactly this.

### Tick algorithm

1. Build indices for authored tutorials, conditions, and guidances.
2. Read the active tutorial component from `sys_world`.
3. Maintain a local set of tutorial ids completed during this tick.
4. Maintain a local list of completion commands to emit this tick.
5. Determine whether an active tutorial exists.

### Active tutorial path

If a tutorial is active:

1. resolve the authored tutorial by `tutorialId`
2. if it does not exist:
   - log loudly
   - treat it as completed during this tick
3. otherwise validate the active runtime state
   - if `selfId` is missing, log loudly and treat it as completed during this tick
   - if any frozen node-target binding no longer resolves to an entity, log loudly and treat it as completed during this tick
4. if the active tutorial remains valid:
   - resolve exit conditions
   - if exit condition references are missing, log loudly and treat it as completed during this tick
   - if exit conditions evaluate true against frozen `selfId`, treat it as completed during this tick
5. if the active tutorial remains valid after all checks:
   - emit exactly one final `SET_TUTORIAL_STATE` command containing the unchanged active state for the tick
   - stop

### Same-tick reselection path

If there is no valid continuing active tutorial, start a same-tick selection pass:

1. scan tutorials in authored array order
2. skip any tutorial whose permanent completion fact is already present
3. skip any tutorial completed earlier in the current tick
4. for each remaining tutorial:
   - resolve bindings and self using `resolveTutorialBindings`
   - if this fails, log loudly, mark that tutorial completed for this tick, enqueue permanent completion for it, and continue scanning
   - resolve enter condition refs
   - if refs are missing, log loudly, mark that tutorial completed for this tick, enqueue permanent completion for it, and continue scanning
   - evaluate enter conditions against resolved `selfId`
   - if false, continue scanning
   - if true, select this tutorial immediately
5. after the scan:
   - if a tutorial was selected, emit one final `SET_TUTORIAL_STATE` command for that selected tutorial
   - otherwise emit one final cleared tutorial state
6. emit all permanent completion fact commands accumulated during the tick

### Emission rule

This system must emit at most one `SET_TUTORIAL_STATE` command per tick.
That is the mechanism that prevents flicker between chained tutorials.

**Required interface**

Keep the current constructor signature and command-based output model.
Do not add a new runtime command type.

---

## 5.2 Runtime callout layout and rendering

### ADD `src/ui/runtime/world/node-overlays/resolveGuidanceCalloutLayout.ts`

**Responsibility**

Purely resolve active guidance callout placement for both node and screen callouts.

**Why this file must be added**

Placement logic is still embedded in `useGuidanceCalloutModels.ts` and is incomplete.
The redesign contract requires a single pure resolver with deterministic fallback behavior.

**Required logic**

This resolver must:

1. accept viewport dimensions, camera state, runtime, and resolved active runtime guidance views
2. process active non-modal guidance views in binding order
3. place node callouts using:
   - authored primary slot first
   - then a deterministic fallback order derived from that primary slot
   - first non-overlapping placement wins
   - if all candidates collide, keep the primary slot
4. place screen callouts using:
   - authored screen slot first
   - then the remaining screen slots in deterministic order
   - first non-overlapping placement wins
   - if all candidates collide, keep the authored slot
5. use **callout-vs-callout only** collision testing
6. ignore ambient telemetry overlay occupancy entirely
7. return positioned models that include:
   - `bindingId`
   - rendered text
   - optional imageUrl
   - positioned coordinates

**Required interface**

Expose one pure resolver function.
It must have no React dependencies and no side effects.

---

### CHANGE `src/ui/runtime/world/node-overlays/useGuidanceCalloutModels.ts`

**Responsibility**

Bridge runtime state, camera state, and viewport dimensions into positioned guidance callout models.

**Why this file must change**

It currently performs inline layout, only tries the authored node slot, and does not place screen callouts within the same collision pass.

**Required logic**

1. Keep the hook responsible for frame-based recomputation.
2. Remove all inline callout layout policy.
3. Delegate all placement decisions to `resolveGuidanceCalloutLayout.ts`.
4. Remove telemetry occupancy from the placement model.
5. Keep model ids keyed by runtime `bindingId`.

**Required interface**

Return positioned models for rendering.
The returned model shape must align with `GuidanceCalloutCard.tsx`.

---

### CHANGE `src/ui/runtime/world/node-overlays/GuidanceCalloutCard.tsx`

**Responsibility**

Render one positioned guidance callout card.

**Why this file must change**

The current card only supports text and uses a generic `id` field.
The redesign contract requires optional image rendering and runtime binding identity.

**Required logic**

1. Accept a model containing:
   - `bindingId`
   - `text`
   - `imageUrl`
   - positioned coordinates
2. Render text always.
3. Render the image only when `imageUrl` is non-null and non-empty.
4. Keep this component presentation-only.

**Required interface**

The component prop contract must change from a generic `id` model to a `bindingId`-based model.

---

### CHANGE `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

**Responsibility**

Render node overlays and active tutorial callouts.

**Why this file must change**

It currently keys guidance cards by a generic `id` field and depends on the old hook output shape.

**Required logic**

1. Keep existing overlay-card rendering behavior untouched.
2. Render guidance callout cards using the updated callout model shape.
3. Key guidance callouts by `bindingId`.
4. Do not add placement logic here.

**Required interface**

No public API change.
This remains a presentation container.

---

## 5.3 Structured-condition autocomplete plumbing

### CHANGE `src/ui/devtools/editors/conditions/StructuredConditionFieldSets.tsx`

**Responsibility**

Render subtype-specific structured-condition field groups.

**Why this file must change**

The autocomplete helper already supports `tutorial_completed`, but the field set does not pass tutorial ids into that helper.
The feature exists in utility code but is not wired to the editor.

**Required logic**

1. Extend the fact-threshold field-set props to include `tutorialIds`.
2. Pass both `blueprintIds` and `tutorialIds` into `resolveStructuredFactAboutSuggestions`.
3. Keep all other behavior unchanged.

**Required interface**

The field-set props must be expanded to include tutorial ids.
No condition-language change is allowed.

---

## 5.4 Guidance editor finish work

### CHANGE `src/ui/devtools/editors/config/guidances/GuidanceForm.tsx`

**Responsibility**

Render one authored guidance definition form.

**Why this file must change**

The current form is close to the target but still exposes stale or subtype-inappropriate UI:

- title is rendered for all guidance types
- preview is still a modal trigger instead of an embedded preview section
- the form composition still assumes a less strict subtype split than the redesign contract

**Required logic**

1. Keep the existing row/session wiring.
2. Move subtype-specific fields fully behind subtype-specific rendering.
3. Render the shared fields only when they are truly shared.
4. Embed the preview section directly in the form body.
5. Remove the modal-trigger preview pattern from this form.
6. Keep all business logic outside `.tsx` files except presentation branching that is already appropriate for the form surface.

**Required interface**

This file remains the parent guidance form used by `GuidancesEditor.tsx`.
It must render:

- id
- presentation selector
- subtype-specific fields
- shared fields that actually apply
- attention controls valid for the subtype
- embedded preview section

---

### CHANGE `src/ui/devtools/editors/config/guidances/GuidanceSubtypeFields.tsx`

**Responsibility**

Render subtype-specific authored guidance fields.

**Why this file must change**

It must become the single place where target and slot field visibility is enforced for the guidance subtypes.

**Required logic**

#### `node_callout`

Render:

- target kind
- target tag or target id inputs as appropriate
- node slot

#### `screen_callout`

Render:

- screen slot only

#### `modal`

Render:

- no target fields
- no slot fields

This file must not render shared text/title/image fields.
Those remain owned by the parent form where applicable.

**Required interface**

Keep the file path and subtype-field role.
The prop contract may remain local to the guidance editor.

---

### DELETE `src/ui/devtools/editors/config/guidances/GuidancePreviewModal.tsx`

**Responsibility retired**

Preview playback as a modal launcher is obsolete.
The approved redesign requires an embedded preview section inside the guidance form.

**Removal rule**

Delete this file after `GuidanceForm.tsx` no longer references it.

---

### ADD `src/ui/devtools/editors/config/guidances/GuidancesEditor.test.tsx`

**Responsibility**

Provide smoke coverage for the finished Guidance editor surface.

**Required logic**

Cover:

1. subtype switching
2. node-only target fields appearing only for node callouts
3. screen callout not exposing target fields
4. modal not exposing target fields
5. embedded preview rendering mount

**Required interface**

This is a UI smoke test only.
No business logic assertions belong here.

---

## 5.5 Tutorial editor finish work

### CHANGE `src/ui/devtools/editors/config/tutorials/TutorialForm.tsx`

**Responsibility**

Render one concurrent tutorial wrapper form.

**Why this file must change**

The form already uses the redesigned concurrent shape, but its `auto` summary is incorrect.
It currently only looks at `targetOverride`, not at the first effective target-bearing guidance after applying override-or-authored-target precedence.

**Required logic**

1. Keep the current top-level form layout.
2. Compute `autoSummary` from the first **effective** target-bearing guidance use in array order:
   - if the row has a target override, summarize that override
   - else load the referenced guidance definition
   - if that guidance is a node callout, summarize its authored target
   - else continue scanning
   - if nothing target-bearing is found, summarize `sys_world`
3. Do not resolve to a concrete entity id in the editor.
   The summary is authored-target descriptive only.

**Required interface**

Keep the existing component role and prop contract.
The output passed into `TutorialSelfDefinitionField` must reflect the new summary logic.

---

### CHANGE `src/ui/devtools/editors/config/tutorials/TutorialGuidanceRow.tsx`

**Responsibility**

Render one tutorial guidance-use row.

**Why this file must change**

The current row always binds fields under `targetOverride.*` and therefore does not provide a true optional override state.
That does not match the authored contract, where target override is optional.

**Required logic**

1. Keep guidance selection and text override behavior.
2. Add an explicit optional override mode.
3. Only render and persist `targetOverride` fields when override mode is enabled.
4. When override mode is disabled:
   - the row must persist no `targetOverride` object
   - not an empty object
   - not a coerced default object
5. Keep the existing “create new guidance and open editor” flow.

**Required interface**

The row remains responsible for one authored guidance-use row.
Its persisted output must allow:

- no `targetOverride`
- or a valid `EntityTargetSpec`

No third state is allowed.

---

### CHANGE `src/ui/devtools/editors/config/tutorials/useNormalizeTutorialGuidanceDraft.ts`

**Responsibility**

Normalize the optional tutorial guidance target override draft shape.

**Why this file must change**

The current normalizer coerces any present override into a concrete tag/id structure and therefore works against the required optional override semantics.

**Required logic**

1. Preserve the absence of `targetOverride`.
2. Normalize only when override mode is enabled and an override object is intended to exist.
3. Never synthesize `targetOverride` just because nested override fields were touched previously.
4. Keep this hook narrow and form-supporting only.

**Required interface**

Keep the file path and hook role.
It must support the row contract defined above.

---

### CHANGE `src/ui/devtools/editors/config/tutorials/TutorialsEditor.test.tsx`

**Responsibility**

Provide smoke coverage for the finished Tutorials editor surface.

**Required logic**

Update the tests so they cover:

1. adding a tutorial
2. adding and removing a concurrent guidance row
3. changing self definition mode
4. correct condition-list wiring
5. optional target override behavior on a guidance row

Do not leave any assertions that imply tutorial steps or retry.

**Required interface**

UI smoke coverage only.

---

### DELETE `src/ui/devtools/editors/config/tutorials/TutorialPreviewModal.tsx`

**Responsibility retired**

This file belongs to the obsolete tutorial preview model.
It is not part of the final redesigned tutorial editor flow.

**Removal rule**

Delete it once no remaining editor code imports it.

---

## 5.6 Codex editor finish work

### CHANGE `src/ui/devtools/editors/config/knowledge/KnowledgeEditor.tsx`

**Responsibility**

Render the codex editor surface over the existing `knowledge` storage key.

**Why this file must change**

The remaining issue here is editor naming and row completeness, not storage migration.

**Required logic**

1. Change the editor title from `Knowledge Editor` to `Codex Editor`.
2. Keep the existing storage path `config.settings.knowledge` unchanged.
3. Continue to use row-based editing.

**Required interface**

No storage key change.
UI copy only changes to `Codex` terminology.

---

### CHANGE `src/ui/devtools/editors/config/knowledge/KnowledgeRow.tsx`

**Responsibility**

Render one codex entry row.

**Why this file must change**

The row is missing target override authoring entirely.
That leaves the codex contract only partially implemented.

**Required logic**

Keep existing fields:

- id
- label
- guidance id
- description
- text override
- unlock conditions

Add the missing optional target override authoring:

1. explicit optional override mode
2. override kind selector
3. override tag or id field as appropriate
4. no persisted override object when override mode is disabled

**Required interface**

The row must persist either:

- no `targetOverride`
- or one valid `EntityTargetSpec`

The file path remains unchanged.

---

### ADD `src/ui/devtools/editors/config/knowledge/KnowledgeEditor.test.tsx`

**Responsibility**

Provide smoke coverage for the codex editor surface.

**Required logic**

Cover:

1. add and remove codex entry
2. guidance-id selection wiring
3. unlock-condition list wiring
4. optional target override authoring presence

**Required interface**

UI smoke coverage only.

---

## 5.7 System-config dashboard copy

### CHANGE `src/ui/devtools/editors/file/SystemConfigEditor.tsx`

**Responsibility**

Render the system-config dashboard cards.

**Why this file must change**

The route strings are already correct.
The remaining issue is stale terminology and stale tutorial description text.

**Required logic**

Update only the card copy:

1. `Knowledge` becomes `Codex`
2. Tutorials description must describe concurrent tutorial composition, not steps/retry

Do not change the route strings.

**Required interface**

Keep these route targets unchanged:

- `conditions::${filename}`
- `guidances::${filename}`
- `tutorials::${filename}`
- `knowledge::${filename}`

---

### CHANGE `src/ui/devtools/editors/file/SystemConfigEditor.test.tsx`

**Responsibility**

Smoke-test the system-config dashboard card surface.

**Required logic**

Update or extend assertions so the test covers:

1. `Codex` card label
2. `tutorials::${filename}` route opening still works
3. `knowledge::${filename}` route opening still works under the new visible label

**Required interface**

View smoke test only.

---

## 5.8 Schema hardening and schema tests

### CHANGE `src/data/schemas/targetSpec.ts`

**Responsibility**

Define the shared authored target selector schema.

**Why this file must change**

The current schema accepts the correct discriminated union, but the remaining schema layer should reject invalid extra-field combinations instead of silently tolerating them.

**Required logic**

Make the target selector object variants strict so that malformed authored target objects are rejected instead of silently stripped.

**Required interface**

Keep the existing exported schema and type names.

---

### CHANGE `src/data/schemas/guidances.ts`

**Responsibility**

Define authored guidance definitions.

**Why this file must change**

The current guidance shape is broadly correct, but the schema layer must reject invalid subtype/field combinations rather than silently stripping obsolete or irrelevant fields.

**Required logic**

1. Make subtype object variants strict.
2. Preserve duplicate-id validation.
3. Preserve existing attention-mechanism validation.
4. Ensure obsolete fields such as tutorial-condition fields are not silently tolerated.

**Required interface**

Keep the current exported names and discriminator values.

---

### CHANGE `src/data/schemas/tutorials.ts`

**Responsibility**

Define authored tutorial definitions.

**Why this file must change**

The file already encodes the concurrent model, but stale step/retry-shaped payloads must be rejected instead of being silently accepted through object stripping.

**Required logic**

1. Make the tutorial object schema strict.
2. Make `TutorialSelfDefinitionSchema` variants strict.
3. Make `TutorialGuidanceUseSchema` strict.
4. Preserve defaults and duplicate-id validation.
5. Ensure legacy `steps` and `retry` payloads are rejected.

**Required interface**

Keep the current exports.
Do not reintroduce any step or retry type.

---

### CHANGE `src/data/schemas/knowledge.ts`

**Responsibility**

Define authored codex entries.

**Why this file must change**

The current shape is broadly correct, but old knowledge-entry fields must be rejected instead of silently ignored.

**Required logic**

1. Make the entry object schema strict.
2. Preserve duplicate-id validation.
3. Preserve the current codex-aligned shape.

**Required interface**

Keep the current exports and storage meaning.

---

### CHANGE `src/data/schemas/tutorials.test.ts`

**Responsibility**

Unit coverage for the authored tutorial schema.

**Why this file must change**

It still asserts the removed step/retry model.
That is now a direct contract violation.

**Required logic**

Replace the test cases so they cover only the concurrent tutorial contract:

1. valid concurrent tutorial parse
2. duplicate tutorial id rejection
3. valid self definition variants
4. optional target override shape
5. rejection of legacy step/retry fields

**Required interface**

Unit test only.

---

### CHANGE `src/data/schemas/guidances.test.ts`

**Responsibility**

Unit coverage for the authored guidance schema.

**Required logic**

Ensure test coverage includes:

1. valid node callout shape
2. valid screen callout shape
3. valid modal shape
4. duplicate guidance id rejection
5. rejection of subtype-invalid extra fields
6. rejection of invalid subtype attention combinations

---

### CHANGE `src/data/schemas/knowledge.test.ts`

**Responsibility**

Unit coverage for the codex-entry schema.

**Required logic**

Ensure test coverage includes:

1. valid codex entry parse
2. duplicate id rejection
3. optional target override parse
4. rejection of legacy entry fields such as `key` and `buttonLabel`

---

### CHANGE `src/data/schemas/conditions.test.ts`

**Responsibility**

Unit coverage for authored condition definitions.

**Required logic**

Ensure this file covers:

1. valid condition-definition parse
2. duplicate condition id rejection
3. acceptance of `tutorial_completed` as a fact type

If these assertions already exist, only keep them aligned with the contract.

---

## 5.9 Runtime and persistence test completion

### ADD `src/game/systems/HardTutorialSystem.test.ts`

**Responsibility**

Integration coverage for hard tutorial orchestration.

**Required logic**

Use a real isolated runtime/world setup.
Cover at minimum:

1. first eligible incomplete tutorial activates
2. an active tutorial does not get replaced while still active
3. completion writes permanent `tutorial_completed`
4. permanently completed tutorials do not reactivate
5. active exit conditions are evaluated against frozen `selfId`
6. invalid active tutorial id logs loudly and the system chains or clears deterministically
7. invalid activation candidate logs loudly, records completion, and same-tick scanning continues
8. chained tutorial completion does not emit an intermediate cleared tutorial state
9. frozen target invalidation completes the tutorial loudly and deterministically

**Required interface**

Integration test only.
No mocked ECS world.

---

### ADD `src/game/tutorials/resolveTutorialBindings.test.ts`

**Responsibility**

Unit coverage for tutorial binding resolution.

**Required logic**

Cover:

1. entity-id target resolution
2. entity-tag first-id resolution
3. override target precedence
4. auto self from first effective target-bearing guidance
5. auto self fallback to `sys_world`
6. error on missing guidance
7. error on unresolved node target
8. error on unresolved explicit self definition

---

### ADD `src/game/tutorials/resolveConditionRefs.test.ts`

**Responsibility**

Unit coverage for authored condition reference flattening.

**Required logic**

Cover:

1. flattening in reference order
2. reporting missing ids
3. empty refs returning an empty resolved list

---

### ADD `src/game/tutorials/resolveTutorialAttentionPlan.test.ts`

**Responsibility**

Unit coverage for merged tutorial attention-plan resolution.

**Required logic**

Cover:

1. empty-plan behavior
2. common mechanism merge behavior
3. node-only mechanism gating by subtype and target presence
4. stable dedupe of focus ids
5. stable dedupe of ring ids
6. camera focus selecting the first focused entity

---

### ADD `src/ui/runtime/world/node-overlays/resolveGuidanceCalloutLayout.test.ts`

**Responsibility**

Unit coverage for pure guidance callout placement.

**Required logic**

Cover:

1. node callout fallback from preferred slot when colliding
2. screen callout fallback from preferred slot when colliding
3. authored-order deterministic placement
4. fallback exhaustion retaining authored primary slot
5. collision model being callout-vs-callout only

---

### CHANGE `src/ui/runtime/world/node-overlays/NodeOverlayViewport.test.tsx`

**Responsibility**

Smoke coverage for rendered guidance callouts inside the overlay viewport.

**Required logic**

Add coverage proving:

1. duplicate use of one guidance definition yields two rendered callouts when bindings have distinct `bindingId`s
2. runtime guidance callouts still render under the viewport alongside normal node overlays

---

### CHANGE `src/ui/devtools/state/moduleStore.io.tutorials.test.ts`

**Responsibility**

Persistence coverage for redesigned tutorial/guidance config in `.cave` fragments.

**Required logic**

The current sample data is already close to the target.
Keep it aligned with the final schema strictness and ensure save/reload still preserves:

- guidances
- tutorials
- concurrent guidance uses

No legacy step/retry sample data may remain.

---

### CHANGE `src/engine/terminal/commands/projectCartridgeAdapter.test.ts`

**Responsibility**

Adapter coverage for guidance/tutorial/knowledge passthrough into module settings.

**Required logic**

Keep the current test scope, but ensure the sample data matches the final strict schema and codex terminology.
Include target override fields where relevant once the final codex/tutorial row contracts are complete.

---

## 6. Implementation order

The landing order is fixed.
This prevents partial states and avoids test churn.

### Phase 1 — Runtime contract completion

1. `src/data/schemas/components/tutorial.ts`
2. `src/game/tutorials/resolveTutorialBindings.ts`
3. `src/game/tutorials/tutorialStateUtils.ts`
4. `src/game/systems/hardTutorialSystemUtils.ts`
5. `src/game/tutorials/resolveTutorialAttentionPlan.ts`
6. `src/game/systems/HardTutorialSystem.ts`

### Phase 2 — Callout layout contract completion

1. `src/ui/runtime/world/node-overlays/resolveGuidanceCalloutLayout.ts`
2. `src/ui/runtime/world/node-overlays/useGuidanceCalloutModels.ts`
3. `src/ui/runtime/world/node-overlays/GuidanceCalloutCard.tsx`
4. `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

### Phase 3 — Editor contract completion

1. `src/ui/devtools/editors/conditions/StructuredConditionFieldSets.tsx`
2. `src/ui/devtools/editors/config/guidances/GuidanceSubtypeFields.tsx`
3. `src/ui/devtools/editors/config/guidances/GuidanceForm.tsx`
4. delete `src/ui/devtools/editors/config/guidances/GuidancePreviewModal.tsx`
5. `src/ui/devtools/editors/config/tutorials/TutorialForm.tsx`
6. `src/ui/devtools/editors/config/tutorials/TutorialGuidanceRow.tsx`
7. `src/ui/devtools/editors/config/tutorials/useNormalizeTutorialGuidanceDraft.ts`
8. delete `src/ui/devtools/editors/config/tutorials/TutorialPreviewModal.tsx`
9. `src/ui/devtools/editors/config/knowledge/KnowledgeEditor.tsx`
10. `src/ui/devtools/editors/config/knowledge/KnowledgeRow.tsx`
11. `src/ui/devtools/editors/file/SystemConfigEditor.tsx`

### Phase 4 — Schema hardening

1. `src/data/schemas/targetSpec.ts`
2. `src/data/schemas/guidances.ts`
3. `src/data/schemas/tutorials.ts`
4. `src/data/schemas/knowledge.ts`

### Phase 5 — Tests

1. schema unit tests
2. pure-helper unit tests
3. runtime integration tests
4. UI smoke tests
5. persistence/adapter tests

No phase may be declared complete while its required tests are still absent.

---

## 7. Explicit non-goals

The following are out of scope for this finish pass:

1. player-facing codex runtime UI
2. a new condition language
3. a new persistence mechanism
4. generalized overlay refactors unrelated to tutorial callouts
5. route-system rewrites, because the relevant route wiring is already present
6. compatibility support for legacy tutorial steps or retry
7. unrelated tech-debt cleanup

---

## 8. Validation checklist

The implementation is complete only when all statements below are true.

### Runtime

- active tutorials remain active until completion or deterministic failure
- exit conditions are evaluated against frozen `selfId`
- missing authored tutorial/guidance/condition references log loudly
- invalid activation candidates are completed and same-tick scanning continues
- frozen target invalidation logs loudly and completes deterministically
- the system emits at most one final tutorial state per tick

### Overlay/UI runtime

- callout placement runs through one pure resolver
- node callouts use deterministic fallback order
- screen callouts participate in the same collision pass
- collisions are callout-vs-callout only
- rendered callouts are keyed by `bindingId`
- callouts support optional image rendering

### Editor

- `tutorial_completed` autocomplete suggestions are wired through the editor
- guidance form only exposes fields valid for the current subtype
- guidance preview is embedded, not modal-launched
- tutorial auto-self summary reflects the first effective target-bearing guidance
- tutorial guidance rows support truly optional target override
- codex rows support truly optional target override
- system-config dashboard uses `Codex` terminology and non-step tutorial copy

### Schemas

- legacy step/retry payloads are rejected
- invalid subtype/field combinations are rejected
- duplicate ids are rejected at the definition level

### Tests

- all required unit tests exist
- all required integration tests exist
- all required smoke tests exist
- stale step/retry assertions are removed

---

## 9. Test design requirements

The tests for this work must follow the project testing standard.

### Unit tests

Target:

- schema validation
- pure helper functions
- placement resolver
- attention merge logic

Rules:

1. no DOM dependency
2. Given-When-Then structure
3. explicit happy path, negative path, and edge cases

### Integration tests

Target:

- `HardTutorialSystem`
- persistence/adapters

Rules:

1. use a real isolated world/runtime setup
2. do not mock the ECS world
3. assert world-state consequences and command effects, not implementation trivia

### View smoke tests

Target:

- devtools editors
- overlay viewport rendering
- system-config dashboard

Rules:

1. verify render safety, visible fields, and wiring
2. do not assert business logic that belongs in runtime/helpers

---

## 10. Deliverable summary

After the changes in this document are implemented, the codebase will satisfy the remaining tutorial-redesign finish criteria:

1. hard tutorial orchestration will be frozen, loud, and same-tick chain-safe
2. tutorial exit conditions will use frozen tutorial self
3. guidance callout placement will be pure, deterministic, and contract-correct
4. guidance, tutorial, and codex editors will match the authored contract without stale step-era UI
5. schema and test coverage will reject the removed legacy model and verify the final redesign behavior
