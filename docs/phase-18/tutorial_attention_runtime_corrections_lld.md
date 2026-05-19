# Tutorial Attention Runtime Corrections and Non-Tutorial Attention Removal — Delta LLD

## Status

This document replaces the prior delta LLD for tutorial attention runtime fixes.

It incorporates the additional confirmed requirements:

1. `hide_time_controls` and `hide_notifications` must show and hide with animation.
2. The retired `Show Attention Until Connected` editor path must be deleted.
3. Non-tutorial attention is not allowed. Tutorials are the only allowed source of attention rendering.

This is a **delta LLD** against the current repository snapshot. It defines only the changes required to satisfy the current contract. It does not reopen tutorial authoring semantics, hard-tutorial activation semantics, or unrelated editor/runtime refactors.

---

## 1. Problem statement

The current repository has four distinct defects and one retired feature path:

1. active tutorial attention is observed stale in React because the current hook memoizes on runtime identity instead of live tutorial state
2. `hide_notifications` suppresses only ongoing notifications, not the full notifications viewport
3. `hide_time_controls` is wired in the clock view but does not update live because the tutorial-attention hook is stale
4. `stop_time` does not use the existing runtime play/pause store path
5. non-tutorial attention is still present through the retired cycle-editor and runtime-attention path

The result is the behavior already observed in the current `core.cave` tutorial:

- the tutorial triggers
- the authored attention mechanisms are present
- notifications do not hide
- time controls do not hide live
- tutorial ring/focus behavior is not consumed end-to-end

---

## 2. Scope

### 2.1 In scope

This document fixes only the following:

1. live observation of active tutorial attention
2. animated show and hide for runtime notifications under tutorial attention
3. animated show and hide for runtime time controls under tutorial attention
4. tutorial `pauseGame` using the existing runtime store play/pause mechanism
5. tutorial `cameraFocusEntityId` consumption
6. tutorial `ringEntityIds` consumption
7. tutorial `focusEntityIds` visual deemphasis of non-focused entities
8. tutorial `blockNonFocusedInteraction` renderer-side interaction blocking
9. deletion of the retired `Show Attention Until Connected` editor/compiler/runtime path
10. deletion of all non-tutorial attention rendering paths from the runtime

### 2.2 Out of scope

The following are not changed by this LLD:

- tutorial schemas
- tutorial binding semantics
- tutorial attention-plan semantics
- `HardTutorialSystem`
- tutorial editor features other than deleting the retired cycle-attention control
- notification authoring
- tutorial completion semantics
- reinterpretation of `sys_world` as an authored target

The current authored `core.cave` guidance remains valid and unchanged.

---

## 3. Current-state facts from source inspection

The following facts are established from the current repository:

1. `src/ui/runtime/tutorials/useActiveTutorialAttention.ts` currently reads attention through `resolveRuntimeGuidances(runtime)` and memoizes only on `runtime` identity.
2. `src/ui/runtime/status/RuntimeClock.tsx` already hides the clock when `attention.hideTimeControls` is true, but only if the hook updates.
3. `src/ui/runtime/notifications/useRuntimeNotificationViewportState.ts` currently empties only `ongoingItems` when `attention.hideNotifications` is true and still returns event notifications.
4. `src/ui/runtime/notifications/RuntimeNotificationViewport.tsx` currently renders the notification viewport unconditionally.
5. `src/game/tutorials/resolveTutorialAttentionPlan.ts` already computes `pauseGame`, `hideTimeControls`, `hideNotifications`, `focusEntityIds`, `ringEntityIds`, `cameraFocusEntityId`, and `blockNonFocusedInteraction`.
6. `src/ui/lib/atoms/animatable/Animatable.tsx` and its exported `AnimatePresence` already provide the required enter and exit animation mechanism.
7. `src/engine/phaser/effects/RuntimeVisualEffectsManager.ts` currently renders persistent rings from the old runtime attention flags instead of from tutorial attention.
8. `src/engine/runtime/runtimeAttention.ts` currently defines the retired non-tutorial attention path, including `attention_manual`, `attention_until_connected`, manual enqueue helpers, and throttle-connection logic.
9. `src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.constants.ts`, `src/data/schemas/abilities/cycle.ts`, `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`, and `src/engine/compiler/abilities/cycleCompiler.ts` still define the retired cycle-attention authoring path.
10. raw example blueprints in `src/data/raw/example/modules/*.bp` still contain the retired `showAttentionUntilConnected` authored field.

