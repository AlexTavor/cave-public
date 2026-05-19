# LLD — Runtime Inspector Window System

## 1. Scope

This design implements an in-game runtime inspector window system with these exact behaviors:

1. A new main-menu checkbox enables or disables the runtime inspector feature.
2. The checkbox is shown above the existing `Debug Stats` checkbox.
3. When the feature is enabled and the game runtime is active, selecting an entity shows a live inspector window for that entity.
4. The inspector window is movable and resizable.
5. A visible inspector can be pinned.
6. A pinned inspector remains on screen after selection changes or selection is cleared.
7. A pinned inspector closes automatically if its entity no longer exists.
8. Multiple inspector windows can be visible at the same time.
9. The inspector is read-only and shows the full live runtime entity.

This design does not change entity selection, selection lenses, command flow, save format, or runtime ECS state.

---

## 2. Why

The codebase already exposes entity-specific UI through `SelectionOverlay`, but that surface is lens-based and intentionally selective. It does not provide a raw, full-entity inspection surface for debugging live ECS state.

A runtime inspector is needed because the current debug surfaces are fragmented:
- `SelectionOverlay` shows curated gameplay cards only.
- terminal commands such as `game.entities` output JSON text, but only out-of-band and not live.
- `PhysicsDebugOverlay` shows physics visuals, not entity data.

The feature therefore needs a dedicated runtime UI surface that:
- remains observational,
- does not mutate runtime state,
- follows the existing runtime shell layering,
- uses Zustand for mutable UI state,
- and resets cleanly when the runtime is recreated.

This is required by the project architecture: UI must observe semantic runtime state only, mutable UI state belongs in stores, and runtime recreation is a first-class operation. The testing plan also follows the project testing contract: UI tests verify presentation and wiring, while store/layout logic is isolated and unit tested. fileciteturn4file2 fileciteturn4file1L1-L40 fileciteturn4file3

---

## 3. Grounded findings from the current codebase

### 3.1 Main-menu debug toggles already use a persistent external-store pattern
Current main-menu UI already has a bottom-right checkbox for `Debug Stats` in:
- `ui/production/main-menu/MainMenuPanel.tsx`
- `ui/production/main-menu/MainMenuPanel.styles.ts`

Its state comes from a localStorage-backed module:
- `engine/phaser/debug/phaserDebugToggle.ts`
- `ui/runtime/debug/usePhaserDebugEnabled.ts`

That is the correct pattern for a menu-level persistent UI preference.

### 3.2 Selection is already stored centrally in Zustand
The selected entity id lives in:
- `ui/runtime/state/useRuntimeToolStore.ts`

It is injected into runtime UI through:
- `ui/runtime/world/context/GameWorldAdapter.tsx`
- `ui/runtime/world/context/WorldInteractionContext.tsx`

This means the inspector should consume the existing selected entity id rather than introducing another selection source.

### 3.3 Current selection UI is not a fit for this feature
`ui/runtime/world/SelectionOverlay.tsx` resolves gameplay lenses through `resolveSelectionLens(...)` and renders curated cards. That is intentionally selective. It is not designed to show the entire live `RuntimeEntity` record.

The runtime inspector should therefore be a separate surface, not an extension of the selection lens map.

### 3.4 The runtime shell is the correct render layer
`ui/runtime/shell/RuntimeShellCanvas.tsx` already owns runtime chrome such as:
- `SelectionOverlay`
- `DraftOverlay`
- `DormancyOverlay`
- notifications
- status note
- clock

This is the correct place to mount inspector windows.

### 3.5 Portal float is the wrong layer for this feature
`ui/lib/foundation/portal-manager/types.ts` defines `float` above overlay-level UI. `LivingCardPool` uses that portal because it is transient floating feedback.

A runtime inspector must not sit above the main menu or modal overlays. Therefore it should **not** use `Portal layer="float"`. It should render inside `RuntimeShellCanvas`, within the normal runtime shell stacking context, using fixed/absolute positioning and the theme float z-index.

### 3.6 Live runtime UI already uses requestAnimationFrame polling for mutable runtime state
The codebase already uses frame polling for live UI that depends on in-place runtime mutation:
- `ui/runtime/hooks/useEntityQuery.ts`
- `ui/runtime/world/PhysicsDebugOverlay.tsx`
- `ui/runtime/world/living-cards/useLivingCardsLoop.ts`

