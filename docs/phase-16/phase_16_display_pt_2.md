# LLD — DisplaySystem Extensions: Veins Layer, VeinsDisplay Entity, DisplayDefinition Catalog, Distress & Selection Modules
**Project:** Cave  
**Date:** 2026-03-03  
**Status:** Draft (implements the decisions from the latest design discussion)

---

## 0. Goal

Complete the removal of `updateGameScene` by ensuring:

1) **All visuals are produced by the DisplaySystem pipeline** (no legacy sprite sync paths).
2) **Veins are a special effect (not entities)**, rendered by DisplaySystem via:
   - a single ECS **VeinsDisplay** entity that owns `veinsDisplayData`,
   - a simulation-side **VeinsSystem** that computes + writes `veinsDisplayData`,
   - a display-side **VeinsModule** that reads `veinsDisplayData` and renders it.
3) **DisplayDefinitions are predetermined and explicitly registered** at bootstrap (fallback definition remains only as a safety net).
4) **DistressModule** (show distress) and **SelectionModule** (show selection) exist as standard display modules.
5) The switch is **clean**: all now-obsolete code is found and deleted (see §10).

---

## 1. Scope / Non-scope

### In scope
- Add a **Veins** layer to the render stack, with depth **behind Background**.
- Add `VeinsDisplayDataComponent` and a single `VeinsDisplay` ECS entity.
- Add `VeinsSystem` to update `VeinsDisplayDataComponent` during Apply/commit.
- Add `VeinsModule` that **MUST** use **Phaser.GameObjects.Rope** for rendering.
- Make `DisplayInitContext` / `DisplayTickContext` include `entity: RuntimeEntity` (mandatory).
- Add a predetermined list of DisplayDefinitions and a registration hook.
- Add `TransferModule` (transfers render/scale by payload) as a standard display module.
- Add `DistressModule` and `SelectionModule` display modules.

### Out of scope
- General-purpose global effects bus / TTL global effect ownership model.
- Any UI selection interaction module changes (click-to-select is handled elsewhere; not part of this LLD).

---

## 2. Layer stack change: add Veins behind Backgrounds

### 2.1 Update `LayerId` and depths
**File:** `src/engine/phaser/display/layers/LayerIds.ts`

Add a new layer:
- `Veins`

Update depth constants to guarantee ordering:

```ts
export enum LayerId {
  Veins = "Veins",
  Background = "Background",
  Entities = "Entities",
  Overlays = "Overlays",
  EffectsAnchored = "EffectsAnchored",
  EffectsGlobal = "EffectsGlobal",
}

export const LAYER_DEPTHS: Record<LayerId, number> = {
  [LayerId.Veins]: 0,         // MUST be behind Background
  [LayerId.Background]: 5,
  [LayerId.Entities]: 15,
  [LayerId.Overlays]: 25,
  [LayerId.EffectsAnchored]: 35,
  [LayerId.EffectsGlobal]: 45,
};
```

Notes:
- This matches the existing depth scheme and guarantees **Veins < Background**.
- Veins rendering is handled by `VeinsModule` and does **not** use the normal `backgroundAnchor`; it renders directly into `LayerId.Veins`.

---

## 3. Veins architecture (Option 1): ECS-owned display data

### 3.1 New component: `VeinsDisplayDataComponent`

**Purpose:** A render-ready data blob written by `VeinsSystem` and read by `VeinsModule`.  
This is the only “special” part of veins: a special component and a special module.

#### 3.1.1 Required schema
`VeinsDisplayDataComponent` MUST be explicit about **vein type**.

A node can have:
- many veins of the same type from different sources,
- many veins of different types from the same node.

Therefore each edge record MUST include:
- `veinType` (string/enum),
- `sourceKey` (string; identifies the originating source stream),
- and `id` that is stable and unique across the tuple (sourceKey, veinType, endpoints).

