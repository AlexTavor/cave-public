# LLD — Phase 1: Phaser World Camera, Bounds, Persistence, and DOM World Removal (Updated)
**Project:** Cave  
**Scope:** Phase 1 implementation of the Phaser-first world migration:
- Camera + world bounds are data (editable in devtools)
- Camera state persists through game save/load
- DOM/React world entity rendering is removed (Phaser circles are the world entities)
- Selection is handled in Phaser (click entity selects; click background deselects if no significant drag)

**Status:** Implementation-ready  
**Note:** This document intentionally avoids speculative refactors and contains no code. Pseudocode is used only where it removes ambiguity.

---

## 0. Binding Contract (Non-Negotiable)

This design must comply with:
- **Runtime laws:** UI observes simulation state; UI does not mutate ECS state; mid-tick mutations are illegal; errors must be loud.
- **Prompt Contract:** no scope creep, no invented new architecture, no TODOs, all tests green.
- **Testing Standards:** behavior-first tests; unit-test pure logic; view tests verify wiring; avoid brittle implementation tests.

This LLD defines *only* the concrete changes required for Phase 1.

---

## 1. Why

### 1.1 Camera + bounds must be data
Iteration on camera feel and world scale must be possible through data edits in devtools (no code changes). The world must be finite, and the camera must be able to pan/zoom within it.

### 1.2 Camera state must persist
The camera is part of “player view state.” If a player saves and loads, the view must return to the same camera position/zoom. This must be implemented through the existing save/load system (the same save file).

### 1.3 React must stop representing world entities
World-space entities must be rendered in Phaser, not in React. This is the “swap” step of the Phaser-first migration.

---

## 2. What (Definition of Done)

### 2.1 Camera + world bounds
- World size comes from Game Config (`game_config.world.width/height`).
- Camera tuning comes from Game Config (`game_config.camera.*`).
- Camera starts at:
  - **zoom = `camera.zoom.start`**
  - **center = saved camera state if present**, else **world center**
- Camera supports:
  - mouse wheel zoom
  - drag pan with inertia
- Camera **never** shows outside world bounds.

### 2.2 Strict bounds behavior
- Pan cannot move the camera view outside bounds (hard clamp every update).
- Zoom behavior:
  - Zooming may shift the camera view if needed to keep the view rectangle inside bounds.
  - If the requested zoom would make it **impossible** to keep the view rectangle inside world bounds (view larger than world in either axis), the zoom request is **rejected** (no zoom change).

### 2.3 World rendering + selection
- No React components render runtime entities in the world viewport.
- Phaser renders each physics+display entity as a circle sprite (existing behavior retained).
- Selection:
  - Clicking an entity circle selects it.
  - Clicking background **deselects only if the pointer interaction was not a significant drag**.
  - Dragging background pans and does not deselect.

### 2.4 Devtools editor
- A new **Camera + World** config editor exists.
- It opens as its **own devtools tab** via the existing window manager routing (same mechanism as GameConfigEditor).
- It has tests:
  - Renders without crashing.
  - Verifies that all required tooltips exist (see §8.3).
- **Every interactable field in this editor must have a SmartTooltip**:
  - all numeric inputs
  - all collapsible headers that the user can click to expand/collapse

### 2.5 Scene naming
- `TransferScene` is renamed to `GameScene` (class, file, and scene key).

### 2.6 RuntimeShell / LayoutEditor
- `RuntimeShell.tsx` stops mounting the DOM world layer and stops mounting `PhysicsDebugOverlay`.
- The Layout editor stops mounting the DOM world layer (same “no React world entities” requirement applies in devtools).

---

## 3. Non-Goals (Out of Scope)
- No rune glyphs, icon atlases, fillbars, veins rework, swarm visuals, or lighting/VFX beyond what already exists.
- No changes to gameplay systems or ECS behavior.
- No new devtools framework abstractions.
- No new Phaser test harness for pointer events (logic is tested as pure state/maths).

---

## 4. Data Model: Game Config (World + Camera)

### 4.1 File: `src/data/schemas/game/config.ts`
Add two new config objects under `GameConfigSchema`:

#### `world`
- `width: number` (default 5000)
- `height: number` (default 5000)
Both fields include `tooltip:` descriptions.

#### `camera`
Nested objects (all fields include `tooltip:` descriptions):