That same pattern should be used for live inspector content. The inspector must read `runtime.getEntity(entityId)` every frame and re-render from that current value.

### 3.7 Runtime recreation already resets runtime-bound UI surfaces
`ui/runtime/state/useRuntimeStore.ts` resets notification UI on load, reset, and unload.

The runtime inspector windows are also runtime-bound UI and must be reset at the same lifecycle boundaries.

---

## 4. Design summary

The runtime inspector is implemented as a new runtime UI feature with four layers:

1. **Persistent feature toggle**
   - a localStorage-backed on/off preference exposed in the main menu.

2. **Inspector window store**
   - a Zustand store holding only inspector window UI state:
     - which windows exist,
     - which entity each window is bound to,
     - whether each window is pinned,
     - geometry,
     - z-order.

3. **Runtime-shell viewport**
   - a runtime overlay mounted in `RuntimeShellCanvas` that synchronizes the current selection into one transient inspector window and renders all open windows.

4. **Per-window live entity reader**
   - each inspector window reads the current runtime entity directly from `runtime.getEntity(entityId)` on animation frames and renders a read-only pretty-printed view of that current entity.

This keeps the architecture clean:
- runtime state stays in ECS/runtime,
- selection stays in `useRuntimeToolStore`,
- inspector window UI state stays in a dedicated Zustand store,
- the inspector content is read-only and observational.

---

## 5. User-visible behavior contract

### 5.1 Feature toggle
- Label: `Runtime Inspector`
- Location: main menu bottom-right toggle stack, above `Debug Stats`
- Default: off
- Persistence: browser localStorage, same persistence model as `Debug Stats`

### 5.2 When enabled
- Selecting an entity opens exactly one **transient** inspector window unless that entity already has a pinned inspector.
- If the transient inspector already exists, it switches to the newly selected entity rather than opening an additional transient window.
- Clearing selection closes the transient inspector.
- Selecting an entity that already has a pinned inspector does not create a duplicate transient inspector; the existing pinned inspector is brought to the front.

### 5.3 Pinning
- Pinning converts the current transient inspector into a pinned inspector.
- Pinned inspectors persist after selection changes or selection is cleared.
- Multiple pinned inspectors may exist simultaneously.
- Pinning an entity that already has a pinned inspector does not duplicate it; the transient inspector is removed and the existing pinned inspector is focused.

### 5.4 Entity death / removal
- If a window’s entity no longer exists in the runtime, that window closes automatically.
- This applies to both transient and pinned inspectors.
- This behavior is based on actual runtime existence, not on selection state.

### 5.5 Disable / runtime recreation
- Disabling the feature closes all inspector windows immediately.
- Loading a cartridge, resetting the runtime, or unloading the runtime closes all inspector windows immediately.
- Inspector windows and their positions are **not** persisted across runtime recreation or app restart.
- Only the feature toggle is persisted.

### 5.6 Window interaction
- Each window is draggable by its header only.
- Each window is resizable from a single bottom-right resize handle.
- Clicking a window brings it to the front.
- Window geometry is clamped to the viewport.
- Content scrolls inside the window when the entity text is longer than the available height.

### 5.7 Rendered content
- The window shows the complete current `RuntimeEntity` bound to that inspector.
- The content is rendered as read-only pretty-printed JSON with two-space indentation.
- No fields are filtered, omitted, or curated by gameplay lens logic.
- The inspector does not mutate runtime state and does not emit runtime commands.

---

## 6. Detailed design

## 6A. Storage and state model

### Why
The inspector has mutable window UI state that is not part of the runtime ECS world. Per the project rules, that state belongs in Zustand, not in React component state. fileciteturn4file2

### What
Introduce a dedicated runtime inspector store.

### Window model
Each window record contains:
- `id: string`
- `entityId: string`
- `mode: "selection" | "pinned"`
- `x: number`
- `y: number`
- `width: number`
- `height: number`
- `zIndex: number`

Store state contains:
- `windows: RuntimeInspectorWindowRecord[]`
- `nextZIndex: number`

