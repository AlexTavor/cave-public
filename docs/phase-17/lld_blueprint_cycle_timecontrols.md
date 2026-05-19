# Low-Level Design: Manifest Blueprint References, Cycle Throttle Visibility, and Time Controls Tutorial

## Document purpose
This document is the implementation contract for three changes:
1. make all manifest-linked blueprints available to editor autocomplete and validation,
2. add a `Show Throttle Slider` toggle to Cycle Ability,
3. add a time-controls tutorial that follows the existing throttle tutorial pattern.

This document is written for an implementation agent. It is intentionally explicit, file-scoped, and non-ambiguous. It contains no code.

---

## 1. Scope

### In scope
1. Editor blueprint-reference autocomplete and validation must resolve against the loaded project, not just the current file.
2. Cycle Ability must expose a checkbox controlling throttle slider visibility, default `true`.
3. A new time-controls tutorial must:
   - appear once `explore` is present,
   - disappear when the time scale changes,
   - remain visible when only play/pause changes,
   - use `time-controls-tutorial.gif` from the same tutorial asset location pattern as `throttle-tutorial.gif`.

### Out of scope
1. No linker redesign.
2. No compiler validation rule redesign.
3. No generic tutorial framework beyond what is required to support a second tutorial.
4. No UI-only state for runtime-visible behavior.
5. No unrelated editor, runtime, or notification refactors.

---

## 2. Problem statement

### Change A: manifest blueprint references are not available editor-side
The editor currently validates and autocompletes blueprint references from the current file session only. As a result, a blueprint reference to another manifest-listed file can be valid at the project level but still fail in-editor.

Required result:
- when a project is loaded from `manifest.json`, any blueprint defined anywhere in that manifest-linked project must be available to editor reference pickers and reference validation.

### Change B: Cycle Ability needs control over throttle slider visibility
The runtime job card renders a throttle slider from runtime state. There is currently no explicit Cycle Ability control for whether that slider should be shown.

Required result:
- Cycle Ability gains a boolean `showThrottleSlider`, default `true`, and the runtime UI must respect it.

### Change C: add a time-controls tutorial
The product already has a throttle tutorial pattern. The new tutorial must behave the same way structurally, but its completion condition is different.

Required result:
- a second tutorial exists for time controls,
- it appears after `explore` exists,
- it is marked complete only when the time scale actually changes,
- it is not completed by play/pause.

---

## 3. Architectural decisions

### Decision 1: use the loaded project cartridge as the authoritative cross-file symbol source
The workspace already loads and links the project from `manifest.json`. The editor must reuse that linked project symbol set instead of rebuilding its own project graph.

### Decision 2: merge linked project blueprints with current-file draft blueprints
Unsaved edits in the active session must still appear immediately in editor validation and autocomplete. Therefore, editor-facing blueprint references must be derived from:
1. linked project blueprints,
2. current-file draft blueprints,
with current draft values winning on duplicate ids.

### Decision 3: runtime UI behavior must be driven by runtime-observed state
`JobCard` is a runtime selection UI. It must read a runtime-visible flag, not React-only editor state. Therefore the Cycle Ability checkbox must compile onto a runtime component field.

### Decision 4: tutorial completion must use the existing command pipeline
The tutorial seen-state must be updated through the runtime command path, not by direct ECS mutation. If the runtime is paused, queued commands must be flushed immediately so the tutorial disappears at once without advancing the simulation.

---

## 4. Functional requirements

### FR-A1: project-wide blueprint references
When a project is loaded, any blueprint defined in any manifest-linked blueprint file must be:
1. available in autocomplete for blueprint reference fields,
2. accepted by editor-side reference validation.

### FR-A2: unsaved local edits must remain visible
If the current file has unsaved draft blueprints, those draft blueprints must be present in reference autocomplete and validation immediately.

### FR-A3: deterministic reference display
Blueprint reference option labels must be deterministic and stable.

### FR-B1: Cycle Ability toggle
Cycle Ability must expose a boolean field named `showThrottleSlider`.

