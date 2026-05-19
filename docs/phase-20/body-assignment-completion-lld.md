# LLD — Complete Body Assignment / Pointer Ownership Implementation

## 1. Purpose

This document defines the work required to complete the current partial implementation of body-owned assignment, pointer ownership, pointer-driven pickup/drop, derived throttling, and processing-node orbit behavior.

This document is a completion delta for the current branch. It is grounded in the current implementation , constrained by the uploaded context pack, prompt contract, and testing standards.

This document is final and prescriptive for the remaining work. It contains no optional paths.

---

## 2. Scope

## 2.1 In scope

This document covers only the remaining work for:

- complete excision of proxy, anchor, face, and swarm mechanics
- completion of the pointer interaction and pointer preview contract
- completion of body-owned assignment invariants
- completion of processing-node orbiting and resolution
- completion of power-by-bodies throttling
- completion of direct body presentation needed for the above
- completion of tests for the above

## 2.2 Out of scope

The following are explicitly out of scope and must not be added to this work:

- habitus bubble spawning, collection, or UI
- node resource arcs / curved resource bars
- unrelated cleanup or renaming outside the files named below

Any existing implementation related to those out-of-scope items must be removed from this branch if it was introduced solely as part of this feature.

---

## 3. Current branch status

The current branch already contains the following correct foundations and they must be retained:

- `src/data/schemas/game/body.ts` adds `body.assignmentId` and `body.assignmentStatus`
- `src/data/schemas/v2/pointerSystemDefaults.ts` adds `sys_pointer`
- `src/engine/compiler/abilities/spatialCompiler.ts` now preserves body physics
- `src/game/handlers/AssignBodiesBatchHandler.ts` exists
- `src/game/systems/BodyAssignmentSystem.ts` exists
- `src/game/systems/PointerSystem.ts` exists
- `src/game/systems/PowerAssignmentSystem.ts` exists
- `src/game/systems/ProcessingNodeSystem.ts` exists
- `src/engine/phaser/scenes/PointerInputController.ts` exists
- `src/engine/phaser/pointer/PointerPreviewSystem.ts` exists

The current branch is incomplete because the old model remains active and the new pointer and selector contracts are only partially implemented.

---

## 4. Locked runtime model

## 4.1 Body ownership

Every body has exactly one owner.

Valid owners are:

- `sys_world`
- `sys_pointer`
- any assignable node

Each body stores:

- `body.assignmentId`
- `body.assignmentStatus`

Valid `assignmentStatus` values are:

- `navigating`
- `orbiting`

No additional assignment status is allowed.

## 4.2 Owner-side read model

Every owner that can hold bodies has `assignment.assignedIds`.

Owners in scope are:

- `sys_world`
- `sys_pointer`
- power nodes
- processing nodes

## 4.3 Invariants

These invariants are mandatory:

1. Every body appears in exactly one owner `assignedIds` list.
2. `body.assignmentId` always matches the owner that contains that body id.
3. `assignment.assignedIds` contains only real body ids.
4. `assignment.assignedIds` never contains proxy ids.
5. `sys_pointer.assignment.assignedIds` is the carried-body source of truth.
6. Orbiting bodies have no collision.
7. Navigating bodies use default collision.
8. All assignment mutations flow through one handler.

## 4.4 Node kinds

Node-kind classification is fixed:

- **power node**: entity has both `assignment` and `powerSink`
- **processing node**: entity has `assignment` and processing configuration in state
- **assignable target**: power node or processing node, and not depleted

The processing-node classification remains state-driven. The power-node classification is `assignment && powerSink`.

## 4.5 Pointer interaction contract

Pointer is a point of light.

### Pickup

- RMB short press picks one eligible body within pickup radius.
- RMB hold increases pickup radius until max.
- RMB hold also accelerates pickup cadence.
- Pickup radius and cadence acceleration are derived by `PointerSystem` from raw press state.
- Bodies picked up are reassigned to `sys_pointer`.

### Carry state

- A carried body is a body assigned to `sys_pointer`.
- A carried body remains in `orbiting` state and orbits `sys_pointer`.

### Preview

When `sys_pointer.assignment.assignedIds` is non-empty:

- pointer shows pickup radius as the bright light size
- pointer shows connection radius as a faint outer light
- pointer always previews the closest assignable node within connection radius
- preview appears immediately
- preview is always wiggling
- preview is never a growing vein
- preview uses power-vein styling for power nodes
- preview uses nervous-vein styling for processing nodes
- preview thickness and color encode node need / processing kind as defined below

