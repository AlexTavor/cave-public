Integrated Work Plan: Simulation Fidelity, Tooling & Organic Layout

This document outlines the architectural roadmap for stabilizing the logic engine, formalizing visual contracts, enhancing developer tools, and implementing high-performance rendering and organic layout mechanics.

Phase 1: The Ledger System (Logic Stability)

Goal: Prevent logic "spam" caused by transfer latency by tracking incoming resources before they arrive.

1.1 Data Model

Define LedgerComponent (Runtime Definition):

Structure:

interface LedgerComponent {
incoming: Record<string, number>; // Resource Key -> Amount
outgoing: Record<string, number>;
}

Note: This is a runtime-injected component, not a persistent schema change. It represents transient simulation state.

1.2 Runtime Logic

Update TransferHandler:

When a transfer is initiated (entity spawned):

Locate the Target entity.

Increment target.ledger.incoming[resource] by amount.

Update ResolveTransferHandler:

When a transfer completes (entity arrives):

Locate the Target entity.

Decrement target.ledger.incoming[resource] by amount.

Apply the actual resource credit to state.

Update CancelTransferHandler:

Ensure cancelled transfers correctly decrement the ledger to prevent "ghost" incoming resources.

1.3 Logic Adapter

Verify JsonLogic Access:

Ensure self.ledger.incoming.wood is resolvable within the tier2_entity logic evaluation context.

Phase 2: Visual Contract (The Asset Registry)

Goal: Replace implicit "magic string" matching with an explicit contract for visualizing resources.

2.1 Schema Updates

Update AssetCollectionSchema (src/data/schemas/assets.ts):

Add a new registry section: resources.

Schema definition:

resources: Record<string, {
icon: string; // Reference to an icon ID (UI)
label?: string;
color?: string; // Hex code for Phaser particles
radius?: number; // Optional size override
}>

2.2 Integration

Update TransferHandler:

Perform lookup: cartridge.assets.resources[resourceKey].

Validate existence of the resource definition.

Inject the resolved color and radius into the pending transfer entity (for Phaser to consume).

Phase 3: State Editor View (Editor UI)

Goal: A powerful, dedicated interface for managing Entity State, replacing the generic JSON form.

3.1 Component Development (StateEditor)

List View: Rows for Key, Value, Max/Min, Visibility.

CRUD Operations: Add, Edit, Delete state entries.

Validation: Prevent duplicate keys; enforce numeric constraints.

3.2 Integration

Update ComponentList: Swap the generic SchemaForm for state with the new StateEditor.

Phase 4: Status Visualization (Runtime UI)

Goal: Visual feedback for entity state (Health, Energy, Progress).

4.1 Schema Updates

Update DisplayComponentSchema:

Add bars configuration:

bars: Array<{
key: string; // State key (e.g. "hp")
maxKey?: string; // Max value key (e.g. "max_hp")
color?: string;
label?: string;
}>

4.2 Rendering (EntityNode)

Update EntityNode.tsx:

Read bars config.

Render mini-progress bars floating relative to the entity icon.

Phase 5: Hybrid Rendering Architecture (Phaser Integration)

Goal: Move high-frequency particle rendering to WebGL (Phaser) to support massive transfer volumes without DOM thrashing.

5.1 Architecture Split

React Layer (WorldLayer):

Filter OUT entities tagged as transfer.

Continue rendering Buildings, Mobs, and UI elements via DOM.

Handle interactions (Click, Hover, Tooltips).

Phaser Layer (TransferScene):

Filter IN entities tagged as transfer.

Render these purely as graphical primitives (Circles/Sprites).

5.2 Implementation

Scene Setup:

Create TransferScene in Phaser.

Subscribe to Runtime updates (or poll ImpulseEngine directly for positions).

Visuals:

Use Phaser.GameObjects.Arc or Graphics for particles.

Color code based on the resource definition (from Phase 2).

Phase 6: Organic Layout (Elastic Anchors)

Goal: Allow players to organize the simulation layout organically without rigid locking, using physics-based tethering.

6.1 Data Model

Update PhysicsComponentSchema:

Add anchor property (optional).

Type Definition:

type PhysicsAnchor =
| { type: 'coordinate'; x: number; y: number; stiffness?: number }
| { type: 'entity'; entityId: string; stiffness?: number; length?: number };

6.2 Physics Engine (ImpulseEngine)

Anchor Force Field:

Implement a new steering behavior: applyAnchorForce.

Coordinate Anchor: Applies a spring force pulling the body towards {x, y}.

Entity Anchor: Applies a spring force pulling the body towards target.position.

Integration:

applyAnchorForce runs alongside Separation and Mouse Repulsion.

This allows entities to "breathe" (move apart to avoid overlap) while trying to stay near their anchor.

6.3 Player Interaction

Drag & Drop:

When dragging an entity in Runtime, we are moving its Anchor, not just its body.

Drop on Empty Space: Sets anchor: { type: 'coordinate', x, y }.

Drop on Entity: Sets anchor: { type: 'entity', entityId }.

Visual Feedback:

Draw a faint dashed line (SVG or Phaser) connecting the entity to its anchor point/target.

Line opacity/color can indicate tension (distance from anchor).