Store actions contain:
- `syncSelection(entityId: string | null)`
- `pinWindow(windowId: string)`
- `closeWindow(windowId: string)`
- `focusWindow(windowId: string)`
- `moveWindow(windowId: string, x: number, y: number)`
- `resizeWindow(windowId: string, width: number, height: number)`
- `closeWindowsForEntity(entityId: string)`
- `reset()`

### Logic
- At most one `selection` window may exist.
- Any number of `pinned` windows may exist.
- The store never stores live entity payloads.
- The store never stores runtime references.
- Geometry is normalized through shared layout helpers before being committed.

---

## 6B. Feature toggle model

### Why
The main-menu checkbox is a persistent user preference, not runtime simulation state.

### What
Create a localStorage-backed toggle module matching the existing `phaserDebugToggle` pattern.

### Logic
- The module owns the current enabled boolean.
- The module exposes getter, setter, toggle, and subscription APIs.
- A hook wraps it with `useSyncExternalStore` for React consumers.
- The storage key is dedicated to this feature and must not reuse the debug-stats key.

### Interface
- `getRuntimeInspectorEnabled(): boolean`
- `setRuntimeInspectorEnabled(next: boolean): void`
- `toggleRuntimeInspectorEnabled(): void`
- `subscribeRuntimeInspectorEnabled(listener): unsubscribe`
- `useRuntimeInspectorEnabled(): boolean`

---

## 6C. Selection synchronization

### Why
Selection already exists in `useRuntimeToolStore`. The inspector should consume that source rather than creating a second selection concept.

### What
Add a synchronization hook used by the viewport.

### Logic
The synchronization hook reacts to:
- `enabled`
- `runtime`
- `selectedEntityId`

Rules:
1. If `enabled === false`, call `reset()` and do nothing else.
2. If `runtime === null`, call `reset()` and do nothing else.
3. Otherwise call `syncSelection(selectedEntityId)` on the inspector store.

This hook only synchronizes the transient selection window. It does not own pinning or drag/resize.

---

## 6D. Live entity reading

### Why
Runtime entities mutate in place. A direct React render from entity object identity would go stale.

### What
Each inspector window uses a dedicated live-reader hook.

### Logic
For a given `windowId` + `entityId` + `runtime`:
- poll on `requestAnimationFrame`
- read `runtime.getEntity(entityId)`
- if the entity exists:
  - derive header title from `label`, then `blueprintId`, then `entityId`
  - serialize the full entity with `JSON.stringify(entity, null, 2)`
  - update React state only if the rendered string or title has changed
- if the entity does not exist:
  - call `closeWindow(windowId)`
  - stop polling for that window

This hook is read-only. It does not enqueue commands.

### Interface
Return shape:
- `title: string`
- `entityText: string`

If the entity disappears, the hook does not expose a stale payload; it closes the window.

---

## 6E. Window layout and interactions

### Why
Move/resize logic must be deterministic, testable, and not embedded ad hoc inside JSX.

### What
Create feature-local layout helpers and a feature-local pointer interaction hook.

### Layout constants
Use these exact bounds:
- default width: `420`
- default height: `520`
- minimum width: `280`
- minimum height: `180`
- viewport margin: `16`
- cascade offset per newly created window: `28`

### Default placement
- New windows start at the top-left portion of the runtime viewport.
- Each newly created window is offset by the cascade step from the prior highest-index creation slot.
- Bounds are clamped to remain fully within the viewport margin.

### Interaction rules
- Header pointer-down starts drag.
- Resize handle pointer-down starts resize.
- Drag and resize attach document-level pointer listeners until pointer-up.
- Move and resize always clamp to viewport bounds.
- Pointer interaction brings the target window to front before the first geometry update.

### Interface
Layout helper functions:
- `createDefaultInspectorBounds(existingWindowCount, viewportWidth, viewportHeight)`
- `clampInspectorMove(bounds, viewportWidth, viewportHeight)`
- `clampInspectorResize(bounds, viewportWidth, viewportHeight)`

Interaction hook return shape:
- `onHeaderPointerDown`
- `onResizeHandlePointerDown`
- `onWindowPointerDown`

No generic reusable window-manager abstraction is introduced; this remains feature-local by design.

---

## 6F. Render layer choice

