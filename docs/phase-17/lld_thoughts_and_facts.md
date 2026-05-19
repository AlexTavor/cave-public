# LLD — Thoughts mechanism and run/permanent facts system

## 1. Purpose

This document defines the implementation contract for a **Thoughts** mechanism and a supporting **facts** collection mechanism.

The design is grounded in the uploaded codebase and uses the project’s existing architecture wherever possible:

- ECS world state is the single source of truth.
- Runtime mutations happen through the runtime command/handler pipeline or inside the authoritative handler that is already applying a command.
- Save/load persistence is driven by the runtime’s stateful component cloning and hydration path.
- Rebirth is a separate game flow and must be handled explicitly.
- Editor configuration for `.cave` content is routed through the existing semantic fragment, module session, and config-editor stack.

This document does **not** include implementation code. It defines the exact design, file responsibilities, logic, interfaces, tests, and acceptance criteria.

---

## 2. Scope

This design implements all of the following and nothing else:

1. A new `.cave`-authored **Thoughts** system.
2. A dedicated runtime **facts** system with two explicit scopes:
   - `run`
   - `permanent`
3. A deterministic thought evaluation system that:
   - checks authored thoughts in configured order,
   - opens at most one thought at a time,
   - pauses the game while a thought is active,
   - can only be dismissed with `CONTINUE`.
4. A structured thoughts editor in `.cave` using accordion rows, rich text editing/preview, and a comfortable manual condition stack.
5. A rebirth change that preserves `permanent` facts and resets `run` facts.
6. A standard, reusable system of fact updates for the common gameplay events discussed:
   - elapsed real seconds from run start,
   - elapsed in-game seconds from run start,
   - blueprint spawned,
   - blueprint killed,
   - purge began,
   - cycle completed,
   - first body recruited at a source blueprint such as `luretraveler`.

Out of scope:

- migration of existing tutorial or cave event counters off `sys_world.state` unless they are directly replaced by this feature,
- general-purpose scripting beyond the thought condition model defined here,
- a generic narrative framework beyond what is required for Thoughts,
- unrelated refactors of the notification, cinematic, or draft systems.

---

## 3. Why this design

### 3.1 Why dedicated `run` and `permanent` objects are required

The current codebase has two different persistence concepts:

- **save/load persistence**: runtime serialization/hydration persists stateful runtime data,
- **rebirth persistence**: `game.rebirth` explicitly carries forward only selected cave data.

Those are not the same concept.

Today, hidden event counters and tutorial flags live on `sys_world.state`. That works for save/load during a run, but it does **not** create a clean semantic split between:

- facts that belong only to the current run, and
- facts that must survive rebirth and remain true across runs.

The new Thoughts system requires that split to be explicit, because thought conditions must be reasoned about by authors and by the implementation agent without hidden conventions.

Therefore the runtime must expose two dedicated objects on `sys_world`:

- `run`
- `permanent`

Both are numeric fact stores. `run` resets on rebirth. `permanent` survives rebirth.

### 3.2 Why Thoughts should be a `.cave`-level authored system

The `.cave` pipeline already owns global authored systems such as:

- world entity configuration,
- notifications,
- traits,
- game config.

Thoughts are global authored gameplay logic, not per-blueprint behavior. They belong in `.cave` alongside those systems.

### 3.3 Why Thoughts should not reuse the cinematic path

The existing cinematic path is a presentation/event path. It is not the correct source of truth for authored narrative gating and acknowledgement.

Thoughts need:

- authored definitions in `.cave`,
- deterministic once-only behavior,
- explicit acknowledgement tracking,
- save/load persistence,
- blocking pause semantics.

That matches the runtime draft/blocking-overlay model more closely than the cinematic model.

### 3.4 Why the existing freeform condition input is insufficient

The current reusable condition editor is built around a simple text expression and blueprint-scoped autocomplete. It is not comfortable enough for the requested `.cave` thoughts authoring UX.

The requested editor requires:

- a manual stack of conditions,
- strongly guided selection,
- no blueprint-context dependency,
- direct support for facts with scope/type/about structure.

Therefore Thoughts need a dedicated structured condition editor.

---

## 4. Grounded findings from the current codebase

1. `DraftOverlay` already provides a blocking fullscreen modal pattern using `Modal`.
2. `Modal` becomes non-dismissible if `onClose` is omitted. This is the correct base for a mandatory `CONTINUE` flow.
3. Runtime pause behavior during blocking overlays is currently keyed only off `sys_world.draft.active` in:
   - `engine/runtime/runtimePauseState.ts`
   - `engine/runtime/runtimeSystemPhase.ts`
   - `game/systems/CaveSystem.ts`
4. Save/load serialization is driven by the flyweight persistence path and the `STATEFUL_KEYS` list in `engine/runtime/handlers/spawnCloneUtils.ts`.
5. Rebirth is implemented separately in `ui/runtime/terminal/commands/gameRebirthCommand.ts` and currently preserves cave data only.
6. The `.cave` parser/serializer/editor route already exists and is the correct integration path for Thoughts:
   - `engine/linker/semanticParser.ts`
   - `lib/modules/semanticModuleFragments.ts`
   - `lib/modules/fragmentSerializers.ts`
   - `ui/devtools/editors/file/SystemConfigEditor.tsx`
   - the config editor route plumbing under `ui/devtools/shell/window-manager/`
7. Existing notification rules and draft options already rely on runtime condition evaluation through `JsonLogicAdapter`. That mechanism should be reused for runtime evaluation.
8. Existing hidden world counters are updated through helper functions that enqueue state-adjust commands. That is the correct existing pattern to mirror for facts updates from systems.
9. Authoritative gameplay event hooks already exist at the right places:
   - spawn: `engine/runtime/handlers/SpawnHandler.ts`
   - kill: `engine/runtime/handlers/KillHandler.ts`
   - purge began: `game/systems/cave/purgeEvaluate.ts`
   - cycle completion via draft trigger: `game/handlers/TriggerDraftHandler.ts`
   - recruited body source/proxy dispatch: `game/handlers/DispatchProxyHandler.ts`
10. `Runtime.flushCommands()` already exists and is the correct mechanism for applying queued changes immediately while paused, without advancing the simulation tick.

These findings are the basis for the design below.

---

## 5. Final design summary

### 5.1 Runtime facts model

Add two dedicated numeric fact objects to `sys_world`:

- `run`
- `permanent`

Both use the same shape:

- `scope.factType.factAbout = number`

Examples:

- `run.elapsed_real_seconds.world = 6`
- `run.elapsed_game_seconds.world = 12`
- `run.blueprint_spawned.absorption = 1`
- `run.cycle_completed.explore = 1`
- `run.body_recruited_at.luretraveler = 1`
- `permanent.thought_seen.first_explore_cycle = 1`

Facts are numeric counters. Boolean meaning is derived as `> 0`.

### 5.2 Thought authoring model

Add `thoughts` to `.cave` config.

Each thought has:

- `id`
- `body` (rich text source)
- `rememberScope`: `run` or `permanent`
- `conditions`: ordered list of structured thought conditions

Authoring order is priority order.

### 5.3 Thought runtime model

Add a dedicated `thought` object to `sys_world` representing the currently displayed thought.

Only one thought can be active at a time.

When an authored thought becomes eligible:

1. the game pauses,
2. the thought modal opens fullscreen,
3. the player can only dismiss it by clicking `CONTINUE`.

On `CONTINUE`:

- the thought is acknowledged,
- `thought_seen.<thoughtId>` is incremented in the scope defined by `rememberScope`,
- the active thought is cleared,
- the runtime returns to the status it had before the thought opened.

### 5.4 Thought condition model

Thought conditions are an **AND** stack.

All conditions on a thought must be true for the thought to become eligible.

Version 1 supports the following condition kinds:

1. `fact_threshold`
   - compare a fact in `run` or `permanent`
2. `world_state_threshold`
   - compare a `sys_world.state.*.value` numeric value such as `food` or `heat`

This is enough to express all conditions discussed.

### 5.5 Standard fact producers

The initial standard fact producers are:

- elapsed real seconds from start
- elapsed in-game seconds from start
- blueprint spawned
- blueprint killed
- purge began
- cycle completed
- body recruited at source blueprint
- thought seen

These are all updated through the standard facts command path defined below.

---

## 6. Detailed design

## 6A. Facts model

### 6A.1 Facts shape

A facts object is a two-level numeric map:

- first key: `factType`
- second key: `factAbout`
- value: non-negative number

Contract:

- missing entries are treated as `0`
- fact values must never become negative
- fact updates are additive unless explicitly defined otherwise

### 6A.2 Fact naming contract

The following fact types are in scope for this implementation:

- `elapsed_real_seconds`
- `elapsed_game_seconds`
- `blueprint_spawned`
- `blueprint_killed`
- `purge_began`
- `cycle_completed`
- `body_recruited_at`
- `thought_seen`

`factAbout` values:

- for elapsed facts: `world`
- for purge begin: `world`
- for blueprint facts: the blueprint id, such as `explore`, `absorption`, `butcher`
- for body recruitment at source: the source blueprint id, such as `luretraveler`
- for thought acknowledgement: the thought id

No alternative aliases are allowed.

### 6A.3 Persistence contract

- `run` persists through save/load during the current run.
- `permanent` persists through save/load and through rebirth.
- `run` resets on rebirth.
- `permanent` does not reset on rebirth.

---

## 6B. Thought model

### 6B.1 Thought definition contract

Each authored thought definition contains:

- `id: string`
- `body: string`
- `rememberScope: "run" | "permanent"`
- `conditions: ThoughtCondition[]`

Rules:

- `id` must be unique within the `.cave` file.
- `body` is rendered through the existing rich text renderer.
- `rememberScope` controls where `thought_seen.<id>` is written when the thought is acknowledged.
- `conditions` are evaluated in AND semantics.

### 6B.2 Thought eligibility contract

A thought is eligible only when all of the following are true:

1. no other thought is active,
2. no draft is active,
3. the thought’s seen counter in its `rememberScope` is `0`,
4. all authored conditions are true.

When multiple thoughts are eligible in the same tick, the first eligible thought in authored order is selected.

### 6B.3 Thought delivery contract

When a thought is shown:

- the active thought state is written to `sys_world.thought`,
- the current runtime status (`running` or `paused`) is stored as `resumeStatus`,
- the UI pauses the simulation if it is currently running,
- the modal blocks all dismiss paths except `CONTINUE`.

### 6B.4 Thought acknowledgement contract

When the player clicks `CONTINUE`:

1. enqueue thought acknowledgement command,
2. apply it immediately via `runtime.flushCommands()`,
3. restore prior runtime status from `resumeStatus`.

This is required so that `CONTINUE` works correctly while paused and does not require an extra tick to clear the modal.

---

## 6C. Condition model

### 6C.1 Supported thought condition kinds

#### Condition kind: `fact_threshold`

Fields:

- `kind = fact_threshold`
- `scope: run | permanent`
- `factType: FactType`
- `factAbout: string`
- `operator: > | >= | == | <= | <`
- `value: number`

Meaning:

Compare `sys_world.<scope>.<factType>.<factAbout>` against `value`.

Examples:

- `run.elapsed_real_seconds.world >= 3`
- `run.cycle_completed.explore >= 1`
- `permanent.blueprint_spawned.absorption >= 1`

#### Condition kind: `world_state_threshold`

Fields:

- `kind = world_state_threshold`
- `key: string`
- `operator: > | >= | == | <= | <`
- `value: number`

Meaning:

Compare `sys_world.state.<key>.value` against `value`.

Examples:

- `sys_world.state.food.value <= 0`
- `sys_world.state.heat.value <= 0`

### 6C.2 Evaluation mechanism

Thought conditions are compiled into `LogicRule[]` and evaluated using the existing `JsonLogicAdapter` machinery.

This is required to reuse the project’s current runtime condition evaluation mechanism rather than inventing a second evaluator.

### 6C.3 Version 1 condition semantics

Version 1 supports:

- AND across condition rows
- numeric comparisons only

Version 1 does **not** support:

- OR groups
- nested groups
- NOT groups
- freeform expression text

Those capabilities are intentionally out of scope.

---

## 6D. Facts production model

### 6D.1 Update path

All fact updates use a dedicated facts command type rather than ad hoc writes.

That command accepts:

- `scope`
- `factType`
- `factAbout`
- `delta`

The handler:

- ensures the nested maps exist,
- reads the current value or uses `0`,
- applies `delta`,
- clamps the result to `>= 0`.

### 6D.2 Why a dedicated facts command is required

The existing `ADJUST_STATE` command only applies to `entity.state[key].value` entries. It cannot address the new `run` and `permanent` fact objects.

