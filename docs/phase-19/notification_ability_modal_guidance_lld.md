# Notification Ability → Existing Modal Guidance LLD

## 1. Purpose

Implement the deprecated **Notification Ability** replacement by reusing the existing **modal guidance** content model and modal UI behavior, while removing the old authored notification stack and its runtime plumbing.

This document is the implementation contract.

It is written against the current codebase and the uploaded project constraints:
- AI Context Pack — Canonical
- Prompt Contract — Canonical
- Testing Standards — Canonical

No code is included. Pseudocode is included only where necessary to remove ambiguity.

---

## 2. Why

## 2.1 Observed current state in code

### Notification Ability today is the old notification stack
Current Notification Ability authoring is defined in `src/data/schemas/abilities/notifications.ts` as:
- `trigger: "spawn" | "kill" | "cycle"`
- `presentation: NotificationPresentationSchema`

The compiler in `src/engine/compiler/abilities/notificationCompiler.ts` currently does two unrelated legacy behaviors:
- `spawn` / `kill` author `components.notifications`
- `cycle` appends `SHOW_CUSTOM_NOTIFICATION` to `sys_cycle_reset`

### The old notification runtime is not the modal-guidance path
The old custom-notification runtime path is `SHOW_CUSTOM_NOTIFICATION`.
Its handler in `src/engine/runtime/handlers/ShowCustomNotificationHandler.ts` is empty.

The old authored notification UI/runtime stack is the living-card path:
- authored global rules in `config.settings.notifications`
- authored per-blueprint rules in `components.notifications`
- evaluation in `src/ui/runtime/world/living-cards/**`
- display via `LivingCardPool`

This is a separate feature from the current runtime status HUD in `src/ui/runtime/notifications/**`.

### Modal guidance already exists
Existing guidance definitions already support modal content in `src/data/schemas/guidances.ts`:
- `presentation: "modal"`
- `title`
- `text`
- `imageUrl`

Existing tutorial modal display is in:
- `src/ui/runtime/tutorials/RuntimeTutorialModal.tsx`
- `src/ui/runtime/tutorials/TutorialDisplay.tsx`

### Tutorials are the wrong runtime owner for Notification Ability
Tutorials are managed every tick by:
- `src/game/systems/HardTutorialSystem.ts`
- `src/game/systems/resolveTutorialTickState.ts`
- `src/game/systems/hardTutorialSystemUtils.ts`

Tutorial completion writes permanent completion facts.

That system is correct for authored tutorials, but it is not the right authored/runtime owner for **Notification Ability**, because the new Notification Ability is:
- fixed to cycle completion
- repeatable
- not condition-authored
- not tutorial-authored

## 2.2 Design conclusion

The correct design is:

1. **Reuse the existing modal-guidance content contract**:
   - `title`
   - `text`
   - `imageUrl`
2. **Do not** add Notification Ability into authored `guidances / conditions / tutorials`
3. **Do not** keep the old authored notification stack
4. **Do** add a new runtime path dedicated to Notification Ability modal display
5. **Do** update the modal-guidance UI so **all modal guidances** have a `CONTINUE` button

This uses existing mechanisms where they already fit and avoids coupling Notification Ability to the tutorial state machine.

---

## 3. Scope

## 3.1 In scope

### Notification Ability authoring
Notification Ability remains an array ability under `_editor.abilities.notifications`, but each entry now authors only modal-guidance content:
- `id`
- `title`
- `text`
- `imageUrl`

### Trigger semantics
Notification Ability trigger is **fixed** to cycle completion.
It is not stored in authored data.
It is not editable in the UI.

### Modal behavior
Every Notification Ability item displays as a modal that:
- pauses the game
- hides time controls
- uses the existing `imageUrl` field
- requires `CONTINUE`

### Existing modal guidance behavior
Every existing modal guidance rendered through the tutorial modal path must also display `CONTINUE`.
Clicking `CONTINUE` must end that modal guidance by completing the active tutorial through the existing tutorial completion pipeline.

### Legacy authored notifications removal
The following legacy authored-notification surfaces are removed:
- `config.settings.notifications`
- `components.notifications`
- `SHOW_CUSTOM_NOTIFICATION`
- living-card evaluation and living-card UI
- the Notifications config editor and all related routing

## 3.2 Explicitly out of scope

The following are not changed by this work:
- `src/ui/runtime/notifications/**`
- `runtimeNotificationStore`
- ongoing runtime HUD notifications such as purge/hungry/cold
- runtime event notifications such as body-added/body-died

These are a separate system from the deprecated authored notification stack.

## 3.3 Breaking-change statement

This change is intentionally breaking for deprecated authored-notification data.

After this change:
- `.cave` fragments may no longer contain `notifications`
- blueprints may no longer contain `components.notifications`
- behavior actions may no longer contain `SHOW_CUSTOM_NOTIFICATION`

No compatibility layer and no migration shim are added.

---

## 4. What is being implemented

## 4.1 Notification Ability authored data contract

Each Notification Ability item is:

- `id: string`
- `title: string`
- `text: string`
- `imageUrl: string | null`

### Field rules
- `imageUrl` remains the field name.
- No new `url` field is introduced.
- `title` remains optional-at-use and stored as a string; empty string is valid.
- `text` is required.
- `imageUrl` defaults to `null`.

