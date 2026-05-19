# LLD — Split Runtime Notifications into Clickable Ongoing Status Cards and Top-Left Transient Toasts

## 1. Purpose

Implement the minimum, code-grounded changes required to:

- make ongoing runtime notifications persistent, clickable guidance status cards
- add **Suspicion** as a first-class ongoing notification
- source Suspicion card text and color from **new authored game-config data**, not from the existing job-card suspicious-activity display rules
- add a second devtools editor, immediately after **Suspicious Displays**, that authors the Suspicion-card display ladder with the same field model and same form affordances
- move transient event notifications into their own **top-left** stack
- ensure transient event entries are **inserted at the visual top** of that stack
- preserve the existing transient event store, aggregation, TTL, and click semantics

This design is based on the existing notification code and the uploaded project contracts. It does not introduce a new notification system. It reuses the existing runtime command pipeline, modal guidance overlay, notification store, animation primitives, config schema pattern, and devtools field components. fileciteturn1file0 fileciteturn1file1 fileciteturn1file2

## 2. Why

### 2.1 Product reason

The runtime currently mixes two different semantics in one visual area:

- **ongoing state**: something important is true now and stays true until resolved
- **transient event**: something happened and may be worth noticing briefly

These need different behavior and different placement.

Required product behavior:

- ongoing cards stay visible while their condition is true
- ongoing cards are clickable and open guidance on demand
- transient events are ephemeral toasts
- transient events occupy a separate top-left stack
- new transient events appear at the visual top of that stack

### 2.2 Code-grounded reason

The current code already contains the main building blocks:

- `resolveOngoingRuntimeNotifications.ts` derives persistent ongoing descriptors
- `runtimeNotificationStore.ts` owns transient event aggregation and TTL expiry
- `RuntimeNotificationCard.tsx` already supports clickable cards
- `SHOW_NOTIFICATION_ABILITY_GUIDANCE` already exists and already feeds `RuntimeModalGuidanceOverlay`
- `RuntimeNotificationViewport.tsx` already renders ongoing and transient notifications together

The current source of suspicious text and color is also explicit in code:

- job-card suspicious-activity pills read `config.settings.game_config.susDisplays`
- `readConfiguredSusDisplays()` and `resolveDisplayRule()` select the matching authored rule for the job-card indicator
- there is **no separate authored source** today for the ongoing Suspicion notification, because the ongoing Suspicion notification does not yet exist

That is the specific gap this revision closes.

The current layout and ordering are also explicit in code:

- `RuntimeShellCanvas.tsx` mounts `RuntimeNotificationViewport` inside `LeftHudStack`, which is bottom-left
- `RuntimeNotificationViewport.tsx` renders both lists inside one `NotificationStack`
- `RuntimeNotificationViewport.styles.ts` gives both lists the same `NotificationBlock` with `flex-direction: column-reverse`
- `runtimeNotificationStore.ts` sorts transient events newest-first
- `useRuntimeNotificationViewportState.ts` reverses transient events again before rendering
- `RuntimeNotificationOngoingList.tsx` hardcodes ongoing cards as non-clickable

Therefore the required work is narrow and concrete:

- separate the viewport into a bottom-left ongoing stack and a top-left transient stack
- make ongoing cards clickable through the existing NOTIFY path
- add Suspicion as a first-class ongoing descriptor
- add a new authored config array and a sibling editor for Suspicion notification display text/color thresholds
- keep `susDisplays` reserved for job-card suspicious-activity pills
- make transient event rendering order and animation match the new top-left behavior

## 3. Existing behavior to preserve

The following behavior must remain unchanged:

- transient events continue to be stored in `runtimeNotificationStore.ts`
- transient events continue to aggregate by `aggregationKey`
- transient events continue to expire by `RUNTIME_EVENT_NOTIFICATION_TTL_MS`
- `handleRuntimeEventClick.ts` continues to own transient event click behavior
- `SHOW_NOTIFICATION_ABILITY_GUIDANCE` continues to be the command used for modal notification guidance
- `RuntimeModalGuidanceOverlay.tsx` continues to own modal rendering and acknowledgement
- `useRuntimeNotificationViewportState.ts` continues to recompute ongoing items on the existing timer cadence
- tutorial attention with `hideNotifications` continues to hide the whole notification viewport
- `config.settings.game_config.susDisplays` continues to drive the job-card suspicious-activity pill only
- existing job-card suspicious-activity indicator wording, color selection, and tests continue to use `susDisplays` only

