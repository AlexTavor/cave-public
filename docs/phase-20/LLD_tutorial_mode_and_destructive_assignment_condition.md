# LLD: Tutorial Mode, Tutorial `onComplete`, and Destructive-Assignment Last-Body Condition

## Status

Proposed implementation design.

## Inputs and governing constraints

This design is constrained by the current codebase and the uploaded project contract documents.

Authoritative inputs used while writing this design:
- `AI Context Pack — Canonical`
- `Prompt Contract — Canonical`
- `Testing Standards — Canonical`

This design therefore preserves the following project laws:
- runtime state is owned by ECS
- commands propose change; apply decides reality
- systems are read-only and emit commands only
- UI renders semantic state and does not mutate runtime directly
- new work must prefer existing mechanisms over new abstractions

## Scope

This document covers all requested changes:

1. Add a persistent tutorial-mode flag that prevents `sys_world` food and heat from dropping below 50% while enabled.
2. Add a runtime terminal command to set that flag.
3. Persist the flag across new runs and `game.reset`, and clear it through Reset Tutorial.
4. Add authored tutorial `onComplete` actions using the existing behavior-action mechanism.
5. Execute tutorial `onComplete` actions only for valid tutorial completions.
6. Add a new tutorial condition that becomes true when the evaluated destructive assignment node holds all extant bodies, so tutorials can warn that processing those bodies will end the run.

## Non-goals

The implementation must not:
- introduce a new tutorial subsystem
- add direct ECS mutation from React
- add a new general-purpose fact system for this feature
- refactor unrelated persistence paths
- change dormancy/extinction semantics
- change assignment-processing behavior itself

## Locked decisions

### 1. Tutorial mode is a hidden numeric world-state entry

The flag will live at `sys_world.state.tutorial_mode.value`.

Contract:
- default value: `1`
- disabled value: `0`
- visible: `false`
- lifetime: persistent outside a single run
- reset behavior: Reset Tutorial restores it to `1`

Reason:
- the existing behavior action system already writes `sys_world.state.*` through `MUTATE` → `SET_GLOBAL`
- tutorial completion actions therefore can disable tutorial mode without any new action type
- this keeps the authored `onComplete` action path aligned with the existing behavior executor

### 2. Tutorial mode persistence uses the existing tutorial-persistence pattern, not runtime-local state

The flag is not per run. It must survive:
- New Game bootstrap
- `run example/scripts/start.cvs`
- `game.reset`

It must be cleared only by Reset Tutorial.

### 3. Tutorial `onComplete` reuses existing `BehaviorAction[]`

No new tutorial-specific action language will be added.

Reason:
- `BehaviorActionSchema`
- `BehaviorActionArrayField`
- `executeBehaviorActionList`
- runtime action provenance

already exist and are sufficient.

### 4. The new “last body assigned…” feature is implemented as a new structured condition kind, not a new fact type

Internal condition kind:
- `destructive_assignment_has_all_bodies`

Reason:
- the requirement is a tutorial predicate bound to tutorial `self`
- the current fact-threshold path does not support dynamic authored `self` for arbitrary fact types
- a custom structured condition kind is already an existing pattern in this codebase (`entity_tag_present`, `world_state_boolean`, `user_interaction`)
- this keeps the feature inside the tutorial/condition mechanism instead of creating a new run fact solely for tutorial authoring

### 5. “Will end the run” must align with existing extinction semantics

The new condition must use the same definition of “body that matters for extinction” as the runtime extinction path.

Current extinction is driven by `CensusSystem`, which counts extant bodies as:
- entities with a `body` component
- excluding entities tagged `aggregate`

The new condition must use that same body set.

## Functional requirements

### FR-1 Tutorial mode clamp

When `sys_world.state.tutorial_mode.value >= 1`:
- `food.value` must never remain below `food.max * 0.5`
- `heat.value` must never remain below `heat.max * 0.5`

When tutorial mode is off:
- current clamp behavior remains unchanged

### FR-2 Tutorial mode defaults and persistence

- default is on in a fresh runtime
- the flag persists across New Game bootstrap and `game.reset`
- Reset Tutorial restores it to on

