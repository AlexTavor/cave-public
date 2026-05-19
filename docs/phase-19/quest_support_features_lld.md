# Low-Level Design: parented nodes, forced spawn habiti, assignment filters/minimums, and assignment-completion triggers

### In scope

1. Parent-child relationships for spawned nodes
2. Parent-aware nervous veins
3. Parent-aware power veins
4. Parent master throttle for child power demand
5. Parent sections in runtime lens cards
6. Spawner-authored forced habiti for spawned bodies
7. Assignment minimums
8. Assignment filter support for required habiti and required traits
9. Assignment editor UX for the new filter/minimum data
10. Runtime assignment card UX for filter/minimum progress
11. Assignment-completion trigger support for every currently cycle-triggered authored ability

### Out of scope

1. Runtime entity-store sorting optimization
2. Transfer/proxy pooling
3. Snapshot redesign beyond the already-landed dead-body metadata changes
4. Any new re-parenting command or editor outside spawn-time authoring
5. Any change to upkeep semantics
6. Any change to non-assignment selection flows unless directly required by the features above

## 4. Current-code facts that constrain the design

### 4.1 Assignment currently exists as authored data and runtime component data

Current files:

- `data/schemas/abilities/assignment.ts`
- `data/schemas/assignment.ts`
- `engine/compiler/abilities/assignmentCompiler.ts`

Current compiled assignment data lives on `components.assignment` and already carries `slots`, `locking`, `filter`, and `assignedIds`.

Important current fact: the authored `filter` field is untyped in the ability schema and unused at runtime.

### 4.2 Assignment progression is implemented by the absorption path

Current files:

- `game/systems/AbsorptionSystem.ts`
- `game/systems/absorption/absorptionArrival.ts`
- `game/systems/absorption/absorptionDigestion.ts`
- `game/handlers/AbsorbBatchHandler.ts`

Important current fact: assignment completion already has one concrete runtime moment:

- all assigned proxies are anchored
- digestion progress reaches duration
- `ABSORB_BATCH` is enqueued

That existing moment is the only valid meaning of `assignment_complete` in this design.

### 4.3 Currently cycle-triggered authored abilities are implemented as behavior rules conditioned by `cycleCompleteConditions()`

Current files:

- `engine/compiler/abilities/productionCompilerRule.ts`
- `engine/compiler/abilities/conversionCompilerUtils.ts`
- `engine/compiler/abilities/spawnerCompiler.ts`
- `engine/compiler/abilities/samplerCompiler.ts`
- `engine/compiler/abilities/draftCompiler.ts`
- `engine/compiler/abilities/updaterCompiler.ts`

The currently cycle-triggered authored abilities are exactly:

- production
- conversion
- spawner
- sampler
- draft
- updater

Upkeep is not cycle-triggered in the current code and is not changed by this design.

### 4.4 Spawned body identity/habiti assignment already has a single choke point

Current files:

- `engine/runtime/handlers/SpawnHandler.ts`
- `engine/runtime/handlers/spawnBodyIdentity.ts`
- `game/habiti/assignBodyHabiti.ts`

This is the correct place to add forced habiti support.

### 4.5 Runtime selection for assignment stations currently goes through `AbsorptionCard` and `BodySelector`

Current files:

- `ui/runtime/world/selection/job-card/JobCard.tsx`
- `ui/runtime/world/selection/absorption/AbsorptionCard.tsx`
- `ui/runtime/world/selection/absorption/useAbsorptionData.ts`
- `ui/runtime/world/selection/absorption/useBodySelector.ts`
- `ui/runtime/world/selection/absorption/absorptionUtils.ts`

This is the correct place for runtime assignment filter enforcement and minimum progress display.

### 4.6 Vein topology is constructed in graph-builder files, not in rendering code

Current files:

- `engine/phaser/veins/graphBuilderUtils.ts`
- `engine/phaser/veins/graphBuilderEdges.ts`
- `engine/phaser/veins/graphBuilderNervous.ts`
- `engine/phaser/veins/graphBuilderSinkEdges.ts`
- `engine/phaser/veins/veinGraphSource.ts`

Parent routing must be implemented in these graph builders, not as a display-only post-process.

### 4.7 Power demand is calculated in one place

Current file:

- `game/systems/energy/energyDistributionDemandContext.ts`

Parent master throttle must be applied here so allocation, UI status, and vein projection all use the same effective draw.

## 5. Final design decisions

## 5.1 Parent source of truth

A parent relationship is stored only on the child.

The new runtime component is:

- `parent.parentId: string`

Rules:

- a child has zero or one parent
- a parent has zero or many children
- there is no `childrenIds` field anywhere
- a parent entity is derived by reverse lookup over children
- runtime helpers must tolerate missing parent targets
- runtime helpers must guard against cycles during ancestor traversal and stop traversal if a cycle is detected

Why:

- it avoids duplicated state
- it matches the one-parent-per-child requirement exactly
- it keeps spawn-time authoring simple

## 5.2 Parent master throttle storage

Parent master throttle is stored as hidden runtime state on the parent entity, not on child entities and not inside `powerSink`.

State key:

- `state.parent_master_throttle.value`

Rules:

- default effective value is `1` when the state entry is missing
- this value only throttles descendants, not the parent's own `powerSink`
- descendant effective throttle is the product of:
    - the child's own `powerSink.throttle`
    - every ancestor `parent_master_throttle`

Why:

- it keeps the parent control separate from the parent's own draw semantics
- it reuses existing state mutation mechanisms
- it avoids mutating every child when the parent slider changes

## 5.3 Spawn-time parent authoring

Spawner authoring adds one explicit option:

- `parentOnSpawn: "none" | "self"`

Rules:

- default is `"none"`
- `"self"` means the spawned entity receives `parent.parentId = self.id`
- this applies to both `SPAWN` and `SPAWN_BODY` actions
- runtime commands carry the resolved parent id, never the symbolic token `self`
- if the target blueprint already contains a `parent` component, the spawn payload value overrides it

Why:

- it exactly matches the requested editor behavior
- it uses the existing behavior-action to runtime-command pipeline
- it avoids adding a general re-parenting system

## 5.4 Forced habiti semantics

Forced habiti are seeded into the normal body-habiti assignment process before the random rolls continue.

Rules:

- forced habiti are only supported for spawner entries that create bodies
- forced habiti count toward existing type `maxCount`
- forced habiti participate in exclusion checks through the existing eligibility logic
- forced habiti are sorted and deduplicated exactly the same way as existing habiti assignment output
- invalid forced habitus ids are ignored with explicit telemetry logging
- valid forced ids whose definition is incompatible with already-seeded forced ids are skipped with explicit telemetry logging
- random rolling then continues using the seeded assigned set

Why:

- this matches the requirement that forced habiti behave as if they were normally rolled
- it reuses the existing assignment algorithm instead of creating a second pass

## 5.5 Assignment filter semantics

The assignment filter becomes typed and explicit. It is evaluated only for assignment-body candidacy.

Supported filter kinds:

- `required_habiti_all`
    - payload: `ids: string[]`
    - candidate passes only if it contains every listed habitus id
- `required_traits_all`
    - payload: `ids: string[]`
    - candidate passes only if it contains every listed trait id

Rules:

- empty `ids` arrays are invalid authored data
- each filter row is ANDed with every other filter row
- within a row, every listed id is required
- the runtime body selector and terminal assignment command must both honor the compiled filter
- the compiled filter lives on `components.assignment.filter`

Why:

- this is the smallest shape that exactly matches the requested feature
- it uses existing body data already available on candidate entities

## 5.6 Assignment minimum semantics

Assignment minimums are typed and explicit.

Supported minimum kinds:

- `attribute_total`
    - payload: `attribute: "body" | "mind" | "social"`, `required: number`
- `level_total`
    - payload: `required: number`

Rules:

- all configured minimum rows are ANDed
- progress is computed from the currently assigned original bodies
- assigned proxies are resolved to their original body ids before reading body data
- direct-body assignment ids are also supported
- a missing body contributes `0`
- minimums are informational and evaluative; they do not replace the existing digestion-completion condition

Why:

- this matches the requested display and editor behavior
- it keeps minimums narrow and testable

## 5.7 Assignment-completion trigger semantics

A new authored trigger concept is introduced for all currently cycle-triggered abilities.

Trigger enum:

- `cycle_complete`
- `assignment_complete`

Authored field shape:

- `triggers: TriggerKind[]`

Rules:

- the field is added to production, conversion, spawner, sampler, draft, and updater abilities
- default value is `["cycle_complete"]`
- if both values are present, either trigger may activate the ability
- `assignment_complete` means the tick in which `ABSORB_BATCH` was applied for that station and the station snapshot therefore carries the completion pulse
- `assignment_complete` is implemented using a hidden state pulse, not by inventing a new direct behavior-system event channel

Pulse state key:

- `state.assignment_complete_pulse.value`

Why:

- it reuses the current behavior-rule condition model
- it preserves deterministic phase ordering
- it avoids creating a second runtime ability execution path

## 6. High-level implementation strategy

1. Add typed parent/filter/minimum/trigger schemas first
2. Compile authored data into existing runtime components/state
3. Extend behavior action and spawn payloads for parent and forced habiti
4. Extend spawn handlers and body-habiti assignment
5. Extend absorption runtime to set the assignment-completion pulse
6. Extend all relevant ability compilers to emit trigger conditions from the new `triggers` field
7. Extend energy demand and vein graph logic for parent hierarchy
8. Extend runtime cards and body selector for parent sections and assignment minimum/filter UX
9. Add validation and focused tests

No step bypasses the existing command/apply pipeline.

## 7. File-by-file design

## 7.1 Schema and shared-type changes

### Change: `data/schemas/components.ts`

Responsibility:

- register the new parent component in the shared component schema exports
- export the `ParentComponentSchema` type

Logic:

- add `ParentComponentSchema` import/export
- add `ParentComponent` type export

Interface:

- `ParentComponentSchema`
- `ParentComponent`

### Add: `data/schemas/components/parent.ts`

Responsibility:

- define the canonical runtime schema for child-parent relationships

Logic:

- schema shape is exactly `{ parentId: z.string().min(1) }`
- no child list and no parent-side duplicate data

Interface:

- `ParentComponentSchema`
- `ParentComponent`

### Change: `data/schemas/blueprint.ts`

Responsibility:

- allow blueprints to carry `components.parent`

Logic:

- add `parent: ParentComponentSchema.optional()` to blueprint components

Interface:

- blueprint component surface now includes optional `parent`

### Change: `data/schemas/assignment.ts`

Responsibility:

- define the canonical runtime assignment component shape

Logic:

- replace the loose `filter` shape with a discriminated union array
- add `minimums` as a typed array
- keep `assignedIds` unchanged

Interface:

- `AssignmentComponentSchema` fields become:
    - `slots: number`
    - `locking: boolean`
    - `filter: AssignmentFilterRule[]`
    - `minimums: AssignmentMinimumRule[]`
    - `assignedIds: string[]`

### Add: `data/schemas/assignmentRules.ts`

Responsibility:

- hold the typed assignment filter and minimum rule schemas reused by authored ability schema, runtime component schema, and UI

Logic:

- define `AssignmentFilterRuleSchema`
- define `AssignmentMinimumRuleSchema`
- enforce non-empty id arrays and positive/zero-safe numeric constraints

Interface:

- `AssignmentFilterRuleSchema`
- `AssignmentMinimumRuleSchema`
- `AssignmentFilterRule`
- `AssignmentMinimumRule`

### Change: `data/schemas/abilities/assignment.ts`

Responsibility:

- make assignment authored data explicit and validated

Logic:

- replace `filter: z.array(z.any()).default([])` with `AssignmentFilterRuleSchema.array().default([])`
- add `minimums: AssignmentMinimumRuleSchema.array().default([])`
- preserve existing fields unchanged

Interface:

- authored assignment ability now includes typed `filter` and `minimums`

### Change: `data/schemas/abilities/spawner.ts`

Responsibility:

- add spawn-time parent and forced-habiti authoring

Logic:

- add `parentOnSpawn: z.enum(["none", "self"]).default("none")`
- add `forcedHabiti: z.array(z.string().min(1)).default([])`

Interface:

- every spawner entry may now author parent and forced-habiti behavior

### Add: `data/schemas/abilities/triggers.ts`

Responsibility:

- define the shared authored trigger enum for currently cycle-triggered abilities

Logic:

- define `AbilityTriggerKindSchema`
- define `AbilityTriggersSchema` as non-empty array with default `["cycle_complete"]`

Interface:

- `AbilityTriggerKindSchema`
- `AbilityTriggersSchema`
- `AbilityTriggerKind`

### Change: `data/schemas/abilities/production.ts`

Responsibility:

- add shared trigger authoring to production

Logic:

- add `triggers: AbilityTriggersSchema.default(["cycle_complete"])`

Interface:

- production ability authored surface includes `triggers`

### Change: `data/schemas/abilities/conversion.ts`

Responsibility:

- add shared trigger authoring to conversion

Logic:

- same as production

Interface:

- conversion ability authored surface includes `triggers`

### Change: `data/schemas/abilities/spawner.ts`

Responsibility:

- add shared trigger authoring to spawner in the same file that already gains parent/forced-habiti fields

Logic:

- add `triggers: AbilityTriggersSchema.default(["cycle_complete"])`

Interface:

- spawner ability authored surface includes `triggers`

### Change: `data/schemas/abilities/sampler.ts`

Responsibility:

- add shared trigger authoring to sampler

Logic:

- add `triggers`

Interface:

- sampler ability authored surface includes `triggers`

### Change: `data/schemas/abilities/draft.ts`

Responsibility:

- add shared trigger authoring to draft

Logic:

- add `triggers`

Interface:

- draft ability authored surface includes `triggers`

### Change: `data/schemas/abilities/updater.ts`

Responsibility:

- add shared trigger authoring to updater

Logic:

- add `triggers`

Interface:

- updater ability authored surface includes `triggers`

### Change: `data/schemas/behaviorTypes.ts`

Responsibility:

- extend behavior action types so authored spawn actions can carry parent/forced-habiti data

Logic:

- extend `SpawnAction`
- extend `SpawnBodyAction`

Interface:

- `SpawnAction` gains optional `parentId` and `forcedHabiti`
- `SpawnBodyAction` gains optional `parentId` and `forcedHabiti`

### Change: `data/schemas/behaviorCoreSchemas.ts`

Responsibility:

- validate the new spawn action fields

Logic:

- extend `SpawnActionSchema` and `SpawnBodyActionSchema`

Interface:

- same fields as `behaviorTypes.ts`

### Change: `engine/runtime/types/runtimeCommandPayloadsBase.ts`

Responsibility:

- extend runtime spawn payloads for parent and forced-habiti data

Logic:

- extend `SpawnCommandPayload`

Interface:

- `SpawnCommandPayload` gains:
    - `parentId?: string`
    - `forcedHabiti?: string[]`

## 7.2 Compiler changes

### Add: `engine/compiler/abilities/abilityTriggerConditions.ts`

Responsibility:

- convert authored trigger arrays into behavior rule conditions

Logic:

- expose one helper that returns condition arrays for:
    - cycle only
    - assignment only
    - either cycle or assignment
- cycle branch must reuse existing `cycleCompleteConditions()`
- assignment branch must target `self.state.assignment_complete_pulse.value`
- the combined branch must be an OR between the two trigger families, expressed using the existing behavior rule condition structure used elsewhere in the codebase
- this helper is the only source of truth for authored trigger compilation

Interface:

- `buildAbilityTriggerConditions(triggers: AbilityTriggerKind[]): BehaviorRule["conditions"]`

### Add: `engine/compiler/abilities/assignmentCompletionCompiler.ts`

Responsibility:

- compile the hidden state and reset rule needed by assignment-completion triggering

Logic:

- when an entity has assignment ability, ensure `state.assignment_complete_pulse = { value: 0, visible: false }`
- append a reset rule with a late sort key
- reset rule conditions: pulse is active
- reset rule action: set pulse back to `0`
- this reset rule must exist once per entity, not once per trigger-using ability

Interface:

- `prepareAssignmentCompletionTrigger(draft: Blueprint): void`

### Change: `engine/compiler/abilities/assignmentCompiler.ts`

Responsibility:

- compile assignment filter/minimums and assignment-completion pulse support

Logic:

- copy typed `filter` and `minimums` into `components.assignment`
- ensure `assignedIds: []`
- when assignment ability exists, call `prepareAssignmentCompletionTrigger(draft)`
- keep existing duration/output/progress behavior unchanged

