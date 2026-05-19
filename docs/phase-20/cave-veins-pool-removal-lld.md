# LLD — Remove Persistent Nervous-Node Handling, Remove Attribute Pool Nodes, and Re-root Power Veins on Cave

## 1. Purpose

This document defines the low-level design for the remaining cleanup and model changes agreed for the current `src4` branch:

1. remove the persistent “nervous node” concept and all special-case routing attached to it
2. remove attribute pools as world entities and delete `core.bp`
3. make persistent power veins originate from `sys_world` (Cave)
4. preserve only the attribute display definitions (`attr_body`, `attr_mind`, `attr_social`) because they are still used throughout the UI
5. fix the still-open dynamic-body issue so navigating bodies actually move

This document is grounded in the current code and content .

---

## 2. Scope

## 2.1 In scope

This document covers:

- persistent vein graph generation
- power supply aggregation used by the energy system and status UI
- removal of attribute pool entities, content, and UI cards
- removal of authored `nervousVein` configuration and its compiler/editor path
- removal of `core.bp` from the example project and manifest
- update of authored onboarding/tutorial text that still refers to attribute pools
- fix for bodies spawned static when they must navigate
- all tests required to keep the branch within the project contract

## 2.2 Out of scope

This document does **not** cover:

- pointer-preview vein styling beyond preserving the existing pointer preview system
- habitus bubble work
- resource arcs / curved resource bars
- unrelated rename-only cleanup outside the files named below

---

## 3. Why the change is required

## 3.1 Persistent nervous-node handling is the wrong model

Current code facts:

- `engine/phaser/veins/graphBuilderNervous.ts` builds persistent `kind: "nervous"` graph edges from `sys_world` through explicit “nervous” routes
- `data/schemas/abilities/passport.ts` still exposes `nervousVein`
- `engine/compiler/abilities/passportCompiler.ts` still turns that flag into the reserved tag `sys:passport:nervous_vein`
- many example blueprints still author `_editor.abilities.passport.nervousVein`
- devtools still expose a “Nervous Vein” toggle in `ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx`

This is obsolete.

The current parent/child route rules already determine how persistent power veins travel through the world. The separate persistent nervous-node concept is redundant and produces incorrect behavior, including Cave → Pointer nervous routes.

Pointer nervous styling remains valid **only** as pointer-preview presentation, not as part of the persistent world vein graph.

## 3.2 Attribute pools are still implemented as real map nodes

Current code facts:

- `data/raw/example/modules/core.bp` defines `pool_body`, `pool_mind`, and `pool_social`
- `data/raw/example/scripts/start.cvs` still spawns those pool nodes
- `data/raw/example/manifest.json` still includes `modules/core.bp`
- `game/systems/AttributePoolSystem.ts` still writes aggregate totals into those nodes
- `game/systems/poolLifecycle.ts` still spawns/kills them dynamically
- `engine/phaser/veins/graphBuilderUtils.ts` still hardcodes `POOL_IDS`
- `engine/phaser/veins/graphBuilderEdges.ts` and `engine/phaser/veins/graphBuilderSinkEdges.ts` still use pools as the source endpoints for persistent power veins
- `ui/runtime/world/selection/selectionLensMap.ts` still exposes an `attribute-pool` lens
- `ui/runtime/world/selection/AttributePoolCard.tsx` and related files still render a pool card UI
- `ui/runtime/status/powerStatusUtils.ts` still reads supply from `powerSource` entities
- `engine/phaser/display/modules/backgroundBandSelector.ts` still uses `powerSource` to infer attribute coloring

This is now the wrong model.

Power veins need to start from Cave, not from three world nodes. The display definitions for `attr_body`, `attr_mind`, and `attr_social` remain, but the map entities and the `powerSource` entity concept must go.

## 3.3 The current branch still spawns navigating bodies as static

Current code facts:

- `engine/compiler/abilities/spatialCompiler.ts` still synthesizes `physics.isStatic = true` when a blueprint has `worldPresence` but no explicit `physics`
- many body blueprints rely on synthesized physics
- navigating bodies require dynamic impulse bodies

This causes the live bug where a body is in `assignmentStatus = "navigating"` but does not move.

---

## 4. Locked design decisions