### FR-3 Terminal command

A runtime terminal command must exist:
- `tutorial_mode true`
- `tutorial_mode false`

The command must:
- validate its single boolean argument
- update the live runtime
- update persistent storage

### FR-4 Tutorial `onComplete`

Tutorial definitions must support:
- `onComplete: BehaviorAction[]`

Those actions must:
- run after the tutorial is marked complete
- use the existing behavior-action executor
- run only for valid completions
- not run for invalid/missing tutorials that are auto-completed only to suppress retry loops

### FR-5 Destructive assignment warning condition

The new condition must evaluate to true only when all of the following are true:
- the evaluated `self` exists
- `self` is a destructive assignment node
- `self.assignment.assignedIds` is non-empty
- every extant non-aggregate body in the snapshot is assigned to `self`

The condition must evaluate to false when:
- `self` is not destructive
- any extant body is assigned elsewhere or unassigned
- there are zero extant bodies
- `self` is missing

This is the stateful implementation of the requested “last body assigned to a destructive assign ability node” tutorial trigger.

## Implementation plan in 6 steps

---

## Step 1 — Add tutorial mode to world state and clamp food/heat

### Why

The clamp must be enforced inside the runtime world rules, not in UI or ad hoc handlers.

`worldClampRules.ts` is already the authored mechanism responsible for system-level world value clamping.

### What

Add a hidden `tutorial_mode` state entry to `sys_world`, default `1`, and add tutorial-floor clamp rules for `food` and `heat`.

### How

#### File: `src/data/schemas/v2/caveWorldDefaults.ts`

Responsibility:
- defines default `sys_world.state` entries for a fresh runtime

Change:
- add `tutorial_mode: { value: 1, visible: false }`

Interface contract:
- type remains a world state entry
- value is numeric, not boolean
- only `0` and `1` are valid persisted values

#### File: `src/data/schemas/v2/worldClampRules.ts`

Responsibility:
- defines authored `sys_world` clamp rules

Change:
- add one new floor rule for `food`
- add one new floor rule for `heat`

Rule contract:
- rule fires only when `tutorial_mode >= 1`
- rule fires only when the current resource value is below 50% of its own `max`
- rule sets the current resource value to exactly 50% of its own `max`

Ordering contract:
- the existing below-zero clamp stays first
- the tutorial-floor clamp runs after the below-zero clamp
- the max clamp runs after the tutorial-floor clamp

Reason for ordering:
- negative values must first clamp to `0`
- tutorial mode must then raise `0` to `50%`
- final value must still remain capped by the existing max clamp

Implementation note:
- these two new rules must use compiled JsonLogic because the threshold and target value both depend on `self.state.<resource>.max`

No other world resources are affected.

---

## Step 2 — Persist tutorial mode across New Game and `game.reset`, and restore it on Reset Tutorial

### Why

The requirement explicitly says the flag is permanent and not per run. The current code already preserves tutorial completion memory through New Game and resets it through Reset Tutorial. Tutorial mode must use the same lifecycle.

### What

Add a sibling persistence helper for tutorial mode and wire it into:
- runtime shell persistence
- New Game bootstrap/start script restore
- Reset Tutorial
- runtime store reset

### How

#### File: `src/ui/runtime/tutorials/tutorialModeMemory.ts` (new)

Responsibility:
- single-purpose persistence helper for tutorial mode

Exports and contracts:
- `readStoredTutorialMode(): 0 | 1`
  - reads local storage
  - returns `1` on missing/invalid data
- `persistTutorialMode(value: number): void`
  - normalizes to `0 | 1`
  - writes local storage
- `extractTutorialMode(runtime): 0 | 1`
  - reads the live runtime world state if available
  - falls back to storage
  - falls back to `1`
- `restoreTutorialMode(runtime, value): void`
  - persists normalized value
  - enqueues the live runtime update
  - flushes commands when a flush function is available
- `resetTutorialMode(runtime): void`
  - persists `1`
  - enqueues the live runtime update to `1`
  - flushes commands when a flush function is available

