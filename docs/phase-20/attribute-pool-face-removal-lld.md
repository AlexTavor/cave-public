# LLD — Remove face runtime model, remove attribute-pool nodes, route power from `sys_world`, and make bodies non-static

## 1. Document purpose

This document defines the implementation design for the following locked changes:

1. Nervous veins must only exist when authored through passport ability.
2. The runtime face model must be removed completely.
3. Attribute pools must stop existing as runtime nodes/entities.
4. `core.bp` must be deleted.
5. Power/resource veins must originate from `sys_world`.
6. `AttributePoolSystem` must remain, but it must write aggregate power totals onto `sys_world.state`.
7. Attribute display definitions such as `attr_body`, `attr_mind`, and `attr_social` must remain.
8. Bodies compiled from `worldPresence` must be dynamic, not static.

This design is based on direct inspection of the uploaded codebase and must be implemented without speculative refactors.

## 2. Governing constraints

The implementation must obey the attached architectural context pack, prompt contract, and testing standards. In particular:

- runtime state remains owned by ECS,
- systems remain read-only and emit commands only,
- no direct UI mutation of simulation state,
- no unrelated refactors,
- all changed behavior must be covered by readable tests.

Those constraints come from the attached project documents. fileciteturn0file0L1-L47 fileciteturn0file1L1-L33 fileciteturn0file2L1-L57

## 3. Current-state findings from code inspection

### 3.1 Nervous veins are currently auto-added for more than passport ability

Current behavior in `engine/phaser/veins/graphBuilderNervous.ts`:

- `isFaceEntity(entity)` adds nervous routes for face entities.
- `isAssignableEntity(entity)` adds nervous routes for assignment nodes.
- `hasPassportNervousVein(entity)` adds nervous routes for passport-tagged entities.

This is broader than the target requirement.

### 3.2 The face model is a real runtime concept today

The face model currently exists in all of the following forms:

- schema: `data/schemas/game/face.ts`, `data/schemas/components.ts`, `data/schemas/blueprint.ts`, `engine/linker/blueprintV2Schema.ts`, `engine/linker/types.ts`
- parser/config: `engine/linker/semanticParser.ts`, `data/schemas/game/config.ts`, `data/schemas/v2/faceDefaults.ts`
- rendering/display: `engine/phaser/display/DisplayDefinitionCatalog.ts`, `engine/phaser/display/avatar/AvatarDisplayConstants.ts`, `engine/phaser/display/modules/lightModuleDecorState.ts`
- runtime helper logic: `engine/phaser/display/avatar/AvatarSeedResolver.ts`, `engine/phaser/display/modules/backgroundBandSelector.ts`, `engine/phaser/veins/graphBuilderUtils.ts`, `ui/runtime/world/selection/absorption/absorptionUtils.ts`, `engine/terminal/commands/projectCartridgeAdapter.ts`, `ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.ts`

This means face removal is a schema + parser + runtime + rendering cleanup, not just a graph change.

### 3.3 Attribute pools are currently implemented as real runtime entities

Current behavior in `game/systems/AttributePoolSystem.ts` and `game/systems/poolLifecycle.ts`:

- `AttributePoolSystem` computes aggregate totals from contributing bodies.
- The system writes those totals to `pool_body.state.power`, `pool_mind.state.power`, and `pool_social.state.power`.
- `poolLifecycle.ts` spawns or kills those pool entities depending on whether active bodies exist.

Current authored content also assumes those entities exist:

- `data/raw/example/modules/core.bp` defines `pool_body`, `pool_mind`, and `pool_social`.
- `data/raw/example/manifest.json` loads `modules/core.bp`.
- `data/raw/example/scripts/start.cvs` spawns the three pool entities explicitly.
- `data/raw/example/modules/core.cave` contains player-facing text that describes attribute pools as explicit power sources.

### 3.4 Power distribution currently scans source entities, not `sys_world`

Current behavior in `game/systems/energy/energyDistributionDemandContext.ts` and `ui/runtime/status/powerStatusUtils.ts`:

- power supply is accumulated by scanning every entity that has `powerSource.attribute`
- the numeric source value is read from that entity’s `state.power`

If pool entities are deleted, that logic no longer has any valid source entities.

### 3.5 Vein graph construction currently depends on pool nodes and face nodes

Current behavior in `engine/phaser/veins/graphBuilderUtils.ts`, `graphBuilderEdges.ts`, and `graphBuilderSinkEdges.ts`:

- `POOL_IDS` maps each attribute to `pool_body`, `pool_mind`, and `pool_social`
- pool entities are collected as graph nodes
- face entities emit `resource-upstream` edges into each pool node
- demand and sink routes start at the pool node for the corresponding attribute

