# Draft completion actions and runtime cinematic LLD

## Review result

The previous LLD had the right high-level intent, but it was not implementation-ready against the actual repository.

The main problems were:
- several file paths and module boundaries did not match `src`
- the Draft ability shape was incomplete relative to the real schema
- the runtime cinematic design did not account for the existing app-shell cinematic flow
- the handler-side execution path did not account for the fact that `CommandHandlerContext` currently has no command buffer
- the textual action syntax requirements for `SHOW_CINEMATIC` were not fully specified

This document corrects those issues and is the final implementation-ready version.

---

## 1. Why

When Explore runs out of draft content, the runtime must transition from normal exploration into a terminal narrative beat.

Today, the relevant systems behave as follows:
- `TriggerDraftHandler` treats an empty filtered draft pool as an error and returns
- runtime notifications already use the existing `RuntimeCommand -> runtimeFactory -> bridge -> UI` pattern
- the cinematic overlay already exists, but it is currently wired only for the main-menu intro flow in `app-shell`

We need a design that:
- lets the Draft ability define actions to run when a draft pool is exhausted
- lets those actions include a cinematic
- reuses the existing behavior action system, runtime command pipeline, app-shell overlay system, and bridge pattern
- does not invent a second narrative pipeline
- does not guess about file structure or runtime ownership

The concrete Explore use case is:
- when the Explore draft pool is exhausted
- kill Explore
- show an out-of-content cinematic

---

## 2. What

### 2.1 Draft completion actions

The Draft ability gains an optional `onComplete` action list.

Actual Draft ability shape after this change:
- `poolId: string`
- `count: number`
- `label?: string`
- `conditions?: ConditionLines[]`
- `onComplete?: BehaviorAction[]`

Draft completion is defined precisely as:
- a `TRIGGER_DRAFT` command is handled
- the target draft pool exists
- the pool contains entries
- after applying condition filtering and one-off exclusion, `filteredEntries.length === 0`

That is the only state that counts as “draft complete” for this feature.

This change does **not** redefine these other states as completion:
- missing pool
- pool with zero raw entries
- `selected.length === 0` because option ids are missing or weights are invalid

Those remain configuration/runtime errors.

### 2.2 SHOW_CINEMATIC behavior action

A new behavior action is added:
- `type: "SHOW_CINEMATIC"`
- `lines: string[]`

Structured schema contract:
- `lines` is required
- `lines.length >= 1`
- every line must be a non-empty string after trim

This action is a standard behavior action. It is not a shell-only special case.

### 2.3 SHOW_CINEMATIC runtime command

A new runtime command is added:
- `RuntimeCommandType.SHOW_CINEMATIC`

Payload contract:
- `lines: string[]`

The command is transport-only.
It does not mutate world state.
It exists so the existing runtime command observation path can forward cinematic events to the UI layer.

### 2.4 Text authoring syntax for action editors

`SHOW_CINEMATIC` must be supported by the action-text compiler used by draft option actions and any other editor path that uses `compileActionSequence`.

Text syntax contract:
- `SHOW_CINEMATIC "This is text 1", "This is text 2"`

Parsing rules:
- each cinematic line must be enclosed in double quotes
- lines are separated by commas
- quoted text is opaque
- the action sequence splitter must not split on `AND` when that token appears inside quoted cinematic text

Formatted action text must round-trip back to that syntax.

### 2.5 Runtime cinematic ownership

There are now two cinematic sources:
- main-menu cinematic
- runtime cinematic

They both use the same `Cinematic` overlay component.

They do **not** share completion behavior.

Completion rules:
- main-menu cinematic completion keeps the existing behavior: run `example/scripts/start.cvs`, then close the overlay
- runtime cinematic completion only closes the overlay
- this change does **not** auto-resume gameplay after runtime cinematic completion

That last rule is intentional. The current main-menu cinematic path also does not auto-resume gameplay directly, and no existing standard resume contract exists in the inspected files.