### Why
The inspector must behave like runtime chrome, not like a tooltip or portal-float overlay.

### What
Render the inspector viewport directly inside `RuntimeShellCanvas` only when `chrome === "full"`.

### Logic
- The viewport is a shell-level overlay container with `pointer-events: none`.
- Each individual window has `pointer-events: auto`.
- The viewport is positioned over the game canvas within `RuntimeViewport`.
- The viewport uses the theme float z-index.
- It is not rendered in `chrome="minimal"`.

### Why not portal float
The float portal root is globally layered above overlays. Using it would put inspectors above main-menu overlays and other blocking UI. That is incorrect for this feature.

---

## 7. File-by-file implementation contract

## 7A. Add — `ui/runtime/inspector/runtimeInspectorToggle.ts`

**Responsibility**  
Own the persistent runtime-inspector enabled preference.

**Logic**  
- Mirror the implementation style of `engine/phaser/debug/phaserDebugToggle.ts`.
- Read initial value from localStorage.
- Maintain a listener set.
- Persist updates back to localStorage.
- Notify listeners on change.

**Interface**  
Exports:
- `getRuntimeInspectorEnabled`
- `setRuntimeInspectorEnabled`
- `toggleRuntimeInspectorEnabled`
- `subscribeRuntimeInspectorEnabled`

**Non-goals**  
- No inspector-window state lives here.
- No runtime references live here.

---

## 7B. Add — `ui/runtime/inspector/useRuntimeInspectorEnabled.ts`

**Responsibility**  
Expose the persistent toggle to React via `useSyncExternalStore`.

**Logic**  
- Subscribe to `runtimeInspectorToggle.ts`
- Return the current enabled boolean

**Interface**  
Exports:
- `useRuntimeInspectorEnabled(): boolean`

---

## 7C. Add — `ui/runtime/inspector/runtimeInspectorTypes.ts`

**Responsibility**  
Define the feature-local types for inspector window state.

**Logic**  
- Declare the window mode union
- Declare the window bounds type
- Declare the window record type

**Interface**  
Exports type-only contracts used by the store, hooks, and components.

---

## 7D. Add — `ui/runtime/inspector/runtimeInspectorLayout.ts`

**Responsibility**  
Centralize default inspector geometry and all move/resize clamping rules.

**Logic**  
- Create default bounds for a new window
- Clamp moves to viewport bounds
- Clamp resizes to min/max bounds
- Remain pure and deterministic

**Interface**  
Exports:
- `createDefaultInspectorBounds(...)`
- `clampInspectorMove(...)`
- `clampInspectorResize(...)`

**Important constraint**  
No DOM listeners and no store mutation in this file.

---

## 7E. Add — `ui/runtime/inspector/runtimeInspectorStore.ts`

**Responsibility**  
Hold all mutable inspector window UI state.

**Logic**  
- Use Zustand with Immer, matching the existing store pattern used in runtime UI.
- Maintain `windows` and `nextZIndex`.
- Enforce at most one `selection` window.
- `syncSelection(entityId)` behavior:
  - `null` => remove any `selection` window
  - entity already pinned => remove `selection` window and focus pinned window
  - existing `selection` window => retarget it to the new entity and focus it
  - otherwise create a new `selection` window with default bounds
- `pinWindow(windowId)` behavior:
  - if the window is already pinned, no-op
  - if another pinned window already targets the same entity, remove the transient one and focus the existing pinned one
  - otherwise convert the target window from `selection` to `pinned` and focus it
- `focusWindow(windowId)` increments z-order deterministically
- `moveWindow` and `resizeWindow` clamp through `runtimeInspectorLayout.ts`
- `closeWindowsForEntity(entityId)` removes all windows bound to the dead/missing entity
- `reset()` clears all windows and restores `nextZIndex` to its initial value

**Interface**  
Exports:
- `runtimeInspectorStore`
- `useRuntimeInspectorStore`
- minimal selectors for `windows`

**Important constraint**  
The store never stores runtime entity payloads.

---

## 7F. Add — `ui/runtime/inspector/useRuntimeInspectorSync.ts`

**Responsibility**  
Bridge global inspector enablement, runtime presence, and current selection into the inspector store.