## 4. Scope

### 4.1 In scope

- ongoing notification typing
- ongoing notification derivation
- ongoing notification formatting
- ongoing notification click handling
- authored guidance-id mapping for ongoing cards
- Suspicion ongoing notification
- authored Suspicion-notification display ladder in game config
- devtools editor for authored Suspicion-notification display ladder
- splitting notification layout into two screen anchors
- moving transient event notifications to a dedicated top-left stack
- making new transient event entries appear at the visual top of that stack
- tests for logic, ordering, layout wiring, authored-display sourcing, and click wiring

### 4.2 Out of scope

- changing transient event kinds
- changing transient event TTL duration
- changing transient event aggregation keys or store mechanics
- changing transient event click semantics
- redesigning tutorials
- adding new runtime command types or handlers
- changing modal guidance queue semantics
- changing cave-status-note placement
- changing unrelated HUD layout
- changing the meaning of existing `susDisplays` for job-card suspicious-activity pills

## 5. Target behavior

### 5.1 Ongoing stack

The ongoing stack is the **bottom-left** status stack.

It must:

- remain anchored bottom-left
- contain exactly the active ongoing states
- remain persistent while each state is true
- not auto-dismiss
- not dismiss on click
- open guidance via NOTIFY on click

Ongoing kinds in scope:

- `suspicion`
- `cold_bodies`
- `hungry_bodies`
- `purge_active`

### 5.2 Transient stack

The transient stack is the **top-left** toast stack.

It must:

- be visually separate from the ongoing stack
- remain anchored top-left
- render only transient event notifications
- preserve existing event click behavior and TTL behavior
- place the newest event at the visual top
- push older events downward when a new event arrives

Transient kinds remain unchanged. Based on current code, that includes:

- body gained / added
- body lost / died
- body starved
- body butchered
- body absorbed
- body level-up
- entity discovered / unlocked
- Purge milestone notification

### 5.3 Guidance mapping contract

Each ongoing card key must map to exactly one authored guidance id.

This mapping is a compile-time constant in TypeScript.
It is not authored in runtime state.

Required mapping:

- `suspicion` -> `ongoing_suspicion`
- `cold_bodies` -> `ongoing_survival_spiral`
- `hungry_bodies` -> `ongoing_survival_spiral`
- `purge_active` -> `ongoing_purge_active`

Notes:

- `cold_bodies` and `hungry_bodies` intentionally share one guidance id
- mapping is the single source of truth for ongoing-card click guidance selection
- authored guidance definitions for these ids must exist in `core.cave`

### 5.4 Authored Suspicion display contract

The ongoing Suspicion card must **not** read from `susDisplays`.

It must read from a new authored array at:

- `config.settings.game_config.suspicionNotificationDisplays`

That array uses the **same item shape** as `susDisplays`:

- `text: string`
- `color: #RRGGBB`
- `threshold: number`

Threshold meaning is explicit:

- `threshold` is the minimum **current** `sys_world.state.purge_progress.value` required for that display rule to match

Selection rule is explicit:

- choose the highest-threshold rule whose threshold is `<= current purge_progress.value`

Interpretation rule is explicit:

- the rule’s `text` is the Suspicion **level label**
- the rule’s `color` is the Suspicion **level-label color**
- the card formatter prefixes the label with a fixed semantic prefix: `Suspicion:`
- the prefix is not authored
- the label is authored

Example intended authored ladder shape:

- `None`
- `Low`
- `Some`
- `Moderate`
- `High`
- `Extreme`
- `Discovered`

The exact texts remain authored data, not TypeScript fallback data.

### 5.5 Ordering contract

#### Ongoing ordering

The current ongoing list uses `flex-direction: column-reverse` and the resolver already sorts ascending by priority.

That layout behavior must be preserved.

Resolver priorities must remain:

- `purge_active`: 1
- `hungry_bodies`: 2
- `cold_bodies`: 3
- `suspicion`: 4

With the existing bottom-left reverse column behavior, the visual top-to-bottom order remains:

- Suspicion
- Cold bodies
- Hungry bodies
- Purge is on

#### Transient ordering

The transient stack must render newest-first in visual top-to-bottom order.

Required rendering contract:

- the event render input to `RuntimeNotificationEventList.tsx` must already be newest-first
- the transient event stack container must use normal top-to-bottom column layout, not reverse layout
- new transient events must animate in from above, using the existing `slideDown` animation type

Result:

- newest event appears at the top
- older events remain below it
- the stack grows downward from the top-left anchor

## 6. Design

### 6.1 Reuse strategy

This implementation must reuse existing mechanisms.

#### Ongoing click flow

1. user clicks an ongoing card
2. UI resolves the card’s `guidanceId`
3. UI resolves the authored guidance from `runtime.getCartridge().config.settings.guidances`
4. UI validates that the guidance exists and is `presentation: modal`
5. UI enqueues `SHOW_NOTIFICATION_ABILITY_GUIDANCE`
6. existing command handler writes notification ability guidance into `sys_world`
7. existing `RuntimeModalGuidanceOverlay` renders it

No new guidance subsystem is introduced.

#### Suspicion display authoring flow

1. author opens `GameConfigEditor`
2. author uses existing `Suspicious Displays` editor for job-card suspicious-activity pills
3. author uses a new sibling editor immediately after it for `Suspicion Notification Displays`
4. both editors use the same row form shape and same field components
5. the new editor writes to `config.settings.game_config.suspicionNotificationDisplays`
6. the ongoing Suspicion resolver reads that new path only

No new editor field type is introduced.

#### Transient layout flow

1. runtime event store remains the source of truth for transient items
2. viewport state exposes transient items in newest-first order
3. transient list renders them in a top-left anchored stack
4. transient list uses normal column layout and `slideDown`

No new event store is introduced.

### 6.2 Layout strategy

The current shell mounts `RuntimeNotificationViewport` inside `LeftHudStack`, which hard-anchors the entire viewport bottom-left.

That is incompatible with rendering a separate top-left transient stack.

Therefore the notification viewport must become its own full-screen overlay layer under `RuntimeViewport` and must own its own two anchored children:

- one bottom-left ongoing anchor
- one top-left transient anchor

This is the smallest change that allows two independent screen positions without duplicating viewport state.

### 6.3 Styling strategy for Suspicion

Current notification chrome styling is tone-based and only accepts the existing `RuntimeNotificationTone` enum.

Therefore Suspicion styling is defined as:

- card frame tone remains `default`
- authored color applies only to the **level label text part**
- no authored border, glow, or frame tone is introduced in this task

This keeps styling within the capabilities already present in `RuntimeNotificationCard.tsx` and `RuntimeNotificationViewport.styles.ts`.

### 6.4 Error handling

Silent failures are forbidden by contract. fileciteturn1file1

The ongoing click path must `console.error` and do nothing when any of the following occur:

- runtime is missing
- the ongoing descriptor has no `guidanceId`
- the authored guidance id is missing from cartridge config
- the authored guidance exists but is not `presentation: modal`
- authored modal guidance text is empty or invalid

The Suspicion display resolver must `console.error` and omit the Suspicion card when any of the following occur:

- `sys_world` is missing
- `purge_progress` cannot be resolved
- no authored rule matches
- the authored rule exists but has invalid `text` or invalid `color`

In all error cases:

- no command is enqueued
- no fallback hardcoded copy is introduced
- no fallback color is introduced

## 7. File-by-file design

### 7.1 Add — `src/ui/runtime/notifications/runtimeOngoingGuidanceMap.ts`

**Responsibility**

Own the authoritative mapping from stable ongoing card key to authored guidance id.

**Logic**

Export one immutable typed map covering all ongoing keys in scope.

**Interface**

Exports:

- the stable ongoing key union
- the immutable ongoing-key-to-guidance-id map

**Rules**

- every ongoing key in scope must exist in the map
- no runtime state
- no React usage
- values are guidance ids only, not presentation data