### Drop

- LMB short press drops exactly one body
- If preview has no target node, dropped body is assigned to `sys_world`
- If preview has a target node, dropped body is assigned to that node
- The dropped body is selected by the target-specific resolver defined in `pointerResolvers.ts`

### Long press selector

- LMB long press opens the selector for carried bodies only
- Confirm assigns all selected bodies to preview target, or `sys_world` if no preview target exists
- Expected rewards are shown only for processing nodes
- Expected rewards are hidden for power nodes and no-target drops

## 4.6 Best-body selection contract

Short-drop best-body selection is fixed:

- for power nodes: choose the body strongest in the node’s most-needed attribute; tie-break by next-needed attribute, then id
- for processing nodes other than butcher: choose the body with the most unowned habiti, then highest xp, then id
- for butcher processing nodes: choose the body with the fewest unowned habiti, then lowest xp, then id
- for no target: use the same selection rule as butcher-free processing fallback, but owner is `sys_world`

Butcher detection remains tag-driven through the current `cave_butcher` tag.

## 4.7 Processing progress storage

Per-body processing progress is stored on the body entity state.

Required state keys on the body are:

- `assignment_progress_ms`
- `assignment_progress_ratio`

No node-owned per-body progress store is allowed.

## 4.8 Body backlight

Each body has a light behind it.

- backlight color is the body’s strongest base attribute
- cave-modified attributes are not used
- tie-break order is `body`, then `mind`, then `social`

This is presentation-only. It does not affect simulation.

---

## 5. Completion strategy

The remaining work is completed in this order:

1. excise old proxy / anchor / face / swarm runtime paths
2. finish the pointer preview and selector contracts
3. finish processing resolution without habiti bubble work
4. finish cleanup of stale UI/runtime consumers of removed commands
5. add full tests for the new path and removed path boundaries

This order is mandatory.

---

## 6. File-level design

Only files named below are to be changed, added, or deleted.

## 6.1 Files to change

### `src/game/main.ts`

**Responsibility**

Register the active game systems.

**Required change**

- Remove `FaceSystem` import and registration.
- Keep `BodyAssignmentSystem`, `PointerSystem`, `PowerAssignmentSystem`, and `ProcessingNodeSystem` registered.
- Preserve existing system ordering except for removing `FaceSystem`.

**Post-change interface**

- No face/swarm presentation system is registered.
- Bodies are presented through direct body display only.

---

### `src/game/registerGameCommandHandlers.ts`

**Responsibility**

Register game-level runtime command handlers.

**Required change**

- Remove registration of:
  - `DispatchProxyHandler`
  - `RecallProxyHandler`
  - `AbsorbBatchHandler`
- Keep registration of:
  - `AssignBodiesBatchHandler`
  - `ResolveBodyProcessingHandler`
  - existing unrelated handlers that remain valid

**Post-change interface**

The only assignment / processing mutation handlers for this feature are:

- `AssignBodiesBatchHandler`
- `ResolveBodyProcessingHandler`

---

### `src/engine/runtime/runtimeWorld.ts`

**Responsibility**

Ensure required singleton runtime entities exist.

**Required change**

- Stop ensuring `sys_swarm`.
- Keep ensuring `sys_world`.
- Keep ensuring `sys_pointer`.

**Post-change interface**

Singletons ensured by this file for this feature are:

- `sys_world`
- `sys_pointer`

---

### `src/data/schemas/v2/config.ts`

**Responsibility**

Define runtime system singleton defaults exposed through config.

**Required change**

- Remove `swarm` default from `SysConfigSchema`.
- Remove `faces` default from `SysConfigSchema`.
- Keep `world` and `pointer` defaults.

**Post-change interface**

`SysConfigSchema` contains no swarm or face system defaults.

---

### `src/data/schemas/v2/systemDefaults.ts`

**Responsibility**

Define default singleton entities.

**Required change**

- Remove `DEFAULT_SWARM_ENTITY`.
- Remove swarm-only state and display defaults.
- Keep `DEFAULT_WORLD_ENTITY`.
- Re-export `DEFAULT_POINTER_ENTITY`.

**Post-change interface**

This file defines only defaults still used at runtime.

---

### `src/data/schemas/v2/worldRuleBuilders.ts`

**Responsibility**

Build world elastic-demand rules.

**Required change**

- Replace `sys_swarm.state.swarm_count.value` in generated formulas.
- Use `global.population` instead.

