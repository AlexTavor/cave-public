# LLD — Assignment Node Body Selection, Assignment Start Gating, Pointer Preview, and Direct Understanding Rewards

## 1. Basis and constraints

This design is based on direct inspection of the provided repository snapshot and the three uploaded project-governance documents.

### 1.1 Governing rules that this design follows

- Runtime state remains owned by ECS; UI emits commands only.
- Command validation belongs in apply-time handlers; UI-only enforcement is insufficient.
- Existing commands, selectors, hooks, and utilities must be reused where they already express the needed contract.
- Tests must be behavior-first, use existing factories/harnesses, and cover happy path, negative path, and edge cases.

### 1.2 Files inspected to derive this design

The design below is grounded in the current behavior of these files:

- Assignment/runtime/core
  - `src/game/assignment/bodyAssignment.ts`
  - `src/game/assignment/assignmentNodeKinds.ts`
  - `src/game/assignment/assignmentMinimums.ts`
  - `src/game/assignment/assignmentFilterUtils.ts`
  - `src/game/assignment/assignmentDurationMs.ts`
  - `src/game/handlers/AssignBodiesBatchHandler.ts`
  - `src/game/handlers/resolveBodyProcessingCommand.ts`
  - `src/game/handlers/processingPendingHabiti.ts`
  - `src/game/handlers/resolveAbsorptionHabitiOutcome.ts`
  - `src/game/systems/ProcessingNodeSystem.ts`
  - `src/game/systems/body-assignment/orbitAssignedBody.ts`
  - `src/game/systems/body-assignment/orbitLayout.ts`
  - `src/game/systems/body-assignment/processingOrbit.ts`
  - `src/game/systems/processingProgress.ts`

- Pointer
  - `src/game/systems/PointerSystem.ts`
  - `src/game/systems/pointer/pointerState.ts`
  - `src/game/systems/pointer/pointerSystemActions.ts`
  - `src/game/systems/pointer/pointerDropChoice.ts`
  - `src/game/systems/pointer/pointerPickupBodies.ts`
  - `src/engine/phaser/pointer/PointerPreviewSystem.ts`
  - `src/data/schemas/v2/pointerSystemDefaults.ts`

- Selection / card / selector UI
  - `src/ui/runtime/world/selection/selectionLensMap.ts`
  - `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`
  - `src/ui/runtime/world/selection/job-card/jobCardTypes.ts`
  - `src/ui/runtime/world/selection/job-card/jobCardHydration.ts`
  - `src/ui/runtime/world/selection/job-card/AssignmentJobCardView.tsx`
  - `src/ui/runtime/world/selection/absorption/useAbsorptionActions.ts`
  - `src/ui/runtime/world/selection/absorption/useAbsorptionData.ts`
  - `src/ui/runtime/world/selection/absorption/BodySelector.tsx`
  - `src/ui/runtime/world/selection/absorption/BodySelectorView.tsx`
  - `src/ui/runtime/world/selection/absorption/useBodySelector.ts`
  - `src/ui/runtime/world/selection/absorption/useBodySelectorCandidateIds.ts`
  - `src/ui/runtime/world/selection/absorption/absorptionUtils.ts`
  - `src/ui/runtime/world/selection/absorption/resolveAssignmentSlots.ts`
  - `src/ui/runtime/world/pointer/usePointerBodySelector.ts`
  - `src/ui/runtime/world/pointer/PointerSelectorOverlay.tsx`
  - `src/ui/runtime/world/pointer/resolvePointerSelectorPreview.ts`

- Assignment schema/compiler and direct-understanding support
  - `src/data/schemas/assignment.ts`
  - `src/data/schemas/assignmentRules.ts`
  - `src/data/schemas/abilities/assignment.ts`
  - `src/engine/compiler/abilities/assignmentCompiler.ts`
  - `src/engine/runtime/systems/behavior/actionExecutorGainUnderstanding.ts`
  - `src/game/handlers/GainUnderstandingHandler.ts`
  - `src/data/raw/example/modules/progression.draft`
  - `src/data/raw/example/modules/understanding/*.bp`

## 2. Current-state findings that drive the design

