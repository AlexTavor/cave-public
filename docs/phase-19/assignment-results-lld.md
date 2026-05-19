# LLD: Assignment Ability Results + One-Off + Assignment Card Description Cleanup

## 1. Purpose

Implement three scoped changes to the existing assignment ability without speculative refactors:

1. Replace the current assignment authoring fields for processing outputs / habiti transfer with a single **Results** section that supports stacked result entries.
2. Add an assignment-level **one-off** flag with the same depletion / GC contract already used by cycle.
3. Remove the hard-coded absorption / butcher narrative text from the assignment job card and show only the node description.

This design is grounded in the current codebase and deliberately reuses the existing runtime command, hidden state, preview, and reintegration mechanisms.

---

## 2. Why

### 2.1 The current authoring model is too narrow

The current assignment authoring schema only models:

- resource spawning via `processing_outputs`
- habiti transfer via `processing_absorbs_habiti`

Those fields are authored directly in `data/schemas/abilities/assignment.ts` and compiled by `engine/compiler/abilities/assignmentCompiler.ts` into hidden runtime state.

That is sufficient for the current Absorption / Butcher cases, but it does not express the missing third behavior: **destroying assigned bodies as an explicit result**.

### 2.2 Destruction is currently implicit and therefore wrong

Today, `game/handlers/AbsorbBatchHandler.ts` and `game/handlers/absorptionBatchProcessing.ts` always destroy assigned proxies / originals after completion. That means destruction is not a configured outcome; it is a hard-wired side effect of assignment completion.

That is the core defect.

### 2.3 The assignment card contains authored-irrelevant hard-coded prose

`ui/runtime/world/selection/absorption/absorptionNarrative.ts` injects bespoke text for absorption and butcher into the assignment card.

This is not authored data, is not generic, and directly conflicts with the requested contract: the card must show the node description and nothing else in that slot.

### 2.4 The safest path is to preserve the current runtime plumbing

The current runtime already has working mechanisms for:

- completion timing (`absorption_duration`, `absorption_progress`)
- completion pulse (`assignment_complete_pulse`)
- previewing resource / habiti outcomes (`resolveAbsorptionPreview.ts`)
- returning surviving proxies back to the world (`RECALL_PROXY` + `processReintegration`)
- one-off depletion and storage-aware GC (`createCycleGcRule`)

The lowest-risk implementation is therefore:

- change the **authoring contract**
- keep the existing **runtime state contract** wherever possible
- add only the one missing runtime flag for destruction

---

## 3. Scope

### In scope

- Assignment authoring schema
- Assignment compiler
- Assignment completion runtime behavior
- Assignment one-off behavior
- Assignment card description cleanup
- In-repo example modules required for the new assignment authoring contract
- Tests required to lock the contract

### Explicitly out of scope

- Any change to the `lure_accountant.bp` blueprint
- Renaming internal runtime concepts such as `ABSORB_BATCH`, `absorption_progress`, or `absorption_duration`
- Any broader UI rename from “Absorption” to “Assignment” for component/file names
- Save-format migration
- Any unrelated cleanup or refactor

### Important compatibility note

This change **does not preserve legacy authoring fields** in `_editor.abilities.assignment`.

After the schema change, legacy authoring fields such as:

- `processing_outputs`
- `processing_absorbs_habiti`

will no longer be part of the assignment ability authoring contract.

Because Zod object parsing strips unknown keys by default, any blueprint still authored with those fields will silently lose them at parse time.

Therefore, every in-repo blueprint that must continue to work under this task must be migrated in the same change.

In scope for migration:

- `data/raw/example/modules/absorption.bp`
- `data/raw/example/modules/butcher.bp`

Out of scope by instruction:

- `data/raw/example/modules/lure_accountant.bp`

### Save compatibility note

Persisted runtime state is **not** being redesigned here.

The implementation intentionally keeps the existing hidden runtime state keys used by assignment processing, so existing runtime saves that already contain:

- `absorption_duration`
- `absorption_progress`
- `processing_outputs`
- `processing_absorbs_habiti`

remain structurally compatible.

Only one new hidden runtime state flag is added:

- `processing_destroys_assigned_bodies`

---

## 4. Current observed behavior

### 4.1 Authoring schema

`data/schemas/abilities/assignment.ts` currently defines:

- `slots`
- `locking`
- `filter`
- `minimums`
- `duration`
- `processing_outputs`
- `processing_absorbs_habiti`
- `showProgress`

There is no destruction result and no one-off flag.

### 4.2 Compiler projection

`engine/compiler/abilities/assignmentCompiler.ts` currently:

- creates the `assignment` component
- creates `assignment_complete_pulse`
- writes `absorption_duration`
- writes `processing_outputs`
- writes `processing_absorbs_habiti`
- optionally adds the progress bar backed by `absorption_progress`

### 4.3 Completion behavior

`game/handlers/AbsorbBatchHandler.ts` currently:

- resolves the assigned ids
- resolves outputs
- processes assigned entities
- always clears the assignment
- always resets progress
- always raises `assignment_complete_pulse`
- always destroys assigned proxies / originals through `processAssignedEntities`

### 4.4 Preview and fact logic already depend on hidden runtime state

The following code already consumes hidden runtime state instead of reading editor schema directly:

- `game/handlers/absorptionBatchOutputs.ts`
- `game/handlers/resolveAbsorptionHabitiOutcome.ts`
- `ui/runtime/world/selection/absorption/resolveAbsorptionPreview.ts`
- `game/systems/facts/absorptionOngoingFact.ts`

That is why this design preserves those runtime state keys.

### 4.5 Assignment card text is currently hard-coded

`ui/runtime/world/selection/job-card/resolveJobCardData.ts` injects `narrativeText` from `ui/runtime/world/selection/absorption/absorptionNarrative.ts`.

`ui/runtime/world/selection/absorption/AbsorptionCard.tsx` renders both:

- the entity description
- the hard-coded narrative text

That duplication must end.

---

## 5. Target contract

## 5.1 Assignment authoring contract

`_editor.abilities.assignment` must expose the following fields:

- `slots`
- `locking`
- `filter`
- `minimums`
- `duration`
- `showProgress`
- `oneOff`
- `results`

`results` is an ordered array of discriminated result entries.

### Allowed result kinds

#### `destroy_assigned_bodies`

Meaning:

- the completion destroys the assigned proxy and its original body

Payload fields:

- none

Multiplicity:

- allowed at most once

#### `spawn_resource`

Meaning:

- the completion computes a resource amount from each processed body and spawns transfer spectacle using the existing processing-output pipeline

Payload fields:

- `resource`
- `source` (`fixed` | `attribute` | `lifetime_xp`)
- `attribute` (required iff `source === "attribute"`, forbidden otherwise)
- `factor`
- `target`

Multiplicity:

- allowed any number of times

#### `transfer_habiti`

Meaning:

- the completion transfers eligible carried habiti from processed bodies to cave ownership using the existing habiti pipeline

Payload fields:

- none

Multiplicity:

- allowed at most once

### Invalid authoring states

The schema must reject all of the following:

- more than one `destroy_assigned_bodies` result
- more than one `transfer_habiti` result
- `spawn_resource` with `source === "attribute"` and no `attribute`
- `spawn_resource` with `source !== "attribute"` and an authored `attribute`

---

## 5.2 Compiler projection contract

The compiler must continue projecting assignment processing into hidden runtime state.

### Hidden runtime state that remains unchanged

These keys remain the runtime contract:

- `absorption_duration`
- `absorption_progress`
- `processing_outputs`
- `processing_absorbs_habiti`
- `assignment_complete_pulse`

### New hidden runtime state

Add exactly one new key:

- `processing_destroys_assigned_bodies`

