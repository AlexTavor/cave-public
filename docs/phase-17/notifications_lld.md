# Runtime Notifications LLD

## 1. Objective

Implement a runtime notification system that renders stackable, updatable, accumulating toast cards above `CaveStatusNote` in the runtime HUD.

The implementation must satisfy these product rules:

- Event notifications are transient.
- Event notifications aggregate by semantic event key.
- When an open event toast receives another event in the same aggregation group, the existing toast updates in place and its lifetime resets.
- Event notifications dismiss on click and otherwise time out, then animate out.
- Ongoing notifications render only while their condition is true.
- Ongoing notifications do not time out.
- The throttle tutorial notification opens a modal containing a gif loaded from `/public` and a `RichText` body.
- Colors for all files touched by this feature must come from an authoritative game palette. No raw color literals are allowed in touched files.

This design is constrained by the project laws:

- All mutations must continue to flow through the command pipeline.
- UI must remain observational.
- Runtime state remains in ECS; React stores may hold only app-level ephemeral presentation state.
- Logic must stay out of TSX and be tested at the proper layer.

## 2. Scope

This task includes:

- command-envelope metadata for provenance and cause
- runtime event-notification aggregation and rendering
- ongoing notification derivation and rendering
- throttle tutorial modal wiring
- authoritative game palette introduction and UI-theme population from it
- tests required by the feature

This task does **not** include:

- a repo-wide theme migration unrelated to this feature
- replacing all existing `surfaceHighlight` usages in untouched files
- changing runtime command payload shapes for provenance
- changing existing gameplay semantics except where explicitly listed below

## 3. Fixed decisions

These decisions are locked and must not be revisited during implementation.

### 3.1 Notification placement

Runtime notifications belong to the runtime HUD, not the global devtools toast layer.

They render above `CaveStatusNote` inside `RuntimeShellCanvas`.

### 3.2 Event source model

Provenance is stored on the runtime command envelope, not on payloads.

Every command may carry optional metadata.

Standardized metadata keys used by this feature:

- `sourceEntityId`: the entity whose behavior emitted the command
- `sourceLane`: one of `behavior_rule`, `draft_option`, `draft_on_complete`
- `cause`: one of `starvation`, `purge`

Metadata remains open-ended for future use.

### 3.3 Source stamping rule

All commands emitted through behavior execution must be stamped automatically with:

- `sourceEntityId`
- `sourceLane`

This stamping happens centrally in `ActionExecutor`, not in individual action helpers.

### 3.4 Cause stamping rule

Cause metadata is attached only by the systems that authoritatively know the cause:

- `BodySystem` stamps `cause = starvation`
- `evaluatePurge` stamps `cause = purge`

### 3.5 Event source resolution

Event notifications resolve from these authoritative sources:

- `body_added`: `SPAWN` commands whose spawned entity is a body
- `body_starved`: `KILL` commands with `metadata.cause = starvation`
- `body_killed_by_purge`: world counter delta `cave_evt_purge_kill`
- `body_level_up`: `UPDATE_BODIES_BATCH` commands containing level changes
- `entity_discovered`: `SPAWN` commands from `sourceLane = draft_option` whose spawned entity is not a body, proxy, or transfer
- `body_butchered`: world counter delta `cave_evt_butchered`
- `body_absorbed`: `max(0, delta(cave_evt_absorption_complete) - delta(cave_evt_butchered))`

### 3.6 Ongoing source resolution

Ongoing notifications resolve from current runtime state only:

- hungry count: body traits
- cold count: body traits
- purge active: `sys_world.cave.purge.isActive`
- throttle tutorial visible: `sys_world.state.cave_tut_throttle_seen !== true`

### 3.7 Event toast lifetime

Use the existing devtools toast lifetime pattern.

Define `RUNTIME_EVENT_NOTIFICATION_TTL_MS = 2200` in the runtime notifications feature.

### 3.8 Tutorial gif asset path

The runtime tutorial gif path is fixed as:

- `/tutorials/throttle-tutorial.gif`

If the asset does not exist yet, create the directory and place the gif there.

### 3.9 Tutorial body copy

The modal body must be supplied as a single `RichText` body string constant.

The implementation must **not** invent final product copy beyond what is explicitly provided in this document. Use this exact body text:

`Select a node, then change its throttle to control how much power it requests.`