Interface:

- compiled assignment component now includes `filter` and `minimums`
- compiled state now includes `assignment_complete_pulse`

### Change: `engine/compiler/abilities/productionCompilerRule.ts`

Responsibility:

- stop hard-coding cycle-only activation for production

Logic:

- replace direct `cycleCompleteConditions()` usage with `buildAbilityTriggerConditions(config.triggers)`

Interface:

- production rule trigger source becomes authored `triggers`

### Change: `engine/compiler/abilities/productionCompiler.ts`

Responsibility:

- pass authored triggers into production rule creation

Logic:

- thread `config.triggers` through to `createProductionRule`

Interface:

- no external interface change beyond authored `triggers`

### Change: `engine/compiler/abilities/conversionCompilerUtils.ts`

Responsibility:

- stop hard-coding cycle-only activation for conversion

Logic:

- build conversion rule conditions from authored triggers
- keep input gate conditions appended on top of trigger conditions

Interface:

- `createConversionRule` gains a `triggers` input

### Change: `engine/compiler/abilities/conversionCompiler.ts`

Responsibility:

- pass authored triggers into conversion rule creation

Logic:

- thread `config.triggers`
- keep existing cycle-reset and input-gate behavior unchanged

Interface:

- no additional external interface

### Change: `engine/compiler/abilities/spawnerCompiler.ts`

Responsibility:

- compile parent/forced-habiti fields into spawn actions and use authored triggers

Logic:

- `createSpawnerRule` must include `parentId` and `forcedHabiti` in each generated action
- rule conditions come from `buildAbilityTriggerConditions(config.triggers)`
- keep conditional activation and authored condition lines unchanged

Interface:

- generated `SPAWN` / `SPAWN_BODY` behavior actions now carry the authored spawn extras

### Change: `engine/compiler/abilities/samplerCompiler.ts`

Responsibility:

- use authored triggers instead of cycle-only activation

Logic:

- same trigger helper usage as other ability compilers

Interface:

- sampler authored `triggers` now fully supported

### Change: `engine/compiler/abilities/draftCompiler.ts`

Responsibility:

- use authored triggers instead of cycle-only activation

Logic:

- same trigger helper usage as other ability compilers

Interface:

- draft authored `triggers` now fully supported

### Change: `engine/compiler/abilities/updaterCompiler.ts`

Responsibility:

- use authored triggers instead of cycle-only activation

Logic:

- same trigger helper usage as other ability compilers

Interface:

- updater authored `triggers` now fully supported

### Change: `engine/compiler/validation/collisionDetectorUtils.ts`

Responsibility:

- stop warning when production has no cycle if it has `assignment_complete` trigger

Logic:

- dependency validation must examine authored `triggers`
- the warning remains only when a cycle-triggered ability still requires cycle semantics but cycle ability is missing

Interface:

- validation message logic only

### Change: `engine/compiler/validation/collisionDetectorExtras.ts`

Responsibility:

- apply the same trigger-aware dependency logic to spawner, sampler, and draft

Logic:

- cycle dependency warnings/errors are now conditional on whether `cycle_complete` is included

Interface:

- validation message logic only

### Change: `engine/compiler/validation/collisionDetector.ts`

Responsibility:

- apply the same trigger-aware dependency logic to updater

Logic:

- updater dependency logic must inspect `triggers`

Interface:

- validation message logic only

## 7.3 Runtime behavior action and spawn pipeline changes

### Change: `engine/runtime/systems/behavior/actionExecutorSpawn.ts`

Responsibility:

- translate authored spawn extras into runtime spawn commands

Logic:

- when executing `SPAWN`, include:
    - resolved `parentId` when authored `parentId === "self"`
    - authored `forcedHabiti`
- when executing `SPAWN_BODY`, include the same spawn extras in the `SPAWN` command before dispatching the proxy
- never pass the symbolic token `self` into runtime commands

Interface:

- enqueued `SPAWN` command payloads now carry optional `parentId` and `forcedHabiti`

### Change: `engine/runtime/handlers/SpawnHandler.ts`

Responsibility:

- apply spawn-time parent and forced-habiti data to the new entity

Logic:

- after cloning unique components and before world add:
    - if `payload.parentId` is present, set `entity.parent = { parentId: payload.parentId }`
- for bodies:
    - pass `payload.forcedHabiti` into `ensureSpawnedBodyIdentity`
- if payload `parentId` is missing, preserve any existing blueprint-authored `components.parent`
- if payload `parentId` is present, it overrides blueprint-authored `components.parent`

Interface:

- `ensureSpawnedBodyIdentity` call signature changes

### Change: `engine/runtime/handlers/spawnBodyIdentity.ts`

Responsibility:

- feed forced-habiti data into body identity generation

Logic:

- add `forcedHabiti?: string[]` parameter
- pass it to `assignBodyHabiti`
- all downstream identity naming and display generation continues to use the final assigned habiti set exactly as today

Interface:

- `ensureSpawnedBodyIdentity(body, entityId, context, forcedHabiti?)`

### Change: `game/habiti/assignBodyHabiti.ts`

Responsibility:

- seed forced habiti into the existing deterministic habiti assignment algorithm

Logic:

- add optional `forcedHabiti` input
- normalize, sort, and dedupe forced ids
- validate each id against `habitusIndex`
- apply eligibility/exclusion checks using the existing `resolveHabitiEligibility` helper
- insert accepted forced ids into the assigned set before the per-type random loop runs
- do not exceed type `maxCount`
- log unknown/incompatible/skipped forced ids via the caller's telemetry hook, not internally

Interface:

- `assignBodyHabiti` input gains:
    - `forcedHabiti?: string[]`
    - `onInvalidForcedHabitusId?: (id: string, reason: string) => void`

## 7.4 Assignment-completion runtime changes

### Change: `game/systems/absorption/absorptionDigestion.ts`

Responsibility:

- continue detecting completion as today and additionally prepare the completion pulse

Logic:

- existing `ABSORB_BATCH` enqueue behavior remains unchanged
- do not emit the pulse here, because completion is not final until apply-time absorption succeeds

Interface:

- no command interface change in this file

### Change: `game/handlers/AbsorbBatchHandler.ts`

Responsibility:

- set the assignment-completion pulse after a successful batch apply

Logic:

- after processing and before returning, enqueue or directly apply an update that sets:
    - `state.assignment_complete_pulse = 1`
      on the station entity
- only do this when the batch actually completed for a resolved station
- this pulse must be visible to the next snapshot in the same tick if the handler directly mutates the entity state during apply, or to the immediately following tick if it uses queued commands; the chosen implementation must be consistent and then tested
- preferred implementation in this codebase: mutate station state directly in the handler because the handler already directly mutates assignment/progress state and world entities

Interface:

- station entities with assignment ability will have `state.assignment_complete_pulse.value` toggled to `1` on successful apply

## 7.5 Parent power and vein runtime changes

### Add: `game/systems/energy/parentThrottle.ts`

Responsibility:

- compute parent-throttle products for entities

Logic:

- given the current runtime entities and an entity id, walk parent ancestry and multiply `parent_master_throttle` values
- missing parent or missing state entry contributes `1`
- traversal must guard against cycles and stop on repeated ids

Interface:

- `resolveAncestorMasterThrottle(entities, entityId): number`
- `collectChildrenByParent(entities): Map<string, RuntimeEntity[]>`

### Change: `game/systems/energy/energyDistributionDemandContext.ts`

Responsibility:

- fold parent master throttle into every sink's effective demand

Logic:

- current effective throttle becomes:
    - own sink throttle \* ancestor master throttle product
- use that effective throttle for `base`, `max`, and demand totals
- keep `unthrottledBase` unchanged

Interface:

- no external interface change; output demand context reflects parent throttling

### Add: `engine/phaser/veins/parentVeinRouting.ts`

Responsibility:

- centralize parent-chain resolution for vein graph builders

Logic:

- resolve ancestor chain for any entity id
- expose route segments for nervous and resource edges
- traversal must guard against cycles

Interface:

- `resolveAncestorPath(source, entityId): string[]`
- returns ordered ancestor ids from nearest parent outward

### Change: `engine/phaser/veins/veinGraphSource.ts`

Responsibility:

- expose parent-aware lookup capabilities to graph builders

Logic:

- extend the source interface with direct accessors needed by parent routing helpers
- use current runtime entity access, not cached duplicate structures

Interface:

- add `getParentId(entityId: string): string | undefined`
- add `getChildren(parentId: string): ReadonlyArray<Readonly<RuntimeEntity>>`

### Change: `engine/phaser/veins/graphBuilderNervous.ts`

Responsibility:

- route nervous veins through parent chains

Logic:

- current world-to-entity direct nervous edges are replaced by chained edges
- for a parented target, build:
    - `world -> nearest parent`
    - `nearest parent -> next child in path`
    - continue until target
- unparented targets keep the current direct edge behavior
- face-to-swarm behavior remains unchanged

Interface:

- no external interface change; nervous graph topology changes

### Change: `engine/phaser/veins/graphBuilderEdges.ts`

Responsibility:

- route power demand edges through parent chains

Logic:

- resource demand for parented entities must not be drawn directly from pool to child
- route as:
    - `pool -> topmost ancestor in the route used for this attribute`
    - chained ancestor-to-child demand edges down to the target sink
- only create power-route segments for attributes the sink actually demands
- if any child draws a resource, the path must pass through its parent chain

Interface:

- no external interface change; resource edge topology changes

### Change: `engine/phaser/veins/graphBuilderSinkEdges.ts`

Responsibility:

- support routed sink edges instead of direct sink edges

Logic:

- convert the direct helper into a segment-based helper reusable by the parent-aware edge builder

Interface:

- existing helper surface may be replaced by a segment-based edge appender, but behavior remains internal to graph building

### Change: `engine/phaser/veins/veinFlowProjection.ts`

Responsibility:

- keep displayed throttle width aligned with effective parent-throttled demand

Logic:

- edge `throttle01` for power edges must reflect the already parent-throttled effective draw path
- this file should continue reading draw/allocation data only; it must not duplicate demand calculations

Interface:

- no external interface change

## 7.6 Runtime selection and card changes

### Add: `ui/runtime/world/selection/parent/useParentSectionData.ts`

Responsibility:

- derive parent/children data for runtime cards

Logic:

- reverse-lookup children from runtime entities using `parent.parentId`
- expose for each child:
    - id
    - icon/display label data already available in runtime entity/blueprint display data
    - own throttle
    - effective throttle
    - current demand summary
- expose aggregate demand totals for all children by attribute
- expose current parent master throttle

Interface:

- `useParentSectionData(entity, runtime)` returns:
    - `children`
    - `aggregateDemand`
    - `masterThrottle`
    - `hasChildren`

### Add: `ui/runtime/world/selection/parent/useParentMasterThrottle.ts`

Responsibility:

- update `state.parent_master_throttle` from the runtime card

Logic:

- mirror the pattern used by `usePowerSinkThrottle`
- enqueue `UPDATE_STATE` for `parent_master_throttle`
- default missing state to `1`
- clamp to `[0, 1]`

