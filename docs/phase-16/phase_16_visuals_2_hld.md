HLD: Visual Engine Upgrade (Phaser-First Architecture)

Status: Canonical
Target: Migrate entity rendering from DOM to WebGL (Phaser). Implement "Literal Pile" visualization, procedural asset generation, organic vein networks, and a robust RTS-style camera system. React remains strictly for static HUD/Chrome.

1. Architectural Overview

The application rendering is split into two distinct, loosely coupled domains.

1.1 The Domain Split

Domain

Technology

Responsibility

Content

World Space

Phaser (WebGL)

The Simulation Reality

• Piles (Wood/Food/Swarm)

• Entity Sprites (Icons)

• Organic Veins (Scrolling Textures)

• BarEffects (Health/Progress)

• Selection Halos

Screen Space

React (DOM)

The Control Interface

• Static HUD (Panels, Cards)

• Global Toolbar

• Modals

• Terminal & Telemetry

1.2 The Data Flow

ECS Runtime (miniplex): Updates simulation state (Positions, Inventory counts, Health).

SpriteManager (Phaser): Reads ECS every frame. Delegates rendering to specific VisualStrategy implementations.

CameraSystem (Phaser): Handles Input (Pan/Zoom/Pinch) and updates the Phaser View Matrix.

InputSystem: Raycasts World Space for entity selection vs. background drags.

2. Asset Pipeline

Objective: Ensure all assets defined in the ModuleCartridge are available in VRAM, while supporting runtime generation for organic piles.

2.1 The Asset Registry

Static Assets: Loaded from cartridge.assets.icons via VFS.

Procedural Assets: Generated onto Phaser.Textures.CanvasTexture during Preload (Sticks, Blobs, Faces).

2.2 The PreloaderScene

Init: Pause Runtime to prevent simulation during load.

Visuals: Render a Loading Bar (Fillbar style) in the screen center.

Load Static: Iterate Cartridge -> this.load.image().

Events: Bind load.on('progress') to update the Loading Bar width/color.

Generate Procedural: Run generators -> this.textures.addCanvas().

Transition: Start GameWorldScene once loading completes.

3. The Camera System

Objective: A robust, constrained camera with RTS-style interaction.

3.1 Configuration Schema (assets.settings.camera)

export const CameraConfigSchema = z.object({
zoom: z.object({
min: z.number().default(0.1),
max: z.number().default(4.0),
start: z.number().default(1.0),
scrollFactor: z.number().default(0.1)
}),
pan: z.object({
damping: z.number().default(0.1),
boundsPadding: z.number().default(1000),
dragThreshold: z.number().default(5)
})
});

3.2 Interaction Model

Zoom: Mouse Wheel / Pinch.

Pan: Right-Drag / Middle-Drag / Left-Drag (Background).

Selection: Left-Click (Entity).

4. The Renderer (Sprite Manager)

Objective: Map ECS Entities to complex visual representations using a Strategy Pattern.

4.1 Visual Strategy Interface

interface EntityVisual {
update(entity: RuntimeEntity, dt: number): void;
destroy(): void;
getDisplayObject(): Phaser.GameObjects.GameObject;
}

4.2 Strategy Implementations

A. SingleSpriteVisual (Workers, Stations)

Visual Composition: Container

Hub Background: Solid, dark circle/plate behind the icon.

Icon: Sprite (The Entity).

BarEffect: Ported BarEffect.ts logic (Container + Tweens).

Status: Sprite indicators (Starving, Cold).

B. PileVisual (Storage, Swarm)

Visual Composition: Container or RenderTexture.

Logic:

Stacking: Randomize sprite positions within physics.radius using cluster distribution.

Optimization:

Level 1 (Direct): Manage N Sprites directly.

Level 2 (Cached): Draw sprites to a Phaser.GameObjects.RenderTexture. When count changes, clear and redraw. This creates a single draw call for the entire pile.

4.3 Vein Rendering (The Nervous System)

Visual Style: Organic, wavy connections.

Implementation: Phaser.GameObjects.Rope (or Strip).

Geometry: Generate a Bezier curve between Source and Target bodies.

Texture: A seamless, tiling "Ichor" texture (noise/fluid).

Animation: Scroll the texture UVs every frame to simulate flow/pulse.

Feedback:

Width: Modulated by Throttle (Starvation = Withered).

Color: Purple (Nervous) vs Gold/Red/Blue (Resources).

Pulse: Rhythmic UV speed modification based on Hive heartbeat.

4.4 Display Pipeline (Layers)

Phaser Containers establish explicit Z-Order:

Background Layer: Procedural Noise.

Vein Layer: Rope/Mesh objects.

Shadow Layer: Simple ellipses.

Entity Layer:

Bottom: Piles.

Middle: Hub Backgrounds.

Top: Active Units.

Indicator Layer: BarEffects, Selection Halos.

Effect Layer: Particles.

5. Testing Strategy

Objective: Ensure visual stability and performance without manual regression testing every commit.

5.1 Unit Tests (src/engine/phaser/\*_/_.test.ts)

AssetLoader: Mock Phaser.Loader.LoaderPlugin. Verify it iterates the cartridge and calls image() for every icon.

CameraSystem: Test bounds clamping and zoom logic purely mathematically (without a real browser/canvas).

BarEffect: Test that set value triggers the correct Tween configurations (mocking the Phaser Tween Manager).

5.2 Integration Tests

Sprite Sync: Mock a Runtime with 1 entity. Call SpriteManager.sync(). Assert the Phaser Scene has 1 child. Remove entity. Assert child is destroyed.

Layering: Verify that Piles are added to the Entity Layer and Veins to the Vein Layer.

Automated Starvation:

Setup: Create a test Runtime with sys_world set to 0 Satiety.

Execution: Run VeinManager.update().

Assertion: Inspect the generated Rope object properties. Verify lineWidth is at minimum (Withered state) and pulseFrequency is high (Panic state).

5.3 Manual Verification Plan

The "Swarm" Test: Spawn 500 entities. Zoom out fully. Verify 60 FPS.

The "Resize" Test: Resize the browser window. Verify Camera bounds and UI overlays realign.

6. Migration Plan

Phase 1: Engine Foundation

Asset System: Implement ProceduralAssets.ts and PreloaderScene (with Loading Bar).

Camera: Implement CameraSystem.

Phase 2: Visual Implementation

Effects: Port BarEffect to src/engine/phaser/visuals/BarEffect.ts.

Strategies: Implement SingleSpriteVisual and PileVisual (with RenderTexture support).

Veins: Implement VeinMesh using Phaser.Rope.

Phase 3: The Swap

Switch Scenes: Update LayoutEditor and RuntimeShell.

Cleanup: Remove DOM rendering code.