### Compiler mapping rules

Given `results`:

- all `spawn_resource` entries compile into `state.processing_outputs.value`
- presence of `transfer_habiti` compiles into `state.processing_absorbs_habiti.value = true`
- presence of `destroy_assigned_bodies` compiles into `state.processing_destroys_assigned_bodies.value = true`

If a result kind is absent, the corresponding hidden state key must be omitted.

### One-off compiler mapping

If `oneOff === true`:

- ensure `state.is_depleted` exists with initial `value = 0`
- append the same storage-aware GC rule used by cycle via `createCycleGcRule`

This must reuse the existing cycle GC behavior exactly.

---

## 5.3 Runtime completion contract

Assignment completion continues to be executed by the existing `ABSORB_BATCH` command.

That command remains the runtime completion entry point for this task.

### Processing order

When a batch completes:

1. Resolve the station and currently valid assigned ids.
2. Resolve outputs and habiti effects from the existing hidden state.
3. Process all valid assigned proxies / bodies against the completion snapshot.
4. Apply configured destruction or recall behavior.
5. Clear the station assignment.
6. Reset station progress.
7. Raise `assignment_complete_pulse`.
8. If the station is configured as one-off, mark it depleted.
9. Apply existing command metadata, cave-habiti update, and announcement behavior.

### Resource spawning contract

If `spawn_resource` results are present:

- compute amounts per processed body using the current `resolveOutputAmount` behavior
- spawn transfer spectacle using the current `processAbsorptionOutputs` pipeline
- do not introduce any new transfer implementation

### Habiti transfer contract

If `transfer_habiti` is present:

- compute newly owned / duplicate habiti using the current `resolveSingleAbsorptionOutcome` and `resolveBatchAbsorptionOutcome` behavior
- update cave ownership using the existing `enqueueOwnedHabitiUpdate` pipeline
- announce newly gained habiti using the current announcement mechanism

If `transfer_habiti` is absent:

- no habiti are transferred
- no habiti announcement is emitted

### Destruction contract

If `destroy_assigned_bodies` is present:

- destroy each processed proxy and original body exactly as today
- populate `killedEntityIds`
- populate `killedEntityPresentations`

If `destroy_assigned_bodies` is absent:

- do not destroy proxies
- do not destroy original bodies
- do not populate `killedEntityIds`
- do not populate `killedEntityPresentations`
- instead, enqueue one `RECALL_PROXY` command for each successfully processed proxy using the existing recall path

This is mandatory. No direct inline proxy-retarget mutation is allowed in the handler.

### Completion pulse contract

After the handler finishes the batch, it must set:

- `state.assignment_complete_pulse.value = 1`

This remains the trigger source for `assignment_complete`.

### One-off runtime contract

If the station has compiled one-off depletion state (`state.is_depleted` exists):

- set `state.is_depleted.value = 1` when the batch completes

Once depleted:

- no future dispatch to that assignment station is allowed
- no future digestion for that station is allowed
- the existing GC rule determines when the entity is killed

### Cave counter contract

These counters remain absorption-specific and must only increment when bodies are actually destroyed:

- `cave_evt_absorption_complete`
- `cave_evt_butchered`

Therefore:

- increment them only when `destroy_assigned_bodies` is present and at least one body was destroyed
- do not increment them for non-destructive assignments

### Callout / notification contract

The “bodies absorbed” runtime callout must be driven by actual destruction, not by processed count.

Therefore:

- `processedCount` remains “number of processed assignments” metadata
- “bodies absorbed” callouts must use `killedEntityIds.length`

---

## 5.4 Assignment card presentation contract

The assignment card must show the node description only.

It must not show any hard-coded absorption / butcher narrative text.

### Required visible content

The card continues to show:

- title
- suspicious activity indicator
- node description
- conditional activation notice
- assignment requirements
- progress bar when active
- abort button when active
- select bodies button when idle and not depleted

### Forbidden visible content