## 4.1 Persistent vein graph model

Persistent world veins have only one route family:

- power/resource-demand veins

Persistent world veins do **not** have a separate nervous family.

Pointer-preview veins are scene-local presentation and remain outside the persistent graph.

## 4.2 Persistent power source

Persistent power veins originate from `sys_world` only.

There are no world entities for:

- `pool_body`
- `pool_mind`
- `pool_social`

## 4.3 Supply calculation

Attribute supply is still computed from bodies using the current contributor/exclusion logic, but it is no longer materialized into pool entities.

The current exclusion semantics remain:

- body ids assigned away from `sys_world` are excluded from global supply aggregation unless a later design explicitly changes that model

This LLD changes only the representation of supply, not the contributor rule.

## 4.4 Attribute icon/display assets

The following display definitions remain:

- `attr_body`
- `attr_mind`
- `attr_social`

These stay because they are used throughout UI text, icons, cards, and export/render tooling.

The pool-node-specific authored styles (`style_pool_body`, `style_pool_mind`, `style_pool_social`) are not part of that retained contract and must be removed if they are only used by deleted pool nodes.

## 4.5 Body navigation

Any body intended to navigate must have dynamic physics (`isStatic = false`).

The compiler must synthesize dynamic physics for body blueprints that rely on `worldPresence`.

---

## 5. High-level implementation plan

The work is completed in this order:

1. remove authored pool-node content (`core.bp`, manifest reference, spawn script references)
2. remove runtime systems and schemas that treat pools as entities
3. re-root persistent power-vein graph generation on `sys_world`
4. remove persistent nervous-route generation and authored `nervousVein` config
5. update UI/status/devtools paths that still expose pools or nervous-node authoring
6. update saves and authored tutorial text
7. fix body-physics synthesis for navigating bodies
8. update and add tests

This order is mandatory.

---

## 6. File-level design

## 6.1 Files to add

### `game/systems/body/bodySupplyTotals.ts`

**Responsibility**

Provide the neutral aggregate body-supply calculation currently buried under the face-folder implementation.

**Logic**

- move the current body attribute total calculation out of `game/systems/face/faceTotals.ts`
- keep the existing health-efficiency rule
- return totals for `body`, `mind`, and `social`

**Interface**

Exports a pure function that accepts `Array<RuntimeEntity & { body: BodyComponent }>` and returns `AttributeTotals`.

This file is required so the attribute-pool removal does not leave supply aggregation stranded in the obsolete face folder.

---

## 6.2 Files to change

### `engine/compiler/abilities/spatialCompiler.ts`

**Responsibility**

Compile authored world-presence ability into runtime spatial and physics components.

**Required change**

- when synthesizing physics for a blueprint that has tag `body`, create dynamic physics with `isStatic = false`
- preserve the current static default for non-body world entities
- do not change authored explicit physics values

**Interface after change**

- body blueprints with only `worldPresence` receive synthesized dynamic physics
- non-body blueprints keep the current default static behavior

---

### `data/raw/example/manifest.json`

**Responsibility**

Define the example project file list.

**Required change**

- remove `modules/core.bp` from the `files` array

**Interface after change**

The example manifest contains no reference to `core.bp`.

---

### `data/raw/example/scripts/start.cvs`

**Responsibility**

Define the authored start sequence for the example project.

**Required change**

- remove the three pool spawn commands:
  - `game.spawn pool_body pool_body`
  - `game.spawn pool_mind pool_mind`
  - `game.spawn pool_social pool_social`

**Interface after change**

The start script loads the project, spawns the starting body/entities that still exist, and runs the simulation. It never spawns attribute pool nodes.

---

### `data/raw/example/modules/assets.art`

**Responsibility**

Provide authored display assets and styles used by the example project.

**Required change**

- keep the display definitions and glyph/style assets for:
  - `attr_body`
  - `attr_mind`
  - `attr_social`
- remove `style_pool_body`, `style_pool_mind`, and `style_pool_social` if they are only referenced by deleted pool entities

**Interface after change**

Attribute icon/display definitions remain available everywhere. Pool-node-only authored styles are removed.

---

### `game/main.ts`

**Responsibility**

Register active game systems.

**Required change**

- remove `AttributePoolSystem` import and registration

