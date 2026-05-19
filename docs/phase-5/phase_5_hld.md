Phase 5 High-Level Design: The Gameplay Loop

1. Executive Summary

Objective: Transform the simulation engine from a generic entity container into a specific RPG ecosystem.
Core Theme: "Flow & Hierarchy." Entities (Bodies) generate Attributes (Body/Mind/Social) which flow into Global Pools, controlled by Player Interaction (Throttles), culminating in a hierarchical "Face" system where top entities represent the colony.

This phase marks the separation of Engine (generic infrastructure) and Game (specific logic). We will introduce the src/game/ directory structure while adhering strictly to the Command-Query separation defined in the Context Pack.

2. Architecture Overview

2.1 The Game Layer (src/game/)

We introduce a clear distinction between the generic engine and the specific game.

Engine: Handles the tick loop, physics, collisions, and generic command processing.

Game: Defines specific Components (Body, Face), Systems (BodySystem, FaceSystem), and UI that interprets the engine's state.

2.2 Data Model Changes

We introduce three key schemas to drive the RPG mechanics:

BodyComponent: Stores RPG stats, identity, and behavior modifiers.

Stats: attributes (Body, Mind, Social), progression (XP, Level).

Identity: passport (Name, Description, Image/Portrait).

Behavior: traits (List of Trait IDs, e.g., "lumberjack", "savant").

FaceComponent: Marks an entity as a container for a "Face" (a slot in the hierarchy).

TraitDefinition: Data-driven buffs/behaviors stored in the Asset Registry.

2.3 The Attribute Flow Pipeline (Topology & Visualization)

The economy is modeled as a directed graph of nodes and connections, visualized directly in the game world via Phaser.

Source Nodes (Population): The population is aggregated into up to 4 physical nodes on screen:

Face Nodes: Individual entities representing the top bodies (up to 3, one per attribute).

Swarm Node: A single node representing all remaining bodies. Its attributes are the sum of its constituents.

Pool Nodes (Aggregation): There are 3 physical entities representing the Attribute Pools (Body Pool, Mind Pool, Social Pool). Source nodes push their stats into these pools.

Sink Nodes (Jobs): Job entities (e.g., Woodcutter) pull resources from the Pool Nodes.

Visual Connections:

Phaser Integration: The engine renders lines connecting Sources → Pools and Pools → Sinks.

Dynamics: Line thickness corresponds to the fraction of contribution/drain relative to total capacity.

3. Implementation Plan

The phase is divided into 4 concrete steps.

Step 1: The Body Foundation

Goal: Entities can gain XP, level up, and have Attributes.

What:

Define BodyComponentSchema (XP, Level, Attributes, Passport, Traits).

Create BodyField for the Editor (UI for editing stats and passport data).

Implement BodySystem (Game Logic).

NEW: Define UPDATE_BODIES_BATCH command type.

How:

Schema: Register body component in src/data/schemas/components.ts including passport (name, description, image) and traits.

Editor: Create src/ui/devtools/editors/fields/body-field to edit attributes and progression curves.

System: Create src/game/systems/BodySystem.ts.

Logic: On tick, iterate entities with body.

Growth: xp += dt. If xp > threshold, emit command to increment level and reroll attributes.

Batching: Instead of emitting one UPDATE_STATE per entity, emit one UPDATE_BODIES_BATCH per tick containing all XP updates.

Command Definition (src/engine/runtime/types.ts):

export interface UpdateBodiesBatchPayload {
updates: Array<{
entityId: string;
xp?: number;
level?: number;
attributes?: { body: number; mind: number; social: number };
}>;
}

Unit Test Coverage (src/game/systems/BodySystem.test.ts):

XP Accumulation: Mock a Snapshot with 2 bodies. Call system.tick(dt=100). Verify commands.enqueue is called with correct batch payload incrementing XP.

Level Up Threshold: Mock an entity with XP near threshold. Tick system. Verify command payload includes level + 1.

Batch Integrity: Verify 100 mock entities result in a single command, not 100 commands.

Step 2: The Face Hierarchy

Goal: The simulation identifies and promotes the "best" entities to personalize the simulation.

What:

Define FaceComponentSchema (Slot definition).

Implement FaceSystem (Game Logic).

Create FaceCard UI (Runtime UI).

How:

Schema: Register face component (e.g., { attribute: "body" }).

System: Create src/game/systems/FaceSystem.ts.