**Logic**  
- Read `enabled`
- Read `runtime` from `useWorldInteraction()` or injected runtime input
- Read `selectedEntityId` from `useRuntimeToolStore`
- Apply the synchronization rules defined in section 6C

**Interface**  
No return value. This hook is side-effect only.

**Important constraint**  
This hook does not render, does not stringify entities, and does not own drag/resize.

---

## 7G. Add — `ui/runtime/inspector/useRuntimeInspectorEntity.ts`

**Responsibility**  
Provide the live read-only entity payload for a single inspector window.

**Logic**  
- Poll `runtime.getEntity(entityId)` using `requestAnimationFrame`
- Close the window if the entity disappears
- Compute title and JSON text for the current entity
- Avoid redundant state updates when the rendered payload has not changed

**Interface**  
Inputs:
- `runtime`
- `windowId`
- `entityId`

Outputs:
- `title`
- `entityText`

**Important constraint**  
This hook observes runtime state only. It emits no runtime commands.

---

## 7H. Add — `ui/runtime/inspector/useRuntimeInspectorWindowInteractions.ts`

**Responsibility**  
Own pointer-driven drag/resize behavior for inspector windows.

**Logic**  
- On header pointer-down:
  - focus the window
  - start drag session
  - install document-level pointermove/pointerup listeners
  - convert pointer deltas into clamped `moveWindow(...)` actions
- On resize-handle pointer-down:
  - focus the window
  - start resize session
  - install document-level pointermove/pointerup listeners
  - convert pointer deltas into clamped `resizeWindow(...)` actions
- On generic window pointer-down:
  - focus the window

**Interface**  
Inputs:
- `windowId`
- current window bounds

Outputs:
- `onWindowPointerDown`
- `onHeaderPointerDown`
- `onResizeHandlePointerDown`

**Important constraint**  
No JSX markup lives here.

---

## 7I. Add — `ui/runtime/inspector/RuntimeInspectorViewport.styles.ts`

**Responsibility**  
Define all styled components for the inspector viewport and windows.

**Logic**  
Create styled elements for:
- viewport root
- window shell
- header row
- title text
- action buttons
- content scroller
- monospace content block
- resize handle

**Interface**  
Exports only styled components.

**Important constraint**  
Use theme tokens only. No inline magic styling inside JSX.

---

## 7J. Add — `ui/runtime/inspector/RuntimeInspectorWindow.tsx`

**Responsibility**  
Render one inspector window.

**Logic**  
- Consume the live entity hook
- Consume the interaction hook
- Render:
  - title
  - `PIN` action for transient windows only
  - `CLOSE` action for all windows
  - pretty-printed entity text inside a scrollable content area
- The component is read-only and presentation-only

**Interface**  
Props:
- `window: RuntimeInspectorWindowRecord`
- `runtime`

**Important constraint**  
No store mutation logic beyond invoking already-defined actions.

---

## 7K. Add — `ui/runtime/inspector/RuntimeInspectorViewport.tsx`

**Responsibility**  
Render all active runtime inspector windows.

**Logic**  
- Run `useRuntimeInspectorSync()`
- Read current `runtime` from `useWorldInteraction()`
- Read current window list from the inspector store
- If the feature is disabled, render nothing
- If `runtime` is null, render nothing
- Otherwise render the viewport root and one `RuntimeInspectorWindow` per window record, ordered by `zIndex`

**Interface**  
No props.

**Important constraint**  
The viewport itself is not responsible for selection, drag logic, or entity serialization.

---

## 7L. Change — `ui/production/main-menu/MainMenuPanel.tsx`

**Responsibility**  
Render main-menu toggles and actions.

**Logic**  
- Import the new runtime-inspector toggle setter and hook
- Add a `Runtime Inspector` checkbox above the existing `Debug Stats` checkbox
- Preserve existing `Debug Stats` behavior unchanged

**Interface**  
Visible menu change only:
- checkbox 1: `Runtime Inspector`
- checkbox 2: `Debug Stats`

**Important constraint**  
Do not change main-menu actions, status text, or action-card behavior.

---

## 7M. Change — `ui/production/main-menu/MainMenuPanel.styles.ts`

**Responsibility**  
Support a vertical stack of bottom-right menu toggles.