### Fixed semantics
The following are **not** authored and are **not** user-editable:
- trigger
- presentation
- attention
- severity
- icon
- toast type

Notification Ability always means:
- trigger: cycle completion
- presentation: modal
- attention: `stop_time` + `hide_time_controls`

## 4.2 Notification Ability runtime contract

When a cycle-complete ability action executes, the runtime must enqueue a Notification Ability modal item into world-owned runtime state.

Each queued item contains:
- `abilityId: string`
- `title: string`
- `text: string`
- `imageUrl: string | null`

World runtime state for this feature must be:
- deterministic
- queue-based
- owned by ECS world state
- mutated only by command handlers during apply

## 4.3 Tutorial modal `CONTINUE` contract

For tutorial-driven modal guidances:
- the existing visible modal remains the first modal returned by `resolveRuntimeGuidances(...)`
- clicking `CONTINUE` must enqueue a tutorial modal-acknowledgement command
- the handler must mark the active tutorial state as having acknowledged that modal binding
- `HardTutorialSystem` must interpret that acknowledgement as tutorial completion on the next tick
- tutorial completion must continue to flow through the existing completion logic, including permanent fact writing

This preserves the existing tutorial ownership and completion pipeline.

---

## 5. Key design decisions

## 5.1 Notification Ability does **not** become authored guidance data

Reason:
- `config.settings.guidances` is currently consumed by tutorial binding/runtime
- `HardTutorialSystem` owns tutorial state every tick
- tutorial authored data carries completion semantics that do not match Notification Ability

Decision:
- Notification Ability stores inline modal content
- Notification Ability does not create or require entries in `config.settings.guidances`
- Notification Ability does not author `conditions`
- Notification Ability does not author `tutorials`

## 5.2 Existing modal content fields are reused, not duplicated semantically

Reason:
- the modal content contract already exists in `guidances.ts`
- the user explicitly wants to reuse the modal guidance editor content

Decision:
- the editor reuses the same field names and UI controls:
  - Title
  - Text
  - Image URL
- a shared editor field component is extracted and reused by:
  - `GuidanceForm`
  - `NotificationAbilityForm`

## 5.3 Notification Ability runtime state is queue-based

Reason:
- multiple cycle-complete actions can be emitted in the same deterministic command batch
- overwriting the currently active item would lose authored notifications non-deterministically
- simultaneous modal rendering is forbidden

Decision:
- the runtime component stores:
  - `active`
  - `current`
  - `queue`
  - fixed `attention`
- display order is FIFO by enqueue order

## 5.4 Modal rendering is unified at the UI layer

Reason:
- both tutorial modal guidance and Notification Ability modal guidance now require the same visible affordance:
  - title
  - text
  - image
  - `CONTINUE`
- duplicate modal components would drift

Decision:
- the runtime UI uses a shared modal-guidance display component
- the runtime UI uses a single modal-guidance overlay resolver for:
  - tutorial modal guidance
  - Notification Ability modal guidance

## 5.5 Display precedence is fixed

Precedence must be deterministic and match the existing overlay ownership model.

Visible modal precedence is:
1. Habiti gain modal
2. Tutorial modal guidance
3. Notification Ability modal guidance

Rationale:
- Habiti already has explicit overlay precedence in both UI ordering and `useActiveRuntimeAttention`
- tutorials are authored instructional state
- Notification Ability is reactive cycle-complete state and must not displace a tutorial

This precedence applies to:
- visible modal selection
- attention selection

## 5.6 Purge narrative loses old notification output

Observed:
- `src/game/systems/cave/purgeNarrative.ts` currently emits `SHOW_CUSTOM_NOTIFICATION`

Decision:
- remove the old notification emission
- keep the milestone state write
- do not introduce a replacement modal or replacement HUD event

Reason:
- replacing purge narrative UX is not part of this task
- the old notification mechanism is explicitly being removed

---

## 6. How it works

## 6.1 Authoring path

1. Designer adds Notification Ability in Blueprint Designer.
2. A Notification Ability item contains only:
   - Title
   - Text
   - Image URL
3. The form does not show:
   - trigger selector
   - presentation selector
   - attention controls
   - severity
   - icon
4. The underlying ability remains an array ability under `_editor.abilities.notifications`.

## 6.2 Compile path

For each Notification Ability entry:
1. `notificationCompiler` locates `sys_cycle_reset`
2. If absent:
   - emit `console.warn(...)`
   - emit nothing for that blueprint
3. If present:
   - append one behavior action per Notification Ability entry
   - action type is the new Notification Ability modal-guidance action
   - action payload contains:
     - `abilityId`
     - `title`
     - `text`
     - `imageUrl`

No other compiler output is produced.

Specifically:
- no `components.notifications`
- no spawn/kill handling
- no global `config.settings.notifications` interaction

## 6.3 Runtime apply path

### Show path
When the new action executes:
1. the action executor enqueues a new runtime command carrying the modal content
2. the show handler mutates `sys_world.notificationAbilityGuidance`
3. behavior:
   - if inactive and empty: set `current`, set `active=true`
   - if already active: append to `queue`