The card must no longer render:

- `CaveActiveText`
- `CaveInactiveText`
- `ButcherActiveText`
- `ButcherInactiveText`
- any `narrativeText` data plumbing

### Depleted card behavior

When `isDepleted === true` and there are no active assigned ids:

- render the card normally
- render the description normally
- render the requirements section normally
- do not render `Select Bodies`
- do not open the selector modal

No replacement copy is introduced in this task.

---

## 6. Implementation plan by file

## 6.1 Data schema and compiler

### `data/schemas/abilities/assignment.ts` — modify

**Responsibility**

Defines the editor-facing assignment ability contract.

**Logic**

- Remove `processing_outputs`
- Remove `processing_absorbs_habiti`
- Add `oneOff: boolean`
- Add `results: AssignmentResult[]`
- Add discriminated result schemas
- Add schema validation for singleton-result duplication and spawn-resource attribute rules

**Interface**

Export the following additional types:

- `AssignmentResultConfig`
- `AssignmentSpawnResourceResultConfig`

The authoring interface after this change is the canonical contract for assignment behavior.

---

### `engine/compiler/CompilerService.ts` — modify

**Responsibility**

Wires ability compilers with the full authored ability set.

**Logic**

- Change the assignment compiler call to pass `abilities` so the assignment compiler can reuse `createCycleGcRule(fullAbilities?.storage)` for one-off GC.
- Do not otherwise reorder the compiler pipeline.

**Interface**

The compiler service public interface does not change.

---

### `engine/compiler/abilities/assignmentCompiler.ts` — modify

**Responsibility**

Compiles the editor-facing assignment ability into runtime components, hidden state, and system rules.

**Logic**

- Keep the current assignment component emission.
- Keep the current progress-state emission (`absorption_duration`, `absorption_progress`).
- Keep the current completion pulse preparation.
- Translate authored `results` into hidden runtime state:
  - `spawn_resource` → `processing_outputs`
  - `transfer_habiti` → `processing_absorbs_habiti`
  - `destroy_assigned_bodies` → `processing_destroys_assigned_bodies`
- If `oneOff` is true:
  - ensure `state.is_depleted = { value: 0, visible: false }` exists
  - append the existing cycle GC rule using `createCycleGcRule`
- Do not rename existing absorption-named progress keys in this task.

**Interface**

Update the function signature to accept the full abilities object:

- current: `(draft, config)`
- target: `(draft, config, fullAbilities?)`

No other public compiler contract changes.

---

## 6.2 Runtime processing

### `game/handlers/absorptionBatchEntities.ts` — modify

**Responsibility**

Holds low-level helpers shared by assignment completion handlers.

**Logic**

Add small helper readers for:

- `processing_destroys_assigned_bodies`
- `is_depleted`

Keep all existing entity resolution / destruction / assignment reset helpers intact.

**Interface**

Add exported helpers:

- `doesProcessingDestroyBodies(station): boolean`
- `isEntityDepleted(entity): boolean`

No existing helper signatures change.

---

### `game/handlers/absorptionBatchOutputs.ts` — modify

**Responsibility**

Resolves resource-spawn output configs from hidden runtime state and computes output amounts.

**Logic**

- Keep `calculateLifetimeXp` unchanged.
- Keep `resolveOutputAmount` unchanged.
- Remove the implicit default XP output.
- `resolveProcessingOutputs` must return an empty array when no compiled spawn-resource results exist.

**Interface**

Keep the exported function names unchanged.

This is important to avoid unnecessary downstream churn.

---

### `game/handlers/absorptionBatchProcessing.ts` — modify

**Responsibility**

Executes the per-assigned-body completion work for one batch.

**Logic**

- Read the destroy flag via `doesProcessingDestroyBodies(station)`.
- Keep resource spawning and habiti computation on the existing pipelines.
- Only collect `killedEntityIds` / `killedEntityPresentations` when destruction is enabled.
- Only call `destroyProxy` when destruction is enabled.
- Track and return the successfully processed proxy ids so the handler can recall them when destruction is disabled.

