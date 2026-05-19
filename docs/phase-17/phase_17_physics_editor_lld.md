# LLD — Layout Runtime / World Presence Save / Paused Drag (Updated)

## Why

This change closes three confirmed contract gaps:

1. **Saved layout edits do not flow back into the authoring source of truth.**
   Layout save currently writes `components.physics.x/y`. Blueprint editing reads `_editor.abilities.worldPresence.x/y`, and compilation regenerates physics/spatial from that ability. Result: layout edits do not appear in World Presence after reload.

2. **The layout runtime does not contain the full project world.**
   It currently spawns only blueprints with both `display` and `physics`, and it explicitly removes the runtime’s default `sys_world` before spawning. That prevents the editor from showing the full project in relation to the world.

3. **Dragging while paused is visually stale.**
   Drag emits commands only. Paused runtime ticks do not apply those commands, so the body/display do not move until the runtime resumes.

## Scope lock

- **Anchor-based layout editing is deprecated by this change.**
- **Global runtime anchor support is not removed by this change.** `UPDATE_ANCHOR` is still used outside layout editing, including game runtime code. This LLD removes anchor usage from the layout editor only.
- **`sys_world` must be present in the layout runtime.**
- **`sys_world` must not be draggable.**
- **Only blueprints with `_editor.abilities.worldPresence` are persistable by this feature.**
- **No mirroring to `components.spatial` or `components.physics` on save.** Compilation already derives those fields from World Presence.

---

## Functional contract

1. The layout runtime shall contain:
    - every blueprint from the linked project cartridge
    - including `sys_world`
    - excluding only runtime bootstrap entities that are not cartridge blueprints (for example `sys_swarm`) from layout membership checks

2. The layout runtime shall continue to use the existing runtime, command handlers, and sanitized blueprint cloning.

3. A layout entity shall be draggable only if:
    - it is not `sys_world`
    - it has a runtime physics body

4. Layout drag shall always mean:
    - absolute reposition
    - via `POSITION_ENTITY`
    - never via `UPDATE_ANCHOR`

5. While paused:
    - pointer movement shall still update the runtime body and display immediately
    - mutation shall still occur through the existing runtime command pipeline

6. On drag release:
    - exactly one runtime tick shall execute
    - if the runtime was paused before release, it shall return to paused after that single tick

7. On save:
    - only blueprints with `_editor.abilities.worldPresence` shall be updated
    - only `_editor.abilities.worldPresence.x/y` shall be written
    - no other position field shall be persisted by this feature

---

## Design

### Runtime mutation model

Paused drag must remain within the existing runtime command pipeline.

The runtime will expose an editor-safe command-apply entrypoint that:

- drains queued commands
- applies them through existing registered handlers
- does not run systems
- does not advance physics
- does not increment tick

This preserves the architectural law that UI emits commands and runtime apply decides reality.

A separate runtime entrypoint will execute exactly one full tick while preserving the prior paused state.

### Layout membership model

There are now three distinct sets:

- **Runtime membership set**
  All cartridge blueprint ids, including `sys_world`

- **Draggable set**
  Runtime entities with a physics body, excluding `sys_world`

- **Persistable set**
  Blueprint ids whose source blueprint contains `_editor.abilities.worldPresence`

These sets must not be conflated.

---

## File changes

### 1) `src/engine/runtime/RuntimeCore.ts`

**Responsibility**
Expose editor-safe runtime entrypoints for immediate command application and single-step ticking.

**Logic**

- Add an editor-safe method that applies queued commands using the existing `CommandsManager` and existing command handler context.
- This method must not run physics, systems, snapshot generation, or tick increment.
- Add a second method that executes exactly one normal runtime tick.
- If runtime status was `paused` before this one-step call, restore `paused` after the step completes.
- If runtime status is `fatal`, both methods no-op.

**Interface**

- Add public method: `flushCommands(): number`
    - returns number of commands applied

- Add public method: `stepOncePreservingPause(): number`
    - returns current runtime tick after the step

---

### 2) `src/engine/phaser/scenes/entityDragController.ts`

**Responsibility**
Translate pointer drag into layout-safe absolute position updates.

**Logic**

- Remove anchor-mode drag behavior from the layout editor path.
- Remove drag-state fields related to anchor editing.
- `onObjectDown`
    - keep existing selection behavior
    - reject drag if runtime is missing
    - reject drag if entity is a proxy
    - reject drag if entity id is `sys_world`
    - reject drag if no runtime physics body exists
    - start drag from current body position
    - enqueue cave drag state updates
    - if runtime is paused, immediately flush queued commands

- `onPointerMove`
    - compute absolute target x/y from drag delta
    - enqueue only `POSITION_ENTITY`
    - if runtime is paused, immediately call `flushCommands()`

- `onPointerUp`
    - if drag is inactive, only clear cave drag state as today
    - if drag is active:
        - enqueue cave drag state reset
        - execute `stepOncePreservingPause()` exactly once
        - clear drag state

**Interface**

- Constructor unchanged
- Public methods unchanged
- Behavioral contract changed:
    - no anchor drag
    - no `UPDATE_ANCHOR` emission from layout drag
    - `sys_world` non-draggable
    - paused drag updates immediately
    - drag release always advances one tick

---

### 3) `src/ui/devtools/layout/layoutEditorBlueprints.ts`

**Responsibility**
Define canonical layout runtime membership and persistence predicates.

**Logic**

- Replace the current `display && physics` layout predicate.
- Add runtime membership predicate:
    - include every blueprint id from the draft/cartridge
    - include `sys_world` when present