```ts
export type VeinType = string; // e.g. "body" | "mind" | "social" | "heat" | ...

export type VeinsDisplayEdge = {
  /** Stable id for pooling/reuse. MUST include veinType + sourceKey to disambiguate. */
  id: string;

  /** Classification of the vein (required). */
  veinType: VeinType;

  /** Identifies the originating source stream (required). */
  sourceKey: string;

  /** Optional endpoint ids for debug/telemetry (render does not need them). */
  aId?: string;
  bId?: string;

  /** Endpoints in world-space. Renderer must not need cross-entity lookups. */
  ax: number; ay: number; ar: number;
  bx: number; by: number; br: number;

  /** Render-ready thickness & intensity (system decides mapping; renderer only applies). */
  widthPx: number;        // final thickness in pixels
  intensity01: number;    // 0..1 alpha/brightness
  growth01: number;       // 0..1 reach-out/interp (optional but supported)

  /** Undulation params (deterministic). */
  ampPx: number;
  freq: number;
  phase0: number;
  seed: number;
};

export type VeinsDisplayDataComponent = {
  version: number;
  configHash: number;     // changes when config affecting render changes
  edges: VeinsDisplayEdge[];
  debug?: {
    enabled: boolean;
    showLabels?: boolean;
  };
};
```

**ID rule (normative):**
- `edge.id` MUST be stable for the same logical vein across ticks.
- Example stable format:  
  `id = "<sourceKey>:<veinType>:<minEndpointId>:<maxEndpointId>"`  
  (or your canonical graph edge id, if one exists)

---

### 3.2 New ECS entity: `VeinsDisplay`

A single ECS entity exists to host the above component.

**Components:**
- `display: { display_key: "veins_display", label: "Veins" }`
- `veinsDisplayData: VeinsDisplayDataComponent`

**Physics:**
- **Absolutely none.** This entity must not have a physics body.

---

### 3.3 `VeinsSystem` responsibilities

`VeinsSystem` is responsible for:
- analyzing power use/providers/consumers + game config,
- producing the set of veins that should be rendered (and their parameters),
- writing `veinsDisplayData` onto the VeinsDisplay entity.

**Mutation phase:**
- Writes occur during Apply/commit (or an immediately-following “derived apply” stage that still mutates ECS before the render snapshot is consumed).

**Renderer contract:**
- `VeinsModule` is dumb: it does not compute network topology, thickness mapping, or classification.
- `VeinsSystem` outputs render-ready `widthPx`, `intensity01`, wave params, and `growth01`.

---

## 4. Veins rendering: `VeinsModule` uses Phaser Rope (no ambiguity)

### 4.1 Hard requirement: Phaser Rope
`VeinsModule` MUST render each active vein edge using **Phaser.GameObjects.Rope**.

Reference (kept as a comment to remove ambiguity):
```ts
// Phaser Rope GameObject (Phaser 3): https://phaser.io/examples/v3.85.0/game-objects/rope
```

### 4.2 Pooling requirements
To avoid churn, pooling MUST include Rope objects.

**File:** `src/engine/phaser/display/pooling/DisplayTypePool.ts`

Extend `DisplayTypePool` to include:

- `ropePool: DisplayObjectPool<Phaser.GameObjects.Rope>`
- `graphicsPool: DisplayObjectPool<Phaser.GameObjects.Graphics>` (used by DistressModule; see §8)

Rope pool reset MUST:
- detach from parent,
- set visible false,
- reset alpha/scale,
- reset points data (or replace with a new points array) to prevent cross-edge contamination.

### 4.3 Module behavior (normative)

**File:** `src/engine/phaser/display/modules/VeinsModule.ts` (new)

- The VeinsDisplay entity MUST have a DisplayDefinition stack: `[VeinsModule]` only.
- VeinsModule MUST render into `layers.get(LayerId.Veins)` directly.

#### Create(ctx)
- Create (or acquire) a container under `LayerId.Veins` (optional but recommended).
- Create a `Map<string, Phaser.GameObjects.Rope>` mapping `edge.id → Rope`.
- Do not depend on physics; do not require TransformModule.