---

## 4. Design goals

1. Tutorials are the only source of runtime attention.
2. Runtime truth remains in `sys_world.tutorial.attention`.
3. React remains observational. It does not create shadow tutorial state.
4. Existing play/pause store actions are reused. No new command path is added.
5. Existing `Animatable` and `AnimatePresence` are reused for show/hide behavior.
6. Existing `PersistentAttentionRings` are reused for tutorial ring rendering.
7. Display-instance deemphasis and interaction blocking remain renderer-only effects.
8. No unrelated feature work, generalization, or refactor is introduced.

---

## 5. Contract changes

### 5.1 Attention source contract

After this change, **tutorials are the sole allowed source of attention**.

The following paths are retired and must no longer exist in production code:

- authored cycle `showAttentionUntilConnected`
- compiled runtime state `attention_until_connected`
- command-driven/manual runtime attention `attention_manual`
- runtime connection-based attention rendering

### 5.2 Notification visibility contract

`hide_notifications` hides the entire runtime notification viewport, not just ongoing tutorial cards.

The hide and show transition must be animated.

Hiding notifications is presentational only. It must not clear, dismiss, or mutate notification store state.

### 5.3 Time-controls visibility contract

`hide_time_controls` hides the entire runtime clock/time-controls view.

The hide and show transition must be animated.

### 5.4 Pause contract

`pauseGame` must use the existing runtime store `pause()` and `play()` actions.

Tutorial pause must resume only if tutorial attention itself initiated the pause.

### 5.5 Camera-focus contract

`tutorial.attention.cameraFocusEntityId` must be consumed through the existing camera-state path.

Camera focus must preserve the current zoom when one exists.

### 5.6 Renderer contract

Tutorial renderer behavior is defined as follows:

- `ringEntityIds` produce persistent attention rings
- `focusEntityIds` keep focused entities at full opacity and de-emphasize all other entities
- `blockNonFocusedInteraction` disables interaction on non-focused entities only
- when tutorial attention clears, renderer state returns to normal without mutating ECS state

---

## 6. Design decisions

### 6.1 Live tutorial attention must read `sys_world.tutorial` directly

The stale hook bug exists because React currently derives attention through a memoized helper that does not update when the tutorial component changes inside the same runtime instance.

The corrected design reads the live tutorial component from `sys_world` through the existing entity-selector polling mechanism.

### 6.2 Visibility animation belongs in the view components, not the state hooks

The state hooks will expose visibility state and data. The components themselves will own the `Animatable` and `AnimatePresence` wrappers.

This keeps behavior aligned with the UI architecture rules: hooks resolve state, components render it.

### 6.3 The retired cycle-attention path must be deleted end-to-end

Deleting only the checkbox is not sufficient.

The schema, draft defaults, compiler emission, runtime constants, renderer consumption, example data, and tests for that feature must be removed so there is no second attention path left in the repository.

### 6.4 Tutorial ring rendering must reuse the existing persistent ring renderer

No second ring renderer is introduced. `PersistentAttentionRings` remains the only ring implementation.

### 6.5 Non-focused deemphasis and interaction blocking belong in the display manager

These are renderer-only post-tick effects applied to already-created visual instances.

They must not write ECS state and must not alter display-definition resolution.

---

## 7. File-by-file implementation design

## 7.1 Live tutorial attention observation

### CHANGE `src/ui/runtime/tutorials/useActiveTutorialAttention.ts`

**Responsibility**

Expose the live active tutorial attention plan to React consumers.

**Why**

The current implementation memoizes off runtime identity and therefore misses tutorial activation that happens inside the same runtime instance.

**What changes**