### FR-B2: default behavior
For new Cycle Ability drafts, `showThrottleSlider` must default to `true`.

### FR-B3: compiled runtime state
Compiled runtime entities produced from Cycle Ability must carry a defined runtime-visible value for throttle slider visibility.

### FR-B4: runtime UI behavior
`JobCard` must hide the throttle slider when the runtime sink says it is hidden.

### FR-C1: tutorial visibility condition
The time-controls tutorial must appear once `explore` exists and remain visible until completed.

### FR-C2: tutorial completion condition
The tutorial is completed only when the time scale changes to a different value.

### FR-C3: non-completion condition
Play/pause must not complete the tutorial.

### FR-C4: paused runtime behavior
If the runtime is paused and the user changes time scale, the tutorial must disappear immediately without advancing the simulation tick.

---

## 5. File-by-file design

## 5A. Blueprint references across manifest-linked files

### Add: `ui/devtools/editors/blueprint/hooks/useBlueprintReferenceCatalog.ts`

**Responsibility**
Provide the single editor-facing catalog of blueprint ids and display options used by blueprint-reference fields and validation.

**Logic**
1. Read current-file draft blueprints from the session store.
2. Read the loaded project cartridge from the workspace service.
3. Extract linked project blueprint ids from the cartridge symbols.
4. Merge linked project blueprints with current-file draft blueprints.
5. On duplicate ids, current-file draft values take precedence.
6. Build a sorted `ids` list.
7. Build a sorted `options` list for UI pickers.
8. Resolve display label in this order:
   1. blueprint `label`,
   2. `components.display.label`,
   3. blueprint id.
9. Recompute when session draft blueprints change or when the loaded project cartridge changes.

**Interface**
Return shape:
- `ids: string[]`
- `options: Array<{ id: string; label: string }>`

**Constraints**
1. No side effects.
2. Must not load or reload projects.
3. If no project is loaded, return current-file draft data only.

---

### Change: `ui/devtools/editors/blueprint/hooks/useBlueprintValidation.ts`

**Responsibility**
Run editor-side validation for the active blueprint draft.

**Required change**
Replace the current-file-only blueprint id source with `useBlueprintReferenceCatalog().ids`.

**Logic**
1. Keep the existing validation flow unchanged.
2. Keep state-key gathering unchanged.
3. Keep collision/validation engine invocation unchanged.
4. Only change the `blueprintIds` input source.

**Interface**
No signature change.
No behavior change except that cross-file manifest references are now recognized.

---

### Change: `ui/devtools/editors/blueprint/mode/forms/SpawnerAbilityForm.tsx`

**Responsibility**
Render Spawner ability configuration fields.

**Required change**
Replace current-file-only blueprint suggestions with the catalog from `useBlueprintReferenceCatalog()`.

**Logic**
1. Use `ids` from the shared catalog.
2. Preserve existing field paths and form behavior.
3. Do not add any custom fallback logic.

**Interface**
No prop change.
Autocomplete now includes blueprints from the loaded project and current-file drafts.

---

### Change: `ui/devtools/editors/blueprint/mode/forms/CycleLifecycleSection.tsx`

**Responsibility**
Render lifecycle blueprint selection for Cycle Ability.

**Required change**
Replace current-file-only lifecycle options with `useBlueprintReferenceCatalog().options`.

**Logic**
1. Use the shared catalog options.
2. Exclude the current blueprint id from transform target options.
3. Preserve existing fallback rendering for truly unknown ids.
4. Do not treat manifest-linked blueprints as unknown.

**Interface**
No prop change.
Cross-file lifecycle targets become valid picker options.

---

### Do not change
1. `engine/compiler/validation/collisionDetector.ts`
2. `engine/compiler/validation/collisionDetectorExtras.ts`

**Reason**
These validators already accept `blueprintIds` as input. The defect is the editor input source, not the validation engine.

---

## 5B. Cycle Ability throttle slider visibility

### Change: `data/schemas/abilities/cycle.ts`

**Responsibility**
Define the schema for Cycle Ability configuration.

**Required change**
Add:
- `showThrottleSlider: boolean`
- default `true`