**Reason**

`CensusSystem` already maintains `global.population`. Swarm count must no longer exist.

**Post-change interface**

Generated world auto-request rules depend on `global.population`, not on `sys_swarm` state.

---

### `src/engine/runtime/runtimeArrivalHandlers.ts`

**Responsibility**

Translate impulse arrivals into follow-up runtime commands.

**Required change**

- Remove proxy-specific arrival handling entirely.
- Keep transfer arrival handling unchanged.
- Do not enqueue any proxy-state updates.

**Post-change interface**

This file handles transfer arrivals only for the removed old path. Body arrival for assignment remains handled by `BodyAssignmentSystem` through distance checks.

---

### `src/engine/runtime/createGameRuntime.ts`

**Responsibility**

Register core runtime command handlers.

**Required change**

- Remove `UpdateAnchorHandler` registration.

**Post-change interface**

The runtime does not register an anchor handler.

---

### `src/engine/runtime/types/runtimeCommandTypes.ts`

**Responsibility**

Declare the command type enum.

**Required change**

Remove these enum members:

- `UPDATE_ANCHOR`
- `DISPATCH_PROXY`
- `RECALL_PROXY`
- `ABSORB_BATCH`

Keep:

- `ASSIGN_BODIES_BATCH`
- `RESOLVE_BODY_PROCESSING`
- `SET_TARGET`
- `SET_PHYSICS_LAYER`
- other unrelated live commands

**Post-change interface**

The runtime command enum contains no proxy, anchor, or absorb-batch command types.

---

### `src/engine/runtime/types/runtimeCommandPayloadsAbsorption.ts`

**Responsibility**

Currently declares several command payloads, including obsolete proxy/absorption payloads.

**Required change**

- Remove payload interfaces for:
  - `DispatchProxyCommandPayload`
  - `RecallProxyCommandPayload`
  - `AbsorbBatchCommandPayload`
- Retain only payload interfaces still used by live commands in this file.

**Post-change interface**

This file contains no payload shapes for removed commands.

---

### `src/engine/runtime/types/runtimeCommandPayloads.ts`

**Responsibility**

Re-export live runtime command payload types.

**Required change**

- Remove re-exports of removed proxy / absorb payload types.
- Keep re-exports of live payload types only.

**Post-change interface**

The exported runtime payload surface contains no removed-command payload types.

---

### `src/engine/runtime/types/runtimeCommandAbsorption.ts`

**Responsibility**

Currently declares command types built on removed proxy/absorption commands.

**Required change**

- Remove command type aliases for:
  - `DispatchProxyCommand`
  - `RecallProxyCommand`
  - `AbsorbBatchCommand`
- Keep only live command aliases still sourced from this file, if any.

**Post-change interface**

This file exposes no removed command aliases.

---

### `src/game/assignment/assignmentNodeKinds.ts`

**Responsibility**

Classify assignment owners and valid targets.

**Required change**

- Keep `isPowerAssignmentNode` as `assignment && powerSink`, excluding `sys_world` and `sys_pointer`.
- Keep `isProcessingAssignmentNode` as state-driven processing detection.
- Change `isAssignableTargetNode` to return `true` only when the entity is either a power node or a processing node, and is not depleted.
- Keep `resolveAssignmentOwnerKind` returning only:
  - `world`
  - `pointer`
  - `power`
  - `processing`
  - `other`

**Post-change interface**

Target resolution cannot target arbitrary `assignment` nodes. It can target only power nodes or processing nodes.

---

### `src/game/assignment/assignmentMinimums.ts`

**Responsibility**

Compute assignment minimum progress.

**Required change**

- Remove proxy resolution.
- Treat each assigned id as a real body id.
- Resolve attributes and level directly from the body entity.

**Post-change interface**

This file has no knowledge of proxies.

---

### `src/game/systems/poolContributors.ts`

**Responsibility**

Decide which bodies still contribute to world attribute pools.

**Required change**

- Remove proxy-origin resolution.
- Exclude assigned bodies by direct body id only.
- Remove all proxy-aware code paths.
- Keep excluding non-`sys_world` assigned bodies from the pool.

**Post-change interface**

Pool exclusion is body-id based only.

---

### `src/game/handlers/AssignBodiesBatchHandler.ts`

**Responsibility**

Enforce assignment invariants.

**Required change**