1. Generic processing assignment nodes already exist at runtime. `butcher`, `absorption`, `lure_accountant`, and story nodes compile to the same `assignment` + processing-state contract. The limitation is not the runtime model; it is the selection/card surface and pointer/drop validation.
2. The job-card route currently excludes generic processing nodes because `selectionLensMap.ts` only treats `processing_absorbs_habiti === true` as an assignment-node signal. That admits absorption, but not butcher and other assignment processors.
3. The existing reusable selector stack already exists:
   - `BodySelector.tsx`
   - `BodySelectorView.tsx`
   - `useBodySelector.ts`
   - `resolveAssignmentRequirementsData(...)`
   - `resolveAbsorptionPreview(...)`
4. The existing selectors currently block confirmation until minimums are satisfied. That conflicts with the requested runtime behavior where bodies may be assigned early and wait motionless until the node is ready.
5. The current apply-time assignment handler does not enforce assignment filter or slot limits. Any caller that emits `ASSIGN_BODIES_BATCH` can currently bypass UI constraints.
6. The current processing orbit implementation already uses `assignment_progress_ms` as the orbit clock for processing owners. Therefore, if progress does not advance, orbiting bodies naturally sit still after offsets are seeded. This means the “orbit but not moving until ready” requirement can be satisfied by changing processing progress gating only; no orbit-motion rewrite is needed.
7. The current pointer preview line is not tied to the body that would actually be dropped. It uses aggregate carried-body preview state and always originates from the pointer center.
8. Direct `GAIN_UNDERSTANDING` already exists in the behavior pipeline and already defaults to `sys_world` when `entityId` is omitted. Story blueprints do not need new engine support; they only need data changes.

## 3. Scope and non-goals

### 3.1 In scope

- Restore card-driven body selection for all processing assignment nodes.
- Allow assignment before minimums are met.
- Enforce assignment filter and slot limits in the authoritative apply path.
- Make the pointer preview reflect the exact next body that would be dropped.
- Add pointer carry glow.
- Replace understanding-carrier wrappers in the identified story/progression data with direct understanding grants.

### 3.2 Out of scope

- No new command types.
- No new assignment schema fields.
- No rename of legacy `absorption_duration` state. The current runtime already treats it as the generic assignment duration fallback; renaming it would widen scope without functional gain.
- No changes to vein-network graph construction. The pointer preview line remains owned by `PointerPreviewSystem`; it is not moved into the global vein graph.
- No changes to `assignmentCompiler.ts`, `GainUnderstandingHandler.ts`, or `actionExecutorGainUnderstanding.ts`; those already support the requested behavior.
- No changes to the nearest-target selection algorithm for the pointer. The pointer may still target the nearest assignable node under current rules; the preview line simply disappears when no carried body is valid for that target.

## 4. Detailed design

### 4.1 Restore body selection on assignment-node cards

#### Why

The runtime already supports generic processing assignment nodes, but the current card route only exposes the selector flow to nodes with `processing_absorbs_habiti === true`. That hides body selection from butcher and similar nodes even though they already use the same assignment/processing runtime contract.

#### What

- All processing assignment nodes use the job-card lens.
- The assignment job card exposes a `Select Bodies` button whenever the node is not depleted, not inactive, and can still accept additional bodies.
- The assignment job card keeps `Abort` whenever one or more bodies are already assigned.
- `Select Bodies` and `Abort` may be visible at the same time.
- Opening the selector uses the existing `body_selector_open` run-fact contract and the existing pause/resume behavior already implemented by `useAbsorptionActions.ts`.
- Confirming the selector assigns every selected body to the card’s node by emitting one `ASSIGN_BODIES_BATCH` command containing one update per selected body.

#### How

#### `src/ui/runtime/world/selection/selectionLensMap.ts`

**Responsibility**
- Decide which selection card a runtime entity uses.

**Change**
- Replace the local absorption-specific assignment-node check with the shared runtime predicate `isProcessingAssignmentNode(...)`.

**Interface**
- `resolveSelectionLens(entity, runtime)` remains unchanged.
- No new lens IDs are introduced.