**Logic**  
- Replace the single-checkbox positioning wrapper with a stacked toggle container
- Keep the same bottom-right anchor
- Keep individual rows as labels with checkbox + text

**Interface**  
Exports style primitives used by `MainMenuPanel.tsx`.

---

## 7N. Change — `ui/runtime/shell/RuntimeShellCanvas.tsx`

**Responsibility**  
Own runtime chrome composition.

**Logic**  
- Import and render `RuntimeInspectorViewport`
- Render it only when `chrome === "full"`
- Place it alongside the other runtime overlays inside `EntityStateLinkProvider`

**Interface**  
No prop changes.

**Important constraint**  
Do not move existing overlays between layers.

---

## 7O. Change — `ui/runtime/state/useRuntimeStore.ts`

**Responsibility**  
Reset runtime-bound UI surfaces when the runtime lifecycle changes.

**Logic**  
On each of these actions:
- `loadCartridge`
- `unload`
- `reset`

also call:
- `runtimeInspectorStore.getState().reset()`

This matches the existing pattern used for `runtimeNotificationStore`.

**Interface**  
No public API changes.

**Important constraint**  
The inspector store reset must happen on the same lifecycle boundaries as other runtime-bound UI state.

---

## 7P. Change — `ui/production/MainMenu.test.tsx`

**Responsibility**  
Verify menu toggle presentation and wiring.

**Logic**  
Add coverage for:
- rendering the `Runtime Inspector` checkbox
- toggling it updates the persistent toggle module
- `Debug Stats` behavior remains unchanged

**Interface**  
No production interface changes.

---

## 7Q. Add — `ui/runtime/inspector/runtimeInspectorLayout.test.ts`

**Responsibility**  
Unit test geometry rules.

**Logic**  
Verify:
- default window placement stays inside the viewport
- move clamping prevents dragging outside viewport margin
- resize clamping enforces min size and viewport bounds

**Interface**  
Pure unit tests only.

---

## 7R. Add — `ui/runtime/inspector/runtimeInspectorStore.test.ts`

**Responsibility**  
Unit test inspector store behavior.

**Logic**  
Verify:
- only one transient selection window exists
- transient retargets on selection change
- pinning converts transient to pinned
- selecting an entity with an existing pinned window does not duplicate it
- multiple pinned windows coexist
- `focusWindow` updates ordering
- `closeWindowsForEntity` removes matching windows
- `reset` clears all windows

**Interface**  
Store-level tests only. No DOM required.

---

## 7S. Add — `ui/runtime/inspector/RuntimeInspectorViewport.test.tsx`

**Responsibility**  
View-test the runtime inspector as rendered runtime UI.

**Logic**  
Verify:
- nothing renders when the feature is disabled
- selecting an entity renders a live inspector window when enabled
- the window displays the entity id and pretty-printed entity payload
- pinning keeps the window visible after selection is cleared
- selecting and pinning a second entity yields two windows
- if the runtime entity is removed, its inspector disappears

**Interface**  
Use a real minimal runtime or runtime factory. Mock only external boundaries if required.

---

## 7T. Add — `ui/runtime/state/useRuntimeStore.inspector.test.ts`

**Responsibility**  
Verify runtime lifecycle resets inspector UI state.

**Logic**  
Verify that inspector windows are cleared on:
- load
- reset
- unload

This mirrors the existing notification reset test pattern.

**Interface**  
No production interface changes.

---

## 7U. Change — `ui/runtime/shell/RuntimeShell.test.tsx`

**Responsibility**  
Verify shell-level composition rules.

**Logic**  
Add coverage that the runtime inspector viewport:
- is absent in `chrome="minimal"`
- is eligible to render in `chrome="full"`

**Interface**  
No production interface changes.

---

## 8. Important non-changes

These files are intentionally unchanged:

- `ui/runtime/world/SelectionOverlay.tsx`
- `ui/runtime/world/selection/selectionLensMap.ts`
- `ui/runtime/state/useRuntimeToolStore.ts`
- `ui/runtime/world/context/GameWorldAdapter.tsx`
- runtime command handlers and ECS systems
- save-game serialization

Reasons:
- selection behavior is already correct and already centralized
- the inspector is read-only and does not need runtime command changes
- inspector windows are UI-only and should not be persisted in save files

---

