LLD: Absorption System & Body Proxies

Status: Proposed
Reference: absorption_hld.md
Context: Canonical Context Pack v1

1. Executive Summary

The "Why"

To implement the "Harvest" phase of the Roguelite loop, where players permanently convert active population (Bodies) into meta-progression currency (Cave XP). This requires a visual representation of bodies travelling to a destination without breaking the logical consistency of existing systems (Faces, Swarm).

The "What"

We introduce Body Proxies—visual clones that handle the physical journey and interaction with the Absorption Node, while the original Body remains logically locked but physically hidden. A new AbsorptionSystem orchestrates the lifecycle (Dispatch → Transit → Anchor → Digest → Absorb/Abort).

The "How"

Schema Extensions: Add ProxyComponent and extend AssignmentComponent.

New Commands: DISPATCH_PROXY, RECALL_PROXY, ABSORB_BATCH.

New System: AbsorptionSystem to drive the state machine.

System Updates: Patch Vitality, Face, and Cave systems to respect locking flags and new XP sources.

UI: New BodySelector and AbsorptionView for the Job Card.

2. Data & Schema Architecture

2.1 Component Updates (src/data/schemas/components.ts)

Responsibility: Define storage for Proxy metadata and Slot occupancy.

Changes:

Add ProxyComponentSchema:

export const ProxyComponentSchema = z.object({
originalId: z.string(), // ID of the source BodyEntity
targetId: z.string(), // ID of the Absorption Node
originId: z.string(), // ID of the node it came from (Face/Swarm/Pool)
state: z.enum(["outbound", "anchored", "inbound"]),
});

Update AssignmentComponentSchema:

Add assignedIds: z.array(z.string()).default([]).

Logic: Stores the IDs of Proxies currently anchored to this node.

Refactor CaveComponentSchema (in src/data/schemas/game/cave.ts):

Remove xp, xpRate, level.

Reason: Centralizing progression in sys_world.state.

2.2 Command Schemas (src/ui/runtime/terminal/runtimeConstants.ts)

Responsibility: Validate payloads for new runtime commands.

Additions:

export const dispatchProxySchema = z.tuple([
z.string(), // entityId (Original Body)
z.string() // targetId (Absorption Node)
]);

export const recallProxySchema = z.tuple([
z.string() // proxyId
]);

export const absorbBatchSchema = z.tuple([
z.string() // stationId (Absorption Node)
]);

3. Runtime Logic & Systems

3.1 AbsorptionSystem (src/game/systems/AbsorptionSystem.ts)

Responsibility: The brain of the feature. Monitors Proxies, manages anchoring, ticks digestion progress, and triggers completion.

Logic (Tick Loop):

Transit Management:

Query entities with ProxyComponent + PhysicsComponent.

If state === 'outbound':

Check distance to targetId.

If dist < ANCHOR_THRESHOLD (e.g. 15px):

Emit UPDATE_ANCHOR (Proxy -> Target).

Emit UPDATE_STATE (Proxy state = 'anchored').

