Low-Level Design: Balancing and Logistics Corrections

This document outlines the exact architectural changes required to resolve the following issues without violating the strict ECS phase and mutation rules:

Wrong Power Drain Rate: Cycles fill 1000x too fast due to incorrect delta-time scaling.

Premature Egg GC: Self-targeted production transfers temporarily zero out storage, triggering the one-off cycle garbage collection.

Cave Logistics: resolveSmartSource lacks awareness of withdrawal permissions and priorities.

Invisible Power Veins: Power veins to the dynamically spawned Egg are not rendering, meaning the visual graph is ignoring generic dynamic entities.

1. Cycle Power Drain Rate

src/engine/compiler/abilities/cycleCompiler.ts

Responsibility: Compiles blueprint cycle configurations into ECS state and JsonLogic behaviors.

Why: The expression multiplies demand by global.dt (milliseconds), causing a massive over-accumulation per tick.

What: Shift the time scaler to use seconds.

How:

Locate the expression builder: const expression = `(${accumulationParts.join(" + ")}) * global.dt`;

Modify the multiplier to global.dt_s.

Contract Check: global.dt_s is already correctly buffered in updateGlobalsBuffer within behaviorSystemUtils.ts.

Testing Plan (cycleCompiler.test.ts)

Happy Path (Integration):

Given: A world with an entity containing a cycle ability with inputs.body.base = 1.

When: BehaviorSystem ticks with dt = 1000 (1 second).

Then: self.state.cycle.value increases by exactly 1.

2. Premature Garbage Collection on One-Off Cycles

src/engine/compiler/abilities/productionCompiler.ts

Responsibility: Translates production ability configurations into ECS behavior rules.

Why: When an entity produces a resource to "self", it triggers a TRANSFER from self to self. The transfer pipeline immediately debits the resource, pushing the storage to 0 while the transfer is "in-flight". This zeroes out the storage on the exact tick the cycle completes, triggering the sys_cycle_gc rule before the transfer lands.

What: Optimize self-targeted production to use an instant MUTATE action instead of a TRANSFER.

How:

In createProductionRule, dynamically determine the action array based on params.target.

If params.target === "self", emit:
{ type: "MUTATE", target: \self.state.${params.resource}.value`, op: "ADD", value: params.amountRef }`

Else, emit the existing TRANSFER action.

Testing Plan (productionCompiler.test.ts)

Happy Path (Unit):

Given: A ProductionAbilityConfig with target: "self".

When: productionCompiler runs on the blueprint.

Then: The resulting behavior.rules contain a MUTATE action with op: "ADD" instead of a TRANSFER action.

3. Prioritized Resource Logistics

src/data/schemas/abilities/storage.ts

Responsibility: Defines the schema for storage abilities in the blueprint editor.

What: Introduce withdrawal permissions and priority scoring.

How:

Add allowWithdraw: z.boolean().default(true) to StorageAbilitySchema.

Add priority: z.number().default(0) to StorageAbilitySchema.

src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.tsx

Responsibility: Renders the form for configuring a Storage Ability in the DevTools Blueprint Editor.

What: Expose the new allowWithdraw and priority settings to the user.

How:

Add a BooleanField component bound to path={${basePath}.allowWithdraw}.

Add a NumberField component bound to path={${basePath}.priority}.

src/data/schemas/components.ts

Responsibility: Defines the runtime ECS component shapes.

What: Expand the StateComponentSchema record values.

How:

Add allowWithdraw: z.boolean().optional() and priority: z.number().optional() to the value object inside z.record().

src/engine/compiler/abilities/storageCompiler.ts

Responsibility: Maps blueprint storage abilities to initial entity states.

What: Pass the new withdrawal and priority fields into the runtime state.

How:

When constructing the default state: components.state[resource] ??= { ... allowWithdraw: config.allowWithdraw, priority: config.priority }.

Below it, explicitly assign:
components.state[resource].allowWithdraw = config.allowWithdraw;
components.state[resource].priority = config.priority;

src/engine/runtime/handlers/transferResources.ts

Responsibility: Validates and executes low-level asset transfers.

What: Introduce a withdrawal guard matching the existing deposit guard.

How:

Export a new function: validateWithdrawPermissions(source: RuntimeEntity, resource: string, isExternal: boolean): boolean.

Logic: If !isExternal, return true. Retrieve allowWithdraw from source.state[resource]. Return true unless explicitly set to false.

src/engine/runtime/systems/behavior/targetSelector.ts

Responsibility: Resolves dynamic tag references into concrete entity IDs for behavior actions.

What: Upgrade resolveSmartSource to enforce withdrawal permissions and respect priority sorting.

How:

Create a helper resolveResourcePriority(entity, resource) returning state[resource]?.priority ?? 0.

In resolveSmartSource, map the candidates into an array of objects containing { entity, available, priority, canWithdraw }.

Filter where canWithdraw === true and available > 0.

Sort the remaining array descending: (a, b) => b.priority - a.priority || b.available - a.available.

Return the ID of the first element, or null.

Testing Plan (targetSelector.test.ts & transferResources.test.ts)

Happy Path (Unit - Selection):

Given: Multiple entities tagged storage:food, one with priority: 10 and another with priority: 0. Both allow withdrawal.

When: resolveSmartSource is executed.

Then: The entity ID with priority: 10 is returned.

Negative Path (Unit - Permissions):

Given: An entity with 100 food but allowWithdraw: false.

When: validateWithdrawPermissions is checked as isExternal: true.

Then: Returns false.

4. Invisible Power Veins (Egg Connection)

src/engine/phaser/veins/graphBuilderUtils.ts

Responsibility: Constructs the node-and-edge graph data structure used to render power veins.

Why: The VeinManager currently fails to draw veins towards the Egg because buildVeinGraph is likely strictly filtering for entities with specific tags (e.g., "face", "pool") or ignoring generic dynamic entities that possess a powerSink.

What: Ensure any entity with an active powerSink drawing power is included as a valid target node in the graph.

How:

Inside buildVeinGraph, remove or expand restrictive tag filters for target selection.

Map over snapshot.query() to find all entities containing a powerSink component.

For each entity, if powerSink.drawFraction has values > 0, extract its physics positioning and register it as a target node (VeinNode) and create corresponding VeinEdges from the active power sources.

Testing Plan (graphBuilderUtils.test.ts)

Happy Path (Integration):

Given: A mock snapshot containing a powerSource (Pool) and a dynamic, tagless entity (Egg) with a powerSink drawing body power.

When: buildVeinGraph generates the visual graph.

Then: The graphBuffer.edges array contains an edge linking the Pool's ID to the Egg's ID.
