# LLD — Assignment Processing / Pending Habiti Regression Fixes (Expanded)

## Purpose

This document is the corrective low-level design for the reviewed implementation.

It supersedes the prior regression-fix delta by expanding scope in two specific ways that were identified during the broader sweep:

1. the rebirth-preservation test contract must be fixed so it cannot silently pass while `pendingHabiti` is dropped
2. the remaining node-level assignment/absorption progress model must be removed as an authoritative or implied shared timer, because the runtime contract is now explicitly **per-body processing**, not node-batch processing

This design is grounded in the current implementation and is limited to files directly implicated by the broken runtime contract.

The design follows the canonical project rules:
- commands propose change; apply decides reality
- systems remain read-only and emit commands only
- UI observes semantic state only
- tests verify behavior, not implementation detail
- no speculative refactors outside the feature area

---

## Scope

This document covers seven contracts that must hold simultaneously after the fix:

1. Bodies assigned to assign-capable nodes must first navigate to an outer orbit band, then spiral inward in increasingly tighter circles.
2. A newly spawned body must first navigate to Cave before becoming a Cave orbiter.
3. A pending Habiti pickup must spawn at its source location, travel to Cave, and only orbit Cave after arrival.
4. A pending Habiti pickup must be claimable on interaction both in transit and after arrival.
5. Untapped pending Habiti pickups must survive `game.rebirth` by being restored from Cave state and re-materialized in the new runtime.
6. Tests that claim Cave preservation must assert the full preserved Cave contract, including `pendingHabiti`.
7. No node-level UI, background visual, or runtime state may imply a single shared assignment timer or single shared completion fraction once processing is body-local.

Out of scope:
- new gameplay features beyond these contracts
- new persistence mechanisms beyond the existing Cave state path
- refactors outside assignment motion, pending Habiti lifecycle, rebirth restoration, and node-progress cleanup
- introducing per-body progress UI beyond what is already requested

---

## Why

### A. Rebirth currently drops pending Habiti

`src/ui/runtime/terminal/commands/gameRebirthCommand.ts` extracts the full Cave through `extractRebirthCave(...)`, but the restore-side `UPDATE_CAVE` payload omits `pendingHabiti`.

Result:
- untapped Habiti pickups are lost on rebirth
- the new runtime has no Cave-level source of truth from which `PendingHabitiPickupSystem` can re-materialize them

This is a direct runtime contract violation.

### B. The movement and pickup implementation still encodes the wrong semantics

The reviewed regressions remain valid and must still be fixed together:
- assignment navigation transitions at near-contact with the node center instead of at the outer orbit band
- processing orbit skips entry-offset seeding, so the motion snaps instead of spirals
- newly spawned bodies start as Cave orbiters instead of Cave navigators
- pending Habiti pickups either spawn as already-arrived orbiters or remain immobile because their compiled physics is static
- claim is incorrectly gated to `pending_habiti_arrived === 1`
- processing completion still resolves on timer completion instead of guaranteed visual-overlap completion

### C. The existing rebirth test gives false confidence

`src/ui/runtime/terminal/commands/gameRebirthCommand.integration.test.ts` asserts that Cave is preserved but omits `pendingHabiti` from both fixture and expectation.

Result:
- the test passes while the runtime drops real Cave state
- the suite cannot detect the regression it claims to cover

This is not merely missing coverage. It is a false-positive contract test.

### D. The old node-level progress model is still partially alive in code

The current codebase still carries forward the old batch-oriented meaning of node progress in several places:

- `src/game/systems/ProcessingNodeSystem.ts` writes `absorption_progress` and `assignment_progress` on the node from the **maximum** body elapsed milliseconds
- `src/engine/compiler/abilities/assignmentCompiler.ts` still compiles node-level `absorption_progress` state and a display bar when `showProgress` is enabled
- `src/ui/runtime/world/selection/absorption/LiveAbsorptionBar.tsx`, `AbsorptionCard.tsx`, and `AssignmentJobCardView.tsx` still render a single node-level progress bar
- `src/engine/phaser/display/modules/backgroundCycleReader.ts`, `backgroundBandSelector.ts`, and `backgroundModuleRuntime.ts` still derive assignment fill from `absorption_progress`
- `src/game/systems/cave/collectCaveCandidate.ts` and `src/game/systems/cave/updateCaveSalience.ts` still read node-level absorption progress as a cave-mind signal
- `src/game/handlers/proxyAssignmentCleanup.ts` and `src/game/handlers/absorptionBatchEntities.ts` still reset node-level absorption progress as though it were authoritative station state
- `src/ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.ts` still fabricates `absorption_progress` for assignment previews
- `src/ui/devtools/editors/blueprint/mode/forms/AssignmentAbilityForm.tsx` still exposes a `Show Progress` authoring control for a runtime concept that is no longer valid