This is the only copy to add for this feature.

### 3.10 Color authority

Create a game-level palette file that becomes the authoritative source of color values.

The UI theme must populate `theme.colors` from that game palette.

For this task:

- touched files must not use raw color literals
- touched files must not introduce new references to `surfaceHighlight`
- `surfaceHighlight` may remain in the UI theme as a compatibility alias for untouched callers only

## 4. Existing seams that must be reused

Use these existing seams exactly as they are intended:

- `ui/runtime/shell/RuntimeShellCanvas.tsx` is the runtime HUD composition point.
- `ui/runtime/status/CaveStatusNote.tsx` and `RuntimeClock.tsx` establish the bottom-corner status chrome pattern.
- `ui/runtime/state/runtimeFactory.ts` already observes applied commands through `telemetryAdapter.onCommandsApplied(...)`.
- `game/systems/cave/caveEventCounters.ts` and `data/schemas/v2/caveWorldDefaults.ts` already define cave-wide event counters.
- `game/handlers/AbsorbBatchHandler.ts` already increments `cave_evt_absorption_complete` and `cave_evt_butchered`.
- `ui/lib/atoms/modal/Modal.tsx` is the modal primitive.
- `ui/lib/atoms/animatable/Animatable.tsx` and `AnimatePresence` are the animation primitives.
- `ui/lib/atoms/card/Card.tsx` is the card primitive.
- `ui/runtime/world/living-cards/NotificationEvaluator.ts` is the existing applied-command observer pattern to mirror for runtime-side UI reactions.

Do not introduce parallel infrastructure when these seams already exist.

## 5. Runtime behavior contract

## 5.1 Event notifications

Event toasts are transient cards.

They must:

- stack above the ongoing notifications and cave status
- aggregate by `aggregationKey`
- reset lifetime when updated
- dismiss on click
- animate in with `slideUp`
- animate out with `slideUp` exit

Aggregation keys are fixed as:

- `body_added`
- `body_starved`
- `body_purge_kill`
- `body_butchered`
- `body_absorbed`
- `body_level_up:<level>`
- `entity_discovered:<normalized_label>`

Copy is fixed as:

- `X new body` / `X new bodies`
- `X body starved` / `X bodies starved`
- `X body killed by Purge` / `X bodies killed by Purge`
- `X body butchered` / `X bodies butchered`
- `X body absorbed` / `X bodies absorbed`
- `X body reached level Y` / `X bodies reached level Y`
- `Label discovered`

When the same discovered label aggregates multiple times while visible, suffix with ` (xN)`.

## 5.2 Ongoing notifications

Ongoing notifications are state-derived cards.

They must:

- render only while true
- never auto-dismiss
- preserve a stable visual order
- use the same bottom-left HUD cluster as the event toasts

Stable order from closest to `CaveStatusNote` upward:

1. Purge active
2. Hungry bodies
3. Cold bodies
4. Tutorial throttle

Copy is fixed as:

- `X bodies are hungry`
- `X bodies are cold`
- `The Purge is on`
- `Tut: Throttling`

Word-color rules:

- only the word `hungry` is colorized in the hungry toast
- only the word `cold` is colorized in the cold toast
- purge styling is alarm styling, not just red text

Interaction rules:

- purge, hungry, and cold are non-clickable
- tutorial is clickable and opens the modal

## 5.3 HUD layout

Bottom-left HUD is one shared anchored stack.

Visual order from bottom to top:

1. `CaveStatusNote`
2. ongoing notification block
3. event notification block

The container must use `pointer-events: none`.

Cards that accept clicks must opt back into `pointer-events: auto`.

## 6. Data model and interfaces

## 6.1 Command metadata

### Add: `src/engine/runtime/commandMetadata.ts`

Responsibility:

- define and manipulate runtime command metadata

Logic:

- define the metadata type used on every runtime command
- provide one helper that appends metadata to any command
- append must shallow-merge metadata
- append must never mutate the input command
- provide typed readers for `sourceEntityId`, `sourceLane`, and `cause`

Interface:

- metadata type exported from this file and re-exported from `src/engine/runtime/types.ts`
- append helper takes a command plus a metadata patch and returns a new command
- read helpers take a command and return the typed metadata value or `undefined`

### Change: `src/engine/runtime/types/runtimeCommandBase.ts`

