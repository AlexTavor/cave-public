# Tutorial System for `core.cave` — LLD

## 1. Scope

This document defines the low-level design for replacing the current hardcoded runtime tutorial implementation with an authored tutorial system stored in `core.cave`, using the same structured-conditions mechanism already used by Thoughts.

This design is constrained by the current codebase and by the project rules in the uploaded context pack, prompt contract, and testing standards.

---

## 2. Why

## 2.1 Problem in the current codebase

The repository already has two runtime tutorials, but they are not an authored system.

Current behavior is split across hardcoded files:
- visibility rules are hardcoded in `src/ui/runtime/notifications/resolveOngoingRuntimeNotifications.ts`
- tutorial body text and gif paths are hardcoded in `src/ui/runtime/notifications/constants.ts`
- each modal is hardcoded in its own component:
  - `RuntimeNotificationThrottleTutorialModal.tsx`
  - `RuntimeNotificationTimeControlsTutorialModal.tsx`
- completion is hardcoded through specific hidden world-state keys:
  - `cave_tut_throttle_seen`
  - `cave_tut_time_controls_seen`
- authoring support does not exist in the devtools config editors

This creates four concrete problems:
1. tutorials are not authored in `core.cave`
2. adding a tutorial requires code changes instead of data changes
3. the current system does not reuse the Thoughts authoring workflow
4. the tutorial conditions are not fully expressible through the current structured condition schema

## 2.2 Design goal

Make tutorials data-authored, editor-supported, runtime-resolved, and previewable, while preserving the existing runtime UX pattern:
- tutorial appears as an ongoing runtime notification
- clicking it opens a modal
- modal shows gif + rich text body
- tutorial disappears once its authored end conditions are satisfied

---

## 3. What

## 3.1 New authored config section

A new config section will be added at:
- `config.settings.tutorials`

It will live alongside:
- `config.settings.thoughts`
- `config.settings.notifications`

This is the only authored source of truth for tutorials.

## 3.2 Tutorial definition contract

Each tutorial definition contains exactly these fields:

- `id`
  - unique, non-empty string
  - editor row title
  - runtime notification label source
- `body`
  - string
  - rendered with `RichText`
- `gifUrl`
  - string
  - raw authored link/path to the gif
- `startConditions`
  - array of structured conditions
  - all conditions must be true for the tutorial to be eligible to show
- `endConditions`
  - array of structured conditions
  - all conditions must be true for the tutorial to be considered complete and hidden

## 3.3 Runtime semantics

A tutorial is visible when and only when:
- all `startConditions` are true
- all `endConditions` are **not** true

Equivalently:
- `visible = startSatisfied AND NOT endSatisfied`

There is no extra tutorial memory layer.
There is no implicit “seen” registry inside the tutorial system.
Tutorial completion is driven entirely by authored end conditions and by existing runtime state/fact updates performed elsewhere.

## 3.4 Preview semantics in devtools

Each tutorial row gets a Preview button.
Preview opens the same presentation used by runtime tutorials:
- same gif handling
- same `RichText` rendering
- same modal shell

Preview is presentation-only.
It does not evaluate conditions and does not mutate session or runtime state.

---

## 4. Current codebase facts this design is built on

## 4.1 Thoughts already provide the authoring pattern to copy

Current Thoughts implementation already gives the required editor shape:
- data schema: `src/data/schemas/thoughts.ts`
- editor entry point: `src/ui/devtools/editors/config/thoughts/ThoughtsEditor.tsx`
- row UI: `src/ui/devtools/editors/config/thoughts/ThoughtForm.tsx`
- session wiring: `src/ui/devtools/editors/config/thoughts/useThoughtsSession.ts`
- inline condition editing: `src/ui/devtools/editors/conditions/StructuredConditionsField.tsx`
- runtime selection: `src/game/thoughts/thoughtEligibility.ts`

The tutorial editor will mirror this structure.

## 4.2 Current hardcoded tutorials define the exact migration target

The existing tutorials establish the runtime UX and the required condition coverage:

- tutorial start currently depends on Explore existing, implemented as:
  - `blueprintId === "explore"` OR tag `cave_exploration`