---

## 3. How

### 3.1 End-to-end flow

#### Draft completion path

1. Draft ability compiles into a `TRIGGER_DRAFT` behavior action.
2. That action now carries `onComplete` in its payload.
3. `BehaviorSystem` emits `RuntimeCommandType.TRIGGER_DRAFT` with `onComplete` preserved.
4. `TriggerDraftHandler` evaluates the pool.
5. If `filteredEntries.length > 0`, existing draft activation behavior is unchanged.
6. If `filteredEntries.length === 0`:
   - if `onComplete` is empty or absent, preserve current error behavior
   - if `onComplete` exists, execute those actions in the trigger-entity context and do not open the draft UI

#### Runtime cinematic path

1. `SHOW_CINEMATIC` action is executed by the existing behavior action executor.
2. The executor enqueues `RuntimeCommandType.SHOW_CINEMATIC`.
3. The no-op runtime handler accepts the command so the command manager does not report an unregistered command.
4. `runtimeFactory.onCommandsApplied` evaluates applied commands and forwards cinematic commands into `CinematicEventBridge`.
5. A new app-shell bridge hook drains `CinematicEventBridge` on animation frames.
6. When a runtime cinematic event is seen, the hook pauses runtime and opens the cinematic overlay with the provided lines.
7. `Cinematic` displays the lines in sequence.
8. On completion, the app-shell closes the overlay and clears runtime cinematic state.

### 3.2 Command-handler execution model for `onComplete`

`TriggerDraftHandler` cannot directly reuse the existing `BehaviorSystem` path because:
- it runs in command-handler space, not system space
- `CommandHandlerContext` currently has no command buffer
- handler code does not currently have a `BehaviorContext`

So this change extends the existing handler infrastructure rather than creating a parallel one.

The handler-side completion execution contract is:
- `CommandHandlerContext` gains `commands: CommandBuffer<RuntimeCommand>`
- `TriggerDraftHandler` builds a temporary `BehaviorContext` from the current world, current cartridge, and current impulse engine
- it reuses the existing `ActionExecutor`
- it enqueues resulting commands into `context.commands`

No new action execution subsystem is introduced.

### 3.3 Snapshot contract for handler-side action execution

When `TriggerDraftHandler` executes `onComplete`, it must build a snapshot from the **current command world**.

Required source data:
- entities: `context.world.entities`
- impulse engine: `context.impulseEngine`
- blueprints: `context.cartridge.blueprints`

It must then reuse these existing helpers:
- `Snapshot`
- `buildAssignmentMap`
- `updateGlobalsBuffer`
- `ActionExecutor`

This gives completion actions the same target-resolution semantics as normal behavior actions.

### 3.4 Error handling contract

These cases remain errors and must continue to log errors and return:
- `sys_world` missing
- pool missing
- pool exists but has zero raw entries
- `selected.length === 0`
- `onComplete` exists but the trigger entity cannot be resolved

Only `filteredEntries.length === 0` with a non-empty `onComplete` payload is treated as handled terminal behavior rather than an error.

---

## 4. File-by-file implementation

### 4.1 Change `src/data/schemas/abilities/draft.ts`

**Responsibility**
- define the Draft ability schema used under `_editor.abilities.draft[]`

**Logic**
- add `onComplete` as an optional behavior-action array
- preserve current `poolId`, `count`, `label`, and `conditions` semantics exactly

**Interface**
- `DraftAbilityConfig` gains `onComplete?: BehaviorAction[]`
- `DraftAbilitySchema` validates `onComplete` using the canonical behavior action schema

**Contract**
- `onComplete` is optional
- empty arrays are allowed
- omission means “no completion actions”

---

### 4.2 Add `src/data/schemas/behaviorCinematic.ts`

**Responsibility**
- define the schema and type for the new `SHOW_CINEMATIC` behavior action

**Logic**
- mirror the existing split-out pattern used by `behaviorNotification.ts`

