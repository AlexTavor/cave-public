# LLD — Conditional Activation Explanation, Passport Nervous Vein, Unified Blueprints

## 1. Scope and governing constraints

This design implements three requested changes:

1. Conditional Activation must expose authored explanation text and show it on cards for entities whose targeted abilities are currently deactivated.
2. Passport must expose a Nervous Vein toggle that routes a nervous vein from `parent` or `sys_world` using the existing nervous graph rules.
3. Unified Blueprints must allow grouped blueprint membership by tag, optional peer-spawn on SPAWN command, and kill-together semantics.

This design is constrained by the uploaded architecture and testing rules:

- Runtime state is owned by ECS world; mutations happen only through the command/apply path.
- UI renders semantic state only and must not mutate simulation state.
- Existing mechanisms must be reused where possible.
- Tests must cover behavior, negative paths, and edge cases using real world/cartridge fixtures rather than mocked data structures.

## 2. Locked decisions

The following decisions are locked for this implementation:

### 2.1 Conditional Activation explanation

- Explanation text is authored on `conditionalActivation`, not on `display`.
- Explanation is shown only when the entity is currently inactive and the authored target set contains at least one valid targetable target.
- Explanation is rendered by a shared selection-card component that reads runtime state through existing selection hydration hooks.
- Existing compiled activation logic is not changed.

### 2.2 Passport Nervous Vein

- The Passport toggle compiles to a reserved blueprint tag.
- Nervous routing continues to use the existing parent traversal via `resolveAncestorPath(...)`.
- No new runtime component is introduced.

### 2.3 Unified Blueprints

- No polling system is added.
- No `CommandsManager` extension is added.
- `SpawnHandler` and `KillHandler` remain the mutation entrypoints, but the feature logic is moved into dedicated collaborator modules.
- Unified Blueprint peer-spawn is evaluated only when a SPAWN command is handled.
- Unified Blueprint kill-together is evaluated only when a KILL command is handled.
- Unified Blueprints remain editor-authored data in `_editor`; they are not compiled into runtime components.

## 3. Feature 1 — Conditional Activation explanation text

## 3.1 Why

Current Conditional Activation only compiles hidden runtime state and gates targeted ability rules. The authored reason for inactivity is not preserved or surfaced to the player. The code already exposes the hidden state in one narrow UI path for throttle hiding, so the missing piece is authored explanation text plus shared card rendering.

Relevant existing behavior:

- Schema: `src/data/schemas/abilities/conditionalActivation.ts`
- Target validation: `src/data/schemas/abilities/conditionalActivationSupport.ts`
- Compiler: `src/engine/compiler/abilities/conditionalActivationCompiler.ts`
- Runtime state keys: `src/engine/runtime/conditionalActivationState.ts`
- Existing UI use of the hidden state: `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`

## 3.2 What

Add one optional authored field:

- `inactiveExplanation?: string`

Behavior contract:

- The explanation is visible only when all of the following are true:
  - the blueprint has `_editor.abilities.conditionalActivation`
  - `inactiveExplanation` is non-blank after trimming
  - the entity exists in runtime
  - the entity is currently inactive according to `state.conditional_activation_active.value`
  - the authored target list contains at least one target that is both targetable and valid against the current authored abilities
- The explanation is hidden when the entity is active.
- The explanation is hidden when the target set is empty, unsupported, or stale.
- No compiled behavior rules change.
- No display description is overwritten.

## 3.3 How

### 3.3.1 Data flow

1. Author enters explanation text in the Conditional Activation editor form.
2. The authored text remains in `_editor.abilities.conditionalActivation.inactiveExplanation`.
3. Runtime card notice resolver reads:
   - runtime entity state: `conditional_activation_active`
   - compiled cartridge blueprint `_editor` data
4. Shared notice component renders the explanation inside the selection card.

### 3.3.2 Inactivity definition

Use the same state key already produced by the compiler:

- `CONDITIONAL_ACTIVATION_ACTIVE_STATE_KEY = "conditional_activation_active"`

Truth contract:

- active when state value is `1` or `true`
- inactive otherwise

This matches the existing 0/1 write behavior produced by `prepareConditionalActivation(...)` and stays compatible with existing runtime state conventions.

## 3.4 Files to change or add

### Change — `src/data/schemas/abilities/conditionalActivation.ts`

**Responsibility**
- Defines the authored Conditional Activation ability contract.

**Change**
- Add optional string field `inactiveExplanation` to `ConditionalActivationAbilitySchema`.

**Interface contract**
- Input type continues to be `ConditionalActivationAbilityConfig`.
- `conditions` and `targets` behavior remains unchanged.
- `inactiveExplanation` is optional and defaults to absent.

**Notes**
- No new target type is introduced.
- No compiler-facing behavior change is introduced here.

---

### Change — `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.tsx`

**Responsibility**
- Renders the editor UI for authored Conditional Activation data.

**Change**
- Add a `StringField` bound to:
  - `blueprints.<id>._editor.abilities.conditionalActivation.inactiveExplanation`
- The field must be labelled clearly as explanation text for the inactive state.
- The field must use the existing textarea behavior for long text.

**Interface contract**
- The existing conditions editor and target checkbox list remain unchanged.
- Target toggling semantics remain unchanged.

---

### Change — `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.test.tsx`

**Responsibility**
- Covers editor rendering and persistence for Conditional Activation form fields.

**Change**
- Extend the test to assert the explanation field is rendered.
- Add a test that editing and blurring the field updates draft state at the exact path above.

**Test contract**
- Given a blueprint with `conditionalActivation`, when the explanation is edited, then the authored draft stores the exact value.

---

### Change — `src/engine/runtime/conditionalActivationState.ts`

**Responsibility**
- Owns canonical Conditional Activation runtime state keys and state readers.

**Change**
- Add a reader function for active/inactive state.

**Interface contract**
- New exported function:
  - input: entity-like object with optional `state`
  - output: boolean active flag
- Existing throttle helpers remain unchanged.

---

### Add — `src/ui/runtime/world/selection/components/resolveConditionalActivationExplanation.ts`

**Responsibility**
- Resolves whether an entity should show a Conditional Activation explanation and returns the explanation text.

**Logic**
- Read the runtime entity by id from `runtime`.
- Resolve the entity blueprint via existing blueprint lookup helpers.
- Read authored config from `_editor.abilities.conditionalActivation`.
- Return `null` unless all visibility conditions in section 3.2 are satisfied.
- Use existing target validation utilities from `conditionalActivationSupport.ts`.
- Use the new runtime state helper from `conditionalActivationState.ts`.

**Interface contract**
- Input: `entityId: string`, `runtime: Runtime | null`
- Output: `string | null`
- Pure read-only function.
- No ECS mutation.

**Negative-path contract**
- Missing runtime, missing entity, missing blueprint, missing `_editor`, blank explanation, active state, or no valid target must all return `null`.

---

### Add — `src/ui/runtime/world/selection/components/resolveConditionalActivationExplanation.test.ts`

**Responsibility**
- Unit-tests the explanation resolver.

**Required cases**
- Returns explanation when the entity is inactive and has a valid targeted ability.
- Returns `null` when the entity is active.
- Returns `null` when explanation text is blank.
- Returns `null` when targets are empty.
- Returns `null` when targets are stale or unsupported.
- Returns `null` when runtime or blueprint lookup fails.

---

### Add — `src/ui/runtime/world/selection/components/ConditionalActivationNotice.tsx`

**Responsibility**
- Shared UI renderer for Conditional Activation explanation text.

**Logic**
- Use existing `useRuntimeSelector(...)` to subscribe to the selected entity and blueprint revision.
- Internally call `resolveConditionalActivationExplanation(...)`.
- Render nothing when resolver returns `null`.
- Render a dedicated notice block when resolver returns text.

**Interface contract**
- Props:
  - `entityId: string`
  - `runtime: Runtime | null`
- Output:
  - `null` when no explanation is visible
  - a rendered notice block otherwise