### 7.2 Change — `src/data/schemas/game/config.ts`

**Responsibility**

Define the persisted game-config schema and defaults.

**Logic**

Add one new field:

- `suspicionNotificationDisplays: z.array(SusDisplaySchema).default([])`

`SusDisplaySchema` is reused exactly as-is.

**Interface**

`GameConfigSchema` and `DEFAULT_GAME_CONFIG` now include:

- `susDisplays`
- `suspicionNotificationDisplays`

**Rules**

- `susDisplays` remains for job-card suspicious-activity pills
- `suspicionNotificationDisplays` is reserved for the ongoing Suspicion notification
- the two arrays are independent and must never be read interchangeably

### 7.3 Change — `src/data/raw/game_data.json`

**Responsibility**

Provide the default new-game authored config shape.

**Logic**

Add an empty `suspicionNotificationDisplays` array beside the existing `susDisplays` array.

**Interface**

The serialized default config now contains both arrays.

### 7.4 Change — `src/data/raw/example/modules/core.cave`

**Responsibility**

Provide example authored data for the feature.

**Logic**

Add a `suspicionNotificationDisplays` array beside `susDisplays`.

This array must contain the authored ladder used by the ongoing Suspicion card.

Required authoring rule:

- include a threshold-0 entry so the tracker has a defined base state from the start of a run

Also add the authored modal guidance definitions referenced by the ongoing-guidance map:

- `ongoing_suspicion`
- `ongoing_survival_spiral`
- `ongoing_purge_active`

Each must:

- be `presentation: modal`
- be valid under the existing guidance schema
- have non-empty `title`
- have non-empty `text`

### 7.5 Change — `src/ui/devtools/editors/config/GameConfigEditor.tsx`

**Responsibility**

Compose the game-config authoring surface.

**Logic**

Render the new Suspicion-notification display editor immediately after the existing `SusDisplayEditor`.

Required visual order:

1. `SchemaForm`
2. `PurgeMilestonesEditor`
3. `SusDisplayEditor`
4. `SuspicionNotificationDisplayEditor`

**Interface**

No prop change.

### 7.6 Add — `src/ui/devtools/editors/config/suspicion/SuspicionNotificationDisplayEditor.tsx`

**Responsibility**

Author the threshold ladder used by the ongoing Suspicion notification.

**Logic**

This is a thin wrapper around the same row form used by `SusDisplayEditor`.

It must:

- ensure the module session exists
- read the authored list from `config.settings.game_config.suspicionNotificationDisplays`
- render one form row per item
- add and remove rows
- use copy specific to the Suspicion notification, not to job-card suspicious activity

**Interface**

Props:

- `filename: string`

Rendered title:

- `Suspicion Notification Displays`

Rendered button label:

- `+ Add Suspicion Notification Display`

### 7.7 Add — `src/ui/devtools/editors/config/suspicion/useSuspicionNotificationDisplaysSession.ts`

**Responsibility**

Own session-backed list mutation for `suspicionNotificationDisplays`.

**Logic**

Mirror the existing session behavior used by `useSusDisplaysSession.ts`, but target the new path:

- `config.settings.game_config.suspicionNotificationDisplays`

Default new row value must reuse the existing field shape:

- empty `text`
- default hex `color`
- `threshold: 0`

**Interface**

Return exactly the same shape as `useSusDisplaysSession`:

- list of current items
- `add...`
- `remove...`

### 7.8 Change — `src/ui/devtools/editors/config/suspicion/SusDisplayForm.tsx`

**Responsibility**

Render one threshold-display authoring row.

**Logic**

Remove the hardcoded `susDisplays` base path.

Make the form reusable by both editors by accepting an explicit `basePath` prop.

Do not change the field set.

**Interface**

Add prop:

- `basePath: string`

Existing fields remain:

- `Text`
- `Color`
- `Threshold`

**Rules**

- this component remains field-only
- it must not contain list/session logic

### 7.9 Change — `src/ui/devtools/editors/config/suspicion/SusDisplayEditor.tsx`

**Responsibility**

Continue authoring `susDisplays` for job-card suspicious-activity pills.

**Logic**