**Interface**
- export `ShowCinematicActionSchema`
- export `ShowCinematicAction`

**Contract**
- schema shape:
  - `type: "SHOW_CINEMATIC"`
  - `lines: string[]`
- `lines` must contain at least one non-empty string

---

### 4.3 Change `src/data/schemas/behavior.ts`

**Responsibility**
- define the canonical `BehaviorActionSchema`, `BehaviorAction` type, and `TriggerDraftActionSchema`

**Logic**
- import `ShowCinematicActionSchema`
- add `SHOW_CINEMATIC` to the action union
- extend `TriggerDraftActionSchema` with `onComplete?: BehaviorAction[]`
- convert the behavior action schema definition to a recursive form so `TriggerDraftActionSchema.onComplete` can legally reference behavior actions

**Interface**
- `TriggerDraftAction` gains `onComplete?: BehaviorAction[]`
- `BehaviorAction` gains the `SHOW_CINEMATIC` variant

**Contract**
- recursive action payloads are structurally supported
- this change does **not** add recursion-loop protection
- authoring a completion action that retriggers the same exhausted pool is unsupported content and out of scope for this change

---

### 4.4 Change `src/engine/compiler/abilities/draftCompiler.ts`

**Responsibility**
- compile Draft ability entries into behavior rules

**Logic**
- keep current compile trigger and sort order
- include `config.onComplete` in the generated `TRIGGER_DRAFT` action

**Interface**
- the emitted rule action becomes:
  - `type: "TRIGGER_DRAFT"`
  - `poolId`
  - `count`
  - `label`
  - `triggerEntityId: "self"`
  - `onComplete?: BehaviorAction[]`

**Contract**
- behavior rule generation remains otherwise unchanged
- compile-time conditions handling remains unchanged

---

### 4.5 Change `src/engine/runtime/systems/BehaviorSystem.ts`

**Responsibility**
- execute behavior rules and enqueue runtime commands

**Logic**
- preserve the existing TRIGGER_DRAFT special-case path
- when the action type is `TRIGGER_DRAFT`, include `action.onComplete` in the emitted runtime command payload

**Interface**
- emitted `RuntimeCommandType.TRIGGER_DRAFT` payload gains `onComplete?: BehaviorAction[]`

**Contract**
- all non-TRIGGER_DRAFT actions continue through `ActionExecutor`
- TRIGGER_DRAFT remains special-cased here exactly as it is today

---

### 4.6 Change `src/engine/runtime/types/runtimeCommandPayloadsDraft.ts`

**Responsibility**
- define TRIGGER_DRAFT payload types

**Logic**
- extend `TriggerDraftCommandPayload`

**Interface**
- add `onComplete?: BehaviorAction[]`

**Contract**
- `poolId`, `triggerEntityId`, `count`, and `label` remain unchanged

---

### 4.7 Add `src/engine/runtime/types/runtimeCommandCinematic.ts`

**Responsibility**
- define the runtime cinematic command payload and command type alias

**Logic**
- mirror the existing pattern used by `runtimeCommandNotification.ts`

**Interface**
- export `ShowCinematicCommandPayload`
- export `ShowCinematicCommand`

**Contract**
- payload shape is exactly `lines: string[]`

---

### 4.8 Change `src/engine/runtime/types/runtimeCommandTypes.ts`

**Responsibility**
- define runtime command enum values

**Logic**
- add `SHOW_CINEMATIC`

**Interface**
- `RuntimeCommandType.SHOW_CINEMATIC`

---

### 4.9 Change `src/engine/runtime/types/runtimeCommandPayloads.ts`

**Responsibility**
- export all runtime command payload types

**Logic**
- export `ShowCinematicCommandPayload`

**Interface**
- the runtime type barrel includes the new payload

---

### 4.10 Change `src/engine/runtime/types/runtimeCommandUnion.ts`

**Responsibility**
- define the runtime command discriminated union

**Logic**
- add `ShowCinematicCommand`

