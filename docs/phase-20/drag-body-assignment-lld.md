# LLD: Dragged Body Pointer Ownership and Drop Assignment

## 1. Purpose

This document defines the implementation design for body dragging as an assignment transaction:

1. When a draggable body drag starts, that exact body is assigned to `sys_pointer`.
2. When the drag is released near a valid assignment node, that same body is assigned to that node.
3. When the drag is released outside any valid assignment node, that same body is restored to the owner it had at drag start.

The design is a delta over the existing codebase. It uses the existing runtime command pipeline, existing assignment handler, existing pointer target collection, existing nearest-target radius semantics, existing assignment acceptance checks, and existing Phaser drag controller. It does not introduce a second source of truth for runtime ownership.

## 2. Existing Code Facts Used

The following facts were verified from the uploaded source:

- `EntityDragController` currently starts a local drag on `gameobjectdown`, records the dragged entity id and position, emits `POSITION_ENTITY` commands during pointer movement, syncs cave drag state, and calls `stepOncePreservingPause` on release.
- `PointerInputController` keeps `sys_pointer` positioned from Phaser pointer coordinates and writes pointer button/timestamp state.
- `PointerSystem` already computes pointer target state through `resolvePointerInteractionState`, which uses `collectPointerTargets`, `resolveNearestTarget`, `pointer_connection_radius`, `resolveBestDropBodyId`, and preview state updates.
- `collectPointerTargets` already excludes invalid assignment targets using `isAssignableTargetNode` and `isPointerAssignmentBlocked`.
- `resolveNearestTarget` already defines “near” as distance from pointer to target center less than or equal to `pointer_connection_radius + target.radius`, sorted by distance and then target id.
- `canAssignBodyToOwner` already enforces assignment filters and slot capacity.
- `ASSIGN_BODIES_BATCH` is already the central ownership mutation command. `AssignBodiesBatchHandler` validates the body, resolves the owner, checks `canAssignBodyToOwner`, removes the body from all owners, adds it to the next owner, resets assignment progress, sets assignment duration, sets `body.assignmentId`, and records assignment transition metadata.
- `BodyAssignmentSystem` already moves assigned bodies toward their owner while `assignmentStatus` is `navigating` and orbits them after arrival.

## 3. Why

The current drag controller changes body position but does not make drag ownership semantic. That allows the body being physically dragged to differ from the body later selected by pointer drop logic, because pointer short-drop uses `resolveBestDropBodyId` over all carried bodies. The required behavior is identity-preserving: the body selected at drag start is the only body that may be assigned on drag release.

The correct model is a drag transaction, not a generic pointer drop. The transaction records the dragged body id and its origin owner when the drag starts. The runtime then receives assignment commands in deterministic order: assign dragged body to `sys_pointer`, then assign the same body either to the resolved valid target or back to the recorded origin.

This preserves the project laws: runtime state remains owned by ECS, mutations flow through commands, the presentation layer emits commands instead of mutating ECS directly, and systems continue to read snapshots and emit commands only.

## 4. What

### 4.1 Functional Contract

A body drag has exactly one transaction subject: `drag.bodyId`.

On drag start:

- The target of the Phaser object must resolve to an existing runtime entity.
- The entity must be a body entity.
- `sys_world` and non-body physics entities must not start a body drag.
- If the pointer is already active under the existing guard, the drag must not start.
- The controller records the body’s current `assignmentId` as `originOwnerId`.
- The controller enqueues one `ASSIGN_BODIES_BATCH` update assigning `bodyId` to `sys_pointer`.
- Cave drag state remains synchronized as it is today.
- Paused-runtime behavior keeps using the existing immediate flush/step path.

On drag move:

- The existing body `POSITION_ENTITY` drag behavior is preserved.
- Ownership remains semantic through `body.assignmentId`; physical dragging remains command-based.
- No direct runtime mutation is introduced.

On drag release:

- The controller resolves a drop target from the pointer release position and the current runtime snapshot.
- The only candidate targets are those returned by `collectPointerTargets`.
- The nearest target is selected using `resolveNearestTarget`.
- The release is valid only if the nearest target accepts the dragged body according to `canAssignBodyToOwner` with `ignoreBodyId` equal to the dragged body id.
- If valid, enqueue `ASSIGN_BODIES_BATCH` assigning `drag.bodyId` to the target id.
- If invalid or absent, enqueue `ASSIGN_BODIES_BATCH` assigning `drag.bodyId` to `drag.originOwnerId` using the drag-restore mode defined below.
- The release must not call `resolveBestDropBodyId`.
- The release must not open the pointer selector.
- The release must not assign a different pointer-carried body.
- Cave drag state is cleared exactly once on release.
- The local transaction state is cleared after the release command is enqueued.