Storage contract:
- dedicated key
- stored payload is a single normalized numeric flag, not an object with unrelated tutorial data

#### File: `src/ui/runtime/tutorials/usePersistTutorialMode.ts` (new)

Responsibility:
- observe `sys_world.state.tutorial_mode.value` and persist it when it changes

Interface:
- no arguments
- no return value
- mounted once from runtime shell

Observed source of truth:
- the ECS world state only

#### File: `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

Responsibility:
- mount runtime-level persistence hooks

Change:
- mount `usePersistTutorialMode()` next to `usePersistTutorialCompletionMemory()`

#### File: `src/app-shell/useAppShellControllerCallbacks.ts`

Responsibility:
- preserve tutorial data across New Game bootstrap and the follow-up start script

Change:
- add a `tutorialModeRef`
- on New Game confirmation, snapshot tutorial mode from the current runtime before unloading it
- after `run example/scripts/start.cvs` succeeds, restore tutorial completion memory first, then restore tutorial mode, then resume play

Ordering contract:
- restore tutorial completion memory before tutorial mode
- both restores happen before `play()` and overlay close

#### File: `src/ui/runtime/tutorials/useResetTutorial.ts`

Responsibility:
- Reset Tutorial button behavior

Change:
- keep existing tutorial-completion reset behavior
- also reset tutorial mode to `1` in storage and in the live runtime
- continue clearing active tutorial state through `SET_TUTORIAL_STATE`

Availability contract:
`canResetTutorial` must become true when any of the following is true:
- active tutorial exists
- permanent tutorial completion memory exists in world or storage
- tutorial mode is stored as `0`
- tutorial mode is currently `0` in the live runtime

#### File: `src/ui/runtime/state/useRuntimeStore.ts`

Responsibility:
- store-level runtime reset behavior

Change:
- snapshot tutorial mode before `runtime.reset()` using `extractTutorialMode(runtime)`
- call `runtime.reset()`
- immediately restore tutorial mode onto the fresh runtime using `restoreTutorialMode(runtime, savedMode)`
- keep existing UI reset behavior unchanged

Reason:
- `game.reset` delegates to store reset
- the start script already contains `game.reset`
- this is the seam that guarantees tutorial mode is truly “not per run”

No production change is required in `src/ui/runtime/terminal/commands/gameResetCommand.ts`, because it already delegates to `context.runtime.reset()`.

---

## Step 3 — Add the terminal command `tutorial_mode true|false`

### Why

The flag must be directly settable by authored scripts and debug/runtime workflows.

### What

Add a runtime terminal command that normalizes the authored boolean argument into the numeric world-state contract.

### How

#### File: `src/ui/runtime/terminal/runtimeConstants.ts`

Responsibility:
- runtime terminal argument schemas

Change:
- add a single-argument schema for the tutorial-mode command

Command argument contract:
- exactly one argument is required
- accepted values are the strings `true` or `false`, case-insensitive at command level

#### File: `src/ui/runtime/terminal/commands/tutorialModeCommand.ts` (new)

Responsibility:
- runtime terminal entrypoint for tutorial mode

Command contract:
- name: `tutorial_mode`
- usage: `tutorial_mode true|false`
- success behavior:
  - resolve active runtime
  - normalize `true -> 1`, `false -> 0`
  - call `restoreTutorialMode(runtime, normalizedValue)`
  - return success text that includes the normalized final state
- error behavior:
  - runtime missing → error result
  - invalid argument → standard invalid-arguments result

State contract:
- live runtime and persistent storage are updated together

#### File: `src/ui/runtime/terminal/runtimeRegistry.ts`

Responsibility:
- runtime command registration

Change:
- register `tutorialModeCommand`

No other command behavior changes.

---

## Step 4 — Add authored tutorial `onComplete` actions

### Why

Tutorial completion needs to be able to permanently disable tutorial mode and perform other authored follow-up work using the same action language already used elsewhere.

### What

Extend tutorial definitions and the tutorial editor to support `BehaviorAction[]` as `onComplete`.

### How

#### File: `src/data/schemas/tutorials.ts`