The hook stops reading attention through `resolveRuntimeGuidances(runtime)`.

It reads `sys_world.tutorial` directly.

**How**

1. Resolve the active runtime from `WorldInteractionContext` with the existing store fallback.
2. Use `useEntitySelector(runtime, "sys_world", selector, isEqual)`.
3. The selector reads the entity tutorial component and returns:
   - `null` if missing
   - `null` if inactive
   - the active `attention` payload if active
4. The equality function compares the resolved attention payload structurally so unchanged values do not trigger unnecessary rerenders.
5. The hook remains read-only and keeps the same exported name and return type.

**Interface**

Unchanged. The hook continues to return `ResolvedTutorialAttentionPlan | null`.

---

## 7.2 Tutorial pause/play bridge

### ADD `src/ui/runtime/tutorials/useTutorialAttentionPlayback.ts`

**Responsibility**

Bridge `attention.pauseGame` into the existing runtime store play/pause mechanism.

**Why**

The current repository computes tutorial pause intent but does not drive the user-visible playback mechanism already used by the time controls.

**What changes**

A shell-level effect hook is added.

**How**

1. Observe live tutorial attention through `useActiveTutorialAttention()`.
2. Read `status`, `play`, and `pause` from `useRuntimeStore`.
3. Track local ownership of any pause initiated by this hook.
4. On transition to `pauseGame === true`:
   - if store status is `running`, call `pause()` and mark ownership
   - if store status is already `paused`, do not claim ownership
5. On transition to `pauseGame === false`:
   - if this hook owns the pause and the store is still `paused`, call `play()`
   - then clear ownership
6. On runtime replacement or runtime removal:
   - clear ownership
   - do not auto-play
7. The hook does not enqueue runtime commands and does not write ECS state.

**Interface**

No arguments. No return value.

---

## 7.3 Tutorial camera-focus bridge

### ADD `src/ui/runtime/tutorials/useTutorialAttentionCameraFocus.ts`

**Responsibility**

Bridge `attention.cameraFocusEntityId` into the existing camera-state path.

**Why**

The current tutorial attention plan computes camera focus but nothing consumes it.

**What changes**

A shell-level effect hook is added.

**How**

1. Observe live tutorial attention through `useActiveTutorialAttention()`.
2. Resolve runtime, current camera state, and the existing camera setter from the world interaction layer.
3. When `cameraFocusEntityId` becomes a new value:
   - resolve the target entity body
   - do nothing if the entity does not exist
   - do nothing if it has no physics body
   - set the camera position to the body center
   - preserve current zoom if one exists
   - use zoom `1` only when no prior zoom exists
4. Do not continuously reapply the same target.
5. Do not mutate selection or ECS state.

**Interface**

No arguments. No return value.

---

## 7.4 Shell mounting

### CHANGE `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

**Responsibility**

Compose the runtime shell and mount shell-level tutorial attention hooks.

**Why**

The new pause/play and camera-focus bridges must run once for the active runtime shell.

**What changes**

The shell mounts the new hooks.

**How**

1. Mount `useTutorialAttentionPlayback()`.
2. Mount `useTutorialAttentionCameraFocus()`.
3. Mount both whenever the shell is active, not only in the `full` chrome branch.
4. Do not move business logic into the render tree.
5. Do not alter existing overlay composition beyond mounting the hooks.

**Interface**

No prop changes.

---

## 7.5 Notification viewport state

### CHANGE `src/ui/runtime/notifications/useRuntimeNotificationViewportState.ts`

**Responsibility**

Resolve the data and visibility state for the runtime notification viewport.

**Why**

The current hook hides only ongoing items and does not expose a clear viewport-level hidden state.

**What changes**

The hook stops mutating returned arrays in response to tutorial hiding.

**How**

1. Keep the existing ongoing-notification polling.
2. Keep the existing event sweeping logic.
3. Keep event render order reversed exactly as today.
4. Add a returned boolean field named `hiddenByTutorial`.
5. `hiddenByTutorial` is `true` only when live tutorial attention has `hideNotifications === true`.
6. `ongoingItems` always returns the resolved ongoing items.
7. `renderedEvents` always returns the resolved event items.
8. The hook does not clear the notification store and does not dismiss items.

