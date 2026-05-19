HLD: Absorption System & Body Proxies

Status: Proposed
Feature: Roguelite Cycle - Body Absorption
Scope: UI, Runtime Commands, Entity Lifecycle, Physics Integration

1. Overview

The Absorption System is the primary mechanic for converting active population (Bodies) into permanent progression currency (Cave XP). It represents the "Harvest" phase of the game loop.

To support the requirement of Visual Continuity (Bodies physically leaving their assigned slots to orbit the absorption node) without breaking the logical ownership of the FaceSystem or Swarm aggregates, we introduce the Body Proxy architecture.

Key Goals

Visual Clarity: Bodies must visually detach from their Face/Swarm slot and travel to the target node.

Reversibility: The process must be abortable, returning the body to its original state/slot seamlessly.

Determinism: XP yield is calculated based on the body's stats at the moment of locking.

Tension: The absorption takes time, during which the body is vulnerable (effectively useless) but not yet consumed.

2. The Body Proxy Architecture

We decouple the Logical Body (the stats container) from the Visual Agent (the thing flying on screen) during the absorption sequence.

2.1 The Entities

Entity

Role

State Changes during Absorption

Original Body

The Source of Truth

flag_locked = true

flag_no_metabolism = true

Hidden from World Layer.

Body Proxy

The Visual Agent

New RuntimeEntity.

Inherits display from Original.

Has physics (mass, radius).

Has lifecycle tags (outbound, anchored, inbound).

Absorption Node

The Processor

Uses AssignmentComponent to track occupants (assignedIds).

Runs the digestion timer.

Triggers completion.

3. The Lifecycle State Machine

The entire feature is driven by a state machine managed via Runtime Commands.

Phase 1: Initiation (Selection & Dispatch)

User Action: Selects bodies via UI -> Clicks "Confirm".

Command: DISPATCH_PROXY

Execution Logic:

Lock Original: Sets flag_locked = true on the Source Body.

Result: FaceSystem and Swarm stop rendering the body in its slot (rendering a "ghost" slot instead). VitalitySystem pauses consumption.

Spawn Proxy: Creates a new Entity at the Source Body's current physics coordinates.

Components:

Display: Cloned from Source (Icon, Label).

Physics: High drag, low mass (Transfer Node physics).

Transfer: Special metadata payload { originalId, originId, targetId }.

Behavior: SEEK target.

Phase 2: Transit (Outbound)

System: ImpulseEngine & BehaviorSystem

Logic:

Proxy physically travels to the Absorption Node using standard steering (Seek).

Arrival Trigger: When distance(proxy, target) < threshold:

Proxy state switches to Anchored.

Physics Anchor: An Anchor component is added to the Proxy, connecting it to the Absorption Node.

Registration: The Proxy ID is added to the Absorption Node's assignment.assignedIds list.

Visual Result: Bodies fly out of their slots and "snap" into orbit around the Throne/Butcher node. Separation forces keep them organized in a ring.

Phase 3: Digestion (The Wait)

System: AbsorptionSystem (or generic Behavior)

Logic:

The Absorption Node runs a progress bar (Duration based on Body Level or fixed const).

Constraint: Dormancy cannot trigger while this process is active (System Safety Valve).

Phase 4A: Completion (Success)

Trigger: Progress >= Duration

Command: ABSORB_BATCH

Execution Logic:

Calculate Yield: Sum XP/Attributes of all Original Bodies linked to the anchored Proxies.

Payout: Emit ADJUST_STATE to increment sys_world.state.xp.

Note: CaveSystem observes state.xp to handle level-ups.

Destroy:

Emit KILL for Proxy Entities.

Emit KILL for Original Bodies.

Reset: Clear Station assignment.assignedIds and progress.

Phase 4B: Abort (Reversal)

User Action: Clicks "Abort" on Absorption Node.

Command: RECALL_PROXY (Batch)

Execution Logic:

Deregister: Remove Proxies from Station's assignment.assignedIds.

Unanchor: Remove Anchor component from Proxies.

Return: Set Proxy behavior to SEEK originId (the Face or Swarm node it came from).

Arrival (Reintegration):

When Proxy reaches Origin:

KILL Proxy.

Set Original Body flag_locked = false.

Result: The Body "snaps" back into its slot and resumes normal duty.

4. UI & Presentation

4.1 Body Selector Component

A new React component in the DevTools/Game UI.

Source: Queries useEntityQuery(world, 'body').

Filter: Excludes entities where state.flag_locked === true.

Sort: Tabs for [Level, Body, Mind, Social, Health].

Interaction: Multi-select toggle.

Output: Emits DISPATCH_PROXY command batch.

4.2 Job Card Integration

The JobCard (SelectionLens) needs an upgrade to handle "Locked Entity" slots via AssignmentComponent.

Standard View: Shows Power/Throughput.

Absorption View: (if AbsorptionComponent tags/flags are present):

Shows circular visual of assignedIds (or list).

Shows Progress Bar (Digestion).

Shows Abort Button (Active only if assignedIds.length > 0).

5. Architectural Changes

5.1 Schema Updates

src/data/schemas/components.ts:

Update AssignmentComponentSchema: Add assignedIds: z.array(z.string()).default([]).

Rationale: Generalizes slot ownership tracking for Absorption (and future Workstations).

src/data/schemas/game/cave.ts:

Remove xp and level from CaveComponentSchema.

Rationale: Centralizes progression state in sys_world.state.

5.2 Command Schemas

src/ui/runtime/terminal/runtimeConstants.ts:

DispatchProxySchema: z.object({ entityId: z.string(), targetId: z.string() })

RecallProxySchema: z.object({ proxyId: z.string() })

AbsorbBatchSchema: z.object({ stationId: z.string() })

5.3 System Logic Updates

CaveSystem:

Refactor to read sys_world.state.xp instead of cave.xp.

Calculate level thresholds dynamically based on state.

Emit UPDATE_STATE for level increments.

FaceSystem:

Update selection logic to ignore bodies with flag_locked = true (treat them as "assigned but physically absent").

VitalitySystem:

Skip consumption/damage for bodies with flag_no_metabolism = true.

6. Testing Strategy

Unit Tests

DispatchProxyHandler: Verify Original Body is flagged locked, Proxy is spawned with correct targetId, and original AssignmentComponent is unaffected.

VitalitySystem: Verify locked bodies do not consume food/heat.

CaveSystem: Verify state.xp changes trigger level-up commands correctly.

Integration Tests

Full Cycle: DISPATCH_PROXY -> Wait for Anchor -> ABSORB_BATCH -> Verify sys_world.state.xp increase & Entity Death.

Abort Cycle: DISPATCH_PROXY -> Wait for Anchor -> RECALL_PROXY -> Reintegration -> Verify Entity Survival & Flag Reset.

7. Why This Approach?

Preserves Data Integrity: Moving the actual Body entity physically would require detaching it from the FaceSystem logic or making FaceSystem logic incredibly complex to handle "traveling" faces.

Unified State: Using sys_world.state for XP and AssignmentComponent for locking ensures we don't invent "one-off" storage locations like locked_bodies or cave.xp.

Abort Safety: Because the Original Body is untouched (merely flagged), aborting is as simple as flipping a flag. We don't have to reconstruct the body from the transfer node.