A dedicated facts command is therefore required.

### 6D.3 Standard fact producers in this implementation

#### Elapsed real seconds

Produced by a new runtime system.

- increment `run.elapsed_real_seconds.world` by `dt / 1000`
- increment `permanent.elapsed_real_seconds.world` by `dt / 1000`

#### Elapsed in-game seconds

Produced by the same new runtime system.

- increment `run.elapsed_game_seconds.world` by scaled gameplay seconds
- increment `permanent.elapsed_game_seconds.world` by scaled gameplay seconds

Scaled gameplay seconds must follow the runtime’s current time scale.

#### Blueprint spawned

Produced when a blueprint successfully spawns.

- increment `run.blueprint_spawned.<blueprintId>`
- increment `permanent.blueprint_spawned.<blueprintId>`

#### Blueprint killed

Produced when an entity with a `blueprintId` is killed.

- increment `run.blueprint_killed.<blueprintId>`
- increment `permanent.blueprint_killed.<blueprintId>`

#### Purge began

Produced at the existing purge activation edge.

- increment `run.purge_began.world`
- increment `permanent.purge_began.world`

#### Cycle completed

Produced at the authoritative draft-trigger edge for cycle-complete draft triggers.

- increment `run.cycle_completed.<triggerBlueprintId>`
- increment `permanent.cycle_completed.<triggerBlueprintId>`

This implementation intentionally uses the existing cycle-trigger draft path for the fact because the uploaded codebase already emits `TRIGGER_DRAFT` on cycle completion.

#### Body recruited at source blueprint

Produced when a body is dispatched toward `sys_world` from a source blueprint via `DISPATCH_PROXY`.

- increment `run.body_recruited_at.<sourceBlueprintId>`
- increment `permanent.body_recruited_at.<sourceBlueprintId>`

This is the correct authoritative hook because the existing command metadata carries `sourceEntityId` from behavior actions, and `DispatchProxyHandler` is where that recruitment path is concretized.

#### Thought seen

Produced when the player clicks `CONTINUE` on a thought.

- if `rememberScope = run`, increment `run.thought_seen.<thoughtId>`
- if `rememberScope = permanent`, increment `permanent.thought_seen.<thoughtId>`

---

## 7. File-by-file implementation contract

Every file below is either added or changed as part of this feature. Each entry defines responsibility, logic, and interface.

## 7A. Schema and config files

### Add — `src/data/schemas/thoughts.ts`

**Responsibility**

Define the authored schema for thoughts and thought conditions.

**Logic**

Create explicit schemas and exported types for:

- `FactScope = run | permanent`
- `FactType`
- `ThoughtConditionSchema`
- `ThoughtDefinitionSchema`
- `ThoughtsSchema`

`ThoughtConditionSchema` must be a discriminated union with exactly the two condition kinds defined in this document.

`ThoughtDefinitionSchema` must require:

- `id`
- `body`
- `rememberScope`
- `conditions`

**Interface**

Exports:

- `FactScopeSchema`
- `FactTypeSchema`
- `ThoughtConditionSchema`
- `ThoughtDefinitionSchema`
- `ThoughtsSchema`
- corresponding inferred TypeScript types

No runtime behavior lives in this file.

---

### Add — `src/data/schemas/components/facts.ts`

**Responsibility**

Define the runtime schema and type for a facts component/object.

**Logic**

Represent a facts object as:

- record of `factType`
- each value is a record of `factAbout -> number`

Values must be numeric and non-negative.

Missing entries are allowed because fact maps are sparse.

**Interface**

Exports:

- `FactsComponentSchema`
- `FactsComponent` type

This schema is reused by both `run` and `permanent`.

---

### Add — `src/data/schemas/components/thought.ts`

**Responsibility**

Define the runtime shape of the active thought component/object.

**Logic**

The active thought component must contain:

- `_tag: "thought"`
- `active: boolean`
- `thoughtId: string | null`
- `body: string`
- `rememberScope: run | permanent | null`
- `resumeStatus: "running" | "paused"`

When inactive:

- `active = false`
- `thoughtId = null`
- `body = ""`
- `rememberScope = null`

**Interface**

Exports:

- `ThoughtComponentSchema`
- `ThoughtComponent` type

---

### Change — `src/data/schemas/components.ts`

**Responsibility**

Re-export component schemas/types used by `BlueprintSchema` and other runtime code.

**Logic**

Export the newly added facts and thought schemas/types.

**Interface**

New re-exports only. No behavioral change.

---

### Change — `src/data/schemas/blueprint.ts`

**Responsibility**

Define the full schema for blueprint/system entity components.

**Logic**

Add optional component/object entries under `components`:

- `run: FactsComponentSchema.optional()`
- `permanent: FactsComponentSchema.optional()`
- `thought: ThoughtComponentSchema.optional()`

This is required so the `.cave` world entity definition can carry the new runtime objects explicitly and safely.

**Interface**

The `Blueprint` type now supports three additional optional component keys:

- `run`
- `permanent`
- `thought`

---

### Change — `src/data/schemas/blueprintConfig.ts`

**Responsibility**

Define the module-level config/settings schema carried by `.cave` modules.

**Logic**

Add `thoughts` to `BlueprintSettingsSchema`.

This must be the canonical cartridge location used by the runtime and editor for authored thoughts:

- `cartridge.config.settings.thoughts`

**Interface**

New settings field:

- `thoughts?: ThoughtDefinition[]`

No other settings shape changes are in scope.

---

### Change — `src/data/schemas/v2/config.ts`

**Responsibility**

Define the `.cave` semantic schema.

**Logic**

Add `thoughts` to `SysConfigSchema`.

**Interface**

New `.cave` top-level field:

- `thoughts`

It must parse as an array of thought definitions.

---

### Change — `src/data/schemas/v2/systemDefaults.ts`

**Responsibility**

Define default system entity payloads.

**Logic**

Extend `DEFAULT_WORLD_ENTITY` to include:

- `run: {}`
- `permanent: {}`
- `thought: { inactive default state }`

Do not remove or rename existing world state or cave defaults in this file.

**Interface**

Any runtime built from defaults now begins with empty facts stores and an inactive thought object on `sys_world`.

---

## 7B. `.cave` parse / serialize / fragment plumbing

### Change — `src/engine/linker/semanticParser.ts`

**Responsibility**

Parse semantic `.cave` fragments into structured data.

**Logic**

Add `thoughts` to the `.cave` schema used by `parseSemanticFragment`.