**Interface**
- `RuntimeCommand` includes the cinematic command variant

---

### 4.11 Change `src/engine/runtime/types/runtimeCommandInterfaces.ts`

**Responsibility**
- re-export command interfaces

**Logic**
- export `ShowCinematicCommand`

**Interface**
- consumers importing from `runtimeCommandInterfaces.ts` can use the new command type

---

### 4.12 Change `src/engine/runtime/types.ts`

**Responsibility**
- provide the top-level runtime types barrel used throughout the app

**Logic**
- export the cinematic payload and command types

**Interface**
- top-level runtime imports can reference the new command without deep file paths

---

### 4.13 Add `src/engine/runtime/handlers/ShowCinematicHandler.ts`

**Responsibility**
- register a no-op handler for the cinematic runtime command

**Logic**
- follow the exact pattern used by `ShowCustomNotificationHandler`
- the handler intentionally does nothing

**Interface**
- `type = RuntimeCommandType.SHOW_CINEMATIC`

**Contract**
- no world mutation
- no shell/UI logic here
- presence of the handler prevents command-manager “No handler registered” errors

---

### 4.14 Change `src/engine/runtime/createGameRuntime.ts`

**Responsibility**
- register base runtime command handlers

**Logic**
- register `ShowCinematicHandler` alongside `ShowCustomNotificationHandler`

**Interface**
- no external API change

---

### 4.15 Change `src/engine/runtime/handlers/types.ts`

**Responsibility**
- define the command-handler execution context contract

**Logic**
- add the runtime command buffer to handler context

**Interface**
- `CommandHandlerContext` gains:
  - `commands: CommandBuffer<RuntimeCommand>`

**Contract**
- handlers may enqueue additional commands for later processing
- this is required for `TriggerDraftHandler` completion actions

---

### 4.16 Change `src/engine/runtime/RuntimeCore.ts`

**Responsibility**
- construct the `CommandHandlerContext`

**Logic**
- populate `context.commands` with the existing command buffer / command manager instance

**Interface**
- handler context construction changes only internally

**Contract**
- no new buffer is introduced
- handler-enqueued commands use the same command buffer already used by systems and runtime logic

---

### 4.17 Add `src/engine/runtime/systems/behavior/actionExecutorShowCinematic.ts`

**Responsibility**
- translate `SHOW_CINEMATIC` behavior actions into runtime commands

**Logic**
- enqueue `RuntimeCommandType.SHOW_CINEMATIC` with `lines`

**Interface**
- export `executeShowCinematicAction`

**Contract**
- no world mutation
- no entity lookup
- no UI logic

---

### 4.18 Change `src/engine/runtime/systems/behavior/ActionExecutor.ts`

**Responsibility**
- central dispatch for non-TRIGGER_DRAFT behavior actions

**Logic**
- add a `SHOW_CINEMATIC` case that calls `executeShowCinematicAction`

**Interface**
- `ActionExecutor.execute()` now supports the new behavior action

---

### 4.19 Change `src/game/handlers/TriggerDraftHandler.ts`

**Responsibility**
- resolve `TRIGGER_DRAFT` runtime commands into active draft state

**Logic**
- preserve all existing success behavior
- preserve existing error behavior for missing pool, zero-entry pool, and zero selected options
- replace the `filteredEntries.length === 0` branch with the following contract:

Pseudocode:
- if `filteredEntries.length === 0` and `onComplete` is empty or absent:
  - log the existing pool-empty error
  - return
- if `filteredEntries.length === 0` and `onComplete` is non-empty:
  - resolve the trigger entity from the current world using `command.payload.triggerEntityId`
  - if trigger entity is missing: log an error and return
  - build a snapshot from current world + impulse engine + cartridge blueprints
  - build globals with `updateGlobalsBuffer(..., snapshot, 0)`
  - build assignment map with `buildAssignmentMap(snapshot)`
  - build `BehaviorContext`
  - execute each completion action through the existing `ActionExecutor`
  - enqueue resulting commands into `context.commands`
  - return without setting draft active