Update only as required to pass the new `basePath` prop into `SusDisplayForm`.

Its data path remains unchanged:

- `config.settings.game_config.susDisplays`

Its title and copy remain job-card-specific.

### 7.10 Change — `src/ui/runtime/notifications/runtimeNotificationTypes.ts`

**Responsibility**

Define the semantic contracts for runtime notifications.

**Logic**

Extend ongoing typing to support:

- the `suspicion` kind
- a stable ongoing key contract
- a required `guidanceId` on every ongoing descriptor
- Suspicion-specific authored display data
- optional raw text color support for formatted text parts

**Interface**

Required contracts:

- `RuntimeOngoingKind` adds `suspicion`
- ongoing descriptor carries `key`, `kind`, `guidanceId`, and `priority`
- `hungry_bodies` and `cold_bodies` descriptors carry `count`
- `suspicion` descriptor carries `levelText` and `levelColor`
- `RuntimeNotificationTextPart` supports either an existing theme `colorKey` or an authored raw `color`

### 7.11 Add — `src/ui/runtime/notifications/suspicionNotificationDisplayRules.ts`

**Responsibility**

Own reading and threshold-resolution for authored Suspicion-notification displays.

**Logic**

Read authored rules from:

- `config.settings.game_config.suspicionNotificationDisplays`

Support the same config fallback shape already used elsewhere:

- `config.settings.game_config...`
- `config.game_config...`
- `DEFAULT_GAME_CONFIG...`

Resolve the best matching rule by highest threshold `<= current purge_progress.value`.

**Interface**

Exports:

- `readConfiguredSuspicionNotificationDisplays(runtime)`
- `resolveSuspicionNotificationDisplay(value, rules)`

**Rules**

- do not read `susDisplays`
- do not import authored copy from anywhere else
- do not hardcode labels or colors

### 7.12 Change — `src/ui/runtime/notifications/resolveOngoingRuntimeNotifications.ts`

**Responsibility**

Resolve the active set of ongoing descriptors from runtime state.

**Logic**

Continue to derive:

- `purge_active`
- `hungry_bodies`
- `cold_bodies`

Add derivation of:

- `suspicion`

The resolver must:

- return `[]` when runtime is missing or invalid
- continue using `resolveBodyStatusCounts(entities)` for hunger and cold counts
- continue reading Purge active state from `sys_world.cave.purge.isActive`
- resolve current Purge progress from the existing `resolveProgress(sys_world)` helper
- resolve Suspicion level text and color from `suspicionNotificationDisplays`
- attach `guidanceId` from `runtimeOngoingGuidanceMap`
- return items sorted by ascending `priority`

**Suspicion contract**

- read `resolveProgress(sys_world).value`
- select the matching authored Suspicion-notification display rule
- emit one `suspicion` descriptor carrying `levelText`, `levelColor`, `guidanceId`, and priority
- if no authored rule resolves, log explicitly and omit the Suspicion descriptor

**Interface**

Input:

- `Runtime | null`

Output:

- ordered `RuntimeOngoingDescriptor[]`

### 7.13 Change — `src/ui/runtime/notifications/formatRuntimeNotificationText.ts`

**Responsibility**

Convert semantic notification descriptors into renderable display models.

**Logic**

Keep transient event formatting unchanged.

Extend ongoing formatting to support Suspicion.

Formatting requirements:

- `hungry_bodies`: existing phrasing unchanged
- `cold_bodies`: existing phrasing unchanged
- `purge_active`: existing phrasing unchanged
- `suspicion`: render `Suspicion:` as the fixed prefix and render the authored `levelText` as the colored suffix

Required Suspicion output shape:

- part 1: `Suspicion:`
- part 2: authored `levelText` with authored raw `levelColor`
- tone: `default`

**Interface**

Input:

- `RuntimeOngoingDescriptor`

Output:

- `RuntimeOngoingDisplayModel`

### 7.14 Change — `src/ui/runtime/notifications/RuntimeNotificationCard.tsx`

**Responsibility**

Render one notification card from a display model.

**Logic**

Do not add business logic.

Only extend text-part rendering so `NotificationWord` can receive an optional raw color in addition to the existing theme color key.