Parsing must be strict. Invalid thought definitions must fail at semantic parse time.

**Interface**

`.cave` files can now contain a top-level `thoughts` array.

---

### Change — `src/lib/modules/semanticModuleFragments.ts`

**Responsibility**

Convert parsed semantic fragments into `ModuleCartridge` data.

**Logic**

Map `input.thoughts` into:

- `blueprint.settings.thoughts`

Do not alter unrelated cave fragment mapping behavior.

**Interface**

`toCaveModule()` must preserve authored thoughts in the resulting cartridge.

---

### Change — `src/lib/modules/fragmentSerializers.ts`

**Responsibility**

Serialize `ModuleCartridge` data back into `.cave` fragment shape.

**Logic**

Emit:

- `thoughts: m.config?.settings?.thoughts ?? []`

Do not change unrelated serialization order or structure beyond adding the new field.

**Interface**

Round-tripping a `.cave` file through the editor must preserve thoughts.

---

## 7C. Runtime component types and persistence

### Add — `src/engine/runtime/components/FactsComponent.ts`

**Responsibility**

Provide the runtime-facing TypeScript interface for fact stores.

**Logic**

Export a runtime alias/type matching the schema shape from `data/schemas/components/facts.ts`.

This file exists for consistency with existing runtime component typing such as `DraftComponent.ts`.

**Interface**

Exports runtime `FactsComponent` type.

---

### Add — `src/engine/runtime/components/ThoughtComponent.ts`

**Responsibility**

Provide the runtime-facing TypeScript interface for the active thought state.

**Logic**

Mirror the schema contract from `data/schemas/components/thought.ts`.

**Interface**

Exports runtime `ThoughtComponent` type.

---

### Change — `src/engine/runtime/handlers/spawnCloneUtils.ts`

**Responsibility**

Define which entity keys are cloned as stateful runtime data and therefore participate in save/load persistence.

**Logic**

Add the new keys to `STATEFUL_KEYS`:

- `run`
- `permanent`
- `thought`

This is mandatory. Without it, the new runtime objects will not persist correctly through save/load or clone flows.

**Interface**

The runtime persistence layer now treats `run`, `permanent`, and `thought` as stateful components.

---

## 7D. Runtime command definitions

### Add — `src/engine/runtime/types/runtimeCommandFacts.ts`

**Responsibility**

Define the facts command interface.

**Logic**

Create a new command type for fact updates with payload:

- `scope`
- `factType`
- `factAbout`
- `delta`

Command name:

- `ADJUST_FACT`

Only additive updates are in scope for this feature.

**Interface**

Export:

- `AdjustFactCommand`

---

### Add — `src/engine/runtime/types/runtimeCommandPayloadsFacts.ts`

**Responsibility**

Define the payload type for fact updates.

**Logic**

Export `AdjustFactCommandPayload` matching the contract above.

**Interface**

Type export only.

---

### Add — `src/engine/runtime/types/runtimeCommandThought.ts`

**Responsibility**

Define thought-related runtime commands.

**Logic**

Add command interfaces for:

- `SHOW_THOUGHT`
- `ACKNOWLEDGE_THOUGHT`
- `CLEAR_THOUGHT`

`SHOW_THOUGHT` payload must contain:

- `thoughtId`
- `body`
- `rememberScope`
- `resumeStatus`

`ACKNOWLEDGE_THOUGHT` payload must contain:

- `thoughtId`

`CLEAR_THOUGHT` payload may contain:

- `reason?: string`

**Interface**

Exports:

- `ShowThoughtCommand`
- `AcknowledgeThoughtCommand`
- `ClearThoughtCommand`

---

### Add — `src/engine/runtime/types/runtimeCommandPayloadsThought.ts`

**Responsibility**

Define payload shapes for thought-related commands.

**Logic**

Export payload interfaces matching the thought command contract.

**Interface**

Type exports only.

---

### Change — `src/engine/runtime/types/runtimeCommandTypes.ts`

**Responsibility**

Define the enum of command kinds.

**Logic**

Add:

- `ADJUST_FACT`
- `SHOW_THOUGHT`
- `ACKNOWLEDGE_THOUGHT`
- `CLEAR_THOUGHT`

**Interface**

The new command types are part of the runtime command enum.

---

### Change — `src/engine/runtime/types/runtimeCommandPayloads.ts`

**Responsibility**

Central payload export surface.

**Logic**

Re-export new facts and thought payload types.

**Interface**

Type export surface extended.

---

### Change — `src/engine/runtime/types/runtimeCommandInterfaces.ts`

**Responsibility**

Central command interface export surface.

**Logic**

Re-export new facts and thought command interfaces.

**Interface**

Type export surface extended.

---

### Change — `src/engine/runtime/types/runtimeCommandUnion.ts`

**Responsibility**

Define the `RuntimeCommand` union.

**Logic**

Add the new facts and thought command interfaces to the union.

**Interface**

`RuntimeCommand` now includes:

- `AdjustFactCommand`
- `ShowThoughtCommand`
- `AcknowledgeThoughtCommand`
- `ClearThoughtCommand`

---

## 7E. Facts helpers and handlers

### Add — `src/game/facts/factUtils.ts`

**Responsibility**

Centralize fact access, initialization, adjustment, and read helpers.

**Logic**

Provide helpers for:

- ensuring `run` or `permanent` maps exist on `sys_world`
- ensuring `factType` record exists
- reading a fact value with implicit `0`
- adjusting a fact value by delta with non-negative clamping

This file is the only place that knows how sparse fact maps are created.

**Interface**

Export helpers such as:

- `getFactValue(world, scope, factType, factAbout)`
- `adjustFact(world, scope, factType, factAbout, delta)`

No commands are defined here.

---

### Add — `src/game/facts/factCommands.ts`

**Responsibility**

Provide reusable helpers that enqueue fact adjustments.

**Logic**

Add helpers for:

- enqueueing a single fact adjustment,
- enqueueing mirrored run/permanent adjustments for events that should increment both.

This file replaces ad hoc hidden world counter helpers for the new facts system.

**Interface**

Export helpers such as:

- `enqueueFactAdjust(commands, scope, factType, factAbout, delta)`
- `enqueueMirroredFactAdjust(commands, factType, factAbout, delta)`

The exact helper names may vary, but the two capabilities are required.

---

### Add — `src/game/handlers/AdjustFactHandler.ts`

**Responsibility**