- Replace silent `sys_world` failure with explicit telemetry error and no mutation.
- Keep fallback to `sys_world` only when target owner is missing.
- Preserve the rule that same-owner reassignment keeps `orbiting`; all other reassignments set `navigating`.
- Keep resetting `assignment_progress_ms` and `assignment_progress_ratio` on reassignment.
- Preserve uniqueness and stable sort of `assignedIds`.

**Post-change interface**

Consumes:

- `ASSIGN_BODIES_BATCH` with `updates: Array<{ bodyId: string; ownerId: string }>`

No other file may mutate both body-side and owner-side assignment state.

---

### `src/game/handlers/ResolveBodyProcessingHandler.ts`

**Responsibility**

Resolve one completed processing action for one body.

**Required change**

- Remove any habitus-bubble work from this handler.
- Replace silent early returns with explicit telemetry errors for invalid body, invalid node, or missing `sys_world` cave.
- Keep output, xp, destruction, and reassign-to-`sys_world` behavior.
- Remove direct manual mutation of `node.assignment.assignedIds`; rely on `ASSIGN_BODIES_BATCH` for survivor reassignment and explicit cleanup for body death.
- Keep resetting `assignment_progress_ms` and `assignment_progress_ratio`.
- If the body dies, remove it and ensure its id is removed from the node owner list before handler exit.

**Post-change interface**

Consumes:

- `RESOLVE_BODY_PROCESSING` with `{ nodeId: string; bodyId: string }`

This handler does not spawn habitus bubbles.

---

### `src/game/systems/BodyAssignmentSystem.ts`

**Responsibility**

Own the navigating/orbiting movement contract.

**Required change**

- Keep `navigating` => `SET_TARGET` + default layer.
- Keep `orbiting` => `POSITION_ENTITY` + phantom layer.
- Keep owner-missing fallback to `ASSIGN_BODIES_BATCH` → `sys_world`.
- Preserve the rule that orbiting bodies have no collision.
- Preserve the rule that navigating bodies do have collision.
- Do not introduce any third assignment state.

**Post-change interface**

Reads:

- body assignment fields
- body state progress fields
- owner kind and owner `assignedIds`
- body and owner physics positions

Emits only:

- `SET_TARGET`
- `SET_PHYSICS_LAYER`
- `POSITION_ENTITY`
- `UPDATE_BODIES_BATCH`
- `ASSIGN_BODIES_BATCH`

---

### `src/game/systems/body-assignment/orbitLayout.ts`

**Responsibility**

Compute orbit positions for the three live owner kinds.

**Required change**

- Keep deterministic slot ordering by owner `assignedIds` order.
- Keep pointer orbit, power-node orbit, and processing-node orbit as separate variants in one pure file.
- Use `assignment_progress_ratio` for processing inward motion.
- For power-node orbit speed, continue to derive speed from current assigned count / node power state only. Do not add new simulation state.
- Ensure bodies are spaced sequentially and visually ordered “one after another”.

**Post-change interface**

Pure function inputs are:

- owner id
- owner kind
- owner x/y
- ordered assigned ids
- body id
- time ms
- progress ratio

Pure function output is:

- `{ x: number; y: number }`

---

### `src/game/systems/PointerSystem.ts`

**Responsibility**

Own runtime pointer state, nearest-target resolution, pickup/drop intent resolution, and preview-state emission.

**Required change**

- Keep raw press booleans read from `sys_pointer.state`.
- Keep pickup and drop hold timers in runtime state.
- Extend preview state writes to include explicit per-attribute preview values:
  - `pointer_preview_body`
  - `pointer_preview_mind`
  - `pointer_preview_social`
  - `pointer_preview_mode` where value is `none`, `power`, or `nervous`
- Keep `pointer_target_id` and `pointer_target_kind`.
- Keep `pointer_pickup_radius` and `pointer_connection_radius`.
- Remove the current `pointer_preview_amount`-only preview model as the sole preview contract; it may remain as a convenience count, but it cannot be the only preview data.
- When no carried bodies exist, clear preview mode and preview values to zero/`none`.

**Post-change interface**

Writes only runtime state and assignment commands. It does not render and it does not open UI directly except by state flags on `sys_pointer`.

---

### `src/game/systems/pointer/pointerResolvers.ts`

**Responsibility**

Provide pure pointer-domain logic.

**Required change**

Keep and finalize these pure responsibilities:

- pickup radius curve
- pickup cadence curve
- eligible pickup resolution
- nearest target resolution
- best-body selection
- preview attribute totals for power targets
- preview mode selection (`power` or `nervous`)

