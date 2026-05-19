# LLD — Per-Body Assignment Processing, Visual Overlap Completion, and Persistent Pending Habiti Pickups

## Status

Proposed implementation design.

This document intentionally stays inside the existing runtime contract:

- mutation only through the command/apply pipeline
- React/UI remains observational only
- existing runtime systems, handlers, and helpers are reused where they already fit

---

## 1. Why

The current implementation does not satisfy the requested player-facing contract.

### 1.1 Current gaps in the codebase

1. **Assignment completion is still node-authored, not body-authored, at the authoritative timing layer.**
    - `src/game/systems/ProcessingNodeSystem.ts` advances each body independently, but it still reads a single owner duration through `readAssignmentDuration(entity)` and resolves completion from the node-side duration rather than a body-side snapshotted job duration.
    - The node therefore remains the authoritative source of timing.

2. **Processing completion is timer-first, not visually truthful.**
    - `ProcessingNodeSystem` emits `RESOLVE_BODY_PROCESSING` as soon as elapsed time reaches duration.
    - `bodyAssignmentMotion.ts` and `orbitLayout.ts` only use progress to tighten a generic orbit. The current processing orbit is small and only shrinks to 35% of its base radius.
    - A body can therefore complete before it is visually overlapping the node.

3. **Bodies assigned to processing nodes do not start on a large outer orbit.**
    - `AssignBodiesBatchHandler.ts` can put a body into `navigating` state.
    - `navigateAssignedBody()` steers toward the node center, and `orbitAssignedBody()` seeds offsets from the body’s current position.
    - This produces “move close, then orbit from wherever you happened to arrive,” not “captured into a large outer orbit.”

4. **Assignment overlay semantics are no longer valid once timing is per body.**
    - `resolveNodeOverlayModel.helpers.ts` currently renders active assignment nodes as `Time to completion` plus a remaining-duration binding.
    - Once multiple bodies have independent timers, that node-global countdown is not an honest UI.

5. **The current single-body resolver does not implement Habiti transfer.**
    - `ResolveBodyProcessingHandler.ts` currently handles resource/xp spectacle and optional body destruction.
    - It does **not** consume `processing_absorbs_habiti` and does not produce any cave-side Habiti outcome.
    - The Habiti transfer logic lives in older absorption helpers (`resolveAbsorptionHabitiOutcome.ts`, `absorptionBatchProcessingOutcome.ts`) and is not part of the live single-body completion path.

6. **Habiti currently resolve conceptually as cave ownership, not as persistent in-world pickups.**
    - Existing helpers treat the cave’s `ownedHabiti` as the receiver of newly absorbed Habiti.
    - The requested behavior is explicitly different: absorption creates physical, tappable, persistent orbiting entities around Cave, and tapping them is what grants ownership and shows the gain modal.

7. **There is already an unused but relevant assignment-completion contract in the codebase.**
    - `assignmentCompletionCompiler.ts` provisions `self.state.assignment_complete_pulse` and a reset rule.
    - `absorptionBatchFinalization.ts` contains old batch-finalization helpers.
    - The current live single-body resolver never sets the pulse, so `assignment_complete`-driven authored content is not being honored by the live processing path.

8. **There is a naming/data mismatch in current assignment duration handling.**
    - The compiler writes `state.absorption_duration` for assignment abilities.
    - `assignmentNodeKinds.ts` currently reads only `state.assignment_duration`.
    - UI overlay code already contains a fallback between the two names.
    - The processing system must use the same fallback or it will not stay aligned with compiled blueprint output.

### 1.2 Why the requested change is correct

The requested contract is coherent and fits the architecture:

- the **body** should own the active assignment job state
- the **node** should define the rules of that job
- the body’s job progress should drive the body’s orbit
- completion should happen when the same progress curve has visibly carried the body into overlap
- absorption should create **pending cave knowledge** before it becomes **owned cave knowledge**
- persistence across rebirth should be stored on `sys_world.cave`, not in transient runtime-only entities

That is consistent with the project’s runtime model and persistence model already present in the codebase.

---

## 2. What

## 2.1 Functional contract

The implementation must satisfy all of the following.

### Assignment jobs