- tutorial completion currently depends on hidden boolean world state:
  - `cave_tut_throttle_seen === true`
  - `cave_tut_time_controls_seen === true`
- completion flags are already written by existing UI hooks:
  - `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`
  - `src/ui/runtime/status/useRuntimeClock.ts`

These two hardcoded tutorials are the migration baseline.

---

## 5. Conditions mechanism changes

## 5.1 Reuse requirement

Tutorials must use the same structured-condition mechanism as Thoughts.
That means:
- authored tutorial conditions use the same list-based editor pattern
- runtime evaluation uses the same JsonLogic-backed evaluation path
- tutorial condition semantics match thought condition semantics exactly where condition kinds overlap

## 5.2 Existing condition kinds that remain unchanged

The existing structured condition kinds continue to work for both Thoughts and Tutorials:
- `fact_threshold`
- `world_state_threshold`

## 5.3 New condition kinds required by tutorials

Only the condition kinds needed by the current tutorial behavior are added.

### A. `entity_tag_present`

Purpose:
- express “show tutorial when at least one entity with tag X exists”

Fields:
- `id`
- `sortKey`
- `kind = entity_tag_present`
- `tag`

Evaluation rule:
- true when `snapshot.query({ tag })` returns at least one entity

Why this exact shape:
- it reuses the existing `Snapshot.query` capability
- it avoids a new generic entity query DSL
- it covers the current Explore-start requirement through the existing `cave_exploration` tag on `explore.bp`

### B. `world_state_boolean`

Purpose:
- express boolean completion flags stored on `sys_world.state`

Fields:
- `id`
- `sortKey`
- `kind = world_state_boolean`
- `key`
- `value` (boolean)

Evaluation rule:
- true when `sys_world.state[key].value === value`

Why this exact shape:
- the current hardcoded tutorial completion state is boolean
- it avoids broadening `world_state_threshold` into a type-unsafe mixed-value condition
- it is sufficient for the current `cave_tut_*_seen` flags

## 5.4 Explicit non-changes

This design does **not** add:
- blueprint-id conditions
- entity-count threshold conditions
- string-equality conditions
- negation operators
- disjunction groups

Those are not required by the current repository behavior and are therefore out of scope.

---

## 6. Runtime behavior

## 6.1 Runtime source of truth

Runtime tutorial visibility is derived from:
- current runtime snapshot
- authored tutorials in `runtime.getCartridge().config?.settings?.tutorials`

The tutorial system does not own simulation state.
The runtime continues to own state.
The UI continues to observe runtime state.

## 6.2 Tutorial visibility resolution

A pure resolver will:
1. read authored tutorials from runtime config
2. create a snapshot from the runtime
3. evaluate each tutorial’s `startConditions`
4. evaluate each tutorial’s `endConditions`
5. emit ongoing tutorial notification descriptors for tutorials where:
   - start is satisfied
   - end is not satisfied

Ordering rule:
- authored tutorial order in `config.settings.tutorials` is preserved
- tutorial notifications remain after built-in ongoing notifications (`purge_active`, `hungry_bodies`, `cold_bodies`)

## 6.3 Tutorial notification UX

Visible tutorials continue to appear in the ongoing notification stack.
Each tutorial card:
- is attention-marked
- is clickable
- opens the tutorial modal

Card text rule:
- display text is `Tutorial: {id}`

This uses the existing uniqueness field and avoids introducing a second user-authored label field.

## 6.4 Tutorial modal UX

The modal displays:
- gif image from `gifUrl`
- rich text body from `body`

Close behavior:
- escape closes
- backdrop click closes
- close does not change tutorial completion state

If the tutorial becomes completed while the modal is open:
- the modal remains open until the user closes it
- the ongoing card disappears on the next resolver pass

This preserves the current decoupling between modal UI state and runtime eligibility.

## 6.5 Gif URL resolution

Authored gif links must support both:
- absolute URLs
- app-relative public asset paths such as `tutorials/throttle-tutorial.gif`

Resolution rule:
- absolute URLs are used as-is
- `data:` and `blob:` URLs are used as-is
- other paths are joined against `import.meta.env.BASE_URL`