The numeric rules are fixed to the current implementation unless changed here explicitly:

- pickup radius starts at `90`
- pickup radius max is `220`
- pickup cadence starts at `260ms`
- pickup cadence minimum is `60ms`

Best-body resolver logic is the locked contract from section 4.6.

**Post-change interface**

Pure function surface is test-only and side-effect free.

---

### `src/game/systems/pointer/pointerSystemActions.ts`

**Responsibility**

Translate derived pointer state into command emissions.

**Required change**

- Keep one-body pickup per cadence tick.
- Keep short-drop body assignment through `ASSIGN_BODIES_BATCH`.
- On LMB long press, keep opening selector via `sys_pointer.state.pointer_selector_open = true` and storing `pointer_selector_target_id`.
- Also write `pointer_selector_target_kind` so the selector can hide/show expected rewards without recomputing target kind in React.
- For no-target drop, keep owner id as `sys_world`.

**Post-change interface**

This file emits only runtime commands. It does not read React state.

---

### `src/data/schemas/v2/pointerSystemDefaults.ts`

**Responsibility**

Define `sys_pointer` default runtime shape.

**Required change**

Add these state keys:

- `pointer_selector_target_kind`
- `pointer_preview_body`
- `pointer_preview_mind`
- `pointer_preview_social`
- `pointer_preview_mode`

Keep existing keys already added by the current branch.

**Post-change interface**

`sys_pointer` contains the full runtime state required by `PointerSystem`, selector UI, and preview rendering.

---

### `src/engine/phaser/scenes/PointerInputController.ts`

**Responsibility**

Translate Phaser mouse input into raw pointer runtime state.

**Required change**

- Keep pointer movement writing `POSITION_ENTITY` for `sys_pointer`.
- Keep RMB mapped to pickup booleans.
- Keep LMB mapped to drop booleans.
- Keep the current guard that LMB down does nothing when there are no carried bodies.
- Do not resolve targets or bodies here.
- Do not add UI-local pointer state.

**Post-change interface**

This file emits only:

- `POSITION_ENTITY`
- `UPDATE_STATE`

---

### `src/engine/phaser/pointer/PointerPreviewSystem.ts`

**Responsibility**

Render pointer pickup light, connection radius, and preview vein.

**Required change**

- Keep drawing pickup radius and connection radius.
- Read `pointer_preview_mode`, `pointer_preview_body`, `pointer_preview_mind`, `pointer_preview_social`, `pointer_target_id`, and carried count from runtime.
- Use `pointer_preview_mode = power` to render a power preview vein.
- Use `pointer_preview_mode = nervous` to render a nervous preview vein.
- Vein must appear immediately; it must never animate as growth.
- Vein must continue to wiggle over time.
- Thickness must be derived from preview totals, not just carried count.
- Color must be derived from node need for power targets; for nervous targets use the nervous palette.

**Post-change interface**

Presentation only. No runtime mutation.

---

### `src/engine/phaser/pointer/pointerPreviewGeometry.ts`

**Responsibility**

Build the preview path geometry.

**Required change**

- Keep deterministic wiggling.
- Increase lateral spread logic so close-range pointer-to-node previews still read clearly.
- Keep immediate full path output.
- Do not add any growth/reveal timeline.

**Post-change interface**

Pure function input:

- pointer position
- target position
- time ms
- preview mode / width inputs as needed

Pure function output:

- ordered points for the preview path

---

### `src/engine/phaser/scenes/GameScene.pointer.ts`

**Responsibility**

Attach pointer input and preview scene systems.

**Required change**

- Keep attaching `PointerInputController`.
- Keep attaching `PointerPreviewSystem`.
- No face/swarm dependency may remain in this scene helper.

**Post-change interface**

No behavioral change beyond the updated preview renderer.

---

### `src/ui/runtime/world/pointer/usePointerBodySelector.ts`

**Responsibility**

Drive selector state from carried bodies and current target.

**Required change**

- Remove direct dependency on `resolveAbsorptionPreview`.
- Replace it with a generic selector preview resolver that accepts target kind.
- Continue using assignment minimums for confirm gating.
- Continue using carried-body candidate ids only.

**Post-change interface**

Returns:

- `selectedIds`
- `canConfirm`
- `preview`
- `requirements`
- list interaction handlers

`preview` must already contain whether expected rewards are visible.

---

### `src/ui/runtime/world/pointer/PointerSelectorOverlay.tsx`