### 4.2 Origin Restore Contract

Fallback must restore to the exact owner recorded at drag start. A normal `ASSIGN_BODIES_BATCH` update can be rejected if the origin’s slot was filled while the drag was active. That violates the required behavior. Therefore rollback uses an explicit drag-restore mode on the existing assignment command update.

Drag-restore mode has these rules:

- It is only emitted by `EntityDragController` when a drag release has no valid target.
- It must include `expectedCurrentOwnerId` equal to `sys_pointer`.
- `AssignBodiesBatchHandler` must reject the update loudly if the body’s current owner is not `expectedCurrentOwnerId` at apply time.
- If the current owner matches `expectedCurrentOwnerId`, the handler must restore the body to `ownerId` without applying normal filter or slot acceptance checks.
- The handler must still reject missing body entities.
- For `drag_restore`, the target `ownerId` must resolve to an existing entity. If the recorded origin owner no longer exists, the handler must log an error and skip the restore; assigning to `sys_world` would not satisfy the exact-origin contract.
- This mode is not used for valid target drops and is not used by normal pointer pickup/drop.

This preserves the “return to where it was taken from” contract without introducing duplicated React state or a second assignment path.

## 5. How

## 5.1 Files to Change or Add

### `src/engine/phaser/scenes/entityDragController.ts`

Responsibility:

- Own Phaser-level body drag transaction state.
- Convert drag lifecycle events into runtime commands.
- Preserve existing cave drag attention state and paused-runtime behavior.

Logic:

- Extend the local drag state to store `bodyId`, `originOwnerId`, existing physical drag start coordinates, and existing pointer start coordinates.
- On object down, resolve the runtime and entity exactly as today, then require the entity to be a body using the existing `isBodyEntity` utility.
- Keep the existing pointer-active guard.
- Read the origin with the existing `readAssignmentId` utility before enqueuing the pointer assignment.
- Enqueue `ASSIGN_BODIES_BATCH` for `bodyId -> sys_pointer` before marking the drag active.
- Keep the existing selection call and cave drag state sync.
- Keep existing `POSITION_ENTITY` movement behavior while dragging.
- Change pointer release handling so it receives the Phaser pointer when available.
- Resolve release coordinates from the Phaser pointer world coordinates. If the release pointer is unavailable, fall back to the current `sys_pointer` physics body. If neither exists, treat the release as having no valid target and restore to origin.
- On release, call the new drop-target resolver with the current runtime snapshot, dragged body id, and release coordinates.
- Enqueue either target assignment or origin restore for the dragged body id only.
- Clear cave drag state and local drag state after the release command is queued.
- Preserve the existing paused-runtime final `stepOncePreservingPause` behavior.

Interface:

- Existing constructor remains unchanged.
- Existing `bind` and `destroy` signatures remain unchanged.
- Private event handlers remain private.
- The internal release handler accepts the Phaser pointer argument supplied by the existing `pointerup` event; tests may call it with no pointer to exercise the fallback path.

### `src/game/systems/pointer/resolveDraggedBodyDropTarget.ts` (new)

Responsibility:

- Resolve whether a specific dragged body can be dropped onto a valid assignment target at a pointer position.
- Provide identity-preserving drop resolution independent of pointer-carried-body ranking.

Logic:

- Input is a runtime snapshot, `bodyId`, `pointerX`, and `pointerY`.
- Find `sys_pointer` in the snapshot and read `pointer_connection_radius` with the existing `readStateNumber`; use the same fallback value currently used by `resolvePointerInteractionState` when the state is absent.
- Read the dragged body entity by `bodyId`.
- If the dragged entity is missing or not a body, return a non-valid result with reason `missing_body`.
- Collect targets with `collectPointerTargets`.
- Select the nearest target with `resolveNearestTarget`.
- If there is no target, return a non-valid result with reason `no_target`.
- Resolve the target entity by id.
- If the target entity is missing, return a non-valid result with reason `missing_target`.
- Run `canAssignBodyToOwner` for the dragged body and target owner with `ignoreBodyId` equal to the dragged body id.
- If acceptance fails, return a non-valid result with reason equal to the acceptance reason.
- If acceptance succeeds, return a valid result containing the target id and target kind.

Interface:

- Export one pure function named `resolveDraggedBodyDropTarget`.
- The result is a closed discriminated shape with either valid target data or one of the explicit failure reasons: `missing_body`, `no_target`, `missing_target`, `filter_mismatch`, or `slots_full`.
- The function does not enqueue commands and does not mutate runtime state.

### `src/game/systems/pointer/resolveDraggedBodyDropTarget.test.ts` (new)

Responsibility:

- Specify drop-target resolution behavior for one dragged body.

Logic:

- Use real `Snapshot` instances and plain runtime entities.
- Cover the happy path where a body near an accepting power or processing node resolves that target.
- Cover the no-target path where the pointer is outside `pointer_connection_radius + target.radius`.
- Cover the filter mismatch path.
- Cover the full-slot path.
- Cover deterministic nearest-target tie-breaking by distance and id, inherited from `resolveNearestTarget`.
- Assert returned behavior, not internal call order.

Interface:

- Co-located unit test for the new resolver.
- Tests follow Given/When/Then structure.

### `src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts`

Responsibility:

- Define the type contract for update-style runtime command payloads.

Logic:

- Extend `AssignBodiesBatchCommandPayload` update entries with optional drag-restore fields.
- The normal update contract remains `bodyId` plus `ownerId`.
- Add an optional restore mode field whose only non-default value is `drag_restore`.
- Add optional `expectedCurrentOwnerId` for guarded restore commands.
- Existing callers remain valid without changes.

Interface:

- `ASSIGN_BODIES_BATCH` updates support normal assignment entries and guarded drag-restore entries.
- `drag_restore` entries must carry `expectedCurrentOwnerId` when emitted by the drag controller.

### `src/game/handlers/AssignBodiesBatchHandler.ts`

Responsibility:

- Apply assignment updates during the command apply phase.
- Continue to be the single mutation point for body ownership.

Logic:

- Preserve existing validation for command type, `sys_world`, body existence, and body-ness.
- Read `beforeOwnerId` before acceptance checks.
- If `expectedCurrentOwnerId` is present and does not match `beforeOwnerId`, log an error and skip the update.
- Resolve the next owner exactly as today.
- For normal updates, keep the existing `canAssignBodyToOwner` behavior unchanged.
- For `drag_restore` updates, require `ownerId` to resolve to an existing owner entity, require `expectedCurrentOwnerId` to match, and then restore to `ownerId` without normal filter or slot acceptance checks.
- Do not silently ignore any failed restore guard or missing restore owner.
- Keep transition metadata, owner removal, assigned id insertion, assignment progress reset, assignment required duration, and status selection behavior as today.
- Do not change sorting of assigned ids.
- Do not change existing normal assignment behavior.

Interface:

- Command type remains `ASSIGN_BODIES_BATCH`.
- Existing payloads remain valid.
- New optional fields affect only guarded drag restore.
- Telemetry error logging remains the failure signal for rejected assignment updates.

### `src/game/handlers/AssignBodiesBatchHandler.validation.test.ts`

Responsibility:

- Extend handler validation coverage for guarded drag restore.

Logic:

- Add a test where the dragged body is currently owned by `sys_pointer`, the origin owner is already full, and a `drag_restore` update restores the body to the origin.
- Add a test where the dragged body is not currently owned by `sys_pointer`; the guarded restore must log an error and preserve current ownership.
- Add a test where the recorded origin owner is missing; the guarded restore must log an error and preserve current ownership.
- Existing filter mismatch and slot overflow tests remain unchanged and continue proving normal updates reject invalid assignment.

Interface:

- Uses existing `makeHandlerContext` test utility.
- Tests assert final assignment id and telemetry behavior.

### `src/engine/phaser/scenes/entityDragController.test.ts`

Responsibility:

- Specify Phaser drag-controller command emission and transaction behavior.

Logic:

- Update existing tests to account for the new assignment-to-pointer command on drag start.
- Keep the existing test that `sys_world` does not start dragging.
- Add a test that a body drag start records origin ownership and enqueues `ASSIGN_BODIES_BATCH` assigning the body to `sys_pointer`.
- Add a test that releasing near a valid node enqueues assignment of the dragged body id to that node.
- Add a test that releasing outside any valid node enqueues guarded `drag_restore` of the dragged body id to the recorded origin owner.
- Add a test that non-body entities with physics do not start a body drag.
- Use small runtime and snapshot factories to keep tests readable.

Interface:

- Tests continue using the private handler invocation pattern already present in the file.
- Runtime doubles expose only the methods used by the controller: command enqueueing, state access, entity lookup, physics lookup, snapshot creation, paused flushing, and paused stepping.

