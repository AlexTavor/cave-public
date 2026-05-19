Low-Level Design: Proxy Transit Lifecycle

1. Overview

This document defines a unified Proxy Transit Lifecycle for all bodies entering or moving through the simulation. This replaces the previous ad-hoc implementations of "spawning" and "recall" with a single, consistent mechanism.

1.1 Problem

Currently, bodies are spawned instantly or teleported arbitrarily. This breaks the physical simulation's continuity and visual logic. We require a standardized way for bodies to physically traverse the world to reach their destinations (specifically the Cave/Swarm), regardless of whether they are newly born or returning from a job.

1.2 Solution

We will implement a canonical Proxy Transit State Machine.

Origin: A body (or its proxy representation) originates at a specific location (Gateway or Station).

State: The body enters a locked transit state, represented visually by a Proxy entity.

Transit: The Proxy physically navigates to the target (The Cave).

Integration: Upon arrival, the Proxy is destroyed, and the real Body entity is unlocked and positioned at the destination, joining the Swarm.

2. Architecture & Lifecycle

2.1 The Proxy Contract

A Proxy is an entity tagged with proxy and containing a ProxyComponent. It acts as a physical courier for a logical entity.

interface ProxyComponent {
// The ID of the real entity being transported.
// The real entity exists in the ECS but is locked/hidden.
originalId: string;

    // The destination entity ID (e.g., "sys_world" for the Cave).
    targetId: string;

    // Where the proxy originated (for visual context).
    originId: string;

    // Current lifecycle state.
    state: "outbound" | "anchored" | "inbound";

}

outbound: Traveling FROM sys_world TO a Station (Job assignment).

anchored: Physically locked to a Station (Working).

inbound: Traveling FROM a Station (or Gateway) TO sys_world (Joining/Returning to Swarm).

2.2 Use Case 1: New Body Spawn (Gateway)

Spawn: The Gateway spawns a worker entity via a standard SPAWN command.

Self-Dispatch: The worker blueprint contains an on_spawn behavior rule.

Condition: self.state.just_spawned == 1

Action: DISPATCH self TO sys_world

Action: SET self.state.just_spawned 0

Transit Initiation: The DispatchProxyHandler intercepts the DISPATCH command.

It detects targetId == "sys_world".

It sets proxy.state = "inbound".

It locks the worker (hidden).

It spawns a Proxy at the worker's current location (the Gateway).

Arrival: The Proxy touches the Cave.

The AbsorptionSystem (transit logic) detects arrival.

The Proxy is killed.

The worker is unlocked and teleported to the Cave.

2.3 Use Case 2: Recall Body (Abort Job)

Recall: The user triggers RECALL_PROXY on a worker currently at a Station (anchored).

Transition: The RecallProxyHandler executes.

It updates the existing Proxy's component:

state: "inbound"

targetId: "sys_world"

It releases the physics anchor.

Transit: The Proxy physically navigates from the Station to the Cave.

Arrival: The Proxy touches the Cave.

Standard arrival logic executes (same as New Spawn).

The worker is unlocked and teleported to the Cave.

3. Implementation Details

3.1 src/game/handlers/DispatchProxyHandler.ts

Responsibility:
Handles the DISPATCH_PROXY command. It creates the Proxy entity and locks the original. It must now intelligently handle the "Inbound" (Spawn/Release) scenario.

Logic Update:

Resolve Intent: Check targetId.

If targetId === "sys_world", intent is Inbound (Join Swarm).

Else, intent is Outbound (Job Assignment).

Configure Proxy:

Inbound:

state: "inbound"

originId: sys_world (Conceptual origin for the return trip, or just keep original ID).

targetId: "sys_world"

Outbound:

state: "outbound"

targetId: command.targetId

Spawn Location: Use resolveSpawnPosition (defaults to original entity's location).

Physics: Create body, set Impulse target to targetId.

3.2 src/game/handlers/RecallProxyHandler.ts

Responsibility:
Handles RECALL_PROXY. Transitions an existing anchored proxy to inbound.

Logic:

Validate: Find proxy and its current Station.

Station Cleanup: Remove proxy ID from Station's assignment list.

State Transition:

Set proxy.state = "inbound".

Set proxy.targetId = "sys_world".

Self-correction: Ensure proxy.originId points to the Station (or keep as is) for tracking.

Physics Update:

Remove physics anchor.

Call SET_TARGET with "sys_world".

3.3 src/game/systems/absorption/absorptionTransitHelpers.ts

Responsibility:
Handles frame-by-frame arrival checks for proxies.

Logic (handleInbound):

Target Resolution: Resolve the physics body for proxy.targetId (which is "sys_world").

Distance Check: distance(proxy, cave) <= threshold.

On Arrival:

Teleport: POSITION_ENTITY -> Move Original Body to Proxy's current position.

Unlock: UPDATE_STATE -> Set flag_locked = false, flag_no_metabolism = false.

Cleanup: KILL -> Destroy Proxy entity.

3.4 Data: src/data/raw/game_loop_v2.json (Worker Blueprint)

Definition:
We must define the just_spawned state and the behavior rule to trigger the dispatch.

"worker": {
"state": {
"just_spawned": { "value": 1, "visible": false }
},
"behavior": {
"rules": [
{
"id": "spawn_dispatch",
"conditions": [
{ "t": "ref", "v": "self.state.just_spawned.value" },
{ "t": "op", "v": "=" },
{ "t": "val", "v": 1 }
],
"actions": [
{ "type": "DISPATCH", "entity": "self", "target": "sys_world" },
{ "type": "MUTATE", "target": "self.state.just_spawned", "op": "SET", "value": 0 }
]
}
]
}
}

4. Data Contract

4.1 ProxyComponent State Table

State

Meaning

Target

Origin

Next State

outbound

Going to Job

Station ID

Body ID

anchored

anchored

Working

Station ID

Body ID

inbound (on Recall)

inbound

Returning/Joining

sys_world

Variable

Destroyed (Reintegrated)

4.2 Runtime Commands

DISPATCH_PROXY: Accepts targetId="sys_world" to trigger Inbound mode.

RECALL_PROXY: Implicitly sets target to sys_world.

5. Testing Strategy

5.1 Integration Test: DispatchProxyHandler.spawn.test.ts

Goal: Verify a new worker dispatching itself creates an Inbound proxy.

Given: A worker entity with just_spawned=1.

When: DISPATCH_PROXY is called with target sys_world.

Then:

Worker is locked.

Proxy is created.

Proxy state is inbound.

Proxy target is sys_world.

5.2 Integration Test: RecallProxyHandler.cave.test.ts

Goal: Verify recalling a proxy sends it to the Cave.

Given: An anchored proxy at a Station.

When: RECALL_PROXY is executed.

Then:

Proxy unanchors.

Proxy state becomes inbound.

Proxy target becomes sys_world.

5.3 System Test: AbsorptionSystem.arrival.test.ts

Goal: Verify arrival at Cave unlocks the body.

Given: An inbound proxy overlapping sys_world.

When: System ticks.

Then:

Proxy is killed.

Original body is unlocked (flag_locked=false).

Original body position is updated.