Interface:

- `useParentMasterThrottle(entity, runtime)` returns:
    - `targetThrottle`
    - `updateThrottle`

### Add: `ui/runtime/world/selection/parent/ParentSection.tsx`

Responsibility:

- render the parent controls and child summary section

Logic:

- render only when `hasChildren === true`
- show:
    - child icon row
    - aggregate child power usage panel by attribute
    - parent master throttle slider
    - child list with per-child current throttle summary
- do not duplicate the entity's own job-card sections

Interface:

- `ParentSection({ entity, runtime })`

### Change: `ui/runtime/world/selection/job-card/JobCard.tsx`

Responsibility:

- include the parent section for any entity that has children

Logic:

- keep existing job-card behavior intact
- when entity has assignment, the assignment card remains the main card
- for non-assignment job entities, render `ParentSection` alongside existing power/cycle sections

Interface:

- no external interface change

### Change: `ui/runtime/world/selection/absorption/useAbsorptionData.ts`

Responsibility:

- expose assignment minimum progress and compiled filter/minimum data to the card

Logic:

- read `components.assignment.minimums`
- resolve assigned proxies to original bodies
- compute current progress per minimum
- return both raw rules and evaluated progress

Interface:

- returned hook data gains:
    - `minimums`
    - `minimumProgress`

### Add: `ui/runtime/world/selection/absorption/assignmentMinimums.ts`

Responsibility:

- compute assignment minimum progress from assigned ids

Logic:

- resolve proxy ids to original body ids using current runtime entities
- support direct-body ids
- calculate exact progress numbers for each minimum type

Interface:

- `evaluateAssignmentMinimums({ runtime, stationEntity }): AssignmentMinimumProgress[]`
- `formatAssignmentMinimumSummary(rule): string`

### Change: `ui/runtime/world/selection/absorption/AbsorptionCard.tsx`

Responsibility:

- display assignment minimum requirements and their live progress

Logic:

- keep existing active/inactive card flow intact
- add a minimums section in both states when minimums exist
- each row shows:
    - requirement summary
    - current progress `current/required`
    - met/unmet state

Interface:

- no external props change

### Change: `ui/runtime/world/selection/absorption/absorptionUtils.ts`

Responsibility:

- enforce compiled assignment filters in candidate selection

Logic:

- current candidate filtering only excludes `sys_swarm` and locked entities
- extend it to also evaluate the station's compiled assignment filter against each body candidate
- required-habiti checks against `body.habiti`
- required-trait checks against `body.traits`

Interface:

- `filterCandidates` gains station/filter context

### Change: `ui/runtime/world/selection/absorption/useBodySelector.ts`

Responsibility:

- pass station filter data into candidate filtering

Logic:

- use the station entity's compiled assignment filter when building candidates
- keep existing sort and preview logic unchanged

Interface:

- no external interface change

### Change: `ui/runtime/terminal/commands/gameAbsorbCommand.ts`

Responsibility:

- apply the same compiled assignment filters to terminal-driven assignment as the UI selector uses

Logic:

- resolve the target station's assignment filter
- discard body ids that do not satisfy it
- keep the existing lock check

Interface:

- command behavior becomes filter-aware; command signature stays the same

## 7.7 Devtools editor changes

### Add: `ui/devtools/editors/blueprint/mode/forms/AssignmentFiltersSection.tsx`

Responsibility:

- CRUD editor for assignment filters

Logic:

- render one collapsible row per filter entry using `ComponentRow`
- each row type is either required habiti or required traits
- each row uses multi-autocomplete editing for `ids`
- all labels use `SmartTooltip`

Interface:

- `AssignmentFiltersSection({ basePath, filename })`

### Add: `ui/devtools/editors/blueprint/mode/forms/AssignmentMinimumsSection.tsx`

Responsibility:

- CRUD editor for assignment minimums

Logic:

- render one collapsible row per minimum entry using `ComponentRow`
- support kinds:
    - attribute total
    - level total
- show human-readable summary in the row header
- use `SmartTooltip` on every field and action

Interface:

- `AssignmentMinimumsSection({ basePath, filename })`

### Add: `ui/devtools/editors/blueprint/mode/forms/AssignmentFilterRow.tsx`

Responsibility:

- render one filter-row editor

Logic:

- row kind switcher
- multi-autocomplete ids editor
- delete action

Interface:

- `AssignmentFilterRow({ filename, basePath, index, onDelete })`

### Add: `ui/devtools/editors/blueprint/mode/forms/AssignmentMinimumRow.tsx`

Responsibility:

- render one minimum-row editor

Logic:

- row kind switcher
- attribute selector where applicable
- required numeric input
- summary text derived from the exact minimum rule

Interface:

- `AssignmentMinimumRow({ filename, basePath, index, onDelete })`

### Add: `ui/devtools/editors/blueprint/mode/forms/atoms/MultiAutocompleteStringArrayField.tsx`

Responsibility:

- reusable multiple-autocomplete string-array editor for devtools forms

Logic:

- use one row per entry with existing `AutocompleteStringField`
- allow add/remove
- keep persisted value as ordered string array
- no freeform comma-splitting field is used for this feature

Interface:

- `MultiAutocompleteStringArrayField({ filename, path, label, suggestions, tooltip })`

### Add: `ui/devtools/editors/blueprint/mode/hooks/useTraitReferenceCatalog.ts`

Responsibility:

- provide sorted trait-id suggestions from the current module draft and linked cartridge config

Logic:

- mirror the pattern already used by `useBlueprintReferenceCatalog`
- prefer draft-local edits, then linked cartridge data

Interface:

- returns `{ ids, options }`