#### Tick(ctx)
- Read `ctx.entity.veinsDisplayData` (exact property name per ECS schema).
- Diff by `edge.id`:
  - new id → acquire Rope from pool, parent into Veins layer container, store
  - removed id → release Rope to pool
- Update each Rope’s points based on:
  - endpoints,
  - timeMs,
  - undulation params,
  - growth01.
- Apply thickness using Rope width/scale rules (implementation detail), and apply intensity to alpha/tint as needed.

#### Destroy(ctx)
- Release all ropes to pool, clear map.
- Destroy/release Veins container if created.

---

## 5. Display context: add `entity: RuntimeEntity` (mandatory; remove ambiguity)

### 5.1 Update context types
**File:** `src/engine/phaser/display/types.ts`

Import:
- `RuntimeEntity` from `src/engine/runtime/types`

Update interfaces:

```ts
export interface DisplayInitContext {
  // ...existing fields...
  entity: RuntimeEntity;           // REQUIRED
}

export interface DisplayTickContext extends DisplayInitContext {
  timeMs: number;
  deltaMs: number;
  pulseValue: number;
}
```

### 5.2 Plumbing in `EntityVisualInstance` + `DisplayInstanceManager`
- `EntityVisualInstance` constructor and `.tick()` must receive the entity and pass it into context.
- `DisplayInstanceManager.tick()` must pass the entity when ensuring/ticking an instance.

---

## 6. Predetermined DisplayDefinitions: catalog + registration

The system must not rely solely on the default placeholder definition. A catalog of expected definitions MUST be registered at bootstrap.

### 6.1 Catalog file
Add a catalog file exporting the authoritative list:

**File:** `src/engine/phaser/display/DisplayDefinitionCatalog.ts` (new)

```ts
import type { DisplayDefinition } from "./moduleTypes";
import { VeinsModule } from "./modules/VeinsModule";
import { TransformModule } from "./modules/TransformModule";
import { BackgroundModule } from "./modules/BackgroundModule";
import { createPlaceholderShapeModule } from "./modules/PlaceholderShapeModule";
import { TransferModule } from "./modules/TransferModule";
import { SelectionModule } from "./modules/SelectionModule";
import { DistressModule } from "./modules/DistressModule";
import type { PlaceholderVariantRegistry } from "./placeholder/PlaceholderVariantRegistry";

export const createDisplayDefinitions = (variants: PlaceholderVariantRegistry): DisplayDefinition[] => ([
  // Veins (special)
  { display_key: "veins_display", moduleStack: [VeinsModule] },

  // Example project entity types (attr_*). Explicit; do not rely on fallback.
  { display_key: "attr_body", moduleStack: [TransformModule, BackgroundModule, createPlaceholderShapeModule(variants), SelectionModule, DistressModule] },
  { display_key: "attr_mind", moduleStack: [TransformModule, BackgroundModule, createPlaceholderShapeModule(variants), SelectionModule, DistressModule] },
  { display_key: "attr_social", moduleStack: [TransformModule, BackgroundModule, createPlaceholderShapeModule(variants), SelectionModule, DistressModule] },

  // Transfers (one per required transfer resource)
  { display_key: "transfer_wood", moduleStack: [TransformModule, TransferModule, SelectionModule] },
  { display_key: "transfer_heat", moduleStack: [TransformModule, TransferModule, SelectionModule] },
  { display_key: "transfer_xp", moduleStack: [TransformModule, TransferModule, SelectionModule] },
  { display_key: "transfer_food", moduleStack: [TransformModule, TransferModule, SelectionModule] },
]);
```

**Normative requirement:**
- The catalog MUST include **all expected display_key values** for the shipped Example project and the required transfer resources.
- For this repository’s Example Minimal data set, the minimum expected keys are:

```txt
veins_display, attr_body, attr_mind, attr_social, transfer_wood, transfer_heat, transfer_xp, transfer_food
```