**Responsibility**

Render the carried-body selection modal.

**Required change**

- Stop defaulting to `resolveAbsorptionPreview`.
- Read `pointer_selector_target_kind` from `sys_pointer.state`.
- Pass target kind into the selector controller.
- Confirm action remains `ASSIGN_BODIES_BATCH`.
- No-target confirm assigns to `sys_world`.

**Post-change interface**

This component remains a pure UI observer plus command emitter.

---

### `src/ui/runtime/world/selection/absorption/BodySelectorView.tsx`

**Responsibility**

Render the body-selection modal content.

**Required change**

- Keep using the current list and footer shell.
- Make expected rewards conditional.
- Do not render `HabitiGainDisplay` when `preview.showExpectedRewards === false`.
- Keep assignment requirements visible.

**Post-change interface**

Change props contract so `preview` includes:

- `showExpectedRewards: boolean`
- `xp`
- `resourceRows`
- `newHabitiEntries`

The component remains display-only.

---

### `src/ui/runtime/world/selection/selectionLensMap.ts`

**Responsibility**

Map selected entities to selection cards.

**Required change**

- Remove face card lens.
- Remove swarm card lens.
- Keep all remaining live lenses.

**Post-change interface**

No selection path exists for face or swarm entities.

---

### `src/engine/phaser/visuals/distressTarget.ts`

**Responsibility**

Resolve the visual position target for distress effects.

**Required change**

- Remove face fallback.
- Remove swarm fallback.
- Resolve body position directly from body physics only.

**Post-change interface**

Body distress targeting is direct-body only.

---

### `src/engine/phaser/display/modules/lightModuleDecorState.ts`

**Responsibility**

Resolve decorative light state for display keys.

**Required change**

- Add a `body_avatar` branch.
- Compute strongest base attribute from `entity.body.baseAttributes`.
- Resolve backlight color from the existing attribute color source already used elsewhere in the display stack.
- Use tie-break order `body`, then `mind`, then `social`.
- Do not use cave-modified attributes.

**Post-change interface**

Body avatars render a backlight derived from strongest base attribute.

---

### `src/ui/runtime/state/runtimeFactory.ts`

**Responsibility**

Wire runtime event and callout accumulation.

**Required change**

- Remove the `resolveHabitiRuntimeEvents` import and application from this branch.
- Do not replace it in this scope.

**Reason**

Habitus bubble and habitus runtime event work is out of scope for this document, and the current hook depends on removed `ABSORB_BATCH` traffic.

**Post-change interface**

This file no longer observes removed absorb-batch events.

---

### `src/ui/runtime/notifications/resolveRuntimeNotificationEventAccumulator.ts`

**Responsibility**

Accumulate runtime notification events from applied commands.

**Required change**

- Remove `ABSORB_BATCH` handling.
- Keep unrelated notification accumulation unchanged.

**Post-change interface**

No notification path depends on removed absorb-batch commands.

---

## 6.2 Files to add

### `src/ui/runtime/world/pointer/resolvePointerSelectorPreview.ts`

**Responsibility**

Provide the generic preview model for the carried-body selector.

**Logic**

- If target kind is `processing`, reuse the existing processing-preview calculation path and set `showExpectedRewards = true`.
- If target kind is `power` or there is no target, return zero reward rows and `showExpectedRewards = false`.
- Keep output shape compatible with `BodySelectorView`.

**Interface**

Pure function inputs:

- `runtime`
- `targetEntity`
- `targetKind`
- `bodyEntities`

Pure function output:

- `{ showExpectedRewards, xp, resourceRows, newHabitiEntries }`

This file is required so the selector preview remains pure and testable.

---

## 6.3 Files to delete

Globs are intentional where the whole folder must go.

### Remove old proxy / anchor implementation

Delete:

- `src/game/handlers/DispatchProxyHandler.ts`
- `src/game/handlers/RecallProxyHandler.ts`
- `src/game/handlers/proxyUtils.ts`
- `src/game/handlers/depletedAssignmentDispatch.ts`
- `src/game/handlers/AbsorbBatchHandler.ts`
- `src/game/handlers/AbsorbBatchHandler*.test.ts`
- `src/game/handlers/DispatchProxyHandler*.test.ts`
- `src/game/handlers/RecallProxyHandler.test.ts`
- `src/game/systems/absorption/**`

**Reason**

These files implement the removed proxy / anchor / absorb-batch pipeline.

---