#### `src/ui/runtime/world/selection/selectionLensMap.job.test.ts`

**Responsibility**
- Lock the card-routing contract.

**Change**
- Update the expectation so a generic processing assignment node (for example a butcher-like node with `assignment` plus processing state) resolves to the `job` lens.
- Preserve the assertion that `sys_pointer` does not resolve to `job`.

**Interface**
- Test-only change.

#### `src/ui/runtime/world/selection/job-card/jobCardTypes.ts`

**Responsibility**
- Define the UI data contract for job cards.

**Change**
- Extend `AssignmentJobCardData` with `canAssignMoreBodies: boolean`.

**Interface**
- New field on `AssignmentJobCardData`:
  - `canAssignMoreBodies`: true when the node still has remaining assignment capacity under current slot rules; false otherwise.

#### `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`

**Responsibility**
- Derive the complete assignment-card view model from runtime state.

**Change**
- Read `isSelectorOpen` from `sys_world.run.body_selector_open.world`, matching the existing selector-open fact contract already used by `useAbsorptionData.ts`.
- Compute `canAssignMoreBodies` from the existing slot contract using `resolveAssignmentSlots(runtime, liveEntity, entity)` and the current assigned-body count.
- Keep the existing requirements, storage, description, inactive/depleted, suspicious-activity, and duration behavior.

**Interface**
- Return type remains `AssignmentJobCardData`, now including `canAssignMoreBodies`.

#### `src/ui/runtime/world/selection/job-card/jobCardHydration.ts`

**Responsibility**
- Describe the invalidation inputs and equality contract for job-card hydration.

**Change**
- Equality for assignment cards must include `canAssignMoreBodies`.
- No hydration-plan expansion is required beyond the current assignment-card plan because it already includes the target entity, `sys_world`, assigned bodies, entity-list revision, and blueprint revision.

**Interface**
- Function signatures unchanged.

#### `src/ui/runtime/world/selection/job-card/AssignmentJobCardView.tsx`

**Responsibility**
- Render the interactive assignment-node card using the resolved view model.

**Change**
- Reuse `useAbsorptionActions.ts` for selector open/close, assign, recall, and runtime pause/resume.
- Render requirements and storage unconditionally, as today.
- Render `Select Bodies` when all of the following are true:
  - `data.isDepleted === false`
  - `data.isInactive !== true`
  - `data.canAssignMoreBodies === true`
- Render `Abort` when `data.assignedIds.length > 0`.
- Mount the existing `BodySelector` modal from this card.
- On selector confirm:
  1. enqueue assignment updates for all selected bodies to `entity.id`
  2. close the selector
- On selector cancel/close:
  - close the selector only
- On `Abort`:
  - recall all currently assigned bodies to `sys_world`

**Interface**
- Prop signature unchanged.
- No new local state store.
- This component becomes the production interaction surface for generic assignment cards; no new card component is introduced.

#### `src/ui/runtime/world/selection/job-card/AssignmentJobCardView.test.tsx`

**Responsibility**
- Lock the assignment-card interaction contract.

**Change**
- Replace the current smoke-only expectation with behavior tests that verify:
  - `Select Bodies` is rendered when `canAssignMoreBodies === true`
  - `Abort` is rendered when `assignedIds.length > 0`
  - both actions can coexist
  - no `Select Bodies` button is shown when depleted or inactive
  - selector open state tracks `isSelectorOpen`

**Interface**
- Test-only change.

#### Explicit card behavior contract

- Minimum requirements are displayed on the card and in the selector, but they do not block assignment.
- Slot limit controls whether the node can take more bodies, not whether the card can exist.
- If a node is full, `Select Bodies` is not shown.
- If a node is empty and can take bodies, only `Select Bodies` is shown.
- If a node has assigned bodies and still has remaining capacity, both `Select Bodies` and `Abort` are shown.

### 4.2 Change selector semantics so minimums gate processing, not assignment

#### Why

The requested runtime behavior explicitly allows partial assignment before minimums are met. The current selectors do the opposite: they block confirmation until minimums are satisfied.

#### What

