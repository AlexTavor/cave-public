# Implementation Plan: Faces, Bodies, and Selection

**Status:** Planned  
**Focus:** Implementing the "Face" mechanic, the passive XP curve, the Attribute Flow architecture (Body -> Pool -> Job), and the specific UI controls for Throttling and Assignment.  
**Context:** This plan supersedes previous layouts. Phase 5 (Organic Layout) and Phase 6 (Camera) are cancelled. This version emphasizes the separation of Engine (generic) vs Game Implementation (specific).

## Phase 5: Gameplay Loop (The Cut) - Remaining Tasks

This phase focuses on turning the generic "entity" simulation into a hierarchical RPG system driven by attribute flow.

### Step 1: The Body Component (Game Data)

**Goal:** Define the data structure for RPG statistics.

#### 1.1 Schema Definition

**Action:** Create `src/data/schemas/body.ts`.

**Schema:** Define `BodyComponentSchema` containing:

```typescript
{
  attributes: { body: number, mind: number, social: number }, // 3 Attributes
  progression: { xp: number, level: number, threshold: number, exponent: number },
  identity: { name: string, portrait: string, description: string },
  traits: string[] // List of trait IDs
}
```

**Action:** Update `src/data/schemas/components.ts`.

Register `BodyComponentSchema`.

### Step 2: The Body System (Game Logic)

**Goal:** Implement the logic for growth and attribute aggregation.

#### 2.1 Body Logic

**Action:** Create `src/game/systems/BodySystem.ts`.

**Context:** This system lives in the Game Implementation layer (`src/game/`), consuming the generic Engine.

**Responsibilities:**

- **Passive XP:** Iterate entities with BodyComponent. Increment xp based on time/delta.
- **Level Up:** Check xp >= threshold (using exponent). Increment level, roll attributes.
- **Trait Application:** Traits are applied once upon acquisition (or system start) by executing their attached behavior logic (e.g., MUTATE actions), rather than re-calculating every frame.
- **Attribute Pooling:** Calculate the sum of all active bodies' attributes and write them to the Global State (e.g., `sys_world.state.pool_body`). This feeds the pools.

### Step 3: The Face System (Game Logic)

**Goal:** Implement the "Elite" hierarchy mechanics.

#### 3.1 Face Logic

**Action:** Create `src/game/systems/FaceSystem.ts`.

**Context:** Game Implementation layer.

**Logic:**

- **State:** Track FaceAssignment (Attribute -> EntityID) for 3 slots: Body, Mind, Social.
- **Promotion:** Periodically select the highest stat body for empty/dead slots. Respect inertia.
- **Heir Calculation:** Cache the "Next Best" body for UI display.

#### 3.2 Face Component

**Action:** Update `src/data/schemas/components.ts`.

Add `FaceComponent` to define slot types (e.g., `{ attribute: "body" }`). Slots are positioned via the Physics Editor.

### Step 4: Entity Inspection (Game UI)

**Goal:** Visualizing the data.

#### 4.1 Unit Inspector

**Action:** Create `src/ui/runtime/inspector/UnitInspector.tsx`.

**Design:** Reads from BodyComponent. Shows Portrait, Name, Description, XP Bar, Attribute Icons/Numbers, and Trait List.

#### 4.2 Face Card

**Action:** Create `src/ui/runtime/faces/FaceCard.tsx`.

**Display:** Active Face portrait.

**Heir:** Small icon indicating the next in line. Hovering shows UnitInspector tooltip.

### Step 5: Editor Support

**Goal:** Streamline content creation.

#### 5.1 Body Editor

**Action:** Create `src/ui/devtools/editors/fields/body-field/BodyField.tsx`.

**Features:** UI for editing Attributes, Progression params, and Traits.

#### 5.2 Helper Actions

**Action:** Update BlueprintEditor.

Add "Initialize Body" button to pre-fill Body/Physics/Display components.

### Step 6: Interaction UIs

**Goal:** Distinct controls for Flow (Jobs) and Assignment (Quests).

#### 6.1 Flow Throttle (Resource Nodes)

**Action:** Create `src/ui/runtime/controls/FlowThrottle.tsx`.

**Usage:** Attached to Job Nodes (e.g., Fire Pit).

**Function:** A slider setting the Request Factor (Intensity).

**Logic:** The Job Node reads this factor to determine how much it draws from the Attribute Pool (Global State).

#### 6.2 Population Selection (Assignment)

**Action:** Create `src/ui/runtime/selection/PopulationTrack.tsx`.

**Usage:** For discrete actions like Absorption or Quest Assignment.

**Visuals:** Notched track representing specific bodies.

**Function:** Selects a specific set of bodies to be locked/consumed.

### Step 7: Trait System

**Goal:** Data-driven trait definitions representing lifetime experiences with associated behavior logic.

#### 7.1 Schema

**Action:** Create `src/data/schemas/traits.ts`.

**Schema:** `TraitDefinitionSchema` containing:

```typescript
{
  id: string, // e.g., "lumberjack"
  label: string, // e.g., "Lumberjack"
  description: string, // Flavor text describing the experience
  icon: string, // optional
  behavior: BehaviorComponentSchema // List of Rules
}
```

**Logic:** This contains the executable logic for the trait.

- **Trigger:** Rules typically use a "truthy" condition (e.g., `WHEN true`) to apply effects immediately upon creation/acquisition, or event-based conditions for reactive traits.
- **Actions:** Standard behavior actions like `MUTATE` (e.g., `DO self.body.attributes.social ADD 5`) or `SET_GLOBAL` (e.g., `DO global.state.xpMultiplier ADD 0.1`).

**Action:** Update `src/data/schemas/assets.ts` to include a traits registry in `AssetCollectionSchema`.

#### 7.2 Integration

**Action:** Update BodySystem to apply trait behaviors.

**Logic:** When a trait is added to a body (or when an entity with traits spawns), the BodySystem retrieves the trait definition from the registry. It then injects the trait's behavior rules into the entity's runtime behavior execution list (or executes them immediately if they are one-shot setup rules).

**Action:** Implement ABSORB action handler.

**Logic:** When a body is absorbed, look up its traits. If a trait has a `caveEffect` (or specific behavior tagged for absorption), execute it against the Cave entity (`sys_world`).

### Step 8: Flow Visualization (Veins)

**Goal:** Visual feedback for the "Body -> Pool -> Job" flow.

#### 8.1 Flow Data Calculation

**Action:** Update `src/game/systems/ResourceSystem.ts` (or similar helper).

Calculate flow rates for visualization only (not game logic).

#### 8.2 Flow Overlay

**Action:** Create `src/ui/runtime/overlays/FlowOverlay.tsx`.

**Visuals:**

- **Contribution:** Thin lines from Bodies -> Attribute Pools.
- **Consumption:** Thick lines from Attribute Pools -> Job Nodes.
- **Dynamics:** Line width/opacity pulses based on current Flow Throttle settings.