**Interface after change**

The runtime no longer contains a system that materializes attribute totals into pool entities.

---

### `game/systems/energy/energyDistributionDemandContext.ts`

**Responsibility**

Build the supply and demand context consumed by `EnergyDistributionSystem`.

**Required change**

- stop reading supplies from `powerSource` entities
- compute supplies directly from body contributors using the existing body-contributor exclusion logic and the new `bodySupplyTotals.ts` helper
- keep sink demand, throttling, and ancestor master-throttle behavior unchanged

**How**

- replace the current `for each entity with powerSource` supply accumulation path
- collect eligible bodies using the same exclusion rules currently used for pools
- aggregate their attributes into supply totals

**Interface after change**

`buildDemandContext(...)` returns the same shape as before, but `supplies` comes from bodies directly and no longer depends on pool entities.

---

### `ui/runtime/status/powerStatusUtils.ts`

**Responsibility**

Provide power usage/supply totals for status UI.

**Required change**

- stop reading `supply` from `powerSource` entities
- compute supply totals using the same body-driven aggregation rule used by `energyDistributionDemandContext.ts`
- keep demand/used totals derived from sinks as they are today

**Interface after change**

`resolvePowerTotals(...)` still returns `{ used, supply }`, but `supply` is body-derived and no longer depends on map entities.

---

### `engine/phaser/veins/graphBuilderUtils.ts`

**Responsibility**

Provide shared helpers for building the persistent vein graph.

**Required change**

- remove `POOL_IDS`
- remove `DEMAND_TAGS`
- remove `FACE_ATTRIBUTES`
- remove `resolveFaceAttribute(...)`
- remove `isFaceEntity(...)`
- remove pool-node collection logic
- keep only the generic node-lookup / node-add helpers still needed by the persistent graph
- make `buildVeinGraph(...)` seed from `sys_world` only

**Interface after change**

This file no longer knows anything about pools, faces, swarm, or nervous-route special cases.

---

### `engine/phaser/veins/graphBuilderEdges.ts`

**Responsibility**

Build persistent power/resource edges.

**Required change**

- remove `addFaceEdges(...)`
- remove all pool-node-specific route construction
- change demand-edge construction so every attribute route starts at `sys_world` and then follows parent/child routing to the sink
- preserve per-attribute edges (`body`, `mind`, `social`)

**Interface after change**

This file builds only persistent power/resource-demand edges rooted at Cave.

---

### `engine/phaser/veins/graphBuilderSinkEdges.ts`

**Responsibility**

Build routed sink edges for the persistent graph.

**Required change**

- replace the `poolNodes` source argument with a single `worldNode` source
- keep ancestor-path routing from parent/child rules
- keep `drawFraction` propagation unchanged

**Interface after change**

`addSinkDemandEdge(...)` accepts Cave as the source node and no longer depends on pool-node lookup.

---

### `engine/phaser/veins/GraphBuilder.ts`

**Responsibility**

Own the persistent vein graph build entry point.

**Required change**

- no API change
- build path must now produce only Cave-rooted power/resource-demand edges
- do not call any nervous-route builder

**Interface after change**

Unchanged public interface. Changed internal contract: persistent graph contains no nervous edges.

---

### `engine/phaser/veins/types.ts`

**Responsibility**

Define persistent vein graph types.

**Required change**

- remove `"nervous"` from `VeinAttribute`
- remove `"nervous"` from `VeinEdgeKind`

**Interface after change**

Persistent graph types represent only power/resource-demand edges.

---

### `engine/phaser/veins/veinFlowProjection.ts`

**Responsibility**

Project runtime flow values onto persistent graph edges.

**Required change**

- remove the `nervous` attribute branch
- remove the `readComfort01(...)` / `resolveNervousDeliveredRate(...)` special path
- preserve resource-demand projection for `body`, `mind`, and `social`

**Interface after change**

Flow projection handles only power/resource-demand edges.

---

### `engine/phaser/veins/veinsDisplayBuilder.ts`

**Responsibility**

Convert the persistent vein graph into display edges.

**Required change**

- remove nervous-width special handling
- preserve draw-fraction-based width for persistent power/resource-demand edges

**Interface after change**