Swarm Aggregation: Identify non-Face bodies and sum their stats. Emit UPDATE_STATE for the sys_swarm entity.

Promotion: If a Face slot is empty, promote the highest stat body.

Tenure Rule: Once a body is elevated as a Face, it remains the Face until it dies or is explicitly removed. Higher-stat candidates do not displace living Faces.

UI: Create src/ui/runtime/faces/FaceCard.tsx showing the active Face's portrait.

Unit Test Coverage (src/game/systems/FaceSystem.test.ts):

Promotion: Create Mock Entity A (Body: 10) and B (Body: 20). Tick system. Verify Entity B is assigned to Face slot.

Tenure: With Entity B (Body: 20) assigned, create Entity C (Body: 99). Tick system. Verify Entity B remains assigned.

Succession: Remove Entity B (simulating death). Tick system. Verify Entity C becomes the new Face.

Aggregation: Verify sys_swarm state equals Sum(All) - Sum(Faces).

Step 3: Traits & Customization

Goal: Entities have unique, data-driven behaviors that act as enhancers and progress gates.

What:

Define TraitDefinitionSchema.

Update Asset Registry to support traits.

Integrate Traits into BodySystem (Stats) and BehaviorSystem (Logic).

How:

Schema: Create src/data/schemas/traits.ts (id, label, modifiers, rules).

Architecture:

Static Modifiers: Handled by BodySystem. When a trait is added, the system recalculates base stats (e.g., "Savant" adds +10 Mind).

Reactive Logic: Traits define standard ECS BehaviorRules (e.g., WHEN self.xp > 1000 DO SPAWN reward). BodySystem injects these rules into the entity's BehaviorComponent. The generic BehaviorSystem then executes them.

Integration: When a trait is added to an entity (detected via diff or event), BodySystem emits PATCH_BLUEPRINT (or similar runtime update) to merge the trait's rules into the entity's behavior list.

Unit Test Coverage:

Modifier Application: Add "Strong" trait (+5 Body). Tick BodySystem. Verify UPDATE_STATE command increases Body attribute.

Rule Injection: Add "Explosive" trait (Contains Rule: WHEN dead DO spawn explosion). Tick system. Verify entity's behavior.rules array contains the new rule.

Step 4: Flow Visualization & Interaction

Goal: Player can visualize the economy and influence it via UI controls.

What:

Implement Phaser rendering for Flow Lines.

Create FlowThrottle UI component.

How:

Phaser: Create src/game/phaser/FlowRenderer.ts.

Draws lines: Faces/Swarm -> Pools -> Jobs.

Thickness = (Contribution / TotalPoolValue) \* MaxThickness.

Throttle UI: Create src/ui/runtime/controls/FlowThrottle.tsx.

Constraint: The UI component must not mutate the entity directly.

Interaction: When slider moves, emit UPDATE_STATE command targeting the Job entity's requestRate field. The Job System (existing or new) respects this rate in the next tick.

Unit Test Coverage:

Throttle Command: Simulate slider change. Verify correct UPDATE_STATE command is emitted to the CommandsManager.

Renderer Logic: (Non-visual) Unit test the math function that calculates line thickness based on pool values to ensure it handles 0-division and clamping correctly.

4. Technical Constraints & Risks

4.1 Command Bandwidth

Risk: BodySystem emitting updates for 100+ entities every tick will flood the command queue.
Mitigation:

Batching: Usage of UPDATE_BODIES_BATCH is mandatory for XP/Level updates.

Throttling: Only emit if values change significantly or on level up.

4.2 Module Separation

Risk: src/game/ importing from src/engine/ is allowed, but src/engine/ must never import from src/game/.
Constraint: The Engine must remain agnostic of "Bodies" or "Faces". It only knows Entities, Components, and Systems. The Game Layer injects its logic via the Runtime initialization.

4.3 UI Determinism

Risk: UI calculating "derived state" differently than the Simulation.
Constraint: UI must only render what is in the ECS State or derived purely from it. It cannot maintain its own simulation logic.

5. Definition of Done

Phase 5 is complete when:

Test Suite Passing: All unit tests for BodySystem (XP/Batching) and FaceSystem (Tenure/Promotion) are green.

Bodies Exist: Entities gain XP over time via batched commands.

Faces Exist: The Hierarchy visualizer correctly promotes entities and respects tenure.

Traits Work: Adding a trait modifies stats AND injects behavior rules.

Visual Flow: Phaser renders dynamic lines connecting the economy nodes.