Why:
- the current hardcoded implementation already needs environment-aware gif path resolution
- authored config cannot use `import.meta.url`
- this keeps `core.cave` portable and readable

---

## 7. Authoring UX

## 7.1 Editor entry point

Add a new System Config dashboard card:
- title: `Tutorials`
- description: `Configure authored runtime tutorials, their conditions, and their preview.`
- route: `tutorials::<filename>`

## 7.2 Tutorials editor structure

The editor mirrors Thoughts:
- `ToolFrame` root
- zero-state message when empty
- one collapsible `ComponentRow` per tutorial
- add button at bottom
- inline validation and duplicate-id protection through the session helper

## 7.3 Tutorial row structure

Each row contains:
- editable `id`
- `gifUrl` string field
- `body` multiline string field
- preview button
- `Start Conditions` field
- `End Conditions` field

Summary rule in collapsed row:
- first non-empty body line, else `Empty`

Delete behavior:
- removes the tutorial entry from `config.settings.tutorials`

## 7.4 Preview behavior

Preview button opens a modal that uses the shared tutorial display component.

Preview rules:
- it always reflects the current draft values
- it performs no condition evaluation
- it performs no link validation
- broken gif links are shown as broken images, by design, because preview should match runtime rendering rather than inventing a second validation pipeline

## 7.5 Structured conditions editor reuse

The existing `StructuredConditionsField` will be reused, but it must become configurable per use-site.

Required new props:
- `label`
- `tooltip`
- `addButtonLabel`

Thoughts continue to use the default label `Conditions`.
Tutorials use:
- `Start Conditions`
- `End Conditions`

---

## 8. Migration of the two current hardcoded tutorials

The current hardcoded tutorials will be moved into `src/data/raw/example/modules/core.cave` under `tutorials`.

## 8.1 Tutorial 1: throttle

Fields:
- `id = throttle`
- `gifUrl = tutorials/throttle-tutorial.gif`
- `body = current THROTTLE_TUTORIAL_BODY text`
- `startConditions = [ entity_tag_present(tag = cave_exploration) ]`
- `endConditions = [ world_state_boolean(key = cave_tut_throttle_seen, value = true) ]`

## 8.2 Tutorial 2: time_controls

Fields:
- `id = time_controls`
- `gifUrl = tutorials/time-controls-tutorial.gif`
- `body = current TIME_CONTROLS_TUTORIAL_BODY text`
- `startConditions = [ entity_tag_present(tag = cave_exploration) ]`
- `endConditions = [ world_state_boolean(key = cave_tut_time_controls_seen, value = true) ]`

## 8.3 Existing completion writers remain unchanged

No behavior change is made to the completion writers:
- `usePowerSinkThrottle.ts` continues writing `cave_tut_throttle_seen = true`
- `useRuntimeClock.ts` continues writing `cave_tut_time_controls_seen = true`

This keeps the migration narrow and avoids introducing a second completion pipeline.

---

## 9. File-by-file design

## 9.1 Data schema layer

| File | Change | Responsibility | Logic | Interface |
|---|---|---|---|---|
| `src/data/schemas/tutorials.ts` | Add | Define authored tutorial schema and list schema | Validates tutorial shape, defaults, duplicate ids | Exports `TutorialDefinitionSchema`, `TutorialsSchema`, `TutorialDefinition` |
| `src/data/schemas/conditions.ts` | Change | Extend structured condition schema | Add `entity_tag_present` and `world_state_boolean` discriminated-union members | Exports updated `StructuredConditionSchema` and condition types |
| `src/data/schemas/blueprintConfig.ts` | Change | Allow tutorials in editable config | Add optional `tutorials` to `BlueprintSettingsSchema` | `config.settings.tutorials` becomes valid in module draft config |
| `src/data/schemas/v2/config.ts` | Change | Ensure system config defaults include tutorials | Add `tutorials: TutorialsSchema.default([])` | Runtime/system config can safely read tutorials even when omitted |
| `src/data/raw/example/modules/core.cave` | Change | Provide authored examples and remove tutorial hardcoding dependency | Add migrated `tutorials` array with throttle and time_controls entries | Example module becomes the authored source for shipped tutorials |