### Acknowledge path
When the user clicks `CONTINUE` on a Notification Ability modal:
1. UI enqueues the acknowledge command
2. if runtime is paused, UI flushes commands immediately
3. the acknowledge handler mutates `sys_world.notificationAbilityGuidance`
4. behavior:
   - if queue is non-empty: shift next item into `current`
   - if queue is empty: clear `current`, set `active=false`

## 6.4 Tutorial modal acknowledgement path

When the user clicks `CONTINUE` on a tutorial modal:
1. UI resolves the currently visible tutorial modal binding
2. UI enqueues tutorial-modal acknowledgement with that `bindingId`
3. if runtime is paused, UI flushes commands immediately
4. the handler sets `world.tutorial.acknowledgedModalBindingId = bindingId`
5. on the next tick, `HardTutorialSystem` sees the acknowledgement and completes the active tutorial
6. the existing tutorial completion path writes permanent completion fact(s)

The handler does **not** directly clear tutorial state.
Tutorial completion remains owned by `HardTutorialSystem`.

## 6.5 Attention path

`useActiveRuntimeAttention` must resolve in fixed priority order:
1. `world.habitiAnnouncement.attention` when active
2. `world.tutorial.attention` when active
3. `world.notificationAbilityGuidance.attention` when active
4. `null` otherwise

Notification Ability attention is fixed to:
- `pauseGame = true`
- `hideTimeControls = true`
- `hideNotifications = false`
- all focus/ring/camera arrays empty
- `blockNonFocusedInteraction = false`

## 6.6 Runtime modal selection path

The single runtime modal-guidance overlay resolves the visible source in this order:
1. first active tutorial modal guidance returned by `resolveRuntimeGuidances(...)`
2. current Notification Ability modal guidance item
3. no overlay

Habiti remains a separate modal component and continues to render above this overlay because it is mounted later in `RuntimeShellCanvas`.

---

## 7. File-by-file implementation contract

## 7.1 Added files

### `src/data/schemas/components/notificationAbilityGuidance.ts`
**Responsibility**
- Define world-owned runtime state for Notification Ability modal guidance.

**Logic**
- Define item schema with:
  - `abilityId`
  - `title`
  - `text`
  - `imageUrl`
- Define component schema with:
  - `_tag`
  - `active`
  - `current`
  - `queue`
  - `attention`
- Export default component constant with fixed attention:
  - pause game
  - hide time controls
  - do not hide notifications

**Interface**
- Exports:
  - `NotificationAbilityGuidanceItemSchema`
  - `NotificationAbilityGuidanceComponentSchema`
  - `DEFAULT_NOTIFICATION_ABILITY_GUIDANCE_COMPONENT`
  - `NotificationAbilityGuidanceItem`
  - `NotificationAbilityGuidanceComponent`

---

### `src/data/schemas/behaviorNotificationAbilityGuidance.ts`
**Responsibility**
- Define the behavior action schema for the compiled Notification Ability modal-guidance action.

**Logic**
- Action type is a new literal distinct from `SHOW_CUSTOM_NOTIFICATION`.
- Payload includes only:
  - `abilityId`
  - `title`
  - `text`
  - `imageUrl`

**Interface**
- Exports:
  - `ShowNotificationAbilityGuidanceActionSchema`
  - `ShowNotificationAbilityGuidanceAction`

---

### `src/engine/runtime/types/runtimeCommandPayloadsNotificationAbilityGuidance.ts`
**Responsibility**
- Define runtime command payloads for Notification Ability modal-guidance show/acknowledge commands.

**Logic**
- Show payload mirrors compiled action payload.
- Acknowledge payload is empty.

**Interface**
- Exports:
  - `ShowNotificationAbilityGuidanceCommandPayload`
  - `AcknowledgeNotificationAbilityGuidanceCommandPayload`

---

### `src/engine/runtime/types/runtimeCommandNotificationAbilityGuidance.ts`
**Responsibility**
- Define runtime command types for Notification Ability modal-guidance commands.

**Logic**
- Provide command aliases for:
  - show
  - acknowledge

**Interface**
- Exports:
  - `ShowNotificationAbilityGuidanceCommand`
  - `AcknowledgeNotificationAbilityGuidanceCommand`

---

### `src/engine/runtime/systems/behavior/actionExecutorShowNotificationAbilityGuidance.ts`
**Responsibility**
- Convert the compiled behavior action into the runtime command.

**Logic**
- Enqueue the new show command.
- Do not resolve physics position.
- Do not emit old notification presentation payloads.

**Interface**
- Exports:
  - `executeShowNotificationAbilityGuidanceAction(action, context, commands): void`

---

### `src/game/notificationAbility/notificationAbilityGuidanceUtils.ts`
**Responsibility**
- Own all world-state mutation logic for Notification Ability modal-guidance queue management.

**Logic**
- `get...Component(world)` returns a normalized component using defaults
- `enqueue...(...)` appends or activates current item
- `acknowledge...(...)` advances queue or clears state
- `clear...(...)` resets to inactive/empty
- All operations are deterministic and side-effect-free outside the passed world object

**Interface**
- Exports:
  - `getNotificationAbilityGuidanceComponent(world)`
  - `enqueueNotificationAbilityGuidance(world, item)`
  - `acknowledgeNotificationAbilityGuidance(world)`
  - `clearNotificationAbilityGuidance(world)`

---

### `src/game/handlers/ShowNotificationAbilityGuidanceHandler.ts`
**Responsibility**
- Apply-phase handler for the show command.