Persistent display edges are built only for `body`, `mind`, and `social` routes.

---

### `engine/compiler/abilities/passportCompiler.ts`

**Responsibility**

Compile authored passport ability settings into runtime/editor blueprint state.

**Required change**

- remove `PASSPORT_NERVOUS_VEIN_TAG` handling entirely
- keep permanent-tag behavior unchanged
- keep parent compilation behavior unchanged

**Interface after change**

Passport compilation supports label, icon, glyph, description, style, parent, and permanent. It does not support `nervousVein`.

---

### `data/schemas/abilities/passport.ts`

**Responsibility**

Define authored passport ability schema.

**Required change**

- remove `PASSPORT_NERVOUS_VEIN_TAG`
- remove `nervousVein` from `PassportAbilitySchema`
- keep `permanent` and `parent`

**Interface after change**

Authored passport ability schema contains no nervous-vein field.

---

### `ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx`

**Responsibility**

Render the authored passport ability editor.

**Required change**

- remove the `BooleanField` for `nervousVein`
- keep all other controls unchanged

**Interface after change**

The passport editor exposes no nervous-vein toggle.

---

### `ui/devtools/editors/blueprint/visuals/blueprintVisualsActionUtils.ts`

**Responsibility**

Create/update draft passport visual defaults.

**Required change**

- remove `nervousVein` from the default passport draft object

**Interface after change**

Default passport draft objects no longer include a nervous-vein field.

---

### `ui/devtools/editors/blueprint/visuals/blueprintVisualsAssetDraft.ts`

**Responsibility**

Read/ensure visual authoring drafts for passport assets.

**Required change**

- remove `nervousVein` from the fallback passport draft object

**Interface after change**

Fallback passport drafts no longer include a nervous-vein field.

---

### `ui/runtime/world/selection/selectionLensMap.ts`

**Responsibility**

Select the correct selection card for a runtime entity.

**Required change**

- remove the `attribute-pool` lens entirely
- remove `isAttributePoolEntity(...)`
- keep other active lenses unchanged

**Interface after change**

There is no selection path for attribute pools because attribute pools are no longer world entities.

---

### `engine/phaser/display/modules/backgroundBandSelector.ts`

**Responsibility**

Choose fill-band colors for world entities.

**Required change**

- remove the `powerSource`-based attribute resolution branch
- keep storage and cycle-based behavior unchanged
- do not use this module to infer attribute type from deleted pool entities

**Interface after change**

Band selection no longer depends on `powerSource` entities.

---

### `data/raw/example/modules/core.cave`

**Responsibility**

Provide authored Cave content, guidance text, and tutorial text for the example project.

**Required change**

- remove or rewrite any authored text that explicitly describes attribute pools as map nodes
- preserve all guidance that still correctly refers to Cave attributes and body attributes

**Minimum required authored text changes**

Update the tutorial/help content that currently says power comes from “attribute pools” so it instead says power comes from Cave and its bodies.

**Interface after change**

Authored tutorial/help text matches the runtime model. It does not teach a deleted pool-node concept.

---

### `app-shell/useAppBootstrap.test.tsx`

**Responsibility**

Verify bootstrap import behavior.

**Required change**

- remove the expectation that bootstrap file discovery includes `example/core.bp`
- keep manifest import behavior unchanged

**Interface after change**

Bootstrap tests reflect the example project without `core.bp`.

---

### `engine/runtime/handlers/SpawnHandler.body.test.ts`

**Responsibility**

Verify spawn behavior for body entities.

**Required change**

- replace the old expectation that bodies do not get impulse bodies
- assert that body entities with compiled physics are registered as dynamic impulse bodies

**Interface after change**

This test enforces the navigating-body fix.

---

### `engine/compiler/abilities/spatialCompiler.test.ts`

**Responsibility**

Verify world-presence compilation.

**Required change**

- keep non-body expectations unchanged
- add/replace body-blueprint expectations so synthesized body physics are dynamic (`isStatic = false`)

**Interface after change**

Tests enforce different defaults for body vs non-body world entities.

---

### `engine/phaser/display/DisplayDefinitionCatalog.ts`

**Responsibility**

Register display definitions.

**Required change**

- keep `attr_body`, `attr_mind`, `attr_social`
- do not remove the display definitions that the UI still uses
- no change to the public keys of those definitions

