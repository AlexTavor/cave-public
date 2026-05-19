# LLD — Body-Owned Assignment and Pointer Interaction

## 1. Purpose

Define the low-level design for replacing the current proxy / anchor / face / swarm body-flow with a body-owned assignment model centered on a runtime pointer entity.

This document is grounded in the current codebase and the project contract.

This document is **in scope** for:

- body-owned assignment
- pointer pickup / carry / drop
- pointer preview veins
- power-by-bodies throttling
- processing-node body assignment
- orbiting / navigation / collision rules for assigned bodies
- removal of proxy / anchor / swarm / face detritus from the assignment path
- body backlight based on strongest base attribute

---

## 2. Why this change is required

## 2.1 Current assignment is node-owned and proxy-centric

Verified current facts:

- `src/data/schemas/assignment.ts` defines `assignment.assignedIds` on nodes and also defines `ProxyComponentSchema`.
- `src/engine/runtime/handlers/UpdateAssignmentHandler.ts` updates node `assignment.assignedIds` only.
- `src/engine/runtime/systems/behavior/behaviorSystemUtils.ts` derives child-to-parent relationships by scanning node assignment lists.
- `src/game/handlers/DispatchProxyHandler.ts` creates proxies and locks originals.
- `src/game/handlers/RecallProxyHandler.ts` recalls proxies.
- `src/game/systems/absorption/absorptionArrival.ts` turns proxy arrival into anchored assignment.
- `src/game/systems/poolContributors.ts` and `src/game/assignment/assignmentMinimums.ts` both contain proxy-resolution logic.

The current model is therefore: **node owns proxy ids**. The target model is: **body belongs to one owner**.

## 2.2 Bodies are not navigable first-class runtime entities today

Verified current facts:

- `src/engine/compiler/abilities/spatialCompiler.ts` removes `physics` from bodies and explicitly states that bodies are represented by Faces / Swarm.
- `src/game/main.ts` registers `FaceSystem` and `AbsorptionSystem` in the core game loop.
- `src/engine/runtime/runtimeWorld.ts` ensures `sys_world` and `sys_swarm`, but there is no pointer singleton.
- `src/engine/phaser/visuals/distressTarget.ts` resolves a body visual position through direct body physics, then face, then swarm.

The target interaction requires bodies to navigate to an owner and orbit that owner. That cannot be achieved while bodies remain indirect face/swarm stand-ins.

## 2.3 Current power control is UI-written throttle, not body-derived allocation

Verified current facts:

- `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx` renders the throttle slider.
- `src/ui/runtime/world/selection/usePowerSinkThrottle.ts` writes `UPDATE_POWER_SINK` directly from UI.
- `src/game/systems/EnergyDistributionSystem.ts` consumes sink throttle and computes efficiency.

The target interaction requires throttle to be derived from assigned bodies, not edited directly.

## 2.4 Current cave identity is `sys_world`

Verified current facts:

- `src/data/schemas/v2/systemDefaults.ts` defines `DEFAULT_WORLD_ENTITY` with id `sys_world`, cave state, cave display, and cave physics.
- `src/game/handlers/absorptionBatchContext.ts` resolves the cave by loading `sys_world` and reading its `cave` component.

Therefore the correct no-target fallback owner is `sys_world`. This document uses “Cave” and `sys_world` interchangeably because that is what the current runtime does.

---

## 3. Locked behavioral accords

## 3.1 Ownership model

A body always belongs to exactly one owner.

Valid owners are:

- `sys_world`
- `sys_pointer`
- any node entity that accepts body assignment

A body always has exactly one assignment status:

- `navigating`
- `orbiting`

No other assignment status exists.

## 3.2 Owner semantics

- `sys_world`: free body in the Cave
- `sys_pointer`: held body orbiting the pointer
- power node: orbiting body contributing to derived node throttle and power contribution
- processing node: orbiting body progressing toward node contact until node effect resolves

## 3.3 Pointer interaction

Pointer is a point of light.

Pointer has two radii:

- **pickup radius**: the visible main light; this is the collection area
- **connection radius**: a faint light used only for target acquisition and preview veins

### Pickup input

- Right mouse button (`RMB`) is the pickup button.
- A short `RMB` click picks up one eligible body within current pickup radius.
- Holding `RMB` grows pickup radius up to a maximum.
- Pickup radius growth accelerates over hold duration.
- Pickup cadence also accelerates over hold duration.
- Bodies picked up by pointer are assigned to `sys_pointer`.

### Drop input

- Left mouse button (`LMB`) is the drop button when pointer is carrying bodies.
- A short `LMB` click drops exactly one body.
- If there is no target node, the dropped body is assigned to `sys_world`.
- If there is a target node, the dropped body is assigned to that node.
- Holding `LMB` opens the body-selection menu.
- Accepting the body-selection menu assigns all selected bodies to the target node, or to `sys_world` if there is no target node.

## 3.4 Pointer target selection