**Logic**
- Find `sys_world`
- No-op if missing
- Call `enqueueNotificationAbilityGuidance(...)`

**Interface**
- Exports class:
  - `ShowNotificationAbilityGuidanceHandler`

---

### `src/game/handlers/AcknowledgeNotificationAbilityGuidanceHandler.ts`
**Responsibility**
- Apply-phase handler for the acknowledge command.

**Logic**
- Find `sys_world`
- No-op if missing
- Call `acknowledgeNotificationAbilityGuidance(...)`

**Interface**
- Exports class:
  - `AcknowledgeNotificationAbilityGuidanceHandler`

---

### `src/game/handlers/AcknowledgeTutorialModalGuidanceHandler.ts`
**Responsibility**
- Apply-phase handler for tutorial modal `CONTINUE`.

**Logic**
- Find `sys_world`
- Read active tutorial component
- No-op unless:
  - tutorial is active
  - payload `bindingId` exists in active bindings
  - the matching binding resolves to a modal guidance at runtime completion time
- Set `acknowledgedModalBindingId` on the active tutorial component

**Interface**
- Exports class:
  - `AcknowledgeTutorialModalGuidanceHandler`

---

### `src/ui/devtools/editors/config/guidances/ModalGuidanceContentFields.tsx`
**Responsibility**
- Render the shared modal-guidance content fields used by both authored guidances and Notification Ability.

**Logic**
- Render exactly:
  - Title
  - Text
  - Image URL
- Use existing `StringField` controls and existing guidance string schema
- Contain no business logic

**Interface**
- Props:
  - `filename: string`
  - `basePath: string`

---

### `src/ui/runtime/modal-guidance/ModalGuidanceDisplay.tsx`
**Responsibility**
- Shared presentational component for modal-guidance body rendering.

**Logic**
- Render:
  - image when `imageUrl` is non-null/non-empty
  - rich text body
  - `CONTINUE` button
- No runtime-store access
- No command emission

**Interface**
- Props:
  - `title: string`
  - `text: string`
  - `imageUrl: string | null`
  - `onContinue: () => void`

---

### `src/ui/runtime/modal-guidance/useActiveRuntimeModalGuidance.ts`
**Responsibility**
- Resolve the currently visible modal-guidance source and provide the correct `continue` callback.

**Logic**
- Resolve visible source in fixed order:
  1. tutorial modal guidance
  2. Notification Ability modal guidance
  3. none
- Tutorial `continue` enqueues tutorial acknowledgement and flushes when runtime is paused
- Notification Ability `continue` enqueues ability acknowledgement and flushes when runtime is paused

**Interface**
- Exports:
  - `useActiveRuntimeModalGuidance(): null | { kind: "tutorial" | "notification_ability"; title: string; text: string; imageUrl: string | null; continue: () => void }`

---

### `src/ui/runtime/modal-guidance/RuntimeModalGuidanceOverlay.tsx`
**Responsibility**
- Render the visible modal-guidance overlay using the shared resolver and shared display component.

**Logic**
- Read `useActiveRuntimeModalGuidance()`
- Render one modal or none
- Backdrop/escape do not dismiss
- Only `CONTINUE` dismisses

**Interface**
- Exports component:
  - `RuntimeModalGuidanceOverlay`

---

## 7.2 Changed files

### `src/data/schemas/guidances.ts`
**Responsibility after change**
- Continue to own authored guidance definitions.

**Logic after change**
- Export the modal content field contract so Notification Ability can reuse it without inventing new field names.
- Do not change modal guidance authored fields.
- Do not add a `url` field.

**Interface after change**
- Continue exporting:
  - `GuidanceDefinitionSchema`
  - `GuidancesSchema`
  - `GuidanceDefinition`
  - `GuidanceAttentionMechanism`
- Additionally export a modal-content schema/type shared by Notification Ability authoring.

---

### `src/data/schemas/abilities/notifications.ts`
**Responsibility after change**
- Define Notification Ability authoring as inline modal-guidance content only.

**Logic after change**
- Remove:
  - trigger
  - notification presentation object
- Keep array shape.
- Each item contains:
  - `id`
  - `title`
  - `text`
  - `imageUrl`

**Interface after change**
- Continue exporting:
  - `NotificationAbilitySchema`
  - `NotificationAbilityConfig`
- Item contract changes to the new inline modal content shape.

---

### `src/data/schemas/abilities/index.ts`
**Responsibility after change**
- Continue to register Notification Ability in `_editor.abilities`.

**Logic after change**
- No semantic change beyond the updated Notification Ability item contract.

**Interface after change**
- `EditorAbilities["notifications"]` now points to the new inline modal content array.

---

### `src/data/schemas/behaviorTypes.ts`
**Responsibility after change**
- Keep the authoritative TypeScript union for behavior actions.

**Logic after change**
- Remove `ShowCustomNotificationAction`
- Add `ShowNotificationAbilityGuidanceAction`

**Interface after change**
- `BehaviorAction` union includes the new action and excludes the old one.

---

### `src/data/schemas/behavior.ts`
**Responsibility after change**
- Keep the authoritative zod schema for behavior actions.

**Logic after change**
- Replace the old custom-notification action schema in the action union with the new Notification Ability modal-guidance action schema.