### Remove face / swarm runtime and UI

Delete:

- `src/game/systems/FaceSystem.ts`
- `src/game/systems/face/**`
- `src/ui/runtime/world/selection/face/**`
- `src/ui/runtime/world/selection/swarm/**`
- `src/ui/runtime/world/selection/FaceCard.tsx`
- `src/ui/runtime/world/selection/FaceCard.test.tsx`
- `src/ui/runtime/world/selection/SwarmCard.tsx`
- `src/ui/runtime/world/selection/SwarmCard.test.tsx`
- `src/ui/runtime/world/selection/SwarmCard.styles.ts`
- `src/ui/runtime/world/selection/SwarmRowItem.tsx`
- `src/ui/runtime/world/selection/faceCardSelectors.ts`
- `src/ui/runtime/world/selection/swarmCardSelectors.ts`
- `src/utils/faceAssignment.ts`
- `src/utils/faceAssignment.test.ts`
- `src/lib/body-identity/resolveSwarmAvatarKeys.ts`
- `src/lib/body-identity/resolveSwarmAvatarKeys.test.ts`
- `src/lib/body-identity/swarmMembership.ts`
- `src/engine/phaser/display/modules/SwarmAvatarModule.ts`
- `src/engine/phaser/display/modules/SwarmAvatarModule*.test.ts`

**Reason**

These files implement the removed face/swarm presentation and selection model.

---

### Remove obsolete terminal command entrypoints

Delete:

- `src/ui/runtime/terminal/commands/absorptionCommands.ts`
- `src/ui/runtime/terminal/commands/proxyCommands.ts`
- `src/ui/runtime/terminal/commands/gameAbsorbCommand.ts`
- `src/ui/runtime/terminal/commands/gameAbsorbCommand.test.ts`

**Reason**

These files emit removed proxy / absorb-batch commands.

---

### Remove obsolete runtime-event files tied only to removed absorb-batch traffic

Delete:

- `src/game/runtime-events/habitiRuntimeEvents.ts`
- `src/game/runtime-events/habitiRuntimeEvents.test.ts`

**Reason**

These files depend on removed `ABSORB_BATCH` commands and the replacement habitus-bubble work is out of scope.

---

### Remove obsolete anchor handler and types

Delete:

- `src/engine/runtime/handlers/UpdateAnchorHandler.ts`

**Reason**

Anchoring is removed from this feature path and has no remaining valid caller in game runtime after proxy removal.

---

## 6.4 Files to change for tests and fixtures only

### `src/data/raw/saves/1.json`
### `src/data/raw/saves/2.json`
### `src/data/raw/saves/autosave.json`

**Responsibility**

Bundled save fixtures.

**Required change**

- Remove `sys_swarm`.
- Remove face entities.
- Remove proxy entities.
- Remove any state or display data that references removed swarm/face/proxy entities.

**Reason**

Bundled saves must not resurrect removed mechanics.

---

## 7. Testing design

Tests must be added or updated exactly as listed below. Tests are colocated with source files.

## 7.1 Unit tests to add

### `src/game/assignment/assignmentNodeKinds.test.ts`

Given representative entities:

- verifies power-node classification is `assignment && powerSink`
- verifies processing-node classification remains state-driven
- verifies assignable target requires power or processing kind and non-depleted state
- verifies `sys_world` and `sys_pointer` are not assignable targets

### `src/game/handlers/AssignBodiesBatchHandler.test.ts`

Given real runtime entities:

- reassigns a body from `sys_world` to `sys_pointer`
- removes body from previous owner list
- adds body to new owner list once only
- sets `assignmentStatus = navigating` on owner change
- keeps `orbiting` on same-owner reassignment
- resets progress fields on reassignment
- logs loudly when body id is invalid
- logs loudly when `sys_world` is missing
- falls back to `sys_world` when target owner is missing

### `src/game/handlers/ResolveBodyProcessingHandler.test.ts`

Given real node/body/world entities:

- survivor path reassigns body to `sys_world`
- destroy path removes body and removes body id from node owner list
- resets body progress fields
- emits explicit telemetry errors on invalid node, invalid body, or missing world cave
- does not spawn habitus bubble commands

### `src/game/systems/PointerSystem.test.ts`

Given real pointer/body/node entities:

- writes pickup radius as hold grows
- resolves nearest valid target only among power/processing nodes
- clears preview when there are no carried bodies
- writes `pointer_preview_body`, `pointer_preview_mind`, `pointer_preview_social`, and `pointer_preview_mode`
- writes `pointer_selector_target_kind` on long-drop open

