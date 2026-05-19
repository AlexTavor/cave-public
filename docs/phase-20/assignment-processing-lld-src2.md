# LLD — corrective changes for processing outputs, Cave mood, assignment invalidation, node overlays, assignment descent, and absorption fill

### Requested changes

1. Butchered bodies must produce resources instead of only dying.
2. Cave must become **happy** when comfort crosses the relevant comfort boundary instead of remaining **curious**.
3. Bodies assigned to a node that becomes unusable must be reassigned to `sys_world`.
4. Node overlay must not show the number of assigned bodies.
5. Bodies assigned to an assignment ability node must spiral inward from the outer orbit instead of flying to the center and sticking there.
6. Absorption ability nodes must not show fill progress; the bodies themselves are the progress visualization.

### Out of scope

This document does **not** introduce unrelated refactors, new gameplay features, or new editor workflows.

---

## 3. Current implementation findings

This section records the exact current behaviors in the latest uploaded source.

### 3.1 Butcher resources are lost because `self` is not resolved

The authored butcher blueprint defines assignment results with `target: "self"` for both `food` and `heat`.

Current authored source:

- `src/data/raw/example/modules/butcher.bp`

Current compile/runtime path:

- `src/engine/compiler/abilities/assignmentCompiler.ts`
- `src/game/handlers/resolveBodyProcessingCommand.ts`

Current behavior:

- `assignmentCompiler` preserves `target: "self"` inside hidden `state.processing_outputs`.
- `handleResolvedBodyProcessing` looks up the target entity by `output.target` as a literal entity id.
- The literal id `"self"` does not exist as a runtime entity id.
- Therefore `target` resolves to `null` and `spawnYieldSpectacle(...)` is skipped.
- The body is then destroyed if the node destroys assigned bodies.

This is the direct reason butcher kills bodies without producing resources.

### 3.2 Cave has no explicit comfort-boundary-to-happy rule

Current emotion update and dominance path:

- `src/game/systems/cave/updateCaveEmotions.ts`
- `src/game/systems/cave/resolveDominantCaveEmotion.ts`
- `src/ui/runtime/status/caveStatusUtils.ts`
- `src/game/systems/cave/resolveCaveRenderLook.ts`
- `src/game/systems/cave/resolveCaveEyeRender.ts`
- `src/game/systems/cave/resolveCaveRenderState.ts`

Current behavior:

- `updateCaveEmotions(...)` updates numeric emotion intensities.
- `resolveDominantCaveEmotion(...)` chooses the visible/emphatic emotion from those numeric values only.
- Comfort contributes to happiness numerically, but there is no explicit rule that crossing the comfort boundary makes Cave present as happy.
- Curiosity can therefore remain numerically dominant after comfort crosses the midpoint.

Important existing code fact:

- `state.comfort.value` is normalized to `[0, 1]` by `src/data/schemas/v2/worldComfortRules.ts`.
- The midpoint `0.5` is the only neutral boundary already implicit in the current comfort model.

### 3.3 Bodies are not recalled when an owner becomes unusable

Current assignment handling path:

- `src/game/handlers/AssignBodiesBatchHandler.ts`
- `src/game/systems/BodyAssignmentSystem.ts`
- `src/game/assignment/assignmentNodeKinds.ts`
- `src/game/systems/pointer/pointerConditionalActivation.ts`
- `src/game/systems/energy/parentThrottle.ts`

Current behavior:

- Bodies keep their assignment until explicitly reassigned or until the owner is missing.
- `BodyAssignmentSystem` recalls to `sys_world` only when the owner entity no longer exists.
- There is no runtime system that recalls assigned bodies when the owner becomes unusable because:
    - the owner is depleted,
    - its parent chain is throttled to zero,
    - its `assignment` target is conditionally inactive,
    - its `cycle` target is conditionally inactive.

Therefore bodies can remain assigned to nodes that the player can no longer meaningfully use.

### 3.4 Assignment overlay still shows body count

Current overlay path:

- `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts`
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts`

Current behavior:

- active assignment overlay returns `valueText: String(assignedIds.length)`
- idle assignment overlay returns `label: "Idle"`

This is the direct source of the assigned-body count in the node overlay.

### 3.5 Processing assignment motion is still wrong

Current motion path:

- `src/game/handlers/AssignBodiesBatchHandler.ts`
- `src/game/systems/body-assignment/navigateAssignedBody.ts`
- `src/game/systems/body-assignment/orbitAssignedBody.ts`
- `src/game/systems/body-assignment/orbitLayout.ts`
- `src/game/systems/ProcessingNodeSystem.ts`

Current behavior:

- new processing assignments start in `assignmentStatus: "navigating"`
- `navigateAssignedBody(...)` still sets target to the owner entity id, which means center-seeking motion toward the node
- processing orbit speed is constant
- processing orbit radius shrinks, but the orbit is not initiated as the authoritative motion path from the start of processing
- `orbitAssignedBody(...)` does not seed processing orbit offsets and therefore does not preserve a meaningful descent handoff

This is why bodies do not perform the expected outer-orbit-to-inner-orbit spiral descent.

### 3.6 Processing completion timing does not use predicted next geometry

Current completion system:

- `src/game/systems/ProcessingNodeSystem.ts`

Current behavior:

- progress is advanced using `nextMs`
- completion geometry is checked against the **current snapshot** body position
- body orbit position changes are emitted by `BodyAssignmentSystem` in the same tick but are not visible in the stable snapshot used by `ProcessingNodeSystem`

Result:

- completion can lag behind the exact assignment duration by one tick because the geometry check is using the previous tick’s position rather than the position implied by `nextMs`

### 3.7 Assignment nodes still drive background fill from assignment activity

Current fill path:

- `src/engine/phaser/display/modules/backgroundModuleRuntime.ts`
- `src/engine/phaser/display/modules/backgroundBandSelector.ts`
- `src/engine/phaser/display/modules/backgroundCycleReader.ts`

Current behavior:

- any entity with an `assignment` component is treated as fill-active when bodies are assigned
- styled nodes are forced to active fill
- non-styled nodes render an assignment activity band

This is the direct source of fill on absorption-style assignment nodes.

---

## 4. Design decisions

### 4.1 Reuse existing command flow

All state changes continue to flow through existing runtime commands and handlers.

No system will directly mutate ECS state.

The reassignment path will reuse `RuntimeCommandType.ASSIGN_BODIES_BATCH`.

### 4.2 Reuse existing conditional activation mechanics

The runtime already has the information needed to determine whether `assignment` or `cycle` targets are active:

- `Snapshot.getBlueprint(...)`
- `normalizeConditionalActivationConfigs(...)`
- `isConditionalActivationTargetValid(...)`
- `hasConditionalActivationTarget(...)`
- `isConditionalActivationActive(...)`

The fix will use those existing mechanisms rather than introducing a parallel lock model.

### 4.3 Use the existing comfort midpoint as the comfort boundary

The current comfort model is already normalized to `[0, 1]`.

The midpoint `0.5` is the only neutral comfort boundary already implicit in the source, because:

- it is the midpoint of the normalized domain, and
- the current baseline happiness/sadness formulas are already centered around comfort as a continuous signal.

This design therefore defines the relevant comfort boundary as:

- `comfort >= 0.5`

### 4.4 Processing descent becomes immediate orbit motion

For processing assignment owners, the body will not use center-seeking navigation.

The authoritative motion model becomes:

- processing assignment begins in `orbiting`
- the orbit starts at the outer processing radius
- the radius shrinks monotonically for the entire assigned duration
- the angular speed increases monotonically for the entire assigned duration
- completion resolves when the predicted processing position at `nextMs` reaches contact geometry

This uses the existing body-local progress state instead of introducing a second timer.

### 4.5 Absorption nodes lose dynamic fill, not authored base styling

The requirement is to remove fill **as a progress indicator** for absorption-style assignment nodes.

This design therefore removes activity-driven fill behavior for processing assignment nodes while preserving authored static appearance:

- styled backgrounds keep their authored `fillAmount`
- assignment activity no longer forces them to full fill
- non-styled assignment activity overlay bands are not rendered for processing assignment nodes

---

## 5. Target behavior after the change

### 5.1 Butcher outputs

When a body completes processing on the butcher:

- the butcher node resolves `food` and `heat` output amounts
- both outputs target the butcher node itself
- spectacle/pending transfers are spawned toward the butcher node
- the body is then removed because the butcher destroys assigned bodies

### 5.2 Cave happiness

When Cave comfort crosses from below `0.5` to `0.5` or above:

- Cave must present as `happy` instead of `curious`, unless `scared` or `sad` still has higher precedence
- the same rule must drive both the status text and Cave eye-shape selection

### 5.3 Assignment invalidation recall

When a body is assigned to a node and that node becomes unusable because:

- it is depleted, or
- an ancestor master throttle resolves to `<= 0`, or
- its `assignment` target is conditionally inactive, or
- its `cycle` target is conditionally inactive,

then that body must be reassigned to `sys_world` by command.

### 5.4 Node overlay

For assignment nodes with active assigned bodies:

- the overlay must not display the count of assigned bodies

Idle assignment overlay behavior remains unchanged.

### 5.5 Processing descent

For processing assignment nodes:

- bodies must begin in `orbiting`
- the first processing orbit position is the outer processing orbit radius
- the body must not target the node center
- orbit radius must continuously decrease over the body’s `assignment_required_ms`
- orbit angular speed must continuously increase over the same duration
- completion must resolve at the end of that timed descent when the predicted next processing position reaches contact geometry

### 5.6 Processing fill

For processing assignment nodes:

- dynamic background fill must not represent assignment activity or progress
- the bodies themselves are the only progress visualization

---

## 6. File-by-file design

### 6.1 Change — `src/game/handlers/resolveBodyProcessingCommand.ts`

#### Responsibility

Resolve a single completed body-processing job against a processing node.

#### Current problem

It treats `output.target` as a literal runtime entity id.
This fails for authored `target: "self"` assignment outputs.

#### Required change

Add explicit processing-output target resolution before yield spectacle is spawned.

#### Logic

For each resolved processing output:

1. compute `amount` exactly as today
2. resolve the output target with the following rule set:
    - if `output.target` is absent, use `sys_world`
    - if `output.target === "self"`, use the processing node entity
    - otherwise, resolve by runtime entity id exactly as today
3. only skip spectacle spawning when the resolved target entity does not exist
4. leave all other processing finalization behavior unchanged

#### Interface contract

No new command types.
No new handler type.
The handler continues to receive:

- `RuntimeCommandType.RESOLVE_BODY_PROCESSING`

The handler continues to emit side effects through existing helper paths only.

---

### 6.2 Add — `src/game/assignment/assignmentOwnerUsability.ts`

#### Responsibility

Provide the single runtime predicate for whether an assignment owner is still usable for assigned bodies.

#### Why this file is needed

The unusable-owner rule is gameplay logic, not UI logic.
It is currently split across unrelated helpers and partially duplicated on the UI side.
A single game-side helper is required so the recall system is deterministic and testable.

#### Public interface

The file must export:

- `isAssignmentOwnerUsable(snapshot, owner): boolean`

Internal helpers may be file-local only.

#### Logic

`isAssignmentOwnerUsable(...)` must return:

- `true` for `sys_world`
- `false` when the owner is missing or has no id
- `false` when `state.is_depleted.value === 1`
- `false` when `resolveAncestorMasterThrottle(snapshot.getEntities(), owner.id) <= 0`
- `false` when the owner blueprint contains a valid conditional activation target for `assignment` and that target is inactive
- `false` when the owner blueprint contains a valid conditional activation target for `cycle` and that target is inactive
- `true` otherwise

#### Existing mechanisms to reuse

- `Snapshot.getBlueprint(...)`
- `normalizeConditionalActivationConfigs(...)`
- `hasConditionalActivationTarget(...)`
- `isConditionalActivationTargetValid(...)`
- `isConditionalActivationActive(...)`
- `resolveAncestorMasterThrottle(...)`

#### Non-goals

This helper must not:

- mutate runtime state
- enqueue commands
- duplicate UI explanation text

---

### 6.3 Add — `src/game/systems/AssignmentOwnerValiditySystem.ts`

#### Responsibility

Recall bodies from unusable assignment owners back to `sys_world`.

#### Why this file is needed

There is currently no runtime system that responds to owner invalidation after assignment has already happened.
The only existing automatic recall path is “owner missing”, which is too late and too narrow.

#### Public interface

Standard `System` implementation with:

- `tick(snapshot, commands): void`

#### Logic

On each tick:

1. scan all body entities
2. read each body’s `assignmentId`
3. ignore bodies already assigned to `sys_world`
4. resolve the owner entity from the snapshot
5. call `isAssignmentOwnerUsable(snapshot, owner)`
6. collect all bodies whose owners are unusable
7. emit exactly one `ASSIGN_BODIES_BATCH` command for the collected recalls, with `ownerId: "sys_world"`

#### Ordering

This system must be registered **before** `BodyAssignmentSystem` and **before** `ProcessingNodeSystem` in `src/game/main.ts`.

That ordering guarantees:

- invalid owners are detected as early as possible in the runtime tick order
- recall commands are buffered before assignment motion and processing resolution for the next apply phase

#### Interface contract

This system does not mutate entities directly.
It emits only:

- `RuntimeCommandType.ASSIGN_BODIES_BATCH`

---

### 6.4 Change — `src/game/main.ts`

#### Responsibility

Register runtime systems in the correct deterministic order.

#### Required change

Register `AssignmentOwnerValiditySystem` before:

- `BodyAssignmentSystem`
- `ProcessingNodeSystem`

#### Why

The new recall logic is part of assignment ownership validity.
It must run before the motion and processing systems that depend on that ownership.

---

### 6.5 Change — `src/game/handlers/AssignBodiesBatchHandler.ts`

#### Responsibility

Apply body-owner assignment changes and initialize assignment runtime state.

#### Current problem

Processing assignments currently begin in `navigating`, which routes bodies into center-seeking behavior.

#### Required change

For processing assignment owners, initialize the body as `orbiting` immediately.

#### Logic

When resolving `nextStatus`:

- if the next owner is a processing assignment node, use `orbiting`
- otherwise preserve the current behavior for world/power/other owners

All existing initialization must remain:

- remove from previous owners
- add to next owner’s assigned list
- reset assignment progress
- snapshot `assignment_required_ms`

#### Interface contract

No new command type.
No new state keys beyond the existing assignment progress keys.

---

### 6.6 Change — `src/game/systems/body-assignment/navigateAssignedBody.ts`

#### Responsibility

Handle the navigating phase of body assignment motion.

#### Current problem

It center-seeks the owner for all owner kinds.
That behavior is invalid for processing assignment nodes.

#### Required change

Make processing owners navigation-incompatible.

#### Logic

If `ownerKind === "processing"`:

- do not emit `SET_TARGET`
- do not keep the body in center-seeking navigation
- emit `UPDATE_BODIES_BATCH` to set `assignmentStatus: "orbiting"`
- return immediately

For all other owner kinds, preserve the existing behavior.

#### Why this change is still required even after 6.5

This preserves compatibility for any runtime body that is already in `navigating` for a processing owner, including:

- older saves
- already-running worlds
- bodies that reached that state before the code changed

---

### 6.7 Change — `src/game/systems/body-assignment/orbitLayout.ts`

#### Responsibility

Compute orbit radius, angle, offsets, and absolute orbit positions.

#### Current problem

Processing orbit speed is constant and the processing orbit path is not explicitly designed as a timed descent.

#### Required change

Make processing orbit position a deterministic function of body-local progress.

#### Logic

Retain the existing processing radius endpoints:

- `outer = ownerRadius + 6 * bodyRadius`
- `inner = ownerRadius + bodyRadius - overlapInset`
- `overlapInset = 0.25 * min(ownerRadius, bodyRadius)`

Add explicit processing angular speed scaling:

- base speed = existing processing speed `0.0015`
- max speed = `0.006`
- speed interpolation rule:
    - `speed = base + (max - base) * progressRatio`

Processing orbit rules after the change:

- radius decreases monotonically from `outer` to `inner` across `progressRatio ∈ [0, 1]`
- angular speed increases monotonically from `0.0015` to `0.006` across the same interval
- angle remains deterministic per `(ownerId, bodyId, timeMs)` using the current hash-based phase scheme

#### Public interface changes

Keep existing exports.
Add one additional exported helper:

- `resolveOrbitPositionAtProgress(...)`

This helper must compute the absolute orbit position for a supplied progress ratio without reading snapshot physics.

#### Why this helper is required

`ProcessingNodeSystem` must evaluate completion geometry using the predicted next processing position, not the stale current snapshot position.

---

### 6.8 Change — `src/game/systems/body-assignment/orbitAssignedBody.ts`

#### Responsibility

Place orbiting bodies on their owner orbit.

#### Current problem

Processing owners do not own a dedicated “timed descent” orbit path.

#### Required change

Split processing-owner orbit behavior from other owner kinds.

#### Logic

For `ownerKind === "processing"`:

1. ensure physics layer is `phantom`
2. clear any target id
3. compute the body’s processing orbit position using:
    - owner position
    - owner radius
    - body radius
    - assigned ids
    - body id
    - `timeMs`
    - body-local `assignment_progress_ratio`
4. emit `POSITION_ENTITY` directly to that computed processing orbit position
5. do **not** seed or use orbit offsets for processing owners

For non-processing owners:

- preserve the existing offset-based orbit behavior

#### Why offsets are not used for processing owners

The requirement is a deterministic outer-orbit-to-inner-orbit descent driven by the body’s timed processing progress.
Offset preservation is useful for world/power ambient orbiting but is not the desired motion contract for processing descent.

---

### 6.9 Change — `src/game/systems/ProcessingNodeSystem.ts`

#### Responsibility

Advance per-body processing progress and resolve completion.

#### Current problem

Completion geometry is checked against the stale snapshot body position.
This can delay completion by one tick after the nominal duration.

#### Required change

Check completion against the **predicted next processing position** implied by `nextMs` and the processing orbit function.

#### Logic

For each orbiting body assigned to a processing node:

1. compute `nextMs`
2. compute `nextRatio`
3. update body assignment progress state as today
4. compute the predicted next processing orbit position using `resolveOrbitPositionAtProgress(...)` and `nextRatio`
5. compute distance from that predicted position to the owner center
6. resolve processing when both conditions are true:
    - `nextMs === assignment_required_ms`
    - predicted next position is within the processing completion radius/contact threshold

The current cleanup path for bodies that are no longer actively processing remains unchanged.

#### Interface contract

No new command type.
The system continues to emit:

- `UPDATE_STATE`
- `RESOLVE_BODY_PROCESSING`

---

### 6.10 Change — `src/game/systems/cave/resolveDominantCaveEmotion.ts`

#### Responsibility

Resolve the visible/dominant Cave emotion from runtime emotional state.

#### Current problem

It has no comfort-boundary rule.
Curiosity can remain dominant after comfort crosses the midpoint.

#### Required change

Add comfort-aware happy precedence.

#### Public interface change

Change the exported function signature to:

- `resolveDominantCaveEmotion(emotions, comfort01): DominantCaveEmotion`

#### Logic

Dominance order after the change:

1. if terror is dominant by the current scared precedence rule, return `scared`
2. if sadness is dominant by the current sad precedence rule, return `sad`
3. if `comfort01 >= 0.5`, return `happy`
4. otherwise preserve the current happiness-vs-curiosity comparison

#### Why this is the correct layer

The user-visible problem is that Cave **presents** as curious after crossing the comfort boundary.
That presentation decision is made in the dominant-emotion resolver and consumed by both UI status and Cave eye-shape logic.

---

### 6.11 Change — `src/game/systems/cave/resolveCaveRenderLook.ts`

#### Responsibility

Convert Cave emotions into render-facing look decisions.

#### Required change

Pass `comfort01` into dominant-emotion resolution.

#### Public interface change

Change `resolveCaveEyeShape(...)` to accept:

- `attention`
- `emotions`
- `comfort01`

#### Logic

All eye-shape emotion resolution must now use the comfort-aware dominant-emotion rule.

---

### 6.12 Change — `src/game/systems/cave/resolveCaveEyeRender.ts`

#### Responsibility

Build eye render state.

#### Required change

Thread `comfort01` through to `resolveCaveEyeShape(...)`.

#### Public interface change

Add `comfort01` to the arguments needed for eye-shape resolution.

#### Logic

Only the emotion-shape selection input changes.
No other blink, pupil, or drift logic changes.

---

### 6.13 Change — `src/game/systems/cave/resolveCaveRenderState.ts`

#### Responsibility

Assemble full Cave render state from attention, emotions, and comfort.

#### Required change

Pass the existing `comfort01` argument through to `resolveCaveEyeRender(...)` / `resolveCaveEyeShape(...)`.

#### Why

This file already owns both the emotion set and the comfort value.
It is the correct place to thread the new comfort-aware render contract.

---

### 6.14 Change — `src/ui/runtime/status/caveStatusUtils.ts`

#### Responsibility

Build the Cave status sentence from runtime state.

#### Required change

Pass the runtime comfort value into `resolveDominantCaveEmotion(...)`.

#### Logic

`resolveCaveStatusParts(...)` must:

1. preserve hungry/cold logic exactly as today
2. read `state.comfort.value`
3. pass both `emotions` and `comfort01` into the dominant-emotion resolver

#### Why

The status note must use the same comfort-aware emotion rule as Cave rendering.

---

### 6.15 Change — `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts`

#### Responsibility

Build overlay entries for storage, cycle, and assignment nodes.

#### Current problem

Active assignment overlay renders the assigned-body count.

#### Required change

Suppress the active assignment count overlay.

#### Logic

`resolveAssignmentOverlayEntry(...)` must behave as follows:

- when `assignedIds.length === 0`, preserve the current idle overlay result
- when `assignedIds.length > 0`, return `null`

#### Why this exact rule

The request is to stop showing the number of assigned bodies.
Returning `null` for active assignment overlays removes the count entirely and avoids creating an empty card.

---

### 6.16 Change — `src/engine/phaser/display/modules/backgroundModuleRuntime.ts`

#### Responsibility

Resolve styled background fill fraction.

#### Current problem

Any assignable node uses assignment activity as dynamic fill when cycle data is absent.
This is wrong for absorption-style processing assignment nodes.

#### Required change

Exclude processing assignment nodes from assignment-activity fill.

#### Logic

When the entity is a processing assignment node:

- do not force fill to `1` because bodies are assigned
- return the authored `style.fillAmount` unchanged

For all other entity types, preserve existing behavior.

#### Detection rule

A processing assignment display node is an entity that:

- has an `assignment` component, and
- has processing assignment state, meaning any of:
    - `state.assignment_duration.value` is numeric, or
    - `state.absorption_duration.value` is numeric, or
    - `state.processing_outputs.value` is an array, or
    - `state.processing_destroys_assigned_bodies.value === true`

---

### 6.17 Change — `src/engine/phaser/display/modules/backgroundBandSelector.ts`

#### Responsibility

Resolve non-styled background bands.

#### Current problem

Processing assignment nodes render an assignment activity band when assigned.

#### Required change

Suppress assignment activity fill bands for processing assignment nodes.

#### Logic

When `entity` is assignable:

- if it is a processing assignment node, return only the base assignable band
- do not append the active absorption band

For non-processing assignment nodes, preserve the current behavior.

#### Why this file must change as well

Styled and non-styled backgrounds have separate fill paths.
Both paths must be corrected so the runtime behavior is consistent regardless of the authored style.

---

## 7. Tests

All tests must follow the project testing contract:

- Given / When / Then structure
- real data structures where feasible
- no DOM testing for pure runtime logic
- no mocking of the ECS world for systems

### 7.1 Add — `src/game/handlers/ResolveBodyProcessingHandler.test.ts`

#### Responsibility

Protect the `target: "self"` processing output contract.

#### Required cases

1. **Butcher-style self target resolves to the processing node**
    - Given a processing node with `processing_outputs` targeting `self`
    - When `RESOLVE_BODY_PROCESSING` is handled
    - Then pending yield spectacle is spawned toward that node and not dropped

2. **Non-self explicit target still resolves by id**
    - Given a processing output targeting another existing entity id
    - When the handler runs
    - Then spectacle targets that explicit entity

3. **Missing explicit target still skips spectacle safely**
    - Given a processing output targeting a missing entity id
    - When the handler runs
    - Then no spectacle is spawned and the handler still finalizes processing without silent errors

### 7.2 Add — `src/game/systems/AssignmentOwnerValiditySystem.test.ts`

#### Responsibility

Protect automatic recall from unusable owners.

#### Required cases

1. **Recalls bodies from depleted owner**
2. **Recalls bodies when ancestor master throttle resolves to zero**
3. **Recalls bodies when `assignment` target is conditionally inactive**
4. **Recalls bodies when `cycle` target is conditionally inactive**
5. **Does not recall bodies from `sys_world`**
6. **Does not emit recall when owner remains usable**

Each case must assert emitted `ASSIGN_BODIES_BATCH` updates to `sys_world`.

### 7.3 Change — `src/game/handlers/AssignBodiesBatchHandler.processing.test.ts`

#### Responsibility

Protect processing-assignment initialization.

#### Required new expectation

A newly assigned processing body must begin in `orbiting`, not `navigating`.

Also assert that:

- `assignment_required_ms` is initialized from the owner duration

### 7.4 Change — `src/game/systems/body-assignment/bodyAssignmentMotion.test.ts`

#### Responsibility

Protect processing descent motion.

#### Required cases

1. **Processing orbit positions immediately instead of seeding offsets**
    - Given a body assigned to a processing owner
    - When `orbitAssignedBody(...)` runs
    - Then it emits `POSITION_ENTITY`
    - And it does not seed offset state for processing owners

2. **Processing speed increases with progress**
    - Given the same body at low and high progress ratios
    - When `resolveOrbitPositionAtProgress(...)` is evaluated at equal `timeMs` deltas
    - Then the angular displacement at higher progress is greater

3. **Processing radius decreases with progress**
    - Given progress ratios `0`, mid, and `1`
    - Then the resolved radius is strictly descending

### 7.5 Add — `src/game/systems/ProcessingNodeSystem.test.ts`

#### Responsibility

Protect duration-accurate processing completion.

#### Required cases

1. **Does not resolve before required duration**
2. **Resolves exactly when predicted next processing position reaches completion geometry at full duration**
3. **Does not use stale snapshot geometry to resolve early**

### 7.6 Change — `src/game/systems/cave/resolveDominantCaveEmotion.test.ts`

#### Responsibility

Protect comfort-aware emotion dominance.

#### Required cases

1. **Comfort at or above midpoint returns happy over curiosity when not scared/sad**
2. **Scared still wins above comfort midpoint**
3. **Sad still wins above comfort midpoint**
4. **Below comfort midpoint, curiosity can still win**

### 7.7 Change — `src/ui/runtime/status/CaveStatusNote.content.cases.tsx`

#### Responsibility

Protect the user-visible Cave status sentence.

#### Required case

- Given comfort at or above the midpoint and curiosity numerically present
- When the status note renders
- Then it renders `happy`, not `curious`, unless the test fixture is explicitly scared or sad

### 7.8 Change — `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.test.ts`

#### Responsibility

Protect the removal of the assigned-body count overlay.

#### Required cases

1. **Active assignment overlay returns `null`**
2. **Idle assignment overlay still returns the idle model**

### 7.9 Change — `src/engine/phaser/display/modules/backgroundStyledProcess.test.ts`

#### Responsibility

Protect removal of dynamic fill for processing assignment nodes in the styled path.

#### Required case

- Given a styled processing assignment node with assigned bodies
- When `renderBackground(...)` is called without cycle data
- Then the fill fraction remains at the authored `style.fillAmount`
- And is not forced to active/full fill

### 7.10 Change — `src/engine/phaser/display/modules/backgroundBandSelector.test.ts`

#### Responsibility

Protect removal of active fill bands for non-styled processing assignment nodes.

#### Required cases

1. **Processing assignment node returns base assignable band only when assigned**
2. **Non-processing assignment node preserves the current active fill behavior**

---

## 8. Implementation order

1. Fix processing output target resolution for `self`
2. Add assignment-owner usability helper
3. Add assignment-owner validity system and register it
4. Change processing assignments to start in `orbiting`
5. Change processing navigation fallback to immediate orbit handoff
6. Update processing orbit layout and processing orbit placement
7. Update processing completion to use predicted next geometry
8. Remove active assignment overlay count
9. Remove processing assignment activity fill in styled and non-styled display paths
10. Apply comfort-aware dominant-emotion rule across runtime and UI callers
11. Update and add tests

This order keeps runtime behavior coherent while minimizing intermediate invalid states during development.

---

## 9. Acceptance criteria

The change is complete only when all of the following are true:

1. Butcher processing spawns `food` and `heat` toward the butcher node itself.
2. Cave status and Cave render present as `happy` once comfort crosses `0.5`, unless `scared` or `sad` still wins by precedence.
3. Bodies assigned to unusable nodes are recalled to `sys_world` through `ASSIGN_BODIES_BATCH`.
4. Active assignment node overlays do not show assigned-body counts.
5. Processing bodies do not center-seek; they descend by timed spiral from outer orbit to inner contact.
6. Processing completion uses the body’s timed descent and resolves at the end of the authored assignment duration.
7. Processing assignment nodes no longer use background fill as a progress indicator.
8. All updated and newly added tests pass.
9. No direct ECS mutation is introduced outside the apply phase.
10. No unrelated files are changed.