- `Proceed` is enabled for any non-empty selection that respects filter and slot rules.
- Minimum rows remain visible but become informational, not confirm-blocking.
- The card selector and the pointer selector use the same rule.

#### How

#### `src/ui/runtime/world/selection/absorption/useBodySelector.ts`

**Responsibility**
- Own selection state and confirm gating for the card-driven body selector.

**Change**
- Replace minimum-based confirm gating with non-empty-selection gating.
- Enforce remaining capacity instead of total capacity.
- Remaining capacity is defined as: resolved slot limit minus the node’s current assigned-body count.
- Keep drag-selection behavior.
- Keep the existing preview and requirements calculation.

**Interface**
- Returned shape remains the same.
- Semantic change:
  - `canConfirm` now means “at least one body is selected and selection respects capacity,” not “minimums are satisfied.”

#### `src/ui/runtime/world/selection/absorption/useBodySelectorCandidateIds.ts`

**Responsibility**
- Produce the candidate body ID list shown in the card selector.

**Change**
- Exclude bodies already assigned to the current station from the candidate list.
- Keep existing locked-body and filter-based exclusion.
- Keep existing sort order.

**Interface**
- Function signature unchanged.

#### `src/ui/runtime/world/selection/absorption/absorptionUtils.ts`

**Responsibility**
- Shared candidate filtering and sorting helpers for the card selector.

**Change**
- Extend `filterCandidates(...)` so the current target’s already-assigned bodies are excluded.
- Keep `matchesAssignmentFilters(...)` as the filter authority.
- Keep sort helpers unchanged.

**Interface**
- Function signature unchanged.
- Semantic change: `filterCandidates(...)` now excludes bodies already owned by the station passed to it.

#### `src/ui/runtime/world/selection/absorption/BodySelector.test.tsx`

**Responsibility**
- Lock selector behavior.

**Change**
- Remove the old expectation that unmet minimums disable `Proceed`.
- Add explicit coverage for:
  - partial assignment allowed even when minimums are unmet
  - already-assigned target bodies are not listed as candidates
  - selection capacity is remaining slots, not total slots
  - existing blueprint-slot fallback still works

**Interface**
- Test-only change.

### 4.3 Enforce assignment validity in the authoritative runtime path

#### Why

UI filtering alone is not authoritative. `ASSIGN_BODIES_BATCH` is emitted from multiple places, including pointer actions and runtime systems. The apply phase must reject invalid assignments loudly.

#### What

- Filter mismatch and slot exhaustion are rejected by the command handler.
- Rejection logs loudly and skips that specific update; no silent fallback occurs.
- Minimum rules are not part of assignment validity. They are start conditions only.

#### How

#### `src/game/assignment/assignmentAcceptance.ts` (new)

**Responsibility**
- Single source of truth for “can this body be assigned to this owner right now?” under the existing assignment contract.

**Exports / interface**
- `readAssignmentSlotLimit(owner) -> number`
  - Returns a positive finite slot limit when `owner.assignment.slots > 0`.
  - Returns infinity when the owner has no slot limit under current runtime semantics.
- `resolveRemainingAssignmentSlots({ owner, ignoreBodyId? }) -> number`
  - Counts current assigned IDs, excluding `ignoreBodyId` when provided.
- `canAssignBodyToOwner({ body, owner, ignoreBodyId? }) -> { allowed, reason }`
  - `reason` is one of:
    - `ok`
    - `filter_mismatch`
    - `slots_full`
- `filterAssignableBodies({ bodies, owner }) -> RuntimeEntity[]`
  - Returns only bodies that pass `canAssignBodyToOwner(...)`.

**Logic**
- Uses existing `matchesAssignmentFilters(...)` and `readAssignedIds(...)`.
- Does not know about minimums.
- Treats unrestricted owners consistently with the current runtime contract.

#### `src/game/assignment/assignmentAcceptance.test.ts` (new)

**Responsibility**
- Lock the new assignment-validity helper contract.

**Required coverage**
- happy path: allowed body for unrestricted owner
- negative path: filter mismatch rejected
- negative path: slot-full owner rejected
- edge case: reassigning the same body to the same full owner is allowed when `ignoreBodyId` is used
- edge case: slot value `0` behaves as unlimited, matching current slot semantics