**zoom**
- `min: number` (default 0.1)
- `max: number` (default 4.0)
- `start: number` (default 1.0)
- `scrollFactor: number` (default 0.1)

**pan**
- `damping: number` (default 0.1)
- `boundsPadding: number` (default 1000)
- `dragThreshold: number` (default 5)

Object schemas (`world`, `camera`, `zoom`, `pan`) also include `tooltip:` descriptions so their collapsible headers can be wrapped with SmartTooltip.

**Rule:** `GameConfigSchema` remains `.catchall(z.unknown())` to preserve compatibility.

---

## 5. Data Model: Save/Load (Camera State Persistence)

### 5.1 Camera state definition
Camera state stored in the save file is:

- `centerX: number` (world units)
- `centerY: number` (world units)
- `zoom: number`

Velocity is not persisted.

### 5.2 File: `src/engine/runtime/persistence/types.ts`
Add:

- `export interface SerializedCameraState { centerX: number; centerY: number; zoom: number }`
- Add to `SaveGameState`:
  - `camera?: SerializedCameraState`

Camera is **optional** to preserve load compatibility with older saves. Behavior on missing camera state is explicitly defined in §7.4.

### 5.3 File: `src/engine/runtime/persistence/RuntimeSerializer.ts`
- Bump `SAVE_VERSION` from `"1"` to `"2"`.
- Extend `serialize(...)` to accept a `SerializedCameraState` argument.
- Emit `state.camera = providedCameraState` into the save file.

### 5.4 File: `src/ui/runtime/state/persistenceSlice.ts`
**Save:**
- When saving, include camera state:
  - Use the latest camera state snapshot tracked by the runtime store (see §6.3).
  - If no camera snapshot exists yet (e.g., camera not initialized), derive a fallback snapshot:
    - `zoom = game_config.camera.zoom.start`
    - `centerX/centerY = world center`
  - Pass the chosen snapshot into `serialize(...)`.

**Load:**
- After `SaveGameService.load(...)`, read `data.state.camera`:
  - If present: set a **pending restore** camera state in the runtime store.
  - If missing: do not set pending restore (camera will use defaults).
- Runtime hydration remains authoritative for simulation; camera restore is presentation-only.

---

## 6. World Interaction Context (Selection + Camera View State)

### 6.1 File: `src/ui/runtime/world/context/WorldInteractionContext.tsx`
Extend `WorldInteractionContextValue` with camera state accessors needed by Phaser:

- `getCameraState(): SerializedCameraState | null`
- `setCameraState(state: SerializedCameraState): void`
- `consumePendingCameraRestore(): SerializedCameraState | null`

**Purpose:**
- Avoid direct engine→UI store imports inside Phaser modules.
- Allow RuntimeShell and LayoutEditor to provide appropriate camera state behavior.

### 6.2 File: `src/ui/runtime/world/context/GameWorldAdapter.tsx`
Provide implementations using the runtime store:

- `getCameraState` returns the current stored camera snapshot (or null).
- `setCameraState` stores the snapshot (throttled by the camera system; see §7.3).
- `consumePendingCameraRestore` returns-and-clears a pending restore snapshot.

### 6.3 Files: `src/ui/runtime/state/runtimeStoreTypes.ts` and `src/ui/runtime/state/useRuntimeStore.ts`
Add state + actions:

**State**
- `cameraState: SerializedCameraState | null`
- `pendingCameraRestore: SerializedCameraState | null`

**Actions**
- `setCameraState(state: SerializedCameraState): void`
- `setPendingCameraRestore(state: SerializedCameraState | null): void`
- `consumePendingCameraRestore(): SerializedCameraState | null` (returns current pending restore and clears it)

**Reset rules**
- `loadCartridge(...)`, `unload()`, and `reset()` must clear `pendingCameraRestore`.
- `cameraState` may persist across runtime pauses but is overwritten by restore on load.

### 6.4 File: `src/ui/devtools/layout/context/LayoutWorldAdapter.tsx`
Layout editor does not participate in save/load persistence. Provide local, non-persisted camera state:

- `getCameraState` returns local state (or null).
- `setCameraState` updates local state.
- `consumePendingCameraRestore` always returns null.

This keeps Phase 1 requirements precise and prevents layout editor interactions from changing game save camera state.

---

## 7. Phaser World Scene + Camera Behavior