1. Every assigned body on an authored assignment node is its own processing job.
2. Each such body carries its own hidden timing state:
    - elapsed ms
    - required ms
    - progress ratio
3. The required duration is snapshotted from the owner node at assignment time.
4. Reassignment starts a fresh job and resets that body’s hidden timing/orbit state.

### Orbit and completion

5. Bodies assigned to authored assignment nodes enter orbit immediately; they do not navigate to the node center first.
6. The outer orbit radius for an assigned body is large:
    - **center distance = owner.radius + (6 × body.radius)**
    - this is the implementation of “about 3 avatar heights away”
7. The orbit radius tightens monotonically as the body’s own progress ratio increases.
8. The final orbit radius must create a visible overlap with the node.
    - **final center distance = owner.radius + body.radius - overlapInset**
    - **overlapInset = 25% of the smaller of `owner.radius` and `body.radius`**
9. Completion is body-local.
10. Completion is emitted when the body’s own progress ratio reaches `1`.
11. There is no separate hidden geometry gate; instead, the orbit curve is defined so that ratio `1` is already visually overlapping.

### Node rules and authored completion

12. Each completed body resolves individually against the owner node’s authored rules.
13. `assignment_complete_pulse` is raised on the node for **every** completed body.
14. If the node has `state.is_depleted`, it is set to `1` on first completion.
15. Existing authored `assignment_complete` content must therefore work with the new per-body model.

### Overlay/UI

16. Active assignment nodes must not show a node-global time-remaining label.
17. Node overlays for active assignment nodes must not show a node-global remaining-duration value or progress bar.
18. Idle assignment nodes remain `Idle`.
19. Active assignment nodes show only assigned-body count.
20. The overlay label row is omitted entirely when the label string is empty.

### Absorption-specific behavior

21. Absorption still destroys the body.
22. Absorption still produces the existing resource/xp spectacle according to existing processing output rules.
23. New Habiti discovered from the body do **not** go directly into `cave.ownedHabiti`.
24. New Habiti are appended to `cave.pendingHabiti` instead.
25. Each pending Habitus is represented by one deterministic orbiting pickup entity around Cave.
26. Pending Habiti are unique; duplicates must not create multiple claimable copies.
27. Tapping a pending pickup:

- removes it from `cave.pendingHabiti`
- adds it to `cave.ownedHabiti`
- shows the existing Habiti gained modal via the existing announcement mechanism

28. Untapped pending pickups must persist across `game.rebirth` runs.

### Cave knowledge semantics

29. `ownedHabiti` continue to drive cave bonuses and all existing cave-knowledge effects.
30. `pendingHabiti` do **not** grant cave bonuses.
31. Any place that answers “is this Habitus already known for absorption uniqueness purposes?” must use:

- `knownHabiti = ownedHabiti ∪ pendingHabiti`

32. Any place that answers “which Habiti grant cave effects?” must continue to use:

- `ownedHabiti` only

---

## 3. How

## 3.1 Data model

### Body-local hidden state

The body job state remains in hidden `state`, not in the `body` component. This is the smallest change and matches the existing implementation pattern.

Required hidden state keys on a body entity:

- `assignment_progress_ms`
- `assignment_progress_ratio`
- `assignment_required_ms` **(new)**
- existing orbit-offset keys remain available for non-processing owners

### Cave data

The cave component gains one new persistent field:

- `pendingHabiti: string[]`

This field is stored on `sys_world.cave`, so it is already covered by existing flyweight serialization/hydration because `cave` is one of the persisted stateful keys.

---

## 3.2 Command/runtime model

### Existing commands to keep using

The design must continue to use these existing commands where they already fit:

- `SPAWN`
- `KILL`
- `POSITION_ENTITY`
- `SET_PHYSICS_LAYER`
- `UPDATE_STATE`
- `UPDATE_CAVE`
- `ASSIGN_BODIES_BATCH`
- `RESOLVE_BODY_PROCESSING`
- `ACKNOWLEDGE_HABITI_ANNOUNCEMENT`

### New command to add

A single new domain command is required:

- `CLAIM_PENDING_HABITI_PICKUP`

Payload contract:

- `entityId: string`

Reason:

- claim must happen in apply phase
- claim must validate the pickup against world state
- claim must update cave ownership/pending state
- claim must enqueue the existing Habiti announcement
- claim must remove the pickup entity