Under the agreed model, processing is per body:
- the timer is per body
- orbit tightening is per body
- completion is per body

Therefore a single node-level elapsed/max progress value is semantically wrong. It must not remain in runtime state or UI as a shared timer.

---

## What must be true after the fix

### Assignment movement
- An assigned body in `navigating` state must navigate toward the owner’s **outer orbit entry radius**, not the owner center.
- The body must switch to `orbiting` only after entering that outer orbit band.
- While orbiting, its radius must shrink as a function of that body’s own assignment progress.
- Completion must not resolve early; the completion path must coincide with visible overlap.

### New body spawn
- A newly spawned body whose owner is `sys_world` must start in `navigating` state.
- It may only become a Cave orbiter after reaching the Cave orbit entry band.

### Pending Habiti pickup movement and claiming
- A pending pickup must spawn at the source body’s position.
- It must be a movable entity while unarrived.
- It must navigate to Cave while unarrived.
- It must orbit Cave only after arrival.
- Claim interaction must succeed whether the pickup is in transit or orbiting.

### Rebirth persistence
- `pendingHabiti` must be extracted from the old runtime as part of Cave state.
- `pendingHabiti` must be restored into the new runtime’s Cave state.
- After restore, `PendingHabitiPickupSystem` must re-materialize pickup entities from restored `pendingHabiti`.
- No pickup entity itself is passport-carried across rebirth.

### Test contract
- The rebirth integration test must explicitly include `pendingHabiti` in both fixture and expectation.
- No passing test may continue to claim Cave preservation while omitting this field.

### Node-level progress semantics
- `ProcessingNodeSystem` must not write node-level `absorption_progress` or `assignment_progress` as a shared timer.
- Assignment job cards must not render a single shared progress bar.
- Assignment node visuals may indicate **idle vs active**, but not a fabricated shared completion fraction.
- Cave-mind scoring must not consume node-level absorption progress as though it were a truthful progress signal.
- Assignment preview tooling must not fabricate node-level absorption progress state.
- Authoring UI must not expose a runtime-invalid `Show Progress` control for assignment abilities.

---

## Design decisions

### 1. Preserve pending Habiti via Cave state, not via entity carryover

Reason:
- Cave already holds the durable semantic state
- `PendingHabitiPickupSystem` already materializes pickup entities from Cave state
- rebirth already restores Cave through `UPDATE_CAVE`

Decision:
- do not carry pickup entities across rebirth
- restore `pendingHabiti` on rebirth and allow the pickup system to recreate entities deterministically

### 2. Keep the existing command / system split

Reason:
- project rules require systems to emit commands only
- the current implementation already separates system intent from handler mutation

Decision:
- fix behavior in existing systems and handlers
- do not introduce a second mutation path
- do not move simulation logic into UI

### 3. Use existing Cave update plumbing

Reason:
- `UPDATE_CAVE` already supports `pendingHabiti`
- `UpdateCaveHandler` already normalizes and writes `pendingHabiti`
- Cave schema support already exists

Decision:
- rebirth restoration reuses `UPDATE_CAVE`
- no rebirth-specific command is added

### 4. Remove node-level shared assignment progress as runtime truth

Reason:
- the authoritative process lives on each body
- a node-wide elapsed/max pair misstates the model and misleads UI and tests

Decision:
- node-level `absorption_progress` / `assignment_progress` are no longer written by the processing system
- node-level consumers must switch either to assigned-count activity or be removed
- no replacement node-wide timer is introduced

### 5. Use existing `assignment.assignedIds` as the node-level activity signal

Reason:
- activity is already represented semantically by the assignment component
- assigned-count is truthful under the per-body model
- it is already used in multiple places, including node overlays and Cave mind

Decision:
- node-level visuals and cave-mind activity use `assignedIds.length > 0`
- no synthetic node-progress state is added

### 6. Preserve schema compatibility where possible

Reason:
- the prompt contract forbids unrelated churn
- authoring and persistence surfaces should change only where they directly misrepresent runtime behavior

Decision:
- the runtime compiler stops materializing node-progress state for assignment abilities
- the authoring form stops exposing `Show Progress`
- no unrelated migration system is introduced

---

## File-by-file implementation

## A. Rebirth restoration

### 1) `src/ui/runtime/terminal/commands/gameRebirthCommand.ts`

#### Responsibility
Restore the durable Cave subset into the new runtime after the rebirth script completes.

#### Current problem
The restore payload omits `pendingHabiti`, so untapped pickups are lost even though `extractRebirthCave(...)` captured them.

#### Required logic
When enqueuing the post-rebirth `UPDATE_CAVE` command, include `savedCave.pendingHabiti` in the payload.

#### Interface contract
Input:
- previously extracted `savedCave`
- newly created runtime