Responsibility:

- add optional metadata to the shared command envelope

Logic:

- extend the generic `Command<TType, TPayload>` type to include optional metadata
- no command payload type changes in this file

Interface:

- every runtime command can now carry optional metadata

### Change: `src/engine/runtime/types.ts`

Responsibility:

- re-export the command metadata type and helpers

Logic:

- add exports only

Interface:

- no breaking changes to existing exports

## 6.2 Behavior execution provenance

### Change: `src/engine/runtime/systems/behavior/ValueResolver.ts`

Responsibility:

- extend `BehaviorContext` to carry execution provenance

Logic:

- add `sourceLane` to `BehaviorContext`

Interface:

- `BehaviorContext` gains required field `sourceLane`
- allowed values are exactly `behavior_rule`, `draft_option`, `draft_on_complete`

### Change: `src/engine/runtime/systems/BehaviorSystem.ts`

Responsibility:

- set behavior-rule provenance for normal behavior execution

Logic:

- when constructing `BehaviorContext`, set `sourceLane = behavior_rule`

Interface:

- no public API changes

### Change: `src/game/systems/DraftSystem.ts`

Responsibility:

- set draft-option provenance for selected draft option execution

Logic:

- when constructing `BehaviorContext`, set `sourceLane = draft_option`

Interface:

- no public API changes

### Change: `src/game/handlers/triggerDraftCompletion.ts`

Responsibility:

- set draft-completion provenance for `onComplete` behavior execution

Logic:

- when constructing `BehaviorContext`, set `sourceLane = draft_on_complete`

Interface:

- no public API changes

### Change: `src/engine/runtime/systems/behavior/ActionExecutor.ts`

Responsibility:

- stamp provenance metadata onto all commands emitted by behavior execution

Logic:

- wrap the provided command buffer in a local adapter
- the adapter appends:
  - `sourceEntityId = context.self.id`
  - `sourceLane = context.sourceLane`
- all existing action handlers continue to emit commands through the wrapped buffer
- `TRIGGER_DRAFT` commands emitted directly inside `BehaviorSystem` remain unchanged; they are not behavior-side output commands for the notification system

Interface:

- no public API changes
- all commands emitted through `ActionExecutor.execute(...)` now carry behavior provenance metadata

## 6.3 Cause metadata

### Change: `src/game/systems/body/processEntity.ts`

Responsibility:

- determine whether a body death is starvation at the point where death is decided

Logic:

- extend `ProcessEntityResult` to include optional `deathCause`
- when `body.health <= 0`, inspect the entity’s resolved traits
- if the entity is starving, return `deathCause = starvation`
- otherwise return no death cause
- this file remains read-only and must not enqueue commands

Interface:

- `ProcessEntityResult` gains optional `deathCause`

### Change: `src/game/systems/BodySystem.ts`

Responsibility:

- attach starvation cause metadata to body death commands

Logic:

- when a processed body result indicates kill:
  - enqueue `KILL` as today
  - append `metadata.cause = starvation` only when `deathCause` indicates starvation
- no new world counter is added for starvation
- existing update batching behavior remains unchanged

Interface:

- no public API changes

### Change: `src/game/systems/cave/purgeEvaluate.ts`

Responsibility:

- attach purge cause metadata to purge kills

Logic:

- when purge enqueues `KILL`, append `metadata.cause = purge`
- keep the existing `cave_evt_purge_kill` counter adjustment unchanged

Interface:

- no public API changes

## 6.4 Shared body-status counting

### Add: `src/game/systems/cave/bodyStatusCounts.ts`

Responsibility:

- provide one authoritative utility for counting hungry and cold bodies

Logic:

- input is a readonly entity list
- a body counts as hungry when its resolved trait ids include `starving`
- a body counts as cold when its resolved trait ids include `cold`
- ignore non-body entities
- reuse the same trait-reading utility already used by cave systems

Interface:

- one pure function returning `{ starvingBodies, coldBodies }`

### Change: `src/game/systems/cave/collectCaveStimuli.ts`

Responsibility:

- stop owning duplicate hungry/cold counting logic

Logic:

- replace local hungry/cold counting with the shared utility
- all other cave stimulus behavior remains unchanged

Interface:

- no public API changes

## 6.5 Tutorial-seen world state