**Interface**
Cycle Ability config now formally supports `showThrottleSlider`.

---

### Change: `ui/devtools/editors/blueprint/mode/abilityDrafts.ts`

**Responsibility**
Create editor draft objects for abilities.

**Required change**
Set `showThrottleSlider: true` in the default Cycle Ability draft.

**Logic**
This file must explicitly set the default so newly added Cycle abilities are correct before any later normalization.

**Interface**
New Cycle Ability drafts always start with the flag enabled.

---

### Change: `ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.tsx`

**Responsibility**
Render Cycle Ability configuration.

**Required change**
Add a boolean field:
- Label: `Show Throttle Slider`
- Path: `${basePath}.showThrottleSlider`

**Logic**
1. Place the field with other cycle configuration controls.
2. Keep all other field behavior unchanged.
3. Use the standard boolean field/control mechanism already used by this editor.

**Interface**
The form exposes a checkbox for throttle slider visibility.

---

### Change: `data/schemas/components/powerSink.ts`

**Responsibility**
Define the runtime schema for the `powerSink` component.

**Required change**
Add:
- `showThrottleSlider: boolean`
- default `true`

**Interface**
Runtime `powerSink` data now includes throttle slider visibility.

---

### Change: `engine/compiler/abilities/cycleCompiler.ts`

**Responsibility**
Compile Cycle Ability config into runtime-facing components and behavior.

**Required change**
Ensure the compiled `powerSink` includes a defined `showThrottleSlider` value.

**Logic**
1. When Cycle Ability produces or updates `powerSink`, write `showThrottleSlider`.
2. Treat missing legacy config as `true`.
3. Do not change any other compilation behavior.
4. If a `powerSink` object already exists, update the field there rather than assuming a new object is required.

**Interface**
Compiler output guarantee:
- every Cycle-generated `powerSink` has a defined `showThrottleSlider` boolean.

---

### Change: `ui/runtime/world/selection/job-card/JobCard.tsx`

**Responsibility**
Render the runtime job selection UI for powered entities.

**Required change**
Gate throttle slider rendering on both:
1. existing throttle-capable sink conditions,
2. `sink.showThrottleSlider !== false`.

**Logic**
1. Preserve all current slider behavior when visible.
2. Hide the entire slider control when the flag is false.
3. Do not alter non-throttle job card UI.

**Interface**
No prop change.
Runtime behavior now respects the compiled sink visibility flag.

---

## 5C. Time-controls tutorial

### Change: `data/schemas/v2/caveWorldDefaults.ts`

**Responsibility**
Define hidden world-state defaults used by cave runtime features.

**Required change**
Add hidden state:
- `cave_tut_time_controls_seen`
- default `false`
- not user-visible

**Interface**
The world state now has a dedicated persistent seen-flag for the time-controls tutorial.

---

### Change: `ui/runtime/notifications/runtimeNotificationTypes.ts`

**Responsibility**
Define notification descriptor types.

**Required change**
Extend ongoing tutorial typing so the UI can distinguish which tutorial to open.

**Logic**
1. Introduce an explicit tutorial identity type:
   - `throttle`
   - `time_controls`
2. Ensure ongoing tutorial notifications include that identity.
3. Preserve the existing click action model.

**Interface**
Notification descriptors must be able to express "open throttle tutorial" versus "open time-controls tutorial".

---

### Change: `ui/runtime/notifications/constants.ts`

**Responsibility**
Provide fixed tutorial copy and asset references.

**Required change**
Add time-controls tutorial constants:
1. tutorial body copy,
2. GIF source path matching the existing throttle tutorial asset pattern.

**Asset contract**
Expected asset name:
- `time-controls-tutorial.gif`

Expected location pattern:
- same public/tutorial folder pattern currently used by `throttle-tutorial.gif`

**Interface**
Expose stable constants consumed by the new tutorial modal.

---

### Change: `ui/runtime/notifications/resolveOngoingRuntimeNotifications.ts`

**Responsibility**
Derive the set of ongoing runtime notifications from runtime state.

