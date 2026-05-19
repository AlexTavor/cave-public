# LLD — Runtime Node Status Overlays

## 1. Why

The current runtime has strong semantic data, but most of it is surfaced only in the right-side selection card or specialized overlays. The code already proves that the data exists and is live: `JobCard` resolves cycle progress and throttle data, `AbsorptionCard` resolves assignment progress, `resolveStorageAbilityBars` resolves resource storage values, and `EntityStateLinkProvider` keeps progress bars live without shadow state. What is missing is a local, always-visible node-level readout anchored at the node itself.

The goal of this feature is to make node state legible in place. The overlay must answer “what is happening here right now?” without requiring selection. This is specifically for node-like entities already recognized by the selection-lens system. The implementation must therefore reuse the existing lens classification instead of creating a second, competing classification mechanism.

This feature is presentation-only. It must not mutate simulation state. It must not introduce React-owned shadow copies of runtime state. It must read directly from the runtime each frame, derive a compact view model, and render a small anchored card above the node. This is fully consistent with the project’s UI laws: logic lives in hooks and services, React renders semantic state, and simulation state remains in the ECS world.

The main menu already has an existing runtime-toggle surface in `MainMenuPanel.tsx`. This design uses that surface for the on/off setting instead of inventing a new settings submenu, action card, or state-management pattern. That is the smallest valid change and the most consistent one with the current codebase.

---

## 2. What

### 2.1 In scope

Implement compact runtime overlays for node-like entities with three supported overlay kinds:

1. **Cycle node overlay** — for `job` lens entities that do not have `assignment`
    - verbal status: `Next cycle`
    - numeric status: formatted time remaining when available
    - fallback verbal state when time remaining is unavailable: `No power` if `powerSink.status === "blackout"`, otherwise `Idle`
    - visual state: compact progress bar bound to cycle progress
2. **Assignment node overlay** — for `job` lens entities that do have `assignment`
    - verbal status: `Time to completion` when assignment is active, otherwise `Idle`
    - numeric status: formatted remaining duration when active
    - visual state: compact progress bar bound to absorption progress
3. **Storage node overlay** — for `resource` lens entities
    - verbal status: label of the first visible resolved storage bar
    - numeric status: current/max text from that first visible storage bar
    - visual state: compact progress bar bound to that first visible storage bar

### 2.2 Out of scope

- Collision handling between overlays
- Overlays for cave, swarm, body, face, transfer, or attribute-pool lenses
- New tutorial logic
- New selection behavior
- New runtime commands
- New main-menu action cards or a separate settings submenu
- Any business-logic changes to simulation or ECS state

### 2.3 Non-negotiable behavior

- Overlays render only when the feature toggle is enabled
- Overlays render only when `RuntimeShellCanvas` is in `chrome="full"`
- Overlays require all of the following:
    - runtime exists
    - camera state exists
    - entity has an `id`
    - entity has a physics body via `runtime.getPhysicsBody(id)`
    - entity resolves to a supported overlay kind
- Overlays are read-only and pointer-events-free
- Overlays are clipped to the runtime viewport by the existing viewport overflow behavior

---

## 3. Existing mechanisms to reuse

### 3.1 Lens classification

`resolveSelectionLens(entity, runtime)` in `selectionLensMap.ts` is the authoritative selector for runtime entity presentation categories. This design reuses it directly. No second lens map will be introduced.

### 3.2 Live progress binding

`EntityStateLinkProvider` and `useEntityBarRef` already provide DOM-bound live bar updates from ECS state paths. This design reuses that mechanism for compact overlay progress bars.

### 3.3 Cycle analysis

`jobAnalysis.cycle.ts` already resolves cycle current, max, and ticks remaining for job entities. This design extends that file only where needed so overlays can reuse the same binding metadata instead of duplicating cycle-bar logic.

### 3.4 Storage resolution

`resolveStorageAbilityBars(entity, runtime)` is already the authoritative storage-bar resolver. This design reuses it and treats the first visible resolved storage bar as the compact overlay metric.

### 3.5 Main-menu persisted toggles

`runtimeInspectorToggle.ts` and `useRuntimeInspectorEnabled.ts` define the existing persisted toggle pattern. This design uses the same pattern for the overlay feature toggle.