**Interface**

Extend the return payload with:

- `completedProxyIds: string[]`

All existing returned fields remain and keep their meaning.

---

### `game/handlers/AbsorbBatchHandler.ts` — modify

**Responsibility**

Orchestrates assignment completion for a station.

**Logic**

- Keep the current station/context resolution flow.
- Keep the existing metadata, habiti update, and announcement hooks.
- After `processAssignedEntities` returns:
  - if destruction is enabled, keep current destroy behavior
  - if destruction is disabled, enqueue `RECALL_PROXY` for each `completedProxyId` using `context.commands`
- Always clear assignment and reset progress.
- Always set `assignment_complete_pulse = 1`.
- If the station is one-off-configured (`state.is_depleted` exists), set `state.is_depleted.value = 1`.
- Increment absorption/butcher cave counters only when destruction is enabled and at least one body was destroyed.

**Interface**

The handler type remains:

- `RuntimeCommandType.ABSORB_BATCH`

No new runtime command type is introduced.

---

### `game/handlers/DispatchProxyHandler.ts` — modify

**Responsibility**

Validates and creates outbound / inbound body proxies.

**Logic**

Before creating a proxy:

- if `targetId` resolves to an entity with an assignment component and `state.is_depleted.value === 1`, reject the command
- log loudly through telemetry
- do not create the proxy
- do not mutate the source body lock state

This is the command-boundary enforcement for one-off assignment depletion.

**Interface**

No public interface change.

---

### `game/systems/absorption/absorptionDigestion.ts` — modify

**Responsibility**

Advances timed assignment completion.

**Logic**

- If the station is depleted (`state.is_depleted.value === 1`), return early and do not advance progress.
- Otherwise keep the current digestion behavior unchanged.

**Interface**

No public interface change.

---

### `game/runtime-events/habitiRuntimeEvents.ts` — modify

**Responsibility**

Converts `ABSORB_BATCH` command metadata into runtime node callouts.

**Logic**

- Keep the habiti-gained callout behavior unchanged.
- Change the absorption-complete callout to use `killedEntityIds.length` instead of `processedCount`.

**Interface**

No public interface change.

---

## 6.3 Runtime card cleanup

### `ui/runtime/world/selection/job-card/jobCardTypes.ts` — modify

**Responsibility**

Defines the hydrated data contract for assignment job cards.

**Logic**

- Remove `narrativeText`
- Add `isDepleted: boolean`

**Interface**

`AssignmentJobCardData` becomes:

- `label`
- `description`
- `assignedIds`
- `duration`
- `isSelectorOpen`
- `isDepleted`
- `requirements`
- `suspiciousActivity`

No narrative field remains.

---

### `ui/runtime/world/selection/job-card/resolveJobCardData.ts` — modify

**Responsibility**

Builds assignment card data from runtime state.

**Logic**

- Remove `getAbsorptionNarrative` import and usage.
- Continue reading description via `resolveVisibleEntityDescription`.
- Read `isDepleted` from `state.is_depleted.value === 1`.
- Keep duration / requirements / suspicious activity resolution unchanged.

**Interface**

The function return type changes only via the updated `AssignmentJobCardData` shape.

---

### `ui/runtime/world/selection/job-card/jobCardHydration.ts` — modify

**Responsibility**

Controls hydration dependencies and equality for assignment job cards.

**Logic**

- Remove `narrativeText` from equality.
- Add `isDepleted` to equality.

**Interface**

No public interface change.

---

### `ui/runtime/world/selection/absorption/AbsorptionCard.tsx` — modify

**Responsibility**

Renders the assignment job card.

**Logic**

- Keep the header description rendering.
- Remove all rendering of `narrativeText`.
- Preserve requirements and progress rendering.
- Active state:
  - keep progress bar
  - keep abort action