- Add persistable predicate:
    - blueprint has `_editor.abilities.worldPresence`

- Keep `EPSILON`.

**Interface**

- Export `getLayoutRuntimeBlueprintIds(blueprints): string[]`
- Export `isLayoutPersistableBlueprint(blueprint): boolean`
- Remove the old `isLayoutBlueprint` / `getLayoutBlueprintIds` contract

---

### 4) `src/ui/devtools/layout/useLayoutEditorSync.ts`

**Responsibility**
Keep runtime rehydration aligned with the new runtime membership contract.

**Logic**

- Rehydration membership comparison shall use:
    - draft blueprint ids from `getLayoutRuntimeBlueprintIds(...)`
    - runtime entity ids filtered to ids that exist in the draft blueprint map

- This comparison must no longer rely on runtime physics bodies.
- The existing live body sync remains physics-only:
    - for draft blueprints that still have `components.physics`
    - if a runtime body exists

- This file does not become responsible for persistence.

**Interface**

- Hook signature unchanged

---

### 5) `src/ui/devtools/layout/simulation/createSimulationRuntime.ts`

**Responsibility**
Create the layout runtime from the linked cartridge and spawn the full project world.

**Logic**

- Keep deep-clone and component sanitization.
- Keep the existing sanitized component allowlist unchanged.
- Remove the special-case deletion of the default `sys_world`.
- Enqueue `SPAWN` for every blueprint in the cloned cartridge.
- Use blueprint id as spawn id, as today.
- Keep the existing warm-up tick.

**Interface**

- `createSimulationRuntime(cartridge): Runtime` unchanged

**Important note**
`sys_world` update-in-place is already supported by the existing spawn handler. This design must rely on that existing mechanism rather than deleting and recreating the world entity.

---

### 6) `src/ui/devtools/layout/persistence/layoutPersistence.ts`

**Responsibility**
Harvest persistable runtime positions and apply them to in-memory module drafts.

**Logic**

- `harvestPositions(runtime)`
    - iterate runtime entities
    - require finite body position
    - require source blueprint to exist in `runtime.getCartridge().blueprints`
    - require source blueprint to satisfy the persistable predicate
    - exclude non-persistable ids, including `sys_world`

- `applyLayoutBatch(draft, updates)`
    - for each matching blueprint id
    - update only `_editor.abilities.worldPresence.x/y`
    - do nothing if the blueprint has no World Presence ability
    - return whether any write occurred

**Interface**

- `harvestPositions(runtime): PositionUpdate[]`
- `applyLayoutBatch(draft, updates): boolean`

---

### 7) `src/ui/devtools/layout/persistence/persistProjectLayout.ts`

**Responsibility**
Persist layout updates to module files and reload the project.

**Logic**

- Remove local physics-only patch logic.
- For each cached module:
    - deep-clone the module
    - apply the shared layout patcher
    - if changed:
        - write the module via `workspaceService.writeModule(...)`
        - mark the file as touched

- Save touched files to disk via the existing `vfs` path.
- Reload the project once after all writes complete.

**Interface**

- `persistProjectLayout(manifestPath, updates): Promise<void>` unchanged

---

## Tests

### Change existing tests

#### `src/ui/devtools/layout/simulation/createSimulationRuntime.test.ts`

Must verify:

- runtime spawns every cartridge blueprint, not only `display && physics`
- `sys_world` remains present
- blueprints without physics can exist in runtime without a body
- physics-backed blueprints still initialize body position correctly

#### `src/ui/devtools/layout/persistence/layoutPersistence.test.ts`

Must verify:

- `harvestPositions` returns only persistable World Presence blueprints
- `harvestPositions` excludes `sys_world`
- `applyLayoutBatch` writes only `_editor.abilities.worldPresence.x/y`
- `applyLayoutBatch` returns `false` when no matching persistable blueprint exists
- `applyLayoutBatch` does not write compiled `components.physics` or `components.spatial`

#### `src/engine/runtime/Runtime.test.ts`

Must verify:

- `flushCommands()` applies queued position commands without incrementing tick
- `flushCommands()` no-ops safely when queue is empty
- `stepOncePreservingPause()` advances exactly one tick
- `stepOncePreservingPause()` restores `paused` after the step when runtime started paused

### Add new tests

#### `src/engine/phaser/scenes/entityDragController.test.ts`

Must verify:

- layout drag emits `POSITION_ENTITY` only
- layout drag never emits `UPDATE_ANCHOR`
- `sys_world` is not draggable
- paused pointer move flushes commands immediately
- pointer up executes exactly one step
- cave drag state is enqueued on drag start and drag end

#### `src/ui/devtools/layout/persistence/persistProjectLayout.test.ts`

Must verify:

- changed modules are written once per touched file
- only World Presence fields are persisted
- touched files are saved to disk
- project reload happens once after persistence
- modules with no persistable match are not written

---

## Acceptance criteria

The change is complete only when all of the following are true:

1. Saving layout updates the Blueprint editor’s **World Presence** values after reload.
2. The layout runtime contains all cartridge blueprints, including `sys_world`.
3. `sys_world` is visible in the layout runtime when it has display output, but it cannot be dragged.
4. Physics-backed draggable entities move visibly while paused.
5. Releasing a drag advances exactly one tick and preserves paused state.
6. Layout drag no longer emits `UPDATE_ANCHOR`.
7. Layout persistence writes only `_editor.abilities.worldPresence.x/y`.
8. No UI code directly mutates ECS entities or physics bodies.

