HLD: Living Cards Notification System

Status: Canonical
Target: Implement a high-performance, diegetic "Living Cards" notification system for the bio-factory tamagotchi simulation.
Core Constraints: 1. Zero React re-renders during animations. 2. Complete decoupling from ECS mutation logic (Systems/Handlers). 3. Graceful handling of "ghost" entities (entities destroyed in the current tick).

1. Architectural Overview

The Living Cards system provides spatial, transient feedback (e.g., resource gains, entity deaths) directly on the game board. It achieves this through a strict, one-way data pipeline:

Engine Layer: Caches the previousSnapshot and emits a tuple of (appliedCommands, previousSnapshot) after the Apply Phase.

Translation Layer: A pure observer in the UI intercepts this tuple, filters for relevant commands, and translates them into spatial visual events.

Buffering Layer: Events are pushed into a mutable queue, bypassing React state.

Rendering Layer: A requestAnimationFrame (RAF) loop drains the queue, activates dormant DOM nodes from a pre-allocated pool, and animates them via direct CSS mutations.

2. Engine Integration: The previousSnapshot

To animate a card over a dead entity, the UI needs the entity's coordinates before the KILL or ABSORB_BATCH command wiped it from the RuntimeEntityStore.

We modify src/engine/runtime/RuntimeCore.ts to retain the snapshot from the previous tick.

Execution Flow in RuntimeCore.tick():

Apply Phase: CommandsManager drains and processes the command buffer.

Event Emission: If a listener is attached, emit onCommandsApplied(successfullyAppliedCommands, this.previousSnapshot).

Read Phase: currentSnapshot = this.createSnapshot().

Cache: this.previousSnapshot = currentSnapshot.

System & Collect Phases: Proceed as normal.

Note: This costs zero extra memory or cycles, as the engine naturally generates a Snapshot during every Read Phase.

3. The Visual Translator & Mutable Bridge

We introduce a CardEventBridge (similar in concept to the TelemetryBridge) to handle translation and queueing without triggering React renders.

3.1 The Translator Logic

An observer function attached to the Runtime evaluates the batch of applied commands:

TRANSFER_ASSETS: Queries previousSnapshot.getPhysicsBody(targetId). Pushes a float-and-fade event formatting the payload (e.g., "+10 Wood").

KILL: Queries previousSnapshot.getPhysicsBody(entityId). Pushes a float-and-fade event showing a death indicator.

Coalescing: Before pushing to the bridge, the translator groups similar events. If 5 KILL commands occur within 10 pixels of each other in the same tick, they are folded into a single "5x Absorbed" event to prevent visual clutter.

3.2 The Mutable Queue

Events are pushed into a standalone, mutable array structure:

// Conceptual Shape
interface LivingCardEvent {
message: string; // Text or icon string
type: "float-and-fade" | "dock-and-stay";
startX: number; // From previousSnapshot.physicsBody
startY: number;
}

4. The DOM Pool Manager

To bypass React's reconciliation cycle during animations, we allocate a fixed pool of HTML elements exactly once. This component mounts inside the existing <Portal layer="float"> (defined in src/ui/lib/foundation/portal-manager/types.ts).

Structure (LivingCardPool.tsx):

Render a full-screen absolute container with pointerEvents: "none".

Render $N$ (e.g., 50) div elements, capturing their DOM nodes in a useRef array.

Each div is initialized with will-change: transform, opacity, opacity: 0, and position: absolute.

Interactive cards (like dock-and-stay) will dynamically have pointerEvents: "auto" applied via the RAF loop.

5. The Animation Loop (RAF)

A custom hook (e.g., useLivingCardsLoop) manages the lifecycle of the pool nodes outside of React, mirroring the imperative pattern established in src/ui/runtime/world/WorldRenderLink.tsx.

Loop Execution Steps (Every Frame):

Ingestion (Drain the Bridge): \* Dequeue all pending events from the CardEventBridge.

For each event, find the first dormant node in the local tracking array.

Initialize its state (life = 0, currentX = startX, currentY = startY).

Imperatively update the DOM element's innerHTML or textContent to match the event message.

Simulation:

Iterate over all active nodes, incrementing life by delta time.

If float-and-fade:

Calculate currentY using an ease-out function (moving upwards).

Calculate opacity using an ease-in function (fading out).

If life >= maxLife, mark the node as dormant.

If dock-and-stay:

Lerp currentX/Y towards a fixed screen-space anchor (e.g., the top-right corner).

Once anchored, apply a CSS pulse class. Node remains active until a click event is received.

DOM Write:

Batch update the style properties of all active nodes.

element.style.transform = translate(${currentX}px, ${currentY}px)

element.style.opacity = currentOpacity

Coordinate Note: Because WorldRenderLink already operates on a 1:1 pixel mapping with physics coordinates, the Living Cards loop can apply the physics startX/startY directly to the CSS transform without complex camera matrix math.

6. Development Phasing

Engine Mod: Update RuntimeCore to store previousSnapshot and emit the onCommandsApplied event.

Bridge & Translator: Implement the CardEventBridge and the command-to-event switch statement.

DOM Pool: Create LivingCardPool.tsx and register it in the float portal.

RAF Engine: Implement the animation loop hook to drive the DOM elements.