This cannot be implemented correctly from UI or system code without a command/handler.

---

## 4. Detailed runtime flow

## 4.1 Assignment

1. Player assigns a body to an authored assignment node.
2. `ASSIGN_BODIES_BATCH` is applied.
3. The handler snapshots required duration from the node into body hidden state.
4. The body is attached to the owner’s `assignment.assignedIds`.
5. The body’s hidden progress is reset to zero.
6. If the owner is an authored assignment-processing node, the body enters `orbiting` immediately.
7. If the owner is world/pointer/power, existing navigation/orbit behavior remains unchanged.

## 4.2 Per-tick progress

1. `ProcessingNodeSystem` iterates authored assignment-processing nodes.
2. For each assigned body that is still orbiting that node:
    - read `assignment_required_ms` from the body
    - increment body-local `assignment_progress_ms`
    - compute body-local `assignment_progress_ratio`
3. When ratio reaches `1`, emit `RESOLVE_BODY_PROCESSING` for that body only.
4. Separately derive node visual progress state from the active bodies for existing background fill behavior only.

## 4.3 Orbit

1. `BodyAssignmentSystem` continues to own body motion.
2. For processing owners, `orbitAssignedBody()` uses the body-local progress ratio.
3. Processing orbits do not seed from the body’s current position.
4. The orbit is deterministic from owner id, body id, index, time, and body-local ratio.
5. At ratio `0`, the body appears on the large outer ring.
6. At ratio `1`, the body is visibly overlapping the node.

## 4.4 Completion

1. `ResolveBodyProcessingHandler` validates node/body/world.
2. It resolves existing processing outputs using existing processing-output helpers and spectacle helpers.
3. It raises `assignment_complete_pulse` on the node.
4. It depletes one-off nodes if they carry `state.is_depleted`.
5. If the node absorbs Habiti:
    - compute newly discovered Habiti against `knownHabiti = owned ∪ pending`
    - append only truly new Habiti to `cave.pendingHabiti`
6. If the node is destructive:
    - remove the body from owner assignment
    - remove the body entity and its impulse body
    - increment existing cave destruction counters
7. If the node is non-destructive:
    - clear that body’s job state
    - enqueue reassignment of that body back to `sys_world`

## 4.5 Cave pickup materialization

1. `PendingHabitiPickupSystem` reads `sys_world.cave.pendingHabiti`.
2. It ensures one pickup entity exists per pending Habitus id.
3. Missing pickups are spawned with deterministic ids.
4. Stale pickup entities not backed by `pendingHabiti` are killed.
5. Existing pickups are positioned every tick on an orbit around Cave.
6. Pickup entities use a phantom physics layer so they remain visible and tappable without interfering with body motion.

## 4.6 Claiming a pickup

1. Tapping a pickup uses the existing entity-selection path.
2. The selected entity id is mirrored into `sys_world.state.cave_selected_entity_id` by the existing UI/runtime bridge.
3. `ClaimPendingHabitiPickupSystem` watches that selected id.
4. If the selected entity is a pending Habiti pickup, it emits `CLAIM_PENDING_HABITI_PICKUP`.
5. `ClaimPendingHabitiPickupHandler`:
    - validates the entity id and pending set membership
    - moves the Habitus id from `pendingHabiti` to `ownedHabiti`
    - uses the existing Habiti announcement queue helper to show the gain modal
    - removes the pickup entity and its impulse body
6. UI selection clears automatically because the selected entity no longer exists.

---

## 5. File-by-file design

## 5.1 Changed files

### `src/game/assignment/assignmentNodeKinds.ts`

**Responsibility**

- classify assignment owners
- read node-side assignment duration

**Required change**

- `readAssignmentDuration()` must support both state keys:
    1. `state.assignment_duration.value`
    2. fallback `state.absorption_duration.value`

**Reason**

- compiler output currently writes `absorption_duration`
- processing system currently depends on `readAssignmentDuration()`
- overlay code already has a fallback; classification/runtime logic must share the same rule

**Interface contract**

- no signature change
- returned duration remains a number in milliseconds-like runtime units
- `0` still means “no processing duration”

---