**Interface after change**

Attribute display definitions remain available everywhere, even though pool entities are deleted.

---

## 6.3 Files to delete

### `data/raw/example/modules/core.bp`

Reason: this file is the authored definition of the deleted attribute pool nodes.

---

### `game/systems/AttributePoolSystem.ts`

Reason: attribute totals are no longer materialized into world entities.

---

### `game/systems/poolLifecycle.ts`

Reason: attribute pool nodes are removed and no longer need lifecycle management.

---

### `engine/phaser/veins/graphBuilderNervous.ts`

Reason: persistent nervous-route generation is deleted entirely.

---

### `engine/phaser/veins/nervousVeinFlow.ts`

Reason: persistent graph no longer contains nervous edges, so nervous delivered-rate projection is obsolete.

---

### `ui/runtime/world/selection/AttributePoolCard.tsx`
### `ui/runtime/world/selection/AttributePoolCardView.tsx`
### `ui/runtime/world/selection/attributePoolCardHydration.ts`
### `ui/runtime/world/selection/resolveAttributePoolCardData.ts`

Reason: attribute pool nodes no longer exist as world entities and therefore need no selection card.

---

### `game/systems/face/faceTotals.ts`

Reason: aggregate body totals must move to a neutral body-supply helper and no longer live in the face folder.

---

## 6.4 Content files to change

Remove `_editor.abilities.passport.nervousVein` from the following authored blueprints:

- `data/raw/example/modules/absorption.bp`
- `data/raw/example/modules/butcher.bp`
- `data/raw/example/modules/buycoinchest.bp`
- `data/raw/example/modules/coinchest.bp`
- `data/raw/example/modules/daylabor.bp`
- `data/raw/example/modules/egg.bp`
- `data/raw/example/modules/explore.bp`
- `data/raw/example/modules/foraging.bp`
- `data/raw/example/modules/gatherwood.bp`
- `data/raw/example/modules/hearth.bp`
- `data/raw/example/modules/hommlet.bp`
- `data/raw/example/modules/inside.bp`
- `data/raw/example/modules/investigate_accountant.bp`
- `data/raw/example/modules/investigate_accountant_2.bp`
- `data/raw/example/modules/kidnap_accountant.bp`
- `data/raw/example/modules/kidnap_hommlet_merchant.bp`
- `data/raw/example/modules/larder.bp`
- `data/raw/example/modules/lodging_hommlet.bp`
- `data/raw/example/modules/lure_accountant.bp`
- `data/raw/example/modules/lure_homlet_native.bp`
- `data/raw/example/modules/lure_hommlet_merchant.bp`
- `data/raw/example/modules/luretraveler.bp`
- `data/raw/example/modules/merchant_of_hommlet.bp`
- `data/raw/example/modules/newbody.bp`
- `data/raw/example/modules/outside.bp`
- `data/raw/example/modules/sell_wood.bp`
- `data/raw/example/modules/slave_market.bp`
- `data/raw/example/modules/slave_uprising.bp`
- `data/raw/example/modules/tax_office.bp`
- `data/raw/example/modules/trading_post.bp`
- `data/raw/example/modules/trick_accountant.bp`
- `data/raw/example/modules/understanding/do_locals_know_of_me.bp`
- `data/raw/example/modules/understanding/does_patriarchy_know_of_me.bp`
- `data/raw/example/modules/understanding/how_big_can_i_get.bp`
- `data/raw/example/modules/understanding/how_did_i_come_to_be.bp`
- `data/raw/example/modules/understanding/how_hard_can_i_go.bp`
- `data/raw/example/modules/understanding/what_am_i.bp`
- `data/raw/example/modules/woodstorage.bp`

**Responsibility**

These files are authored example content.

**Required change**

Remove the obsolete authored field only. Do not change unrelated authored content in these files.

---

### `data/raw/saves/1.json`
### `data/raw/saves/2.json`
### `data/raw/saves/autosave.json`

**Responsibility**

Bundled save fixtures.

**Required change**

- remove `pool_body`, `pool_mind`, `pool_social`
- remove any `powerSource` world entities
- remove any persistent graph edges sourced from deleted pools
- remove any persistent nervous edges
- remove any references to `sys_swarm` that exist only because of deleted persistent graph/pool behavior