### 3.6 Pooling model

`LivingCardPool.tsx` shows the accepted pooling pattern in this codebase: fixed slot count and stable mounted wrappers. This design reuses that pattern conceptually, but keeps semantic rendering in React instead of mutating `.textContent` directly.

---

## 4. UX contract

### 4.1 Overlay content contract

Every visible overlay card must contain exactly:

- one primary verbal label
- one primary numeric/status value line
- one compact visual progress bar when a valid bar binding exists

No overlay card may render more than one metric. The overlay is a local status card, not a mini selection panel.

### 4.2 Overlay anchor contract

- Anchor point is the entity physics-body center
- Overlay horizontal anchor is center-aligned to the node
- Overlay vertical anchor is above the node
- Vertical offset formula is:
    - `(physics radius * camera zoom) + fixed card gap`
- Position is derived from camera center and zoom using the same camera semantics already published by `cameraInputHandlers.ts`

### 4.3 Settings contract

The on/off control lives in the existing `ToggleStack` in `MainMenuPanel.tsx`.

No new `MainMenuActionModel` entry is added.

### 4.4 Default toggle state

The overlay feature is **enabled by default** when there is no persisted value.

Rationale: this is a player-facing comprehensibility feature, not a developer tool. Requiring discovery before the first session would defeat its purpose.

---

## 5. Runtime data contract

### 5.1 Supported lenses and mapping

- `resolveSelectionLens(...).id === "job"` and `entity.assignment` absent → `cycle`
- `resolveSelectionLens(...).id === "job"` and `entity.assignment` present → `assignment`
- `resolveSelectionLens(...).id === "resource"` → `storage`
- all other lens ids → no overlay

### 5.2 Cycle overlay contract

Input sources:

- `resolveSelectionLens`
- `resolveJobCycleStatus`
- `resolvePowerSink`
- exported cycle-bar binding metadata from `jobAnalysis.cycle.ts`

Output rules:

- if cycle binding is unavailable, no cycle overlay is rendered
- if `ticksRemaining` is a finite value, numeric line is formatted countdown text
- if `ticksRemaining` is null and `powerSink.status === "blackout"`, numeric line is `No power`
- if `ticksRemaining` is null and sink is not blackout, numeric line is `Idle`
- bar binding always points at cycle progress paths resolved by the same logic used by the selection card

### 5.3 Assignment overlay contract

Input sources:

- `resolveSelectionLens`
- `entity.assignment.assignedIds`
- `entity.state.absorption_progress.value`
- `entity.state.absorption_duration.value`

Output rules:

- if `assignedIds.length === 0`, verbal label is `Idle`, numeric line is empty, bar renders at zero if both progress keys exist; otherwise bar is omitted
- if `assignedIds.length > 0` and both progress and duration are finite, verbal label is `Time to completion` and numeric line is formatted remaining duration
- remaining duration is `max(duration - progress, 0)` seconds
- if progress keys are missing while assignment is active, no overlay is rendered and a development warning is logged once per activation transition

### 5.4 Storage overlay contract

Input source:

- `resolveStorageAbilityBars(entity, runtime)`

Output rules:

- if no visible storage bars resolve, no storage overlay is rendered
- the first visible bar in returned order is the compact overlay metric
- verbal label is `bar.title`
- numeric line is `bar.valueText`
- bar binding uses `bar.valuePath` with either `bar.maxPath` or `bar.maxValue`
- additional storage bars are not rendered in the compact overlay

---

## 6. Positioning contract

### 6.1 World-to-screen conversion

The overlay system uses the camera snapshot already stored in runtime UI state:

- `centerX`
- `centerY`
- `zoom`

For viewport size, the overlay host uses its own client width and height.

The conversion formula is:

- `screenX = viewportWidth / 2 + (worldX - camera.centerX) * camera.zoom`
- `screenY = viewportHeight / 2 + (worldY - camera.centerY) * camera.zoom`

Then the final anchor is:

- `x = screenX`
- `y = screenY - (physicsRadius * camera.zoom) - cardGapPx`

### 6.2 Missing prerequisites

If camera state is null, viewport size is zero, or physics body is missing, the overlay is not produced.

### 6.3 Clipping

No collision logic and no explicit offscreen culling are added in this phase. The existing `RuntimeViewport` overflow behavior clips overlays naturally.