## 5.2 Runtime Flow

Drag start flow:

1. Phaser reports `gameobjectdown`.
2. `EntityDragController` resolves the entity id from the object.
3. Controller rejects missing runtime, missing entity, `sys_world`, non-body entities, missing physics, and existing pointer-active state.
4. Controller records `originOwnerId` from the body’s current assignment.
5. Controller enqueues assignment of that body to `sys_pointer`.
6. Controller records local drag transaction state.
7. Controller syncs cave drag active state.
8. Paused runtime is flushed through the existing path.

Drag move flow:

1. Phaser reports `pointermove`.
2. If a drag transaction is active and the pointer is down, the controller emits the existing body position command.
3. Paused runtime is flushed through the existing path.

Drag release flow:

1. Phaser reports `pointerup`.
2. If no drag transaction exists, only cave drag inactive sync runs as today.
3. If a drag exists, release coordinates are resolved.
4. The new resolver receives the current snapshot, dragged body id, and release coordinates.
5. If the resolver returns a valid target, the controller enqueues normal assignment of the dragged body to that target.
6. If the resolver does not return a valid target, the controller enqueues guarded drag restore of the dragged body to `originOwnerId`.
7. Controller clears cave drag state.
8. Controller steps paused runtime through the existing path.
9. Controller clears local drag state.

Apply phase flow:

1. Commands are processed in enqueue order.
2. If drag start and drag release occur before a tick, the pointer assignment command is processed before the final drop or restore command.
3. `AssignBodiesBatchHandler` applies all ownership changes.
4. `BodyAssignmentSystem` later handles navigation and orbiting from the resulting semantic ownership.

## 6. Invariants

- A drag transaction never changes which body is being assigned.
- Drag release never chooses from all pointer-carried bodies.
- Normal pointer pickup, normal pointer short-drop, long-drop selector, and pointer preview behavior remain unchanged.
- All assignment mutations go through `ASSIGN_BODIES_BATCH`.
- No React component stores drag ownership.
- No ECS world mutation occurs from Phaser controller code.
- Missing entities and stale guarded restores log loudly instead of failing silently.
- Existing assignment transition metadata remains populated by the assignment handler.
- The design does not mutate blueprints.

## 7. Testing Plan

### Unit Tests

`resolveDraggedBodyDropTarget.test.ts` covers:

- Valid drop resolves the nearest accepting node.
- Out-of-range release returns `no_target`.
- Filter mismatch returns `filter_mismatch`.
- Full target returns `slots_full`.
- Missing dragged body returns `missing_body`.

`AssignBodiesBatchHandler.validation.test.ts` covers:

- Normal slot overflow still rejects normal assignment.
- Guarded drag restore succeeds when the body is currently owned by `sys_pointer`, even if the origin is currently full or would otherwise fail normal acceptance.
- Guarded drag restore rejects loudly when the body is no longer owned by `sys_pointer`.
- Guarded drag restore rejects loudly when the recorded origin owner no longer exists.

### Controller Tests

`entityDragController.test.ts` covers:

- Drag start assigns the body to `sys_pointer`.
- Drag start records the original owner.
- Non-body entities do not start body drag.
- Release near a valid node assigns the dragged body to that node.
- Release away from valid nodes restores the dragged body to the original owner with guarded drag-restore mode.
- Existing paused flush and release stepping behavior remains intact.

### Regression Scope

Existing tests that must remain green:

- Pointer pickup tests.
- Pointer short-drop tests.
- Pointer target range tests.
- Assignment handler validation tests.
- Entity drag controller tests.
- Runtime command and assignment visual-effect tests that depend on assignment transition metadata.

## 8. Acceptance Criteria

Implementation is complete only when all of the following are true:

- Dragging a body immediately emits assignment of that body to `sys_pointer`.
- Releasing near a valid node assigns that same body to the node.
- Releasing away from valid nodes restores that same body to the owner recorded at drag start.
- Release does not use pointer best-body selection.
- Release does not assign any other pointer-carried body.
- Invalid restore guards log errors and preserve current ownership.
- Normal assignment acceptance behavior is unchanged outside guarded drag restore.
- Guarded drag restore never falls back to `sys_world` when the recorded origin owner is missing.
- All changed and added tests follow Given/When/Then or equivalent clear AAA structure.
- No direct ECS mutation is introduced.
- No `.tsx` business logic is added.
- No unrelated refactors are included.