This is the precise runtime model that must be removed.

### 3.6 Nervous flow currently uses face attribute resolution

Current behavior in `engine/phaser/veins/nervousVeinFlow.ts`:

- nervous delivery rate resolves target attribute through `resolveFaceAttribute`
- if the terminal nervous target is a face entity, the edge gets blob flow from `sys_world.cave.attributes[attribute]`
- non-face nervous targets already resolve to zero delivered rate

Once the face model is removed, the only remaining nervous targets will be non-face entities, so current face-specific flow logic becomes dead.

### 3.7 Bodies are currently compiled as static when `worldPresence` creates physics

Current behavior in `engine/compiler/abilities/spatialCompiler.ts`:

- when `worldPresence` creates physics, `isStatic` is set to `true`
- `CompilerService` runs `bodyCompiler` before `spatialCompiler`, so body blueprints are already tagged as `body` when `spatialCompiler` runs

This is why bodies authored via `worldPresence` compile into static physics.

## 4. Locked design decisions

### 4.1 Runtime face model removal is complete, not partial

The following concepts are removed from production code:

- `face` component schema and type
- face blueprint defaults
- face-specific config entries
- face avatar display keys
- face-based nervous routing
- face-based nervous flow projection
- face fallback in avatar subject resolution
- face fallback in absorption candidate assignment detection

No compatibility layer is retained.

### 4.2 Attribute pool nodes are deleted, not replaced with hidden entities

There will be no hidden `pool_body`, `pool_mind`, or `pool_social` runtime entities.

The aggregate power source becomes `sys_world.state`.

### 4.3 Canonical aggregate power state lives on `sys_world.state`

The canonical state keys are:

- `sys_world.state.power_body`
- `sys_world.state.power_mind`
- `sys_world.state.power_social`

Each entry is a standard world state entry with:

- numeric `value`
- `visible: true`
- no pool entity wrapper
- no `powerSource` component

No alternative key names are permitted.

### 4.4 Power/resource veins always originate from the `sys_world` graph node

Every resource-demand edge chain begins at `sys_world`.

There are only two runtime vein edge kinds after this change:

- `resource-demand`
- `nervous`

`resource-upstream` is removed.

### 4.5 Passport ability remains the sole source of nervous routes

The only entities eligible for nervous routing are entities tagged with `PASSPORT_NERVOUS_VEIN_TAG`.

Assignment ownership, face status, and tag heuristics are not routing criteria anymore.

### 4.6 Body physics rule

If a blueprint is a body blueprint at compile time and `worldPresence` creates or patches physics, the resulting physics must have `isStatic: false`.

Non-body blueprints keep current behavior.

### 4.7 Explicit non-goals

The following stay unchanged:

- draft pools such as `pool_explore` and `pool_level_up` in `progression.draft`
- attribute display asset type `attribute_pool`
- display keys `attr_body`, `attr_mind`, `attr_social`
- cave eye rendering
- body avatar art generation, including internal avatar shape names such as `face_0`, `face_1`, etc.

These are not part of the runtime face entity model or the attribute-pool node model.

## 5. Exact runtime contract after the change

### 5.1 World power state contract

`sys_world.state` contains the aggregate body power totals.

Semantics:

- `power_body` = sum of contributing body `body.attributes.body`, scaled by health efficiency and rounded exactly as current `AttributePoolSystem` does
- `power_mind` = sum of contributing body `body.attributes.mind`, scaled by health efficiency and rounded exactly as current `AttributePoolSystem` does
- `power_social` = sum of contributing body `body.attributes.social`, scaled by health efficiency and rounded exactly as current `AttributePoolSystem` does

Contributor inclusion/exclusion rules are unchanged:

- exclude `sys_world`
- exclude entities without a body component
- exclude entities tagged `aggregate`
- exclude locked bodies
- exclude bodies assigned into station `assignment.assignedIds`

There is no face-specific exclusion or inclusion rule because faces no longer exist.

### 5.2 Power distribution contract

`EnergyDistributionSystem` supply inputs come only from `sys_world.state.power_body`, `power_mind`, and `power_social`.

No entity scanning for source nodes remains.

If a fixture or runtime omits `sys_world`, the test fixture is invalid. Production runtime always contains `sys_world` via default system entities.

### 5.3 Vein graph contract

Node set:

- includes `sys_world` if physics exists
- includes routed parent nodes when they have physics
- includes terminal demand/sink entities when they have physics
- never includes `pool_body`, `pool_mind`, or `pool_social`
- never includes face entities because faces do not exist

Edge set:

- resource-demand edges start at `sys_world`
- resource-demand edges route through ancestors using the existing parent-routing utility
- nervous edges start at `sys_world`
- nervous edges route through ancestors using the existing parent-routing utility
- nervous edges are created only for passport nervous entities

### 5.4 Nervous flow contract

After face removal, nervous edges are visual/comfort edges only.

For every nervous edge:

- `comfort01` still derives from `sys_world.state.comfort`
- `throttle01` remains `1`
- `deliveredRate` is always `0`

This preserves nervous vein visibility and comfort-driven thickness while removing face-only blob flow.

### 5.5 Rendering/display contract

The following display keys remain built-in and valid:

- `body_avatar`
- `attr_body`
- `attr_mind`
- `attr_social`
- `generic_node`
- `veins_display`
- other unrelated built-ins that already exist

The following display keys are removed from production:

- `face_avatar_body`
- `face_avatar_mind`
- `face_avatar_social`

### 5.6 Body physics contract

Compiled body blueprints with `worldPresence` must end with dynamic physics:

- `isStatic: false`
- position and radius remain authored exactly as before
- non-body `worldPresence` blueprints keep current static default behavior unless they already authored different physics

## 6. Production file plan

## 6.1 Files to delete

### `game/systems/poolLifecycle.ts` — Delete

- Responsibility being removed: lifecycle management for runtime pool entities.
- Reason: pool entities no longer exist.
- Replacement: none.
- Interface contract after deletion: `AttributePoolSystem` no longer calls pool lifecycle code.

### `data/schemas/game/face.ts` — Delete

- Responsibility being removed: face component schema/type.
- Reason: face runtime model is fully excised.
- Replacement: none.
- Interface contract after deletion: no production schema may accept a `face` component.

### `data/schemas/v2/faceDefaults.ts` — Delete

- Responsibility being removed: default authored face blueprint set.
- Reason: face entities no longer exist.
- Replacement: none.
- Interface contract after deletion: no default face blueprints are generated or referenced.

### `data/raw/example/modules/core.bp` — Delete

- Responsibility being removed: authored attribute-pool runtime nodes.
- Reason: attribute pools no longer exist as entities.
- Replacement: aggregate power state on `sys_world.state`.
- Interface contract after deletion: manifest and startup script must not reference this file.

### `ui/runtime/status/powerStatusUtils.ts` — Delete

- Responsibility being removed: pool-node-based UI supply aggregation.
- Reason: it exists only to sum `powerSource` entities for the deleted pool card.
- Replacement: none.
- Interface contract after deletion: no production code imports this file.

### `ui/runtime/world/selection/AttributePoolCard.tsx` — Delete

- Responsibility being removed: selection card for pool entities.
- Reason: pool entities no longer exist.
- Replacement: none.
- Interface contract after deletion: no lens or test references this card.

### `ui/runtime/world/selection/AttributePoolCardView.tsx` — Delete

- Responsibility being removed: view for deleted pool card.
- Reason: same as above.
- Replacement: none.
- Interface contract after deletion: no production import remains.

### `ui/runtime/world/selection/resolveAttributePoolCardData.ts` — Delete

- Responsibility being removed: data adapter for deleted pool card.
- Reason: same as above.
- Replacement: none.
- Interface contract after deletion: no production import remains.

### `ui/runtime/world/selection/attributePoolCardHydration.ts` — Delete

- Responsibility being removed: hydration/equality plan for deleted pool card.
- Reason: same as above.
- Replacement: none.
- Interface contract after deletion: no production import remains.

## 6.2 Files to change

### `game/systems/AttributePoolSystem.ts` — Change

- Responsibility: compute aggregate body power totals.
- Required logic:
  - remove all calls to `reconcilePoolLifecycle`
  - stop writing to `pool_body`, `pool_mind`, and `pool_social`
  - keep the current contributor filter and health-efficiency calculation exactly
  - write totals to `sys_world.state.power_body`, `power_mind`, `power_social`
  - enqueue `UPDATE_STATE` only when the target world-state value changes
- Interface contract:
  - input: unchanged `Snapshot`, `CommandBuffer`, `dt`
  - output commands: only `UPDATE_STATE` for `sys_world`
  - no `SPAWN` or `KILL` commands

### `data/schemas/v2/caveWorldDefaults.ts` — Change

- Responsibility: define default `sys_world.state` shape.
- Required logic:
  - add default entries for `power_body`, `power_mind`, and `power_social`
  - each default value is `0`
  - each entry is visible
- Interface contract:
  - every runtime created from defaults has the three power keys available on `sys_world.state`

### `game/systems/energy/energyDistributionDemandContext.ts` — Change