- Pointer only considers assignable nodes inside pointer connection radius.
- Pointer always previews the **single closest** assignable node in connection radius.
- If no assignable node is in connection radius, pointer has no target.

## 3.5 Pointer preview veins

When pointer carries at least one body and has a target node:

- preview veins appear immediately
- preview veins do not grow in
- preview veins continuously wiggle
- preview veins connect pointer to the current closest target only
- preview vein thickness communicates magnitude
- preview vein color communicates power type for power nodes
- preview uses nervous veins for processing nodes

This preview is transient. It must not enter the persistent world vein graph.

## 3.6 Best-body selection on short drop

When short `LMB` drop assigns one carried body, the chosen body is deterministic.

### For power nodes

Rank carried bodies by:

1. highest value in the node’s most-needed attribute
2. highest value in the node’s second-most-needed attribute
3. highest value in the node’s third-most-needed attribute
4. lowest `entityId` lexicographically

The body stat used for this ranking is `body.attributes`, because the current schema explicitly stores `attributes` as the effective gameplay values and `baseAttributes` as the permanent underlying values.

Node need order is derived from unmet power demand:

- use `powerSink.baseDemand - powerSink.allocatedDraw` when `allocatedDraw` exists
- otherwise use `powerSink.baseDemand`
- sort descending by unmet amount
- break attribute ties in fixed order: `body`, `mind`, `social`

### For non-butcher processing nodes

Rank carried bodies by:

1. highest count of carried habiti not already owned by `sys_world.cave.ownedHabiti`
2. highest `body.xp`
3. lowest `entityId` lexicographically

### For butcher nodes

A butcher node is any processing node tagged `cave_butcher`, matching current content and current cave-event logic.

Rank carried bodies by:

1. lowest count of carried habiti not already owned by `sys_world.cave.ownedHabiti`
2. lowest `body.xp`
3. lowest `entityId` lexicographically

## 3.7 Orbit and collision rules

- Bodies assigned to owners orbit; they do not anchor.
- Bodies have no collision while orbiting.
- In the current impulse engine, the correct no-collision implementation is to place orbiting bodies on the `phantom` layer, because `phantom` bodies are excluded from spatial queries against each other.
- Bodies return to the default collision layer when they leave orbit and resume navigation.

## 3.8 Body backlight

Every body avatar has a light behind it.

That light color is chosen from the body’s strongest **base** attribute, not from cave-modified effective attributes.

Attribute order for tie-break is fixed:

- `body`
- `mind`
- `social`

---

## 4. Architectural fit to the current code

## 4.1 Existing mechanisms to reuse

The implementation must reuse these existing mechanisms because they already match the project contract:

1. **Command/apply mutation model**
    - mutations remain command-driven
    - systems remain read-only and emit commands only

2. **Singleton system entity pattern**
    - `src/engine/runtime/runtimeWorld.ts` already ensures system entities
    - extend it to ensure `sys_pointer`

3. **Impulse target navigation**
    - `src/game/handlers/SetTargetHandler.ts` already routes entities toward an entity id
    - use it for body navigation toward owners

4. **Dynamic radius sync**
    - `src/game/systems/DynamicPhysicsSystem.ts` already syncs display radius to physics radius from entity state references
    - use it for pointer pickup radius visualization

5. **Body selector shell**
    - `src/ui/runtime/world/selection/absorption/BodySelectorView.tsx` is reusable as the selection UI shell
    - only its data source and preview rules need to change

6. **Existing `UPDATE_STATE`, `UPDATE_BODIES_BATCH`, `UPDATE_POWER_SINK`, and `POSITION_ENTITY` handlers**
    - extend where necessary instead of creating redundant mutation paths

## 4.2 Existing mechanisms that must not be reused

The following mechanisms are structurally wrong for the new design and must be removed rather than wrapped:

- proxy dispatch / recall
- proxy entities as assignment members
- anchor-based assignment arrival
- face ownership of bodies
- swarm ownership of bodies
- direct UI writes to throttle
- absorption-specific selector actions as the assignment source of truth

---

## 5. Target runtime model

## 5.1 Body data model

`body` component is extended with:

- `assignmentId: string`
- `assignmentStatus: "navigating" | "orbiting"`

Default values for every spawned body:

- `assignmentId = "sys_world"`
- `assignmentStatus = "orbiting"`

Rationale:

- bodies begin owned by the Cave
- bodies are not in transit at spawn time

## 5.2 Owner model

Every owner capable of holding bodies has `assignment.assignedIds`.

That includes:

- `sys_world`
- `sys_pointer`
- power nodes that accept bodies
- processing nodes that accept bodies

`assignment.assignedIds` stores **real body ids only**.
It never stores proxy ids.

## 5.3 Assignment invariants

These invariants are mandatory and enforced by a single handler:

1. Every body has exactly one `assignmentId`.
2. Every body has exactly one `assignmentStatus`.
3. Every body appears in exactly one owner list.
4. Every owner list contains each body id at most once.
5. `body.assignmentId` always matches the owner list membership.
6. If an owner is missing, reassignment falls back to `sys_world`.
7. Orbiting bodies are on the phantom physics layer.
8. Navigating bodies are on the default physics layer.