**Interface**

The hook now returns:

- `ongoingItems`
- `renderedEvents`
- `hiddenByTutorial`

No other shape changes are allowed.

---

## 7.6 Notification viewport animation

### CHANGE `src/ui/runtime/notifications/RuntimeNotificationViewport.tsx`

**Responsibility**

Render the runtime notification viewport and own its animated show/hide behavior.

**Why**

The notification viewport must hide and show with animation under tutorial attention.

**What changes**

The component becomes visibility-aware and animated.

**How**

1. Read `ongoingItems`, `renderedEvents`, and `hiddenByTutorial` from `useRuntimeNotificationViewportState()`.
2. Wrap the viewport in `AnimatePresence` from the existing `Animatable` module.
3. When `hiddenByTutorial` is `false`, render the `NotificationStack` inside one `Animatable` wrapper.
4. When `hiddenByTutorial` is `true`, render nothing so exit animation runs and the viewport leaves the DOM after animation.
5. Use `type="slideRight"` for the viewport-level show/hide animation.
6. Use `initial={false}` on `AnimatePresence` so the viewport does not animate on initial shell mount.
7. Keep the existing child lists unchanged so item-level animations continue to work when the viewport itself is visible.

**Interface**

No prop changes.

---

## 7.7 Time-controls animation

### CHANGE `src/ui/runtime/status/RuntimeClock.tsx`

**Responsibility**

Render the runtime clock and own its animated show/hide behavior.

**Why**

The clock currently hard-returns `null` when hidden, so there is no exit animation.

**What changes**

The component becomes visibility-aware and animated.

**How**

1. Keep the existing clock controls and click behavior unchanged.
2. Derive `hiddenByTutorial` from `useActiveTutorialAttention()`.
3. Replace the current early `return null` path with `AnimatePresence` and `Animatable`.
4. When `hiddenByTutorial` is `false`, render the existing `ClockShell` inside one `Animatable` wrapper.
5. When `hiddenByTutorial` is `true`, render nothing so exit animation runs and the controls leave the DOM after animation.
6. Use `type="slideDown"` for the clock show/hide animation.
7. Use `initial={false}` on `AnimatePresence` so the clock does not animate on initial shell mount.
8. Do not change the public structure of the actual clock controls inside the animated wrapper.

**Interface**

No prop changes.

---

## 7.8 Tutorial ring rendering

### CHANGE `src/engine/phaser/effects/RuntimeVisualEffectsManager.ts`

**Responsibility**

Consume runtime visual effects and synchronize persistent tutorial attention rings.

**Why**

The current implementation still renders rings from the retired non-tutorial runtime-attention path.

**What changes**

The manager becomes tutorial-only for persistent attention rings.

**How**

1. Keep burst-effect handling unchanged.
2. Delete all use of the retired runtime-attention helpers.
3. Delete invalid-throttle warning behavior.
4. Resolve `sys_world.tutorial` from the runtime.
5. If the tutorial component is inactive or absent:
   - destroy all persistent rings
   - return
6. If the tutorial component is active:
   - collect `attention.ringEntityIds`
   - for each id, resolve its physics body
   - create or update a persistent ring only when the body exists
7. Destroy any previously-created persistent ring whose entity id is no longer present in the current tutorial ring set.
8. Do not read entity state flags for attention.
9. Do not mutate runtime state.

**Interface**

Constructor and public methods remain unchanged.

---

## 7.9 Renderer-side deemphasis and interaction blocking

### CHANGE `src/engine/phaser/display/EntityVisualInstance.ts`

**Responsibility**

Expose renderer-only per-instance controls needed for tutorial deemphasis and tutorial interaction blocking.

**Why**

`DisplayInstanceManager` needs a stable instance API for these renderer effects.

**What changes**

Three internal methods are added.

**How**

Add these instance methods:

1. `applyTutorialDeemphasis`
2. `clearTutorialDeemphasis`
3. `setTutorialInteractionBlocked`