**Required change**
Add time-controls tutorial resolution.

**Logic**
1. Reuse the existing logic that determines whether `explore` exists.
2. Show time-controls tutorial when:
   - `explore` exists,
   - `cave_tut_time_controls_seen` is not true.
3. Preserve throttle tutorial logic unchanged.
4. Assign deterministic priority/order.

**Interface**
Returned ongoing notifications may now include a time-controls tutorial descriptor.

---

### Change: `ui/runtime/notifications/formatRuntimeNotificationText.ts`

**Responsibility**
Map notification descriptors to display text.

**Required change**
Add user-facing text for the time-controls tutorial.

**Required label**
`Tutorial: Time Controls`

---

### Change: `ui/runtime/notifications/runtimeNotificationStore.ts`

**Responsibility**
Store notification UI state.

**Required change**
Replace the single tutorial-open boolean with a discriminated active tutorial target.

**Logic**
Required state model:
- active tutorial modal is one of:
  - `null`
  - `throttle`
  - `time_controls`

Required actions:
- open tutorial modal by tutorial kind,
- close tutorial modal,
- reset clears active tutorial modal.

**Interface**
Only one tutorial modal may be open at a time, but the system can now address multiple tutorials.

---

### Change: `ui/runtime/notifications/RuntimeNotificationOngoingList.tsx`

**Responsibility**
Render clickable ongoing notifications.

**Required change**
When an ongoing notification represents a tutorial, clicking it must open the correct tutorial modal.

**Logic**
1. Preserve existing ongoing notification rendering.
2. Use the tutorial identity from the descriptor to choose which modal to open.
3. Keep tutorial cards visually consistent with existing tutorial treatment.

**Interface**
No prop change.
Tutorial click behavior becomes tutorial-specific.

---

### Add: `ui/runtime/notifications/RuntimeNotificationTimeControlsTutorialModal.tsx`

**Responsibility**
Render the time-controls tutorial modal.

**Logic**
1. Mirror the existing throttle tutorial modal structure and styling.
2. Open only when the notification store says the active tutorial is `time_controls`.
3. Use the time-controls tutorial asset and copy constants.
4. Support the same close interactions as the throttle tutorial modal.

**Interface**
No props.
Store-driven visibility.

---

### Change: `ui/runtime/notifications/RuntimeNotificationThrottleTutorialModal.tsx`

**Responsibility**
Render the throttle tutorial modal.

**Required change**
Update it to read the new active tutorial modal state shape.

**Logic**
Open only when the active tutorial is `throttle`.

**Interface**
No visible behavior change.

---

### Change: `ui/runtime/notifications/RuntimeNotificationViewport.tsx`

**Responsibility**
Render notification UI and tutorial modals.

**Required change**
Render both tutorial modal components.

**Logic**
1. Keep existing notification list rendering.
2. Mount both tutorial modals.
3. Let store state determine which, if any, is visible.

**Interface**
Notification viewport supports both tutorial modals.

---

### Change: `ui/runtime/status/useRuntimeClock.ts`

**Responsibility**
Provide runtime clock actions such as play/pause and time-scale changes.

**Required change**
Mark the time-controls tutorial seen only when time scale changes to a different value.

**Logic**
1. Leave play/pause behavior unchanged.
2. In the time-scale change handler:
   1. compare requested scale to current scale,
   2. if unchanged, do not mark tutorial seen,
   3. if changed, apply the time-scale change,
   4. enqueue a world-state update setting `cave_tut_time_controls_seen = true` if it is not already true,
   5. if the runtime is paused, immediately flush queued commands.
3. Use the existing runtime command mechanism and existing flush mechanism.
4. Do not directly mutate ECS state.

**Interface**
Behavioral contract:
- changing time scale completes the tutorial,
- play/pause does not,
- paused runtime hides the tutorial immediately after scale change without advancing simulation.

---

## 6. Data contracts

### Blueprint reference catalog contract
The shared editor catalog must provide:
- a complete list of blueprint ids visible to editor references,
- a deterministic label for each id,
- current-file drafts overlaid on top of linked project data.