## 5.4 Derived throttle rule

For nodes powered by bodies:

- `assignedCount(node)` = number of bodies assigned to that power node
- `totalAssignedPowerBodies` = total assigned bodies across all power nodes
- `powerSink.throttle(node)` = `assignedCount(node) / totalAssignedPowerBodies`
- if `totalAssignedPowerBodies = 0`, every such node gets throttle `0`

Processing-node assignments do not participate.

## 5.5 Per-body processing progress storage

Per-body processing progress is stored on the same entity that owns the `body` component, inside the entity `state` component defined by `src/data/schemas/components/state.ts`.

The only progress keys introduced by this LLD are:

- `assignment_progress_ms`
- `assignment_progress_ratio`

Rules:

- these keys are meaningful only while the body is assigned to a processing node and `body.assignmentStatus = orbiting`
- `assignment_progress_ms` stores elapsed processing time in milliseconds for the current owner
- `assignment_progress_ratio` stores normalized completion in `[0, 1]`
- both keys must be reset to `0` whenever the body is reassigned, destroyed, or no longer orbiting a processing node

---

## 6. Implementation design

## 6.1 File additions

### `src/game/handlers/AssignBodiesBatchHandler.ts`

**Responsibility**

- own all assignment ownership mutations

**Logic**

- accept batch reassignment requests
- validate each body id
- validate each owner id, falling back to `sys_world` if missing
- remove each body from its previous owner list
- set `body.assignmentId`
- set `body.assignmentStatus = navigating` unless owner is unchanged and already orbiting
- add body to new owner list
- ensure uniqueness on both sides
- log loudly on illegal commands

**Interface**

- new runtime command type: `ASSIGN_BODIES_BATCH`
- payload: `updates: Array<{ bodyId: string; ownerId: string }>`

No other file may patch both body assignment data and owner lists directly.

---

### `src/game/systems/BodyAssignmentSystem.ts`

**Responsibility**

- derive body navigation / orbit state from assignment ownership

**Logic**

- for each body, read `body.assignmentId` and `body.assignmentStatus`
- if owner is missing, emit fallback assignment to `sys_world`
- if status is `navigating`:
    - ensure body physics layer is `default`
    - ensure body target is the assigned owner id
    - when body enters owner capture radius, switch to `orbiting`
- if status is `orbiting`:
    - ensure body target is cleared
    - ensure body physics layer is `phantom`
    - compute orbit position and emit exact positioning command

This system owns only geometric state.
It does not resolve node processing outcomes.
It does not compute throttle.

**Interface**

- reads body assignment data, owner positions, owner kind, and the assigned body entity's own `state` keys `assignment_progress_ms` and `assignment_progress_ratio`
- emits `SET_TARGET`, `UPDATE_BODIES_BATCH`, `POSITION_ENTITY`, `SET_PHYSICS_LAYER`, and fallback `ASSIGN_BODIES_BATCH`

---

### `src/game/systems/body-assignment/orbitLayout.ts`

**Responsibility**

- pure orbit geometry for pointer, power nodes, and processing nodes

**Logic**

- compute deterministic slot order from owner `assignedIds`
- compute stable angle spacing so bodies appear one after another and do not stack
- compute owner-specific orbit radius and angular speed
- compute inward spiral radius for processing nodes from per-body progress

**Interface**

- pure functions only
- inputs: owner id, owner type, owner position, assigned ids, time, optional per-body progress
- output: orbit position and slot metadata for one body id

---

### `src/game/systems/PointerSystem.ts`

**Responsibility**

- own runtime pointer state and pointer-driven assignment decisions

**Logic**

- read `sys_pointer` raw input state
- derive current pickup radius with accelerating growth
- derive pickup cadence with accelerating rate
- resolve nearest assignable node inside connection radius
- derive preview target type and preview contribution values
- resolve short-drop best-body selection
- emit batch assignment commands for pickup and drop
- keep pointer preview state authoritative in ECS

**Interface**

- reads `sys_pointer` state, carried body ids, cave owned habiti, node snapshot, and body stats
- emits `ASSIGN_BODIES_BATCH`, `UPDATE_STATE`, and `UPDATE_BODIES_BATCH` only through command buffer

---

### `src/game/systems/pointer/pointerResolvers.ts`

**Responsibility**

- pure pointer-domain calculations

**Logic**

- vacuum growth curve
- pickup cadence curve
- eligible pickup body filtering
- nearest target resolution
- target need ordering for power nodes
- best-body ranking for short-drop
- preview contribution totals

**Interface**

- pure functions only

---

### `src/game/systems/PowerAssignmentSystem.ts`

**Responsibility**

- derive sink throttle from body assignment

**Logic**

- identify all power nodes that accept body assignment
- count assigned bodies per node
- compute total assigned count
- emit `UPDATE_POWER_SINK` for every participating node

**Interface**