- Responsibility: build energy-distribution supply and demand context.
- Required logic:
  - remove dependence on `PowerSourceComponent`
  - stop scanning all entities for source supply
  - locate `sys_world`
  - read aggregate supply from `sys_world.state.power_body`, `power_mind`, `power_social`
  - keep sink enumeration and throttle/demand math unchanged
- Interface contract:
  - returned `supplies` are driven only by the canonical world state keys
  - sink behavior, range building, and throttle semantics remain unchanged

### `engine/phaser/veins/graphBuilderUtils.ts` — Change

- Responsibility: orchestrate vein-graph construction and shared graph helpers.
- Required logic:
  - remove `POOL_IDS`
  - remove face-resolution helpers: `resolveFaceAttribute`, `isFaceEntity`, and all face heuristics
  - stop collecting pool nodes
  - create the graph starting from a single `sys_world` node
  - call updated demand, sink, and nervous builders using the world node
- Interface contract:
  - `buildVeinGraph` produces graphs with no pool nodes and no face nodes
  - `addNode` behavior is unchanged

### `engine/phaser/veins/graphBuilderEdges.ts` — Change

- Responsibility: build resource-demand routes.
- Required logic:
  - remove `addFaceEdges` completely
  - change `addDemandEdges` so each route starts at the `sys_world` node, not a pool node
  - keep parent routing through `resolveAncestorPath`
  - keep attribute-specific tags `demand:body`, `demand:mind`, `demand:social`
- Interface contract:
  - output edges are only `resource-demand`
  - no `resource-upstream` edges are emitted

### `engine/phaser/veins/graphBuilderSinkEdges.ts` — Change

- Responsibility: add sink-demand routes for entities that consume power but are not tag-routed demand entities.
- Required logic:
  - replace pool-node input with world-node input
  - start every sink route at `sys_world`
  - preserve per-attribute edge generation and `drawFraction`
- Interface contract:
  - function signature changes from pool-node map input to single world-node input
  - output remains routed `resource-demand` edges

### `engine/phaser/veins/graphBuilderNervous.ts` — Change

- Responsibility: build nervous routes.
- Required logic:
  - remove `isFaceEntity` usage
  - remove `isAssignableEntity` as a routing criterion
  - keep only `PASSPORT_NERVOUS_VEIN_TAG` eligibility
  - preserve existing ancestor routing through `resolveAncestorPath`
- Interface contract:
  - nervous edges exist only for passport nervous entities
  - duplicates remain suppressed by the set-based route collector

### `engine/phaser/veins/nervousVeinFlow.ts` — Change

- Responsibility: project nervous-edge runtime flow values.
- Required logic:
  - delete face-attribute resolution logic
  - delete face-target cave-attribute output logic
  - keep `readComfort01`
  - make `resolveNervousDeliveredRate` return `0` for all nervous edges
- Interface contract:
  - nervous edges are always blobless after projection
  - comfort-based width behavior remains available to display code

### `engine/phaser/veins/veinFlowProjection.ts` — Change

- Responsibility: project delivered rates and throttle values onto built vein edges.
- Required logic:
  - remove `resource-upstream` handling branch
  - keep routed `resource-demand` terminal resolution intact
  - keep nervous-edge projection path, now relying on zero delivered rate + comfort
- Interface contract:
  - all non-nervous edges are treated as `resource-demand`
  - routed demand chains still inherit terminal sink delivery and effective throttle

### `engine/phaser/veins/types.ts` — Change

- Responsibility: define vein graph types.
- Required logic:
  - remove `resource-upstream` from `VeinEdgeKind`
  - keep `resource-demand` and `nervous`
- Interface contract:
  - production code may not emit or consume `resource-upstream`

### `engine/phaser/display/modules/backgroundBandSelector.ts` — Change

- Responsibility: choose static fill bands for nodes with no cycle rendering.
- Required logic:
  - remove `powerSource`-based attribute resolution
  - remove `face`-based attribute resolution
  - continue resolving attribute-colored fills from display-key-driven attribute displays
  - retain generic fallback behavior for non-attribute displays
- Interface contract:
  - `attr_body`, `attr_mind`, and `attr_social` still render attribute-colored fills
  - no logic depends on removed runtime components

### `engine/phaser/display/modules/lightModuleDecorState.ts` — Change

- Responsibility: compute display light/aura state.
- Required logic:
  - remove all `face_avatar_*` handling
  - keep cave, attribute-display, body-avatar, and swarm behavior intact
  - remove unused face-avatar palette lookups/constants
- Interface contract:
  - no face-avatar display key branch remains

### `engine/phaser/display/DisplayDefinitionCatalog.ts` — Change