**Interface**
- command payload consumption now includes `onComplete`

**Contract**
- draft UI must not open on handled completion
- `currentText`, `options`, and other draft UI fields must not be written when completion is handled
- completion actions execute in trigger-entity context, not `sys_world` fallback context
- `selected.length === 0` is **not** completion and must not execute `onComplete`

---

### 4.20 Add `src/ui/runtime/cinematic/CinematicEventBridge.ts`

**Responsibility**
- queue runtime cinematic events between command evaluation and app-shell presentation

**Logic**
- follow the existing `CardEventBridge` pattern

**Interface**
- `push(event)`
- `drain(): CinematicEvent[]`
- `size(): number`

**Event contract**
- `lines: string[]`
- generated `id` is optional; not required for current shell use

**Contract**
- deterministic append + atomic drain
- no React dependency
- no runtime dependency

---

### 4.21 Add `src/ui/runtime/cinematic/evaluateCinematicCommands.ts`

**Responsibility**
- scan applied runtime commands and forward cinematic commands into `CinematicEventBridge`

**Logic**
- for each applied command:
  - if `command.type !== RuntimeCommandType.SHOW_CINEMATIC`, ignore it
  - otherwise push `{ lines }` into the bridge

**Interface**
- export `evaluateCinematicCommands(commands: RuntimeCommand[]): void`

**Contract**
- no shell-store writes here
- no overlay logic here

---

### 4.22 Change `src/ui/runtime/state/runtimeFactory.ts`

**Responsibility**
- translate applied runtime commands into UI-side events after each apply phase

**Logic**
- preserve existing notification evaluation
- add cinematic evaluation in the same `onCommandsApplied` callback

**Interface**
- no public API change

**Contract**
- command observation remains snapshot-driven
- cinematic evaluation must not interfere with notification evaluation

---

### 4.23 Add `src/app-shell/useRuntimeCinematicBridge.ts`

**Responsibility**
- bridge drained runtime cinematic events into app-shell overlay state

**Logic**
- use a requestAnimationFrame loop, matching the existing bridge-drain pattern used by living cards
- on each frame:
  - drain `CinematicEventBridge`
  - if the batch is empty, do nothing
  - if the batch is non-empty, take the last event in the batch
  - call `useRuntimeStore.getState().pause()`
  - call `useAppShellStore.getState().showRuntimeCinematic(lines)`

**Interface**
- export `useRuntimeCinematicBridge(): void`

**Contract**
- last event wins within a single drained batch
- the hook is UI-only
- it must not enqueue runtime commands

---

### 4.24 Change `src/app-shell/useAppShellStore.ts`

**Responsibility**
- own shell surface state and overlay state

**Logic**
- add cinematic payload state and source tracking
- replace the current no-argument cinematic action with explicit cinematic-source actions

**Interface**
- add state:
  - `cinematicLines: string[] | null`
  - `cinematicSource: "main-menu" | "runtime" | null`
- replace / extend actions with:
  - `showMainMenuCinematic(lines: string[]): void`
  - `showRuntimeCinematic(lines: string[]): void`
- update existing close/return actions so leaving cinematic overlay clears cinematic lines and source

**Contract**
- cinematic overlay visibility still derives from `overlay === "cinematic"`
- cinematic payload lives in app-shell store, not inside the `Cinematic` component

---

### 4.25 Change `src/app-shell/useAppShellController.ts`

**Responsibility**
- coordinate app-shell flows for main menu, saves, overlays, and game startup

**Logic**
- call `useRuntimeCinematicBridge()` so runtime cinematic events are consumed continuously
- in `handleNewGame`, replace `showCinematic()` with `showMainMenuCinematic(MAIN_MENU_CINEMATIC_LINES)`
- update `handleCinematicComplete` to branch on `shell.cinematicSource`