### Tutorial schema contract

The schema in `tutorials.ts` is:
- strict on required fields
- default-empty on both condition arrays
- duplicate-id protected exactly like Thoughts

No extra fields are added.

## 9.2 Shared condition evaluation layer

| File | Change | Responsibility | Logic | Interface |
|---|---|---|---|---|
| `src/game/conditions/evaluateStructuredConditionSet.ts` | Add | Centralize runtime evaluation of structured condition arrays | Build evaluation context from snapshot + `sys_world`, compile conditions, evaluate with `JsonLogicAdapter`, return boolean all-match result | Exports `evaluateStructuredConditionSet(snapshot, conditions): boolean` |
| `src/game/thoughts/thoughtEligibility.ts` | Change | Thought selection remains the same while delegating condition evaluation | Replace local condition-evaluation logic with the shared evaluator; preserve first-eligible unseen-thought selection | Public function signature remains unchanged |
| `src/engine/compiler/conditions/compileStructuredConditions.ts` | Change | Compile all structured condition kinds into JsonLogic rules | Add compilation branches for `entity_tag_present` and `world_state_boolean` | Existing exports unchanged |
| `src/engine/logic/JsonLogicAdapter.ops.ts` | Change | Support tag-presence evaluation through JsonLogic | Add `QUERY_COUNT(tag)` operation returning snapshot query count for tag | Existing ops remain unchanged |

### Compilation rules

Compilation is exact and deterministic:
- `fact_threshold` → unchanged
- `world_state_threshold` → unchanged
- `world_state_boolean` → equality comparison on `sys_world.state.<key>.value`
- `entity_tag_present` → `QUERY_COUNT(tag) >= 1`

## 9.3 Devtools condition editor layer

| File | Change | Responsibility | Logic | Interface |
|---|---|---|---|---|
| `src/ui/devtools/editors/conditions/StructuredConditionsField.tsx` | Change | Make structured conditions reusable for more than one section label | Accept caller-provided label/tooltip/button copy with backwards-compatible defaults | Props become `{ filename, path, label?, tooltip?, addButtonLabel? }` |
| `src/ui/devtools/editors/conditions/StructuredConditionRow.tsx` | Change | Render row editors for every structured condition kind | Add field layouts for `entity_tag_present` and `world_state_boolean` | Existing props unchanged |
| `src/ui/devtools/editors/conditions/structuredConditionDefaults.ts` | Change | Create default rows for every condition kind | Add defaults for new tutorial-related kinds | Exports updated `createDefaultStructuredCondition(kind?)` |
| `src/ui/devtools/editors/conditions/structuredConditionAutocomplete.ts` | Change | Provide condition-field suggestions | Add tag suggestions derived from linked + drafted blueprint tags; keep state-key suggestions and extend them with current tutorial-completion keys | Exports updated autocomplete helpers |

### Row behavior for new kinds

`entity_tag_present`
- single editable field: `tag`
- autocomplete suggestions come from blueprint tags visible in the active cartridge and current draft

`world_state_boolean`
- editable fields: `key`, `value`
- `value` is rendered as a boolean field
- `key` remains freeform with suggestions; it is not restricted to the suggestion list

## 9.4 Devtools tutorial editor layer

