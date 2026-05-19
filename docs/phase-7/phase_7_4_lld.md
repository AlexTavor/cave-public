Low-Level Design: Resource-Level Capacity Enforcement

1. Introduction

1.1 The "Why" (Problem Statement)

Currently, the transfer system calculates "headroom" (available space) based on a node-level capacity property. This leads to a bug where a node can request and receive more of a specific resource than its state definition allows. For example, if wood has a max of 100, but the container has a capacity of 1000, the system currently permits a transfer of 900 wood.

By shifting the source of truth for capacity to the resource's own max property, we ensure that no transfer can ever push a resource value beyond its defined logical limit.

1.2 The "What" (Goal)

Remove the global capacity and {resource}\_capacity lookup logic. Redefine "headroom" as the difference between a specific resource's max value and its current value (including amounts currently in transit via the ledger). Clean up schemas and raw data to reflect this change.

1.3 The "How" (Strategy)

Refactor the capacityUtils.ts module to focus purely on state-level max properties.

Update Zod schemas to remove the capacity fields.

Clean up raw JSON data files to remove legacy capacity entries.

2. Technical Design

2.1 Component: capacityUtils.ts (Logic Update)

Responsibility: Provide accurate calculations of how much of a specific resource an entity can currently accept.

Interface:

calculateHeadroom(target: RuntimeEntity, resourceKey: string): number

clampPayloadToCapacity(target: RuntimeEntity, payload: Record<string, number>): Record<string, number>

Internal Logic (calculateHeadroom):

Access target.state[resourceKey].

Retrieve the max property from this entry.

If max is undefined or not a finite number, return Number.POSITIVE_INFINITY.

Retrieve the value property from this entry (default to 0 if missing).

Retrieve the target.ledger.incoming[resourceKey] value (default to 0 if missing).

Calculate: Headroom = Max - (Value + Incoming).

Return Math.max(0, Headroom).

2.2 Component: Zod Schema Updates (src/data/schemas/components.ts)

Responsibility: Define the structure of entity state.

Changes:

Remove references to capacity in any helper schemas or documentation.

Ensure StateComponentSchema remains a record where entries optionally contain max.

3. Contract & File Definitions

3.1 src/engine/runtime/handlers/capacityUtils.ts

Logic: Remove resolveCapacity entirely. Update calculateHeadroom to identify the specific max value of the state entry matching resourceKey.

3.2 src/engine/runtime/handlers/capacityUtils.test.ts

Test Scenarios:

Capped Resource: wood.value: 20, wood.max: 50 -> headroom: 30.

In-Transit Awareness: wood.value: 20, wood.max: 50, ledger.incoming.wood: 10 -> headroom: 20.

Legacy Cleanup: Remove all tests that set a top-level state.capacity.

3.3 src/data/raw/\*.json (Data Migration)

Responsibility: Ensure existing game data doesn't contain dead properties.

Action: Remove "capacity" keys from state components in basic_loop.json, game_loop_v2.json, etc.

4. Unambiguous Logic Rules

Rule of Specificity: The max defined on state[resourceKey] is the only value used to determine capacity for that resource.

Rule of Persistence: The ledger.incoming count MUST be added to the current value before comparing against max.

Rule of Non-Negativity: Headroom can never be a negative number.

Rule of Inclusion: If a resource key exists in the payload but does not exist in the target's state, headroom defaults to Infinity.

5. Migration Checklist

Logic & Code

[ ] Delete resolveCapacity in src/engine/runtime/handlers/capacityUtils.ts.

[ ] Update calculateHeadroom in src/engine/runtime/handlers/capacityUtils.ts.

[ ] Refactor src/engine/runtime/handlers/capacityUtils.test.ts.

Schemas

[ ] Review src/data/schemas/components.ts and remove any legacy capacity documentation or validation logic.

Data Cleanup

[ ] src/data/raw/basic_loop.json: Remove "capacity": 1000 from storage and water_tank. Ensure wood and water have appropriate max values instead.

[ ] src/data/raw/game_loop_v2.json: Remove "capacity" from storage_wood, storage_food, etc.