### `src/game/systems/pointer/pointerResolvers.test.ts`

Given pure input:

- pickup radius is monotonic and capped at `220`
- pickup cadence accelerates and floors at `60ms`
- nearest target selection is radius-bounded and deterministic
- power-node best-body selection uses need ordering
- processing-node best-body selection uses unowned habiti/xp ordering
- butcher selection inverts the processing priority
- preview mode resolves to `power`, `nervous`, or `none` correctly

### `src/game/systems/body-assignment/orbitLayout.test.ts`

Given deterministic inputs:

- pointer orbit yields stable spaced positions
- power orbit yields stable spaced positions
- processing orbit shrinks radius with progress ratio
- slot order is deterministic from ordered `assignedIds`

### `src/engine/phaser/pointer/pointerPreviewGeometry.test.ts`

Given short and long spans:

- returns an immediate full path
- returns wiggling geometry that changes with time
- maintains readable spread at short distances

### `src/ui/runtime/world/pointer/resolvePointerSelectorPreview.test.ts`

Given target kinds and selected bodies:

- processing target shows expected rewards
- power target hides expected rewards
- no-target selector hides expected rewards

### `src/engine/phaser/display/modules/lightModuleDecorState.bodyBacklight.test.ts`

Given body entities with base attributes:

- strongest base attribute determines glow color
- tie-break order is body > mind > social
- modified attributes are ignored

---

## 7.2 Integration tests to add or change

### `src/game/systems/BodyAssignmentSystem.integration.test.ts`

Given real world + impulse bodies:

- navigating body emits `SET_TARGET`
- arrival transitions to `orbiting`
- navigating body uses default layer
- orbiting body uses phantom layer
- missing owner reassigns to `sys_world`

### `src/game/systems/PowerAssignmentSystem.integration.test.ts`

Given several power nodes:

- writes 100% throttle for one assigned node out of one
- writes 50/50 for one body on each of two nodes
- writes 33/67 for one vs two assigned bodies
- writes zero throttle when no bodies are assigned to power nodes

### `src/game/systems/ProcessingNodeSystem.integration.test.ts`

Given orbiting body on a processing node:

- advances `assignment_progress_ms`
- advances `assignment_progress_ratio`
- emits `RESOLVE_BODY_PROCESSING` at completion
- clears progress for unassigned or missing bodies

### `src/engine/runtime/runtimeWorld.test.ts`

- ensures `sys_world`
- ensures `sys_pointer`
- does not ensure `sys_swarm`

### `src/data/schemas/v2/worldRuleBuilders.test.ts`

- generated demand formulas reference `global.population`
- generated demand formulas do not reference `sys_swarm`

### `src/engine/phaser/visuals/distressTarget.test.ts`

- body distress resolves direct body physics only
- face/swarm fallback is absent

---

## 7.3 View tests to add or change

### `src/ui/runtime/world/pointer/PointerSelectorOverlay.test.tsx`

- opens from `sys_pointer.state.pointer_selector_open`
- confirms selected bodies to target node
- confirms selected bodies to `sys_world` when no target id exists
- passes target kind into preview handling

### `src/ui/runtime/world/selection/absorption/BodySelectorView.test.tsx`

- hides expected rewards when `preview.showExpectedRewards` is false
- shows expected rewards when `preview.showExpectedRewards` is true
- keeps assignment requirement rows visible in both cases

### `src/ui/runtime/world/selection/selectionLensMap.test.ts`

- no face lens exists
- no swarm lens exists
- remaining live entity lenses still resolve

### `src/ui/runtime/world/selection/usePowerSinkThrottle.test.tsx`

Delete this test with the hook if the hook becomes unused.

---

## 7.4 Tests to delete

Delete tests that exist only for removed systems, handlers, views, or utilities, including the globs and files deleted in section 6.3.

---

## 8. Acceptance criteria

Implementation is complete only when all of the following are true:

1. No proxy, anchor, face, or swarm runtime path remains active.
2. No removed command type remains registered or emitted.
3. `sys_swarm` is not ensured, configured, or referenced by live code.
4. Pointer preview matches the locked contract in section 4.5.
5. Selector preview hides expected rewards except for processing nodes.
6. Orbiting bodies use phantom collision only.
7. Body backlight uses strongest base attribute only.
8. All new and changed tests pass.
9. No silent error path remains in the new handlers.