Output:
- one `UPDATE_CAVE` command whose payload restores all durable Cave fields that must survive rebirth, including `pendingHabiti`

#### Rules
- `pendingHabiti` is restored exactly from the extracted Cave snapshot
- no pickup entities are restored directly here
- restoration remains command-based

---

### 2) `src/ui/runtime/terminal/commands/gameRebirthCommand.integration.test.ts`

#### Responsibility
Verify that rebirth preserves the full durable Cave contract, including pending Habiti.

#### Current problem
The test claims Cave preservation but omits `pendingHabiti` from both fixture and expectation.

#### Required logic
Update the Cave fixture used in the integration test to include `pendingHabiti`.

Add assertions that after rebirth:
- `sys_world.cave.pendingHabiti` in the new runtime matches the pre-rebirth value exactly
- the rest of the preserved Cave and permanent-fact assertions still pass

#### Interface contract
Given:
- an old runtime whose Cave has `pendingHabiti`
- a new runtime created by the rebirth script

When:
- `game.rebirth` executes successfully

Then:
- the new runtime’s Cave retains `pendingHabiti`
- the test fails if `pendingHabiti` is omitted from restoration

#### Rules
- the test must assert the real field, not an inferred side effect
- a green test must be impossible when `pendingHabiti` is dropped

---

## B. Pending Habiti pickup lifecycle

### 3) `src/game/systems/PendingHabitiPickupSystem.ts`

#### Responsibility
Materialize pending-Habiti pickup entities from Cave state and control their travel-to-Cave / orbit-after-arrival behavior.

#### Current problems
- fresh spawns are marked arrived immediately and teleported into orbit
- unarrived pickups rely on `SET_TARGET`, but the compiled pickup physics is static, so they do not move

#### Required logic
For the spawn path:
- spawn the pickup entity if Cave says it should exist and the entity does not exist
- preserve the source-position spawn written by the completion handler
- set `pending_habiti_arrived = 0`
- place the entity in a movable physics configuration while unarrived
- set target to `sys_world`
- do not position it onto the Cave orbit ring on spawn

For the travel path:
- while unarrived, keep targeting Cave
- when the entity crosses the Cave arrival threshold, clear target and set `pending_habiti_arrived = 1`

For the orbit path:
- only entities with `pending_habiti_arrived = 1` may be repositioned to the Cave orbit ring

For cleanup:
- continue killing pickup entities whose ids are no longer present in `cave.pendingHabiti`

#### Interface contract
Input:
- snapshot of `sys_world.cave.pendingHabiti`
- pickup entities that may or may not already exist
- physics bodies for Cave and pickups

Output:
- command stream only:
  - spawn / kill
  - update state
  - set target
  - movement-enabling physics command(s) already supported by the runtime
  - orbit positioning commands for arrived pickups only

#### Rules
- Cave state is authoritative
- entity existence is a projection of Cave state
- orbit positioning is valid only after arrival
- transit motion must not depend on UI

---

### 4) `src/data/raw/example/modules/pending_habiti_pickup.bp`

#### Responsibility
Define the pending-Habiti pickup entity template.

#### Current problem
With only `worldPresence`, the compiled physics for this non-body entity becomes static. A static entity cannot follow `SET_TARGET` because steering returns zero force for static bodies.

#### Required logic
Change the blueprint definition so a pending pickup materializes with movable physics suitable for target-following during transit.

#### Interface contract
The blueprint must still produce:
- a visible in-world entity tagged as `pending_habiti_pickup`
- radius `12`

The blueprint must additionally support:
- movement while unarrived
- compatibility with the existing steering / target-following pipeline

#### Rules
- preserve the existing display identity
- do not convert pickups into body entities unless the rest of the engine already treats that as semantically correct
- the result must be compatible with existing movement commands

---

### 5) `src/game/handlers/processingPendingHabiti.ts`

#### Responsibility
When a body yields new Habiti on processing completion, update Cave pending state and create the initial in-world pickup representation.

#### Current role to preserve
This file already performs the correct semantic update:
- compute new Habiti
- merge them into `cave.pendingHabiti`
- spawn pickup entities at the source body position
- set arrival state to `0`
- target Cave

#### Required adjustment
Align its spawn assumptions with the corrected pickup-system contract:
- the handler remains the source-position emitter
- the system must not immediately overwrite that spawn into arrived-orbit state

#### Interface contract
Input:
- processing completion context
- world, node, and body entities

Output:
- `UPDATE_CAVE` carrying merged `pendingHabiti`
- pickup spawn commands for newly discovered Habiti only

#### Rules
- never add new Habiti directly to `ownedHabiti`
- never bypass Cave pending state
- never spawn duplicates for ids already pending or already materialized

---

### 6) `src/game/systems/ClaimPendingHabitiPickupSystem.ts`