**Interface**

Prop contract remains structurally the same.

### 7.15 Change — `src/ui/runtime/notifications/RuntimeNotificationViewport.styles.ts`

**Responsibility**

Own notification layout anchoring and notification-specific styles.

**Logic**

Replace the single shared stack layout with:

- `NotificationViewportLayer`: absolute full-screen overlay under the runtime viewport
- `NotificationBottomLeftAnchor`: ongoing-stack anchor
- `NotificationTopLeftAnchor`: transient-stack anchor
- `OngoingNotificationBlock`: reverse column layout
- `EventNotificationBlock`: normal column layout

Retain existing frame, text, tone, and animation-color styling.

Extend `NotificationWord` to support either:

- theme-driven `colorKey`, or
- authored raw `color`

**Interface**

This file must export the new viewport/anchor/block styled components required by `RuntimeNotificationViewport.tsx`, `RuntimeNotificationEventList.tsx`, and `RuntimeNotificationOngoingList.tsx`.

**Layout rules**

- both anchors use the same left inset as the existing HUD styles: `16px`
- bottom-left anchor uses `bottom: 16px`
- top-left anchor uses `top: 16px`
- anchors use `pointer-events: none`
- cards remain the only pointer-active elements

### 7.16 Add — `src/ui/runtime/notifications/handleRuntimeOngoingClick.ts`

**Responsibility**

Own all non-visual logic for ongoing-card click behavior.

**Logic**

Given a resolved ongoing descriptor and a runtime:

- validate runtime exists
- validate descriptor contains `guidanceId`
- resolve authored guidance from `runtime.getCartridge().config.settings.guidances`
- validate authored guidance exists and is `presentation: modal`
- enqueue `SHOW_NOTIFICATION_ABILITY_GUIDANCE`
- use the authored guidance id as `abilityId`
- copy authored `title`, `text`, and `imageUrl`
- if runtime state is paused, flush commands immediately after enqueue

**Why flush is required**

This matches the current paused-runtime pattern already used around notification-ability guidance behavior and preserves deterministic command application.

**Interface**

Input:

- one `RuntimeOngoingDescriptor`
- one `Runtime | null`

Output:

- none

Side effect:

- may enqueue one runtime command

### 7.17 Change — `src/ui/runtime/notifications/RuntimeNotificationOngoingList.tsx`

**Responsibility**

Render the ongoing bottom-left stack and wire ongoing-card clicks.

**Logic**

This remains a thin view.

Required behavior:

- use the existing world-interaction hook/context to access runtime
- render cards as clickable
- call `handleRuntimeOngoingClick(item, runtime)` on click
- keep ongoing animations as `slideUp`
- render inside `OngoingNotificationBlock`

**Interface**

Input remains:

- `items: RuntimeOngoingDescriptor[]`

No local state.

### 7.18 Change — `src/ui/runtime/notifications/RuntimeNotificationEventList.tsx`

**Responsibility**

Render the transient top-left stack.

**Logic**

Keep transient click behavior unchanged by continuing to call `handleRuntimeEventClick(item, world)`.

Change only the layout behavior:

- render inside `EventNotificationBlock`
- use `slideDown` for entry/exit animation instead of `slideUp`
- assume input items are already newest-first

**Interface**

Input remains:

- `items: RuntimeEventItem[]`

No local state.

### 7.19 Change — `src/ui/runtime/notifications/useRuntimeNotificationViewportState.ts`

**Responsibility**

Provide the semantic notification state used by the viewport.

**Logic**

Continue to:

- resolve ongoing items on the existing timer
- sweep expired transient events on the existing timer
- expose `hiddenByTutorial`

Change transient event output ordering:

- stop reversing the store items before render
- expose transient items in the store’s natural newest-first order

**Reason**

The transient stack is moving to a top-left normal column layout, so newest-first ordering must be preserved directly.

**Interface**

Return shape remains the same:

- `ongoingItems`
- `renderedEvents`
- `hiddenByTutorial`

Only the ordering contract of `renderedEvents` changes.

### 7.20 Change — `src/ui/runtime/notifications/RuntimeNotificationViewport.tsx`