**Hydration contract**
- Dependency plan must include:
  - `entityIds: [entityId]`
  - `includeBlueprintRevision: true`
  - `includeEntityListRevision: false`

---

### Add — `src/ui/runtime/world/selection/components/ConditionalActivationNotice.test.tsx`

**Responsibility**
- View test for the shared notice component.

**Required cases**
- Renders authored explanation when resolver conditions are satisfied.
- Renders nothing when conditions are not satisfied.

---

### Change — selection card view files

The following view files must import and render `ConditionalActivationNotice` immediately below the descriptive header text and before the card’s operational sections:

- `src/ui/runtime/world/selection/DisplayCardView.tsx`
- `src/ui/runtime/world/selection/body/BodyCardContent.tsx`
- `src/ui/runtime/world/selection/face/FaceCardView.tsx`
- `src/ui/runtime/world/selection/cave/CaveCardView.tsx`
- `src/ui/runtime/world/selection/ResourceCardView.tsx`
- `src/ui/runtime/world/selection/AttributePoolCardView.tsx`
- `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx`
- `src/ui/runtime/world/selection/absorption/AbsorptionCard.tsx`

**Responsibility**
- Each file remains the presentation layer for its card.

**Change**
- Insert the shared notice component only.
- Do not move business logic into these `.tsx` files.

**Interface contract**
- `entityId` passed to the notice must match the entity whose authored abilities are being explained:
  - Display card: selected entity id
  - Body card: `data.subjectId`
  - Face card: selected face entity id
  - Cave card: `data.targetId`
  - Resource card: selected entity id
  - Attribute Pool card: selected entity id
  - Power Job card: selected entity id
  - Absorption card: selected entity id

**Non-goal**
- No card data type changes are required.
- No selection hydration equality function changes are required.

---

### Change — representative card view tests

Update or add tests so each touched card family has at least one wiring assertion that the shared notice appears when the selected entity is inactive and has authored explanation text.

Minimum required test coverage:

- `src/ui/runtime/world/selection/job-card/JobCard.throttleVisibility.test.tsx` or a new dedicated JobCard explanation test
- `src/ui/runtime/world/selection/body/BodyCard.test.tsx`
- `src/ui/runtime/world/selection/FaceCard.test.tsx`
- `src/ui/runtime/world/selection/CaveCard.test.tsx`
- `src/ui/runtime/world/selection/ResourceCard.test.tsx`
- add `src/ui/runtime/world/selection/DisplayCard.test.tsx`
- add `src/ui/runtime/world/selection/AttributePoolCard.test.tsx`
- add or extend an Absorption/assignment card test

These are wiring tests only. The shared resolver carries the behavior contract.

## 4. Feature 2 — Nervous Vein toggle in Passport

## 4.1 Why

Passport already owns identity and optional compiled parent resolution. The nervous graph already knows how to route from `sys_world` through parent ancestry using `resolveAncestorPath(...)`. The missing piece is a way for authored blueprints to opt into that routing without introducing a new runtime component.

Relevant existing behavior:

- Passport schema: `src/data/schemas/abilities/passport.ts`
- Passport compiler: `src/engine/compiler/abilities/passportCompiler.ts`
- Nervous graph builder: `src/engine/phaser/veins/graphBuilderNervous.ts`
- Parent path traversal: `src/engine/phaser/veins/parentVeinRouting.ts`
- Spawn copies blueprint tags into runtime entities: `src/engine/runtime/handlers/SpawnHandler.ts`

## 4.2 What

Add one authored Passport toggle:

- `nervousVein: boolean`

Behavior contract:

- When `nervousVein` is `true`, the compiled blueprint must carry a reserved tag owned by the compiler.
- When `nervousVein` is `false` or absent, the compiler must remove only that reserved tag.
- The nervous graph builder must create nervous routes for runtime entities carrying that reserved tag.
- Routing origin remains `sys_world`.
- Intermediate steps continue to use parent ancestry when present.
- If the entity has no parent chain, the route is direct `sys_world -> entity`.