#### Responsibility
Translate current player selection of a pending pickup into a claim command.

#### Current problem
The system emits a claim command only if the pickup has already arrived at Cave.

#### Required logic
Remove the arrival gate.

The system must emit `CLAIM_PENDING_HABITI_PICKUP` when:
- the selected entity id exists
- the selected entity is a valid pending-Habiti pickup entity

Arrival state must not affect claim eligibility.

#### Interface contract
Input:
- `sys_world.state.cave_selected_entity_id`
- selected entity from snapshot

Output:
- zero or one `CLAIM_PENDING_HABITI_PICKUP` command per tick

#### Rules
- interaction semantics are selection-based, not location-state-based
- transit pickups and orbiting pickups are equally claimable

---

### 7) `src/game/handlers/ClaimPendingHabitiPickupHandler.ts`

#### Responsibility
Apply the semantic effect of claiming a pending Habiti pickup.

#### Current problem
The handler rejects claims when `pending_habiti_arrived !== 1`, which makes in-transit pickups unclaimable even if selected.

#### Required logic
Remove the arrival-state validation.

The handler must accept a claim when all of the following are true:
- `sys_world` exists
- the pickup entity exists
- the pickup id decodes to a valid habitus id
- that habitus id is present in `cave.pendingHabiti`

On success it must:
- remove the habitus id from `cave.pendingHabiti`
- add it to `cave.ownedHabiti` through the existing normalization path
- kill the pickup entity
- enqueue the Habiti gain announcement
- preserve the existing semantic fact adjustments

#### Interface contract
Input:
- `CLAIM_PENDING_HABITI_PICKUP { entityId }`

Output:
- Cave update through the existing handler path
- kill command for the claimed pickup entity
- announcement / fact commands through the existing mechanisms

#### Rules
- location and arrival state are not claim-validity inputs
- semantic truth comes from `cave.pendingHabiti`, not from the pickup’s movement state

---

## C. Spawn and assignment motion

### 8) `src/engine/runtime/handlers/spawnBodyIdentity.ts`

#### Responsibility
Initialize identity and default assignment state for spawned body entities.

#### Current problem
New bodies are initialized with owner `sys_world` and status `orbiting`. That makes a fresh body start orbiting Cave from its spawn position instead of first navigating to Cave.

#### Required logic
When assigning default owner `sys_world` to a newly spawned body, initialize `assignmentStatus` as `navigating`.

#### Interface contract
Input:
- spawned runtime body entity

Output:
- initialized body identity and assignment state

#### Rules
- Cave remains the default owner
- default ownership does not imply immediate orbiting
- the body enters orbit only through the assignment-motion system

---

### 9) `src/game/systems/body-assignment/navigateAssignedBody.ts`

#### Responsibility
Control the navigation phase before a body transitions into orbit.

#### Current problem
The body targets the owner center and transitions to orbit only after reaching near-contact distance. This makes assignment bodies drive straight into the node before orbit begins.

#### Required logic
For assign-capable owners, navigation is defined against the owner’s orbit-entry radius rather than the owner center.

Transition contract:
- switch from `navigating` to `orbiting` only when the body reaches the outer orbit band for that owner kind

#### Interface contract
Input:
- body id, owner id, body physics, owner physics, command buffer

Output:
- target-setting commands while navigating
- one status transition to `orbiting` when the entry band is reached

#### Rules
- no direct ECS mutation
- the transition threshold must match the orbit layout used by `orbitAssignedBody`
- world/Cave navigation and node navigation use the same phase semantics: navigate first, orbit second

---

### 10) `src/game/systems/body-assignment/orbitAssignedBody.ts`

#### Responsibility
Place orbiting assigned bodies according to owner kind and body-local progress.

#### Current problem
Processing owners skip offset seeding entirely. That prevents a natural spiral entry and causes processing bodies to snap to the deterministic orbit solution.

#### Required logic
Allow orbit-offset seeding for processing owners as well.

On first orbit tick without stored offsets:
- seed phase/radius offsets from the body’s current position relative to the owner
- write those offsets into body state

On subsequent orbit ticks:
- resolve position from the owner orbit model plus the stored offsets
- use the body’s own `assignment_progress_ratio` to tighten the orbit radius

#### Interface contract
Input:
- owner entity
- body physics
- owner physics
- snapshot
- command buffer
- elapsed time

Output:
- optional state writes for orbit offsets
- optional position command
- layer / target normalization as already done today

#### Rules
- processing orbit must be continuous from the entry point
- no direct snapping to inner orbit on first orbit tick
- the body’s progress ratio remains the only driver of tightening

---

### 11) `src/game/systems/ProcessingNodeSystem.ts`

#### Responsibility
Advance per-body processing progress for orbiting bodies assigned to processing nodes and resolve completion.