### Change: `src/data/schemas/v2/caveWorldDefaults.ts`

Responsibility:

- add the persistent tutorial-seen world state entry

Logic:

- add `cave_tut_throttle_seen` with default `false` and `visible: false`
- do not add a starvation counter

Interface:

- `createDefaultWorldState()` returns the new field

### Change: `src/ui/runtime/world/selection/usePowerSinkThrottle.ts`

Responsibility:

- mark the tutorial as seen the first time the player actually changes throttle

Logic:

- before enqueuing `UPDATE_POWER_SINK`, compare the current resolved throttle with the requested clamped value
- if the value is unchanged, do not emit tutorial state
- if the value changes and `sys_world.state.cave_tut_throttle_seen !== true`, enqueue one `UPDATE_STATE` command setting that key to `true`
- then enqueue the existing `UPDATE_POWER_SINK` command

Interface:

- hook return shape remains unchanged

## 6.6 Authoritative game palette

### Add: `src/game/palette/gamePalette.ts`

Responsibility:

- become the authoritative semantic palette for the game

Logic:

- move color ownership here
- seed all values from the existing theme token values already present in the repo
- define semantic keys for:
  - background and surfaces
  - text and secondary text
  - mechanics
  - severity groups
  - status keywords
  - purge alarm
  - modal overlay
  - scrollbar thumb and hover thumb

Interface:

- export immutable `GAME_PALETTE`
- export `GamePalette` type

### Change: `src/ui/lib/foundation/theme/tokens.ts`

Responsibility:

- stop owning color values

Logic:

- keep typography, z-index, spacing, radius, font sizes, icon sizes, border widths, sizes
- remove local color palette ownership from this file

Interface:

- non-color exports remain stable

### Change: `src/ui/lib/foundation/theme/defaultTheme.ts`

Responsibility:

- populate the UI theme from the game palette

Logic:

- import `GAME_PALETTE`
- fill all `theme.colors.*` from it
- preserve existing theme shape
- `surfaceHighlight` remains only as a compatibility alias for untouched callers; notifications must not use it

Interface:

- `defaultTheme` shape remains stable

### Change: `src/ui/lib/foundation/theme/types.ts`

Responsibility:

- expose any additional color keys required by touched files

Logic:

- add only the keys needed by this feature
- required new keys are:
  - `scrollbarThumb`
  - `scrollbarThumbHover`
  - any purge-alarm-specific keys introduced by the new notification styles

Interface:

- `ThemeColors` expands without removing existing keys

### Change: `src/ui/lib/foundation/theme/ThemeProvider.tsx`

Responsibility:

- remove raw scrollbar colors

Logic:

- replace the hardcoded scrollbar greys with theme keys
- no raw color literal remains in this file

Interface:

- unchanged

### Change: `src/ui/lib/atoms/modal/Modal.styles.ts`

Responsibility:

- use theme-backed overlay color

Logic:

- replace the raw backdrop color with `theme.colors.modal`

Interface:

- unchanged

## 6.7 Runtime notification domain

### Add: `src/ui/runtime/notifications/constants.ts`

Responsibility:

- own runtime-notification constants

Logic:

- define `RUNTIME_EVENT_NOTIFICATION_TTL_MS = 2200`
- define `THROTTLE_TUTORIAL_GIF_SRC = "/tutorials/throttle-tutorial.gif"`
- define the exact tutorial body string from section 3.9

Interface:

- exported constants only

### Add: `src/ui/runtime/notifications/runtimeNotificationTypes.ts`

Responsibility:

- define the runtime-notification domain model

Logic:

- define the event kind union
- define the ongoing kind union
- define the event item shape stored in the UI store
- define the ongoing descriptor shape produced by the resolver
- define the display-model shape returned by formatters

Event item fields are fixed:

- `id`
- `kind`
- `aggregationKey`
- `count`
- `level` when applicable
- `entityLabel` when applicable
- `updatedAtMs`
- `expiresAtMs`

Ongoing descriptor fields are fixed:

- `key`
- `kind`
- `count` when applicable
- `priority`
- `clickAction`

Interface:

- exported types only

### Add: `src/ui/runtime/notifications/runtimeNotificationStore.ts`

Responsibility:

- hold ephemeral UI notification state only

Logic:

- Zustand store
- state contains:
  - event items
  - tutorial modal open flag