### 7.1 Rename: `src/engine/phaser/scenes/TransferScene.ts` → `GameScene.ts`
**Responsibility:** Render world-space entities (circles) and own world-space input (camera + selection).

**Interface (constructor params)**
- `getRuntime(): Runtime | null`
- `getSelectedEntityId(): string | null` (existing selection halo binding)
- `selectEntity(id: string | null): void` (selection callback)
- `getCameraState(): SerializedCameraState | null`
- `setCameraState(state: SerializedCameraState): void`
- `consumePendingCameraRestore(): SerializedCameraState | null`
- `defaultEntityColor?: string`
- `defaultTransferColor?: string`

**Lifecycle**
- `create()`:
  - initialize existing managers (TextureManager, VeinManager, SelectionHalo, DistressManager)
  - initialize `CameraController` (new; §7.2) and bind input listeners
- `update(time, delta)`:
  - run existing `updateTransferScene` sync (circles + existing visuals)
  - update camera controller (inertia + clamp + publish camera state)

Scene key:
- change from `"TransferScene"` to `"GameScene"`.

### 7.2 Add: `src/engine/phaser/camera/CameraController.ts`
**Responsibility:** Own camera input and enforce hard bounds invariants.

**Inputs**
- Phaser `scene` and its main camera
- `world` + `camera` config from parsed `GameConfigSchema`
- callbacks:
  - selection: `selectEntity`
  - camera state: `getCameraState`, `setCameraState`, `consumePendingCameraRestore`

**Outputs**
- Updates Phaser camera scroll + zoom each frame.
- Publishes camera state snapshots via `setCameraState`.

**Initialization sequence (unambiguous)**
When a runtime becomes available or changes:
1) Parse `game_config` from `runtime.getCartridge()` using `GameConfigSchema.safeParse`.
   - If parse fails: log loudly and use `DEFAULT_GAME_CONFIG`.
2) Apply runtime world bounds:
   - `runtime.setWorldBounds(world.width, world.height)`
3) Initialize camera zoom/center:
   - If `consumePendingCameraRestore()` returns a snapshot:
     - Attempt to apply it (subject to hard bounds rules; see §7.4).
   - Else:
     - Apply default:
       - `zoom = camera.zoom.start` (clamped to [min,max] and fit constraint)
       - `center = (world.width/2, world.height/2)`

### 7.3 Camera state publishing rules
To avoid noisy persistence writes:
- Publish camera state (`setCameraState`) only when:
  - a pan drag is active (at most once per animation frame), and/or
  - a zoom event is applied, and/or
  - on pointer-up after pan/zoom interaction completes.
- The published snapshot is always the camera’s **current center + zoom** after clamping.

### 7.4 Hard bounds rules (Pan + Zoom)
The camera view rectangle must remain inside world bounds at all times.

Definitions:
- `viewWidth = cameraViewportWidth / zoom`
- `viewHeight = cameraViewportHeight / zoom`
- `worldRect = [0, world.width] x [0, world.height]`
- `viewRect` derived from camera scroll/center.

**Pan clamp**
- After any pan movement or inertia step, clamp viewRect inside worldRect. No exceptions.

**Zoom request evaluation**
When a zoom is requested (wheel input or restore apply):

1) Compute the proposed zoom `z'` (after applying scrollFactor step).
2) Clamp `z'` to configured `[min, max]`.
3) Compute `viewWidth'`/`viewHeight'` at `z'`.
4) If `viewWidth' > world.width` OR `viewHeight' > world.height`:
   - Reject the zoom request (keep prior zoom).
   - Do not move the camera.
5) Else:
   - Apply `z'`.
   - If the new viewRect would cross bounds, shift the view (scroll/center) minimally to keep it inside bounds.
   - Publish the resulting camera snapshot.

**Restore apply**
When applying a saved camera snapshot:
- Treat it as a zoom+center request:
  - Attempt to apply the saved zoom using the evaluation above.
  - Attempt to apply the saved center, then clamp to bounds.
- If the saved zoom is rejected due to “view larger than world”:
  - Fall back to default zoom (`camera.zoom.start`) and world-center.
  - Log once (loudly) that the saved camera state is incompatible with current world/canvas size.

This makes old saves / resized windows deterministic and explicit.

### 7.5 Selection and background deselect rule
Selection is handled in Phaser input, not via global React click handlers.