#### Current problems
- the system resolves as soon as the timer reaches required duration, even if the body has not yet reached visual-overlap completion
- the system still writes node-level `absorption_progress` / `assignment_progress` from max elapsed body time

#### Required logic
Keep only the per-body responsibilities.

The system must:
- advance body-local progress
- write body-local `assignment_progress_ms`
- write body-local `assignment_progress_ratio`
- emit `RESOLVE_BODY_PROCESSING` only when the body has both completed its timer and reached the completion geometry implied by the orbit model

The system must not:
- accumulate a node-level max elapsed time
- write node-level `absorption_progress`
- write node-level `assignment_progress`

The existing reset behavior for bodies leaving active processing remains, but it applies only to the body-local fields.

#### Interface contract
Input:
- processing nodes
- assigned orbiting bodies
- body-local required duration and progress state
- body and owner physics

Output:
- body-local progress state updates
- resolve command only when the body has both completed timer and reached completion geometry

#### Rules
- no batch-resolution semantics
- no node-global timer semantics
- the system remains deterministic and command-only

---

## D. Removal of node-level shared progress semantics

### 12) `src/game/handlers/proxyAssignmentCleanup.ts`

#### Responsibility
Remove a proxy id from the station assignment list when cleanup occurs.

#### Current problem
When the last proxy is removed, the file resets `station.state.absorption_progress` to zero.

#### Required logic
Stop writing `absorption_progress` during cleanup.

Cleanup remains responsible only for assignment membership, not for maintaining removed node-progress state.

#### Interface contract
Input:
- entity list
- proxy id
- target station id

Output:
- station assignment list updated in-place during handler execution

#### Rules
- no node-level progress state is created or reset here

---

### 13) `src/game/handlers/absorptionBatchEntities.ts`

#### Responsibility
Provide helper operations for assignment-station finalization helpers.

#### Current problem
`resetProgress(...)` writes `station.state.absorption_progress = 0`, preserving the old shared-progress model.

#### Required logic
Remove node-progress mutation from this helper layer.

Two valid implementation shapes are allowed:
- delete `resetProgress(...)` entirely and inline only the remaining needed finalization operations elsewhere
- retain the helper name but make it responsible only for data that still exists after the fix

#### Interface contract
Input:
- station runtime entity

Output:
- no node-progress mutation

#### Rules
- helper responsibilities must match real runtime state
- dead helper semantics are not allowed to remain

---

### 14) `src/game/handlers/absorptionBatchFinalization.ts`

#### Responsibility
Finalize an assignment station after completion where this legacy finalization path still applies.

#### Current problem
The file still imports and calls `resetProgress(...)`, which encodes removed node-progress state.

#### Required logic
Update finalization to stop depending on node-progress reset.

The file continues to:
- clear assignment membership
- pulse completion
- mark depletion where applicable
- increment Cave counters where applicable

It does not:
- manage node-level elapsed/max progress state

#### Interface contract
Input:
- station runtime entity
- world runtime entity where relevant

Output:
- station finalization side effects that are still valid after removal of node-progress state

#### Rules
- no fake shared timer reset remains in this path

---

### 15) `src/engine/compiler/abilities/assignmentCompiler.ts`

#### Responsibility
Compile authored assignment ability data into runtime blueprint components.

#### Current problem
When `showProgress` is enabled, the compiler materializes:
- `state.absorption_progress`
- a display bar bound to `state.absorption_progress`

That output is invalid under the body-local processing model.

#### Required logic
Keep compilation of:
- assignment component
- hidden duration state
- completion trigger
- processing output flags
- one-off cycle GC behavior

Remove compilation of:
- node-level `state.absorption_progress`
- any display bar keyed to node-level assignment progress

#### Interface contract
Input:
- authored assignment ability config
- blueprint draft

Output:
- runtime blueprint with assignment behavior support but without node-progress state or bars

#### Rules
- `duration` remains authored and compiled because it is used to seed body-local required duration
- compiler output must not recreate a node-level shared progress bar
- no unrelated schema migration is introduced here

---

### 16) `src/ui/devtools/editors/blueprint/mode/forms/AssignmentAbilityForm.tsx`

#### Responsibility
Expose editable authored fields for assignment abilities in the blueprint editor.

#### Current problem
The form still exposes `Show Progress`, which no longer maps to a valid runtime behavior.

#### Required logic
Remove the `Show Progress` control from the assignment authoring form.

#### Interface contract
Input:
- blueprint editor session state

Output:
- assignment editor UI that exposes only valid runtime-authored fields

#### Rules
- the form must not advertise a node-level progress bar that no longer exists
- no new editor abstraction is introduced

---

### 17) `src/ui/runtime/world/selection/absorption/LiveAbsorptionBar.tsx`

