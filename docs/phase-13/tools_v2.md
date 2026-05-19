Intentions: Cave Engine V2 Tooling (The Compiler Shift)

Status: Accord Reached
Context: Transitioning from "Engine Development" to "Content Tooling".
Core Philosophy: Move from editing "Assembly" (Raw ECS) to editing "Intent" (High-Level Abilities).

1. The Problem: The "Assembly" Trap

The current editor exposes the raw ECS architecture (state, behavior, components) directly to the user. While maximally flexible, this approach has hit a critical friction point:

Cognitive Load: Implementing a simple concept like "Cooking" requires manually wiring up behavior rules, state variables, and display bars.

Brittleness: A typo in a variable name (state.wood vs state.resources.wood) breaks the logic silently.

Maintenance Nightmare: Changing the balance of "Cooking Speed" requires opening every single cooking blueprint and finding the specific math operator in the logic array.

2. The Solution: The "Compiler" Paradigm

We are shifting the editor architecture from Direct Manipulation to a Compiler Pipeline.

2.1. Source of Truth (\_editor)

Blueprints will carry a new, namespaced field: \_editor. This field contains the High-Level Configuration of the entity, defined in terms of "Abilities" rather than ECS primitives.

// Example Source (What we edit)
"\_editor": {
"abilities": {
"cycle": {
"maxProgress": { "base": 1000, "perBody": 0 },
"inputs": {
"body": { "base": 10, "perBody": 5 }, // 10 Base + 5 per Worker / sec
"mind": { "base": 0, "perBody": 0 }
}
}
}
}

2.2. Compilation Process

The editor will include a Compiler Service. When the user modifies the \_editor configuration, the compiler regenerates the derived ECS fields (state, behavior, display, powerSink).

Read-Only Output: The behavior.rules array is now treated as a build artifact. We do not edit it manually; we recompile it.

Deterministic Generation: The compiler ensures that "Cooking" always looks the same structurally, guaranteeing consistency across the game.

3. Core Architectural Accords

3.1. State Namespaces & Governance

To prevent collisions between abilities, the compiler enforces deeply nested state paths.

Standard: state.[ability_namespace].[variable]

Example: state.cycle.progress, state.inventory.wood.

3.2. Lifecycle & Transitions (PATCH_BLUEPRINT)

For transitions (e.g., "Construction"):

Mechanism: When a cycle completes, the logic triggers a PATCH_BLUEPRINT command.

Why: This preserves the Entity ID. Incoming resource packets (Logistics) continue to flow to the target without "bouncing" or vanishing.

3.3. Logistics & Distribution

Targeting: Logistics targets are resolved via Tags, not IDs.

Distribution Mode: The compiler defaults to "Emptiest of Available" (Load Balancing).

3.4. Global Influence & The Buff System

Problem: Upgrades (Bellows) need to boost Producers (Kitchens) without editing every Producer blueprint.

Solution: Runtime Injection via BuffSystem.

Upgrade: Defines target: "tag:producer", effect: "MULT state.speed 1.5".

Runtime: Applies buffs dynamically during the system tick.

3.5. Flags & Status Effects

Mechanism: Statuses are boolean flags (state.flags.is_starving).

Querying: A global MiserySystem scans the ECS for entities with flags set.

4. Proposed Standard Abilities

4.1. Cycle (The Accumulator)

Defines the entity's active operation loop.

Concept: An Energy Accumulator. It fills up as it receives energy from the grid.

Configuration:

maxProgress: The energy target required to complete one cycle. Defined as { base, perBody }.

inputs: Energy demand per second per attribute (body, mind, social). Defined as { base, perBody }.

Behavior (Generated):

Generates passiveEffects to dynamically calculate powerSink.baseDemand and state.cycle.max.

Generates a behavior rule: sys_cycle_accumulate.

Accumulates satisfied energy (Demand _ DrawFraction _ dt) into state.cycle.value every tick.

4.2. Production (The Output)

Generates resources upon Cycle completion.

Configuration:

resource: Resource ID to produce.

amount: Base output amount.

targetTag: Defaults to storage:[resource].

Behavior:

WHEN cycle_complete: Attempt TRANSFER amount TO tag:target.

4.3. Storage (The Buffer)

Allows the entity to receive and hold specific resources.

Configuration:

resource: Resource ID.

capacity: Maximum amount.

isDefault: Toggle (adds storage:[resource] tag).

entropy: Decay amount per second.

Visuals: Automatically binds display.radius or display.bars.

4.4. Conversion (The Processor)

Transactional logic for turning inputs into outputs.

Configuration:

inputs: List of { Resource, Amount }.

outputs: List of { Resource, Amount }.

scaling: Scale costs/outputs by assigned_bodies.

Logic Flow:

Check: WHEN cycle.progress >= cycle.max.

Transaction: IF input_storage >= cost THEN (Consume Input, Reset Progress, Add Output).

4.5. Upkeep (The Tax)

Constant passive drain required for the entity to function.

Configuration:

resource: Resource ID.

rate: Amount per second.

failureState: "Disable" or "Damage".

Behavior:

Deducts from internal storage every tick.

If empty, requests TRANSFER from tag:storage:[resource].

4.6. Injection (The Buff)

Provides passive bonuses to other entities.

Configuration: targetTag, operation (ADD/MULT), path, condition.

Runtime: Registers with BuffSystem.

4.7. Assignment (The Garrison)

Enables the entity to accept Workers/Proxies.

Configuration: slots, filter.

Output: Exposes state.assignment.count for other abilities to use for scaling.

4.8. Visibility (The Reveal)

Controls rendering based on game state.

Configuration: target, condition.

Behavior: Toggles display.visible.

5. Migration Strategy

Legacy Support: Existing blueprints work as "Raw Mode".

Conversion: We will manually recreate core blueprints using the new Ability Editor.