---

## 7. File-by-file design

## 7.1 Files to change

### `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

**Responsibility**
Mount the new node-overlay viewport inside the existing full-chrome runtime shell.

**Logic**

- Import the new `NodeOverlayViewport`
- Render it only inside the existing `chrome === "full"` branch
- Mount it inside the existing `EntityStateLinkProvider`
- Render order:
    1. `SelectionOverlay`
    2. `NodeOverlayViewport`
    3. other modal/overlay surfaces already present

**Interface**
No prop changes.

**Contract**
`NodeOverlayViewport` must not mount in minimal chrome.

---

### `src/ui/production/main-menu/MainMenuPanel.tsx`

**Responsibility**
Expose a persisted on/off toggle for node overlays in the existing main-menu toggle stack.

**Logic**

- Import `useNodeOverlaysEnabled` and `setNodeOverlaysEnabled`
- Add one new `ToggleRow` after the existing runtime toggles
- Toggle label text: `Node Overlays`
- The checkbox must reflect persisted state and update it on change

**Interface**
No prop changes.

**Contract**
No new action card, submenu, or `MainMenuActionModel` entry is introduced.

---

### `src/ui/runtime/world/selection/job-card/jobAnalysis.cycle.ts`

**Responsibility**
Expose the same cycle binding metadata already used implicitly by selection-card cycle analysis so overlays can reuse it without duplicating cycle-bar resolution logic.

**Logic**

- Extract and export a pure helper that resolves cycle progress binding metadata for an entity
- Existing `resolveJobCycleStatus` must use that helper internally
- Existing behavior of `resolveJobCycleStatus` must remain unchanged

**Interface**
Add one exported pure helper returning:

- value path for current cycle
- max path or max value for cycle max
- null when cycle binding cannot be resolved

**Contract**
Selection card behavior and existing tests must remain green.

---

### `src/ui/runtime/world/selection/ability-display/abilityDisplay.utils.ts`

**Responsibility**
Provide a reusable duration formatter for assignment overlays while preserving existing countdown formatting behavior.

**Logic**

- Extract the existing shared duration formatting logic into a general utility that formats milliseconds
- Keep `formatCountdownText(ticksRemaining)` as a stable API that delegates to the new helper
- Export the new helper for assignment overlay use

**Interface**
Add one exported pure formatter that accepts milliseconds.

**Contract**
Existing consumers of `formatCountdownText` must remain unchanged.

---

## 7.2 Files to add

### `src/ui/runtime/world/node-overlays/index.ts`

**Responsibility**
Feature export barrel for the node-overlay surface.

**Logic**
Re-export the runtime viewport component and the enabled-state hook only.

**Interface**
Exports:

- `NodeOverlayViewport`
- `useNodeOverlaysEnabled`

---

### `src/ui/runtime/world/node-overlays/nodeOverlayToggle.ts`

**Responsibility**
Persist and publish the enabled/disabled state for node overlays.

**Logic**
Use the same external-store pattern as `runtimeInspectorToggle.ts`:

- read from localStorage on module init
- keep module-local boolean state
- notify subscribers on change
- write through to localStorage

**Interface**
Exports:

- `getNodeOverlaysEnabled(): boolean`
- `setNodeOverlaysEnabled(next: boolean): void`
- `toggleNodeOverlaysEnabled(): void`
- `subscribeNodeOverlaysEnabled(listener: () => void): () => void`

**Contract**
Storage key must be unique to this feature.
Default value when the key is absent: enabled.

---

### `src/ui/runtime/world/node-overlays/useNodeOverlaysEnabled.ts`

**Responsibility**
React hook for reading the persisted overlay-toggle state.

**Logic**
Use `useSyncExternalStore` over `nodeOverlayToggle.ts`.

**Interface**
Exports:

- `useNodeOverlaysEnabled(): boolean`

---

### `src/ui/runtime/world/node-overlays/nodeOverlayTypes.ts`

**Responsibility**
Define all public feature-local types.

**Logic**
Type-only file. No runtime logic.

**Interface**
Defines:

- overlay kind union: `cycle | assignment | storage`
- compact bar-binding type
- screen-position type
- resolved overlay model type
- fixed-slot model type