## 9. Test plan

All tests must follow the project testing contract:
- store/layout logic as unit tests
- runtime/view wiring as view tests
- Given / When / Then structure
- real runtime data structures where practical
- no implementation-detail assertions in UI tests beyond visible behavior and store wiring. fileciteturn4file1L1-L40

### 9.1 Layout unit tests

#### `runtimeInspectorLayout.test.ts`

**Given** a viewport smaller than the default rect  
**When** default bounds are created  
**Then** the bounds are clamped fully inside the viewport margin.

**Given** a window dragged beyond the left/top edges  
**When** move clamping runs  
**Then** `x` and `y` stop at the configured margin.

**Given** a resize below minimum size  
**When** resize clamping runs  
**Then** width and height stop at the configured minimums.

### 9.2 Store unit tests

#### `runtimeInspectorStore.test.ts`

**Given** no windows  
**When** `syncSelection("body-1")` runs  
**Then** one transient window exists for `body-1`.

**Given** a transient window for `body-1`  
**When** `syncSelection("body-2")` runs  
**Then** there is still exactly one transient window and it now targets `body-2`.

**Given** a transient window for `body-1`  
**When** `pinWindow(windowId)` runs  
**Then** the window becomes pinned.

**Given** a pinned window for `body-1`  
**When** `syncSelection("body-1")` runs  
**Then** no transient duplicate is created.

**Given** two windows  
**When** `focusWindow(secondId)` runs  
**Then** the second window has the highest z-order.

### 9.3 View tests

#### `RuntimeInspectorViewport.test.tsx`

**Given** the feature toggle is off  
**When** the viewport renders  
**Then** no inspector windows are shown.

**Given** the feature toggle is on and `selectedEntityId` is `worker-1`  
**When** the viewport renders with a runtime containing `worker-1`  
**Then** one inspector window is shown and its content includes `"id": "worker-1"`.

**Given** one transient inspector  
**When** `PIN` is clicked and selection is cleared  
**Then** the inspector remains visible.

**Given** one pinned inspector and a second selection  
**When** the second entity is pinned  
**Then** two inspector windows are visible.

**Given** a pinned inspector for `worker-1`  
**When** `worker-1` is removed from the runtime  
**Then** the inspector disappears automatically.

### 9.4 Runtime lifecycle tests

#### `useRuntimeStore.inspector.test.ts`

**Given** inspector windows are open  
**When** the runtime is loaded, reset, or unloaded  
**Then** the inspector store is empty after each action.

### 9.5 Shell composition tests

#### `RuntimeShell.test.tsx`

**Given** `chrome="minimal"`  
**When** the shell renders  
**Then** the inspector viewport is absent.

**Given** `chrome="full"`  
**When** the shell renders with the feature enabled  
**Then** the inspector viewport is mounted.

---

## 10. Non-goals

This implementation does **not** include any of the following:

- editing entity data from the inspector
- physics-body inspection panels
- hotkeys for opening or pinning inspectors
- window persistence across reloads or app restart
- generic reusable window-manager abstractions in `ui/lib`
- changes to selection-card lens logic
- save-file persistence for inspector windows

These are intentionally out of scope.

---

## 11. Acceptance criteria

The feature is complete only when all of the following are true:

1. The main menu shows a `Runtime Inspector` checkbox above `Debug Stats`.
2. The runtime inspector toggle persists via localStorage.
3. When enabled in a full runtime shell, selecting an entity opens a live inspector window.
4. The inspector shows the full current `RuntimeEntity` as pretty-printed read-only JSON.
5. The inspector window can be dragged and resized.
6. A transient inspector can be pinned.
7. Pinned inspectors remain after selection changes or deselection.
8. Multiple pinned inspectors can coexist on screen.
9. Selecting an entity that already has a pinned inspector does not create a duplicate inspector.
10. If an inspected entity is killed or otherwise removed, its inspector closes automatically.
11. Disabling the feature closes all inspectors immediately.
12. Loading, resetting, or unloading the runtime closes all inspectors immediately.
13. The inspector does not mutate runtime ECS state and emits no runtime commands.
14. All added and changed tests pass under the project testing contract. fileciteturn4file1L1-L40 fileciteturn4file3

This document is the implementation contract.
