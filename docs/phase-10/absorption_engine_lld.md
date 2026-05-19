LLD: Absorption Engine Implementation

Status: Proposed
Layer: Engine (Data, Logic, Systems)
Context: Canonical Context Pack v1
Dependencies: None (Base Layer)

1. Executive Summary

The "Why"

To implement the "Harvest" phase of the Roguelite loop, where players permanently convert active population (Bodies) into meta-progression currency (Cave XP). This requires a robust backend system to manage the lifecycle of bodies being dispatched, transiting, and finally absorbed.

The "What"

We are introducing a Body Proxy architecture. Instead of physically moving the original Body entities (which are tied to Face slots and other systems), we lock them in place and spawn a lightweight visual "Proxy" that handles the physics journey. An AbsorptionSystem orchestrates the state machine of these proxies from transit to digestion.

The "How"

Schema Extensions: Define new command types and component schemas for Proxies and Assignments.

Command Handlers: Implement handlers for DISPATCH_PROXY (start), RECALL_PROXY (abort), and ABSORB_BATCH (finish).

New System: AbsorptionSystem to drive the physics and timer logic.

System Patches: Update existing systems (Cave, Vitality, Face) to respect the new locking flags and XP sources.

2. Data Schema Layer

2.1 src/engine/runtime/types.ts

Responsibility: Define the type Contracts for the new commands.

Changes:

Update RuntimeCommandType enum:

Add DISPATCH_PROXY

Add RECALL_PROXY

Add ABSORB_BATCH

Add SET_TARGET (New utility command for steering)

Define Payload Interfaces:

DispatchProxyCommandPayload: { entityId: string; targetId: string }

RecallProxyCommandPayload: { proxyId: string }

AbsorbBatchCommandPayload: { stationId: string }

SetTargetCommandPayload: { entityId: string; targetId: string | null }

Update RuntimeCommand union type to include these new interfaces.

2.2 src/data/schemas/components.ts

Responsibility: Persistence schema for new component data.

Changes:

Export ProxyComponentSchema (Zod object):

originalId (string)

targetId (string)

originId (string)

state (enum: 'outbound', 'anchored', 'inbound')

Update AssignmentComponentSchema:

Add assignedIds: z.array(z.string()).default([]).

2.3 src/data/schemas/game/cave.ts

Responsibility: Clean up legacy schema.

Changes:

Remove xp, xpRate, and level from CaveComponentSchema.

3. Command Handlers (State Transitions)

3.1 src/game/handlers/SetTargetHandler.ts (New)

Responsibility: Updates the targetId of a physics body to initiate steering.

Logic:

Verify entity exists.

Call context.impulseEngine.setTarget(entityId, targetId).

Log result.

3.2 src/game/handlers/DispatchProxyHandler.ts

Responsibility: Initiate the absorption process.

Logic:

Validate entityId exists and has a BodyComponent.

Lock Original: Emit UPDATE_STATE for entityId (flag_locked=true, flag_no_metabolism=true).

Spawn Proxy:

Note: Do not use SPAWN command (it relies on blueprints). Manually construct the entity and add to context.world.

ID: proxy\_${nanoid()}

Tags: ['proxy']

Components:

Display: Cloned from original.

Proxy: { originalId, targetId, originId: <original_parent_id>, state: 'outbound' }.

Physics: { radius: 10, mass: 0.1, drag: 0.5, ... }.

Register Physics: Add body to impulseEngine with targetId set to the absorption node.

Test: src/game/handlers/DispatchProxyHandler.test.ts

Mock Context.

Execute Handler.

Assert: Original entity state flags are set.

Assert: New Proxy entity exists in World with correct components.

Assert: ImpulseEngine has body with correct targetId.

3.3 src/game/handlers/RecallProxyHandler.ts

Responsibility: Abort the process and return the body.

Logic:

Validate proxyId and get ProxyComponent.

Detach: Emit UPDATE_ASSIGNMENT on targetId (remove proxyId from list).

Unanchor: Emit UPDATE_ANCHOR on proxyId (set to null/undefined).

Return:

Emit UPDATE_STATE on proxy (state: 'inbound').

Emit SET_TARGET on proxy (target: originId).

Test: src/game/handlers/RecallProxyHandler.test.ts

Mock Proxy and Station.

Execute Handler.

Assert: Station assignment updated.

Assert: Proxy state is inbound.

Assert: SET_TARGET command emitted with origin ID.

3.4 src/game/handlers/AbsorbBatchHandler.ts

Responsibility: Finalize absorption and payout.

Logic:

Read stationId assignment list.

XP Pool = 0.

For each proxy:

Resolve originalId.

Calculate Yield: Level _ 100 + (Body + Mind + Social) _ 10.

Queue KILL for Proxy.

Queue KILL for Original.

XP Pool += Yield.

Emit ADJUST_STATE to sys_world (xp += XP Pool).

Emit UPDATE_STATE to stationId (absorption_progress = 0).

Emit UPDATE_ASSIGNMENT to stationId (clear list).

Test: src/game/handlers/AbsorbBatchHandler.test.ts

Setup mock station with 2 proxies linked to 2 bodies.

Assert correct XP calculation.

Assert entities removed.

4. Systems (Simulation Loop)

4.1 src/game/systems/AbsorptionSystem.ts (New)

Responsibility: Drive the physics transit and digestion timer.

Logic (Tick):

Transit Phase:

Iterate entities with ProxyComponent + PhysicsComponent.

Outbound:

If state === 'outbound':

Dist = distance(proxy, target).

If Dist < ANCHOR_THRESHOLD (e.g. 20):

Emit UPDATE_ANCHOR (Proxy -> Target, distance 40, stiffness 0.2).

Emit UPDATE_STATE (Proxy state = 'anchored').

Emit UPDATE_ASSIGNMENT (Add Proxy to Target).

Emit SET_TARGET (Proxy -> null) to stop steering.

Inbound:

If state === 'inbound':

Dist = distance(proxy, origin).

If Dist < ANCHOR_THRESHOLD:

Emit KILL (Proxy).

Emit UPDATE_STATE (Original: flag_locked=false, flag_no_metabolism=false).

Digestion Phase:

Iterate entities with AssignmentComponent (Stations).

If assignedIds.length > 0:

Increment state.absorption_progress via ADJUST_STATE (scaled by dt).

If state.absorption_progress >= state.absorption_duration:

Emit ABSORB_BATCH.

Test: src/game/systems/AbsorptionSystem.test.ts

Transit: Spawn proxy 100px away -> Tick -> Assert no change. Move proxy 5px away -> Tick -> Assert Anchor/Assignment commands.

Digestion: Anchor proxy -> Tick -> Assert Progress increment.

4.2 System Patches

src/game/systems/CaveSystem.ts

Refactor to read sys_world.state.xp and sys_world.state.level.

src/game/systems/VitalitySystem.ts

In resolveBodies, filter out entities where state.flag_no_metabolism === true.

src/game/systems/FaceSystem.ts

In identifyFaceEntities, filter out entities where state.flag_locked === true.

5. Registry

5.1 src/ui/runtime/terminal/runtimeConstants.ts

Responsibility: Zod schemas.

Changes:

Add DispatchProxySchema (tuple: [entityId, targetId])

Add RecallProxySchema (tuple: [proxyId])

Add AbsorbBatchSchema (tuple: [stationId])

Add SetTargetSchema (tuple: [entityId, targetId?])

5.2 src/ui/runtime/terminal/runtimeRegistry.ts

Responsibility: Register types.

Add new commands to RUNTIME_COMMANDS.