#### Responsibility after the fix
This file must be removed from the runtime selection path because a shared node-level progress bar is no longer semantically valid.

#### Current problem
It binds directly to `state.absorption_progress.value` / `state.absorption_duration.value`, which encodes the invalid shared-progress model.

#### Required logic
Delete the file, or remove it from all imports and runtime render paths in the same change.

#### Interface contract
After the fix:
- there is no runtime selection component that renders a single shared assignment progress bar for a node

#### Rules
- no dead UI component remains reachable from selection cards

---

### 18) `src/ui/runtime/world/selection/absorption/AbsorptionCard.tsx`

#### Responsibility
Render the selection card for assignment-processing nodes.

#### Current problem
The card renders `LiveAbsorptionBar`, which presents a single node-level progress bar.

#### Required logic
Remove the shared progress-bar row from the active-state card.

The active card continues to show:
- requirements
- storage state
- action controls such as recall/abort

It does not show:
- a shared elapsed/max progress bar for the whole node

#### Interface contract
Input:
- assignment job card data
- runtime entity
- runtime services

Output:
- selection card UI without node-level progress bar

#### Rules
- UI remains presentation-only
- no new per-body progress UI is introduced in this fix

---

### 19) `src/ui/runtime/world/selection/job-card/AssignmentJobCardView.tsx`

#### Responsibility
Render the generic assignment-job card view.

#### Current problem
The view renders `LiveAbsorptionBar` for active assignments, preserving the invalid shared-progress UI.

#### Required logic
Remove the shared progress-bar render path.

The card continues to present assignment metadata and storage models, but no node-global progress bar.

#### Interface contract
Input:
- `AssignmentJobCardData`
- entity
- runtime

Output:
- generic assignment card without shared progress bar

#### Rules
- a single shared assignment timer must not be implied in UI

---

### 20) `src/engine/phaser/display/modules/backgroundCycleReader.ts`

#### Responsibility
Provide lightweight read helpers for background fill calculations.

#### Current problem
The file exports `readAbsorptionProgress(...)`, which reads node-level assignment progress from state.

#### Required logic
Replace node-progress reading with truthful assignment-activity reading.

Required helper contract:
- expose whether an assignable node is active from `assignment.assignedIds.length > 0`
- stop exposing node-level elapsed/max absorption progress as a runtime truth source for assignment visuals

#### Interface contract
Input:
- runtime entity-like object

Output:
- cycle read remains unchanged
- assignment activity read becomes boolean activity, not shared-progress data

#### Rules
- the helper must not synthesize a numeric shared completion fraction for assignable nodes

---

### 21) `src/engine/phaser/display/modules/backgroundBandSelector.ts`

#### Responsibility
Choose non-styled background fill bands for node visuals.

#### Current problem
Assignable node fill uses `readAbsorptionProgress(...)` to render a progress fraction.

#### Required logic
Switch assignable-node fill selection to binary activity semantics derived from assignment activity.

Visual contract after the fix:
- idle assignable node: assignable base only
- active assignable node: assignable base plus active assignment fill

No progress fraction is displayed.

#### Interface contract
Input:
- entity
- cycle read
- drain state
- radius
- palette

Output:
- fill bands based on truthful activity semantics

#### Rules
- assignable visuals may signal activity
- assignable visuals must not imply a shared countdown or shared completion fraction

---

### 22) `src/engine/phaser/display/modules/backgroundModuleRuntime.ts`

#### Responsibility
Render styled backgrounds by resolving a fill fraction override where appropriate.

#### Current problem
Styled assignment fill still resolves from `readAbsorptionProgress(...)`, which is invalid under the per-body model.

#### Required logic
Remove styled assignment fill’s dependency on node-progress state.

Styled visual contract after the fix:
- cycle-backed visuals still use cycle fraction
- storage-backed visuals still use storage fraction
- assignable visuals use binary assignment activity, not numeric shared progress
- when no runtime assignment activity exists, normal style fallback behavior remains unchanged

#### Interface contract
Input:
- entity
- style
- cycle read
- display bars where relevant

Output:
- styled background render model with truthful fill semantics

#### Rules
- assignment styling must not fabricate a shared timer
- existing style fallback behavior outside assignment remains unchanged

---

### 23) `src/game/systems/cave/collectCaveCandidate.ts`

#### Responsibility
Collect per-entity cave-mind stimulus data.

#### Current problem
The file still reads `absorption_progress` from node state and uses it to drive `totals.absorptionActive` and candidate fields.

#### Required logic
Stop reading node-level absorption progress from entity state.

After the fix:
- node activity for assignment nodes is derived from `assignedCount > 0`
- `totals.absorptionActive` increments from truthful assignment activity
- the file must not treat node-local elapsed/max progress as a cave-mind signal

#### Interface contract
Input:
- snapshot
- entity
- cave memory
- selection / drag context
- mutable totals accumulator