- reads node assignment lists and `powerSink`
- emits `UPDATE_POWER_SINK`

---

### `src/game/systems/ProcessingNodeSystem.ts`

**Responsibility**

- own per-body processing progress for nodes that do things to bodies

**Logic**

- processing progress lives on the same entity that owns the `body` component, inside the entity `state` component
- the only processing progress keys are:
    - `assignment_progress_ms`
    - `assignment_progress_ratio`
- for each processing node and assigned body:
    - validate that body still belongs to that node and is orbiting
    - advance `assignment_progress_ms` from elapsed time and node `assignment.duration`
    - derive `assignment_progress_ratio` from elapsed progress
    - when progress reaches completion, emit processing command
- when a body is reassigned, missing, dead, or no longer orbiting a processing node, clear both progress keys back to `0`

**Interface**

- reads node assignment, body assignment, node `assignment.duration`, and the assigned body entity `state`
- emits `RESOLVE_BODY_PROCESSING` and `UPDATE_STATE` for body-local progress storage

---

### `src/game/handlers/ResolveBodyProcessingHandler.ts`

**Responsibility**

- resolve one completed processing event for one body on one node

**Logic**

- validate body and node existence
- resolve outputs by moving the current assignment-result logic out of the deleted absorption-batch files and into this handler
- use the current assignment result semantics already defined by `src/data/schemas/abilities/assignment.ts`:
    - `destroy_assigned_bodies`
    - `spawn_resource`
    - `transfer_habiti`
- apply outputs
- kill the body when node results destroy it
- otherwise reassign body to `sys_world`
- clear the body's `assignment_progress_ms` and `assignment_progress_ratio`
- increment existing cave counters when applicable

**Interface**

- new runtime command type: `RESOLVE_BODY_PROCESSING`
- payload: `{ nodeId: string; bodyId: string }`

This file does **not** introduce habitus bubbles. That remains out of scope.

---

### `src/engine/runtime/handlers/SetPhysicsLayerHandler.ts`

**Responsibility**

- mutate impulse body collision layer through the command pipeline

**Logic**

- validate entity and impulse body existence
- set runtime physics body layer to `default` or `phantom`
- log loudly on illegal targets

**Interface**

- new runtime command type: `SET_PHYSICS_LAYER`
- payload: `{ entityId: string; layer: "default" | "phantom" }`

This file is required because orbiting bodies must not collide, and current command handlers do not expose physics-layer mutation.

---

### `src/engine/phaser/scenes/PointerInputController.ts`

**Responsibility**

- translate mouse input into ECS pointer state

**Logic**

- bind scene input once, alongside camera and drag controllers
- write pointer world position continuously
- on `RMB` down / hold / up, write pointer pickup intent and hold duration
- on `LMB` down / hold / up, write pointer drop intent and selector-open intent
- prevent camera and selection handlers from claiming these interactions when pointer interaction is active

**Interface**

- writes to `sys_pointer` using runtime commands only
- no direct ECS mutation
- no business logic beyond input interpretation

---

### `src/engine/phaser/pointer/PointerPreviewSystem.ts`

**Responsibility**

- render pointer light accessories and transient preview veins

**Logic**

- read `sys_pointer` state every frame
- render the main pickup light radius
- render the faint connection-radius light
- render immediate, wiggling preview veins to the single current target
- remove all preview visuals instantly when there is no carried body or no target

**Interface**

- read-only against runtime
- no command emission
- scene-local Phaser objects only

This is separate from `VeinsSystem` because the preview is transient and pointer-scoped, not part of the persistent runtime vein graph.

---

### `src/engine/phaser/pointer/pointerPreviewGeometry.ts`

**Responsibility**

- pure geometry for transient pointer preview veins

**Logic**

- generate immediate guide paths between pointer and target
- preserve visible separation between multiple veins at short range
- produce continuous wiggle without growth-in behavior

**Interface**

- pure functions only

---

## 6.2 File changes

### `src/data/schemas/game/body.ts`

**Responsibility after change**

- define the canonical body runtime state

**Change**

- extend `BodyComponentSchema` with:
    - `assignmentId`
    - `assignmentStatus`

**Interface after change**

- `BodyComponent` exposes assignment ownership directly on the body

---

### `src/data/schemas/assignment.ts`

**Responsibility after change**

- define owner-side assignment only

**Change**

- keep `AssignmentComponentSchema`
- remove `ProxyComponentSchema`

**Interface after change**

- assignment schema contains owner-side assignment only
- no proxy schema remains

---

### `src/data/schemas/v2/systemDefaults.ts`

**Responsibility after change**

- provide default singleton entities

**Change**

- add `DEFAULT_POINTER_ENTITY`
- add `assignment` to `DEFAULT_WORLD_ENTITY` so the Cave can own free bodies
- remove `DEFAULT_SWARM_ENTITY`

**`DEFAULT_POINTER_ENTITY` requirements**

- id: `sys_pointer`
- `assignment.assignedIds`
- physics position so bodies can target it through `SET_TARGET`
- state fields for raw input, radii, target id, target kind, preview amounts, and selector intent