Apply `ADJUST_FACT` commands.

**Logic**

1. find `sys_world`,
2. validate the requested scope (`run` or `permanent`),
3. apply the delta through `factUtils.adjustFact`,
4. log an error if `sys_world` is missing.

This handler only mutates facts on `sys_world`.

**Interface**

Consumes:

- `ADJUST_FACT`

No other command types are handled here.

---

## 7F. Thought condition compilation and evaluation

### Add — `src/game/thoughts/thoughtConditionCompiler.ts`

**Responsibility**

Compile structured thought conditions into `LogicRule[]` that the existing `JsonLogicAdapter` can evaluate.

**Logic**

Map each supported condition row to a logic rule referencing runtime state paths:

- fact threshold → `sys_world.<scope>.<factType>.<factAbout>`
- world state threshold → `sys_world.state.<key>.value`

All conditions on a thought compile into an AND array.

This file must not evaluate conditions itself. It only compiles them.

**Interface**

Exports:

- `compileThoughtConditions(conditions): LogicRule[]`

---

### Add — `src/game/thoughts/thoughtEligibility.ts`

**Responsibility**

Determine whether a thought is eligible and select the first eligible thought.

**Logic**

Given:

- authored thought definitions,
- runtime snapshot,
- current blocking state,

perform the following:

1. return `null` immediately if a thought is already active,
2. return `null` if a draft is active,
3. iterate authored thoughts in order,
4. skip any thought whose seen counter in its `rememberScope` is greater than `0`,
5. compile and evaluate its conditions,
6. return the first eligible thought.

**Interface**

Exports:

- `selectEligibleThought(...) => ThoughtDefinition | null`

This file does not enqueue commands or mutate runtime state.

---

## 7G. Thought runtime system and handlers

### Add — `src/game/systems/ThoughtSystem.ts`

**Responsibility**

Evaluate authored thoughts during normal gameplay and request the first eligible one to be shown.

**Logic**

On each tick:

1. read `cartridge.config.settings.thoughts`;
2. if no thoughts are defined, do nothing;
3. if `sys_world.thought.active` is true, do nothing;
4. if `sys_world.draft.active` is true, do nothing;
5. use `thoughtEligibility.selectEligibleThought(...)`;
6. if one is selected, enqueue `SHOW_THOUGHT`.

`resumeStatus` must be taken from the runtime state at the moment the thought is selected.

This system must not run special logic while the game is already blocked by an active thought. It is a normal gameplay system, not a paused-state system.

**Interface**

Registered as a normal runtime system in `createGame()`.

---

### Add — `src/game/handlers/ShowThoughtHandler.ts`

**Responsibility**

Apply `SHOW_THOUGHT` by writing the active thought to `sys_world.thought`.

**Logic**

1. find `sys_world`,
2. if a thought is already active, do nothing,
3. if a draft is active, do nothing,
4. write the active thought object using the payload,
5. do not increment seen counters here.

This handler must not alter pause state directly. Pause remains controlled by the UI/runtime store, following the existing draft overlay pattern.

**Interface**

Consumes:

- `SHOW_THOUGHT`

---

### Add — `src/game/handlers/AcknowledgeThoughtHandler.ts`

**Responsibility**

Apply `ACKNOWLEDGE_THOUGHT`.

**Logic**

1. find `sys_world`,
2. validate that the active thought matches the acknowledged `thoughtId`,
3. increment `thought_seen.<thoughtId>` in the thought’s `rememberScope`,
4. clear the active thought object back to its inactive default state.

This handler is the sole authority for thought acknowledgement bookkeeping.

**Interface**

Consumes:

- `ACKNOWLEDGE_THOUGHT`

---

### Add — `src/game/handlers/ClearThoughtHandler.ts`

**Responsibility**

Support explicit clearing of the active thought without acknowledgement when needed by runtime management flows.

**Logic**

Reset `sys_world.thought` to its inactive default state.

This command is not used by normal player acknowledgement; it exists for parity with the draft model and for controlled runtime cleanup.

**Interface**

Consumes:

- `CLEAR_THOUGHT`

---

### Change — `src/game/main.ts`

**Responsibility**

Register game systems and command handlers.

**Logic**

Register the new systems and handlers:

Systems:

- `FactsSystem`
- `ThoughtSystem`

Handlers:

- `AdjustFactHandler`
- `ShowThoughtHandler`
- `AcknowledgeThoughtHandler`
- `ClearThoughtHandler`

Registration order requirements:

- `FactsSystem` must run during normal runtime updates before `ThoughtSystem`, so elapsed time facts are available before thought eligibility is checked.
- `ThoughtSystem` must run before systems that would otherwise continue to advance gameplay after the thought becomes eligible.
- `DraftSystem` remains unchanged.

**Interface**

Game runtime now knows about the facts and thoughts subsystems.

---

## 7H. Facts producers

### Add — `src/game/systems/FactsSystem.ts`

**Responsibility**

Continuously update elapsed time facts.

**Logic**

On each tick with positive `dt`:

- enqueue delta updates for `run.elapsed_real_seconds.world`
- enqueue delta updates for `permanent.elapsed_real_seconds.world`
- compute scaled gameplay seconds using the runtime time scale and enqueue updates for:
  - `run.elapsed_game_seconds.world`
  - `permanent.elapsed_game_seconds.world`

This system must not write directly to `sys_world`; it must use the standard facts command helpers.

**Interface**

Normal runtime system. No special paused-state behavior is required.

---

### Change — `src/engine/runtime/handlers/SpawnHandler.ts`

**Responsibility**

Create runtime entities from blueprint spawns.

**Logic**

After a spawn succeeds, enqueue mirrored fact adjustments for the spawned blueprint id:

- `blueprint_spawned.<blueprintId>` in `run`
- `blueprint_spawned.<blueprintId>` in `permanent`

Use `context.commands` to enqueue the fact commands.

Do not emit spawn facts for failed spawns.

Special case handling:

- the existing in-place `sys_world` spawn/update path must not increment blueprint spawned facts for `sys_world`.

**Interface**

No change to spawn command inputs or outputs.

---

### Change — `src/engine/runtime/handlers/KillHandler.ts`

**Responsibility**

Remove entities from the world.

**Logic**

Before the entity is removed, if it has a string `blueprintId`, enqueue mirrored fact adjustments for:

- `blueprint_killed.<blueprintId>` in `run`
- `blueprint_killed.<blueprintId>` in `permanent`