**Interface after change**
- `BehaviorActionSchema` validates the new action and rejects `SHOW_CUSTOM_NOTIFICATION`.

---

### `src/data/schemas/components.ts`
**Responsibility after change**
- Export all component schemas and types used by runtime entities.

**Logic after change**
- Remove exports for `NotificationsComponentSchema` and `NotificationsComponent`
- Add exports for `NotificationAbilityGuidanceComponentSchema` and `NotificationAbilityGuidanceComponent`

**Interface after change**
- The public component export surface changes accordingly.

---

### `src/data/schemas/components/tutorial.ts`
**Responsibility after change**
- Continue to define runtime tutorial component state.

**Logic after change**
- Add `acknowledgedModalBindingId: string | null`
- Default is `null`

**Interface after change**
- `TutorialComponent` now includes `acknowledgedModalBindingId`

---

### `src/data/schemas/blueprint.ts`
**Responsibility after change**
- Continue to define authored blueprint structure.

**Logic after change**
- Remove `components.notifications`
- Do not add any replacement blueprint component for authored notifications

**Interface after change**
- Blueprints with `components.notifications` are invalid

---

### `src/data/schemas/blueprintConfig.ts`
**Responsibility after change**
- Continue to define authored system config.

**Logic after change**
- Remove `settings.notifications`

**Interface after change**
- `.cave` config no longer accepts `notifications`

---

### `src/data/schemas/v2/config.ts`
**Responsibility after change**
- Continue to define the system-config parser schema used by linker/runtime.

**Logic after change**
- Remove `notifications`

**Interface after change**
- parsed system config has no `notifications` key

---

### `src/engine/linker/semanticParser.ts`
**Responsibility after change**
- Continue to parse semantic fragments.

**Logic after change**
- Remove `.cave.notifications` acceptance
- No other `.cave` keys change

**Interface after change**
- `.cave` fragments containing `notifications` fail validation

---

### `src/engine/terminal/commands/projectCartridgeAdapter.ts`
**Responsibility after change**
- Continue adapting runtime cartridges into module cartridges.

**Logic after change**
- Stop copying `cartridge.config.notifications` into `config.settings.notifications`

**Interface after change**
- adapted module cartridges contain no `config.settings.notifications`

---

### `src/engine/compiler/abilities/notificationCompiler.ts`
**Responsibility after change**
- Compile Notification Ability into cycle-complete modal-guidance behavior actions only.

**Logic after change**
- Remove spawn/kill compilation entirely
- Stop writing `components.notifications`
- Append one new action per ability item to `sys_cycle_reset`
- If `sys_cycle_reset` is missing:
  - warn
  - do not mutate blueprint for that ability

**Interface after change**
- Function name and call site remain unchanged
- Output semantics are fully replaced

---

### `src/engine/runtime/types/runtimeCommandTypes.ts`
**Responsibility after change**
- Continue defining runtime command identifiers.

**Logic after change**
- Remove `SHOW_CUSTOM_NOTIFICATION`
- Add:
  - `SHOW_NOTIFICATION_ABILITY_GUIDANCE`
  - `ACKNOWLEDGE_NOTIFICATION_ABILITY_GUIDANCE`
  - `ACKNOWLEDGE_TUTORIAL_MODAL_GUIDANCE`

**Interface after change**
- Command enum values change accordingly

---

### `src/engine/runtime/types/runtimeCommandPayloadsTutorial.ts`
**Responsibility after change**
- Continue to define tutorial-related runtime payloads.

**Logic after change**
- Add tutorial modal acknowledgement payload:
  - `bindingId: string`

**Interface after change**
- Export `AcknowledgeTutorialModalGuidanceCommandPayload`

---

### `src/engine/runtime/types/runtimeCommandTutorial.ts`
**Responsibility after change**
- Continue to define tutorial-related runtime command aliases.

**Logic after change**
- Add tutorial modal acknowledgement command type alias

**Interface after change**
- Export `AcknowledgeTutorialModalGuidanceCommand`

---

### `src/engine/runtime/types/runtimeCommandPayloads.ts`
**Responsibility after change**
- Continue as the central payload export barrel.

**Logic after change**
- Export Notification Ability modal-guidance payloads
- Export tutorial modal-acknowledgement payload

**Interface after change**
- Public exports updated accordingly

---

### `src/engine/runtime/types/runtimeCommandUnion.ts`
**Responsibility after change**
- Continue as the authoritative runtime command union.

**Logic after change**
- Remove `ShowCustomNotificationCommand`
- Add:
  - `ShowNotificationAbilityGuidanceCommand`
  - `AcknowledgeNotificationAbilityGuidanceCommand`
  - `AcknowledgeTutorialModalGuidanceCommand`

**Interface after change**
- `RuntimeCommand` union changes accordingly

---

### `src/engine/runtime/types.ts`
**Responsibility after change**
- Continue as the public runtime types barrel.

**Logic after change**
- Export the new Notification Ability modal-guidance command/payload types
- Export tutorial modal acknowledgement command/payload types
- Stop exporting old custom-notification command types

**Interface after change**
- Public runtime types updated accordingly

---

### `src/engine/runtime/systems/behavior/ActionExecutor.ts`
**Responsibility after change**
- Continue dispatching behavior actions to the correct executor helper.