#### `src/game/handlers/AssignBodiesBatchHandler.ts`

**Responsibility**
- Apply `ASSIGN_BODIES_BATCH` updates to the authoritative world state.

**Change**
- Before mutating ownership:
  - validate the target/body pair through `canAssignBodyToOwner(...)`
- If invalid:
  - log a specific error message containing the body ID, owner ID, and rejection reason
  - skip that update only
- If valid:
  - preserve existing behavior for removal, sorted insertion, progress reset, required-ms reset, and assignment-status update

**Interface**
- Command type and payload unchanged.
- New runtime behavior: filter and slot violations are rejected in apply phase.

#### `src/game/handlers/AssignBodiesBatchHandler.validation.test.ts` (new)

**Responsibility**
- Lock apply-time validation behavior.

**Required coverage**
- rejects filter-mismatched body and logs loudly
- rejects slot-full assignment and logs loudly
- does not mutate ownership for rejected updates
- still applies valid updates in the same batch when another update is rejected

### 4.4 Make minimums gate processing start only

#### Why

The user requirement is explicit: bodies may be assigned before the node is ready, and they must wait in orbit until the aggregate requirement is reached.

#### What

- Assignment is allowed before minimums are met.
- Processing progress does not advance while a node’s current assigned bodies do not satisfy its minimum rules.
- Waiting bodies remain orbiting but stationary.
- Existing progress values are preserved while the node is not ready.

#### How

#### `src/game/systems/ProcessingNodeSystem.ts`

**Responsibility**
- Advance processing-node assignment progress and emit completion commands.

**Change**
- Before progressing bodies for a processing node, compute readiness by evaluating that node’s current `assignedIds` against its `assignment.minimums` with the existing `satisfiesAssignmentMinimums(...)` utility.
- If the node is not ready:
  - do not advance `assignment_progress_ms`
  - do not advance `assignment_progress_ratio`
  - do not emit `RESOLVE_BODY_PROCESSING`
- If the node is ready:
  - preserve the current progression/completion behavior

**Why no orbit-system change is required**
- `orbitAssignedBody.ts` already uses `assignment_progress_ms` as the time basis for processing-owner orbit motion. If progress stays unchanged, the body remains stationary after orbit offsets have been seeded.

**Interface**
- System interface unchanged.
- Semantic change: minimums now affect processing progression rather than selector confirmation.

#### `src/game/systems/ProcessingNodeSystem.test.ts`

**Responsibility**
- Lock the processing-start contract.

**Required coverage**
- when minimums are unmet, progress does not advance and processing does not resolve
- when minimums become met, progress resumes from the current value and completion works as before
- seeded orbits still resolve correctly once readiness is satisfied

### 4.5 Apply the same validity and capacity rules to pointer body selection

#### Why

The pointer currently bypasses the card-selector rules in three places:
- short-drop body choice
- long-drop candidate list
- long-drop confirm gating

That creates inconsistent assignment behavior.

#### What

- Pointer short drop only considers bodies that the target can currently accept.
- Pointer long-drop selector only lists bodies that the target can currently accept.
- Pointer long-drop selector uses remaining slot capacity, not total slot capacity.
- Pointer long-drop confirm is allowed for any non-empty valid selection, even if node minimums are still unmet.

#### How

#### `src/game/systems/pointer/pointerDropChoice.ts`

**Responsibility**
- Choose the next body the pointer would drop on short release.

**Change**
- Filter carried bodies through `filterAssignableBodies({ bodies, owner: target })` before running the existing sort heuristics.
- Keep the current butcher-special-case desirability ordering and power-sink demand ordering unchanged.

**Interface**
- `resolveBestDropBodyId(...)` signature remains unchanged.
- Semantic change: returns `null` when all carried bodies are invalid for the target.

#### `src/game/systems/pointer/pointerDropChoice.test.ts` (new)

**Responsibility**
- Lock pointer short-drop validity behavior.

**Required coverage**
- filter-mismatched carried bodies are ignored
- slot-full targets return no drop body
- existing butcher ordering still applies after validity filtering