- actions are fixed as:
  - apply event batch
  - dismiss event by aggregation key
  - sweep expired events by current time
  - open tutorial modal
  - close tutorial modal
  - reset store
- aggregation rules are fixed:
  - group by `aggregationKey`
  - increment count
  - replace level and label from latest input
  - reset `expiresAtMs = now + TTL`
- sort store items by latest update descending

Interface:

- hook export with granular selectors

### Add: `src/ui/runtime/notifications/formatRuntimeNotificationText.ts`

Responsibility:

- centralize all display text shaping

Logic:

- own pluralization
- own level-up text shaping
- own discovered-text suffixing
- return structured text parts for hungry and cold so the keyword word can be styled separately

Interface:

- pure formatting functions for event and ongoing items

### Add: `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.ts`

Responsibility:

- resolve event-notification inputs from applied commands and world-counter deltas

Logic:

Input:

- applied command list
- previous snapshot
- current snapshot

Output:

- normalized runtime-event inputs for the store

Resolution rules are fixed:

1. Body added
- for each applied `SPAWN`
- resolve spawned entity from `currentSnapshot`
- if the spawned entity has a body component, emit `body_added`

2. Body starved
- for each applied `KILL`
- if `metadata.cause = starvation`, emit `body_starved`
- aggregate all such kills in the batch into one input

3. Body killed by Purge
- read `delta(cave_evt_purge_kill)` from world state
- emit one `body_purge_kill` input when delta is positive

4. Body butchered
- read `delta(cave_evt_butchered)` from world state
- emit one `body_butchered` input when delta is positive

5. Body absorbed
- compute `absorptionDelta = delta(cave_evt_absorption_complete)`
- compute `butcheredDelta = delta(cave_evt_butchered)`
- emit `body_absorbed` for `max(0, absorptionDelta - butcheredDelta)`

6. Body level up
- inspect each applied `UPDATE_BODIES_BATCH`
- for each update that sets numeric `level`, aggregate by resulting level

7. Entity discovered
- for each applied `SPAWN`
- require `metadata.sourceLane = draft_option`
- resolve spawned entity from `currentSnapshot`
- reject if entity is a body, proxy, or transfer
- derive display label from `display.label`, then `label`, then `id`
- aggregate by normalized label

This file must not own timing, dismissal, or rendering.

Interface:

- one pure function returning normalized event inputs

### Add: `src/ui/runtime/notifications/resolveOngoingRuntimeNotifications.ts`

Responsibility:

- derive ongoing notifications from current runtime state only

Logic:

- if runtime is null, return empty list
- compute hungry and cold counts from `resolveBodyStatusCounts(runtime.getEntities())`
- read purge active from `sys_world.cave.purge.isActive`
- read tutorial flag from `sys_world.state.cave_tut_throttle_seen`
- emit descriptors only for true conditions
- assign stable keys and priorities defined in section 5.2

Interface:

- one pure function returning ordered ongoing descriptors

## 6.8 Runtime notification view layer

### Add: `src/ui/runtime/notifications/RuntimeNotificationViewport.styles.ts`

Responsibility:

- own all notification presentation styles

Logic:

- define the shared left HUD stack container
- define blocks for ongoing and event notifications
- define card presentation
- define purge alarm styling and animation
- define keyword styling for hungry and cold
- use only theme keys
- use only existing spacing, radius, font, and z-index tokens

Interface:

- styled exports consumed by the viewport and modal

### Add: `src/ui/runtime/notifications/RuntimeNotificationViewport.tsx`

Responsibility:

- render the runtime notification stack and drive expiry sweeping

Logic:

- subscribe to event items from `runtimeNotificationStore`
- derive ongoing notifications from the current runtime using an observational loop
- sweep expired events on a deterministic timer or animation-frame loop
- render ongoing notifications first, in fixed priority order
- render event notifications second, from oldest to newest so the newest visible event is closest to the cave status cluster
- wrap each card in `Animatable` with `slideUp`
- wrap lists in `AnimatePresence`
- clicking an event toast dismisses it
- clicking the tutorial toast opens the tutorial modal
- render the tutorial modal component alongside the viewport

Interface:

- React component with no props

### Add: `src/ui/runtime/notifications/RuntimeNotificationThrottleTutorialModal.tsx`