Output:
- cave candidate object consistent with the updated salience model

#### Rules
- candidate collection must not depend on removed node-progress state
- the implementation must preserve existing non-assignment cave signals

---

### 24) `src/game/systems/cave/updateCaveSalience.ts`

#### Responsibility
Score and rank cave-mind salience from collected stimuli.

#### Current problem
The file still uses `stimulus.absorptionProgress` as:
- a multiplier source
- a delta impulse source
- a sustained bonus source

That logic assumes node-level progress is truthful.

#### Required logic
Remove salience dependence on node-level absorption progress.

After the fix:
- assignment salience derives from assignment activity / assigned count only
- cycle salience remains cycle-based
- proxy, selection, drag, exploration, and movement salience remain unchanged

#### Interface contract
Input:
- `CaveStimuli`
- cave memory

Output:
- ranked salience and next memory

#### Rules
- salience must not increase or decay based on fabricated node-progress values
- no new cave-mind concept is added

---

### 25) `src/ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.ts`

#### Responsibility
Create a preview runtime for blueprint visual inspection.

#### Current problem
The preview runtime fabricates `absorption_progress` and `absorption_duration` for assignment previews.

#### Required logic
Stop fabricating node-level assignment progress state for preview.

After the fix:
- cycle preview seeding remains cycle-based
- assignment preview does not inject fake shared progress state
- existing style fallback behavior handles non-cycle previews without pretending assignment progress exists

#### Interface contract
Input:
- draft cartridge
- blueprint id

Output:
- preview runtime that does not invent invalid assignment progress state

#### Rules
- preview tooling must not contradict runtime truth

---

## E. Test updates required by the broader sweep

### 26) `src/engine/compiler/abilities/assignmentCompiler.test.ts`

#### Responsibility
Verify compiler output for assignment abilities.

#### Required logic
Replace the old progress-bar expectation.

The test suite must now verify:
- `duration` still compiles to hidden duration state
- processing flags still compile correctly
- compiler no longer emits `state.absorption_progress`
- compiler no longer appends a display bar for assignment progress

---

### 27) `src/ui/devtools/editors/blueprint/mode/forms/AssignmentAbilityForm.test.tsx`

#### Responsibility
Verify the assignment authoring form exposes only valid controls.

#### Required logic
Update the form tests so they assert:
- `One-Off` still renders
- result-editing still works
- `Show Progress` is no longer rendered

---

### 28) `src/ui/runtime/world/selection/absorption/AbsorptionCard.test.tsx`

#### Responsibility
Verify selection-card presentation and wiring for assignment-processing nodes.

#### Required logic
Update active-card expectations so the card:
- still renders action controls such as `Abort`
- no longer renders a shared progress bar
- still renders idle-state actions correctly when no bodies are assigned

---

### 29) `src/engine/phaser/display/modules/backgroundCycleReader.test.ts`

#### Responsibility
Verify background read helpers.

#### Required logic
Replace node-progress tests with assignment-activity tests.

The suite must now verify:
- cycle reading remains unchanged
- assignment activity is detected from `assignment.assignedIds`
- no helper continues to expose assignment progress as elapsed/max state

---

### 30) `src/engine/phaser/display/modules/backgroundBandSelector.test.ts`

#### Responsibility
Verify assignable node band selection.

#### Required logic
Update the assignable-node tests so they assert:
- idle assignable nodes render base-only bands
- active assignable nodes render activity bands
- no expectation depends on a numeric absorption progress fraction

---

### 31) `src/engine/phaser/display/modules/backgroundStyledProcess.test.ts`

#### Responsibility
Verify styled fill selection when non-cycle fallback behavior is used.

#### Required logic
Update the assignment-related test so it asserts activity-based styled fill rather than progress-based styled fill.

---

### 32) `src/engine/phaser/display/modules/BackgroundModule.test.ts`

#### Responsibility
Verify full background rendering behavior.

#### Required logic
Update assignment-related expectations so they assert activity-vs-idle semantics rather than node-progress semantics.

---

### 33) `src/ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.assignment.test.ts`

#### Responsibility
Verify assignment blueprint preview behavior.

#### Required logic
Replace the old fabricated-progress expectation.

The test must now verify:
- assignment preview runtime does not inject `absorption_progress`
- assignment preview does not inject `absorption_duration` solely for fake progress visualization

---

### 34) `src/game/systems/PendingHabitiPickupSystem.test.ts`

#### Responsibility
Verify the pending-pickup spawn contract.

#### Required logic
Replace the old spawn expectation.

The test must verify that a newly required pickup is:
- spawned
- marked unarrived
- targeted to `sys_world`
- not immediately positioned onto the orbit ring as an arrived pickup

---

### 35) `src/game/systems/PendingHabitiPickupSystem.travel.test.ts`