Responsibility:
- tutorial authored schema and runtime type

Change:
- add `onComplete` to `TutorialDefinitionSchema`
- type: `BehaviorAction[]`
- default: `[]`

Interface contract:
- tutorial configs may omit `onComplete`
- omitted `onComplete` is treated exactly as an empty array

Dependency contract:
- reuse `BehaviorActionSchema`
- do not introduce a tutorial-specific action schema

#### File: `src/ui/devtools/editors/config/tutorials/tutorialEditorDefaults.ts`

Responsibility:
- default tutorial authoring payload

Change:
- include `onComplete: []`

#### File: `src/ui/devtools/editors/config/tutorials/TutorialForm.tsx`

Responsibility:
- tutorial authoring UI

Change:
- render `BehaviorActionArrayField` bound to `${basePath}.onComplete`

Editor contract:
- reuse the existing behavior-action text compiler and display formatter
- do not add a second tutorial-only action editor
- tooltip text must explicitly state that actions run only on valid completion

Authoring contract:
- authored completion actions can use existing mutate syntax to disable tutorial mode by writing the world-state key

---

## Step 5 — Execute tutorial `onComplete` only for valid completions

### Why

The current tutorial system intentionally auto-completes invalid tutorials so they do not retry forever. That behavior must remain for `tutorial_completed`, but invalid tutorials must never run gameplay actions.

### What

Upgrade tutorial completion resolution from a list of ids to a typed completion result set that distinguishes:
- valid completion
- invalid auto-completion

### How

#### File: `src/game/systems/resolveTutorialTickState.ts`

Responsibility:
- compute next tutorial state and completion outcomes for the current tick

Interface change:
- replace `completionIds: string[]` with `completions: TutorialCompletion[]`

`TutorialCompletion` contract:
- valid completion record:
  - `kind: "completed"`
  - `tutorialId: string`
  - `selfId: string`
- invalid completion record:
  - `kind: "invalid"`
  - `tutorialId: string`
  - `error: string`

Behavior contract:
- each tutorial id can appear at most once per tick
- invalid completions still log their error once and are still marked complete for permanent tutorial-memory purposes
- valid completions retain the frozen `selfId` needed to run `onComplete`

#### File: `src/game/systems/resolveTutorialCandidateSelection.ts`

Responsibility:
- queued candidate evaluation and selection

Change:
- update the `complete(...)` callback signature to accept `TutorialCompletion`
- invalid candidate tutorials produce `kind: "invalid"`

No change to candidate ranking or preemption rules.

#### File: `src/game/systems/HardTutorialSystem.ts`

Responsibility:
- enqueue tutorial state/facts for the runtime tick
- execute authored tutorial completion actions

Change:
- keep `SET_TUTORIAL_STATE` behavior unchanged
- for every completion, continue enqueueing `ADJUST_FACT` for `permanent.tutorial_completed`
- for each `kind: "completed"` completion:
  - look up the authored tutorial definition by `tutorialId`
  - if `onComplete` is empty, do nothing further
  - resolve `self` from `snapshot.getEntity(selfId)`
  - if `self` is unexpectedly missing at execution time, fall back to `sys_world`
  - execute `onComplete` through `executeBehaviorActionList`
  - use command provenance lane `tutorial_on_complete`
- for each `kind: "invalid"` completion:
  - do not execute `onComplete`

Command ordering contract inside the buffer:
1. `SET_TUTORIAL_STATE`
2. `ADJUST_FACT tutorial_completed`
3. commands emitted by tutorial `onComplete`

Runtime-phase contract:
- because systems emit commands for the next apply phase, `onComplete` effects become visible on the next tick, which is consistent with the project runtime law

#### File: `src/engine/runtime/commandMetadata.ts`

Responsibility:
- runtime command provenance typing

Change:
- add `tutorial_on_complete` to `RuntimeCommandSourceLane`

No other behavior executor changes are required. `src/game/handlers/executeBehaviorActionList.ts` already accepts a caller-supplied source lane and remains reusable as-is.

---

## Step 6 — Add the destructive-assignment “all bodies assigned” condition

### Why