**Interface after change**

- pointer exists by default in every runtime
- Cave owns free bodies directly

---

### `src/data/schemas/v2/config.ts`

**Responsibility after change**

- define the singleton entity config surface

**Change**

- add `pointer` singleton config entry
- remove `swarm` and `faces` config entries

**Interface after change**

- `SysConfig` exposes `world` and `pointer` system entities only for this feature area

---

### `src/engine/runtime/runtimeWorld.ts`

**Responsibility after change**

- ensure required singleton entities exist

**Change**

- ensure `sys_world` and `sys_pointer`
- stop ensuring `sys_swarm`

**Interface after change**

- runtime bootstrap always contains pointer singleton

---

### `src/engine/runtime/types/runtimeCommandTypes.ts`

**Responsibility after change**

- define the command enum

**Change**

- add:
    - `ASSIGN_BODIES_BATCH`
    - `SET_PHYSICS_LAYER`
    - `RESOLVE_BODY_PROCESSING`
- remove:
    - `DISPATCH_PROXY`
    - `RECALL_PROXY`
    - `UPDATE_ANCHOR`
    - `ABSORB_BATCH`

**Interface after change**

- no proxy or anchor command types remain

---

### `src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts`

**Responsibility after change**

- define update payloads

**Change**

- extend `BodyUpdatePayload` with `assignmentId` and `assignmentStatus`
- add payload types for `ASSIGN_BODIES_BATCH`
- add payload type for `SET_PHYSICS_LAYER`
- add payload type for `RESOLVE_BODY_PROCESSING`

**Interface after change**

- assignment- and orbit-related mutations flow through typed payloads

---

### `src/engine/runtime/types/runtimeCommandUpdates.ts`

**Responsibility after change**

- define typed command aliases

**Change**

- add typed commands for new payloads
- remove typed commands for removed proxy, anchor, and absorption commands

**Interface after change**

- runtime command types stay consistent with the enum and payload files

---

### `src/engine/runtime/types/runtimeCommandUnion.ts`

**Responsibility after change**

- define the `RuntimeCommand` union

**Change**

- add the new command variants
- remove removed proxy / anchor variants

**Interface after change**

- compile-time command union matches runtime reality

---

### `src/game/handlers/UpdateBodiesBatchHandler.ts`

**Responsibility after change**

- apply all body-field updates, including assignment fields

**Change**

- merge `assignmentId`
- merge `assignmentStatus`
- keep existing body stat update behavior unchanged

**Interface after change**

- assignment status changes can reuse existing body batch updates where appropriate

---

### `src/game/registerGameCommandHandlers.ts`

**Responsibility after change**

- register the game-owned command handlers

**Change**

- register `AssignBodiesBatchHandler`
- register `ResolveBodyProcessingHandler`
- unregister `DispatchProxyHandler`
- unregister `RecallProxyHandler`
- unregister `AbsorbBatchHandler`
- unregister `AcknowledgeHabitiAnnouncementHandler` only when the later habitus document removes that flow globally; not in this change set

**Interface after change**

- proxy / batch absorption handlers are no longer part of game bootstrap

---

### `src/game/main.ts`

**Responsibility after change**

- compose the game runtime systems

**Change**

- register `BodyAssignmentSystem`
- register `PointerSystem`
- register `PowerAssignmentSystem`
- register `ProcessingNodeSystem`
- remove `FaceSystem`
- remove `AbsorptionSystem`

**Ordering requirement**

1. `BodySystem`
2. `BodyAssignmentSystem`
3. `PointerSystem`
4. `AttributePoolSystem`
5. `PowerAssignmentSystem`
6. `EnergyDistributionSystem`
7. `ProcessingNodeSystem`
8. `DynamicPhysicsSystem`

This preserves the rule that throttle derivation happens before energy distribution reads sink throttles.

---

### `src/engine/compiler/abilities/spatialCompiler.ts`

**Responsibility after change**

- compile world-presence / physics from blueprint config

**Change**

- stop deleting `physics` from body blueprints
- compile body physics like other navigable entities

**Interface after change**

- bodies become first-class physics entities

---

### `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx`

**Responsibility after change**

- render power job information without direct throttle editing

**Change**

- remove throttle slider UI completely
- keep power matrix / efficiency / cycle displays

**Interface after change**

- power throttling is observed only

---

### `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`

**Responsibility after change**

- none

**Change**

- delete this file
- remove all call sites in the same branch

**Interface after change**

- no UI throttle writer remains

---

### `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`

**Responsibility after change**

- resolve the correct card model for nodes that accept bodies or consume power

**Change**

- stop treating any `entity.assignment` as implicitly “assignment card first”
- explicitly distinguish:
    - power-by-bodies nodes
    - processing nodes
    - all other non-body node kinds already supported by the current resolver
- preserve storage / suspicious-activity / cycle analysis where still applicable

**Interface after change**

- hybrid nodes no longer collapse into the old absorption card path

---

### `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts`