- Idle and not depleted state:
  - keep `Select Bodies`
  - keep modal
- Idle and depleted state:
  - render no actions
  - render no modal trigger

**Interface**

The component props remain the same shape except that `data.narrativeText` no longer exists and `data.isDepleted` is required.

---

### `ui/runtime/world/selection/absorption/absorptionNarrative.ts` — delete

**Responsibility**

Currently supplies hard-coded assignment narrative text.

**Logic**

Delete the file entirely.

**Interface**

No replacement file is introduced.

The card must use authored description only.

---

## 6.4 Devtools authoring UI

### `ui/devtools/editors/blueprint/mode/forms/AssignmentAbilityForm.tsx` — modify

**Responsibility**

Top-level editor form for the assignment ability.

**Logic**

- Add a `One-Off` boolean field.
- Replace the current outputs section import with the new results section.
- Keep slots / locking / duration / showProgress / filters / minimums unchanged.

**Interface**

Rendered assignment fields become:

- Slots
- Locking
- Processing Duration (s)
- Show Progress
- One-Off
- Filters
- Minimums
- Results

---

### `ui/devtools/editors/blueprint/mode/forms/AssignmentResultsSection.tsx` — add

**Responsibility**

Owns the `results` array authoring UI.

**Logic**

- Read and write `${basePath}.results`
- Render rows in authored order
- Provide three explicit add buttons:
  - `Add Destroy Bodies`
  - `Add Spawn Resource`
  - `Add Transfer Habiti`
- Disable `Add Destroy Bodies` if a destroy row already exists
- Disable `Add Transfer Habiti` if a transfer row already exists
- Keep `Add Spawn Resource` always enabled

**Interface**

Consumes:

- `basePath`
- `filename`

Renders the results section and delegates row rendering to `AssignmentResultRow`.

---

### `ui/devtools/editors/blueprint/mode/forms/AssignmentResultRow.tsx` — add

**Responsibility**

Renders one authored assignment result row.

**Logic**

- For `destroy_assigned_bodies`:
  - render a label-only row plus remove button
- For `transfer_habiti`:
  - render a label-only row plus remove button
- For `spawn_resource`:
  - reuse the current output-editing controls:
    - resource
    - source
    - attribute when needed
    - factor
    - target
    - remove button

**Interface**

Props must include:

- `filename`
- `path`
- `result`
- `onDelete`

The row component is purely presentational / draft-writing and contains no business logic.

---

### `ui/devtools/editors/blueprint/mode/forms/AssignmentOutputsSection.tsx` — delete

**Responsibility**

Currently renders the legacy processing output / habiti UI.

**Logic**

Delete the file entirely.

**Interface**

No compatibility shim is required.

---

## 6.5 Authored content / bootstrap snapshot

### `data/raw/example/modules/absorption.bp` — modify

**Responsibility**

Example authored absorption node.

**Logic**

Replace legacy assignment authoring fields with:

- one `spawn_resource` result for XP
- one `transfer_habiti` result

Do not change any unrelated blueprint data.

**Interface**

The blueprint remains a valid example of a destructive absorption station once paired with the destroy result.

Include the destroy result in this blueprint.

---

### `data/raw/example/modules/butcher.bp` — modify

**Responsibility**

Example authored butcher node.

**Logic**

Replace legacy assignment authoring fields with:

- one `spawn_resource` result for food
- one `destroy_assigned_bodies` result

Do not introduce `transfer_habiti`.

**Interface**

The blueprint remains a valid example of a destructive non-habiti assignment processor.

---

### `engine/vfs/bootstrap.absorption.test.ts` — modify

**Responsibility**

Protects the public bootstrap asset contract for the absorption blueprint.

**Logic**

Update the assertion so it checks that the authored assignment results include the transfer-habiti result instead of checking the removed legacy boolean.

**Interface**

No public interface change.

---

### `public/bootstrap/vfs-prod.json` — modify