- Responsibility: register built-in display definitions.
- Required logic:
  - remove registrations for `face_avatar_body`, `face_avatar_mind`, `face_avatar_social`
  - keep `body_avatar`
  - keep `attr_body`, `attr_mind`, `attr_social`, and `generic_node`
- Interface contract:
  - no face-avatar built-in display definitions remain
  - attribute display definitions remain registered exactly

### `engine/phaser/display/avatar/AvatarDisplayConstants.ts` — Change

- Responsibility: declare built-in avatar display constants and related presentation constants.
- Required logic:
  - remove face-avatar display key constants
  - remove face-avatar entries from single-display-key arrays and role maps
  - keep body-avatar and swarm-avatar constants
  - remove any now-unused face-avatar aura palette constants
- Interface contract:
  - exported display-key constants cover only still-supported avatar displays

### `engine/phaser/display/avatar/AvatarSeedResolver.ts` — Change

- Responsibility: resolve body-avatar subject seed.
- Required logic:
  - keep proxy-original fallback
  - keep `state.assignedEntityId` fallback
  - keep `assignment.assignedIds[0]` fallback
  - remove `face.assignedEntityId` fallback entirely
  - keep own passport/avatar fallback and entity-id fallback
- Interface contract:
  - no code path reads a removed `face` component

### `lib/displays/displayKeyKinds.ts` — Change

- Responsibility: classify built-in display keys.
- Required logic:
  - remove `face_avatar_body`, `face_avatar_mind`, `face_avatar_social` from built-in classification
  - keep attribute display keys
- Interface contract:
  - removed keys are no longer recognized as built-ins

### `ui/runtime/world/selection/absorption/absorptionUtils.ts` — Change

- Responsibility: derive absorption candidate and assignment helper data.
- Required logic:
  - remove `face.assignedEntityId` fallback from `buildAssignedBodySet`
  - keep `state.assignedEntityId` and `assignment.assignedIds[0]`
- Interface contract:
  - assignment tracking no longer references face data

### `engine/compiler/abilities/spatialCompiler.ts` — Change

- Responsibility: compile `worldPresence` into spatial/physics data.
- Required logic:
  - detect whether the draft is a body blueprint using the existing body tag
  - when creating physics for a body blueprint, set `isStatic: false`
  - when patching existing physics for a body blueprint, force `isStatic: false`
  - keep non-body behavior unchanged
- Interface contract:
  - compiled body blueprints become dynamic
  - non-body blueprints preserve prior semantics

### `data/schemas/components.ts` — Change

- Responsibility: export component schemas and types.
- Required logic:
  - remove `FaceComponentSchema` export and type export
  - remove `PowerSourceComponentSchema` export and type export
- Interface contract:
  - neither `face` nor `powerSource` are valid production components after the change

### `data/schemas/blueprint.ts` — Change

- Responsibility: define authored blueprint schema.
- Required logic:
  - remove `face` from `components`
  - remove `powerSource` from `components`
- Interface contract:
  - authored blueprints cannot declare either removed component

### `engine/linker/blueprintV2Schema.ts` — Change

- Responsibility: validate V2 blueprint fragments.
- Required logic:
  - remove `face` field
  - remove `powerSource` field
- Interface contract:
  - parsed V2 blueprints cannot contain either removed component

### `engine/linker/types.ts` — Change

- Responsibility: define runtime cartridge blueprint shape.
- Required logic:
  - remove `face?: FaceComponent`
  - remove `powerSource?: PowerSourceComponent`
- Interface contract:
  - runtime blueprint type no longer exposes removed components

### `engine/linker/semanticParser.ts` — Change

- Responsibility: validate semantic module fragments.
- Required logic:
  - remove top-level `.cave` support for `faces`
- Interface contract:
  - semantic cave files may not declare a `faces` section

### `data/schemas/game/config.ts` — Change

- Responsibility: define game config schema/defaults.
- Required logic:
  - remove `FaceBlueprintByAttributeSchema`
  - remove `faceBlueprintByAttribute` from `GameConfigSchema`
  - remove the exported `FaceBlueprintByAttribute` type
- Interface contract:
  - game config has no face-related settings

### `engine/terminal/commands/projectCartridgeAdapter.ts` — Change

- Responsibility: serialize runtime cartridge blueprints back to module-cartridge shape.
- Required logic:
  - stop copying `face`
  - stop copying `powerSource`
- Interface contract:
  - adapter output contains no removed component keys

### `engine/runtime/handlers/spawnCloneUtils.ts` — Change

- Responsibility: clone stateful runtime components on spawn.
- Required logic:
  - remove `powerSource` from `STATEFUL_KEYS`
- Interface contract:
  - cloning logic no longer includes deleted source-node component state

### `ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.ts` — Change