**Logic after change**
- Remove `SHOW_CUSTOM_NOTIFICATION` switch branch
- Add new Notification Ability modal-guidance action branch

**Interface after change**
- `execute(...)` accepts the new action through the updated union

---

### `src/game/registerGameCommandHandlers.ts`
**Responsibility after change**
- Continue registering all game-owned command handlers.

**Logic after change**
- Register:
  - `ShowNotificationAbilityGuidanceHandler`
  - `AcknowledgeNotificationAbilityGuidanceHandler`
  - `AcknowledgeTutorialModalGuidanceHandler`
- Remove registration of `ShowCustomNotificationHandler`

**Interface after change**
- registration surface updated accordingly

---

### `src/game/systems/hardTutorialSystemUtils.ts`
**Responsibility after change**
- Continue deciding whether the active tutorial completes or continues.

**Logic after change**
- Before exit-condition evaluation, check whether:
  - `acknowledgedModalBindingId` is non-null
  - the active bindings contain that binding
  - the matching guidance is `presentation === "modal"`
- If yes:
  - return tutorial completion
- Otherwise preserve existing exit-condition behavior unchanged

**Interface after change**
- No exported function signatures change

---

### `src/game/tutorials/tutorialStateUtils.ts`
**Responsibility after change**
- Continue normalizing runtime tutorial component reads/writes.

**Logic after change**
- Preserve `acknowledgedModalBindingId` in normalized reads
- Reset it in cleared/default state

**Interface after change**
- Existing exports unchanged

---

### `src/game/systems/cave/purgeNarrative.ts`
**Responsibility after change**
- Continue marking purge milestones as triggered.

**Logic after change**
- Remove `SHOW_CUSTOM_NOTIFICATION` emission
- Keep milestone flag write

**Interface after change**
- `evaluateNarrative(...)` still emits zero or one `UPDATE_STATE` command
- It emits no notification commands

---

### `src/engine/runtime/runtimePauseState.ts`
**Responsibility after change**
- Continue reporting whether a blocking overlay is active.

**Logic after change**
- Include `world.notificationAbilityGuidance.active`

**Interface after change**
- Public functions unchanged

---

### `src/ui/runtime/attention/useActiveRuntimeAttention.ts`
**Responsibility after change**
- Continue resolving the attention plan currently controlling runtime UI.

**Logic after change**
- Extend priority order to:
  1. habiti announcement
  2. tutorial
  3. Notification Ability modal guidance
- Do not change return shape

**Interface after change**
- Hook signature unchanged

---

### `src/ui/runtime/shell/RuntimeShellCanvas.tsx`
**Responsibility after change**
- Continue mounting runtime overlays.

**Logic after change**
- Replace `RuntimeTutorialModal` with `RuntimeModalGuidanceOverlay`
- Remove `LivingCardPool`
- Keep `RuntimeHabitiGainModal`
- Keep `RuntimeNotificationViewport`

**Interface after change**
- Props unchanged

---

### `src/ui/runtime/debug/readPhaserDebugGlobals.ts`
**Responsibility after change**
- Continue providing global debug counters.

**Logic after change**
- Remove CardEventBridge dependency
- Remove living-card queue metric

**Interface after change**
- `PhaserDebugGlobals` no longer contains `cardQueueSize`

---

### `src/ui/runtime/debug/buildPhaserDebugHudView.ts`
**Responsibility after change**
- Continue building HUD facts from debug globals.

**Logic after change**
- Remove the `"cards"` fact row

**Interface after change**
- Function signature unchanged

---

### `src/ui/devtools/editors/config/guidances/GuidanceForm.tsx`
**Responsibility after change**
- Continue rendering full authored guidance editing UI.

**Logic after change**
- For modal presentation, use `ModalGuidanceContentFields`
- Presentation selection and attention UI remain unchanged for authored guidances

**Interface after change**
- Props unchanged

---

### `src/ui/devtools/editors/blueprint/mode/forms/NotificationAbilityForm.tsx`
**Responsibility after change**
- Render Notification Ability authoring UI for inline modal-guidance content.

**Logic after change**
- Reuse `ModalGuidanceContentFields`
- Remove:
  - Trigger field
  - Type field
  - Severity field
  - Icon field
- Do not render presentation or attention UI

**Interface after change**
- Props unchanged:
  - `basePath: string`

---

### `src/ui/devtools/editors/blueprint/mode/NotificationAbilitySection.tsx`
**Responsibility after change**
- Continue rendering Notification Ability rows in the designer.

**Logic after change**
- Stop using trigger in title/summary
- Title must remain Notification Ability
- Summary should use the first non-empty of:
  - title
  - text
  - fallback `"Empty"`

**Interface after change**
- Props unchanged

---

### `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`
**Responsibility after change**
- Continue supplying default ability draft items.

**Logic after change**
- Notification Ability draft defaults to:
  - empty or placeholder title
  - non-empty placeholder text
  - `imageUrl = null`

**Interface after change**
- `createNotificationAbilityDraft()` returns the new shape

---

### `src/ui/devtools/editors/blueprint/mode/abilityListUtils.ts`
**Responsibility after change**
- Continue building stable keys and labels for ability rows.

**Logic after change**
- `buildNotificationKey(...)` must stop referencing removed `trigger`
- Use `entry.id` as the stable key input