### `src/game/assignment/bodyAssignment.ts`

**Responsibility**

- shared helpers for assignment ids, status, hidden progress/orbit state

**Required change**

- extend reset helpers to also clear `assignment_required_ms`
- add read/write helpers for `assignment_required_ms`
- keep orbit-offset helpers for non-processing owners unchanged

**Interface contract**

- exported helpers remain pure readers/mutators over runtime entities
- no caller outside assignment/processing logic should need to know raw hidden state key names

---

### `src/game/handlers/AssignBodiesBatchHandler.ts`

**Responsibility**

- apply assignment ownership changes
- initialize body-local assignment job state

**Required change**

- after resolving `nextOwner`, snapshot `assignment_required_ms` from `readAssignmentDuration(nextOwner)`
- when `nextOwner` is an authored assignment-processing node, set `assignmentStatus = "orbiting"` immediately
- keep existing world/pointer/power behavior unchanged
- reset body job state on every new assignment

**Interface contract**

- command input remains `ASSIGN_BODIES_BATCH`
- output remains world mutation only; no new command emission from this handler

---

### `src/game/systems/body-assignment/bodyAssignmentMotion.ts`

**Responsibility**

- body movement while assigned

**Required change**

- processing-owner orbits must no longer seed radius/phase from the body’s current position
- processing-owner orbits must use deterministic outer-orbit placement immediately
- orbit radius must be driven entirely by body-local `assignment_progress_ratio`
- world/pointer/power behavior keeps existing seeded-offset flow

**Interface contract**

- `navigateAssignedBody()` remains unchanged for non-processing owners
- `orbitAssignedBody()` remains the body orbit entry point
- function signatures may grow only if needed to pass body radius and/or owner radius into the orbit helper in a typed manner

---

### `src/game/systems/body-assignment/orbitLayout.ts`

**Responsibility**

- deterministic orbit geometry

**Required change**

- processing orbit geometry must become radius-aware and progress-aware
- processing outer radius must be `owner.radius + 6 * body.radius`
- processing final radius must be `owner.radius + body.radius - overlapInset`
- `overlapInset = 0.25 * min(owner.radius, body.radius)`
- processing orbit must tighten monotonically from outer radius to final radius as progress increases
- non-processing orbit kinds retain current behavior

**Interface contract**

- helper signatures must accept enough data to compute owner/body-radius-aware processing geometry
- helper remains deterministic for a given input tuple

---

### `src/game/systems/ProcessingNodeSystem.ts`

**Responsibility**

- advance body-local processing jobs
- emit per-body completion commands
- derive node visual progress state

**Required change**

- read `assignment_required_ms` from the body, not the node
- only use node-side duration helper when seeding new body jobs, not while advancing active jobs
- emit one `RESOLVE_BODY_PROCESSING` per completed body
- keep derived node progress state for visual fill only
- when no active body remains, derived node progress state resets to `0`

**Interface contract**

- system remains read-only and command-emitting
- no direct ECS mutation
- node state keys `assignment_progress` / `absorption_progress` remain derived read-model state only

---

### `src/game/handlers/ResolveBodyProcessingHandler.ts`

**Responsibility**

- apply the result of one body completing one node job

**Required change**

- preserve existing processing-output spectacle flow using existing helpers
- add Habiti resolution for nodes with `processing_absorbs_habiti`
- compute new Habiti against `knownHabiti = ownedHabiti ∪ pendingHabiti`
- append newly discovered ids to `pendingHabiti`, not `ownedHabiti`
- pulse `assignment_complete_pulse` for every completed body
- mark one-off nodes depleted if `state.is_depleted` exists
- clear/remove the completed body according to destructive vs non-destructive node rules

**Interface contract**

- command input remains `RESOLVE_BODY_PROCESSING { nodeId, bodyId }`
- handler remains the single apply-phase entry point for body completion
- illegal states must continue to log loudly and return

**Reuse requirements**

- reuse `resolveProcessingOutputs`, `resolveOutputAmount`, and `spawnYieldSpectacle`
- reuse `resolveSingleAbsorptionOutcome` for Habiti eligibility logic instead of duplicating that logic
- reuse `UpdateCaveHandler` for pending-only cave mutation

---