- Responsibility: build sanitized preview runtime blueprints.
- Required logic:
  - remove `face` from `PREVIEW_COMPONENTS`
  - remove `powerSource` from `PREVIEW_COMPONENTS`
- Interface contract:
  - preview runtime never depends on removed components

### `game/main.ts` — Change

- Responsibility: register gameplay systems.
- Required logic:
  - keep `AttributePoolSystem`
  - delete the now-unused `poolLifecycle` import chain indirectly by removing lifecycle usage from the system
  - no direct registration change is required unless import cleanup is needed
- Interface contract:
  - gameplay system list remains functionally the same except that no pool lifecycle behavior occurs

### `data/raw/example/manifest.json` — Change

- Responsibility: define example project file list.
- Required logic:
  - remove `modules/core.bp`
- Interface contract:
  - example project loads without any pool blueprint file

### `data/raw/example/scripts/start.cvs` — Change

- Responsibility: bootstrap example runtime state.
- Required logic:
  - delete explicit spawns for `pool_body`, `pool_mind`, and `pool_social`
- Interface contract:
  - starting the example project does not spawn deleted pool entities

### `data/raw/example/modules/core.cave` — Change

- Responsibility: example cave config and player-facing tutorial text.
- Required logic:
  - remove or rewrite the existing player-facing text that describes attribute pools as explicit entities
  - exact replacement text must describe aggregate body, mind, and social power without implying separate node entities
- Required authored replacement text:
  - “The power from my bodies — [icon=attr_body]Body, [icon=attr_mind]Mind, [icon=attr_social]Social — is distributed among the tasks according to their throttles. The higher the throttle, the more power a task gets, the faster it will complete. But the other tasks will complete slower. I need to balance my tasks’ throttles.”
- Interface contract:
  - example text is consistent with the new world-state power model

### `data/raw/example/modules/assets.art` — Change

- Responsibility: example display/style assets.
- Required logic:
  - delete `style_pool_body`, `style_pool_mind`, and `style_pool_social` because their only consumer is deleted `core.bp`
  - keep `style_pool_absorption` because it is unrelated and still present in assets
- Interface contract:
  - no dead pool-node-only style definitions remain in the example asset file

## 7. Test plan by file

The tests must satisfy the attached testing standard: behavior-focused, readable, and organized by Given/When/Then. fileciteturn0file2L1-L57

## 7.1 Tests to delete

### `game/systems/poolLifecycle.test.ts` — Delete

- Reason: production lifecycle file is deleted.
- Replacement: none.

### `ui/runtime/world/selection/AttributePoolCard.test.tsx` — Delete

- Reason: production card is deleted.
- Replacement: none.

## 7.2 Tests to change

### `game/systems/AttributePoolSystem.exclusion.test.ts` — Change

- Responsibility: verify aggregate-power computation behavior.
- Required test logic:
  - keep contributor exclusion tests for station-assigned bodies
  - delete the face-assigned-body case entirely
  - replace pool-entity assertions with `sys_world.state.power_body`, `power_mind`, `power_social` update assertions
  - add a case proving the system emits no `SPAWN` or `KILL` commands
- Contract:
  - assertions target world-state updates only

### `game/systems/EnergyDistributionSystem.test.ts` — Change

- Responsibility: verify supply distribution.
- Required test logic:
  - replace pool source fixtures with a single `sys_world` fixture containing `state.power_body`, `power_mind`, `power_social`
  - preserve proportional demand, throttle, blackout, and allocated-draw coverage
- Contract:
  - all supply comes from world state, not source entities

### `game/systems/PowerSinkThrottle.integration.test.ts` — Change

- Responsibility: verify throttle affects efficiency in an integrated world.
- Required test logic:
  - replace `pool_body` entity with `sys_world.state.power_body`
- Contract:
  - test passes with no `powerSource` entity present

### `game/systems/luretravelerCycle.integration.test.ts` — Change

- Responsibility: verify cycle accumulation under powered conditions.
- Required test logic:
  - remove the three pool node fixtures
  - rely on real `AttributePoolSystem` updating `sys_world`
  - keep the body fixture and sink fixture
- Contract:
  - integration proves the runtime works without pool entities

### `engine/phaser/veins/GraphBuilder.test.ts` — Change

- Responsibility: verify base vein graph construction.
- Required test logic:
  - delete all face-oriented expectations
  - assert that demand edges start at `sys_world`
  - assert that no pool nodes exist
  - assert that passport nervous entities receive nervous routes and non-passport entities do not
- Contract:
  - no pool or face references remain in the fixture or assertions

### `engine/phaser/veins/GraphBuilder.parentRouting.test.ts` — Change