**Interface after change**
- Existing exports unchanged

---

### `src/ui/devtools/editors/draft/options/actionText.ts`
**Responsibility after change**
- Continue formatting behavior actions into human-readable strings.

**Logic after change**
- Remove `SHOW_CUSTOM_NOTIFICATION`
- Add the new Notification Ability modal-guidance action
- Format preview as:
  - title when non-empty
  - otherwise text

**Interface after change**
- Function signature unchanged

---

### `src/ui/devtools/editors/file/SystemConfigEditor.tsx`
**Responsibility after change**
- Continue rendering the system-config dashboard.

**Logic after change**
- Remove the Notifications card

**Interface after change**
- Props unchanged

---

### `src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx`
**Responsibility after change**
- Continue resolving system-config editor routes.

**Logic after change**
- Remove notifications route resolution

**Interface after change**
- Notifications route kind is no longer supported

---

### `src/ui/devtools/shell/window-manager/tabIdToVirtualPath.ts`
### `src/ui/devtools/shell/window-manager/virtualPath.types.ts`
### `src/ui/devtools/shell/window-manager/virtualPath.parseRouted.ts`
### `src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.config.ts`
### `src/ui/devtools/shell/window-manager/hooks/openConfigRouteTab.ts`
### `src/ui/devtools/shell/window-manager/virtualPath.serialize.ts`
### `src/ui/devtools/shell/window-manager/tabIds.ts`
### `src/ui/devtools/shell/window-manager/virtualPath.constants.ts`
**Responsibility after change**
- Continue owning devtools virtual-path routing.

**Logic after change**
- Remove all notifications route kinds, serializers, parsers, route handlers, and tab ids

**Interface after change**
- `"notifications"` is no longer a valid config route kind

---

### `src/ui/runtime/state/runtimeFactory.ts`
**Responsibility after change**
- Continue wiring runtime-side observers after command application.

**Logic after change**
- Remove `evaluateNotifications(...)`
- Keep:
  - cinematic observer
  - runtime notification event observer
  - habiti runtime events
  - runtime visual effects

**Interface after change**
- Public function signatures unchanged

---

## 7.3 Files/directories removed

### Entire legacy authored-notification editor
Delete:
- `src/ui/devtools/editors/config/notifications/**`

Reason:
- old global notification authoring is removed completely

---

### Entire living-card notification runtime
Delete:
- `src/ui/runtime/world/living-cards/**`

Reason:
- this directory is the old authored-notification display/evaluation stack
- no remaining runtime path uses it after this change

---

### Obsolete authored-notification schemas/runtime files
Delete:
- `src/data/schemas/notifications.ts`
- `src/data/schemas/components/notifications.ts`
- `src/data/schemas/behaviorNotification.ts`
- `src/engine/runtime/handlers/ShowCustomNotificationHandler.ts`
- `src/engine/runtime/types/runtimeCommandNotification.ts`
- `src/engine/runtime/systems/behavior/actionExecutorShowNotification.ts`

Reason:
- these files only exist for the removed notification feature

---

### Tutorial-only modal files superseded by unified modal-guidance overlay
Delete:
- `src/ui/runtime/tutorials/TutorialDisplay.tsx`
- `src/ui/runtime/tutorials/RuntimeTutorialModal.tsx`

Reason:
- shared modal-guidance overlay replaces tutorial-only modal rendering

---

## 8. Pseudocode for the only new stateful logic

## 8.1 Notification Ability queue logic

```text
enqueue(item):
    state = normalized world.notificationAbilityGuidance
    if state.active is false or state.current is null:
        state.active = true
        state.current = item
        state.queue = []
        write state
        return

    state.queue.push(item)
    write state
```

```text
acknowledge():
    state = normalized world.notificationAbilityGuidance
    if state.active is false or state.current is null:
        return

    if state.queue.length > 0:
        state.current = state.queue.shift()
        state.active = true
        write state
        return

    state.active = false
    state.current = null
    state.queue = []
    write state
```

## 8.2 Tutorial modal acknowledgement logic

```text
acknowledgeTutorialModal(bindingId):
    tutorial = normalized world.tutorial
    if tutorial.active is false:
        return
    if bindingId is not present in tutorial.bindings:
        return

    tutorial.acknowledgedModalBindingId = bindingId
    write tutorial
```

```text
resolveActiveTutorialOutcome(...):
    if active.acknowledgedModalBindingId matches an active binding
       and that binding resolves to a modal guidance:
        return complete

    existing exit-condition logic
```

---

## 9. Test contract

All tests must follow the uploaded Testing Standards exactly:
- logic in unit tests
- runtime interaction in integration tests
- UI rendering/wiring in view tests
- Given / When / Then structure
- factories instead of setup noise

## 9.1 New unit tests

### `src/game/notificationAbility/notificationAbilityGuidanceUtils.test.ts`
Must cover:
- enqueue into inactive component creates `current` and sets `active=true`
- enqueue into active component appends FIFO queue
- acknowledge advances to next queued item
- acknowledge on last item clears state
- acknowledge on inactive state is a no-op

### `src/engine/runtime/systems/behavior/actionExecutorShowNotificationAbilityGuidance.test.ts`
Must cover:
- new behavior action enqueues the new runtime command
- payload fields are copied exactly
- executor does not add position data

