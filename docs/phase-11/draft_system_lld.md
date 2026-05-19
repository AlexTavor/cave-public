Low Level Design: Draft Selection

1. Overview

This document details the implementation of the "Draft" mechanic, used for Cave Level Ups and Exploration Node rewards.
The system pauses the simulation, presents a weighted selection of options (Cards) to the user, and applies the effects of the chosen option via the standard BehaviorAction pipeline.

Why?

Player Agency: Allows strategic branching (e.g., choosing between Population growth vs. Efficiency).

Roguelite Elements: Introduces RNG and varied build paths.

Architectural Purity: Reuses the existing BehaviorAction and ActionExecutor logic, treating Draft Rewards exactly like Entity Behaviors.

2. Schema & Data Structures

We introduce new definitions in the Cartridge to define what can be drafted. All data structures are strictly typed and leverage existing schemas where possible.

2.1. Draft Option Blueprint

A static definition of a selectable card. It defines the visual representation and the payload of operations to execute if selected.

File: src/engine/data/DraftOption.ts

Schema:

import { BehaviorAction } from "../schemas/behavior";

export interface DraftOptionBlueprint {
id: string; // Unique identifier for the option
title: string; // Display title
description: string; // Flavor text
rarity: "none" | "common" | "rare" | "legendary"; // Visual styling
icon: string; // Asset key
payload: BehaviorAction[]; // Standard behavior actions to execute on selection
}

Payload Alignment:
Unlike the previous design, this does not use custom operations. It uses the project's standard BehaviorAction types (MUTATE, TRANSFER, SPAWN, etc.).

Examples:

Add Resource: { type: "MUTATE", target: "sys_world.state.wood.value", op: "ADD", value: 10 }

Buff Entity: { type: "ADD_TRAIT", traitId: "strong" }

Spawn Unit: { type: "SPAWN", blueprintId: "hero_unit" }

2.2. Draft Pool Blueprint

A static definition of a weighted loot table used to determine which options appear during a draft.

File: src/engine/data/DraftPool.ts

export interface DraftPoolEntry {
optionId: string; // Reference to DraftOptionBlueprint
weight: number; // Relative probability
}

export interface DraftPoolBlueprint {
id: string;
entries: DraftPoolEntry[];
}

2.3. Draft Component (Runtime State)

A singleton component attached to the sys_world entity to hold the current pending draft state.

File: src/engine/ecs/components/DraftComponent.ts

import { DraftOptionBlueprint } from "../../data/DraftOption";

export interface DraftComponent {
\_tag: "draft";
active: boolean;
poolId: string;
triggerEntityId: string; // ID of the entity that triggered the draft (context for "self")
options: DraftOptionBlueprint[]; // The rolled options waiting for selection
sourceLabel: string; // UI Header (e.g. "Level Up")
}

3. ECS Architecture: Commands

We introduce two new RuntimeCommandType definitions to manage the draft lifecycle.

3.1. TRIGGER_DRAFT

Initiates the draft process. Emitted by systems (e.g., CaveSystem leveling up) or Behaviors.

Type: RuntimeCommandType.TRIGGER_DRAFT

Payload:

poolId: string (Target DraftPool)

triggerEntityId: string (The entity causing the draft; sets the self context for actions)

count: number (Default 3)

label: string (For UI context title)

3.2. RESOLVE_DRAFT

Dispatched by the UI when the user confirms a selection.

Type: RuntimeCommandType.RESOLVE_DRAFT

Payload:

selectedOptionId: string

4. System Logic

4.1. DraftSystem

A new system responsible for managing the lifecycle of a draft and executing rewards.

File: src/engine/systems/DraftSystem.ts

Dependencies:

ActionExecutor: Reused from src/engine/runtime/systems/behavior/ActionExecutor.ts.

Responsibilities:

Listen (TRIGGER_DRAFT):

Resolves poolId against Cartridge data.

Performs weighted RNG to select N distinct DraftOption blueprints.

Hydrates the DraftComponent on sys_world:

active = true

options = [selected blueprints]

triggerEntityId = command.triggerEntityId

Sets Runtime Status to paused (via commands.enqueue(SET_GLOBAL) or direct state manipulation if architectural exception allowed for pause).

Resolve (RESOLVE_DRAFT):

Retrieves the active DraftComponent.

Finds the selected DraftOptionBlueprint.

Resolves the triggerEntity using draft.triggerEntityId.

Execution:

Constructs a BehaviorContext:

snapshot: Current world snapshot.

globals: Current global values.

self: The triggerEntity.

Iterates over option.payload (BehaviorActions).

Calls this.actionExecutor.execute(action, context, commands) for each.

Cleanup:

Sets draft.active = false.

Resumes simulation.

4.2. Integration Points

CaveSystem (Level Up):

When XP threshold reached:

Emit TRIGGER_DRAFT { poolId: "pool_level_up", triggerEntityId: "sys_world" }.

BehaviorSystem (Exploration):

Note: Exploration logic is data-driven. Exploration Nodes are entities with behaviors.

When an exploration task completes (via existing Behavior logic):

The node's behavior rules will emit TRIGGER_DRAFT { poolId: "pool_exploration_reward", triggerEntityId: "self" }.

No new code is required in BehaviorSystem; TRIGGER_DRAFT is just another Op that BehaviorSystem can emit if we register it, or DraftSystem listens for a specific event. Correction: Since TRIGGER_DRAFT is a command, the Behavior System needs to be able to emit it. We will add TRIGGER_DRAFT as a supported action in ActionExecutor to allow data-driven triggers.

5. UI Architecture

5.1. DraftOverlay (Organism)

A full-screen modal that blocks interaction with the world.

File: src/ui/organisms/DraftOverlay/DraftOverlay.tsx

Logic:

Observe: Selects draft component from sys_world.

Render: If !draft.active, return null.

Interaction:

Displays draft.options as cards.

On selection, dispatches RuntimeCommandType.RESOLVE_DRAFT with the option ID.

5.2. DraftCard (Molecule)

Visual representation of a choice.

Props:

title, description, icon, rarity.

onSelect: Callback.

Rendering:

If rarity is "none", do not render any rarity badge or border effect.

Otherwise, render the appropriate visual cue for common/rare/legendary.

6. Testing Strategy

6.1. Unit Tests (DraftSystem)

RNG: Verify TRIGGER_DRAFT produces N unique options from a pool.

Context Propagation: Verify triggerEntityId is correctly stored in the component.

Execution: Mock ActionExecutor. Verify that resolving a draft calls executor.execute with the correct actions and the correct self entity.

6.2. Integration Tests

End-to-End:

Seed sys_world with XP > Threshold.

Tick CaveSystem -> Verify TRIGGER_DRAFT emitted.

Tick DraftSystem -> Verify DraftComponent.active is true.

Emit RESOLVE_DRAFT.

Tick DraftSystem -> Verify state mutations occurred (e.g. resource added).

6.3. UI Tests (DraftOverlay)

Rendering:

Verify overlay appears when draft.active is true.

Verify correct number of cards are rendered.

Verify content of cards matches the option data (title, description).

Rarity:

Verify "rare" cards display rarity indicator.

Verify "none" rarity cards do not display rarity indicator.

Interaction:

Verify clicking