Emit UPDATE_ASSIGNMENT (Add Proxy ID to Target's assignedIds).

If state === 'inbound':

Check distance to originId.

If dist < ANCHOR_THRESHOLD:

Emit KILL (Proxy).

Emit UPDATE_STATE (Original Body: flag_locked = false, flag_no_metabolism = false).

Digestion Management:

Query entities with AssignmentComponent (Absorption Nodes).

If assignedIds.length > 0:

Increment state.absorption_progress via ADJUST_STATE (scaled by dt).

If state.absorption_progress >= state.absorption_duration:

Emit ABSORB_BATCH { stationId }.

Interface: Implements System.

3.2 Command Handlers

DispatchProxyHandler (src/game/handlers/DispatchProxyHandler.ts)

Responsibility: Locks original body, spawns proxy.

Logic:

Verify entityId exists and has BodyComponent.

Emit UPDATE_STATE on Original:

flag_locked = true

flag_no_metabolism = true

Emit SPAWN for Proxy:

ID: proxy\_${nanoid()}

Display: Clone of Original.

Physics: Clone position, high drag (0.8), low mass (0.1).

ProxyComponent: { originalId, targetId, originId, state: 'outbound' }.

Behavior: SEEK ${targetId}.

RecallProxyHandler (src/game/handlers/RecallProxyHandler.ts)

Responsibility: Reverses the process.

Logic:

Verify proxyId exists.

Get ProxyComponent data.

Emit UPDATE_ASSIGNMENT on Target: Remove proxyId from assignedIds.

Emit UPDATE_ANCHOR on Proxy: Remove anchor.

Emit UPDATE_STATE on Proxy: state = 'inbound'.

Emit PATCH_BLUEPRINT (or Behavior update) on Proxy: Change SEEK target to originId.

AbsorbBatchHandler (src/game/handlers/AbsorbBatchHandler.ts)

Responsibility: Calculates yield, payouts, and cleanup.

Logic:

Read stationId assignment component.

Accumulate total XP = 0.

For each proxyId in assignedIds:

Resolve originalId.

Read Original Body stats.

Calculate Yield (e.g. Level \* 100 + Body + Mind + Social).

Emit KILL (Proxy).

Emit KILL (Original).

Total XP += Yield.

Emit ADJUST_STATE (sys_world.state.xp, Total XP).

Emit UPDATE_STATE (stationId, absorption_progress, 0).

Emit UPDATE_ASSIGNMENT (stationId, clear list).

3.3 Existing System Patches

CaveSystem (src/game/systems/CaveSystem.ts)

Change: Watch sys_world.state.xp instead of cave.xp.

Logic:

currentXP = sys_world.state.xp.value

threshold = resolveXpThreshold(sys_world.state.level.value)

If currentXP >= threshold:

Emit UPDATE_STATE (Level + 1).

Emit ADJUST_STATE (XP - threshold).

VitalitySystem (src/game/systems/VitalitySystem.ts)

Change: Filter bodies in resolveBodies.

Logic: Exclude entities where state.flag_no_metabolism === true.

FaceSystem (src/game/systems/FaceSystem.ts)

Change: Filter bodies in identifyFaceEntities.

Logic: Exclude entities where state.flag_locked === true. This prevents the FaceSystem from re-assigning them or counting them towards the Swarm during the absorption process.

4. UI Components

4.1 BodySelector (src/ui/runtime/world/selection/absorption/BodySelector.tsx)

Responsibility: List available bodies for sacrifice.

Props:

runtime: Runtime

onSelect: (ids: string[]) => void

onCancel: () => void

Logic:

Use useEntityQuery to get all bodies.

Filter out flag_locked === true.

Render list/grid with stats.

Support multi-selection.

4.2 AbsorptionView (src/ui/runtime/world/selection/job-card/AbsorptionView.tsx)

Responsibility: Render the Absorption Node state within JobCard.

Props:

entity: RuntimeEntity

runtime: Runtime

Logic:

Check if entity has ProxyTarget tag or similar (or just check if it has assignedIds in assignment).

If assignedIds.length > 0:

Render Progress Bar (state.absorption_progress / duration).

Render "Processing X Entities".

Render "Abort" button -> triggers RECALL_PROXY for all assigned IDs.

If empty:

Render "Sacrifice" button -> Opens BodySelector modal.

5. File Structure Summary

src/
data/
schemas/
components.ts <-- Updated (Assignment, Proxy)
game/
cave.ts <-- Updated (Remove XP/Level)
game/
handlers/
AbsorbBatchHandler.ts <-- New
DispatchProxyHandler.ts <-- New
RecallProxyHandler.ts <-- New
systems/
AbsorptionSystem.ts <-- New
CaveSystem.ts <-- Modified
FaceSystem.ts <-- Modified
VitalitySystem.ts <-- Modified
ui/
runtime/
terminal/
runtimeConstants.ts <-- Updated (Command Schemas)
runtimeRegistry.ts <-- Updated (Register Commands)
world/
selection/
absorption/
BodySelector.tsx <-- New
job-card/
AbsorptionView.tsx <-- New
JobCard.tsx <-- Updated (Integrate View)

6. Testing Plan (Contract Compliance)

6.1 Unit Tests

src/game/handlers/DispatchProxyHandler.test.ts: Mock context, assert correct commands emitted (Lock Original, Spawn Proxy with correct components).

src/game/handlers/AbsorbBatchHandler.test.ts: Mock context with proxies linked to originals. Assert XP calculation and Kill commands.

6.2 Integration Tests

src/game/systems/AbsorptionSystem.test.ts:

Transit: Place proxy far away. Tick system. Assert no anchor. Move proxy close. Tick system. Assert UPDATE_ANCHOR emitted.

Digestion: Set up anchored proxy. Tick system. Assert absorption_progress increases.

6.3 Schema Tests

src/data/schemas/components.test.ts: Verify ProxyComponent and updated AssignmentComponent parsing.