#### `src/ui/runtime/world/pointer/usePointerBodySelector.ts`

**Responsibility**
- Own long-drop selection state for the pointer selector overlay.

**Change**
- Derive `validCandidateIds` from the carried IDs using `filterAssignableBodies(...)` and the current target.
- If remaining slots are zero, expose an empty candidate list.
- Enforce remaining capacity rather than total capacity.
- Change confirm gating from “minimums satisfied” to “selection non-empty.”
- Because the pointer selector can remain open while runtime continues, prune selected IDs against the current `validCandidateIds` whenever the valid candidate set changes.
- Keep the requirements display and preview generation.

**Interface**
- Returned controller shape gains `candidateIds` representing the filtered candidate list used by the overlay.
- `canConfirm` semantic change matches the card selector.

#### `src/ui/runtime/world/pointer/PointerSelectorOverlay.tsx`

**Responsibility**
- Render the pointer long-drop selector overlay and dispatch selected assignments.

**Change**
- Pass the controller’s filtered `candidateIds` to `BodySelectorView`.
- Confirm still emits a single `ASSIGN_BODIES_BATCH` containing one update per selected body.
- Close behavior remains unchanged.

**Interface**
- Component props unchanged.

#### `src/ui/runtime/world/pointer/usePointerBodySelector.test.tsx` (new)

**Responsibility**
- Lock pointer long-drop selector behavior.

**Required coverage**
- filter mismatch removes carried bodies from the candidate list
- remaining capacity limits how many carried bodies may be selected
- unmet minimums no longer disable confirmation
- stale selections are pruned if the valid candidate set shrinks while the overlay is open

### 4.6 Make the pointer preview line represent the exact next drop body

#### Why

The current pointer preview line does not tell the truth about what will actually happen on short drop. It is based on aggregate carried state and originates from the pointer center.

#### What

- The preview source body is the same body that `handlePointerDrop(...)` would short-drop right now.
- If there is no valid next body for the current target, there is no preview line.
- The preview line begins at that body’s live physics position, not at the pointer center.
- Preview totals for power sinks are calculated from that one body only.
- Preview mode for processing nodes is still nervous, but its `amount` is one body, not the full carried-body count.

#### How

#### `src/game/systems/pointer/pointerState.ts`

**Responsibility**
- Build pointer target and preview state.

**Change**
- Change the preview-state contract so it is derived from one preview-source body, not an array of all carried bodies.
- Keep `collectPointerTargets(...)` unchanged.
- Preserve current preview fields (`amount`, `body`, `mind`, `social`, `mode`, `dominant`).
- Add one new pointer-state field written by the system: `pointer_preview_body_id`.

**Interface**
- `resolvePointerPreviewState(...)` now operates on `nextBody` plus `targetEntity`, not on all carried bodies.
- `enqueuePointerState(...)` remains unchanged; it simply receives the extra key/value pair from the caller.

#### `src/game/systems/pointer/pointerState.test.ts`

**Responsibility**
- Lock the preview-state contract.

**Required coverage**
- no next body or no target yields no preview
- processing target preview uses one body only
- power preview uses the chosen body only
- nearest-target collection stays unchanged

#### `src/game/systems/PointerSystem.ts`

**Responsibility**
- Orchestrate pointer input, targeting, preview, and drop behavior.

**Change**
- After resolving the nearest target and carried bodies:
  - compute `bestBodyId` through `resolveBestDropBodyId(...)`
  - resolve `bestBodyEntity` from that ID
  - compute preview state from `bestBodyEntity`
- Write `pointer_preview_body_id` to pointer state alongside the existing preview fields.
- Pass `bestBodyId` into short-drop handling so drop execution and preview source cannot diverge.

**Interface**
- System signature unchanged.

#### `src/game/systems/pointer/pointerSystemActions.ts`

**Responsibility**
- Execute pointer pickup/drop actions.

**Change**
- Accept the precomputed `nextBodyId` from `PointerSystem.ts` for short-drop behavior.
- On short drop:
  - if `nextBodyId` is null, do nothing
  - otherwise emit the same one-body `ASSIGN_BODIES_BATCH` as today