Then proceed with the existing kill behavior.

**Interface**

No change to kill command inputs or outputs.

---

### Change — `src/game/systems/cave/purgeEvaluate.ts`

**Responsibility**

Evaluate purge progression and activation.

**Logic**

When purge activation occurs, continue the existing cave update behavior and additionally enqueue mirrored fact adjustments for:

- `purge_began.world`

Do not replace existing cave update behavior in this file unless it is directly superseded by the new facts model.

**Interface**

Purge activation semantics remain unchanged.

---

### Change — `src/game/handlers/TriggerDraftHandler.ts`

**Responsibility**

Open a draft from a draft pool.

**Logic**

When a `TRIGGER_DRAFT` command successfully resolves to a real pool and a real trigger entity, increment cycle-completed facts for the triggering blueprint before or together with draft activation.

Fact updates:

- `run.cycle_completed.<triggerBlueprintId>`
- `permanent.cycle_completed.<triggerBlueprintId>`

This file is the correct hook because the current codebase already routes cycle-complete progression into `TRIGGER_DRAFT`.

Guardrails:

- do not increment the fact if the trigger entity is missing,
- do not increment the fact if the draft pool is missing or empty.

**Interface**

No change to draft command payloads.

---

### Change — `src/game/handlers/DispatchProxyHandler.ts`

**Responsibility**

Create proxy entities for body dispatch/recruitment flows.

**Logic**

When a proxy is dispatched toward `sys_world`, and the originating command metadata contains `sourceEntityId`, resolve the source entity and its blueprint id. If present, enqueue mirrored fact adjustments for:

- `body_recruited_at.<sourceBlueprintId>` in `run`
- `body_recruited_at.<sourceBlueprintId>` in `permanent`

Only do this for inbound body recruitment flows targeting `sys_world`.

Do not emit this fact for non-body dispatches or for dispatches to non-world targets.

**Interface**

No change to proxy command payloads.

---

## 7I. Blocking pause state and runtime shell

### Change — `src/engine/runtime/runtimePauseState.ts`

**Responsibility**

Define the runtime predicate for blocking overlays.

**Logic**

Generalize the current draft-only predicate into a blocking-overlay predicate that returns true when either of the following is active on `sys_world`:

- `draft.active`
- `thought.active`

Keep the existing draft helper if needed for compatibility, but introduce a single predicate used by system-phase code.

**Interface**

Export:

- `isBlockingOverlayActive(snapshot)`

Existing draft-specific helper may remain as a compatibility wrapper if other files still use it.

---

### Change — `src/engine/runtime/runtimeSystemPhase.ts`

**Responsibility**

Control which systems run during blocking overlays.

**Logic**

Replace use of the draft-only pause predicate with the new blocking-overlay predicate.

This ensures normal gameplay systems stop while a thought is active.

**Interface**

No signature change.

---

### Change — `src/game/systems/CaveSystem.ts`

**Responsibility**

Drive cave progression systems.

**Logic**

Replace its draft-only early-exit behavior with the new blocking-overlay predicate so cave gameplay does not continue underneath an active thought.

**Interface**

No public API change.

---

### Add — `src/ui/runtime/thoughts/useThoughtState.ts`

**Responsibility**

Select the active thought from runtime state and provide the `CONTINUE` action.

**Logic**

Read `sys_world.thought` via the same selector pattern used by `useDraftState`.

Expose:

- `thought`
- `continueThought()`

`continueThought()` must:

1. enqueue `ACKNOWLEDGE_THOUGHT`,
2. call `runtime.flushCommands()`,
3. restore runtime status using `thought.resumeStatus`:
   - if `running`, call `play()`
   - if `paused`, keep paused

This is mandatory so dismissal works immediately while paused.

**Interface**

Hook return shape:

- `{ thought, continueThought }`

---

### Add — `src/ui/runtime/thoughts/ThoughtOverlay.tsx`

**Responsibility**

Render the active thought as a fullscreen blocking modal.

**Logic**

- subscribe to `useThoughtState()`
- when `thought.active` becomes true, pause the runtime if it is currently running
- render fullscreen `Modal isOpen` without `onClose`
- render `thought.body` via existing `RichText`
- render a single `CONTINUE` button
- clicking `CONTINUE` calls `continueThought()` only

The overlay must not close on backdrop click or Esc.

**Interface**

No props.

Purely runtime-store/runtime-state driven.

---

### Change — `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

**Responsibility**

Compose runtime overlays and world UI.

**Logic**

Render `ThoughtOverlay` alongside existing overlays.

Required stacking rule:

- `ThoughtOverlay` must be rendered as a blocking overlay in the same shell layer family as `DraftOverlay`.

Do not remove or repurpose `DraftOverlay`.

**Interface**

No prop changes.

---

## 7J. Rebirth and persistence management

### Change — `src/ui/runtime/terminal/commands/gameRebirthCommand.ts`

**Responsibility**

Reset the game into a new run while carrying forward intended persistent data.

**Logic**

Extend rebirth so that it preserves `sys_world.permanent` in addition to the existing cave data.

After the start script has rebuilt the runtime world, rebirth must restore:

- the selected cave fields it already restores today,
- the entire `permanent` facts object,
- and must leave `run` empty/default,
- and leave `thought` inactive/default.

Restoration must happen through the runtime command path or the same command application approach already used by rebirth.

**Interface**

Rebirth behavior change:

- `permanent` survives,
- `run` resets.

---

## 7K. Thoughts editor and route plumbing

### Add — `src/ui/devtools/editors/config/thoughts/useThoughtsSession.ts`

**Responsibility**

Provide session-backed read/write helpers for `.cave` thoughts editing.

**Logic**

Mirror the pattern used by existing config editors such as notifications:

- read thoughts from the module session draft,
- expose add/remove/update/rename helpers,
- keep all writes scoped to the existing module session store.

Storage path:

- `config.settings.thoughts`

**Interface**

Must expose enough operations for the Thoughts editor to:

- list thoughts,
- add one,
- remove one,
- rename by id,
- update fields,
- insert/remove condition rows.

---

### Add — `src/ui/devtools/editors/config/thoughts/ThoughtsEditor.tsx`

**Responsibility**

Render the top-level thoughts editor for a `.cave` file.

**Logic**

- ensure module session exists,
- read thoughts through `useThoughtsSession`,
- render a `ToolFrame`,
- render one accordion row per thought using `ComponentRow`,
- render an add button when no rows or at the bottom of the list.