## 9.2 Changed unit tests

### `src/engine/compiler/abilities/notificationCompiler.test.ts`
Must be rewritten to cover:
- empty config leaves blueprint unchanged
- cycle-only compilation appends one action per ability entry
- authored order is preserved
- compiler never writes `components.notifications`
- missing `sys_cycle_reset` warns and emits nothing

### `src/game/systems/HardTutorialSystem.test.ts` or adjacent HardTutorialSystem test file
Must add cases for:
- acknowledged modal binding completes active tutorial
- acknowledgement for non-modal binding does not complete tutorial
- existing exit-condition completion still works unchanged

### `src/game/systems/cave/purgeNarrative.test.ts`
Must change assertions to:
- verify milestone flag write remains
- verify no notification command is emitted

## 9.3 New/changed integration tests

### `src/game/handlers/AcknowledgeTutorialModalGuidanceHandler.test.ts`
Must cover:
- valid binding acknowledgement sets `acknowledgedModalBindingId`
- missing world is a no-op
- inactive tutorial is a no-op
- unknown binding id is a no-op

### `src/game/handlers/AcknowledgeNotificationAbilityGuidanceHandler.test.ts`
Must cover:
- current item advances correctly
- empty/inactive state is a no-op

### `src/game/handlers/ShowNotificationAbilityGuidanceHandler.test.ts`
Must cover:
- first item activates current
- later item queues behind active current

## 9.4 New/changed view tests

### `src/ui/devtools/editors/blueprint/mode/forms/NotificationAbilityForm.smoke.test.tsx`
Must be updated to seed the new Notification Ability data shape and verify stable render.

### `src/ui/devtools/editors/config/guidances/GuidancesEditor.test.tsx`
Must continue to prove:
- modal guidance still renders Title/Text/Image URL fields
- authored modal guidance still uses the normal guidance editor path

### `src/ui/runtime/modal-guidance/RuntimeModalGuidanceOverlay.test.tsx`
Must cover:
- tutorial modal guidance renders with `CONTINUE`
- Notification Ability modal guidance renders with `CONTINUE`
- tutorial source wins over Notification Ability source when both are active
- image renders when `imageUrl` is present
- `CONTINUE` invokes the correct command path

### `src/ui/runtime/status/RuntimeClock.attention.cases.tsx`
Must add a case proving Notification Ability attention hides the runtime clock.

### `src/ui/runtime/tutorials/useTutorialAttentionPlayback.test.tsx`
Must add a case proving Notification Ability attention also pauses/resumes playback through the shared attention hook.

### `src/ui/devtools/editors/file/SystemConfigEditor.test.tsx`
Must remove Notifications-card assertions.

### Runtime shell tests
Update:
- `src/ui/runtime/shell/RuntimeShell.test.tsx`
- `src/ui/runtime/shell/RuntimeShellCanvas.nodeOverlays.test.tsx`
- `src/ui/runtime/shell/RuntimeShellCanvas.notifications.test.tsx`

Required changes:
- remove `LivingCardPool` mocks
- assert runtime HUD still renders as before
- assert unified modal-guidance overlay is mounted instead of tutorial-only modal when relevant

## 9.5 Tests deleted with removed feature

Delete the tests that only validate the removed authored-notification feature, including:
- all tests under `src/ui/devtools/editors/config/notifications/**`
- all tests under `src/ui/runtime/world/living-cards/**`
- `src/ui/devtools/state/moduleStore.io.notifications.test.ts`
- legacy `SHOW_CUSTOM_NOTIFICATION` executor/handler tests
- any semantic-parser or adapter assertions that require `.cave.notifications`

Replacement assertions must live adjacent to the new files or updated feature entry points.

---

## 10. Acceptance criteria

The implementation is complete only when all of the following are true:

1. Notification Ability authoring shows only:
   - Title
   - Text
   - Image URL
2. Notification Ability compiles only to cycle-complete modal-guidance behavior
3. `SHOW_CUSTOM_NOTIFICATION`, `components.notifications`, and `config.settings.notifications` are removed
4. The living-card stack is removed from runtime and devtools
5. Tutorial modal guidance shows `CONTINUE`
6. Notification Ability modal guidance shows `CONTINUE`
7. Clicking `CONTINUE` on tutorial modal guidance completes the active tutorial through the existing tutorial completion pipeline
8. Clicking `CONTINUE` on Notification Ability modal guidance dequeues/clears the active item through command handlers
9. Runtime pause/time-control hiding works through the shared attention path
10. Runtime status HUD notifications remain intact
11. All tests described above are green
12. No out-of-scope refactors are introduced
13. No old-notification detritus remains reachable by authored schema, compiler, runtime, devtools routing, or debug HUD

---

## 11. Implementation order

1. Remove old authored-notification schema surfaces
2. Replace Notification Ability authored data contract
3. Add new behavior action and runtime command types
4. Add world runtime component + queue utils + handlers
5. Update compiler to emit the new action
6. Add tutorial modal acknowledgement path
7. Add shared modal editor fields
8. Add shared runtime modal-guidance overlay
9. Remove living-card runtime path and debug metrics
10. Remove devtools notifications editor and routes
11. Update purge narrative
12. Update and add tests
13. Run full test suite

This order minimizes broken intermediate states and keeps the command pipeline authoritative throughout.