Method behavior is defined as follows:

- deemphasis applies a reduced alpha to the instance’s primary rendered anchor
- clearing deemphasis restores full alpha
- interaction blocking disables or re-enables the instance’s actual interactive target

Interactive target precedence must match the current interaction-module behavior:

1. `scratch.backgroundImage` when present and interactive
2. otherwise `scratch.root`
3. otherwise no-op

The methods must be idempotent and safe when repeated every frame.

**Interface**

This is an internal class API expansion only. Constructor and external creation flow do not change.

**Alpha rule**

The non-focused alpha value must be defined as one renderer-local constant in the display layer and used consistently. This document does not invent a new numeric value outside the repository contract.

---

### CHANGE `src/engine/phaser/display/DisplayInstanceManager.ts`

**Responsibility**

Apply tutorial renderer policy to live visual instances after their normal display-module tick.

**Why**

Tutorial `focusEntityIds` and `blockNonFocusedInteraction` currently have no runtime consumer.

**What changes**

The manager reads the active tutorial component and applies post-tick renderer effects.

**How**

1. Keep instance creation, normal per-frame ticking, and stale-instance cleanup unchanged.
2. After each instance completes its normal display-module tick, resolve `sys_world.tutorial`.
3. Derive:
   - `focusedIds` from `tutorial.attention.focusEntityIds`
   - `blockNonFocusedInteraction` from `tutorial.attention.blockNonFocusedInteraction`
4. Policy rules:
   - no active tutorial: all instances render and interact normally
   - active tutorial with empty `focusedIds`: all instances render and interact normally
   - active tutorial with non-empty `focusedIds`:
     - focused entities remain full-alpha
     - non-focused entities are de-emphasized
5. Interaction rules:
   - if `blockNonFocusedInteraction` is false, normal interactivity remains in force
   - if `blockNonFocusedInteraction` is true and `focusedIds` is non-empty:
     - focused entities keep normal interactivity
     - non-focused entities are interaction-blocked after module tick
6. When tutorial attention clears, the manager restores full alpha and normal interaction.
7. The manager does not write ECS state and does not alter display-definition resolution.

**Interface**

Constructor and public methods remain unchanged.

---

## 7.10 Delete retired cycle-attention authoring

### CHANGE `src/data/schemas/abilities/cycle.ts`

**Responsibility**

Define the authored cycle ability schema.

**Why**

The retired cycle-attention checkbox must no longer exist in authored data.

**What changes**

Remove `showAttentionUntilConnected` from `CycleAbilitySchema`.

**How**

Delete the field definition entirely. No replacement field is added.

**Interface**

The authored cycle ability schema no longer accepts `showAttentionUntilConnected` as a defined field.

---

### CHANGE `src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.constants.ts`

**Responsibility**

Define the cycle form toggle rows.

**Why**

The retired checkbox must no longer render.

**What changes**

Remove the `Show Attention Until Connected` entry from `cycleToggleFields`.

**How**

Delete the object whose `path` is `showAttentionUntilConnected`.

**Interface**

`cycleToggleFields` no longer contains a retired attention toggle entry.

---

### CHANGE `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`

**Responsibility**

Define default editor draft payloads.

**Why**

New cycle drafts must no longer carry retired attention authoring.

**What changes**

Remove `showAttentionUntilConnected` from `createCycleAbilityDraft()`.

**How**

Delete the field from the returned object.

**Interface**

`createCycleAbilityDraft()` no longer includes any attention-related authored field.

---

### CHANGE `src/engine/compiler/abilities/cycleCompiler.ts`

**Responsibility**

Compile authored cycle ability config into runtime components and behavior.

**Why**

The compiler must no longer emit retired non-tutorial attention state.

**What changes**

Delete the compile path for `showAttentionUntilConnected`.

**How**

1. Remove the import of the retired runtime-attention constant.
2. Remove the conditional block that writes `components.state[ATTENTION_UNTIL_CONNECTED_STATE_KEY]`.
3. Keep all other cycle compiler behavior unchanged.