**Responsibility after change**

- resolve node overlay model without old absorption assumptions

**Change**

- remove assignment-means-absorption routing
- route overlays based on explicit node capability

**Interface after change**

- body-powered nodes and processing nodes get correct overlay family

---

### `src/ui/runtime/world/selection/absorption/BodySelector.tsx`

**Responsibility after change**

- reusable body-selection shell for pointer long-drop

**Change**

- keep the file in its current folder in this change set
- change props from station-centric world candidates to pointer-carried candidates plus explicit target node
- keep the component shell and list rendering

**Interface after change**

- inputs:
    - `runtime`
    - `pointerEntity`
    - optional `targetEntity`
    - `onConfirm(ids)`
    - `onCancel()`

---

### `src/ui/runtime/world/selection/absorption/useBodySelector.ts`

**Responsibility after change**

- selector interaction state only

**Change**

- source candidates from `sys_pointer.assignment.assignedIds`
- source requirements from target node, not from “current station” ownership
- stop reading proxy state

**Interface after change**

- returns selected ids and drag-selection handlers for pointer-owned bodies

---

### `src/ui/runtime/world/selection/absorption/BodySelectorView.tsx`

**Responsibility after change**

- render the selector

**Change**

- hide expected rewards preview when target is not a processing node
- keep requirements section visible when target node has assignment requirements

**Interface after change**

- add explicit boolean input: `showExpectedRewards`

---

### `src/ui/runtime/world/selection/absorption/resolveAbsorptionPreview.ts`

**Responsibility after change**

- preview processing-node rewards only

**Change**

- accept explicit target node
- return no reward preview for non-processing nodes

**Interface after change**

- selector preview remains valid for processing nodes only

---

### `src/engine/phaser/scenes/GameScene.ts`

**Responsibility after change**

- own scene-level controllers and preview renderers

**Change**

- add `PointerInputController`
- add `PointerPreviewSystem`
- bind / destroy them with the scene lifecycle

**Interface after change**

- scene composes camera, entity drag, pointer input, and pointer preview explicitly

---

### `src/engine/phaser/scenes/GameScene.create.ts`

**Responsibility after change**

- initialize scene-only systems

**Change**

- initialize `PointerPreviewSystem`

**Interface after change**

- preview system is available during scene update

---

### `src/engine/phaser/scenes/entityDragController.ts`

**Responsibility after change**

- entity dragging only

**Change**

- stop treating bodies as draggable world entities
- ignore bodies entirely
- preserve current non-body drag behavior

**Interface after change**

- body manipulation belongs to pointer input, not drag controller

---

### `src/engine/phaser/camera/cameraControllerBindings.ts`

**Responsibility after change**

- camera input binding

**Change**

- do not let camera drag consume RMB pickup flow
- do not let carried-body LMB drop act as camera click-clear
- preserve existing camera behavior when pointer interaction is inactive

**Interface after change**

- camera and pointer input have explicit precedence rules

---

### `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

**Responsibility after change**

- register display definitions

**Change**

- remove face/swarm display keys
- retain `body_avatar`
- do not add a `pointer_light` display key; pointer rendering remains scene-local in `PointerPreviewSystem`

**Interface after change**

- no face/swarm display definitions remain

---

### `src/engine/phaser/display/modules/lightModuleDecorState.ts`

**Responsibility after change**

- compute decor light state for cave, bodies, and special displays

**Change**

- add `body_avatar` branch that selects aura color from strongest `body.baseAttributes`
- keep cave and attribute-pool lighting logic unchanged
- do not add pointer handling here because pointer rendering remains scene-local

**Interface after change**

- body avatars gain backlight from strongest base attribute

---

### `src/engine/phaser/visuals/distressTarget.ts`

**Responsibility after change**

- resolve body visual position from real bodies only

**Change**

- remove face fallback
- remove swarm fallback
- resolve direct body physics only

**Interface after change**

- distress visuals follow real body entities

---

## 6.3 File deletions

Each deletion below is mandatory for architectural cleanliness.

### Delete `src/game/handlers/DispatchProxyHandler.ts`

Reason: proxy dispatch is the wrong ownership model.

### Delete `src/game/handlers/RecallProxyHandler.ts`

Reason: unassignment replaces proxy recall.

### Delete `src/game/handlers/proxyAssignmentCleanup.ts`

Reason: cleanup logic is proxy-specific detritus.

### Delete `src/game/handlers/AbsorbBatchHandler.ts`

Reason: batch absorption is bound to proxy ownership and must be replaced by per-body processing resolution.

### Delete `src/game/handlers/absorptionBatchContext.ts`

Reason: only valid for the old absorption batch flow.

### Delete `src/game/handlers/absorptionBatchEntities.ts`

Reason: proxy/body dual-resolution helper is obsolete.

### Delete `src/game/handlers/absorptionBatchFinalization.ts`

Reason: old batch completion pipeline is removed.

### Delete `src/game/handlers/absorptionBatchProcessing.ts`

Reason: old batch processing model is removed.