#### Responsibility
Verify transit-to-arrival behavior.

#### Required logic
Extend coverage to verify:
- an unarrived pickup keeps targeting Cave while outside the arrival threshold
- on arrival it clears target and flips `pending_habiti_arrived` to `1`
- only after arrival does the system emit orbit-positioning commands

---

### 36) `src/game/systems/ClaimPendingHabitiPickupSystem.test.ts`

#### Responsibility
Verify the claim-intent emission contract.

#### Required logic
Assert that:
- selecting a pending pickup emits a claim command regardless of arrival state
- selecting a non-pickup entity does not emit a claim command

---

### 37) `src/game/handlers/ClaimPendingHabitiPickupHandler.test.ts`

#### Responsibility
Verify claim application semantics.

#### Required logic
Assert that:
- an unarrived pending pickup can be claimed successfully
- claim removes the id from `pendingHabiti`
- claim adds the id to `ownedHabiti`
- claim kills the pickup entity
- invalid ids still fail loudly without mutating Cave

---

### 38) `src/engine/runtime/handlers/spawnBodyIdentity.test.ts`

#### Responsibility
Verify spawn-time body assignment initialization.

#### Required logic
Assert that a freshly spawned body assigned to `sys_world` begins in `navigating`, not `orbiting`.

---

### 39) `src/game/systems/body-assignment/bodyAssignmentMotion.test.ts`

#### Responsibility
Verify assignment motion behavior for navigation and orbiting.

#### Required logic
Add coverage proving:
- processing owners seed first orbit from the body’s entry position
- resolved orbit radius decreases as `assignment_progress_ratio` increases
- the path is continuous rather than snapping directly to the node center

---

### 40) `src/game/handlers/AssignBodiesBatchHandler.processing.test.ts`

#### Responsibility
Verify assignment initialization for processing nodes.

#### Required logic
Retain and extend the higher-level contract:
- assignment starts in `navigating`
- progress is reset per assignment
- required duration is copied onto the body

---

### 41) `src/game/systems/ProcessingNodeSystem.test.ts`

#### Responsibility
Provide direct system coverage for per-body processing and the removal of node-global progress semantics.

#### Required logic
Add a dedicated system test file that verifies:
- a processing body at 100% timer but not yet at completion geometry does not resolve early
- the same body resolves once completion geometry is reached
- multiple assigned bodies can complete independently
- the system does not emit node-level `UPDATE_STATE` commands for `absorption_progress` or `assignment_progress`

---

### 42) Fixture-only stale-test cleanup

The following tests contain stale fixtures that still mention node-level assignment progress even though the production code path no longer depends on it:
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.test.ts`
- `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.rebuild.test.tsx`
- `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.incremental.test.tsx`
- `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.test.tsx`
- `src/ui/runtime/world/EntityStateLink.text.test.tsx`

#### Required logic
Update these fixtures so they no longer encode obsolete assignment-progress semantics.

Rules:
- overlay fixtures should rely on `assignment.assignedIds` and assignment duration only where those are still the real trigger conditions
- generic text-binding tests should use neutral sample keys rather than assignment/absorption progress fields when the test is about generic binding machinery

This is required so the test suite stops teaching the wrong mental model.

---

## Acceptance criteria

The fix is complete only when all of the following are true:

1. `game.rebirth` preserves `cave.pendingHabiti`.
2. After rebirth, pending pickups reappear because `PendingHabitiPickupSystem` re-materializes them from restored Cave state.
3. The rebirth integration test fails if `pendingHabiti` is omitted.
4. A newly spawned body first navigates to Cave before orbiting Cave.
5. A body assigned to an assign-capable node first enters a wide orbit and then tightens inward according to its own progress.
6. A pending pickup spawns at source, travels to Cave, and only then orbits Cave.
7. A pending pickup can be claimed both in transit and after arrival.
8. Processing completion is per body and does not resolve before visual-overlap completion.
9. `ProcessingNodeSystem` no longer writes node-level `absorption_progress` or `assignment_progress`.
10. Assignment selection cards no longer render a shared node-level progress bar.
11. Assignment background visuals derive from activity, not fabricated shared progress.
12. Cave-mind salience no longer depends on node-level assignment progress.
13. Assignment preview tooling and authoring UI no longer fabricate or advertise node-level assignment progress.
14. No existing passing test continues to encode the old shared-progress model.
15. All tests covering the above contracts are green.

---

## Notes on implementation boundaries

- This design intentionally reuses existing runtime commands, Cave state, assignment state, and movement systems.
- It does not introduce a new persistence mechanism.
- It does not introduce per-body progress UI.
- It does not redefine assignment as cycle-based processing.
- It does not change unrelated schemas or systems unless they currently consume the invalid node-progress concept directly.

