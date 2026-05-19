# Low-Level Design: verified fixes for quest support feature regressions and contract gaps

## 1. Purpose

This document defines the exact low-level design for fixing the verified defects and contract gaps in the current implementation of the quest support feature set.

This document is intentionally narrow.

It fixes only the issues verified in the uploaded code:

1. incorrect cycle-dependency semantics when authored triggers include both `cycle_complete` and `assignment_complete`
2. incorrect vein flow projection for parent-routed power edges
3. incorrect vein flow projection for parent-routed nervous edges
4. runtime parent card logic living inside `.tsx`, plus parent-card behavior drifting from the required semantics
5. stale local slider state in `useParentMasterThrottle`
6. missing loud logging on detected parent ancestry cycles
7. validation gaps for assignment minimum numeric finiteness and authored `forcedHabiti` uniqueness
8. missing or insufficient tests for the corrected behaviors above

This document does not restate or re-open already-correct behavior.

## 2. Why this change exists

### 2.1 Trigger dependency validation is currently wrong

The current helpers treat the presence of `assignment_complete` as meaning that cycle is not required.

That is incorrect.

The correct rule is:

- cycle is required when any authored entry includes `cycle_complete`
- cycle is not required when an authored entry uses only `assignment_complete`
- an entry that includes both trigger kinds still requires cycle because it still includes `cycle_complete`

This defect currently affects both compile-time warnings and editor validation.

### 2.2 Routed vein projection is currently wrong

Parent routing was added to graph construction, but the projection layer still reads rate and throttle from the immediate edge target as if every edge terminates at the final sink.

That is only correct for direct edges.

It is incorrect for parent-routed chains, where intermediate edges terminate at ancestors rather than the final sink.

As a result:

- intermediate power route segments can project zero or incorrect `deliveredRate`
- intermediate power route segments can project the wrong `throttle01`
- parent-routed nervous edges beyond the first hop can project zero even when the terminal target should carry nervous flow

### 2.3 The parent runtime card does not follow the architecture laws

The current `RuntimeParentSection.tsx` performs non-trivial data derivation directly inside a React component.

That violates the project rule that UI components render only and do not host business logic.

The current section also drifts from the required behavior:

- it renders for entities that merely have a parent, not only for entities that have children
- it shows only the child's own throttle percentage, not both own and effective throttle
- it aggregates child demand from `baseDemand * throttles` instead of showing current realized child draw
- it rescans all runtime entities during render and recomputes ancestry repeatedly

### 2.4 The parent throttle hook keeps stale shadow state

`useParentMasterThrottle` seeds local state once from `initialValue` and never resynchronizes it from runtime state.

When the selected entity changes or runtime state changes externally, the UI can display the wrong slider value.

That is not allowed under the single-source-of-truth rules.

### 2.5 Validation is still below the authored contract

Two authored-data guarantees are not currently enforced at schema level:

- assignment minimum `required` values must be finite and `>= 0`
- authored `forcedHabiti` values must be unique after normalization

Those guarantees must be enforced where the authored data is parsed, not only tolerated later in runtime logic.

### 2.6 Test coverage is not sufficient for the new risk surface

The highest-risk corrected behaviors are either untested or tested only shallowly:

- mixed-trigger cycle dependency semantics
- parent-routed power projection
- parent-routed nervous projection
- parent-card rendering semantics and slider synchronization
- spawn extras runtime tests
- schema validation for the new authored-data guarantees

## 3. Scope

## 3.1 In scope

1. trigger dependency helper fixes
2. parent cycle logging in ancestry helpers
3. parent-routed vein projection fixes
4. parent section architectural cleanup and semantic correction
5. parent slider synchronization fix
6. schema validation tightening for verified gaps
7. tests for all corrected behavior

## 3.2 Out of scope

1. any new gameplay feature
2. any change to assignment completion semantics
3. any change to spawn-time parent semantics beyond validation and tests
4. any change to filter or minimum feature surface beyond validation and tests
5. any new general-purpose re-parenting system
6. any non-essential UI redesign
7. any file moves outside the corrected parent-card hook extraction
8. any unrelated technical debt or broad refactor

## 4. Contract and standards that govern this work