## 4.3 How

### 4.3.1 Reserved tag

Introduce one reserved Passport-owned tag constant. The compiler owns this tag exclusively.

Contract:

- User-authored gameplay tags are not used for this feature.
- Only the reserved tag triggers nervous routing.
- Compiler add/remove must be idempotent.

### 4.3.2 Graph routing

`graphBuilderNervous.ts` currently routes:

- face entities
- assignable entities

Extend it to also route:

- entities carrying the reserved Passport nervous tag

Because `pushVeinEdge(...)` does not dedupe edges, the graph builder must dedupe candidate entity ids before routing. This avoids duplicate nervous routes when an entity qualifies in more than one category.

## 4.4 Files to change or add

### Change — `src/data/schemas/abilities/passport.ts`

**Responsibility**
- Defines the authored Passport ability contract.

**Change**
- Add boolean field `nervousVein` with default `false`.
- Export the reserved tag constant from this file so compiler and graph builder share the same value.

**Interface contract**
- Existing Passport fields remain unchanged.
- `parent` semantics remain unchanged.

---

### Change — `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx`

**Responsibility**
- Renders the editor UI for Passport-authored data.

**Change**
- Add a `BooleanField` bound to:
  - `blueprints.<id>._editor.abilities.passport.nervousVein`
- Place it with the rest of Passport identity/appearance fields.

**Interface contract**
- Existing label, display key, description, parent, and visuals button behavior remain unchanged.

---

### Change — `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.parent.test.tsx` and/or `PassportAbilityForm.visuals.test.tsx`

**Responsibility**
- Covers Passport form wiring.

**Change**
- Add a test proving the checkbox exists and persists its value to the draft store.

---

### Change — `src/engine/compiler/abilities/passportCompiler.ts`

**Responsibility**
- Compiles authored Passport data into blueprint runtime shape.

**Change**
- Add logic to synchronize the reserved nervous tag into `draft.tags`.
- Add when `config.nervousVein === true`.
- Remove when `config.nervousVein !== true`.
- Remove only the reserved tag; do not touch unrelated authored tags.

**Interface contract**
- Existing display label/icon/description/style/parent compilation stays unchanged.
- The compiler remains idempotent across repeated compiles.

---

### Change — `src/engine/compiler/abilities/passportCompiler.test.ts`

**Responsibility**
- Verifies Passport compiler behavior.

**Required cases**
- Adds the reserved tag when `nervousVein` is enabled.
- Removes the reserved tag when `nervousVein` is disabled.
- Does not remove unrelated authored tags.
- Preserves existing parent/display behavior.

---

### Change — `src/engine/phaser/veins/graphBuilderNervous.ts`

**Responsibility**
- Builds nervous edges for entities that should receive nervous routing.

**Change**
- Add a predicate for the reserved Passport nervous tag.
- Build one deduped candidate set of routed entity ids across:
  - faces
  - assignables
  - passport nervous-tagged entities
- Route each candidate exactly once.

**Interface contract**
- Existing edge kind/attribute/power values remain unchanged.
- Parent routing continues to be delegated to `resolveAncestorPath(...)`.

---

### Change — `src/engine/phaser/veins/GraphBuilder.parentRouting.test.ts`

**Responsibility**
- Verifies parent-routed nervous edge behavior.

**Required cases**
- Nervous-tagged entity with a parent chain routes `sys_world -> ...ancestors... -> entity`.
- Nervous-tagged entity without a parent chain routes directly from `sys_world`.
- Entity that is both assignable and nervous-tagged still produces a single nervous route, not duplicates.

## 5. Feature 3 — Unified Blueprints

## 5.1 Why

The requested feature is a grouped blueprint membership mechanic used for quest-option style sets. The codebase already has the correct mutation seam for this: SPAWN and KILL command handlers. The runtime command loop drains recursively until the buffer is empty, so handler-enqueued follow-up commands are processed in the same apply phase. This makes peer-spawn and kill-together implementable without polling and without a new system.

Relevant existing behavior:

- SPAWN handling: `src/engine/runtime/handlers/SpawnHandler.ts`
- KILL handling: `src/engine/runtime/handlers/KillHandler.ts`
- Command loop: `src/engine/runtime/CommandsManager.ts`
- Spawn payload fields already available for propagation: `src/engine/runtime/types/runtimeCommandPayloadsBase.ts`
- Spawn copies blueprint tags to runtime entities, but this feature must work at blueprint-definition level and must support multiple group memberships per blueprint.

## 5.2 What

Add a new editor array ability:

- `unifiedBlueprints: UnifiedBlueprintMembership[]`

Membership contract:

- Each entry defines one group membership.
- Each entry contains:
  - `tag: string`
  - `spawnWhenPeerSpawns: boolean`

Behavior contract:

- A blueprint may belong to multiple Unified Blueprint groups.
- Kill-together uses group membership only; it ignores `spawnWhenPeerSpawns`.
- Peer-spawn uses group membership plus the peer blueprint’s own `spawnWhenPeerSpawns` value for the shared tag.
- Peer-spawn is evaluated only when a SPAWN command is handled.
- If another member is spawned and this blueprint has `spawnWhenPeerSpawns = true` for the shared tag, then one instance of this blueprint is enqueued only when no active runtime entity already exists for this blueprint id.
- All active runtime entities whose blueprints share any unified tag with the killed entity’s blueprint are killed together.

## 5.3 How

### 5.3.1 Storage location

The feature remains authored in `_editor` only.

Rationale:

- `CompilerService.compile(...)` preserves `_editor` while compiling components.
- The feature does not need behavior rules or compiled runtime components.
- `SpawnHandler` and `KillHandler` already receive `context.cartridge` and can read compiled blueprints.

### 5.3.2 Composable handler collaborators

Do not add the feature logic inline in the core handler bodies.

Add dedicated collaborator modules and call them from handlers.

#### Spawn collaborator contract

Input:
- the source `SpawnCommand`
- the source blueprint id
- `CommandHandlerContext`

Output:
- zero or more enqueued SPAWN commands for peer blueprints

Behavior:
- Read the source blueprint’s unified tags.
- For each other blueprint in the cartridge:
  - determine whether it shares at least one source tag
  - determine whether the peer has `spawnWhenPeerSpawns = true` for at least one shared tag
  - skip if not eligible
  - skip if any active entity already exists with `entity.blueprintId === peerBlueprintId`
  - skip if this peer blueprint id is already planned in the current cascade metadata
  - otherwise enqueue one SPAWN command for the peer

Payload propagation contract for enqueued peer SPAWNs:
- forward `parentId`
- forward `forcedHabiti`
- forward positional `x` and `y`
- do not forward `id`; peer entity ids must continue to be generated by existing SPAWN handling unless the caller explicitly targeted the peer itself

#### Kill collaborator contract

Input:
- the source `KillCommand`
- the resolved target `RuntimeEntity`
- `CommandHandlerContext`

Output:
- zero or more enqueued KILL commands for peer runtime entities

Behavior:
- Read unified tags for the killed entity’s blueprint.
- Find active runtime entities, excluding the current target, whose blueprints share any of those tags.
- Skip any entity id already planned in the current kill cascade metadata.
- Enqueue one KILL per remaining peer entity id.

### 5.3.3 Cascade dedupe

Command metadata already supports arbitrary keys through its index signature. Reuse that.

Required metadata keys:

- `unifiedBlueprintSpawnPlannedBlueprintIds: string[]`
- `unifiedBlueprintKillPlannedEntityIds: string[]`

Contracts:

- The source handler initializes the planned set with the current source item.
- Every follow-up command inherits the updated planned set.
- Dedupe is mandatory for:
  - overlapping unified tags
  - repeated peer discovery in the same drain pass
  - recursive kill cascades

### 5.3.4 Duplicate authored membership rows

Duplicate rows with the same tag on the same blueprint must not change behavior.

Normalization contract:

- For runtime evaluation, membership is deduped by tag.
- Effective `spawnWhenPeerSpawns` for a duplicated tag is `true` if any duplicate row for that tag is `true`.

This prevents accidental duplicate enqueues without introducing editor-side blocking logic.

## 5.4 Files to change or add

### Add — `src/data/schemas/abilities/unifiedBlueprints.ts`

**Responsibility**
- Defines the authored Unified Blueprints membership entry schema.

**Schema contract**
- Export `UnifiedBlueprintMembershipSchema`
- Export `UnifiedBlueprintsAbilitySchema = z.array(UnifiedBlueprintMembershipSchema)`
- Entry fields:
  - `tag: string`
  - `spawnWhenPeerSpawns: boolean`

---

### Change — `src/data/schemas/abilities/index.ts`

**Responsibility**
- Central registry of editor abilities.

**Change**
- Register `unifiedBlueprints` in `EditorAbilitiesSchema`.
- Export the new ability type through the existing `EditorAbilities` contract.

**Interface contract**
- `unifiedBlueprints` is an optional array ability.

---

### Change — `src/ui/devtools/editors/blueprint/mode/abilitySchemas.ts`

**Responsibility**
- Supplies editor ability schemas for add/remove tooling.

**Change**
- Register `unifiedBlueprints`.
- Include it in `arrayAbilities`.

---

### Change — `src/ui/devtools/editors/blueprint/mode/DesignerMode.tsx`

**Responsibility**
- Controls which abilities can be added from the designer dropdown.

**Change**
- Add `unifiedBlueprints` to `abilityOptions`.

---

### Change — `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`

**Responsibility**
- Produces default ability drafts.

**Change**
- Add a factory for one Unified Blueprint membership row.

**Draft contract**
- default `tag = ""`
- default `spawnWhenPeerSpawns = false`

---

### Change — `src/ui/devtools/editors/blueprint/mode/abilityListMutations.ts`

**Responsibility**
- Appends default rows to array abilities.

**Change**
- Add `unifiedBlueprints` to `ArrayAbilityKey`, item map, and factory registry.

---

### Change — `src/ui/devtools/editors/blueprint/mode/abilityListUtils.ts`

**Responsibility**
- Supplies display labels and stable keys for ability list sections.

**Change**
- Add label `Unified Blueprints`.
- Add stable key builder based on membership tag and spawn toggle.

---

### Add — `src/ui/devtools/editors/blueprint/mode/forms/UnifiedBlueprintsAbilityForm.tsx`

**Responsibility**
- Renders one Unified Blueprint membership row.

**Logic**
- Use existing `AutocompleteStringField` for `tag`.
- Reuse `useBlueprintTagSuggestions(filename)` for suggestions.
- Use existing `BooleanField` for `spawnWhenPeerSpawns`.

**Interface contract**
- Props:
  - `basePath: string`
- Bound fields:
  - `${basePath}.tag`
  - `${basePath}.spawnWhenPeerSpawns`

---

### Add — `src/ui/devtools/editors/blueprint/mode/forms/UnifiedBlueprintsAbilityForm.test.tsx`

**Responsibility**
- Covers editor row rendering and store updates.

**Required cases**
- Tag input persists the authored tag.
- Spawn toggle persists the authored boolean.
- Tag suggestions include tags from linked and draft blueprints.

---

### Add — `src/ui/devtools/editors/blueprint/mode/UnifiedBlueprintsAbilitySection.tsx`

**Responsibility**
- Renders all Unified Blueprint membership rows in the ability list.

**Logic**
- One `ComponentRow` per membership entry.
- Title uses the authored tag when present; otherwise fallback `Unified Blueprints <index>`.
- Remove button deletes the single row.

**Interface contract**
- Props:
  - `entries`
  - `rootPath`
  - `onRemoveItem(index)`

---

### Change — `src/ui/devtools/editors/blueprint/mode/AbilityList.tsx`

**Responsibility**
- Renders all configured blueprint abilities.

**Change**
- Add Unified Blueprints section rendering.

---