(If additional keys are introduced in blueprints/assets, the catalog MUST be updated accordingly.)

**Example Minimal blueprint → display_key mapping (for completeness):**

```txt
pool_body   -> attr_body
pool_mind   -> attr_mind
pool_social -> attr_social
face_body   -> attr_body
face_mind   -> attr_mind
face_social -> attr_social
```


### 6.2 Registration hook
**File:** `src/engine/phaser/scenes/GameSceneDisplayInit.ts`

After `displayRegistry` is created, register all catalog definitions:

```ts
for (const def of createDisplayDefinitions(placeholderVariants)) {
  displayRegistry.register(def);
}
```

### 6.3 “No missing definitions” enforcement
- Missing display definitions MUST remain loud (warning or error).
- Add a test/dev assertion that the fallback definition is not used for any of the expected keys during a normal tick.

---

## 7. TransferModule (entity display module)

### 7.1 Purpose
Transfers must render and scale by payload without any special-case GameScene code.

This replaces the legacy `syncTransferEntity(...)` path.

### 7.2 Data dependency
TransferModule reads (from `ctx.entity`):
- `transfer.payload` (or the canonical transfer payload field)
- `render.color` and `render.baseRadius` (already produced by transfer build logic)

### 7.3 Behavior
- Choose texture via `TextureManager.getShapeTexture({ shape: "circle", color: render.color })`.
- Compute target radius from payload and baseRadius (same math as legacy `computeTransferScale`).
- Apply scale independent of physics radius (physics radius remains constant for simulation stability).
- Render into `scratch.root` or `scratch.backgroundAnchor` as desired, but must be consistent across all transfer display definitions.

### 7.4 DisplayDefinitions
For each transfer display_key (e.g. `transfer_wood`, `transfer_heat`, ...), the module stack must include `TransferModule`.

### 7.5 Deletion
Once TransferModule is live, delete:
- `src/engine/phaser/scenes/gameSceneSync.ts` transfer sync logic
- `src/engine/phaser/scenes/gameSceneVisuals.ts` transfer visuals helpers that become unused by DisplaySystem

---

## 8. DistressModule (entity display module)

### 7.1 Purpose
Replace `DistressManager` (global) with a per-entity module that renders distress waves for the entity when it is in distress.

### 7.2 Rendering model
- Distress waves are `Phaser.GameObjects.Graphics` circles with a tween (scale up + fade out).
- Waves must appear above entities: attach to `scratch.overlayAnchor` (Overlays layer) or directly to `LayerId.Overlays`.

### 7.3 State
DistressModule runtime state per entity:
- `lastPulseMs: number`

### 7.4 Data dependency
DistressModule reads:
- `ctx.entity` health/body component (exact property per schema)
- `ctx.spec` for position/radius

### 7.5 Pooling
Use `graphicsPool` from `DisplayTypePool`:
- acquire on pulse
- release on tween complete

### 7.6 Deletion
Once DistressModule is live, delete:
- `src/engine/phaser/visuals/DistressManager.ts`
and remove all call sites (see §10).

---

## 9. SelectionModule (entity display module)

### 8.1 Purpose
Replace `SelectionHalo` + `syncSelectionHalo` legacy path with a per-entity module that shows selection visuals when the entity is selected.

### 8.2 Rendering model
- A ring/halo rendered as either:
  - a pooled `Image` using a TextureManager circle-with-stroke texture, OR
  - a pooled `Graphics` circle.
- Attach to `scratch.overlayAnchor` so it sits in Overlays.

### 8.3 Behavior
- Visible iff `ctx.selectedEntityId === ctx.spec.entityId`.
- Scale based on `ctx.spec.radius` (with a small multiplier/padding).
- Hide when entity not selected or not visible.

### 8.4 Deletion
Once SelectionModule is live, delete:
- `src/engine/phaser/scenes/SelectionHalo.ts`
- selection halo sync helpers/calls (see §10)