| File | Change | Responsibility | Logic | Interface |
|---|---|---|---|---|
| `src/ui/devtools/editors/config/tutorials/tutorialFieldSchemas.ts` | Add | Hold tutorial editor path constants and field schemas | Define path `config.settings.tutorials` and scalar zod schemas used by fields | Exports path constants and field schemas |
| `src/ui/devtools/editors/config/tutorials/tutorialEditorDefaults.ts` | Add | Create a default tutorial entry | Build a valid tutorial with empty body, empty gifUrl, empty condition arrays | Exports `createDefaultTutorial(id)` |
| `src/ui/devtools/editors/config/tutorials/tutorialSessionHelpers.ts` | Add | Session-level immutable helpers | Read draft tutorials, generate next id, rename tutorial at index | Exports helper functions only |
| `src/ui/devtools/editors/config/tutorials/useTutorialsSession.ts` | Add | Manage draft tutorial CRUD in session store | Add, remove, rename, and write tutorial arrays exactly like Thoughts | Exports `{ tutorials, addTutorial, removeTutorial, renameTutorial }` |
| `src/ui/devtools/editors/config/tutorials/TutorialPreviewModal.tsx` | Add | Devtools-only preview shell | Render a modal around the shared tutorial display component | Props: `{ isOpen, onClose, tutorial }` |
| `src/ui/devtools/editors/config/tutorials/TutorialForm.tsx` | Add | Render one collapsible tutorial row | Bind row fields to the session store, show summary, own preview-open local UI state | Props mirror `ThoughtForm` shape: `{ filename, index, onRemove, onRename }` |
| `src/ui/devtools/editors/config/tutorials/TutorialsEditor.tsx` | Add | Top-level tutorials editor | Ensure module session, list rows, show zero-state, add button | Props: `{ filename }` |

### Tutorial editor row contract

Row fields map to draft paths exactly:
- `id` → `config.settings.tutorials.<index>.id`
- `gifUrl` → `config.settings.tutorials.<index>.gifUrl`
- `body` → `config.settings.tutorials.<index>.body`
- `startConditions` → `config.settings.tutorials.<index>.startConditions`
- `endConditions` → `config.settings.tutorials.<index>.endConditions`

## 9.5 Devtools routing layer

| File | Change | Responsibility | Logic | Interface |
|---|---|---|---|---|
| `src/ui/devtools/editors/file/SystemConfigEditor.tsx` | Change | Add Tutorials dashboard entry | Insert Tutorials card routed to `tutorials::<filename>` | Existing component interface unchanged |
| `src/ui/devtools/shell/window-manager/virtualPath.constants.ts` | Change | Register new route prefix | Add `tutorials` to `ROUTE_PREFIXES` | Existing exports expanded |
| `src/ui/devtools/shell/window-manager/virtualPath.types.ts` | Change | Add virtual-path type | Add `{ kind: "tutorials"; filename: string }` | Type union expanded |
| `src/ui/devtools/shell/window-manager/virtualPath.parseRouted.ts` | Change | Parse tutorial routes | Map `tutorials::<filename>` to tutorial virtual path | Existing parse API unchanged |
| `src/ui/devtools/shell/window-manager/virtualPath.serialize.ts` | Change | Serialize tutorial routes | Return `tutorials::<filename>` for tutorial virtual path | Existing serialize API unchanged |
| `src/ui/devtools/shell/window-manager/tabIds.ts` | Change | Create tab ids for tutorial editor | Add `tutorials` tab kind and serializer | Existing helper API unchanged |
| `src/ui/devtools/shell/window-manager/tabIdToVirtualPath.ts` | Change | Restore tutorial route from tab id | Add tutorial tab mapping | Existing helper API unchanged |
| `src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.config.ts` | Change | Open tutorial editor tabs | Add tutorial route handler identical in shape to Thoughts | Existing handler registration pattern preserved |
| `src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx` | Change | Resolve tutorial editor component | Map `component === tutorials` to `TutorialsEditor` | Existing resolver interface unchanged |

## 9.6 Runtime tutorial display layer

| File | Change | Responsibility | Logic | Interface |
|---|---|---|---|---|
| `src/ui/runtime/tutorials/resolveTutorialGifSrc.ts` | Add | Resolve authored gif links into browser-safe src values | Pass through absolute/data/blob URLs; join other paths with `BASE_URL` | Exports `resolveTutorialGifSrc(raw: string): string` |
| `src/ui/runtime/tutorials/TutorialDisplay.tsx` | Add | Shared visual body for runtime modal and devtools preview | Render gif + rich text body only; no state logic | Props: `{ id, body, gifUrl }` |
| `src/ui/runtime/tutorials/RuntimeTutorialModal.tsx` | Add | Runtime modal shell for active tutorial | Read active tutorial from store, render shared display, close via store action | No props; store-driven component |
| `src/ui/runtime/tutorials/resolveRuntimeTutorials.ts` | Add | Convert authored tutorials + runtime into tutorial ongoing descriptors | Read tutorials from runtime config, evaluate start/end conditions, preserve authored order | Exports `resolveRuntimeTutorials(runtime): RuntimeOngoingDescriptor[]` |

