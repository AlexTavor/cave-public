Low-Level Design: Hybrid Rendering Architecture (Phaser + React)

Status: Draft
Scope: Rendering Pipeline, Asset Schemas, Phaser Integration
Goal: Offload high-frequency visual elements (resource flows) to WebGL while retaining React for interactive UI.

1. Context & Goals

The current DOM-based rendering for transfer particles incurs significant performance costs. We will adopt a Hybrid Architecture:

React (DOM): Renders static entity content (Icons, Labels) and UI overlays.

Phaser (WebGL): Renders dynamic elements (Transfer Particles) and entity backgrounds (allowing for performant scaling/effects).

This separation ensures the UI remains crisp while the simulation flow remains performant.

2. Architectural Overview

2.1 The Render Stack

Order (bottom to top):

Background Color (CSS)

Phaser Canvas (WebGL)

Layer 1: Entity Backgrounds (Scaled Circles)

Layer 2: Transfers (Particles)

React WorldLayer (DOM) - Entity Icons, Labels, Status Bars

React Overlays (DOM) - Tooltips, Modals

2.2 Data Flow

The Runtime remains the single source of truth.

React: Subscribes to useEntityQuery (ECS state changes) for mounting DOM nodes.

Phaser: Subscribes to ImpulseEngine (Physics loop) to update positions/scales every frame.

3. Schema Changes

3.1 src/data/schemas/assets.ts

Add ResourceVisualSchema:
Defines the visual appearance of a resource particle.

const ResourceVisualSchema = z.object({
color: z.string(), // Hex Color (e.g. "#8B4513")
radius: z.number().default(4), // Base particle radius
effect: z.enum(["solid", "liquid", "glow"]).default("solid") // Shader hint
});

Add EntityStyleSchema:
Defines the background style for buildings.

const EntityStyleSchema = z.object({
shape: z.enum(["circle", "rect", "hex"]).default("circle"),
color: z.string(),
borderColor: z.string().optional()
});

Update AssetCollectionSchema:

{
// ... existing icons
resources: z.record(z.string(), ResourceVisualSchema),
styles: z.record(z.string(), EntityStyleSchema).optional()
}

3.2 src/data/schemas/components.ts

Update DisplayComponentSchema:
Add configuration for "Fullness" scaling.

{
// ... label, icon
radius: z.object({
min: z.number().default(10),
max: z.number().default(20),
valueRef: z.string().optional(), // e.g. "self.state.wood.value"
maxRef: z.string().optional() // e.g. "self.state.maxWood.value"
}).optional(),
style: z.string().optional() // Reference to assets.styles ID
}

4. Phaser Implementation Details

4.1 src/engine/phaser/scenes/TransferScene.ts

Responsibility:

Transfers: Render moving particles.

Entity Backgrounds: Render the backing shape for entities.

Visual Strategy:

Use Phaser.GameObjects.Graphics to generate textures at runtime (based on asset color/radius) and cache them.

Use Phaser.GameObjects.Sprite or Image for the actual rendering (much faster than drawing Graphics every frame).

The Update Loop:

Sync Entities (Backgrounds):

Iterate all non-transfer entities.

Match with a Sprite from the pool.

Update x, y from Physics.

Scale: Calculate radius based on display.radius logic (Linear Interpolation of state). Update sprite scale.

Sync Transfers (Particles):

Iterate all transfer entities.

Match with a Sprite from the pool.

Update x, y from Physics.

Scale: Calculate radius based on Payload (Logarithmic).

4.2 src/engine/runtime/handlers/TransferHandler.ts

Changes:

Lookup cartridge.assets.resources on spawn.

Inject runtime render props (color, baseRadius) into the transfer entity.

5. React Implementation Details

5.1 src/ui/runtime/world/WorldLayer.tsx

Changes:

Filter: useEntityQuery excludes transfer tag.

Render: EntityNode components (for Icons/Text).

5.2 src/ui/runtime/world/EntityNode.tsx

Changes:

Visuals: Render only the foreground content (Icon, Label).

Styling: Ensure the container is transparent so the Phaser background shows through.

Sizing: The DOM element should have a fixed size (or match the min radius) to ensure consistent hit-testing/layout for the icon, even if the background grows.

6. File Manifest

Modified Files

src/data/schemas/assets.ts: Add resources, styles.

src/data/schemas/components.ts: Add radius, style.

src/engine/runtime/handlers/TransferHandler.ts: Inject render props.

src/ui/runtime/world/WorldLayer.tsx: Filter transfers.

src/ui/runtime/world/EntityNode.tsx: Adjust styling for overlay mode.

New Files

src/engine/phaser/scenes/TransferScene.ts: The main render loop.

src/engine/phaser/utils/TextureManager.ts: Helper to generate/cache textures from Graphics.

7. Execution Strategy

Schema: Define data structures.

Runtime: Update TransferHandler.

Phaser (Texture Gen): Implement the texture generation utility.

Phaser (Scene): Implement the entity synchronization loop.

React: Strip background rendering from EntityNode and let Phaser handle it.