Completion contract:
- if source is `main-menu`:
  - run `run example/scripts/start.cvs`
  - on success, close overlay
- if source is `runtime`:
  - close overlay only
- if source is `null`, close overlay only

Also update the empty-cinematic shortcut effect:
- only auto-complete when `shell.overlay === "cinematic"`
- and `shell.cinematicSource === "main-menu"`
- and `shell.cinematicLines` is empty

**Interface**
- public controller return shape remains the same unless additional cinematic payload is exposed for rendering convenience

---

### 4.26 Change `src/app-shell/AppSecondaryOverlays.tsx`

**Responsibility**
- render secondary overlays, including the cinematic overlay

**Logic**
- stop hardcoding `MAIN_MENU_CINEMATIC_LINES`
- accept cinematic lines as a prop
- pass those lines into `Cinematic`

**Interface**
- add prop:
  - `cinematicLines: string[]`

**Contract**
- overlay composition stays unchanged
- only the cinematic text source changes

---

### 4.27 Change `src/App.tsx`

**Responsibility**
- wire controller state into app-shell overlay components

**Logic**
- pass `controller.shell.cinematicLines ?? []` into `AppSecondaryOverlays`

**Interface**
- update `AppSecondaryOverlays` call site

---

### 4.28 Change `src/ui/runtime/cinematic/Cinematic.tsx`

**Responsibility**
- present a cinematic sequence given a line array and an `onComplete` callback

**Logic**
- no behavioral redesign is required
- keep its current click-to-advance behavior
- keep its current `cinematics?: string[]` prop if desired, or rename to `lines` for clarity if done consistently

**Interface**
- whichever prop name is retained, the component must receive runtime-provided lines rather than a hardcoded menu constant

**Contract**
- rendering semantics remain unchanged
- this file must remain presentation-only

---

### 4.29 Change `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`

**Responsibility**
- provide default draft entries for the blueprint-mode editor

**Logic**
- add `onComplete: []` to `createDraftAbilityDraft()`

**Interface**
- new draft ability defaults include an empty completion action list

---

### 4.30 Add `src/ui/devtools/editors/blueprint/mode/forms/BehaviorActionArrayField.tsx`

**Responsibility**
- edit an arbitrary `BehaviorAction[]` stored at a module-session path

**Logic**
- reuse existing UI pieces rather than creating a second action editor:
  - `ActionInput`
  - `formatBehaviorAction`
  - `compileActionSequence`
  - `getByPath`
  - `setByPath`
  - `useSessionStore.updateBlueprint` or the existing session update mechanism used by other blueprint forms

**Interface**
- props:
  - `filename: string`
  - `path: string`
  - `label: string`
  - `tooltip?: string`

**Contract**
- add actions from text input
- remove individual actions
- preserve array order
- show parse errors inline

---

### 4.31 Change `src/ui/devtools/editors/blueprint/mode/forms/DraftAbilityForm.tsx`

**Responsibility**
- edit one Draft ability entry in blueprint mode

**Logic**
- add a new action-array section for `onComplete`
- reuse the new generic behavior-action array field

**Interface**
- write to `${basePath}.onComplete`

**Contract**
- existing Pool / Count / Label / Conditions fields remain unchanged
- tooltip must define completion precisely as “no eligible entries remain after filtering and one-off exclusion”

---

### 4.32 Add `src/ui/devtools/editors/behaviors/compiler/actionCompiler.cinematic.ts`

**Responsibility**
- parse the raw `SHOW_CINEMATIC` action segment from editor text

**Logic**
- parse the raw segment after the verb into a comma-separated list of double-quoted strings
- reject malformed quoting and empty line arrays

**Interface**
- export `parseShowCinematicAction(segment: string): ShowCinematicAction`

**Contract**
- the parser consumes raw text, not whitespace tokens
- this keeps cinematic parsing local and avoids changing the shared logic tokenizer

---

### 4.33 Change `src/ui/devtools/editors/behaviors/compiler/actionCompiler.ts`