## 9.7 Runtime notification integration layer

| File | Change | Responsibility | Logic | Interface |
|---|---|---|---|---|
| `src/ui/runtime/notifications/runtimeNotificationTypes.ts` | Change | Make tutorial notification descriptors data-driven instead of hardcoded-enum-based | Replace hardcoded tutorial kinds with a generic tutorial notification shape carrying tutorial payload | Exported notification types updated |
| `src/ui/runtime/notifications/runtimeNotificationStore.ts` | Change | Store active tutorial payload instead of hardcoded tutorial kind | `activeTutorial` becomes tutorial payload or null | Store actions become `openTutorialModal(tutorialPayload)` / `closeTutorialModal()` |
| `src/ui/runtime/notifications/RuntimeNotificationOngoingList.tsx` | Change | Open authored tutorial payloads from notification cards | Click handler passes tutorial payload into store | Component props unchanged |
| `src/ui/runtime/notifications/formatRuntimeNotificationText.ts` | Change | Format authored tutorial notification labels | Tutorial card text becomes `Tutorial: {id}` | Existing formatter API unchanged |
| `src/ui/runtime/notifications/resolveOngoingRuntimeNotifications.ts` | Change | Merge built-in ongoing notifications with authored tutorials | Remove hardcoded throttle/time-controls branches; append `resolveRuntimeTutorials(runtime)` output after built-ins | Function signature unchanged |
| `src/ui/runtime/notifications/RuntimeNotificationViewport.tsx` | Change | Render generic runtime tutorial modal | Remove two hardcoded tutorial modal components; render one generic modal | Component interface unchanged |
| `src/ui/runtime/notifications/constants.ts` | Change | Keep only generic notification constants | Remove hardcoded tutorial bodies and gif constants; preserve `TUTORIAL_NOTIFICATION_PUNCH_INTERVAL_MS` | Existing exports shrink to generic constants |

### Notification payload contract for tutorials

Each tutorial ongoing descriptor carries:
- `key = tutorial:<id>`
- `kind = tutorial`
- `priority`
- `clickAction = open_tutorial`
- `tutorial = { id, body, gifUrl }`

The modal needs only these fields.
It does not need conditions after the card has been emitted.

---

## 10. Tests

The tests must satisfy the uploaded testing standard:
- behavior-focused
- factory-driven
- Given / When / Then readable
- view tests verify rendering and wiring only

## 10.1 Schema tests

Add:
- `src/data/schemas/tutorials.test.ts`

Required coverage:
1. parses a valid tutorial with empty condition arrays
2. rejects duplicate tutorial ids
3. accepts the new condition kinds in start/end condition arrays
4. keeps required fields required

## 10.2 Shared condition evaluation tests

Add:
- `src/game/conditions/evaluateStructuredConditionSet.test.ts`

Required coverage:
1. `entity_tag_present` returns true when matching tag exists
2. `entity_tag_present` returns false when no matching tag exists
3. `world_state_boolean` returns true on exact boolean match
4. `world_state_boolean` returns false on missing key or non-matching value
5. mixed condition arrays remain AND-based

## 10.3 Thought regression tests

Change:
- `src/game/thoughts/thoughtEligibility.structuredConditions.test.ts`

Required coverage:
- existing thought behavior remains unchanged after the shared evaluator extraction

## 10.4 Runtime tutorial resolution tests

Add:
- `src/ui/runtime/tutorials/resolveRuntimeTutorials.test.ts`

Required coverage:
1. tutorial is emitted when start is true and end is false
2. tutorial is hidden when start is false
3. tutorial is hidden when end is true
4. authored order is preserved
5. empty or missing tutorial config yields no tutorial descriptors

## 10.5 Runtime notification integration tests