Tutorials need to warn the player when assigning all bodies to absorption would make the run inevitably end once that destructive processing resolves.

### What

Add a fieldless structured condition kind:
- `destructive_assignment_has_all_bodies`

Semantics:
- true only when the evaluated `self` is a destructive assignment node and it currently holds every extant body

### How

#### File: `src/game/assignment/extantBodyIds.ts` (new)

Responsibility:
- canonical helper for “extant body” semantics used by extinction-adjacent logic

Exports and contracts:
- `isExtantBodyEntity(entity): boolean`
  - true when entity has a `body` component and does not have the `aggregate` tag
- `collectExtantBodyIds(entities): string[]`
  - returns sorted or stable ids for all extant bodies
- `countExtantBodies(entities): number`
  - returns the number of extant bodies

Reason:
- this removes divergence between extinction counting and the new tutorial-warning condition

#### File: `src/game/systems/CensusSystem.ts`

Responsibility:
- extinction/dormancy population check

Change:
- replace its private body-count predicate with `countExtantBodies(...)` from the new helper

Behavior contract:
- no behavior change
- only source-of-truth consolidation

#### File: `src/game/assignment/destructiveAssignmentCondition.ts` (new)

Responsibility:
- pure predicate for the new structured condition

Export contract:
- `evaluateDestructiveAssignmentHasAllBodies(snapshot, selfId): boolean`

Logic contract:
1. resolve `self` from snapshot; if missing, return `false`
2. verify `self.state.processing_destroys_assigned_bodies.value === true`; otherwise return `false`
3. read `self.assignment.assignedIds`; if empty, return `false`
4. collect extant body ids using `collectExtantBodyIds(snapshot.getEntities())`
5. if extant body count is zero, return `false`
6. return `true` only when the set of extant body ids exactly matches the set of ids assigned to `self`

This exact-match rule is required.

It prevents false positives when:
- one or more bodies are still free
- one or more bodies are assigned to a different node
- `self` holds only a subset of bodies

#### File: `src/data/schemas/conditions.ts`

Responsibility:
- structured condition schema

Change:
- add a new discriminant member:
  - `kind: "destructive_assignment_has_all_bodies"`
- like other structured condition rows, it still receives generated `id` and `sortKey`

Interface contract:
- the kind has no authored parameters beyond the discriminant and standard row metadata
- the evaluated entity is the resolved tutorial/condition `self`

#### File: `src/engine/compiler/conditions/compileStructuredConditions.ts`

Responsibility:
- compile structured condition kinds into JsonLogic expressions

Change:
- compile `destructive_assignment_has_all_bodies` to a dedicated custom JsonLogic op that evaluates against the current `self`

Compilation contract:
- the compiled expression must not rely on `self.assignment.assignedIds` via normal property access, because the current entity facade reserves `assignment` for assignment-parent lookup semantics

#### File: `src/engine/logic/JsonLogicAdapter.ops.ts`

Responsibility:
- custom JsonLogic runtime operations

Change:
- add a new operation dedicated to the destructive-assignment condition
- operation delegates to `evaluateDestructiveAssignmentHasAllBodies(...)`

Reason:
- this preserves the existing condition-evaluation pipeline instead of introducing a second tutorial-only evaluator

#### File: `src/game/conditions/evaluateStructuredConditionSet.ts`

Responsibility:
- evaluate compiled condition gates against runtime snapshot context

Production change:
- no logic change required

Reason:
- the new condition compiles through the existing JsonLogic path

#### File: `src/ui/devtools/editors/conditions/StructuredConditionRow.tsx`

Responsibility:
- structured-condition authoring UI kind switcher

Change:
- add `destructive_assignment_has_all_bodies` to the kind enum and rendering branch

#### File: `src/ui/devtools/editors/conditions/StructuredConditionSimpleFields.tsx`

Responsibility:
- fieldless/simple condition-kind fieldsets

Change:
- add a no-input fieldset for the new kind that renders explanatory text only

Authoring contract:
- the UI must make it explicit that this condition uses the resolved `self`
- it must state that the node must destroy assigned bodies and currently hold all extant bodies