1. ECS world remains the single source of truth
2. no new runtime mutation path is introduced
3. React components render only; derivation moves to hooks or pure helpers
4. fixes must use existing helpers and mechanisms where those mechanisms already exist
5. tests must follow Given/When/Then and verify behavior, not implementation details
6. no unrelated files are changed

## 5. Final design decisions

## 5.1 Cycle dependency semantics

The project will keep the existing authored trigger surface.

No trigger schema changes are made.

The only semantic correction is this:

- `requiresCycleTrigger(triggers)` returns `true` when `triggers` includes `cycle_complete`
- `requiresCycleAbility(entries)` returns `true` when any entry includes `cycle_complete`

No helper may infer cycle absence merely from the presence of `assignment_complete`.

## 5.2 Parent ancestry helpers remain the source of truth for hierarchy traversal

The existing parent traversal helpers stay in place.

They are corrected, not replaced.

Traversal rules are:

- missing parent target contributes no additional ancestry
- repeated id terminates traversal immediately
- repeated id emits explicit error logging once per traversal
- returned ancestry remains deterministic

## 5.3 Vein projection uses terminal target semantics for routed paths

Graph topology remains the source of route structure.

Projection must not duplicate routing rules.

Instead, projection resolves the terminal semantic target of each routed chain directly from the already-built graph.

For power demand edges:

- every `resource-demand` segment in one routed chain projects the terminal sink's realized draw for that attribute
- every `resource-demand` segment in one routed chain projects the terminal sink's effective throttle
- `resource-upstream` edges continue to aggregate descendant projected rates

For nervous edges:

- every nervous segment in one routed chain projects the terminal target's nervous delivery
- terminal nervous delivery remains based on the final target entity, not on intermediate ancestors
- world-to-swarm behavior remains unchanged

## 5.4 Effective throttle is computed once and reused

The effective throttle for a sink remains:

- clamped sink throttle
- multiplied by the ancestor master throttle product

No UI component may recompute that differently.

The parent section and vein projection must both consume the same effective-throttle semantics.

## 5.5 Parent section becomes render-only

`RuntimeParentSection.tsx` remains the view component, but all data derivation moves out of the component.

The section renders only when the selected entity has children.

It does not render merely because the selected entity has a parent.

The section surface is:

- aggregate current child draw by attribute
- parent master throttle slider
- child icon strip
- one row per child showing:
  - child label
  - child own throttle
  - child effective throttle
  - child current allocated draw summary by attribute

The section does not display a parent-only summary for selected child entities.

## 5.6 Parent slider state follows runtime state

`useParentMasterThrottle` remains the command-emitting hook for the slider.

It is changed to follow the same state-synchronization pattern already used by `usePowerSinkThrottle`.

Rules:

- missing runtime state displays as `1`
- runtime changes overwrite local view state unless there is an unresolved local pending update
- selected entity changes immediately resync the hook state
- paused-runtime behavior remains unchanged

## 5.7 Authored validation is tightened where the authored data is parsed

The schema layer is corrected instead of relying on runtime cleanup.

Rules:

- assignment minimum `required` values must reject `NaN`, `Infinity`, and `-Infinity`
- `forcedHabiti` must reject duplicates after trim normalization
- no runtime behavior changes are introduced for valid authored data

## 6. File-by-file design

## 6.1 Schema changes

### Change: `data/schemas/assignmentRules.ts`

Responsibility:

- define the canonical authored and runtime shapes for assignment filter and minimum rules
- enforce numeric validity for minimum thresholds

Logic:

- keep the existing discriminated-union structure unchanged
- tighten `required` validation so the accepted domain is finite numbers `>= 0`
- do not change field names or rule kinds

Interface:

- `AssignmentMinimumRuleSchema` continues to expose the same two rule kinds and the same field names
- parse now rejects non-finite numeric values

### Change: `data/schemas/abilities/spawner.ts`

Responsibility:

- validate authored spawn-time extras

Logic:

- keep the existing authored field names unchanged
- add normalization-aware uniqueness validation for `forcedHabiti`
- normalization is trim-only for validation purposes
- empty ids remain invalid as today

Interface:

- `SpawnerAbilitySchema` keeps the same authored fields
- parse now rejects duplicate `forcedHabiti` entries after trim normalization

## 6.2 Trigger dependency fixes

### Change: `engine/compiler/abilities/requiresCycleTrigger.ts`

Responsibility:

- decide whether an authored trigger array requires cycle state semantics

Logic:

- replace the current negative test for `assignment_complete`
- return `true` exactly when `cycle_complete` is present
- default semantics remain `cycle_complete` when the field is absent

Interface:

- function name and signature remain unchanged
- return value semantics are corrected

### Change: `engine/compiler/validation/abilityTriggerValidation.ts`

Responsibility:

- decide whether authored ability entry collections require a Cycle ability

Logic:

- replace the current negative test for `assignment_complete`
- return `true` when any entry includes `cycle_complete`
- return `false` only when every relevant entry omits `cycle_complete`

Interface:

- function name and signature remain unchanged
- return value semantics are corrected

## 6.3 Parent traversal and projection fixes

### Change: `game/systems/energy/parentThrottle.ts`

Responsibility:

- resolve ancestor master throttle products
- derive child collections by parent id
- guard illegal parent cycles loudly

Logic:

- keep `resolveAncestorMasterThrottle` and `collectChildrenByParent` as the public helpers
- when repeated ancestry ids are encountered, stop traversal immediately and emit explicit error logging
- keep missing parent entries equivalent to multiplier `1`
- do not change the helper return types

Interface:

- `resolveAncestorMasterThrottle(entities, entityId): number`
- `collectChildrenByParent(entities): Map<string, RuntimeEntity[]>`

### Change: `engine/phaser/veins/parentVeinRouting.ts`

Responsibility:

- resolve ordered parent ancestry for graph construction
- guard illegal parent cycles loudly

Logic:

- keep the existing `resolveAncestorPath` surface
- preserve the current ordered path output
- emit explicit error logging when a repeated id is encountered before stopping traversal

Interface:

- `resolveAncestorPath(source, entityId): string[]`

### Change: `engine/phaser/veins/veinFlowProjection.ts`

Responsibility:

- project delivered rate and throttle onto already-built vein edges

Logic:

- keep graph traversal recursive and deterministic
- add terminal-target resolution for `resource-demand` chains
- for a `resource-demand` edge, find the final descendant demand target for the same attribute and use that sink entity for both:
  - `deliveredRate`
  - `throttle01`
- effective throttle must be computed with the same sink-throttle and ancestor-throttle semantics already used by `buildDemandContext`
- `resource-upstream` aggregation remains descendant-rate summation
- cycle detection inside projection remains explicit and logged

Interface:

- `projectVeinEdgeFlow(graph, entities): void`
- no external shape changes to `VeinGraph` or `VeinEdge`

### Change: `engine/phaser/veins/nervousVeinFlow.ts`

Responsibility:

- resolve nervous delivery for a projected nervous edge

Logic:

- keep existing world-comfort behavior unchanged
- keep world-to-swarm behavior unchanged
- remove the assumption that only direct `sys_world -> terminal` nervous edges can carry flow
- resolve the final nervous target of the current routed chain and base delivered rate on that final target
- if the final target is not a face, delivered rate remains `0`

Interface:

- `resolveNervousDeliveredRate(edge, entityById, graph): number` becomes the nervous projection entry point used by `veinFlowProjection.ts`
- `graph` is used only to resolve the terminal routed nervous target
- no external behavior changes outside corrected routed projection

## 6.4 Parent runtime card fixes

### Add: `ui/runtime/world/selection/components/useParentSectionData.ts`

Responsibility:

- derive all runtime data needed by `RuntimeParentSection`
- keep business logic out of `.tsx`

Logic:

- read the full runtime entity list once per evaluation
- derive children with `collectChildrenByParent`
- derive each child's effective throttle with `resolveAncestorMasterThrottle`
- derive each child's own throttle from `powerSink.throttle`, defaulting to `1`
- derive each child's current draw summary from `powerSink.allocatedDraw`, defaulting missing values to `0`
- derive aggregate child draw as the sum of child `allocatedDraw` values by attribute
- derive parent master throttle from selected entity state, defaulting missing state to `1`
- return `hasChildren = false` when the selected entity has no children