**Entity click**
- Entity sprites are interactive and carry their entityId in sprite data.
- On entity click: `selectEntity(entityId)`.

**Background click vs drag**
- Background pointer-down begins a “potential pan” state only if the pointer is not over an interactive entity sprite.
- Track total pointer travel (screen pixels).
- On pointer-up:
  - If travel < `dragThreshold`: treat as click → `selectEntity(null)`.
  - Else: treat as drag end → do not change selection.

This satisfies: “deselect on click on background that did not resolve in significant drag.”

### 7.6 Change: `src/engine/phaser/scenes/transferSceneHelpers.ts`
**Responsibility change:** Ensure sprites representing entities are interactive and carry entity identity.

- When acquiring a sprite for an entity:
  - ensure `sprite.setInteractive(...)` is enabled (idempotent)
  - set `sprite.data.entityId = <string>` for selection resolution

No per-frame event listener churn:
- Input handling uses scene-level events (`gameobjectdown` or equivalent) bound once in `CameraController`.

### 7.7 Change: `src/engine/phaser/hooks/usePhaserGame.ts`
**Responsibility change:** Provide selection + camera state callbacks to the Phaser scene.

- Rename instantiation from `TransferScene` to `GameScene`.
- Pull from `WorldInteractionContext`:
  - `runtime`
  - `selectedEntityId`
  - `selectEntity`
  - camera callbacks (`getCameraState`, `setCameraState`, `consumePendingCameraRestore`)
- Pass these into `GameScene` constructor.

---

## 8. Devtools: Camera + World Editor (Own Tab + Tooltips)

### 8.1 Add: `src/ui/devtools/editors/config/CameraWorldConfigEditor.tsx`
**Responsibility:** Edit only `game_config.world` and `game_config.camera`, with no internal UI tabs.

**UI contract**
- Renders inside `ToolFrame` with title “Camera + World”.
- Renders a `SchemaForm` rooted at `blueprint.settings.game_config`.
- Uses a schema that:
  - validates only `world` and `camera`
  - allows unknown keys (`catchall`) so it does not interfere with other game config fields.

### 8.2 Change: `src/ui/devtools/editors/file/SystemConfigEditor.tsx`
Add a new dashboard card:
- Title: “Camera + World”
- onClick: `openFile("camera_world::<filename>")`

### 8.3 Change: `src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx`
Add new component mapping:
- `"camera_world"` → `CameraWorldConfigEditor`

### 8.4 Tooltip requirement implementation
To guarantee SmartTooltip on every interactable element in the editor:

#### 8.4.1 Schema tooltips (data-driven)
All fields and object nodes in the camera/world schema must have `tooltip:` descriptions:
- top-level editor schema object (“Camera + World settings”)
- `world`
- `world.width`, `world.height`
- `camera`
- `camera.zoom` and its numeric fields
- `camera.pan` and its numeric fields

#### 8.4.2 Field rendering support (UI-level)
Current SchemaForm field components wrap SmartTooltip around labels for some field types. For this editor, collapsible object headers are interactable and must also have tooltips.

Make the following UI adjustments (general, non-breaking improvements):
- **File:** `src/ui/devtools/editors/fields/SchemaField.tsx`
  - Ensure `tooltip` is passed to `ObjectField` (and other composite fields) the same way it is passed to NumberField/BooleanField.
- **File:** `src/ui/devtools/editors/fields/object-field/ObjectField.tsx` and `ObjectFieldHeader.tsx`
  - Accept `tooltip?: string` and wrap the clickable header region in `SmartTooltip` when present.

These changes are strictly additive (no behavior change without tooltips).

### 8.5 Tests (editor rendering + tooltips)
Add:

#### 8.5.1 Add: `src/ui/devtools/editors/config/CameraWorldConfigEditor.test.tsx`
Two tests:

1) **renders without crashing**
- Mirror `GameConfigEditor.test.tsx` setup:
  - create a session via `createSession(filename, createCartridge(filename))`
  - wrap in `ThemeProvider` + `PortalManager`
  - render the editor
  - assert container defined

2) **all interactable fields have tooltips**
- For each required tooltip label, verify tooltip can be displayed:
  - locate the label text
  - simulate hover on the tooltip trigger
  - advance timers past SmartTooltip `enterDelay`
  - assert tooltip content text appears in the portal