#### File: `src/ui/devtools/editors/conditions/structuredConditionDefaults.ts`

Responsibility:
- default structured-condition payload creation

Change:
- add a default object for `destructive_assignment_has_all_bodies`

No autocomplete changes are required because the kind has no authored parameters.

## File-by-file summary

### New production files

- `src/ui/runtime/tutorials/tutorialModeMemory.ts`
- `src/ui/runtime/tutorials/usePersistTutorialMode.ts`
- `src/ui/runtime/terminal/commands/tutorialModeCommand.ts`
- `src/game/assignment/extantBodyIds.ts`
- `src/game/assignment/destructiveAssignmentCondition.ts`

### Modified production files

- `src/data/schemas/v2/caveWorldDefaults.ts`
- `src/data/schemas/v2/worldClampRules.ts`
- `src/ui/runtime/shell/RuntimeShellCanvas.tsx`
- `src/app-shell/useAppShellControllerCallbacks.ts`
- `src/ui/runtime/tutorials/useResetTutorial.ts`
- `src/ui/runtime/state/useRuntimeStore.ts`
- `src/ui/runtime/terminal/runtimeConstants.ts`
- `src/ui/runtime/terminal/runtimeRegistry.ts`
- `src/data/schemas/tutorials.ts`
- `src/ui/devtools/editors/config/tutorials/tutorialEditorDefaults.ts`
- `src/ui/devtools/editors/config/tutorials/TutorialForm.tsx`
- `src/game/systems/resolveTutorialTickState.ts`
- `src/game/systems/resolveTutorialCandidateSelection.ts`
- `src/game/systems/HardTutorialSystem.ts`
- `src/engine/runtime/commandMetadata.ts`
- `src/game/systems/CensusSystem.ts`
- `src/data/schemas/conditions.ts`
- `src/engine/compiler/conditions/compileStructuredConditions.ts`
- `src/engine/logic/JsonLogicAdapter.ops.ts`
- `src/ui/devtools/editors/conditions/StructuredConditionRow.tsx`
- `src/ui/devtools/editors/conditions/StructuredConditionSimpleFields.tsx`
- `src/ui/devtools/editors/conditions/structuredConditionDefaults.ts`

## Runtime behavior examples

### Example A — Fresh runtime

Expected state:
- `tutorial_mode = 1`
- food/heat tutorial floors are active

### Example B — Tutorial completion disables tutorial mode

Expected sequence:
- authored tutorial completes normally
- `HardTutorialSystem` clears tutorial state and marks `tutorial_completed`
- tutorial `onComplete` actions enqueue the world-state mutation that sets `tutorial_mode = 0`
- next apply phase updates the world state
- subsequent food/heat clamps no longer enforce the 50% floor

### Example C — Reset Tutorial

Expected sequence:
- permanent tutorial completion memory is cleared
- tutorial mode is restored to `1` in storage and runtime
- active tutorial state is cleared

### Example D — Player assigns every body to absorption

Expected condition result:
- `destructive_assignment_has_all_bodies` evaluates true for the absorption node
- a tutorial bound to that node may display a warning
- if any body remains free or assigned elsewhere, the condition is false

## Test plan

The test suite must verify behavior, not implementation details, and must follow Given–When–Then structure.

### 1. Unit tests

#### `src/ui/runtime/tutorials/tutorialModeMemory.test.ts` (new)

Must verify:
- missing storage returns default `1`
- invalid storage returns default `1`
- persistence normalizes values to `0 | 1`
- restore enqueues the correct live runtime command
- reset persists and restores `1`

#### `src/engine/compiler/conditions/compileStructuredConditions.test.ts`

Add cases verifying:
- `destructive_assignment_has_all_bodies` compiles to the new custom operation
- aggregated AND compilation still works with the new kind included

#### `src/data/schemas/conditions.test.ts`

Add cases verifying:
- the new structured condition kind parses successfully
- the new kind requires no authored fields beyond row metadata

#### `src/data/schemas/tutorials.test.ts` (new if not already present)