**Contract**
No React components or runtime logic in this file.

---

### `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts`

**Responsibility**
Resolve the semantic overlay model for one entity.

**Logic**

- Call `resolveSelectionLens(entity, runtime)`
- Map supported lens ids to one of the three overlay kinds
- Build the label/value/bar-binding payload exactly as defined in sections 5.2–5.4
- Return null for unsupported or invalid entities
- Use the exported duration formatter from `abilityDisplay.utils.ts`
- Use the exported cycle-binding metadata from `jobAnalysis.cycle.ts`
- Use `resolveStorageAbilityBars` for storage nodes

**Interface**
Exports:

- `resolveNodeOverlayModel(entity, runtime): ResolvedNodeOverlayModel | null`

**Contract**
Pure function. No React. No runtime mutation.

---

### `src/ui/runtime/world/node-overlays/nodeOverlayPosition.ts`

**Responsibility**
Convert runtime world coordinates to overlay screen coordinates.

**Logic**

- Accept camera snapshot, viewport size, physics body radius, and world position
- Apply the exact conversion formula from section 6
- Return a screen anchor point

**Interface**
Exports:

- `resolveNodeOverlayPosition(input): { x: number; y: number } | null`

**Contract**
Pure function. No DOM reads. No runtime reads.

---

### `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts`

**Responsibility**
Build the ordered visible overlay-entry list for the current runtime frame.

**Logic**

- Read all runtime entities via `runtime.getEntities()`
- Filter to entities with ids and physics bodies
- Resolve semantic model via `resolveNodeOverlayModel`
- Resolve position via `resolveNodeOverlayPosition`
- Sort the result deterministically by entity id ascending
- Apply fixed pool-size truncation
- If truncation happens, log a development warning once per truncation transition

**Interface**
Exports:

- `resolveNodeOverlayEntries(runtime, cameraState, viewportWidth, viewportHeight, poolSize): ResolvedNodeOverlayModel[]`

**Contract**
Pure function except for overflow warning emission.
No React. No mutation of runtime.

---

### `src/ui/runtime/world/node-overlays/useNodeOverlayModels.ts`

**Responsibility**
Drive live overlay updates from runtime state into React state.

**Logic**

- Read `runtime` and `getCameraState` from `WorldInteractionContext`
- Accept a viewport-root ref so the hook can read current width and height
- If runtime is null or toggle disabled, return an empty model list and do not schedule updates
- Otherwise, use `requestAnimationFrame` to recompute overlay entries each frame using `resolveNodeOverlayEntries`
- Compare the next list to the current list with a shallow, field-based comparer and only update React state when something semantically changed

**Interface**
Exports:

- `useNodeOverlayModels(rootRef, enabled): ResolvedNodeOverlayModel[]`

**Contract**
The hook owns polling only. It does not perform rendering.

---

### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.styles.ts`

**Responsibility**
Define all Emotion styled primitives for the overlay viewport and pooled slots.

**Logic**
Style-only file.

**Interface**
Defines styled components for:

- overlay root
- slot wrapper
- compact card shell
- label text
- value text
- compact progress row

**Contract**

- absolute inset viewport root
- pointer-events none
- overflow hidden
- slot wrapper positioned absolutely
- no inline magic values in rendering components

---

### `src/ui/runtime/world/node-overlays/NodeOverlayCard.tsx`

**Responsibility**
Render one pooled overlay slot from a resolved overlay model.

**Logic**

- If no model is assigned to the slot, render the slot hidden
- Otherwise render a compact card with:
    - verbal label
    - numeric/status value
    - progress bar when bar binding exists
- Use `useEntityBarRef` for the live fill binding
- Never attach click handlers or pointer interactions

**Interface**
Props:

- `slotId: string`
- `model: ResolvedNodeOverlayModel | null`

**Contract**
Purely presentational. No business logic.

---

### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

**Responsibility**
Top-level runtime surface that owns the fixed slot pool and renders compact node overlays.

**Logic**

- Read `enabled` via `useNodeOverlaysEnabled`
- Create a viewport root ref
- Call `useNodeOverlayModels(rootRef, enabled)`
- Preallocate a fixed slot array of size 50
- For each slot index, render `NodeOverlayCard` with the corresponding model or null

**Interface**
Exports:

- `NodeOverlayViewport: React.FC`

**Contract**

- No business logic beyond slot-to-model wiring
- The component itself does not read runtime entities directly
- Pool size is fixed at 50

---

## 8. Rendering flow

1. `RuntimeShellCanvas` mounts `NodeOverlayViewport` inside `EntityStateLinkProvider`
2. `NodeOverlayViewport` reads persisted enabled state
3. `useNodeOverlayModels` polls once per animation frame while enabled
4. The hook asks `resolveNodeOverlayEntries` for the current visible models
5. Each model is built from:
    - `resolveSelectionLens`
    - live runtime entity data
    - live runtime physics-body data
    - current camera snapshot
    - current viewport size
6. `NodeOverlayViewport` assigns the first N models to the fixed slot pool
7. Each `NodeOverlayCard` renders semantic text and a live bar bound through `EntityStateLinkProvider`

---

## 9. Tests

All tests must follow the uploaded testing standards: behavior-first, Given/When/Then readable structure, no implementation-detail assertions, and no UI business logic tests.

### 9.1 Change existing tests

#### `src/ui/runtime/world/selection/ability-display/abilityDisplay.utils.test.ts`

Add cases for the new exported duration formatter:

- formats milliseconds under one second
- formats seconds
- formats minutes
- formats hours
- preserves existing `formatCountdownText` behavior

#### `src/ui/runtime/world/selection/job-card/jobAnalysis.test.ts`

Add cases for the exported cycle-binding helper:

- resolves default `state.cycle.max`
- prefers display bar `maxKey`
- respects fixed display `max`
- returns null when no cycle binding exists

### 9.2 Add new pure-function tests

#### `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.test.ts`

Given entity fixtures for each supported type:

- cycle job with valid cycle state
- cycle job in blackout
- active assignment station with absorption progress/duration
- idle assignment station
- storage entity with one visible bar
- unsupported lens entity

Assert:

- overlay kind
- label text
- numeric/status text
- correct bar binding
- null for unsupported cases

#### `src/ui/runtime/world/node-overlays/nodeOverlayPosition.test.ts`

Assert:

- camera-centered world point resolves to viewport center
- zoom affects displacement correctly
- vertical offset includes radius and gap
- null is returned for missing prerequisites

#### `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.test.ts`

Assert:

- only supported entities are returned
- entities without physics bodies are skipped
- deterministic sort by entity id
- truncation respects fixed pool size
- truncation warning fires once per transition

#### `src/ui/runtime/world/node-overlays/nodeOverlayToggle.test.ts`

Assert:

- default enabled state when storage key absent
- persisted true/false round trip
- subscribers are notified on change
- duplicate set does not notify twice

### 9.3 Add new view tests

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.test.tsx`

Given a test world interaction provider and enabled toggle:

- renders pooled slot wrappers
- renders cycle overlay text for a cycle job
- renders storage overlay text for a resource node
- renders nothing active when disabled

#### `src/ui/runtime/shell/RuntimeShellCanvas.nodeOverlays.test.tsx`

Assert:

- full chrome mounts `NodeOverlayViewport`
- minimal chrome does not mount it
- the component still mounts inside `EntityStateLinkProvider`

#### `src/ui/production/main-menu/MainMenuPanel.test.tsx`

Assert:

- the `Node Overlays` toggle is shown
- the checkbox reflects persisted state
- changing the checkbox updates persisted state

---

## 10. Acceptance criteria

Implementation is complete only when all of the following are true:

- node overlays render above supported node types only
- cycle overlays show next-cycle timing or an explicit idle/no-power fallback
- assignment overlays show time-to-completion when active
- storage overlays show current/max from the first visible storage bar
- progress bars stay live through `EntityStateLinkProvider`
- overlay positions track camera pan and zoom correctly
- the feature can be toggled from the main menu
- the toggle state persists across reloads
- full test plan above is green
- no simulation code is mutated by the feature
- no out-of-scope files are changed

---

## 11. Explicit non-decisions

These items are intentionally not part of this phase and must not be introduced during implementation:

- overlay collision resolution
- per-lens customization beyond the three supported kinds
- interactive overlay cards
- tooltip expansion on hover
- new store slices for overlay state
- any refactor of the existing selection-card architecture