### `src/game/handlers/resolveAbsorptionHabitiOutcome.ts`

**Responsibility**

- pure resolution of Habiti/resource/xp absorption outcomes for preview and processing logic

**Required change**

- replace the function input concept of `ownedHabiti` with `knownHabiti`
- `knownHabiti` means `owned ∪ pending`
- `newHabiti` are those not present in `knownHabiti`
- `duplicateHabiti` are those already present in `knownHabiti`
- all pure-output behavior remains deterministic and side-effect-free

**Interface contract**

- single-body and batch functions remain pure
- all return values stay sorted and de-duplicated as today

---

### `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts`

**Responsibility**

- build semantic overlay models for nodes

**Required change**

- active assignment nodes must stop returning a remaining-duration binding
- active assignment nodes must return:
    - empty label
    - static value text of `"<count> assigned"`
    - no bar
- idle assignment nodes remain `Idle`

**Interface contract**

- function still returns `ResolvedNodeOverlayEntry | null`
- no node-global countdown survives this change

---

### `src/ui/runtime/world/node-overlays/NodeOverlayCard.tsx`

**Responsibility**

- render resolved overlay models

**Required change**

- when `model.label` is empty, do not render the label row at all
- existing live/static value rendering remains unchanged

**Interface contract**

- no business logic is added
- rendering stays purely presentational

---

### `src/data/schemas/game/cave.ts`

**Responsibility**

- cave component schema and defaults

**Required change**

- add `pendingHabiti: z.array(z.string()).default([])`

**Interface contract**

- `ownedHabiti` semantics do not change
- `pendingHabiti` is persistent cave state and must always be normalized uniquely when written

---

### `src/engine/runtime/handlers/UpdateCaveHandler.ts`

**Responsibility**

- apply `UPDATE_CAVE` payloads to cave state

**Required change**

- accept and apply `pendingHabiti` when present
- keep owned/understanding/attributes/mind/purge logic unchanged

**Interface contract**

- command type remains `UPDATE_CAVE`
- error handling remains identical for missing entity / missing cave component

---

### `src/engine/runtime/handlers/updateCaveHandler.helpers.ts`

**Responsibility**

- helper functions used by `UpdateCaveHandler`

**Required change**

- add `applyPendingHabiti()` using the same normalize/sort semantics as `applyOwnedHabiti()`

**Interface contract**

- helper remains side-effecting only on the provided cave component object
- all id-array writes remain unique and sorted

---

### `src/engine/runtime/types/runtimeCommandTypes.ts`

**Responsibility**

- runtime command enum

**Required change**

- add `CLAIM_PENDING_HABITI_PICKUP`

**Interface contract**

- enum stability preserved except for the new member addition

---

### `src/engine/runtime/types/runtimeCommandPayloadsHabiti.ts`

**Responsibility**

- Habiti-domain command payload types

**Required change**

- add `ClaimPendingHabitiPickupCommandPayload { entityId: string }`

**Interface contract**

- payload is minimal and validation is done by the handler

---

### `src/engine/runtime/types/runtimeCommandHabiti.ts`

**Responsibility**

- Habiti-domain command type aliases

**Required change**

- add `ClaimPendingHabitiPickupCommand`

**Interface contract**

- follows the existing `Command<RuntimeCommandType, Payload>` pattern

---

### `src/engine/runtime/types/runtimeCommandPayloads.ts`

**Responsibility**

- top-level payload re-exports

**Required change**

- re-export `ClaimPendingHabitiPickupCommandPayload`

---

### `src/engine/runtime/types/runtimeCommandUnion.ts`

**Responsibility**

- runtime command union

**Required change**

- include `ClaimPendingHabitiPickupCommand`

---

### `src/engine/runtime/types.ts`

**Responsibility**

- public runtime type re-exports

**Required change**

- re-export the new payload and command type alias

---

### `src/game/registerGameCommandHandlers.ts`

**Responsibility**

- game-specific command-handler registration

**Required change**

- register `ClaimPendingHabitiPickupHandler`

**Interface contract**

- ordering must keep the new handler available during normal apply phase

---

### `src/game/main.ts`

**Responsibility**

- game runtime assembly and system registration

**Required change**

- register the new pending-pickup systems

**Required system order**