**Responsibility**

Checked-in bootstrap VFS snapshot referenced by the bootstrap test.

**Logic**

Regenerate or update the tracked snapshot so the authored `absorption.bp` and `butcher.bp` changes are reflected in the snapshot.

**Interface**

This is data-only. No schema change outside the authored assignment payload.

---

## 7. Files intentionally not changed

These files continue to work via the preserved hidden runtime state contract and should remain untouched unless implementation proves otherwise:

- `game/handlers/resolveAbsorptionHabitiOutcome.ts`
- `ui/runtime/world/selection/absorption/resolveAbsorptionPreview.ts`
- `game/systems/facts/absorptionOngoingFact.ts`
- `ui/runtime/world/selection/absorption/BodySelector.tsx`
- `ui/runtime/world/selection/absorption/BodySelectorView.tsx`
- `ui/runtime/world/selection/absorption/useBodySelector.ts`
- `ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.ts`

Reason:

- they already depend on the preserved hidden runtime state keys, not the legacy editor fields directly

---

## 8. Tests

All new or updated tests must follow the project testing contract:

- behavior-focused
- Given / When / Then structure
- no UI business-logic assertions outside the UI wiring layer

## 8.1 Schema tests

### `data/schemas/abilities/assignment.test.ts` — add

**Cases**

1. accepts a valid results array with destroy + transfer + multiple spawn-resource rows
2. rejects duplicate `destroy_assigned_bodies`
3. rejects duplicate `transfer_habiti`
4. rejects `spawn_resource` with `source = attribute` and missing `attribute`
5. rejects `spawn_resource` with `source != attribute` and authored `attribute`
6. defaults `oneOff` to `false`
7. defaults `results` to `[]`

---

## 8.2 Compiler tests

### `engine/compiler/abilities/assignmentCompiler.test.ts` — modify

**Cases**

1. compiles `spawn_resource` rows into hidden `processing_outputs`
2. compiles `transfer_habiti` into hidden `processing_absorbs_habiti`
3. compiles `destroy_assigned_bodies` into hidden `processing_destroys_assigned_bodies`
4. compiles one-off assignment with `state.is_depleted`
5. appends the existing GC rule when one-off is enabled
6. keeps progress bar behavior unchanged

---

## 8.3 Runtime handler tests

### `game/handlers/AbsorbBatchHandler.test.ts` — modify

**Replace the current default-output expectation.**

**Cases**

1. when no processing results exist:
   - no transfer nodes are created
   - no bodies are killed
   - processed proxies are recalled
   - assignment is cleared
   - progress is reset
   - completion pulse is raised

---

### `game/handlers/AbsorbBatchHandler.multiOutput.test.ts` — modify

**Cases**

1. when spawn-resource rows exist and destruction is enabled:
   - resources go to the configured targets
   - bodies are destroyed

Add the destroy-state flag to the station fixture because destruction is no longer implicit.

---

### `game/handlers/AbsorbBatchHandler.processingResult.test.ts` — modify

**Cases**

1. when habiti transfer and spawn-resource outputs exist without destruction:
   - metadata still contains XP and resource totals
   - new habiti announcement still occurs
   - bodies are not destroyed
   - processed proxies are recalled

---

### `game/handlers/AbsorbBatchHandler.killedIds.test.ts` — modify

**Cases**

1. `killedEntityIds` are only populated when destruction is enabled
2. without destruction, `killedEntityIds` is empty

---

### `game/handlers/AbsorbBatchHandler.caveEvents.test.ts` — modify

**Cases**

1. destructive butcher completion increments both absorption and butcher counters
2. destructive non-butcher completion increments absorption only
3. non-destructive assignment completion increments neither counter

---

### `game/handlers/AbsorbBatchHandler.deadAssignments.test.ts` — modify

**Cases**

1. dead / missing assignments are still pruned correctly
2. killed ids are emitted only for surviving processed bodies when destruction is enabled