### Delete `src/game/handlers/absorptionBatchProcessOutputs.ts`

Reason: old proxy processing model is removed.

### Delete `src/game/handlers/absorptionBatchProcessingOutcome.ts`

Reason: old batch outcome carrier is obsolete.

### Delete `src/game/handlers/absorptionBatchOutputs.ts`

Reason: output resolution must move behind per-body processing resolution.

### Delete `src/game/handlers/absorptionBatchCommandMetadata.ts`

Reason: old batch metadata is obsolete.

### Delete `src/game/handlers/absorptionBatchTargets.ts`

Reason: target resolution belongs to the new per-body processing handler.

### Delete `src/game/handlers/resolveAbsorptionHabitiOutcome.ts`

Reason: tied to the removed absorption batch flow.

### Delete `src/game/handlers/depletedAssignmentDispatch.ts`

Reason: tied to depleted proxy dispatch semantics.

### Delete `src/game/systems/AbsorptionSystem.ts`

Reason: proxy arrival + digestion system is replaced by direct body assignment and per-body processing.

### Delete `src/game/systems/absorption/absorptionArrival.ts`

Reason: anchored proxy arrival is obsolete.

### Delete `src/game/systems/absorption/absorptionArrivalUtils.ts`

Reason: arrival anchoring helper is obsolete.

### Delete `src/game/systems/absorption/absorptionDigestion.ts`

Reason: digestion now belongs to `ProcessingNodeSystem` and `ResolveBodyProcessingHandler`.

### Delete `src/game/systems/absorption/absorptionDigestionUtils.ts`

Reason: digestion helper is obsolete.

### Delete `src/game/systems/FaceSystem.ts`

Reason: bodies must exist directly, not through face indirection.

### Delete `src/game/systems/face/**`

Reason: face ownership / assignment / totals are obsolete once bodies are first-class and swarm is removed.

### Delete `src/utils/faceAssignment.ts`

Reason: face indirection is removed.

### Delete `src/ui/runtime/world/selection/face/**`

Reason: face UI is obsolete.

### Delete `src/ui/runtime/world/selection/swarm/**`

Reason: swarm UI is obsolete.

### Delete `src/ui/runtime/world/selection/SwarmRowItem.tsx`

Reason: obsolete after swarm removal.

### Delete `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`

Reason: UI throttle writing is removed.

### Delete `src/engine/runtime/handlers/UpdateAnchorHandler.ts`

Reason: anchor is no longer used by this game architecture.

### Delete `src/engine/phaser/display/modules/SwarmAvatarModule.ts`

Reason: swarm rendering is removed.

### Delete `src/engine/phaser/display/modules/swarmAvatarSlots.ts`

Reason: swarm rendering is removed.

Any remaining face, swarm, proxy, or anchor references elsewhere must be removed in the same implementation branch. No compatibility wrappers are allowed.

---

## 7. Pointer state contract on `sys_pointer`

The pointer runtime state must be explicit and scalar so it can be updated through existing `UPDATE_STATE` commands.

Required scalar state keys:

- `pointer_x`
- `pointer_y`
- `pickup_button_down`
- `pickup_hold_ms`
- `pickup_pulse_request`
- `pickup_radius`
- `connection_radius`
- `drop_button_down`
- `drop_hold_ms`
- `drop_single_request`
- `selector_open_request`
- `target_entity_id`
- `target_kind` (`"none" | "power" | "processing"`)
- `preview_body`
- `preview_mind`
- `preview_social`
- `preview_throttle`

Assignment membership for carried bodies stays on:

- `sys_pointer.assignment.assignedIds`

This keeps pointer truth entirely inside ECS and avoids React shadow state.

---

## 8. Node classification contract

An entity is **assignable** for this feature only when it has an `assignment` component.

A node is a **power node** if it has both:

- `assignment`
- `powerSink`

A node is a **processing node** if it has:

- `assignment`, and
- no `powerSink`, and
- an assignment ability config in `src/data/schemas/abilities/assignment.ts` whose current behavior is processing, defined as either:
    - `duration > 0`, or
    - `results.length > 0`

A processing node is a **butcher** if it has tag `cave_butcher`.

These classifications must be implemented by explicit resolvers in `src/game/systems/pointer/pointerResolvers.ts`. UI must not infer them from old card folders or old absorption naming.

---

## 9. Test plan

Tests must follow the uploaded testing standard: behavior-first, Given/When/Then, and real isolated runtime worlds for system integration.

## 9.1 Unit tests to add

### `src/game/systems/pointer/pointerResolvers.test.ts`

Verify:

- pickup radius growth accelerates with hold time
- pickup cadence accelerates with hold time
- nearest target resolution selects the closest node only inside connection radius
- power-node best-body ranking uses unmet-need order and effective attributes
- processing-node best-body ranking uses unowned habiti and xp rules
- butcher ranking reverses the processing priority
- deterministic tie-breaking uses `entityId`

### `src/game/systems/body-assignment/orbitLayout.test.ts`