- Responsibility: verify ancestor routing.
- Required test logic:
  - replace pool-node source expectations with `sys_world`
  - replace face target with a passport nervous entity target
  - assert parent-routed resource-demand and nervous edges both start from `sys_world`
- Contract:
  - parent routing semantics remain unchanged except for the source node model

### `engine/phaser/veins/GraphBuilder.missingParent.test.ts` — Change

- Responsibility: verify fallback routing when parent lookup fails.
- Required test logic:
  - replace `pool_body` source expectation with `sys_world`
- Contract:
  - missing-parent fallback still routes directly from world to sink

### `engine/phaser/veins/graphBuilderUtils.test.ts` — Change

- Responsibility: verify sink-edge graph building.
- Required test logic:
  - replace source node fixtures with `sys_world`
  - assert created edge source is `sys_world`
- Contract:
  - no pool fixture exists

### `engine/phaser/veins/graphBuilderUtils.oneOff.test.ts` — Change

- Responsibility: verify depleted one-off sinks are skipped.
- Required test logic:
  - replace `pool_body` fixture with `sys_world`
  - preserve assertion that depleted zero-demand sinks do not produce graph edges
- Contract:
  - graph builder works with world-only supply model

### `engine/phaser/veins/GraphBuilder.nervousPassport.test.ts` — Change

- Responsibility: verify nervous routing eligibility.
- Required test logic:
  - keep passport nervous coverage
  - remove assignment-based duplicate eligibility assumptions from the fixture
- Contract:
  - passport tag is the only nervous eligibility mechanism

### `engine/phaser/veins/veinFlowProjection.test.ts` — Change

- Responsibility: verify non-nervous edge projection.
- Required test logic:
  - remove all `resource-upstream` fixtures and expectations
  - verify routed `resource-demand` chains still inherit terminal sink allocation and effective throttle
- Contract:
  - projection contains no upstream edge kind

### `engine/phaser/veins/veinFlowProjection.nervous.test.ts` — Change

- Responsibility: verify nervous-edge projection.
- Required test logic:
  - remove face-target blob-flow assertions
  - replace with passport-target nervous edges whose `deliveredRate` is `0` and whose `comfort01` follows `sys_world.state.comfort`
  - keep routed nervous-edge coverage through parents
- Contract:
  - nervous veins remain visible/comfort-driven but blobless

### `engine/phaser/veins/veinsDisplayBuilder.nervous.test.ts` — Change

- Responsibility: verify display-width and blob-rate behavior for nervous edges.
- Required test logic:
  - replace face entity ids with generic passport nervous entity ids
  - keep the idle/blobless assertion
  - keep the comfort-driven width assertion
- Contract:
  - the test no longer encodes face concepts

### `engine/phaser/display/DisplayDefinitionCatalog.test.ts` — Change

- Responsibility: verify built-in display registration.
- Required test logic:
  - keep the body-avatar glyph-free assertion
  - keep the attribute-display registration assertion
  - add explicit assertions that `face_avatar_body`, `face_avatar_mind`, and `face_avatar_social` are absent
- Contract:
  - face-avatar display definitions are gone, attribute displays remain

### `engine/phaser/display/avatar/AvatarSeedResolver.test.ts` — Change

- Responsibility: verify avatar seed fallback order.
- Required test logic:
  - remove `face.assignedEntityId` from fixtures and expected resolution paths
  - keep proxy, state assignment, runtime entity lookup, passport avatar key, and entity-id fallback coverage
- Contract:
  - the resolver never reads a `face` component

### `engine/phaser/display/modules/backgroundBandSelector.test.ts` — Change

- Responsibility: verify static fill-band selection.
- Required test logic:
  - remove `powerSource` fixture coverage
  - verify attribute color selection through `displayKey`-driven `attr_body`, `attr_mind`, `attr_social`
  - keep assignable and generic-node behavior
- Contract:
  - no removed runtime component participates in color resolution

### `engine/phaser/display/modules/BackgroundModule.test.ts` — Change

- Responsibility: verify background rendering behavior.
- Required test logic:
  - replace the current power-source-colored fixture with a display-key-colored fixture
  - keep attribute-display color assertion
- Contract:
  - no `powerSource` fixture remains

### `engine/compiler/abilities/spatialCompiler.test.ts` — Change

- Responsibility: verify `worldPresence` compilation.
- Required test logic:
  - keep non-body coverage unchanged
  - update the body-blueprint case to assert `isStatic: false`
  - add a case proving existing body physics are patched to `isStatic: false`
- Contract:
  - the body/non-body split is explicit and enforced

### `ui/runtime/world/selection/ConditionalActivationBasicCards.test.tsx` — Change