**Interface**

No new inputs or outputs. The compiler simply stops emitting retired attention state.

---

## 7.11 Delete retired runtime-attention subsystem

### DELETE `src/engine/runtime/runtimeAttention.ts`

**Responsibility being retired**

This file currently defines the old non-tutorial runtime-attention subsystem.

**Why it must be deleted**

The repository contract after this change is that tutorials are the only attention path.

**Deletion impact**

The following are removed from production code:

- `ATTENTION_MANUAL_STATE_KEY`
- `ATTENTION_UNTIL_CONNECTED_STATE_KEY`
- `readAttentionFlags`
- `readAttentionConnection`
- `enqueueShowAttention`
- `enqueueHideAttention`

No replacement file is introduced.

---

## 7.12 Remove retired authored example detritus

### CHANGE `src/data/raw/example/modules/hearth.bp`
### CHANGE `src/data/raw/example/modules/foraging.bp`
### CHANGE `src/data/raw/example/modules/egg.bp`
### CHANGE `src/data/raw/example/modules/explore.bp`
### CHANGE `src/data/raw/example/modules/gatherwood.bp`

**Responsibility**

These are repository example blueprints.

**Why**

They still contain the retired `showAttentionUntilConnected` field and therefore preserve dead authoring detritus.

**What changes**

Remove the retired field from each example blueprint.

**How**

Delete the `showAttentionUntilConnected` property entirely from the cycle ability payload in each file.

**Interface**

No replacement field is added.

---

## 8. Test design

All tests in this section must follow the project testing standard:

- behavior-first
- Given/When/Then structure
- real runtime and real world where appropriate
- no business-logic assertions in view tests

## 8.1 Hook tests

### ADD `src/ui/runtime/tutorials/useActiveTutorialAttention.test.tsx`

**Responsibility**

Verify live tutorial-attention observation.

**Required coverage**

1. returns `null` with no runtime
2. returns `null` when `sys_world` has no tutorial component
3. returns `null` when the tutorial is inactive
4. returns the active attention payload when the tutorial is active
5. updates when `sys_world.tutorial` changes inside the same runtime instance
6. does not require replacing the runtime object to update

---

### ADD `src/ui/runtime/tutorials/useTutorialAttentionPlayback.test.tsx`

**Responsibility**

Verify tutorial pause/play ownership semantics.

**Required coverage**

1. pauses when tutorial attention activates and store status is `running`
2. does not double-pause when status is already `paused`
3. resumes only when this hook initiated the pause
4. does not resume if the runtime was already paused before tutorial attention activated
5. clears ownership on runtime replacement without auto-playing

---

### ADD `src/ui/runtime/tutorials/useTutorialAttentionCameraFocus.test.tsx`

**Responsibility**

Verify tutorial camera-focus consumption.

**Required coverage**

1. no-op with no focus target
2. no-op when the focus target has no body
3. centers camera on the target body when present
4. preserves current zoom when present
5. falls back to zoom `1` when no camera state exists
6. does not reapply the same focus target repeatedly

---

## 8.2 View tests

### ADD `src/ui/runtime/status/RuntimeClock.attention.cases.tsx`

**Responsibility**

Verify animated visibility of time controls under tutorial attention.

**Required coverage**

1. clock renders when tutorial attention does not request hiding
2. clock leaves the DOM through the animated visibility path when `hideTimeControls` becomes true
3. clock returns through the animated visibility path when `hideTimeControls` becomes false again
4. visibility changes while using the same runtime instance
5. existing play/pause and time-scale controls still render unchanged while visible

**Test notes**

Mock `Animatable` and `AnimatePresence` in a way that preserves a deterministic wrapper marker so the test can distinguish the animated visibility path from a hard `return null` implementation.

---

### ADD `src/ui/runtime/notifications/RuntimeNotificationViewport.attention.cases.tsx`

**Responsibility**

Verify animated viewport-level notification hiding under tutorial attention.

**Required coverage**