### Change — `src/ui/devtools/editors/blueprint/mode/useDesignerAbilities.ts`

**Responsibility**
- Adds and removes authored ability entries in the draft.

**Change**
- Extend the remove-item union to include `unifiedBlueprints`.

---

### Add — `src/engine/runtime/handlers/unifiedBlueprints.ts`

**Responsibility**
- Shared runtime helpers for Unified Blueprints.

**Logic**
- Read authored memberships from `_editor`.
- Normalize duplicate tags.
- Resolve shared-tag relationships between blueprints.
- Read and update cascade metadata arrays.

**Interface contract**
- Export pure helpers only.
- No ECS mutation.
- No command enqueue in this file.

---

### Add — `src/engine/runtime/handlers/spawnUnifiedBlueprints.ts`

**Responsibility**
- Spawn-side collaborator for Unified Blueprints.

**Logic**
- Implements the peer-spawn contract from section 5.3.2.
- Enqueues follow-up SPAWN commands through `context.commands`.
- Applies cascade metadata propagation.

**Interface contract**
- Export one function invoked by `SpawnHandler` after the source entity has been added to the world.
- Input includes the handled `SpawnCommand`, the source blueprint id, and `CommandHandlerContext`.

---

### Add — `src/engine/runtime/handlers/killUnifiedBlueprints.ts`

**Responsibility**
- Kill-side collaborator for Unified Blueprints.

**Logic**
- Implements the kill-together contract from section 5.3.2.
- Enqueues follow-up KILL commands through `context.commands`.
- Applies cascade metadata propagation.

**Interface contract**
- Export one function invoked by `KillHandler` after the source entity is removed from world/physics and before the handler logs completion.
- Input includes the handled `KillCommand`, the resolved target entity, and `CommandHandlerContext`.

---

### Change — `src/engine/runtime/handlers/SpawnHandler.ts`

**Responsibility**
- Materializes one runtime entity from one SPAWN command.

**Change**
- After the source entity has been added and existing spawn-side bookkeeping is complete, call the spawn collaborator.

**Interface contract**
- Existing spawn semantics remain unchanged for the source entity.
- The source handler itself still owns entity creation, parent resolution, physics, identity/habiti, replacement behavior, and mirrored fact adjust.
- Unified Blueprint follow-up SPAWNs are additive only.

---

### Change — `src/engine/runtime/handlers/KillHandler.ts`

**Responsibility**
- Removes one runtime entity from world and physics for one KILL command.

**Change**
- After dead-body metadata is captured and the source entity is removed, call the kill collaborator.

**Interface contract**
- Existing kill semantics remain unchanged for the source entity.
- The handler still owns mirrored fact adjust, dead-body presentation capture, world removal, and physics removal.
- Unified Blueprint follow-up KILLs are additive only.

---

### Add — `src/engine/runtime/handlers/SpawnHandler.unifiedBlueprints.test.ts`

**Responsibility**
- Unit-tests Unified Blueprint peer-spawn behavior using real world/cartridge fixtures.

**Required cases**
- Spawns eligible peer blueprint when a shared-tag member is spawned.
- Does not spawn peer when an active instance of the peer blueprint already exists.
- Does not spawn peers without `spawnWhenPeerSpawns = true` for the shared tag.
- Handles multiple shared tags without duplicate SPAWNs.
- Propagates `parentId`, `forcedHabiti`, `x`, and `y` to peer SPAWNs.
- Does not propagate `id`.
- Handles duplicate authored membership rows without duplicate SPAWNs.

---

### Add — `src/engine/runtime/handlers/KillHandler.unifiedBlueprints.test.ts`

**Responsibility**
- Unit-tests Unified Blueprint kill-together behavior using real world/cartridge fixtures.

**Required cases**
- Kills all active peers sharing a unified tag with the killed entity’s blueprint.
- Uses union semantics when the source blueprint belongs to multiple unified tags.
- Does not kill unrelated entities.
- Does not enqueue duplicate KILLs for overlapping groups.
- Handles duplicate authored membership rows without duplicate KILLs.