- Responsibility: verify conditional activation notice wiring.
- Required test logic:
  - remove the deleted `AttributePoolCard` case
  - keep display and resource card coverage
- Contract:
  - no deleted card imports remain

### `app-shell/useAppBootstrap.test.tsx` — Change

- Responsibility: verify bootstrap manifest behavior.
- Required test logic:
  - replace `example/core.bp` with any still-existing nested example file path
- Contract:
  - the test does not reference deleted example content

## 7.3 New or adjusted negative-path coverage required

Even where an existing test file already exists, the final test suite must include the following behavior coverage:

1. `AttributePoolSystem` does not emit pool lifecycle commands.
2. `EnergyDistributionSystem` behaves correctly when `sys_world` has zero aggregate power.
3. `GraphBuilder` never creates `resource-upstream` edges.
4. `GraphBuilder` never creates nervous edges for assignable non-passport entities.
5. `DisplayDefinitionCatalog` contains no face-avatar keys.
6. `spatialCompiler` leaves non-body `worldPresence` static behavior unchanged.

## 8. Implementation order

The implementation order is locked to minimize breakage.

### Phase 1 — Remove node-source dependency from simulation

1. Change `AttributePoolSystem.ts` to write `sys_world.state.power_*`.
2. Add default world-state keys in `caveWorldDefaults.ts`.
3. Change `energyDistributionDemandContext.ts` to read from `sys_world.state.power_*`.
4. Delete `poolLifecycle.ts` and remove all lifecycle usage.
5. Remove `powerSource` from schemas/types/clone/adapter/preview runtime.

Exit condition:

- simulation power works with no pool entities present.

### Phase 2 — Rebuild vein graph around `sys_world`

1. Remove pool-node collection and face helpers from `graphBuilderUtils.ts`.
2. Rewrite `graphBuilderEdges.ts` and `graphBuilderSinkEdges.ts` to route from `sys_world`.
3. Restrict `graphBuilderNervous.ts` to passport nervous tags only.
4. Remove `resource-upstream` from `types.ts` and `veinFlowProjection.ts`.
5. Simplify `nervousVeinFlow.ts` to comfort-only, zero-delivery nervous projection.

Exit condition:

- graph builder produces only world-rooted demand/nervous routes.

### Phase 3 — Excise face runtime model

1. Delete `data/schemas/game/face.ts` and `data/schemas/v2/faceDefaults.ts`.
2. Remove face fields from schemas/types/parser/adapter/preview runtime.
3. Remove face-avatar display keys and face-specific light logic.
4. Remove face fallbacks from `AvatarSeedResolver.ts`, `backgroundBandSelector.ts`, and `absorptionUtils.ts`.

Exit condition:

- no production runtime/schema/rendering code references the removed face model.

### Phase 4 — Content and sample cleanup

1. Delete `data/raw/example/modules/core.bp`.
2. Update `manifest.json` and `start.cvs`.
3. Update `core.cave` text.
4. Delete dead pool-only styles from `assets.art`.

Exit condition:

- example content loads and runs with no deleted files or concepts referenced.

### Phase 5 — Body physics correction

1. Change `spatialCompiler.ts` body behavior.
2. Update all affected tests.

Exit condition:

- compiled body blueprints are dynamic.

## 9. Acceptance criteria

The work is complete only when all of the following are true:

1. No production code path creates or references `pool_body`, `pool_mind`, or `pool_social` entities.
2. No production code path accepts, exports, serializes, parses, or reads a `face` component.
3. No production code path accepts, exports, serializes, parses, or reads a `powerSource` component.
4. `AttributePoolSystem` writes only `sys_world.state.power_body`, `power_mind`, and `power_social`.
5. `EnergyDistributionSystem` supply derives only from `sys_world.state.power_*`.
6. Vein graphs contain no `resource-upstream` edges.
7. Nervous routing is created only from passport nervous tags.
8. Nervous projection is comfort-driven and blobless.
9. Built-in face-avatar display definitions are absent.
10. Attribute display definitions remain present and unchanged for UI use.
11. `core.bp` is deleted and no content file references it.
12. Example startup script no longer spawns pool entities.
13. Compiled body blueprints with `worldPresence` are non-static.
14. All affected unit, integration, and view tests are green.

## 10. Explicit do-not-do list

The implementation must not:

- rename draft pools such as `pool_explore`
- rename attribute display keys `attr_body`, `attr_mind`, `attr_social`
- modify cave-eye rendering
- modify body-avatar art generation beyond removal of face-avatar display-key support
- add a hidden compatibility face component
- add hidden pool entities
- add an adapter layer that silently converts deleted components at runtime
- expand scope into unrelated cleanup