1. viewport renders when tutorial attention does not request hiding
2. viewport leaves the DOM through the animated visibility path when `hideNotifications` becomes true
3. viewport returns through the animated visibility path when `hideNotifications` becomes false again
4. both ongoing and event notification content are suppressed while hidden
5. store contents are not cleared while hidden
6. ongoing and event items render again after hiding clears

**Test notes**

Mock `Animatable` and `AnimatePresence` in a way that preserves a deterministic wrapper marker so the test can assert viewport-level animation behavior.

---

### CHANGE `src/ui/runtime/shell/RuntimeShellCanvas.nodeOverlays.test.tsx`

**Responsibility**

Protect the shell composition test from the new mounted hooks and keep the test focused on overlay placement.

**Required change**

Mock the two new tutorial shell hooks so this file continues testing only node-overlay placement inside the provider tree.

---

## 8.3 Renderer tests

### CHANGE `src/engine/phaser/effects/RuntimeVisualEffectsManager.attention.test.ts`

**Responsibility**

Verify tutorial-only persistent attention-ring rendering.

**Required coverage**

Replace the old manual and until-connected assertions with tutorial-only assertions:

1. active tutorial `ringEntityIds` create persistent rings for entities with bodies
2. ring targets are removed when the tutorial ring set changes
3. all rings are destroyed when the tutorial becomes inactive or absent
4. missing bodies prevent ring creation
5. burst effects remain unchanged

No test in this file may reference `attention_manual` or `attention_until_connected` after the change.

---

### ADD `src/engine/phaser/display/DisplayInstanceManager.tutorialAttention.test.ts`

**Responsibility**

Verify tutorial-driven deemphasis and non-focused interaction blocking.

**Required coverage**

1. no active tutorial leaves all instances full-alpha and normally interactive
2. active tutorial with focused ids keeps focused instances full-alpha and de-emphasizes non-focused instances
3. clearing focus restores full alpha to all instances
4. `blockNonFocusedInteraction` blocks only non-focused instances
5. clearing tutorial attention restores normal interaction
6. active tutorial with empty focus ids does not dim or block anything

---

### CHANGE `src/engine/phaser/display/testFakes.ts`

**Responsibility**

Support renderer tests with inspectable fake display-object state.

**Required change**

Expose inspectable fake state for:

- current alpha
- current interactive-enabled state

No production behavior belongs here.

---

### CHANGE `src/engine/phaser/display/DisplayInstanceManager.testUtils.ts`

**Responsibility**

Support tutorial renderer tests with a fake runtime and fake instances that can express tutorial attention.

**Required change**

Ensure the utilities can drive:

- `sys_world.tutorial.attention`
- entity-specific alpha inspection
- entity-specific interaction-enabled inspection

No production behavior belongs here.

---

## 8.4 Retired-path test cleanup

### DELETE `src/engine/runtime/runtimeAttention.test.ts`

**Why**

The production file it covered is deleted.

No replacement file is introduced.

---

### DELETE `src/engine/compiler/abilities/cycleCompiler.attention.test.ts`

**Why**

It exists only to validate the retired cycle-attention compile path.

No replacement file with the same purpose is introduced.

Regression coverage for retired attention removal must instead live in the existing general cycle-compiler tests.

---

### DELETE `src/ui/devtools/editors/blueprint/mode/CycleAbilityForm.attention.test.tsx`

**Why**

It exists only to validate the retired editor checkbox.

No replacement file with the same purpose is introduced.

Regression coverage for retired attention removal must instead live in the existing cycle-form tests.

---

### CHANGE `src/engine/compiler/abilities/cycleCompiler.test.ts`

**Responsibility**

Carry regression coverage that the retired cycle-attention path is gone.

**Required coverage**

Add one behavior-level case proving that compiling a normal cycle ability does not emit any attention state.

The assertion must be made against the compiled output shape, not against deleted implementation helpers.

---

### CHANGE `src/ui/devtools/editors/blueprint/mode/CycleAbilityForm.test.tsx`

**Responsibility**

Carry regression coverage that the retired checkbox is gone.

**Required coverage**

Add one case proving that the form no longer renders a control labeled `Show Attention Until Connected`.

