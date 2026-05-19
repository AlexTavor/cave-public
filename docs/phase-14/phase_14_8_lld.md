LLD: Data-Driven Contention & Vitality Deprecation

Context: We are removing the hardcoded VitalitySystem and MiserySystem to move game logic into data. To handle resource scarcity (starvation) deterministically, we are introducing a Target-Defined Contention Resolver that allows blueprints (like sys_world) to dictate how their resources are distributed (e.g., "Strongest eat first").

1. Architectural Changes

1.1. Deprecation of Legacy Systems

The following hardcoded systems are removed. Logic is moved to Blueprint Data (.bp) and the new Contention Resolver.

VitalitySystem (Seasonality, demand calc)

MiserySystem (Harmonic damage, flag toggling)

src/game/systems/vitality/\* (Utilities)

1.2. The Contention Resolver (Middleware)

We introduce a middleware in collectPhase that intercept TRANSFER commands.

Problem: When 100 entities try to eat from sys_world simultaneously, who wins?

Solution: The Target entity (sys_world) defines the sorting rule via its Blueprint Settings.

Flow:

Interceptor separates TRANSFER commands from other command types.

Interceptor groups TRANSFER commands by a composite key ${targetId}:${resource}.

For each group, it looks up the Target Entity via the Snapshot.

It resolves the Target's sorting configuration for that specific resource from the Module Cartridge.

It sorts the requests based on the Source entity's values (e.g., source.body.xp DESC).

It returns a flattened list: [...NonTransferCommands, ...SortedTransferCommands].

Constraint: All TRANSFER commands are moved to the end of the batch. This is an accepted architectural decision to ensure resource distribution happens after all other state mutations (like spawning) have settled for the tick, preventing race conditions where a transfer might depend on a state change that happened later in the original queue.

2. Schema Updates

2.1. src/data/schemas/blueprintConfig.ts

We add contention settings to the Blueprint definition. This allows any storage entity (Storage Chest, World, Campfire) to define its own distribution rules.

import { z } from "zod";

export const SortDirectionSchema = z.enum(["ASC", "DESC"]);

export const ContentionRuleSchema = z.object({
resource: z.string(),
sortBy: z.string(), // e.g. "body.level", "state.xp.value"
direction: SortDirectionSchema.default("DESC"),
});

export const BlueprintSettingsSchema = z.object({
// ... existing impulse, game_config
contention: z.array(ContentionRuleSchema).default([]),
});

2.2. src/data/schemas/game/config.ts

We remove the vitality block as it is no longer used by the engine.

3. New Logic: Contention Resolver

3.1. src/engine/runtime/contention/ContentionResolver.ts

A stateless utility to sort commands.

Responsibility:

Partition commands.

Group by target and resource.

Resolve sorting values safely (defaulting to 0 on error).

Sort and flatten.

Interface:

import type { RuntimeCommand, Snapshot } from "../types";
import type { ContentionRule } from "../../../../data/schemas/blueprintConfig";

export type RuleResolver = (targetId: string) => ContentionRule[] | undefined;

export const resolveContention = (
commands: RuntimeCommand[],
snapshot: Snapshot,
resolveRules: RuleResolver
): RuntimeCommand[];

Logic Flow:

Partition: Split commands into transfers (type TRANSFER_ASSETS) and others (everything else).

Group: Reduce transfers into a Map<string, TransferAssetsCommand[]>.

Key: ${payload.targetId}:${payload.payload[resourceKey]}.

Note: Since payloads can contain multiple resources, we iterate keys. If a payload has multiple resources, treat it as a distinct entry for the primary resource or split it?

Simplification: For V1 of this resolver, we assume simple single-resource transfers or key off the Target ID primarily.

Refined Grouping: Key off targetId. Inside the sort function, we filter rules by the resource being transferred.

Process Groups (by Target ID): Iterate over each group:

Call resolveRules(targetId) to get ContentionRule[].

If no rules, preserve original FIFO order.

If rules exist:

Identify the "primary" resource in the transfer (first key in payload).

Find a matching rule for that resource.

If no matching rule, preserve order.

If rule matches:

Map commands to SortableItem { cmd, value: number }.

Resolve value using snapshot.getEntity(sourceId) and path resolution. Default to 0 if entity missing or path invalid.

Sort SortableItems by value (ASC/DESC).

Unwrap back to RuntimeCommand[].

Merge: Return [...others, ...sortedTransfers].