Must verify:
- tutorial definitions accept omitted `onComplete`
- tutorial definitions accept valid `BehaviorAction[]` in `onComplete`

#### `src/game/assignment/destructiveAssignmentCondition.test.ts` (new)

Must verify:
- false when self is missing
- false when self is not destructive
- false when no bodies are assigned
- false when some extant bodies are free
- false when some extant bodies are assigned to another owner
- true only when self holds every extant non-aggregate body
- aggregate-tagged bodies are excluded consistently with extinction counting

#### `src/game/assignment/extantBodyIds.test.ts` (new)

Must verify:
- body entities count as extant
- aggregate-tagged bodies do not count
- helper count matches the ids returned

### 2. Integration tests

#### `src/game/systems/HardTutorialSystem.*.test.ts`

Add coverage for:
- valid completion runs `onComplete`
- invalid auto-completion still enqueues `tutorial_completed` but does not run `onComplete`
- `onComplete` commands carry `sourceLane: tutorial_on_complete`
- `onComplete` uses the frozen tutorial `selfId`
- fallback to `sys_world` occurs only if a valid completion self is unexpectedly absent at execution time

#### `src/app-shell/useAppShellController.newGame.test.tsx`

Extend coverage for:
- tutorial mode is snapshotted before unload
- tutorial mode is restored after `run example/scripts/start.cvs`
- completion memory restore still works unchanged

#### `src/ui/runtime/tutorials/useResetTutorial` test file (new)

Must verify:
- Reset Tutorial clears completion memory
- Reset Tutorial restores tutorial mode to `1`
- Reset Tutorial remains enabled when completion memory is empty but tutorial mode is stored as `0`

#### `src/ui/runtime/terminal/commands/tutorialModeCommand.test.ts` (new)

Must verify:
- valid `true` and `false` inputs update storage and runtime
- missing runtime returns an error
- invalid args return the standard invalid-arguments result

#### `src/ui/runtime/terminal/runtimeRegistry.test.ts`

Add a smoke case verifying the new command is registered and executable.

#### `src/game/systems/CensusSystem.test.ts`

No behavior change assertions should regress after switching to the shared extant-body helper.

### 3. View/editor tests

#### `src/ui/devtools/editors/config/tutorials/TutorialForm.test.tsx` (new if absent)

Must verify:
- `On Complete` field renders
- authored action text is stored at `tutorial.onComplete`

#### `src/ui/devtools/editors/conditions/StructuredConditionsField.test.tsx`

Extend coverage for:
- switching a row to `destructive_assignment_has_all_bodies`
- the fieldless explanatory UI renders correctly
- the stored draft row has the correct kind payload

#### `src/ui/production/main-menu/MainMenuPanel.resetTutorial.storage.test.tsx`

Extend coverage for:
- Reset Tutorial is enabled when tutorial mode storage is `0`, even if completion memory is empty

### 4. Contract checks

The final implementation is complete only when all of the following are true:
- all relevant tests are green
- invalid tutorial completions never trigger gameplay actions
- tutorial mode survives New Game and `game.reset`
- Reset Tutorial restores tutorial mode to `1`
- destructive-assignment warning condition is exact-match, not approximate
- no UI layer directly mutates ECS state
- all runtime changes still flow through commands

## Acceptance criteria

The feature is accepted only when every statement below is true.

1. A fresh runtime starts with tutorial mode enabled.
2. While tutorial mode is enabled, food and heat never remain below 50% of their own max values.
3. `tutorial_mode true|false` updates both persistent storage and the live runtime.
4. Tutorial mode survives New Game bootstrap and `game.reset`.
5. Reset Tutorial clears tutorial completion memory and restores tutorial mode to `1`.
6. Tutorial definitions accept authored `onComplete` behavior actions.
7. Tutorial `onComplete` actions execute only for valid completions.
8. Invalid tutorials are still marked completed for permanent memory but execute no `onComplete` actions.
9. The new condition is available in the structured-condition editor.
10. The new condition is true only when the evaluated destructive assignment node currently holds every extant non-aggregate body.
11. A tutorial bound to the absorption node can use that condition to warn that processing will end the run.