Verify:

- stable slot ordering
- no position collapse for adjacent orbiters
- pointer orbit spacing
- power orbit speed scaling
- processing orbit radius shrink over progress

### `src/engine/phaser/pointer/pointerPreviewGeometry.test.ts`

Verify:

- immediate path generation
- no growth-in state
- short-range separation remains readable
- wiggle remains bounded

## 9.2 Integration tests to add

### `src/game/handlers/AssignBodiesBatchHandler.integration.test.ts`

Given bodies and owners,
when reassignment is applied,
then both body fields and owner lists stay consistent and unique.

### `src/game/systems/BodyAssignmentSystem.integration.test.ts`

Verify:

- navigating body emits `SET_TARGET`
- arriving body switches to `orbiting`
- orbiting body emits `POSITION_ENTITY`
- missing owner falls back to `sys_world`
- orbiting body emits phantom-layer change
- navigating body emits default-layer change

### `src/game/systems/PointerSystem.integration.test.ts`

Verify:

- short `RMB` pickup assigns one eligible body to `sys_pointer`
- long `RMB` hold expands pickup radius and can collect multiple bodies
- closest node targeting updates as pointer moves
- short `LMB` drop assigns exactly one best body to target or `sys_world`
- long `LMB` emits selector-open state only

### `src/game/systems/PowerAssignmentSystem.integration.test.ts`

Verify:

- derived throttles match assignment counts
- removing bodies from a node immediately rebalances remaining nodes
- zero assigned bodies sets all participating throttles to zero

### `src/game/systems/ProcessingNodeSystem.integration.test.ts`

Verify:

- per-body progress advances independently
- progress is stored on the body entity `state` component only
- completion emits one processing command per finished body
- reassigned / dead bodies are removed from progress tracking

### `src/game/handlers/ResolveBodyProcessingHandler.integration.test.ts`

Verify:

- `destroy_assigned_bodies` removes the body and clears ownership cleanly
- surviving bodies are reassigned to `sys_world`
- `spawn_resource` applies the correct resource output
- `transfer_habiti` applies the correct cave outcome without introducing the later bubble flow
- body-local processing progress keys are reset on completion

### `src/engine/runtime/handlers/SetPhysicsLayerHandler.test.ts`

Verify:

- default/phantom layer changes apply to runtime impulse bodies
- invalid targets log errors loudly

### `src/engine/runtime/runtimeWorld.test.ts`

Verify:

- runtime bootstrap ensures `sys_world` and `sys_pointer`
- runtime bootstrap no longer ensures `sys_swarm`

### `src/engine/compiler/abilities/spatialCompiler.test.ts`

Verify:

- body blueprints retain compiled physics
- body blueprints are no longer stripped to face/swarm indirection

## 9.3 UI / scene tests to add

### `src/engine/phaser/scenes/PointerInputController.test.ts`

Verify:

- `RMB` writes pickup state
- `LMB` writes drop state
- carried-body `LMB` does not clear selection through camera click handling
- `RMB` does not trigger camera drag

### `src/ui/runtime/world/selection/absorption/BodySelector.test.tsx`

Verify:

- candidates come from pointer ownership
- expected rewards are hidden when target is not a processing node
- expected rewards are shown when target is a processing node
- confirm callback returns selected carried ids only

### `src/ui/runtime/world/selection/job-card/JobCard.throttleVisibility.test.tsx`

Update expectations to verify:

- no throttle slider is rendered for body-powered nodes

### `src/ui/runtime/world/selection/job-card/resolveJobCardData.test.ts`

Verify:

- power-by-bodies nodes resolve to the power card path without slider editing
- processing nodes do not fall back to the old absorption-first routing

### `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.test.ts`

Verify:

- power-by-bodies nodes and processing nodes resolve through explicit capability checks, not legacy assignment-first routing

---

## 10. Migration order

This order is mandatory.

1. Add new command types and handlers.
2. Extend body schema and update payloads.
3. Add `sys_pointer` and add owner-side assignment to `sys_world`.
4. Stop stripping body physics in `spatialCompiler.ts`.
5. Implement `AssignBodiesBatchHandler` and `SetPhysicsLayerHandler`.
6. Implement `BodyAssignmentSystem`, `PointerSystem`, `PowerAssignmentSystem`, and `ProcessingNodeSystem`.
7. Add pointer input and preview rendering.
8. Replace selector data flow for pointer-owned bodies.
9. Remove UI throttle slider and throttle writer hook.
10. Delete proxy / anchor / absorption / face / swarm code.
11. Update remaining selection, overlay, and distress readers to use direct bodies only.
12. Run the full test suite and remove any remaining references to proxy, anchor, face, or swarm.

No compatibility layer is permitted at the end of the branch.

---

## 11. Non-goals and explicit exclusions

This LLD does not define:

- habitus bubble spawning, rendering, or collection
- replacement of the current habiti announcement modal
- curved resource bars or node resource arcs
- any other feature outside body assignment and pointer control

Those belong in separate design documents.