---

### `game/handlers/DispatchProxyHandler.test.ts` — modify

**Cases**

1. dispatch to a depleted assignment station is rejected
2. no proxy is created on rejection
3. the original body is not locked on rejection

---

## 8.4 System tests

### `game/systems/AbsorptionSystem.test.ts` — modify

**Cases**

1. a depleted station does not advance progress
2. a depleted station does not enqueue `ABSORB_BATCH`

---

## 8.5 Runtime event tests

### `game/runtime-events/habitiRuntimeEvents.test.ts` — add

**Cases**

1. destructive completion emits the bodies-absorbed callout based on `killedEntityIds`
2. non-destructive completion does not emit the bodies-absorbed callout even when `processedCount > 0`
3. habiti-gained callout still emits when `newHabiti` is present

---

## 8.6 UI card tests

### `ui/runtime/world/selection/absorption/AbsorptionCard.test.tsx` — modify

**Cases**

1. idle non-depleted card still shows `Select Bodies`
2. active card still shows progress and `Abort`
3. depleted idle card shows neither `Select Bodies` nor hard-coded narrative text
4. card renders the description exactly once

---

### `ui/runtime/world/selection/absorption/AbsorptionCard.suspicious.test.tsx` — modify

**Cases**

1. update fixture shape to remove `narrativeText`
2. ensure suspicious pill rendering still works

---

### `ui/runtime/world/selection/ConditionalActivationJobCards.test.tsx` — modify

**Cases**

1. update fixture shape to remove `narrativeText`
2. conditional activation notice still renders in the assignment card

---

## 8.7 Devtools form tests

### `ui/devtools/editors/blueprint/mode/AssignmentAbilityForm.test.tsx` — add

**Cases**

1. renders the `One-Off` checkbox
2. `Add Destroy Bodies` creates one destroy row and then disables the add button
3. `Add Transfer Habiti` creates one transfer row and then disables the add button
4. `Add Spawn Resource` adds editable spawn-resource rows repeatedly

This test is UI wiring only; it must not assert compiler behavior.

---

## 9. Exact implementation decisions

These decisions are mandatory and remove ambiguity.

1. **No new runtime command type is introduced.**
   - Completion remains `ABSORB_BATCH`.

2. **Destruction is no longer implicit.**
   - It happens only when `destroy_assigned_bodies` is authored.

3. **No authored results means no side effects except completion / cleanup / recall / pulse.**
   - No implicit XP output.
   - No implicit body destruction.
   - No implicit habiti transfer.

4. **Non-destructive completion returns proxies via the existing recall path.**
   - This must be implemented with `RECALL_PROXY`, not direct ad hoc mutation.

5. **One-off assignment reuses the existing cycle depletion contract.**
   - `state.is_depleted`
   - `createCycleGcRule`

6. **The assignment card shows only authored description.**
   - No hard-coded narrative replacement.

7. **Internal absorption-named runtime keys remain in place for this task.**
   - This is intentional scope control.
   - It preserves preview / save / fact plumbing.

---

## 10. Non-goals and forbidden work

The implementation must not:

- rename `ABSORB_BATCH`
- rename `absorption_progress` or `absorption_duration`
- refactor the body selector preview system
- refactor the notification system
- introduce a new generalized “processing engine” abstraction
- touch unrelated blueprints
- modify `lure_accountant.bp`
- add placeholder TODOs
- silently swallow depleted-station dispatch errors

---

## 11. Completion checklist

The implementation is complete only when all of the following are true:

- assignment authoring uses `results` and `oneOff`
- destruction is explicit and optional
- no-results assignment completion recalls bodies and still raises `assignment_complete`
- assignment one-off depletes and uses the existing GC contract
- assignment card shows only the node description
- hard-coded absorption / butcher narrative text and its data plumbing are removed
- absorption and butcher example blueprints are migrated
- bootstrap snapshot test is updated and passing
- all listed tests are green