**Responsibility**
- compile action text into `BehaviorAction[]`

**Logic**
- replace the current naive whitespace-only sequence splitting with a quote-aware sequence splitter that does not split on `AND` inside quoted cinematic text
- preserve current behavior for existing verbs
- route `SHOW_CINEMATIC` segments to the dedicated cinematic parser

**Interface**
- `compileActionSequence(input)` continues to return `BehaviorAction[]`

**Contract**
- existing action syntax remains backward-compatible
- `SHOW_CINEMATIC` can appear in the same input system used by existing action editors

---

### 4.34 Change `src/ui/devtools/editors/behaviors/compiler/actionCompiler.parse.ts`

**Responsibility**
- parse token-based actions for non-cinematic verbs

**Logic**
- add `SHOW_CINEMATIC` dispatch if this file remains the common verb router
- or explicitly document that raw cinematic parsing is delegated to `actionCompiler.cinematic.ts`

**Interface**
- parser output union includes `ShowCinematicAction`

---

### 4.35 Change `src/ui/devtools/editors/draft/options/useActionAutocomplete.ts`

**Responsibility**
- provide action-verb autocomplete for action inputs

**Logic**
- add `SHOW_CINEMATIC` to the keyword list

**Interface**
- autocomplete suggestions include the new verb

---

### 4.36 Change `src/ui/devtools/editors/draft/options/ActionInput.tsx`

**Responsibility**
- render the text input used for authoring action lists

**Logic**
- update helper text and placeholder to include `SHOW_CINEMATIC`

**Interface**
- no prop change required

**Contract**
- helper text must show the supported syntax explicitly:
  - `SHOW_CINEMATIC "Line 1", "Line 2"`

---

### 4.37 Change `src/ui/devtools/editors/draft/options/actionText.ts`

**Responsibility**
- format `BehaviorAction` values back into readable text for list display

**Logic**
- add `SHOW_CINEMATIC` formatting

**Interface**
- `formatBehaviorAction(action)` supports the new action type

**Contract**
- formatted value must use the same quoted comma-separated syntax accepted by the parser

---

## 5. Tests

All new behavior must be covered by targeted tests. The design is not complete without these.

### 5.1 Change `src/engine/compiler/abilities/draftCompiler.test.ts`

Add cases:
- compiled `TRIGGER_DRAFT` action includes `onComplete` when provided
- compiled `TRIGGER_DRAFT` action omits `onComplete` when absent
- existing compile behavior for pool/count/label/conditions remains unchanged

### 5.2 Change `src/engine/compiler/abilities/draftCompiler.integration.test.ts`

Add cases:
- runtime command payload emitted from compiled Draft ability includes `onComplete`
- payload round-trips through behavior execution unchanged

### 5.3 Add `src/engine/runtime/systems/behavior/actionExecutorShowCinematic.test.ts`

Cover:
- `SHOW_CINEMATIC` enqueues `RuntimeCommandType.SHOW_CINEMATIC`
- payload lines are preserved exactly
- no world mutation occurs

### 5.4 Change `src/engine/runtime/systems/behavior/ActionExecutor.test.ts`

Add a case verifying:
- `ActionExecutor.execute()` dispatches `SHOW_CINEMATIC` to the cinematic executor

### 5.5 Change `src/game/handlers/TriggerDraftHandler.test.ts`

Add cases:
- when `filteredEntries.length === 0` and `onComplete` is absent, the existing pool-empty error is logged and no commands are enqueued
- when `filteredEntries.length === 0` and `onComplete` contains `KILL self`, a `KILL` command is enqueued and no draft is activated
- when `filteredEntries.length === 0` and `onComplete` contains `SHOW_CINEMATIC`, a `SHOW_CINEMATIC` command is enqueued and no draft is activated
- when `filteredEntries.length === 0` and `onComplete` contains both actions, command order matches author order
- when trigger entity cannot be resolved, an error is logged and no completion commands are enqueued
- when `selected.length === 0`, completion actions are **not** executed