- Long-drop opening behavior remains unchanged.

**Interface**
- `handlePointerDrop(...)` gains one input field: `nextBodyId`.

#### `src/game/systems/pointer/pointerSystemActions.test.ts`

**Responsibility**
- Lock pointer action behavior.

**Change**
- Add drop-path coverage to the existing test file:
  - short drop emits no command when `nextBodyId` is null
  - short drop emits exactly the passed `nextBodyId` when present

### 4.7 Improve pointer visuals

#### Why

The user needs immediate visual feedback for two separate facts:
- whether the pointer is carrying bodies at all
- which exact body is about to be dropped

#### What

- The pointer displays a large faint glow whenever it carries at least one body.
- No glow is drawn when the pointer carries no bodies.
- The preview line originates from the preview-source body selected in section 4.6.
- No line is drawn when `pointer_preview_body_id` is empty or when that body has no live physics body.

#### How

#### `src/data/schemas/v2/pointerSystemDefaults.ts`

**Responsibility**
- Define the default hidden pointer state.

**Change**
- Add `pointer_preview_body_id` with default empty-string value.

**Interface**
- New hidden pointer state key:
  - `pointer_preview_body_id: string`

#### `src/engine/phaser/pointer/PointerPreviewSystem.ts`

**Responsibility**
- Render pointer targeting rings, carry glow, and preview line.

**Change**
- Add a carry-glow draw step before the existing rings when `sys_pointer.assignment.assignedIds.length > 0`.
- Reuse the existing pale pickup-ring tint for the glow so no new palette config is introduced.
- Use the current pickup radius as the glow radius; render it as a low-alpha fill so it reads as a glow, not a boundary.
- Read `pointer_preview_body_id`; when present, resolve that body’s live physics position and use that as the preview path origin.
- Preserve the current line-width and color-resolution logic.
- If `pointer_preview_body_id` is empty or missing a physics body, skip the preview line entirely.

**Interface**
- Class interface unchanged.
- New input dependency: pointer state key `pointer_preview_body_id`.

#### `src/engine/phaser/pointer/PointerPreviewSystem.test.ts` (new)

**Responsibility**
- Lock the visual contract without involving the full scene runtime.

**Required coverage**
- draws glow when pointer has carried bodies
- draws no glow when pointer carries none
- draws line from preview-source body when `pointer_preview_body_id` resolves
- draws no line when `pointer_preview_body_id` is empty

### 4.8 Replace story carrier rewards with direct understanding grants

#### Why

Direct understanding gain is already implemented and already targets `sys_world` by default. The current story blueprints still wrap that direct action inside `SPAWN_CARRIER` plus `KILL self`, which is no longer desired.

#### What

For the identified story/progression rewards:
- remove the `SPAWN_CARRIER` wrapper
- remove the nested `KILL self`
- leave a direct `GAIN_UNDERSTANDING` action only

#### How

#### Data files to change

- `src/data/raw/example/modules/progression.draft`
- `src/data/raw/example/modules/understanding/do_locals_know_of_me.bp`
- `src/data/raw/example/modules/understanding/does_patriarchy_know_of_me.bp`
- `src/data/raw/example/modules/understanding/how_big_can_i_get.bp`
- `src/data/raw/example/modules/understanding/how_did_i_come_to_be.bp`
- `src/data/raw/example/modules/understanding/how_hard_can_i_go.bp`
- `src/data/raw/example/modules/understanding/what_am_i.bp`

**Responsibility**
- Declare story/progression content.

**Change**
- In every targeted reward site, replace the `SPAWN_CARRIER` action object with a direct `GAIN_UNDERSTANDING` action object.
- Do not add `entityId`; keep the current implicit-target behavior, which resolves to `sys_world` through the existing executor.

**Interface**
- No schema change.
- No runtime change.
- Data-only change.

#### `src/engine/compiler/abilities/understandingRewardsContent.test.ts` (new)

**Responsibility**
- Lock the story/progression reward data contract.

**Required coverage**
- every targeted understanding reward contains a direct `GAIN_UNDERSTANDING`
- no targeted reward contains `SPAWN_CARRIER`
- no targeted reward retains the nested `KILL self` cleanup action