---

## 10. Clean switch: code to delete + wiring changes (normative)

This change obviates all of the legacy sprite-sync code and manager-based overlays. The switch MUST be clean:
- no dual rendering paths,
- no leftover pools/maps for backgrounds/transfers,
- no old managers still ticking.

### 9.1 Remove `updateGameScene` pipeline
Delete (or delete content and remove exports), then remove all imports/call sites:

- `src/engine/phaser/scenes/gameSceneUpdate.ts`
- `src/engine/phaser/scenes/gameSceneSync.ts`
- `src/engine/phaser/scenes/gameSceneSync.types.ts`
- `src/engine/phaser/scenes/gameSceneHelpers.ts` (remove helpers that only support the legacy sprite pools, e.g. `hideAll`, `releaseInactive`, `syncSelectionHalo`, `acquireSprite`)

Update `src/engine/phaser/scenes/GameScene.ts`:
- Remove:
  - `bgSprites`, `txSprites`, `bgPool`, `txPool`
  - `veinManager`, `selectionHalo`, `distressManager`
  - the `updateGameScene(...)` call in `update()`
- Keep only:
  - `displaySystem?.displayManager.tick(time, delta)`

### 9.2 Replace VeinManager
Legacy VeinManager is no longer used for rendering.

- Delete or refactor out:
  - `src/engine/phaser/veins/VeinGraphics.ts` (Graphics-based renderer is obsolete)
  - `src/engine/phaser/veins/VeinManager.ts` (replace with VeinsSystem)
  - `src/engine/phaser/veins/VeinManager.test.ts` (update tests to VeinsSystem/VeinsModule)

You may keep/reuse:
- `GraphBuilder`, `PulseEngine`, `heartbeatRules`, geometry helpers  
…but ownership moves under `VeinsSystem` and/or shared services, not GameScene.

### 9.3 Bootstrap wiring changes
Update `createGameDisplaySystem(...)` and its call site:

- Remove the `VeinManager` parameter.
- Instead provide `pulseEngine` from the runtime/service layer (owned by VeinsSystem or equivalent).
- Ensure the VeinsDisplay entity exists in the runtime before the first render tick.

### 9.4 Transfers: move to DisplayComponent keys
The transfer spawn path currently sets `display.display_key = "unknown"`.

That MUST be replaced so transfers are first-class pipeline entities:

- Set `display.display_key = "transfer_" + resourceKey` where `resourceKey` is the first payload key.
- Remove all transfer sprite syncing code.

### 9.5 Test cleanup
Remove or rewrite tests that assume:
- legacy backgroundSprites/transferSprites pools,
- SelectionHalo/DistressManager behaviors,
- Graphics-based vein rendering.

Add/expand tests for:
- VeinsModule Rope reuse by `edge.id`
- SelectionModule visibility rules
- DistressModule pulse timing + pooling
- DisplayRegistry catalog completeness for expected keys (no fallback used)

---

## 11. Implementation checklist (ordered)

1) Add `LayerId.Veins` and depth ordering behind Background.
2) Add `VeinsDisplayDataComponent` schema with `veinType` + `sourceKey`.
3) Ensure `VeinsDisplay` entity is created in runtime bootstrap and has `display_key = "veins_display"`.
4) Implement `VeinsSystem` to write `veinsDisplayData` during Apply/commit.
5) Extend pooling with `ropePool` and `graphicsPool`.
6) Implement `VeinsModule` using Phaser Rope and render into `LayerId.Veins`.
7) Add `entity: RuntimeEntity` to display contexts; plumb through DisplayInstanceManager → EntityVisualInstance → modules.
8) Add DisplayDefinitionCatalog and register it at bootstrap.
9) Implement DistressModule and SelectionModule; add to relevant definitions.
10) Delete legacy code paths (updateGameScene, SelectionHalo, DistressManager, VeinGraphics, etc.) and remove call sites for a clean switch.