**Responsibility**

Own the notification overlay composition.

**Logic**

Replace the single in-flow notification stack with a full-screen overlay layer that renders two anchored children:

- bottom-left ongoing stack
- top-left transient stack

Required behavior:

- when `hiddenByTutorial` is true, render nothing
- otherwise render one `NotificationViewportLayer`
- render `RuntimeNotificationOngoingList` inside `NotificationBottomLeftAnchor`
- render `RuntimeNotificationEventList` inside `NotificationTopLeftAnchor`
- retain the existing outer `AnimatePresence` / `slideRight` viewport entry behavior

**Interface**

The component remains prop-less.

### 7.21 Change — `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

**Responsibility**

Mount the runtime overlay layers.

**Logic**

Stop mounting `RuntimeNotificationViewport` inside `LeftHudStack`.

Instead, mount `RuntimeNotificationViewport` directly inside the runtime viewport overlay list, as a sibling of the other overlays.

**Reason**

The notification viewport now owns two different screen anchors and cannot be constrained by the bottom-left `LeftHudStack` wrapper.

**Interface**

No prop change.

### 7.22 Change — `src/ui/runtime/notifications/RuntimeNotificationViewport.test.tsx`

**Responsibility**

Continue to act as the test entrypoint for notification viewport case files.

**Logic**

Import the new ongoing-click case file.

## 8. Tests

The testing contract requires behavior-focused unit, integration, and view tests, with explicit negative paths and readable Given/When/Then structure. fileciteturn1file2

### 8.1 Unit tests

#### Change — `src/ui/runtime/notifications/resolveOngoingRuntimeNotifications.test.ts`

Add coverage for:

- Suspicion descriptor appears when `suspicionNotificationDisplays` resolves a rule for current `purge_progress.value`
- Suspicion descriptor carries the mapped `guidanceId`
- Suspicion descriptor carries authored `levelText` and `levelColor`
- resolver output order remains ascending by priority
- negative path: when `suspicionNotificationDisplays` has no match, the resolver omits Suspicion and logs explicitly
- regression path: `susDisplays` is ignored by the ongoing Suspicion resolver

Keep existing hunger, cold, and Purge assertions.

#### Change — `src/ui/runtime/notifications/formatRuntimeNotificationText.test.ts`

Add coverage for:

- Suspicion formatting returns `Suspicion:` as the first part
- Suspicion formatting returns the authored level label as the second part
- Suspicion formatting carries the authored raw color on the level-label part
- Suspicion tone is `default`
- existing hungry, cold, and Purge formatting remains unchanged

#### Add — `src/ui/devtools/editors/config/suspicion/SuspicionNotificationDisplayEditor.smoke.test.tsx`

Required cases:

1. renders add and remove affordances without crashing
2. adding rows creates the same form controls as `SusDisplayEditor`
3. row fields bind to the `suspicionNotificationDisplays` path, not to `susDisplays`

#### Change — `src/ui/devtools/editors/config/GameConfigEditor.test.tsx`

Add assertions that both section titles render:

- `Suspicious Displays`
- `Suspicion Notification Displays`

and that the latter appears after the former in document order.

#### Add — `src/ui/runtime/notifications/handleRuntimeOngoingClick.test.ts`

Required cases:

1. happy path: valid modal guidance enqueues `SHOW_NOTIFICATION_ABILITY_GUIDANCE` with authored `abilityId`, `title`, `text`, and `imageUrl`
2. paused runtime path: enqueue occurs and `flushCommands()` is called exactly once
3. missing runtime: logs error and does not enqueue
4. missing `guidanceId`: logs error and does not enqueue
5. missing authored guidance in cartridge config: logs error and does not enqueue
6. authored guidance exists but is not modal: logs error and does not enqueue
7. authored modal guidance is invalid or empty: logs error and does not enqueue

### 8.2 View tests

#### Add — `src/ui/runtime/notifications/RuntimeNotificationViewport.ongoingClick.cases.tsx`

Required cases:

1. clicking a hungry ongoing card enqueues one notification ability guidance command
2. clicking a cold ongoing card enqueues the same mapped guidance id as hungry
3. clicking Purge enqueues its mapped guidance id
4. clicking Suspicion enqueues its mapped guidance id
5. ongoing cards remain rendered after click