---

### CHANGE `src/ui/devtools/editors/blueprint/mode/forms/ConditionalActivationAbilityForm.test.tsx`
### CHANGE `src/ui/devtools/editors/blueprint/mode/DesignerMode.test.tsx`
### CHANGE `src/ui/devtools/editors/blueprint/editor/BlueprintEditorValidation.test.tsx`

**Responsibility**

These files contain cycle ability fixtures used by unrelated editor tests.

**Required change**

Remove the retired `showAttentionUntilConnected` property from test fixtures and keep the tests otherwise unchanged.

---

## 9. Implementation order

The implementation order is fixed.

### Phase 1 — live attention correctness

1. `src/ui/runtime/tutorials/useActiveTutorialAttention.ts`
2. `src/ui/runtime/notifications/useRuntimeNotificationViewportState.ts`
3. `src/ui/runtime/notifications/RuntimeNotificationViewport.tsx`
4. `src/ui/runtime/status/RuntimeClock.tsx`

### Phase 2 — shell bridges

1. `src/ui/runtime/tutorials/useTutorialAttentionPlayback.ts`
2. `src/ui/runtime/tutorials/useTutorialAttentionCameraFocus.ts`
3. `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

### Phase 3 — tutorial-only attention rendering

1. delete `src/engine/runtime/runtimeAttention.ts`
2. `src/engine/phaser/effects/RuntimeVisualEffectsManager.ts`
3. `src/engine/phaser/display/EntityVisualInstance.ts`
4. `src/engine/phaser/display/DisplayInstanceManager.ts`

### Phase 4 — retire cycle-attention authoring

1. `src/data/schemas/abilities/cycle.ts`
2. `src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.constants.ts`
3. `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`
4. `src/engine/compiler/abilities/cycleCompiler.ts`
5. raw example blueprints in `src/data/raw/example/modules/*.bp`

### Phase 5 — tests

All test additions, test changes, and test deletions in Section 8.

No phase is complete while its required tests are absent or red.

---

## 10. Acceptance criteria

This work is complete only when all statements below are true.

### Tutorial attention correctness

- active tutorial attention updates live without replacing the runtime object
- `hideTimeControls` hides the clock through an animated visibility path
- `hideNotifications` hides the entire notification viewport through an animated visibility path
- notifications reappear through the same animated path when tutorial hiding clears
- hiding notifications does not mutate notification store contents
- `pauseGame` uses the runtime store `pause()` and `play()` actions
- tutorial pause resumes only when tutorial attention initiated the pause
- `cameraFocusEntityId` is consumed and preserves current zoom

### Renderer behavior

- `ringEntityIds` render through `PersistentAttentionRings`
- focused entities remain full-alpha while non-focused entities are de-emphasized
- non-focused interaction is blocked only when requested by tutorial attention
- renderer state returns to normal when tutorial attention clears
- no ECS mutation is introduced to achieve renderer effects

### Attention-path removal

- no production code remains for `attention_manual`
- no production code remains for `attention_until_connected`
- no cycle authoring field remains for `showAttentionUntilConnected`
- no example blueprint in the repository contains `showAttentionUntilConnected`
- no production renderer path shows attention from anything other than tutorials

### Test and scope control

- all files listed in Section 8 are updated exactly as specified
- deleted tests for retired features are removed
- replacement regression coverage exists in the specified surviving test files
- no unrelated refactor was introduced
- no tutorial semantics were changed outside this document’s scope

---

## 11. Deliverable summary

After this delta is implemented:

1. tutorial attention becomes live and observable in React
2. time controls hide and show with animation under tutorial attention
3. the full notifications viewport hides and shows with animation under tutorial attention
4. tutorial pause uses the same play/pause mechanism as the existing time controls
5. tutorial camera focus, tutorial rings, tutorial deemphasis, and tutorial interaction blocking are all consumed end-to-end
6. the retired cycle-attention checkbox and all of its compiler/runtime detritus are gone
7. tutorials become the only remaining path for attention in the runtime

This is the full and exact correction set required by the current contract.