The list of required tooltips is explicit and finite:
- Root object
- world, width, height
- camera
- zoom: min, max, start, scrollFactor
- pan: damping, boundsPadding, dragThreshold

This test is behavior-first (user-visible requirement) and avoids asserting DOM structure.

---

## 9. RuntimeShell + LayoutEditor: Remove DOM World Rendering

### 9.1 Change: `src/ui/runtime/shell/RuntimeShell.tsx`
**Responsibility change:** React no longer renders entities in world space.

Remove:
- `WorldRenderLinkProvider`
- `WorldLayer`
- `PhysicsDebugOverlay`
- Any “click anywhere to deselect” handler on the root container

Keep:
- `GameWorldAdapter`
- `EntityStateLinkProvider` (still required for selection overlays / bars)
- existing overlays/HUD

### 9.2 Change: `src/ui/devtools/layout/LayoutEditor.tsx`
Remove:
- `WorldRenderLinkProvider`
- `WorldLayer`

Keep:
- Phaser canvas mount
- Layout HUD
- LayoutWorldAdapter

### 9.3 Remove (delete) DOM world subsystem files
These files must be removed once no longer referenced:
- `src/ui/runtime/world/WorldLayer.tsx`
- `src/ui/runtime/world/WorldLayer.styles.ts`
- `src/ui/runtime/world/WorldRenderLink.tsx`
- `src/ui/runtime/world/EntityNode.tsx`
- `src/ui/runtime/world/EntityNode.styles.ts`
- `src/ui/runtime/world/useWorldRenderNode.ts`
- `src/ui/runtime/world/useEntityNodeModel.ts`
- `src/ui/runtime/world/useEntityNodeInteractions.ts`

Associated tests for these modules are removed as they validate deleted behavior.

---

## 10. Engine/Phaser Tests (Camera logic)

### 10.1 Add: `src/engine/phaser/camera/CameraController.math.test.ts` (file name exact per implementation)
Unit tests must cover:

- **Pan clamp invariants**
  - Given world bounds + zoom + viewport, any pan step must not allow view outside world.

- **Zoom rejection when view exceeds world**
  - Given a proposed zoom that makes viewWidth > world.width or viewHeight > world.height, Then zoom is rejected.

- **Zoom adjustment near edges**
  - Given camera near edge and zoom-in/out that would push view outside, Then camera scroll/center is shifted to keep inside bounds.

- **Background click vs drag classification**
  - Given pointer travel < dragThreshold, Then interaction is click and triggers deselect.
  - Given pointer travel >= dragThreshold, Then interaction is drag and does not deselect.

Tests are pure math/state tests; they do not depend on Phaser canvas.

---

## 11. Save/Load Tests (Camera persistence wiring)

### 11.1 Change: `src/engine/runtime/persistence/RuntimeSerializer.test.ts` (+ flyweight test)
- Update calls to `serialize(...)` to include a camera snapshot.
- Assert:
  - `data.metadata.version` is `"2"`
  - `data.state.camera` equals the provided snapshot.

### 11.2 Change: `src/ui/runtime/state/useRuntimeStore.persistence.test.ts`
Update RuntimeSerializer mock signature to accept the camera snapshot parameter, and ensure persistence slice passes it.

Add one behavior test:
- When `saveGame(...)` is called and `cameraState` is present in store, serializer is invoked with that camera snapshot.

(Load behavior is exercised via integration/manual verification; the store-level unit test checks the wiring and avoids needing Phaser.)

---

## 12. Manual Verification Checklist

1) **Devtools**
- System Config dashboard includes “Camera + World”.
- Clicking opens a new tab with the editor.
- Hovering any label/header in this editor shows a tooltip.

2) **Runtime**
- No DOM world nodes render.
- PhysicsDebugOverlay is not mounted.
- Panning/zooming never reveals outside bounds.
- Background click deselects only when not a drag.
- Entity circle click selects.

3) **Save/Load**
- Move camera, save, reload the save:
  - camera returns to the saved center/zoom (subject to bounds rules).

---

## 13. Loud Error Policy (Required)

- If Game Config parsing fails: log loudly once per runtime attach and use defaults.
- If save data lacks `state.camera`: treat as legacy save; do not crash; use default camera start.
- If saved camera state cannot be applied because it violates hard bounds rules (view larger than world): log loudly and fall back to default camera start.

No silent failures.