**Interface after change**

Bundled saves serialize only live world entities and live persistent vein graph structures.

---

## 7. Testing design

Tests must remain colocated and must follow the uploaded testing standard.

## 7.1 Unit tests to add or change

### `engine/compiler/abilities/spatialCompiler.test.ts`

Add/adjust cases to assert:

- synthesized non-body physics remain static
- synthesized body physics are dynamic
- authored explicit body physics are preserved

### `engine/runtime/handlers/SpawnHandler.body.test.ts`

Replace old body cleanup expectations with:

- spawned body with compiled physics is registered in the impulse engine
- spawned body keeps a physics component on the entity

### `engine/phaser/veins/GraphBuilder.test.ts`

Replace pool-based expectations with:

- persistent power/resource-demand edges begin at `sys_world`
- no edge references `pool_body`, `pool_mind`, or `pool_social`
- no persistent edge kind `nervous` exists

### `engine/phaser/veins/GraphBuilder.parentRouting.test.ts`

Update expectations so:

- parent routing still works for power/resource-demand edges
- there are no nervous-route assertions

### `engine/phaser/veins/graphBuilderUtils.test.ts`
### `engine/phaser/veins/graphBuilderUtils.oneOff.test.ts`

Rewrite to cover only the helpers that remain after pool/face/nervous removal.

### `game/systems/EnergyDistributionSystem.test.ts`

Rewrite supply fixtures so they use body contributors instead of pool entities.

### `game/systems/PowerSinkThrottle.integration.test.ts`

Rewrite supply fixtures so they use body contributors instead of pool entities.

### `game/systems/luretravelerCycle.integration.test.ts`

Remove explicit pool-entity fixture setup and use body contributors only.

### `ui/runtime/world/selection/selectionLensMap.test.ts`

Add or update expectations so no attribute-pool lens exists.

### `ui/runtime/world/selection/AttributePoolCard.test.tsx`

Delete.

### `engine/compiler/abilities/passportCompiler.test.ts`

Remove nervous-vein expectations.

### `ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.nervous.test.tsx`

Delete or replace with a test that asserts the field is absent.

### `app-shell/useAppBootstrap.test.tsx`

Update file-list expectations so `example/core.bp` is not present.

---

## 7.2 Integration tests to add

### `game/systems/energy/energyDistributionDemandContext.integration.test.ts`

New integration test.

Verify:

- supply totals are computed from real bodies using the current exclusion rules
- assigned-away bodies are excluded from the aggregate supply
- no pool entity is required for the energy context to function

### `ui/runtime/status/powerStatusUtils.integration.test.ts`

New integration test.

Verify:

- `resolvePowerTotals(...)` reports supply totals from bodies directly
- deleting all pool entities has no effect on status totals because the function no longer depends on them

---

## 7.3 Tests to delete

Delete these because the subject under test is removed:

- `game/systems/AttributePoolSystem.exclusion.test.ts`
- `game/systems/poolLifecycle.test.ts`
- `engine/phaser/veins/GraphBuilder.nervousPassport.test.ts`
- `engine/phaser/veins/veinFlowProjection.nervous.test.ts`
- `engine/phaser/veins/veinsDisplayBuilder.nervous.test.ts`
- `ui/runtime/world/selection/AttributePoolCard.test.tsx`
- `ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.nervous.test.tsx`

---

## 8. Acceptance criteria

The work is complete only when all of the following are true:

1. `core.bp` is deleted and removed from the example manifest.
2. `start.cvs` spawns no attribute pool entities.
3. No runtime system creates or manages pool entities.
4. Persistent power veins originate from `sys_world`.
5. Persistent nervous edges do not exist.
6. Pointer-preview nervous styling still works independently of the persistent graph.
7. No authored `nervousVein` field remains in schema, compiler, editor UI, or example content.
8. No selection/UI path remains for attribute pool entities.
9. Attribute icon/display definitions `attr_body`, `attr_mind`, and `attr_social` still render correctly everywhere.
10. Navigating bodies spawned from `worldPresence` move because their synthesized physics are dynamic.
11. Updated tests pass and deleted tests are removed.