#### Repository-gap note

The provided archive references `public/bootstrap/vfs-prod.json` from several tests, but that file is not present in the supplied snapshot. Therefore this LLD does not list it as a mandatory changed file. If the working repository includes that snapshot, it must be regenerated after the raw example data changes so raw content and bootstrapped content stay aligned.

## 5. Files intentionally unchanged

These files already express the needed contract and should not be changed for this work:

- `src/engine/compiler/abilities/assignmentCompiler.ts`
  - existing assignment ability already compiles slots, filters, minimums, duration, and results
- `src/game/handlers/GainUnderstandingHandler.ts`
  - direct understanding application already exists
- `src/engine/runtime/systems/behavior/actionExecutorGainUnderstanding.ts`
  - direct understanding action emission already exists and already defaults to `sys_world`
- `src/game/systems/body-assignment/orbitAssignedBody.ts`
- `src/game/systems/body-assignment/orbitLayout.ts`
- `src/game/systems/body-assignment/processingOrbit.ts`
  - existing processing orbit implementation already gives the requested “sit still while waiting” behavior when progress does not advance
- `src/ui/runtime/world/selection/absorption/BodySelectorView.tsx`
  - presentational component remains valid
- `src/ui/runtime/world/pointer/resolvePointerSelectorPreview.ts`
  - preview payload composition remains valid once candidate selection is corrected upstream

## 6. Test plan, aligned to project testing standards

### 6.1 Unit tests

- `assignmentAcceptance.test.ts`
  - authoritative filter/slot validity rules
- `pointerDropChoice.test.ts`
  - short-drop body choice after validity filtering
- `pointerState.test.ts`
  - preview-state truthfulness for one selected body
- `understandingRewardsContent.test.ts`
  - raw content contract

### 6.2 Integration tests

- `AssignBodiesBatchHandler.validation.test.ts`
  - apply-phase rejection and mixed-validity batches
- `ProcessingNodeSystem.test.ts`
  - ready/not-ready progression behavior

### 6.3 View tests

- `AssignmentJobCardView.test.tsx`
  - card actions and selector visibility
- `BodySelector.test.tsx`
  - card selector partial-fill and remaining-capacity behavior
- `usePointerBodySelector.test.tsx`
  - pointer long-drop candidate filtering, capacity, and confirm gating
- `PointerPreviewSystem.test.ts`
  - carry glow and preview-origin drawing

### 6.4 Existing tests that must continue to pass unchanged

The following existing tests already cover adjacent contract and should remain green without semantic change:

- `src/ui/runtime/world/selection/ConditionalActivationJobCards.assignment.test.tsx`
- `src/ui/runtime/world/selection/job-card/JobCard.storage.test.tsx`
- `src/game/handlers/AssignBodiesBatchHandler.processing.test.ts`
- `src/game/systems/body-assignment/bodyAssignmentMotion.test.ts`
- `src/engine/runtime/systems/behavior/TriggeredActions.gainUnderstanding.test.ts`

## 7. Acceptance criteria

The implementation is complete only when all of the following are true:

1. Selecting butcher, absorption, and any other processing assignment node opens the job card, not a generic display/resource card.
2. The assignment job card shows `Select Bodies` whenever the node can still accept more bodies.
3. The selector can confirm partial assignments even when minimums are still unmet.
4. Bodies assigned below minimums move into processing orbit and then remain stationary.
5. Once minimums are met, those bodies begin progressing without any new command type or orbit-system rewrite.
6. `ASSIGN_BODIES_BATCH` rejects filter mismatches and slot overflow in apply phase and logs the rejection explicitly.
7. Pointer short drop never drops an invalid body.
8. Pointer long-drop selector never lists invalid bodies.
9. The preview line is drawn from the exact next short-drop body to the current target, and disappears when no valid next body exists.
10. The pointer glow appears only while the pointer is carrying bodies.
11. The targeted story/progression rewards no longer spawn carriers; they grant understanding directly.
12. All relevant tests are green and no architectural laws from the context pack are violated.