Responsibility:

- render the throttle tutorial modal only

Logic:

- read modal open state from `runtimeNotificationStore`
- close through the store action
- render:
  - `Modal`
  - `Card`
  - one `img` using `THROTTLE_TUTORIAL_GIF_SRC`
  - one `RichText` body using the exact body string from constants
- the modal must not mutate runtime state directly

Interface:

- React component with no props

## 6.9 Runtime shell integration

### Change: `src/ui/runtime/status/RuntimeStatusStrip.styles.ts`

Responsibility:

- provide a shared bottom-left HUD dock

Logic:

- add a new left HUD stack wrapper that anchors once and lays children out vertically
- keep existing right-side clock shell unchanged

Interface:

- export the new left HUD stack wrapper

### Change: `src/ui/runtime/status/CaveStatusNote.tsx`

Responsibility:

- allow `CaveStatusNote` to render inside the shared HUD dock without owning its own absolute positioning

Logic:

- add prop `anchored`, default `true`
- when `anchored = false`, render only the note card content and not `StatusShellLeft`
- extract keyword-color mapping into a pure helper local to the file or to a small shared status helper
- use game-palette-backed theme keys only

Interface:

- `CaveStatusNote` gains optional `anchored` prop

### Change: `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

Responsibility:

- compose the new left HUD cluster

Logic:

- replace standalone `CaveStatusNote` placement with the shared left HUD stack
- inside that stack, render:
  - `RuntimeNotificationViewport`
  - `CaveStatusNote anchored={false}`
- leave `RuntimeClock` placement unchanged on the right
- do not use the global toast portal for these notifications

Interface:

- no prop changes

## 6.10 Applied-command bridge and lifecycle reset

### Change: `src/ui/runtime/state/runtimeFactory.ts`

Responsibility:

- feed event notifications from the applied-command observer

Logic:

- inside `telemetryAdapter.onCommandsApplied(...)` keep existing cinematic evaluation
- keep existing living-card notification evaluation
- add runtime notification evaluation after those existing calls
- pass `commands`, `prev`, and `current` to `resolveRuntimeNotificationEvents(...)`
- if the result is non-empty, push it into `runtimeNotificationStore.applyEventBatch(...)`
- this file must not mutate runtime state directly

Interface:

- no public API changes

### Change: `src/ui/runtime/state/useRuntimeStore.ts`

Responsibility:

- prevent stale notification UI across runtime transitions

Logic:

- call `runtimeNotificationStore.reset()` from:
  - `loadCartridge`
  - `unload`
  - `reset`

Interface:

- no public API changes

## 7. Files explicitly not changed

Do not change these files for this feature:

- `src/ui/devtools/toast/*`
- `src/engine/runtime/types/runtimeCommandPayloadsBase.ts` for provenance purposes
- `src/engine/runtime/handlers/SpawnHandler.ts`
- `src/engine/runtime/handlers/KillHandler.ts`
- `src/ui/runtime/status/RuntimeClock.tsx`

Reason:

- they are not the right seam for this feature
- changing them would either duplicate the new command-metadata model or broaden scope unnecessarily

## 8. Test plan

All tests must follow the project testing standard:

- logic is unit tested
- system/runtime interactions are integration tested with a real isolated world
- TSX tests verify rendering and wiring only
- tests are colocated
- tests use Given/When/Then
- timers are deterministic

## 8.1 Unit tests

### Add: `src/engine/runtime/commandMetadata.test.ts`

Covers:

- append metadata to a command with no metadata
- shallow merge with existing metadata
- overwrite colliding keys only
- preserve unrelated keys
- do not mutate the original command
- typed readers for `sourceEntityId`, `sourceLane`, and `cause`

### Add: `src/game/systems/cave/bodyStatusCounts.test.ts`

Covers:

- counts hungry bodies
- counts cold bodies
- ignores non-body entities
- handles empty input
- handles bodies with multiple traits

### Change or add next to `processEntity.ts`

Covers:

- starvation death returns `deathCause = starvation`
- non-starvation death returns no death cause
- living body returns update without death cause

### Add: `src/ui/runtime/notifications/runtimeNotificationStore.test.ts`

Covers:

- new event creates a new item
- same aggregation key increments count and resets expiry
- level-up keys stay separate by level
- discovered keys stay separate by label
- dismiss removes the targeted item only
- sweep removes only expired items
- reset clears event items and modal state