1. existing gameplay systems
2. `ProcessingNodeSystem`
3. `PendingHabitiPickupSystem`
4. `ClaimPendingHabitiPickupSystem`
5. existing `DynamicPhysicsSystem`

**Reason**

- processing completion updates cave pending state during apply
- the pickup sync system should see the updated cave state in the same tick’s system phase
- claim detection should happen after pickup entities have been synchronized

---

### `src/game/systems/pointer/pointerDropChoice.ts`

**Responsibility**

- choose which carried body is best for a short-drop target

**Required change**

- replace `ownedHabiti` input semantics with `knownHabiti`
- known Habiti means `owned ∪ pending`
- this prevents pending-but-unclaimed Habiti from being treated as new rewards again

**Interface contract**

- deterministic ordering remains unchanged apart from the new “known” set source

---

### `src/game/systems/pointer/pointerSystemActions.ts`

**Responsibility**

- pointer pickup/drop command emission

**Required change**

- pass `knownHabiti`, not only `ownedHabiti`, into `resolveBestDropBodyId()`
- continue to use existing drop semantics otherwise

---

### `src/ui/runtime/world/selection/absorption/resolveAbsorptionPreview.ts`

**Responsibility**

- build absorption preview for selected node + candidate bodies

**Required change**

- preview must use `knownHabiti = owned ∪ pending` when deciding `newHabiti` vs `duplicateHabiti`
- bonus calculations remain based on `ownedHabiti` only

**Interface contract**

- preview remains pure
- bonus rows are unchanged
- only Habiti uniqueness semantics change

---

### `src/game/handlers/absorptionBatchFinalization.ts`

**Responsibility**

- shared processing finalization helpers

**Required change**

- split old batch helper semantics into per-body-safe helpers
- the old “clear entire station assignment + reset entire station progress” behavior must not be reused by live per-body completion
- retain `incrementDestroyedCaveCounters()`
- add per-body-safe helpers for:
    - pulsing assignment completion on the node
    - marking one-off depletion on the node

**Interface contract**

- helpers mutate only the provided node/world entity objects
- helpers do not clear unrelated assigned bodies

---

### `src/game/handlers/processingFinalization.ts`

**Responsibility**

- narrow façade for processing finalization helpers

**Required change**

- re-export the new per-body-safe finalization helpers

---

### `src/data/raw/example/manifest.json`

**Responsibility**

- example content manifest

**Required change**

- include the new pickup blueprint file

---

## 5.2 New files

### `src/game/habiti/pendingHabiti.ts`

**Responsibility**

- central helper module for pending-Habiti state and deterministic pickup ids

**Must define**

- pickup blueprint id constant
- pickup tag constant
- deterministic pickup id prefix
- helper to encode a Habitus id into a pickup entity id
- helper to decode a pickup entity id back into a Habitus id
- helper to read `pendingHabiti` from a cave entity
- helper to read `knownHabiti = owned ∪ pending` from a cave entity
- helper to normalize/sort id lists

**Reason**

- this logic must not be duplicated across handler/system/UI files

---

### `src/game/systems/PendingHabitiPickupSystem.ts`

**Responsibility**

- synchronize pending cave Habiti into runtime pickup entities
- position those pickup entities around Cave every tick

**Logic**

- read Cave physics body
- read pending Habiti ids from cave
- compute deterministic desired pickup ids
- spawn missing pickup entities with `SPAWN`
- immediately set spawned pickups to `phantom` physics layer using `SET_PHYSICS_LAYER`
- kill stale pickup entities whose ids are no longer desired
- position all desired pickups on an orbit around Cave with deterministic angle ordering

**Orbit contract**

- pickups orbit Cave continuously
- orbit ordering is deterministic from sorted pending Habiti ids
- orbit radius is constant per pickup ring for this feature; there is no completion tightening on cave pickups
- cave pickup orbit must be visibly outside the Cave radius

**Interface contract**

- pure system-phase reader/emitter
- no direct world mutation

---

### `src/game/systems/ClaimPendingHabitiPickupSystem.ts`

**Responsibility**

- translate existing selection/tap state into a domain command

**Logic**