### Add: `ui/devtools/editors/blueprint/mode/hooks/useHabitusReferenceCatalog.ts`

Responsibility:

- provide sorted habitus-id suggestions from the current module draft and linked cartridge config

Logic:

- mirror the pattern already used by `useBodyConfigSession` and runtime habiti readers

Interface:

- returns `{ ids, options }`

### Add: `ui/devtools/editors/blueprint/mode/forms/AbilityTriggerField.tsx`

Responsibility:

- reusable editor for the shared `triggers` field

Logic:

- render a two-option checkbox or toggle-list UI using the existing form style
- persisted values are exact strings:
    - `cycle_complete`
    - `assignment_complete`
- default selection is `cycle_complete`

Interface:

- `AbilityTriggerField({ filename, path })`

### Change: `ui/devtools/editors/blueprint/mode/forms/AssignmentAbilityForm.tsx`

Responsibility:

- surface assignment filters and minimums in the assignment editor

Logic:

- keep existing fields
- append `AssignmentFiltersSection`
- append `AssignmentMinimumsSection`

Interface:

- no prop change

### Change: `ui/devtools/editors/blueprint/mode/forms/SpawnerAbilityForm.tsx`

Responsibility:

- surface parent-on-spawn and forced-habiti editing

Logic:

- add `parentOnSpawn` enum field
- add `forcedHabiti` multi-autocomplete field
- add shared trigger field
- keep current blueprint/count/mode/target/conditions fields unchanged

Interface:

- no prop change

### Change: `ui/devtools/editors/blueprint/mode/forms/ProductionAbilityForm.tsx`

Responsibility:

- surface shared trigger editing

Logic:

- add `AbilityTriggerField`

Interface:

- no prop change

### Change: `ui/devtools/editors/blueprint/mode/forms/ConversionAbilityForm.tsx`

Responsibility:

- surface shared trigger editing

Logic:

- add `AbilityTriggerField`

Interface:

- no prop change

### Change: `ui/devtools/editors/blueprint/mode/forms/SamplerAbilityForm.tsx`

Responsibility:

- surface shared trigger editing

Logic:

- add `AbilityTriggerField`

Interface:

- no prop change

### Change: `ui/devtools/editors/blueprint/mode/forms/DraftAbilityForm.tsx`

Responsibility:

- surface shared trigger editing

Logic:

- add `AbilityTriggerField`

Interface:

- no prop change

### Change: `ui/devtools/editors/blueprint/mode/forms/UpdaterAbilityForm.tsx`

Responsibility:

- surface shared trigger editing

Logic:

- add `AbilityTriggerField`

Interface:

- no prop change

## 8. Exact runtime semantics

## 8.1 Parent routing

For any entity `child` with parent path `[p1, p2, ... pn]` where `p1` is the nearest parent and `pn` is the topmost ancestor:

### Nervous routing

- current direct edge `sys_world -> child` is replaced by:
    - `sys_world -> pn`
    - `pn -> ... -> p2`
    - `p2 -> p1`
    - `p1 -> child`

### Power routing

For each demanded attribute:

- current direct edge `pool_attribute -> child` is replaced by:
    - `pool_attribute -> pn`
    - `pn -> ... -> p2`
    - `p2 -> p1`
    - `p1 -> child`

The route exists only when the child demands that attribute.

## 8.2 Effective throttle

For a sink entity `E`:

- own throttle = `E.powerSink.throttle` or `1`
- ancestor master throttle = product of every ancestor `state.parent_master_throttle.value` or `1`
- effective throttle = own throttle \* ancestor master throttle

This effective throttle is the only throttle used for demand calculation.

## 8.3 Assignment completion pulse

The pulse lifecycle is:

1. digestion enqueues `ABSORB_BATCH`
2. `ABSORB_BATCH` apply succeeds on the station
3. station state is set to `assignment_complete_pulse = 1`
4. same entity snapshot for the following behavior evaluation sees the pulse
5. any authored ability with `assignment_complete` in `triggers` may fire
6. compiled reset rule emits a state mutation back to `0`
7. next tick starts with the pulse cleared

This pulse is station-local. It is not global.

## 9. Validation rules

1. `parent.parentId` must be a non-empty string when present
2. `forcedHabiti` ids must be unique after normalization
3. assignment filter rows must have non-empty `ids`
4. assignment minimum `required` values must be finite and `>= 0`
5. authored `triggers` arrays must be non-empty
6. cycle dependency validation only applies when `cycle_complete` is included
7. parent ancestry traversal must hard-stop on cycles and log loudly

## 10. Testing plan

All tests must follow Given/When/Then and remain colocated.

## 10.1 Unit tests

### `game/habiti/assignBodyHabiti.*.test.ts`

Add coverage for:

- seeds forced habiti before rolling
- forced habiti count toward maxCount
- forced habiti respect excludes
- unknown forced habitus ids are skipped explicitly
- duplicate forced habitus ids are deduped

### `engine/compiler/abilities/abilityTriggerConditions.test.ts`

Add coverage for:

- cycle-only trigger conditions
- assignment-only trigger conditions
- combined trigger conditions

### `game/systems/energy/parentThrottle.test.ts`

Add coverage for:

- no parent returns `1`
- single parent throttle multiplies child draw
- multiple ancestors multiply in order-independent product form
- cycle guard stops traversal safely

### `ui/runtime/world/selection/absorption/assignmentMinimums.test.ts`

Add coverage for:

- level totals from direct body ids
- level totals from proxy original ids
- attribute totals from direct body ids
- attribute totals from proxy original ids
- missing bodies contribute `0`