### Add: `src/ui/runtime/notifications/formatRuntimeNotificationText.test.ts`

Covers:

- singular/plural for all event kinds
- level-up formatting
- discovery suffix formatting
- hungry/cold structured-text output

### Add: `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.test.ts`

Covers:

- body added from body spawn
- no body added from non-body spawn
- body starved from `KILL.metadata.cause = starvation`
- purge kill from cave counter delta
- butchered from cave counter delta
- absorbed from net counter delta
- butcher-only batch does not also emit absorbed
- level-up aggregation by resulting level
- discovery requires `sourceLane = draft_option`
- discovery rejects body, proxy, and transfer
- discovery label fallback order is correct

### Add: `src/ui/runtime/notifications/resolveOngoingRuntimeNotifications.test.ts`

Covers:

- hungry visible only when count > 0
- cold visible only when count > 0
- purge visible only when active
- tutorial visible only when `cave_tut_throttle_seen !== true`
- stable ordering is correct

## 8.2 Integration tests

### Change or add next to `BodySystem.ts`

Covers:

- starving body death enqueues `KILL` with `metadata.cause = starvation`
- non-starving body death enqueues `KILL` without starvation cause metadata
- body updates remain unchanged for surviving bodies

### Add next to `purgeEvaluate.ts`

Covers:

- purge kill enqueues `KILL` with `metadata.cause = purge`
- purge still increments `cave_evt_purge_kill`

### Change or add next to `BehaviorSystem.ts`

Covers:

- commands emitted from normal behavior rules are stamped with:
  - `sourceEntityId`
  - `sourceLane = behavior_rule`

### Change or add next to `DraftSystem.ts`

Covers:

- commands emitted from selected draft options are stamped with:
  - `sourceEntityId`
  - `sourceLane = draft_option`

### Change or add next to `triggerDraftCompletion.ts`

Covers:

- commands emitted from draft `onComplete` actions are stamped with:
  - `sourceEntityId`
  - `sourceLane = draft_on_complete`

### Change or add next to `runtimeFactory.ts`

Covers:

- `onCommandsApplied(...)` still drives cinematics and living-card notifications
- runtime notification events are also resolved and pushed into the runtime notification store
- no runtime mutation occurs inside the observer

## 8.3 View tests

### Add: `src/ui/runtime/notifications/RuntimeNotificationViewport.test.tsx`

Covers:

- renders ongoing and event blocks together
- clicking an event card dismisses it
- clicking tutorial toast opens the modal
- purge card renders alarm styling hook or class
- hungry and cold render the colored keyword separately
- expired event disappears under fake timers

### Add: `src/ui/runtime/notifications/RuntimeNotificationThrottleTutorialModal.test.tsx`

Covers:

- renders the gif using the fixed `/public` path
- renders the `RichText` body
- closes via modal close action

### Change: `src/ui/runtime/status/CaveStatusNote.test.tsx`

Covers:

- default anchored mode still renders the outer shell
- unanchored mode renders note content only

### Change or add next to `RuntimeShellCanvas.tsx`

Covers:

- left HUD stack contains notifications above cave status
- `RuntimeClock` remains on the right

## 9. Implementation order

Implement in this order.

1. Command-envelope metadata foundation
2. Behavior provenance stamping
3. Death-cause stamping
4. Shared body-status counting utility
5. Persistent tutorial-seen world state
6. Game palette introduction and UI-theme population
7. Runtime notification domain and store
8. Event resolver
9. Ongoing resolver
10. View layer and HUD integration
11. Runtime observer hookup and store reset
12. Tests

Do not reorder this sequence. Later steps depend on earlier contracts.

## 10. Acceptance criteria

The feature is complete only when all of the following are true:

- event toasts aggregate and reset their lifetime correctly
- ongoing toasts appear only while true
- tutorial toast opens a modal with gif and `RichText` body
- behavior-emitted commands carry `sourceEntityId` and `sourceLane`
- starvation and purge kills carry `cause`
- absorbed and butchered notifications resolve from existing cave counters without double-counting
- touched files contain no raw color literals
- the UI theme is populated from the game palette
- all new tests pass
- no existing tests regress
- no architectural rule from the project contracts is violated