Rows must appear in authored order and stay in that order.

**Interface**

Props:

- `filename: string`

No other props.

---

### Add — `src/ui/devtools/editors/config/thoughts/ThoughtForm.tsx`

**Responsibility**

Render one thought row.

**Logic**

Inside a `ComponentRow`:

- editable thought id
- remember scope enum (`run` / `permanent`)
- rich text body textarea
- rich text preview using existing `RichText`
- ordered condition rows
- add condition button
- delete thought button

Collapsed summary must include:

- first non-empty line of the body, or `Empty` if none

This mirrors the established row UX used by draft text rows and notification forms.

**Interface**

Props:

- `filename`
- `index`
- `onRemove`
- `onRename`

The exact prop shape may vary, but it must support session-backed editing without local shadow state beyond temporary field buffering.

---

### Add — `src/ui/devtools/editors/config/thoughts/ThoughtConditionRow.tsx`

**Responsibility**

Render one structured thought condition row.

**Logic**

For `fact_threshold`:

- scope dropdown
- fact type dropdown
- fact-about field
- operator dropdown
- numeric value field

For `world_state_threshold`:

- state key field
- operator dropdown
- numeric value field

Editor comfort requirements:

- fact type is a finite dropdown, not free text
- fact-about is constrained where possible:
  - blueprint-based fact types use project blueprint autocomplete
  - `elapsed_*` and `purge_began` use fixed `world`
- world state key suggestions must include at least `food` and `heat`

No freeform raw logic text is allowed in this editor.

**Interface**

Controlled by session-backed paths.

---

### Add — `src/ui/devtools/editors/config/thoughts/thoughtConditionAutocomplete.ts`

**Responsibility**

Provide autocomplete/suggestion sources for thought condition fields.

**Logic**

Use existing project blueprint lookup hooks/utilities where available for blueprint-based `factAbout` suggestions.

State key suggestions are fixed for version 1:

- `food`
- `heat`

This file must not depend on `BlueprintContext`.

**Interface**

Exports helpers used by `ThoughtConditionRow`.

---

### Change — `src/ui/devtools/editors/file/SystemConfigEditor.tsx`

**Responsibility**

Render the `.cave` dashboard of config editors.

**Logic**

Add a new dashboard card:

- title: `Thoughts`
- description: explain that it configures fullscreen narrative thoughts and their conditions
- click route: `thoughts::${filename}`

Do not remove any existing dashboard cards.

**Interface**

No prop changes.

---

### Change — `src/ui/devtools/shell/window-manager/virtualPath.constants.ts`

**Responsibility**

Define supported routed editor prefixes.

**Logic**

Add route prefix:

- `thoughts`

**Interface**

`RoutePrefix` now includes `thoughts`.

---

### Change — `src/ui/devtools/shell/window-manager/virtualPath.types.ts`

**Responsibility**

Define routed virtual path kinds.

**Logic**

Add path kind:

- `{ kind: "thoughts"; filename: string }`

**Interface**

Virtual path union extended.

---

### Change — `src/ui/devtools/shell/window-manager/virtualPath.parseRouted.ts`

**Responsibility**

Parse routed editor paths into virtual paths.

**Logic**

Add parsing for prefix `thoughts`.

**Interface**

`thoughts::<filename>` resolves to `{ kind: "thoughts", filename }`.

---

### Change — `src/ui/devtools/shell/window-manager/virtualPath.serialize.ts`

**Responsibility**

Serialize virtual paths back into routed paths.

**Logic**

Add serialization for `kind: "thoughts"`.

**Interface**

Round-trip support for thoughts route.

---

### Change — `src/ui/devtools/shell/window-manager/tabIds.ts`

**Responsibility**

Define stable tab ids for editor tabs.

**Logic**

Add tab kind:

- `thoughts`

Generate tab ids as:

- `thoughts:<filename>`

**Interface**

`TabIdParams` and `makeTabId()` now support thoughts editor tabs.

---

### Change — `src/ui/devtools/shell/window-manager/tabIdToVirtualPath.ts`

**Responsibility**

Map tab ids back to routed paths.

**Logic**

Add reverse mapping for `thoughts:<filename>`.

**Interface**

Thoughts tabs survive layout restoration and route sync.

---

### Change — `src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.config.ts`

**Responsibility**

Open config editor tabs from routed paths.

**Logic**

Add a route handler for `thoughts` that:

- ensures the module session exists,
- opens a closeable tab,
- sets component id to `thoughts`,
- sets the tab title to `Thoughts Editor`.

**Interface**

Thoughts routes can now open a tab.

---

### Change — `src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx`

**Responsibility**

Resolve config editor components from route component ids.

**Logic**

Add case:

- `thoughts` → `ThoughtsEditor`

**Interface**

The config editor resolver now supports the Thoughts editor.

---

## 8. Test plan

All tests must follow the project testing contract:

- behavior-first,
- deterministic,
- minimal mocking,
- real runtime/config data where practical,
- Given/When/Then readable assertions.

## 8A. Schema and config tests

### Add — `src/data/schemas/thoughts.test.ts`

**Cases**

1. parses a valid thought definition with `fact_threshold`
2. parses a valid thought definition with `world_state_threshold`
3. rejects invalid remember scope
4. rejects invalid condition kind
5. rejects missing required thought fields

---

### Change — tests covering `.cave` semantic parsing/serialization

Relevant existing semantic/module tests must be extended to verify:

1. `.cave` accepts top-level `thoughts`
2. `toCaveModule()` preserves thoughts under `config.settings.thoughts`
3. `serializeCaveFragment()` round-trips thoughts without loss

---

## 8B. Persistence and rebirth tests

### Change — save/load persistence tests covering flyweight stateful keys

Add coverage for:

1. `run` persists through save/load
2. `permanent` persists through save/load
3. `thought` persists through save/load when active

---

### Change — `src/ui/runtime/terminal/commands/gameRebirthCommand.test.ts`

**Cases**

1. preserves `permanent` facts across rebirth
2. resets `run` facts across rebirth
3. clears active thought across rebirth
4. preserves existing cave progression behavior unchanged

---

## 8C. Facts handler and facts system tests

### Add — `src/game/handlers/AdjustFactHandler.test.ts`

**Cases**

1. creates missing nested maps and increments from zero
2. increments an existing fact
3. clamps negative results at zero
4. logs error when `sys_world` is missing

---