- read `sys_world.state.cave_selected_entity_id.value`
- if the selected id corresponds to a live pending Habiti pickup entity, emit `CLAIM_PENDING_HABITI_PICKUP { entityId }`
- otherwise do nothing

**Reason**

- reuses the existing tap/selection path instead of adding a new input path

**Interface contract**

- no direct mutation
- emits at most one claim command per selected pickup per tick
- stale/missing selections are ignored

---

### `src/game/handlers/ClaimPendingHabitiPickupHandler.ts`

**Responsibility**

- apply one pending-Habiti pickup claim

**Logic**

- validate entity existence and pickup-id parseability
- validate the decoded Habitus id is still present in `cave.pendingHabiti`
- compute:
    - next `pendingHabiti`
    - next `ownedHabiti`
- apply the cave change through the existing cave update path
    - use `UpdateCaveWithResourceGainBonusHandler` because ownership changes require bonus-state sync
- enqueue the existing Habiti announcement on `sys_world`
- remove the pickup entity and its impulse body

**Error handling contract**

- invalid entity id, non-pickup entity, unparsable pickup id, or missing pending membership must log loudly and do nothing else

---

### `src/data/raw/example/modules/pending_habiti_pickup.bp`

**Responsibility**

- authored structure for pending-Habiti pickup runtime entities

**Blueprint requirements**

- tag includes the pending-pickup tag constant used by runtime logic
- has physics so it is rendered and tappable
- has display data so it is visibly present in the world
- is smaller than Cave and smaller than assignment nodes
- no body component
- no assignment component
- no behavior rules
- no persistence-specific behavior authored on the blueprint itself; persistence is derived from `cave.pendingHabiti`

**Important note**

- visual asset choice must reuse an existing authored display asset from the current project asset set; no new art pipeline work is part of this change

---

## 6. Non-functional design rules

1. No direct ECS mutation outside apply phase.
2. No UI-side business logic.
3. No new React-owned simulation state.
4. No new persistence mechanism.
5. No new “shadow ownership” source of truth.
6. `ownedHabiti` and `pendingHabiti` must both be unique sorted arrays.
7. Node-global progress remains derived UI state only.
8. Body-local job state is authoritative.
9. Existing resource/xp spectacle path remains unchanged.
10. Existing Habiti modal/announcement UI remains unchanged and is reused.

---

## 7. Explicit out-of-scope items

The following are intentionally **not** part of this implementation:

- changing authored assignment ability schema
- renaming legacy `absorption_*` state keys project-wide
- introducing a new asset authoring format for Habiti-specific icons/glyphs
- changing cave-bonus math
- changing save-game format beyond naturally persisting the new `cave.pendingHabiti` field through existing stateful serialization
- changing pointer pickup/drop interaction model for bodies

---

## 8. Test plan

All tests must follow the uploaded testing standard: behavior-first, Given/When/Then readable structure, factories over boilerplate, real world/runtime objects where feasible.

## 8.1 Unit tests

### `src/game/assignment/bodyAssignment.test.ts` (new or extend if present later)

- resets `assignment_required_ms` together with existing body job state
- reads/writes body-local required duration correctly

### `src/game/assignment/assignmentNodeKinds.test.ts` (new)

- reads duration from `assignment_duration`
- falls back to `absorption_duration`
- returns `0` when neither exists

### `src/game/systems/body-assignment/orbitLayout.test.ts` (new)

- processing orbit starts at the large outer radius
- processing orbit ends in overlap radius at ratio `1`
- processing radius decreases monotonically as progress increases
- non-processing orbit kinds keep existing geometry

### `src/game/handlers/resolveAbsorptionHabitiOutcome.test.ts` (extend)

- `newHabiti` excludes ids already present in `knownHabiti`
- `duplicateHabiti` includes ids already pending
- unknown Habiti ids still call the existing error callback

### `src/game/habiti/pendingHabiti.test.ts` (new)

- deterministic pickup id encode/decode round-trips correctly
- known-Habiti helper returns unique sorted owned ∪ pending
- malformed pickup ids fail decode safely

### `src/game/systems/pointer/pointerDropChoice.test.ts` (new)

- pending Habiti count as already-known for prioritization
- butcher still prefers fewer new Habiti / lower xp after the known-set change

---

## 8.2 Integration tests