This test verifies wiring only. It must not duplicate `handleRuntimeOngoingClick` internals.

#### Change — `src/ui/runtime/notifications/RuntimeNotificationViewport.events.cases.tsx`

Update event-stack assertions to match the new top-left transient contract.

Required cases:

1. transient events still render together with ongoing notifications
2. transient event click still dismisses through the existing event path
3. newest transient event is rendered first in the transient stack
4. transient events render inside the dedicated transient stack, not inside the ongoing stack
5. transient dismiss countdown still updates correctly
6. transient auto-dismiss still works correctly

#### Change — `src/ui/runtime/notifications/RuntimeNotificationViewport.attention.cases.tsx`

Ensure the hidden-by-tutorial behavior still hides the full split viewport and restores both stacks without clearing transient store contents.

### 8.3 Regression tests to preserve existing job-card behavior

#### Change — `src/ui/runtime/world/selection/job-card/resolveSuspiciousActivityIndicator.test.ts`

Add one regression assertion:

- job-card suspicious-activity indicator still reads `susDisplays` and is unaffected by `suspicionNotificationDisplays`

This is required to enforce the separation of authored data sources.

## 9. Files explicitly not to change

These files remain intentionally unchanged for this task:

- `src/ui/runtime/notifications/runtimeNotificationStore.ts`
- `src/ui/runtime/notifications/handleRuntimeEventClick.ts`
- `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.ts`
- `src/ui/runtime/notifications/resolveRuntimeNotificationEventAccumulator.ts`
- `src/ui/runtime/notifications/constants.ts`
- transient event accumulator tests unrelated to layout or click wiring
- runtime command handler registration
- `ShowNotificationAbilityGuidanceHandler.ts`
- the semantics of `src/ui/runtime/world/selection/job-card/suspiciousActivityIndicatorRules.ts`

Reason:

They already satisfy the transient-event, modal-guidance, or job-card suspicious-activity contracts and are not required to implement the requested split and ongoing-card guidance behavior.

## 10. Acceptance criteria

The implementation is complete only when all of the following are true:

1. ongoing notifications render only in a bottom-left stack
2. transient notifications render only in a top-left stack
3. the viewport no longer depends on `LeftHudStack` for its own placement
4. the ongoing stack supports exactly four active kinds in scope: Suspicion, Cold bodies, Hungry bodies, Purge is on
5. every ongoing card is clickable
6. clicking an ongoing card opens guidance through the existing NOTIFY modal pipeline
7. no new runtime command type or handler was introduced
8. no hardcoded guidance copy was introduced in TypeScript
9. Suspicion text and color are resolved only from `config.settings.game_config.suspicionNotificationDisplays`
10. `config.settings.game_config.susDisplays` continues to affect only the job-card suspicious-activity pill
11. the Game Config editor shows a new `Suspicion Notification Displays` section immediately after `Suspicious Displays`
12. the new section uses the same row field model: `Text`, `Color`, `Threshold`
13. the new section writes only to `config.settings.game_config.suspicionNotificationDisplays`
14. transient event notifications retain their existing store, aggregation, click, TTL, and dismissal behavior
15. newest transient event appears at the visual top of the transient stack
16. transient events animate in from above using the existing animation system
17. all negative paths log explicitly
18. all updated and added tests are green

## 11. Implementation summary

This remains a contained change.

It reuses:

- the existing runtime notification store
- the existing ongoing-notification resolver pattern
- the existing clickable card component
- the existing `SHOW_NOTIFICATION_ABILITY_GUIDANCE` command
- the existing modal guidance overlay
- the existing `SusDisplaySchema`
- the existing devtools row form and field components
- the existing animation primitives, including `slideDown`

The only new logic introduced is:

- one stable ongoing-key-to-guidance-id map
- one new authored config array for Suspicion-notification display thresholds
- one sibling devtools editor for that authored array
- one ongoing click handler
- one new ongoing descriptor kind for Suspicion
- one split notification overlay layout with two anchors
- one event render-order adjustment to match the new top-left stack contract