## 6. Pseudocode-level algorithms

## 6.1 Conditional Activation explanation resolver

Pseudocode:

1. If runtime is null, return null.
2. Resolve entity by `entityId`; if missing, return null.
3. Resolve blueprint by entity `blueprintId`; if missing, return null.
4. Read authored `conditionalActivation` config; if missing, return null.
5. Read and trim `inactiveExplanation`; if blank, return null.
6. If entity is active, return null.
7. If no authored target is both targetable and valid against current authored abilities, return null.
8. Return the trimmed explanation.

## 6.2 Unified Blueprint peer-spawn collaborator

Pseudocode:

1. Read source blueprint memberships and normalize them by tag.
2. Seed `plannedBlueprintIds` from command metadata; ensure source blueprint id is present.
3. For each blueprint in `context.cartridge.blueprints` other than source:
   1. Read and normalize peer memberships.
   2. Determine whether source and peer share any tag where the peer membership has `spawnWhenPeerSpawns = true`.
   3. If not, continue.
   4. If peer blueprint id is already in `plannedBlueprintIds`, continue.
   5. If any active runtime entity already has `blueprintId === peerBlueprintId`, continue.
   6. Enqueue SPAWN for peer with propagated extras and updated metadata.
   7. Add peer blueprint id to `plannedBlueprintIds`.

## 6.3 Unified Blueprint kill collaborator

Pseudocode:

1. Read source blueprint memberships and normalize them by tag.
2. If source has no unified tags, stop.
3. Seed `plannedEntityIds` from command metadata; ensure source entity id is present.
4. For each active runtime entity in the world:
   1. Skip when entity id is missing or already planned.
   2. Skip when entity id equals source entity id.
   3. Read peer blueprint memberships.
   4. If peer shares no unified tag with source, continue.
   5. Enqueue KILL for peer entity id with updated metadata.
   6. Add peer entity id to `plannedEntityIds`.

## 7. Test plan by layer

## 7.1 Unit tests — `src/engine/**`, `src/ui/**` pure helpers

Add or update unit tests for:

- Conditional Activation active-state reader
- Conditional Activation explanation resolver
- Passport compiler nervous tag sync
- Nervous graph builder routing and dedupe
- Unified Blueprint spawn collaborator
- Unified Blueprint kill collaborator

Requirements:

- happy path
- negative path
- edge cases

## 7.2 Integration-style runtime tests

Use real `World`, real cartridge fixtures, and real command buffers.
Do not mock the ECS world.

Required runtime interaction tests:

- source SPAWN produces peer SPAWN commands and those commands are processed correctly
- source KILL produces peer KILL commands and those commands are processed correctly
- overlapping unified groups do not recurse indefinitely and do not duplicate commands

## 7.3 View tests

Use smoke/wiring tests only.

Required view assertions:

- Conditional Activation notice appears in each touched card family when the selected entity is inactive and authored explanation exists
- notice is absent when the entity is active
- Passport form checkbox persists authored state
- Unified Blueprints editor row persists tag and toggle

## 8. Out of scope

The following are explicitly out of scope for this change set:

- expanding Conditional Activation target semantics beyond the currently targetable abilities
- moving Unified Blueprints into compiled runtime components
- adding a polling system or command-reactor framework
- refactoring `CommandsManager`
- changing existing card-selection priority in `selectionLensMap.ts`
- changing display description semantics
- changing face/assignment gameplay semantics beyond rendering the shared inactive notice

## 9. Acceptance criteria

This implementation is complete only when all of the following are true:

1. Authored Conditional Activation explanation text is visible on selection cards only while the entity is inactive and the target set is valid.
2. Passport nervous toggle produces nervous routing using existing parent/world traversal.
3. Unified Blueprints peer-spawn occurs only from SPAWN handling and only for eligible peer blueprints with no active instance.
4. Unified Blueprints kill-together removes all active peers sharing any unified tag.
5. No polling system was introduced.
6. No direct ECS mutation was added outside existing command handlers.
7. All added and modified tests are green.