### 5.6 Change `src/engine/runtime/handlers/handlerTestUtils.ts`

Update helper construction so tests can supply and inspect `context.commands`.

### 5.7 Add `src/ui/runtime/cinematic/CinematicEventBridge.test.ts`

Cover:
- push appends an event
- drain returns and clears events
- size reports queue length correctly

### 5.8 Add `src/ui/runtime/cinematic/evaluateCinematicCommands.test.ts`

Cover:
- `SHOW_CINEMATIC` commands push bridge events
- non-cinematic commands are ignored
- multiple cinematic commands preserve line payloads

### 5.9 Add `src/app-shell/useRuntimeCinematicBridge.test.tsx`

Cover:
- bridge drain pauses runtime and opens runtime cinematic
- the last event in a drained batch wins
- empty drains do nothing

### 5.10 Change `src/app-shell/useAppShellController.test.tsx`

Add cases:
- confirming new game opens a main-menu cinematic with `MAIN_MENU_CINEMATIC_LINES`
- main-menu cinematic completion still runs `run example/scripts/start.cvs`
- runtime cinematic completion closes the overlay and does **not** run `start.cvs`

### 5.11 Add `src/ui/devtools/editors/blueprint/mode/forms/DraftAbilityForm.test.tsx`

Cover:
- the form renders an `onComplete` action list editor
- entered actions are stored at the correct session path
- parse errors are shown inline

### 5.12 Add `src/ui/devtools/editors/behaviors/compiler/actionCompiler.cinematic.test.ts`

Cover:
- parses `SHOW_CINEMATIC "A", "B"`
- preserves punctuation and spaces inside quoted lines
- rejects empty line arrays
- rejects unquoted lines
- rejects malformed quotes
- supports `AND` outside quoted strings while not splitting inside quoted strings

### 5.13 Change `src/ui/devtools/editors/draft/options/actionText` tests or add a new test file

Cover:
- `SHOW_CINEMATIC` formats back to the accepted text syntax

### 5.14 Change `src/ui/devtools/editors/draft/options/useActionAutocomplete` tests if present, or add one

Cover:
- `SHOW_CINEMATIC` appears in autocomplete suggestions

---

## 6. Explicit contracts and non-goals

### 6.1 Explicit contracts

- Draft completion means `filteredEntries.length === 0` only.
- `selected.length === 0` remains an error, not completion.
- `SHOW_CINEMATIC` action schema uses `lines`, not a generic `value` field.
- Text syntax is `SHOW_CINEMATIC "Line 1", "Line 2"`.
- Runtime cinematic completion closes the overlay and does not auto-resume gameplay.
- Main-menu cinematic behavior remains unchanged except for sourcing lines from store state instead of a hardcoded prop path.

### 6.2 Non-goals

This change does not add:
- cinematic queueing beyond “last drained event wins”
- automatic resume-after-cinematic behavior
- recursion guards for completion actions that re-trigger the same exhausted draft pool
- shell commands for showing cinematics directly

---

## 7. Final implementation checklist

The implementation is complete only when all of the following are true:
- Draft ability schema supports `onComplete`
- behavior schema supports `SHOW_CINEMATIC` and recursive `TRIGGER_DRAFT.onComplete`
- draft compiler emits `onComplete`
- behavior system forwards `onComplete`
- TriggerDraftHandler executes completion actions through `ActionExecutor` using the existing command buffer
- runtime command types include `SHOW_CINEMATIC`
- a no-op handler for `SHOW_CINEMATIC` is registered
- runtimeFactory forwards cinematic commands into a bridge
- app-shell drains that bridge and opens a runtime cinematic overlay
- app-shell differentiates main-menu cinematic completion from runtime cinematic completion
- Draft ability editor can edit `onComplete`
- action text compiler, formatter, helper text, and autocomplete all support `SHOW_CINEMATIC`
- all tests listed in Section 5 pass

