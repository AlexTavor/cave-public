Low-Level Design: Decoupled Transit Architecture

1. Executive Summary

This design refactors the entity movement system to fully decouple the Transit Mechanism (moving a proxy) from the Arrival Logic (what happens at the destination).

Core Philosophy:

Impulse Engine handles physics stepping and arrival detection. It emits generic "Arrived" events.

Runtime Phases translates physical arrival into ECS state updates (proxy_state: 'arrived').

Receiver Systems (FaceSystem, AbsorptionSystem) are responsible for claiming "Arrived" proxies and executing gameplay logic (e.g., re-integrating a worker, or anchoring to a node).

Bodies are Data: Returning bodies are strictly unlocked as data entities. They never manifest as physical nodes.

2. Architecture & File Structure

2.1. Engine Layer: Arrival Detection

File: src/engine/runtime/runtimePhases.ts

Responsibility:
Bridge the Physics Engine (Impulse) with the ECS (Runtime).
When the physics engine reports an arrival, this layer marks the entity as "arrived" in the ECS state, delegating the consequence of that arrival to the gameplay systems.

2.2. Gameplay Layer: Receiver Systems

Domain: Face (Swarm)
Handles bodies returning to the Hive (The Cave).

File

Responsibility

src/game/systems/FaceSystem.ts

Orchestrates face logic. Now includes polling for arriving proxies targeting sys_world.

src/game/systems/face/reintegration.ts

New. Logic to "claim" an arrived proxy: Destroys the proxy node and unlocks the original body data.

Domain: Absorption (Station)
Handles proxies arriving at absorption nodes.

File

Responsibility

src/game/systems/AbsorptionSystem.ts

Orchestrates absorption. Now separates Arrival (Capture) from Digestion.

src/game/systems/absorption/absorptionArrival.ts

New. Logic to "claim" an arrived proxy: Anchors it to the station and updates assignment.

src/game/systems/absorption/absorptionDigestion.ts

Handles the digestion progress and yield (Existing).

src/game/systems/absorption/absorptionTransit\*.ts

Delete. All mixing of transit/steering logic is removed.

3. Logic Specifications

3.1. Engine Arrival Handling (src/engine/runtime/runtimePhases.ts)

Function: handleArrivals
Logic:

Iterate ArrivalEvent[] from Impulse.

Identify entity by ID.

Transfer Check: If entity has transfer component -> Emit RESOLVE_TRANSFER (Existing).

Proxy Check: If entity has proxy component -> Emit UPDATE_STATE setting proxy_state to 'arrived'.

Note: Does NOT kill, anchor, or unlock. It strictly flags the state for downstream systems.

3.2. Face System Reintegration (src/game/systems/face/reintegration.ts)

Function: processReintegration
Context: Called by FaceSystem.tick.

Logic:

Query entities where:

proxy_state === 'arrived'

targetId === 'sys_world' (The Cave)

Reintegrate:

Enqueue KILL for the Proxy Entity.

Enqueue UPDATE_STATE for the Original Body:

flag_locked = false

flag_no_metabolism = false

Invariant: No POSITION_ENTITY or flag_absorbed commands are issued. The body remains pure data.

Physics Cleanup: If the proxy had an anchor, update it to null (via UPDATE_ANCHOR or implicit kill).

3.3. Absorption Arrival (src/game/systems/absorption/absorptionArrival.ts)

Function: processArrivals
Context: Called by AbsorptionSystem.tick.

Logic:

Query entities where:

proxy_state === 'arrived'

targetId matches a valid Absorption Station ID.

Capture:

Anchor Handling: If the proxy was previously anchored (e.g. from another station), remove/reset it first to ensure clean capture.

Enqueue UPDATE_ANCHOR (Hard Anchor to Station).

Enqueue UPDATE_STATE (proxy_state = 'anchored').

Enqueue UPDATE_ASSIGNMENT (Add to Station's assignment list).

State Reset: Enqueue UPDATE_STATE to reset absorption_progress to 0 on the Station (to ensure clean start).

3.4. Guard Logic (src/game/systems/face/anchors.ts)

Function: anchorUnassignedBodies
Logic:

Iterate unassigned bodies.

Guard: Check if snapshot.getPhysicsBody(id) exists.

If missing (Data-Only Body), skip. Do not attempt to anchor entities that have no physical node.

4. Data Flow

Dispatch: DispatchProxyHandler spawns Proxy (Target: Station).

Movement: ImpulseEngine steers Proxy to Station.

Engine Arrival: runtimePhases detects overlap -> Sets proxy_state: arrived.

Station Capture: AbsorptionSystem detects arrived -> Anchors Proxy -> Sets proxy_state: anchored -> Resets absorption_progress.

Processing: AbsorptionSystem digests Proxy.

Abort/Recall: RecallProxyHandler updates Proxy Target -> sys_world, removes anchor (if exists), and reset absorption progress.

Movement: ImpulseEngine steers Proxy to Cave.

Engine Arrival: runtimePhases detects overlap -> Sets proxy_state: arrived.

Swarm Reintegration: FaceSystem detects arrived -> Kills Proxy -> Unlocks Body.

5. Testing Plan

5.1. Integration Tests

File: src/game/systems/face/FaceSystem.reintegration.test.ts (New)

Scenario: Proxy exists with proxy_state: arrived and targetId: sys_world. Body is locked.

Expectation:

Proxy is KILLed.

Body flag_locked is set to false.

No position commands.

File: src/game/systems/absorption/AbsorptionSystem.arrival.test.ts

Scenario: Proxy exists with proxy_state: arrived and targetId: station-1. Station has stale progress.

Expectation:

Proxy receives UPDATE_ANCHOR.

Proxy state becomes anchored.

Station absorption_progress is reset to 0.

File: src/engine/runtime/RuntimePhases.arrival.test.ts

Scenario: Impulse reports arrival for a proxy entity.

Expectation: UPDATE_STATE command is enqueued setting proxy_state to arrived.

5.2. Visual Verification

Recall: Aborting a transfer visually moves the node back to the center, where it vanishes instantly.

Persistence: The WorldLayer should effectively be empty of bodies, containing only Stations and Proxies.