Change existing tests:
- `resolveOngoingRuntimeNotifications.test.ts`
- `resolveOngoingRuntimeNotifications.timeControls.test.ts`
- `RuntimeNotificationViewport.tutorial.cases.tsx`
- `runtimeNotificationStore.test.ts`
- `useRuntimeStore.notifications.test.ts`

Required coverage:
1. built-in notifications still keep stable ordering
2. authored tutorials appear after built-ins
3. clicking an authored tutorial card opens the generic tutorial modal
4. resetting/unloading runtime clears the generic active tutorial payload

## 10.6 Runtime tutorial modal tests

Add:
- `src/ui/runtime/tutorials/RuntimeTutorialModal.test.tsx`

Required coverage:
1. renders authored gif src after URL resolution
2. renders authored rich text body
3. closes on escape/backdrop wiring

## 10.7 Devtools editor tests

Add:
- `src/ui/devtools/editors/config/tutorials/TutorialsEditor.test.tsx`
- route tests mirroring Thoughts:
  - tutorial route parsing/serializing
  - tab-id roundtrip
  - window layout resolver route
  - system config dashboard card opens tutorials editor

Required coverage:
1. renders authored tutorials from config
2. adds a new tutorial entry
3. duplicate rename is rejected
4. preview button opens the preview modal using current draft values
5. start/end condition sections write to the correct draft paths

---

## 11. Decisions and tradeoffs

## 11.1 Kept: completion writers stay where they already are

Decision:
- keep `usePowerSinkThrottle.ts` and `useRuntimeClock.ts` unchanged

Why:
- they already own the user interactions that complete the current tutorials
- moving completion into a new tutorial engine would expand scope and duplicate existing behavior

Tradeoff:
- authors must reference hidden world-state keys in end conditions for tutorials of this style
- the system is properly authored, but completion signals remain emitted by the existing runtime interaction hooks

## 11.2 Chosen condition additions are minimal, not generic

Decision:
- add only `entity_tag_present` and `world_state_boolean`

Why:
- these are the only condition capabilities required by the current hardcoded tutorials
- broader condition work would violate the prompt contract by speculating beyond the repo evidence

Tradeoff:
- future tutorial use cases may need additional condition kinds later
- that future work is intentionally deferred

## 11.3 Tutorial ids are used as runtime labels

Decision:
- do not add a separate authored title field
- runtime notification label is `Tutorial: {id}`

Why:
- the user requested gif + text, not gif + title + text
- adding a second user-authored label field would be an unrequested schema expansion

Tradeoff:
- ids must be readable if they are player-facing
- this is acceptable for current migrated tutorials (`throttle`, `time_controls`)

## 11.4 Tutorial visibility is purely derived, not persisted

Decision:
- tutorial visibility is recalculated from start/end conditions every resolver pass

Why:
- it keeps the system observational and aligned with the existing runtime-notification architecture
- it avoids creating a second runtime mutation channel for tutorial lifecycle state

Tradeoff:
- if an author uses non-monotonic end conditions, a tutorial can reappear later
- this is acceptable because the current real completion keys are monotonic booleans

## 11.5 Shared presentation component is required

Decision:
- preview and runtime modal share one display component

Why:
- the user explicitly asked for preview to pop the display
- using one shared display component makes preview truthful by construction

Tradeoff:
- runtime tutorial presentation becomes importable from devtools
- this is acceptable because the component is presentation-only and contains no runtime logic

---

## 12. Explicit non-goals

This LLD does not include:
- tutorial sequencing / chains
- tutorial categories
- localization
- analytics changes
- asset management for gifs
- automatic completion behavior inside the tutorial system
- a generalized entity-query condition language
- replacing Thoughts runtime behavior

---

## 13. Final contract

The implementation that follows this LLD is correct only if all of the following are true:

1. tutorials are authored in `core.cave`
2. the editor uses the same collapsible-row quality bar as Thoughts
3. preview renders the same tutorial presentation used at runtime
4. runtime tutorial visibility is determined only by authored start/end conditions
5. the hardcoded throttle/time-controls tutorial definitions are removed from code and moved into authored config
6. the conditions extension is limited to the repository-proven tutorial needs
7. all tests listed above are implemented and green
8. no unrelated systems are refactored