### Cycle Ability config contract
Cycle Ability must support:
- `showThrottleSlider: boolean`, default `true`.

### Runtime `powerSink` contract
`powerSink` must support:
- `showThrottleSlider: boolean`, default `true`.

### Tutorial world-state contract
World state must support:
- `cave_tut_time_controls_seen: boolean`, hidden, default `false`.

### Tutorial notification contract
A tutorial notification descriptor must identify which tutorial it opens.

---

## 7. Test plan

All tests must verify behavior, not implementation detail. Use the existing test conventions and keep assertions minimal but sufficient.

## 7A. Blueprint reference tests

### Test: spawner autocomplete includes manifest-linked targets
**File**
`ui/devtools/editors/blueprint/mode/forms/SpawnerAbilityForm.test.tsx`

**Given**
- current file draft contains `egg`,
- loaded project contains `egg` and `explore`.

**When**
- Spawner Ability form is rendered.

**Then**
- blueprint target suggestions include `explore`.

---

### Test: validation accepts manifest-linked spawner target
**File**
`ui/devtools/editors/blueprint/editor/BlueprintEditorValidation.test.tsx`

**Given**
- current file draft contains a Spawner targeting `explore`,
- current file draft does not define `explore`,
- loaded project does define `explore`.

**When**
- blueprint validation runs.

**Then**
- no validation error states that Spawner target `explore` does not exist.

---

### Test: Cycle lifecycle picker includes cross-file blueprints
**File**
`ui/devtools/editors/blueprint/mode/CycleAbilityForm.test.tsx`

**Given**
- the loaded project contains a lifecycle target blueprint in another manifest-linked file.

**When**
- Cycle Ability form is rendered.

**Then**
- the lifecycle target appears as a normal selectable option,
- it is not rendered as an unknown reference.

---

## 7B. Throttle slider visibility tests

### Test: Cycle compiler defaults throttle slider visibility to true
**File**
compiler test adjacent to `engine/compiler/abilities/cycleCompiler.ts`

**Given**
- a Cycle Ability config without `showThrottleSlider`.

**When**
- it is compiled.

**Then**
- compiled `powerSink.showThrottleSlider` is `true`.

---

### Test: Cycle compiler preserves explicit false
**File**
compiler test adjacent to `engine/compiler/abilities/cycleCompiler.ts`

**Given**
- a Cycle Ability config with `showThrottleSlider = false`.

**When**
- it is compiled.

**Then**
- compiled `powerSink.showThrottleSlider` is `false`.

---

### Test: new Cycle Ability draft defaults checkbox to checked
**File**
`ui/devtools/editors/blueprint/mode/CycleAbilityForm.test.tsx`

**Given**
- a newly created Cycle Ability draft.

**When**
- the form is rendered.

**Then**
- `Show Throttle Slider` is present and checked.

---

### Test: JobCard hides slider when runtime sink disables it
**File**
`ui/runtime/world/selection/job-card/JobCard.test.tsx`

**Given**
- an entity with a throttle-capable sink,
- `showThrottleSlider = false`.

**When**
- JobCard is rendered.

**Then**
- the throttle slider is not rendered.

**And given**
- identical entity state except `showThrottleSlider = true` or undefined.

**Then**
- the throttle slider is rendered.

---

## 7C. Time-controls tutorial tests

### Test: time-controls tutorial resolves when explore exists and tutorial is unseen
**File**
`ui/runtime/notifications/resolveOngoingRuntimeNotifications.test.ts`

**Given**
- `explore` exists,
- `cave_tut_time_controls_seen = false`.

**When**
- ongoing notifications are resolved.

**Then**
- time-controls tutorial is present.

---

### Test: time-controls tutorial is absent when seen
**File**
`ui/runtime/notifications/resolveOngoingRuntimeNotifications.test.ts`

**Given**
- `explore` exists,
- `cave_tut_time_controls_seen = true`.

**When**
- ongoing notifications are resolved.

**Then**
- time-controls tutorial is absent.

---