Interface:

- `useParentSectionData(entityId, runtime)` returns:
  - `hasChildren: boolean`
  - `masterThrottle: number`
  - `aggregateAllocatedDraw: { body: number; mind: number; social: number }`
  - `children: Array<{ id: string; label: string; ownThrottle: number; effectiveThrottle: number; allocatedDraw: { body: number; mind: number; social: number } }>`

### Change: `ui/runtime/world/selection/components/RuntimeParentSection.tsx`

Responsibility:

- render the parent summary UI only

Logic:

- remove all runtime derivation logic from the component
- consume `useParentSectionData`
- render nothing when `hasChildren` is `false`
- keep the existing child icon strip component if it still matches the rendered UI
- render aggregate child draw by attribute
- render the parent master throttle slider
- render per-child rows showing own throttle, effective throttle, and current draw summary
- stop rendering the current `Parent` row for entities that merely have a parent

Interface:

- component props remain unchanged:
  - `entityId: string`
  - `runtime: Runtime | null`

### Change: `ui/runtime/world/selection/components/useParentMasterThrottle.ts`

Responsibility:

- provide the controlled slider state and command emission for `parent_master_throttle`

Logic:

- remove one-time initialization semantics
- synchronize local state from runtime state in the same way `usePowerSinkThrottle` synchronizes sink throttle
- keep clamp range `[0, 1]`
- keep `UPDATE_STATE` as the emitted command
- keep paused-runtime flush behavior unchanged

Interface:

- hook name and return shape remain unchanged:
  - `targetThrottle`
  - `updateThrottle`
- the `initialValue` parameter is removed
- the hook resolves the current value from runtime state directly

## 6.5 Test changes

### Add: `engine/compiler/abilities/requiresCycleTrigger.test.ts`

Responsibility:

- unit-test the corrected trigger dependency helper

Logic:

- verify cycle-only returns `true`
- verify assignment-only returns `false`
- verify combined triggers return `true`
- verify missing triggers use the default cycle semantics

Interface:

- no production interface change

### Add: `engine/compiler/validation/abilityTriggerValidation.test.ts`

Responsibility:

- unit-test collection-level cycle dependency semantics

Logic:

- verify a collection of assignment-only entries does not require cycle
- verify a collection containing any cycle-triggered entry does require cycle
- verify a mixed-trigger entry still requires cycle

Interface:

- no production interface change

### Change: `data/schemas/schemas.test.ts`

Responsibility:

- verify the tightened authored validation rules

Logic:

- add a case proving assignment minimum schemas reject non-finite `required`
- add a case proving spawner authored data rejects duplicate `forcedHabiti` after trim normalization
- keep existing schema tests intact

Interface:

- no production interface change

### Change: `engine/phaser/veins/veinFlowProjection.test.ts`

Responsibility:

- verify power projection for parent-routed chains

Logic:

- add a routed-chain case where a terminal child sink receives allocated draw through one or more ancestors
- assert every demand segment in that chain receives the terminal sink's projected rate
- assert every demand segment in that chain receives the terminal sink's effective throttle
- keep existing direct-edge coverage intact

Interface:

- no production interface change

### Change: `engine/phaser/veins/veinFlowProjection.nervous.test.ts`

Responsibility:

- verify nervous projection for parent-routed chains

Logic:

- add a routed-chain case where `sys_world` connects to a face through one or more parents
- assert every nervous segment in that chain projects the terminal face's cave attribute output
- keep the existing non-face zero-flow behavior intact

Interface:

- no production interface change

### Change: `engine/phaser/veins/GraphBuilder.test.ts`

Responsibility:

- verify parent-routed graph topology still exists after the projection fix

Logic:

- add one nervous parent-route topology assertion
- add one power parent-route topology assertion
- assert unparented entities still use direct routes

Interface:

- no production interface change

### Change: `ui/runtime/world/selection/components/RuntimeParentSection.test.tsx`

Responsibility:

- verify corrected parent-section semantics and slider synchronization

Logic:

- assert the section renders only when the selected entity has children
- assert the section does not render for a child entity that merely has a parent
- assert child rows show own throttle, effective throttle, and current draw summary
- assert rerendering with updated runtime state updates the displayed slider value

Interface:

- no production interface change

### Change: `engine/runtime/systems/behavior/ActionExecutor.actions.test.ts`

Responsibility:

- close the missing runtime test coverage for spawn extras

Logic:

- add a case proving `SPAWN` resolves `parentId: self` to the current entity id
- add a case proving `SPAWN_BODY` resolves `parentId: self` and forwards `forcedHabiti`

Interface:

- no production interface change

### Change: `engine/runtime/handlers/SpawnHandler.test.ts`

Responsibility:

- close the missing runtime test coverage for spawn handler extras

Logic:

- add a case proving payload `parentId` overrides any blueprint-authored parent component
- add a case proving body spawn forwards `forcedHabiti` into identity assignment
- add a case proving non-body spawn safely ignores `forcedHabiti`

Interface:

- no production interface change

## 7. Exact corrected semantics

## 7.1 Trigger dependency semantics

For authored abilities that expose `triggers`:

- `triggers = ["cycle_complete"]` requires Cycle ability support
- `triggers = ["assignment_complete"]` does not require Cycle ability support
- `triggers = ["cycle_complete", "assignment_complete"]` requires Cycle ability support

This rule applies consistently to:

- compiler warnings driven by `requiresCycleTrigger`
- editor validation driven by `requiresCycleAbility`

## 7.2 Power projection semantics for routed parent chains

For a routed demand chain for one attribute:

- the terminal sink is the final descendant node reached by following same-attribute `resource-demand` edges
- every `resource-demand` edge in that chain uses that terminal sink for projection
- `deliveredRate` is the terminal sink's realized allocated draw for the attribute
- `throttle01` is the terminal sink's effective throttle
- effective throttle is the clamped sink throttle multiplied by the ancestor master throttle product

## 7.3 Nervous projection semantics for routed parent chains

For a routed nervous chain:

- the terminal target is the final descendant node reached by following nervous edges
- every nervous edge in that chain uses that terminal target for projection
- if the terminal target is a face, delivered rate is the cave output for that face attribute
- if the terminal target is not a face, delivered rate is `0`
- `comfort01` continues to come from `sys_world`

## 7.4 Parent section display semantics

The parent section renders only for a selected entity that has one or more children.

For each child row, the section displays:

- child label
- own throttle as a percentage
- effective throttle as a percentage
- current allocated draw summary by attribute

The aggregate summary is the sum of current allocated draw across all children by attribute.

## 7.5 Parent slider synchronization semantics

The slider value shown in the UI is always derived from runtime state unless the user has an outstanding local change that has not yet been reconciled.

Changing selection or applying external runtime updates immediately resynchronizes the displayed slider value.

## 8. Implementation order

1. tighten authored validation in the existing schemas
2. fix the trigger dependency helpers
3. add unit tests for the trigger helpers and schema validation
4. add loud cycle logging to the existing parent traversal helpers
5. correct routed power projection
6. correct routed nervous projection
7. extend graph/projection tests
8. add `useParentSectionData` and move parent-section derivation out of `.tsx`
9. synchronize `useParentMasterThrottle` with runtime state
10. extend parent-section UI tests
11. extend spawn extras runtime tests

## 9. Done criteria

The work is complete only when all of the following are true:

1. mixed-trigger authored entries still require cycle dependency support
2. assignment-only authored entries do not require cycle dependency support
3. parent-routed power edges project terminal-sink rate and effective throttle correctly for every segment in the route
4. parent-routed nervous edges project terminal-target flow correctly for every segment in the route
5. detected parent ancestry cycles emit explicit logging and stop traversal safely
6. `RuntimeParentSection.tsx` contains rendering only and no business-logic derivation
7. the parent section renders only for selected entities that have children
8. the parent slider stays synchronized with runtime state across rerenders and selection changes
9. assignment minimum schemas reject non-finite thresholds
10. spawner authored data rejects duplicate `forcedHabiti` after trim normalization
11. the added and changed tests all pass
12. no unrelated production or test files are changed