### `src/game/handlers/AssignBodiesBatchHandler.test.ts` (new)

- assigning to a processing node snapshots `assignment_required_ms` from `absorption_duration`
- assigning to a processing node sets status directly to `orbiting`
- assigning back to `sys_world` clears body-local job state

### `src/game/systems/ProcessingNodeSystem.test.ts` (new)

- advances two bodies independently on the same node
- resolves only the body whose own required duration is reached
- derives node progress from active bodies without making node state authoritative
- clears stale body job progress when the body is no longer orbiting a processing owner

### `src/game/handlers/ResolveBodyProcessingHandler.test.ts` (new)

- destructive completion deletes the body and increments cave counters
- non-destructive completion reassigns the body to `sys_world`
- completion pulses `assignment_complete_pulse`
- one-off node completion marks `is_depleted = 1`
- absorption completion adds new Habiti to `pendingHabiti`, not `ownedHabiti`
- duplicate/pending Habiti do not get added twice

### `src/game/systems/PendingHabitiPickupSystem.test.ts` (new)

- spawns missing pickup entities from `cave.pendingHabiti`
- kills stale pickup entities not present in `cave.pendingHabiti`
- positions pickup entities in a deterministic orbit around Cave
- sets pickup entities to phantom layer

### `src/game/systems/ClaimPendingHabitiPickupSystem.test.ts` (new)

- emits claim command when selected entity is a live pending pickup
- emits nothing for missing, stale, or non-pickup selections

### `src/game/handlers/ClaimPendingHabitiPickupHandler.test.ts` (new)

- valid claim moves Habitus id from pending to owned
- valid claim enqueues Habiti announcement
- valid claim removes the pickup entity
- invalid claim logs loudly and performs no mutation

### `src/engine/runtime/handlers/UpdateCaveHandler.test.ts` (extend)

- applies `pendingHabiti` uniquely and sorted
- preserves existing owned/understanding behavior

---

## 8.3 View tests

### `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.test.ts` (extend)

- active assignment node returns empty label and `<count> assigned`
- active assignment node returns no remaining-duration binding
- idle assignment node remains `Idle`

### `src/ui/runtime/world/node-overlays/NodeOverlayCard.test.tsx` (new)

- empty label does not render the label row
- static assignment count still renders

### `src/ui/runtime/world/selection/absorption/resolveAbsorptionPreview.test.ts` (new)

- pending Habiti are treated as already-known in preview outcome
- cave bonus breakdown still uses owned-only knowledge

### `src/ui/runtime/habiti/RuntimeHabitiGainModal.test.tsx` (keep existing, no semantic change)

- existing modal continues to render and acknowledge for the claimed Habiti item

---

## 9. Acceptance criteria

The implementation is complete only when all of the following are true.

1. Assignment-node bodies complete individually.
2. Body-local progress, not node-global progress, is authoritative.
3. Assignment-node bodies enter a large outer orbit immediately on assignment.
4. The orbit tightens continuously and visibly until overlap.
5. Completion occurs when the body-local orbit has visibly overlapped the node.
6. Node overlays no longer show node-global time-to-completion labels for active assignment nodes.
7. Absorption creates pending Habiti pickups instead of directly granting cave ownership.
8. Pending Habiti pickups orbit Cave.
9. Tapping a pickup grants ownership and shows the existing Habiti gained modal.
10. Untapped pickups remain present after `game.rebirth` because `pendingHabiti` persists on Cave.
11. Cave bonuses remain based on `ownedHabiti` only.
12. Preview and body-choice logic treat `owned ∪ pending` as already-known for uniqueness.
13. All relevant tests pass and no unrelated architecture is changed.

---

## 10. Implementation sequencing

Recommended order:

1. duration-read fix in `assignmentNodeKinds.ts`
2. cave schema + `UPDATE_CAVE` support for `pendingHabiti`
3. central pending-Habiti helper module
4. assignment handler/body job-state initialization
5. processing system body-local timing
6. orbit geometry + motion changes
7. per-body completion finalization changes in `ResolveBodyProcessingHandler`
8. pending-pickup systems and claim handler
9. overlay changes
10. preview/drop-choice known-set changes
11. tests

This order minimizes broken intermediate states and keeps runtime semantics coherent throughout the change.