4. Runtime Integration

4.1. src/engine/runtime/runtimePhases.ts

Inject the resolver into collectPhase.

import { resolveContention } from "./contention/ContentionResolver";
import { Snapshot } from "./Snapshot";

export const collectPhase = (
context: PhaseContext,
commands: RuntimeCommand[],
): void => {
// 1. Create a Snapshot for value resolution (Read Phase)
// We reuse the impulse engine state, ensuring we read the world as it exists _now_.
const snapshot = new Snapshot(context.getSortedEntities(), context.impulseEngine);

    // 2. Define the Rule Resolver closure
    const resolveRules = (targetId: string) => {
        const entity = snapshot.getEntity(targetId);
        if (!entity?.blueprintId) return undefined;

        // Access blueprint settings from the cartridge in context
        const blueprint = context.commandContext.cartridge.blueprints[entity.blueprintId];
        return blueprint?.settings?.contention;
    };

    // 3. Resolve contention
    const finalCommands = resolveContention(commands, snapshot, resolveRules);

    // 4. Enqueue
    if (finalCommands.length > MAX_COMMANDS_PER_TICK) {
        context.state.status = "fatal";
        throw new Error(
            `Command budget exceeded: ${finalCommands.length} > ${MAX_COMMANDS_PER_TICK}.`,
        );
    }

    for (const command of finalCommands) {
        context.commandsManager.enqueue(command);
    }

};

5. Data Strategy: The Starvation Loop

To replace the hardcoded systems, we use the following data pattern in core.cave and blueprints:

Sys World (The Food Source)

settings.contention: [{ resource: "food", sortBy: "body.xp", direction: "DESC" }]

Result: High XP workers get food first.

Sys Vitality (The Director)

state: { "starvation_damage": 5, "starvation_threshold": 0 }

Result: Central place to tune damage numbers.

Worker (The Actor)

upkeep: resource: "food", failureState: "starving"

behavior:

Condition: self.state.flag_starving.value > 0

Action: MUTATE self.body.health SUB sys_vitality.state.starvation_damage.value

6. Deletion Plan

The following files will be deleted:

src/game/systems/VitalitySystem.ts

src/game/systems/MiserySystem.ts

src/game/systems/vitality/vitalitySeasonality.ts

src/game/systems/vitality/vitalityMisery.ts

src/game/systems/vitality/vitalityMiseryCore.ts

src/game/systems/vitality/vitalityMiseryCommands.ts

src/game/systems/vitality/vitalitySystemRuntime.ts

src/game/systems/vitality/vitalityUtils.ts

7. Testing Strategy

7.1. Unit Test: ContentionResolver

Happy Path

Given: 3 Entities (A: Lvl 1, B: Lvl 10, C: Lvl 5) requesting resource 'mana' from Target T.

Given: Rules for T: sortBy: "body.level", direction: "DESC".

When: resolveContention is called.

Then: Output order is B, C, A.

Negative Cases

Given: A Target T with no contention rules.

When: Multiple entities request resources.

Then: Output order matches input order (FIFO).

Given: Rule specifies sortBy: "invalid.path".

When: Entities request resources.

Then: Path resolves to 0 (default safe value), sort is stable (FIFO or ID-based fallback), no crash.

Given: Entities requesting different resources from T (e.g. 'food' vs 'wood').

Given: Rules exist only for 'food'.

Then: 'wood' requests remain FIFO; 'food' requests are sorted.

Edge Cases

Given: Mixed command types (SPAWN, TRANSFER, KILL).

When: Resolved.

Then: SPAWN and KILL appear first (or partitioned group), TRANSFERs appear last, sorted correctly.

Given: Two entities with identical sort values (e.g., both Level 5).

Then: Sort is stable (original relative order preserved).

7.2. Integration: The Hunger Games

Given:

sys_world with state.food.value = 1.

sys_world configured to sort by body.xp DESC.

Worker A (XP 100).

Worker B (XP 0).

Both workers have upkeep for food and a behavior rule: IF flag_starving > 0 THEN MUTATE health SUB 10.

When: runRuntimeTick executes.

Then:

ContentionResolver reorders A before B.

A's transfer succeeds (World Food: 1 -> 0).

B's transfer fails (World Food: 0).

B's upkeep detects empty local storage, sets flag_starving.

B's behavior runs next tick (or same tick if ordering allows, but typically next frame effect), reducing health.

A's health remains full.