### Test: clicking time-controls tutorial opens the correct modal
**File**
`ui/runtime/notifications/RuntimeNotificationViewport.tutorial.cases.tsx`

**Given**
- the ongoing list contains the time-controls tutorial.

**When**
- the user clicks that tutorial notification.

**Then**
- the time-controls tutorial modal opens.

---

### Test: time-controls tutorial modal uses correct asset
**File**
`ui/runtime/notifications/RuntimeNotificationTimeControlsTutorialModal.test.tsx`

**Given**
- active tutorial modal is `time_controls`.

**When**
- the modal is rendered.

**Then**
- it points at `time-controls-tutorial.gif` using the same asset path pattern as the throttle tutorial.

---

### Test: changing time scale marks tutorial seen
**File**
`ui/runtime/status/RuntimeClock.test.tsx`

**Given**
- tutorial seen flag is false,
- current time scale is `X`,
- requested time scale is `Y`,
- `X != Y`.

**When**
- the user changes time scale.

**Then**
- the runtime time scale is updated,
- a world-state update sets `cave_tut_time_controls_seen = true`.

---

### Test: play/pause does not mark tutorial seen
**File**
`ui/runtime/status/RuntimeClock.test.tsx`

**Given**
- tutorial seen flag is false.

**When**
- the user toggles play/pause only.

**Then**
- no update marks `cave_tut_time_controls_seen = true`.

---

### Test: clicking the already-selected time scale does not complete the tutorial
**File**
`ui/runtime/status/RuntimeClock.test.tsx`

**Given**
- tutorial seen flag is false,
- requested time scale equals current time scale.

**When**
- the user clicks the already-selected scale.

**Then**
- tutorial seen state is unchanged.

---

### Test: paused runtime flushes tutorial completion immediately after scale change
**File**
`ui/runtime/status/RuntimeClock.test.tsx`

**Given**
- runtime is paused,
- tutorial seen flag is false,
- requested time scale differs from current time scale.

**When**
- the user changes time scale.

**Then**
- a tutorial-seen update is enqueued,
- queued commands are flushed immediately,
- the tutorial disappears without advancing the simulation tick.

---

## 8. Acceptance criteria

Implementation is complete only when all of the following are true:

1. Loading a project from `manifest.json` makes all manifest-linked blueprint ids available to editor reference autocomplete.
2. Loading a project from `manifest.json` makes those same blueprint ids valid for editor-side blueprint reference validation.
3. Unsaved current-file draft blueprints remain visible to autocomplete and validation.
4. Spawner target `explore` in `egg.bp` is accepted when `explore` exists elsewhere in the loaded project.
5. Cycle Ability exposes `Show Throttle Slider` and it defaults to enabled for new drafts.
6. The Cycle compiler writes a defined runtime-visible throttle slider flag to `powerSink`.
7. JobCard hides the throttle slider when that runtime flag is false.
8. The time-controls tutorial appears once `explore` exists and the tutorial has not been completed.
9. The time-controls tutorial is completed only by an actual time-scale change.
10. Play/pause does not complete the time-controls tutorial.
11. While paused, a time-scale change hides the tutorial immediately through the existing command and flush path.
12. Existing throttle tutorial behavior remains unchanged.

---

## 9. Implementation order

Recommended order:
1. Implement shared blueprint reference catalog.
2. Switch validation and reference pickers to the shared catalog.
3. Add `showThrottleSlider` to Cycle schema, draft creation, compiler, and JobCard.
4. Add time-controls tutorial state, notification typing, modal, and runtime clock completion logic.
5. Add and run tests.

This order minimizes risk and keeps each change independently verifiable.

---

## 10. Final constraints for the implementation agent

1. Reuse existing hooks, stores, schemas, command types, and notification patterns wherever they already exist.
2. Do not invent a second project-loading path.
3. Do not bypass the runtime command queue for tutorial completion state.
4. Do not store throttle slider visibility only in editor state.
5. Keep changes file-local and contract-driven.
6. If any file named in this document differs materially from current source, inspect the surrounding implementation and preserve the contract defined here.