### Add — `src/game/systems/FactsSystem.test.ts`

**Cases**

1. increments real-time facts by `dt / 1000`
2. increments game-time facts by scaled time
3. does nothing for non-positive `dt`
4. enqueues both run and permanent updates

---

## 8D. Fact producer tests

### Change — `src/engine/runtime/handlers/SpawnHandler` tests

Add coverage that successful non-world spawns increment:

- `run.blueprint_spawned.<id>`
- `permanent.blueprint_spawned.<id>`

And that failed spawns do not.

---

### Change — `src/engine/runtime/handlers/KillHandler.test.ts`

Add coverage that killing a blueprint-backed entity increments:

- `run.blueprint_killed.<id>`
- `permanent.blueprint_killed.<id>`

---

### Change — purge evaluation tests

Add coverage that purge activation increments:

- `run.purge_began.world`
- `permanent.purge_began.world`

exactly once per purge start edge.

---

### Change — `src/game/handlers/TriggerDraftHandler` tests

Add coverage that a successful trigger from an entity with blueprint id `explore` increments:

- `run.cycle_completed.explore`
- `permanent.cycle_completed.explore`

and that missing/invalid pool cases do not increment the fact.

---

### Change — `src/game/handlers/DispatchProxyHandler.test.ts`

Add coverage that an inbound body recruitment from source blueprint `luretraveler` increments:

- `run.body_recruited_at.luretraveler`
- `permanent.body_recruited_at.luretraveler`

and that non-world targets do not.

---

## 8E. Thought runtime tests

### Add — `src/game/thoughts/thoughtConditionCompiler.test.ts`

**Cases**

1. compiles fact-threshold conditions to the correct world fact ref path
2. compiles world-state-threshold conditions to `sys_world.state.<key>.value`
3. compiles multiple rows with AND semantics

---

### Add — `src/game/thoughts/thoughtEligibility.test.ts`

**Cases**

1. returns the first eligible thought in authored order
2. skips already seen thoughts using `rememberScope`
3. skips all thoughts when a draft is active
4. skips all thoughts when another thought is active
5. returns null when no conditions are satisfied

---

### Add — `src/game/systems/ThoughtSystem.test.ts`

**Cases**

1. enqueues `SHOW_THOUGHT` for the first eligible thought
2. does not enqueue when no thoughts exist
3. does not enqueue when a thought is already active
4. does not enqueue when a draft is active

---

### Add — `src/game/handlers/ShowThoughtHandler.test.ts`

**Cases**

1. writes the active thought to `sys_world.thought`
2. does not overwrite an already active thought
3. does not activate while draft is active
4. logs error when `sys_world` is missing

---

### Add — `src/game/handlers/AcknowledgeThoughtHandler.test.ts`

**Cases**

1. increments `run.thought_seen.<id>` for run-scoped thoughts and clears the active thought
2. increments `permanent.thought_seen.<id>` for permanent-scoped thoughts and clears the active thought
3. ignores acknowledgements that do not match the active thought id

---

### Add — `src/ui/runtime/thoughts/ThoughtOverlay.test.tsx`

**Cases**

1. renders full-screen rich text when thought is active
2. shows only a `CONTINUE` dismissal path
3. does not close on backdrop click
4. pauses the runtime when the thought opens
5. on `CONTINUE`, flushes commands and restores the stored resume status

---

### Change — runtime pause/system-phase tests

Add coverage that a thought-active world causes the blocking overlay predicate to pause normal systems in the same way draft does.

---

## 8F. Editor and route tests

### Add — `src/ui/devtools/editors/config/thoughts/ThoughtsEditor.test.tsx`

**Cases**

1. renders empty-state text when no thoughts exist
2. adds a thought row
3. removes a thought row
4. renders a rich-text preview from the body
5. preserves authored order

---

### Add — `src/ui/devtools/editors/config/thoughts/ThoughtConditionRow.test.tsx`

**Cases**

1. renders correct controls for `fact_threshold`
2. renders correct controls for `world_state_threshold`
3. switches control set when condition kind changes
4. uses blueprint suggestions for blueprint-based fact-about fields

---

### Change — route/tab plumbing tests

Extend existing window-manager route/tab tests to verify:

1. `thoughts::<filename>` parses to the correct virtual path
2. the virtual path serializes back correctly
3. the thoughts tab id maps back to the thoughts route
4. the config route handler opens a `Thoughts Editor` tab
5. the config resolver renders `ThoughtsEditor`

---

### Change — `src/ui/devtools/editors/file/SystemConfigEditor` tests

Add coverage that the dashboard includes a `Thoughts` card and opens the correct route.

---

## 9. Acceptance criteria

The implementation is complete only when all of the following are true:

1. `.cave` files support a top-level `thoughts` array.
2. Thoughts round-trip through parse → module → serializer without loss.
3. `sys_world` has dedicated `run`, `permanent`, and `thought` runtime objects.
4. `run` and `permanent` persist through save/load.
5. `permanent` persists through rebirth.
6. `run` resets through rebirth.
7. Thoughts open as fullscreen blocking modals.
8. Thoughts can only be dismissed by clicking `CONTINUE`.
9. `CONTINUE` clears the active thought immediately even while paused.
10. After `CONTINUE`, runtime status is restored to the status that existed before the thought opened.
11. Thought eligibility is deterministic and ordered by authored list position.
12. Thought conditions support the condition kinds defined in this document and no others.
13. Standard facts are collected for:
    - elapsed real seconds,
    - elapsed in-game seconds,
    - blueprint spawned,
    - blueprint killed,
    - purge began,
    - cycle completed,
    - body recruited at source blueprint,
    - thought seen.
14. The Thoughts editor exists in `.cave`, uses accordion rows, supports rich-text editing/preview, and uses a structured condition stack.
15. The Thoughts editor is reachable from the `.cave` dashboard and via routed editor tabs.
16. All tests defined in this document pass.

---

## 10. Non-goals and explicit exclusions

The following are intentionally excluded from this implementation:

1. replacing the existing tutorial system,
2. replacing the existing notifications system,
3. general expression parsing for thoughts,
4. OR/NOT/nested condition groups,
5. arbitrary persistent memory outside the `run` / `permanent` facts objects,
6. generic migration of all existing hidden cave state counters to facts,
7. changes to blueprint editor UX unrelated to Thoughts,
8. unrelated refactors in runtime shell, cinematic, or dormancy presentation.

This design is the implementation contract.