### `ui/runtime/world/selection/absorption/absorptionUtils.filter.test.ts`

Add coverage for:

- required habiti filter
- required traits filter
- multiple filter rows are ANDed
- empty filter yields legacy candidate behavior

## 10.2 Compiler integration tests

### `engine/compiler/abilities/spawnerCompiler.test.ts`

Add coverage for:

- compiled spawn actions carry `parentId` when `parentOnSpawn` is `self`
- compiled spawn actions carry `forcedHabiti`
- compiled spawner rules use authored triggers

### `engine/compiler/abilities/productionCompiler.conditions.test.ts`

Add coverage for:

- production uses assignment-complete triggers when authored
- production retains cycle-complete default

### `engine/compiler/abilities/conversionCompiler.conditions.test.ts`

Add coverage for:

- conversion uses assignment-complete triggers when authored
- conversion retains input gating on top of triggers

### `engine/compiler/abilities/samplerCompiler.conditionalActivation.test.ts`

Add or extend coverage for:

- sampler supports assignment-complete triggers

### `engine/compiler/abilities/draftCompiler.onComplete.integration.test.ts`

Add or extend coverage for:

- draft supports assignment-complete triggers

### `engine/compiler/abilities/updaterCompiler.test.ts`

Add coverage for:

- updater supports assignment-complete triggers

### `engine/compiler/abilities/assignmentCompiler.test.ts`

Add coverage for:

- compiled assignment component includes typed filter and minimums
- compiled assignment state includes `assignment_complete_pulse`
- reset rule exists exactly once

## 10.3 Runtime handler/system tests

### `engine/runtime/handlers/SpawnHandler.test.ts`

Add coverage for:

- payload parent id overrides blueprint parent component
- payload forced habiti are forwarded into body identity assignment
- non-body spawn ignores forced habiti safely

### `engine/runtime/systems/behavior/ActionExecutor.actions.test.ts`

Add coverage for:

- `SPAWN` action resolves `parentId: self`
- `SPAWN_BODY` action resolves `parentId: self`
- forced habiti are carried into `SPAWN` command payloads

### `game/handlers/AbsorbBatchHandler.test.ts`

Add coverage for:

- successful absorb batch sets assignment completion pulse
- pulse is not set when station resolution fails

### `game/systems/AbsorptionSystem.test.ts`

Extend coverage for:

- assignment completion remains tied to anchored assigned proxies plus duration completion only

## 10.4 Vein graph tests

### `engine/phaser/veins/graphBuilderNervous.test.ts`

Add coverage for:

- nervous edge for a child is routed through parent chain
- unparented entity keeps direct world edge

### `engine/phaser/veins/graphBuilderEdges.test.ts`

Add coverage for:

- power-demand edge for a child is routed through parent chain
- attribute-specific routing only exists when the child demands that attribute

### `engine/phaser/veins/veinFlowProjection.test.ts`

Add coverage for:

- displayed throttle widths reflect parent-throttled effective demand

## 10.5 Runtime UI tests

### `ui/runtime/world/selection/absorption/BodySelector.test.tsx`

Add coverage for:

- selector excludes bodies missing required habiti
- selector excludes bodies missing required traits
- selector still allows valid bodies

### `ui/runtime/world/selection/absorption/AbsorptionCard.test.tsx`

Add coverage for:

- minimum rows render with progress
- met/unmet state updates from live assigned bodies

### `ui/runtime/world/selection/job-card/JobCard.parent.test.tsx`

Add coverage for:

- parent section renders only when children exist
- child icon list renders
- parent master throttle slider renders

### `ui/runtime/terminal/commands/gameAbsorbCommand.test.ts`

Add coverage for:

- terminal command rejects bodies failing assignment filters
- terminal command still accepts valid bodies

### `ui/devtools/editors/blueprint/mode/DesignerMode.assignment.test.tsx`

Add or extend coverage for:

- assignment form renders filters and minimums sections without crashing

### `ui/devtools/editors/blueprint/mode/forms/SpawnerAbilityForm.test.tsx`

Add coverage for:

- parent-on-spawn and forced-habiti fields render
- trigger field renders

## 11. Migration and compatibility behavior

1. Existing blueprints with no new fields continue to behave exactly as before
2. Existing assignment components with `filter: []` continue to behave exactly as before
3. Existing authored cycle-triggered abilities keep the same behavior because `triggers` defaults to `["cycle_complete"]`
4. Missing parent throttle state behaves as `1`, so adding parent routing without touching the slider preserves child behavior until the slider is used

## 12. Implementation order

1. Add schema files and typed shared rule definitions
2. Add compiler trigger helper and assignment completion compiler support
3. Update ability compilers and validation
4. Extend behavior spawn actions and runtime spawn payloads
5. Update spawn handler and habiti assignment
6. Add assignment completion pulse in absorb apply
7. Add parent-throttle energy helper and wire demand calculation
8. Add parent routing helpers and vein graph changes
9. Add runtime card/selector changes
10. Add devtools form changes
11. Add tests in the order listed above

## 13. Done criteria

The work is complete only when all of the following are true:

1. All new authored fields validate through the existing schemas
2. All currently cycle-triggered authored abilities support `assignment_complete`
3. Assignment stations can filter candidates by required habiti and required traits in both UI and terminal flows
4. Assignment cards display minimum requirements and live progress correctly from original assigned bodies
5. Spawned bodies can receive forced habiti that behave like normal rolls
6. Spawned nodes can inherit parent from the spawning entity
7. Nervous and power veins route through parent chains
8. Parent master throttle changes child effective demand without mutating child throttle settings
9. All relevant unit, integration, and UI tests pass
10. No unrelated files are changed

