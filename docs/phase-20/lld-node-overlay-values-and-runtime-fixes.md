# LLD: node overlay value toggle + six runtime/UI fixes

## Document status

This is the implementation design for six changes:

1. Add a main-menu toggle for node overlay values (`LiveValueText` / `ValueText`), default off, with zero render/subscription/calculation cost when off.
2. Fix tutorial mode so it does not turn back on after tutorial completion unless tutorial reset explicitly does so.
3. Remove the auto-dismiss timer display from runtime event toasts and clean out the unused timer UI.
4. Make screen and node callouts always render above every other UI layer.
5. Make pointer interaction usable during pause by moving pointer timing off game time.
6. Remove parent master throttles and all dead paths that exist only to support that feature.

## Governing constraints

This design is constrained by the project’s architectural and testing rules:

- Runtime state remains the single source of truth.
- UI does not mutate simulation state directly.
- Logic is kept out of `.tsx` files unless the file is purely presentational wiring.
- Existing mechanisms are reused before adding new ones.
- Tests verify behavior, not internals.
- Out-of-scope refactors are forbidden.

## Source basis

This design is grounded in direct code inspection of the current implementation. The design below is based on the following source paths that were read before writing this document:

- `ui/production/main-menu/MainMenuPanel.tsx`
- `ui/production/main-menu/MainMenuPanel.test.tsx`
- `ui/runtime/world/node-overlays/index.ts`
- `ui/runtime/world/node-overlays/nodeOverlayToggle.ts`
- `ui/runtime/world/node-overlays/useNodeOverlaysEnabled.ts`
- `ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`
- `ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`
- `ui/runtime/world/node-overlays/NodeOverlayViewportLayers.tsx`
- `ui/runtime/world/node-overlays/NodeOverlayCard.tsx`
- `ui/runtime/world/node-overlays/nodeOverlayTypes.ts`
- `ui/runtime/world/node-overlays/nodeOverlayComparators.ts`
- `ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`
- `ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.ts`
- `ui/runtime/world/node-overlays/nodeOverlayViewportHydration.ts`
- `ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts`
- `ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts`
- `ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts`
- `ui/runtime/world/node-overlays/resolveCycleOverlayEntry.ts`
- `ui/runtime/world/node-overlays/resolveCycleOverlayEntry.helpers.ts`
- `ui/runtime/world/node-overlays/filterVisibleNodeOverlayModels.ts`
- `ui/runtime/world/node-overlays/resolveNodeOverlayThrottle.ts`
- `ui/runtime/world/entity-state-link/useEntityTextRef.ts`
- `ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.ts`
- `ui/runtime/tutorials/tutorialModeMemory.ts`
- `ui/runtime/tutorials/tutorialCompletionMemory.ts`
- `app-shell/tutorialSessionState.ts`
- `app-shell/useAppShellControllerCallbacks.ts`
- `app-shell/useAppShellController.tutorialMode.test.tsx`
- `app-shell/useAppShellController.newGame.test.tsx`
- `ui/runtime/state/useRuntimeStore.tutorialMode.test.ts`
- `ui/runtime/notifications/RuntimeNotificationEventList.tsx`
- `ui/runtime/notifications/RuntimeNotificationCard.tsx`
- `ui/runtime/notifications/RuntimeNotificationDismissTimer.tsx`
- `ui/runtime/notifications/runtimeNotificationStore.ts`
- `ui/runtime/notifications/RuntimeNotificationViewport.events.cases.tsx`
- `ui/lib/foundation/portal-manager/types.ts`
- `ui/lib/foundation/portal-manager/PortalManager.tsx`
- `ui/lib/foundation/portal-manager/Portal.tsx`
- `ui/lib/foundation/theme/tokens.ts`
- `ui/runtime/world/node-overlays/ScreenOverlay.tsx`
- `ui/runtime/world/node-overlays/GuidanceCalloutCard.tsx`
- `ui/runtime/world/node-overlays/runtime-callouts/RuntimeCalloutCard.tsx`
- `ui/runtime/world/node-overlays/NodeOverlayViewport.screenCalloutLayer.test.tsx`
- `game/systems/PointerSystem.ts`
- `game/systems/pointer/pointerSystemActions.ts`
- `game/systems/pointer/pointerState.ts`
- `engine/phaser/scenes/PointerInputController.ts`
- `engine/runtime/runtimeSystemRunner.ts`
- `engine/runtime/runtimeTick.ts`
- `engine/runtime/RuntimeCore.ts`
- `game/systems/energy/parentThrottle.ts`
- `game/systems/energy/energyDistributionDemandContext.ts`
- `game/assignment/assignmentOwnerUsability.ts`
- `engine/phaser/veins/veinFlowProjection.ts`
- `ui/runtime/world/selection/components/useParentMasterThrottle.ts`
- `ui/runtime/world/selection/components/resolveRuntimeParentSectionData.ts`
- `ui/runtime/world/selection/components/RuntimeParentSection.tsx`
- `ui/runtime/world/selection/components/RuntimeParentChildrenStrip.tsx`
- `ui/runtime/world/selection/selectionHydrationUtils.ts`
- `ui/runtime/world/selection/DisplayCardView.tsx`
- `ui/runtime/world/selection/body/BodyCardView.tsx`
- `ui/runtime/world/selection/body/BodyCardContent.tsx`
- `ui/runtime/world/selection/cave/CaveCardView.tsx`
- `ui/runtime/world/selection/job-card/PowerJobCardView.tsx`
- `ui/runtime/world/selection/resolveDisplayCardData.ts`
- `ui/runtime/world/selection/body/resolveBodyCardData.ts`
- `ui/runtime/world/selection/cave/resolveCaveCardData.ts`
- `ui/runtime/world/selection/job-card/resolveJobCardData.ts`
- the associated tests for the touched areas.

## Non-goals

- No redesign of node overlays beyond the value toggle.
- No refactor of unrelated main-menu toggles.
- No change to runtime notification expiry behavior.
- No change to tutorial reset semantics.
- No change to body/job/cave card content unrelated to parent master throttle removal.
- No change to non-callout overlay ordering.

## Cross-cutting design decisions

### Reuse existing toggle infrastructure

The existing node overlay visibility toggle already uses a simple `localStorage`-backed external store plus `useSyncExternalStore`. The new value toggle must use the same mechanism instead of introducing Zustand, React Context, or prop drilling from the app shell.

### Gate value work before card render

The `LiveValueText` subscription cost is created by `useEntityTextRef`, which only runs when `LiveValueText` mounts. Static value work is introduced upstream because overlay entries currently always carry either `valueBinding` or `valueText`. Therefore the value toggle must be enforced in overlay entry resolution, not by visually hiding an already-resolved value in the card.

### Keep pause behavior explicit

Pointer pause behavior must not depend on paused game `dt`. Pause-safe systems already exist in the runtime through `runsWhenPaused`. Pointer timing must move to wall-clock semantics, while command application during explicit runtime pause must use the runtime’s existing `stepOncePreservingPause` entry point.

### Remove parent throttle feature, not just the slider

The parent master throttle is not a UI-only feature. It currently alters energy demand, assignment usability, vein projection, overlay throttle display, selection-card data, and tests. The removal must delete the feature end to end and then delete the dead UI/data/test paths that exist only because of that feature.

---

# Change 1: add a node overlay value toggle with zero cost when off

## Why

The current node overlay card path always renders a value region. For live values, `NodeOverlayCard` mounts `LiveValueText`, which registers an entity text binding through `useEntityTextRef`. For static values, the resolved node overlay model already carries `valueText`. That means the current implementation always pays at least one of the following costs:

- overlay value resolution cost,
- entity text binding creation cost,
- DOM/render cost for the value field.

The requested behavior is stricter:

- default off,
- no value shown,
- no live subscription,
- no static value calculation,
- no accidental fallback path that still computes values when hidden.

## What

Add a second node-overlay toggle in the main menu, placed immediately after the existing `Node Overlays` toggle row. The new toggle controls whether node overlay values are resolved and rendered.

When the toggle is off:

- no `valueBinding` is created for storage or cycle overlays,
- no `valueText` is created for static cycle or assignment overlays,
- `LiveValueText` does not mount,
- `useEntityTextRef` does not subscribe,
- node overlay cards render label and/or bar only.

When the toggle is on:

- current behavior is preserved.

Default state is off on a cold load.

## How

The design uses the existing `nodeOverlayToggle.ts` pattern:

1. Add a dedicated persisted external store for node overlay values.
2. Read that store in `MainMenuPanel` and expose a new checkbox.
3. Read that store in `NodeOverlayViewport`.
4. Thread the boolean into overlay entry hydration and model resolution.
5. Change overlay entry types so a resolved entry may intentionally contain no value field.
6. Update `NodeOverlayCard` so it renders nothing for the value region when no value field exists.
7. Rebuild the resolved overlay entry index whenever the value toggle changes so the cache cannot preserve stale value-bearing entries.

### Behavior contract

- `Node Overlays` off still disables the entire overlay system exactly as it does today.
- `Node Overlays` on plus `Node Overlay Values` off shows overlays without value text.
- `Node Overlays` on plus `Node Overlay Values` on preserves current value behavior.
- A toggle flip must be reflected without requiring a runtime reset.
- The value toggle must not change node overlay card positions or bar behavior.

## File contracts

### New file: `ui/runtime/world/node-overlays/nodeOverlayValuesToggle.ts`

- Responsibility: persist and broadcast the node overlay value visibility flag.
- Logic:
  - Hold a module-local boolean initialized from `localStorage`.
  - Use a dedicated storage key for node overlay values.
  - Cold-load default must be `false`.
  - Notify listeners only when the value actually changes.
- Interface:
  - Export a getter for the current enabled state.
  - Export a setter that accepts the next boolean.
  - Export a toggle helper.
  - Export a subscribe function compatible with `useSyncExternalStore`.

### New file: `ui/runtime/world/node-overlays/useNodeOverlayValuesEnabled.ts`

- Responsibility: expose the value-toggle store to React using the same subscription pattern as `useNodeOverlaysEnabled`.
- Logic:
  - Subscribe to the new external store.
  - Return the current boolean to React callers.
- Interface:
  - Export a single hook returning the current boolean.

### Change: `ui/runtime/world/node-overlays/index.ts`

- Responsibility: remain the public surface for node overlay view-layer hooks/components.
- Logic:
  - Re-export the new value-toggle hook.
- Interface:
  - Public exports now include the new value-toggle hook in addition to `NodeOverlayViewport` and `useNodeOverlaysEnabled`.

### Change: `ui/production/main-menu/MainMenuPanel.tsx`

- Responsibility: expose user-facing runtime display toggles.
- Logic:
  - Read the new value-toggle hook.
  - Add a new checkbox row immediately after `Node Overlays`.
  - Write back through the new value-toggle setter.
  - Preserve all existing toggle behavior.
- Interface:
  - The rendered menu contains a new checkbox labeled for node overlay values.
  - The row order is deterministic: the new row appears adjacent to the node overlays row.

### Change: `ui/production/main-menu/MainMenuPanel.test.tsx`

- Responsibility: verify menu toggle behavior.
- Logic:
  - Add coverage for cold-load default off.
  - Add coverage for persisted state reflection.
  - Add coverage for updating persisted state when toggled.
- Interface:
  - Test-only file. No production exports.

### Change: `ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

- Responsibility: coordinate overlay viewport inputs and resolved model sources.
- Logic:
  - Read `useNodeOverlayValuesEnabled`.
  - Pass the boolean into resolved entry generation.
  - Do not apply presentation-only hiding in this component.
- Interface:
  - `useNodeOverlayNodeModels` or its upstream entry resolver receives both `enabled` and `showValues` information.

### Change: `ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.ts`

- Responsibility: cache and incrementally update resolved overlay entries.
- Logic:
  - Add the value-toggle boolean to the cache identity.
  - Force a rebuild when the boolean changes.
  - Pass the boolean through to index build and incremental change application.
- Interface:
  - The hook still returns an array of `ResolvedNodeOverlayEntry` values.
  - The hook now depends on a `showValues` input in addition to `runtime` and `enabled`.

### Change: `ui/runtime/world/node-overlays/nodeOverlayViewportHydration.ts`

- Responsibility: build and incrementally refresh the resolved overlay entry index.
- Logic:
  - Add the `showValues` boolean to index build and incremental refresh entry points.
  - Re-resolve changed entities using the current toggle state.
- Interface:
  - `buildNodeOverlayEntryIndex` accepts `runtime` plus `showValues`.
  - `applyNodeOverlayEntryChanges` accepts `showValues` as an explicit input.

### Change: `ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts`

- Responsibility: resolve the sorted list of overlay entries from runtime entities.
- Logic:
  - Pass the value-toggle boolean into `resolveNodeOverlayModel`.
  - Preserve sort order by `entityId`.
- Interface:
  - Add a `showValues` input with default `true` so existing non-toggle callers remain valid.

### Change: `ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts`

- Responsibility: dispatch entity-specific overlay resolution.
- Logic:
  - Thread `showValues` to storage, assignment, and cycle resolvers.
  - Preserve current lens and entity-kind routing.
- Interface:
  - Add a `showValues` input with default `true`.

### Change: `ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts`

- Responsibility: resolve storage and assignment overlay entries.
- Logic:
  - Storage overlays:
    - when `showValues` is true, preserve current `valueBinding` behavior,
    - when `showValues` is false, return bar-only storage entries with no value field.
  - Assignment overlays:
    - when `showValues` is true, preserve current static empty `valueText` behavior,
    - when `showValues` is false, return label-only entries with no value field.
- Interface:
  - Both helper functions accept `showValues`.

### Change: `ui/runtime/world/node-overlays/resolveCycleOverlayEntry.ts`

- Responsibility: resolve cycle overlays for active work, waiting resources, idle, and blackout.
- Logic:
  - Waiting-resource cycle:
    - preserve label and bar,
    - include `valueBinding` only when `showValues` is true.
  - Active cycle countdown:
    - preserve bar,
    - include `valueBinding` only when `showValues` is true,
    - return bar-only overlay when `showValues` is false.
  - Idle / blackout fallback:
    - preserve current static text behavior when `showValues` is true,
    - return `null` when `showValues` is false so blank cycle cards are never created.
- Interface:
  - Accept `showValues` as an explicit input.

### Change: `ui/runtime/world/node-overlays/nodeOverlayTypes.ts`

- Responsibility: define the resolved overlay entry/model contract.
- Logic:
  - Extend the value-display union so a resolved entry may intentionally contain neither `valueBinding` nor `valueText`.
  - Preserve existing entry/model fields for label, kind, entityId, bar, and position.
- Interface:
  - `ResolvedNodeOverlayEntry` explicitly supports three value states:
    - live value,
    - static value,
    - no value.

### Change: `ui/runtime/world/node-overlays/nodeOverlayComparators.ts`

- Responsibility: compare overlay entries/models for cache and render stability.
- Logic:
  - Treat “no value” as a first-class state.
  - Return equal only when both sides are in the same value mode and the mode-specific payload matches.
- Interface:
  - Equality semantics now distinguish hidden value, static value, and live value.

### Change: `ui/runtime/world/node-overlays/NodeOverlayCard.tsx`

- Responsibility: render a single resolved overlay card.
- Logic:
  - Preserve current label and bar rendering.
  - Render `LiveValueText` only when a `valueBinding` exists.
  - Render static value text only when `valueText` exists.
  - Render no value row when neither field exists.
- Interface:
  - Input model type remains `ResolvedNodeOverlayModel`.
  - The model may now omit both value fields.

### Change: `ui/runtime/world/node-overlays/filterVisibleNodeOverlayModels.ts`

- Responsibility: suppress overlays that should never be shown.
- Logic:
  - Preserve current assignment hiding by label.
  - Preserve current idle/blackout cycle hiding by relying on the resolver to omit those entries entirely when values are disabled.
  - Do not infer hidden cycle state from a missing value field.
- Interface:
  - No signature change required.

### Change: `ui/runtime/world/node-overlays/NodeOverlayCard.test.tsx`

- Responsibility: verify overlay card rendering.
- Logic:
  - Keep the existing empty-label case.
  - Add a case proving that a model with no value field renders no value text element.
  - Add a case proving that the card still renders its bar/label content when values are absent.
- Interface:
  - Test-only file. No production exports.

### Change: `ui/runtime/world/node-overlays/resolveNodeOverlayModel.test.ts`

- Responsibility: verify overlay model resolution semantics.
- Logic:
  - Preserve current “values enabled” expectations.
  - Add “values disabled” expectations for storage, active cycle, idle cycle, blackout cycle, and idle assignment.
- Interface:
  - Test-only file. No production exports.

### Change: `ui/runtime/world/node-overlays/resolveNodeOverlayModel.waitingResource.test.ts`

- Responsibility: verify waiting-resource overlay behavior.
- Logic:
  - Preserve the current waiting-resource match behavior.
  - Add coverage that waiting-resource overlays retain label and bar but omit value data when values are disabled.
- Interface:
  - Test-only file. No production exports.

### Change: `ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.rebuild.test.tsx`

- Responsibility: verify rebuild conditions.
- Logic:
  - Add coverage that the hook rebuilds when the value toggle changes.
- Interface:
  - Test-only file. No production exports.

### Change: `ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.incremental.test.tsx`

- Responsibility: verify incremental stability within a fixed toggle state.
- Logic:
  - Preserve current progress-only stability expectations.
  - Add a toggle-state transition case proving that the value-mode flip forces a rebuild rather than incorrectly preserving old entries.
- Interface:
  - Test-only file. No production exports.

## Acceptance criteria

- Cold load default is off.
- The new checkbox appears immediately after `Node Overlays` in the main menu.
- With values off, no `LiveValueText` instance mounts.
- With values off, storage and cycle value bindings are not created.
- With values off, static `valueText` is not produced.
- With values off, active cycle overlays still show progress bars.
- With values off, waiting-resource overlays still show label and bar.
- With values off, idle/blackout cycle overlays remain hidden.
- With values on, current overlay value behavior is unchanged.

---

# Change 2: fix tutorial mode re-enabling after tutorial completion

## Why

Tutorial session state capture/restore is asymmetric today:

- tutorial completion memory already falls back to persisted storage when runtime world state is absent,
- tutorial mode extraction does not; it normalizes absent state to `1`.

That means a new-game flow can capture tutorial mode as `1` merely because the current runtime no longer exposes `sys_world.state.tutorial_mode`, even when the persisted tutorial mode is already `0`.

## What

Make tutorial mode extraction fall back to persisted storage whenever runtime or world state does not expose a tutorial mode value.

The only runtime path in normal gameplay that can turn tutorial mode back to `1` remains explicit tutorial reset.

## How

Do not change tutorial reset, restore, or persistence semantics. Change only the extraction fallback behavior.

### Behavior contract

- Live world value remains authoritative when present.
- Stored value is used only when live world value is absent.
- Missing runtime state never silently becomes tutorial mode `1`.
- `resetTutorialMode` remains the only normal reset path that writes mode `1` back to storage/runtime.

## File contracts

### Change: `ui/runtime/tutorials/tutorialModeMemory.ts`

- Responsibility: persist, extract, restore, and reset tutorial mode.
- Logic:
  - Preserve current normalization and restore behavior.
  - Change extraction so it returns the live world value when present and the stored value when absent.
  - Remove the hard-coded “missing world means 1” behavior.
- Interface:
  - Public function names remain unchanged.
  - `extractTutorialMode` now has deterministic fallback-to-storage semantics.

### Change: `app-shell/tutorialSessionState.ts`

- Responsibility: capture and restore tutorial-related session state.
- Logic:
  - No semantic change required beyond consuming the corrected tutorial-mode extraction behavior.
  - If touched, keep this file as a pure composition layer over tutorial mode plus completion memory.
- Interface:
  - Public functions remain unchanged.

### Change: `app-shell/useAppShellController.tutorialMode.test.tsx`

- Responsibility: verify tutorial mode restoration across the new-game cinematic path.
- Logic:
  - Add coverage where the start-script runtime exposes no tutorial mode in `sys_world`, but persisted storage is `0`.
  - Verify restore writes `0`, not `1`.
- Interface:
  - Test-only file. No production exports.

### Change: `app-shell/useAppShellController.newGame.test.tsx`

- Responsibility: verify broader new-game flow behavior.
- Logic:
  - Add coverage for the no-live-mode fallback path if the tutorial-mode-specific test does not already fully cover it.
- Interface:
  - Test-only file. No production exports.

### Change: `ui/runtime/tutorials/tutorialModeMemory.test.ts`

- Responsibility: verify tutorial mode persistence and extraction semantics.
- Logic:
  - Add a case proving that absent runtime world state falls back to stored mode.
  - Preserve the existing restore/reset tests.
- Interface:
  - Test-only file. No production exports.

### Change: `ui/runtime/state/useRuntimeStore.tutorialMode.test.ts`

- Responsibility: verify runtime reset behavior.
- Logic:
  - Preserve current reset coverage.
  - Add or retain coverage that reset restores persisted tutorial mode rather than a missing-state default.
- Interface:
  - Test-only file. No production exports.

## Acceptance criteria

- Finished tutorial state remains off across new-game/session handoff.
- Missing world state does not re-enable tutorial mode.
- Explicit tutorial reset still re-enables tutorial mode.

---

# Change 3: remove the toast auto-dismiss timer display and dead UI

## Why

Runtime event notification expiry is already handled in the store. The countdown text is a presentation-only layer that adds timer rendering, timer tests, and card props that are no longer desired.

## What

Remove the visible countdown label from runtime event toasts. Keep event expiry and click behavior unchanged.

## How

Delete the timer component and remove the card prop that existed only to render it.

### Behavior contract

- Event toasts still auto-dismiss on the existing TTL.
- Event toasts remain clickable.
- Ongoing notifications remain unchanged.
- No countdown text is rendered anywhere in runtime notifications.

## File contracts

### Change: `ui/runtime/notifications/RuntimeNotificationEventList.tsx`

- Responsibility: render event notification cards.
- Logic:
  - Stop creating timer content.
  - Continue formatting event text and click behavior exactly as before.
- Interface:
  - `RuntimeNotificationCard` is now called without dismiss content.

### Change: `ui/runtime/notifications/RuntimeNotificationCard.tsx`

- Responsibility: render a single runtime notification card.
- Logic:
  - Remove the dismiss-content prop.
  - Remove the timer wrapper markup.
  - Preserve tone, attention, clickability, and main text rendering.
- Interface:
  - Card props no longer include timer/dismiss-content support.

### Remove: `ui/runtime/notifications/RuntimeNotificationDismissTimer.tsx`

- Responsibility after change: none. The file is removed.
- Logic after change: none. The timer UI no longer exists.
- Interface after change: none.

### Change: `ui/runtime/notifications/RuntimeNotificationViewport.events.cases.tsx`

- Responsibility: verify runtime notification behavior.
- Logic:
  - Remove assertions about countdown text.
  - Retain assertions for rendering, click behavior, and TTL-based auto-dismiss.
- Interface:
  - Test-only file. No production exports.

### Remove: `ui/runtime/notifications/RuntimeNotificationDismissTimer.test.tsx`

- Responsibility after change: none. The file is removed with the component.
- Logic after change: none.
- Interface after change: none.

## Acceptance criteria

- No event toast displays countdown text.
- Event toasts still disappear on schedule.
- No timer-specific code or tests remain.

---

# Change 4: make screen and node callouts always render above everything else

## Why

Current layering is split:

- node overlay callouts render in the normal overlay root at foreground depth,
- screen callouts render in the `float` portal,
- notifications, modals, and tooltips all sit above those layers.

That violates the requirement that screen and node callouts must be above every other UI element.

## What

Introduce a dedicated topmost portal layer for callouts and move both screen callouts and node/runtime callouts into it.

## How

Do not raise unrelated layers such as `float`, `toast`, or `overlay`. Add a new portal layer dedicated to callouts.

### Behavior contract

- Screen callouts render above notifications, modals, and tooltips.
- Runtime callouts render above notifications, modals, and tooltips.
- Node overlay cards themselves are not promoted; only callouts move.
- Positioning semantics for callouts remain unchanged.
- Pointer behavior for empty portal space remains pass-through, matching the existing portal manager contract.

## File contracts

### Change: `ui/lib/foundation/portal-manager/types.ts`

- Responsibility: define named portal layers and their z-order.
- Logic:
  - Add a new `callout` layer.
  - Assign it the highest z-index in the portal system.
- Interface:
  - `PortalLayer` union includes `callout`.
  - `PORTAL_LAYERS` includes a `callout` entry with the highest z-index.

### Change: `ui/lib/foundation/portal-manager/PortalManager.tsx`

- Responsibility: create and manage portal root DOM nodes.
- Logic:
  - Add a root for the `callout` layer.
  - Include it in setup, cleanup, and context exposure.
  - Update comments so they describe the actual managed layer set.
- Interface:
  - The portal context exposes a `callout` root in addition to the existing roots.

### Change: `ui/lib/foundation/theme/tokens.ts`

- Responsibility: define canonical z-index tokens.
- Logic:
  - Add a theme token for the callout layer with the highest UI z-index.
  - Keep the numeric ordering aligned with the portal layer config.
- Interface:
  - Theme z-index tokens now include `callout`.

### Change: `ui/runtime/world/node-overlays/ScreenOverlay.tsx`

- Responsibility: render screen-level tutorial/runtime guidance cards.
- Logic:
  - Move portal target from `float` to `callout`.
  - Preserve layout and content rendering.
- Interface:
  - No prop changes.

### Change: `ui/runtime/world/node-overlays/NodeOverlayViewportView.tsx`

- Responsibility: compose the overlay viewport layers.
- Logic:
  - Keep node overlay cards in `OverlayRoot`.
  - Render `GuidanceCalloutLayer` and `RuntimeCalloutLayer` inside a `Portal` targeting `callout`.
  - Preserve screen overlay composition.
- Interface:
  - No prop changes.

### Change: `ui/runtime/world/node-overlays/GuidanceCalloutCard.tsx`

- Responsibility: render a positioned guidance callout card.
- Logic:
  - No semantic change required.
  - If touched, keep it purely presentational and compatible with absolute positioning inside a full-screen callout portal root.
- Interface:
  - No prop changes.

### Change: `ui/runtime/world/node-overlays/runtime-callouts/RuntimeCalloutCard.tsx`

- Responsibility: render a positioned runtime callout card.
- Logic:
  - No semantic change required.
  - If touched, keep it purely presentational and compatible with the callout portal root.
- Interface:
  - No prop changes.

### Change: `ui/runtime/world/node-overlays/NodeOverlayViewport.screenCalloutLayer.test.tsx`

- Responsibility: verify screen callout layering.
- Logic:
  - Update the portal selector from the float layer to the new callout layer.
  - Preserve the assertion that the modal still exists while the callout is rendered in the higher layer.
- Interface:
  - Test-only file. No production exports.

## Acceptance criteria

- Screen callouts mount in the new callout portal layer.
- Runtime callouts mount in the new callout portal layer.
- Callouts remain visually positioned exactly as before.
- Notifications, modals, and tooltips never cover these callouts.

---

# Change 5: make pointer interaction use wall-clock timing during pause

## Why

`PointerSystem` currently accumulates pickup/drop hold duration and pickup cadence using game `dt`. That breaks pause behavior because paused game time does not advance in the same way as real input time.

In addition:

- `PointerSystem` does not currently declare `runsWhenPaused`.
- `PointerInputController` only flushes commands when runtime status is `paused`; a flush alone does not run systems because a paused runtime tick returns immediately.

## What

Move pointer timing from game `dt` to wall-clock semantics and make pointer processing explicitly pause-aware.

## How

Use the existing runtime pause hooks instead of inventing a new pause loop.

### Behavior contract

- Pickup hold duration is based on real elapsed time while the pickup input is down.
- Drop hold duration is based on real elapsed time while the drop input is down.
- Pickup cadence is based on real elapsed time between pickup actions.
- Pointer logic can run during pause-safe runtime states.
- Explicit runtime pause still applies queued pointer input by stepping once through the existing pause-preserving runtime entry point.
- Existing pointer preview, target acquisition, and drop-choice logic remain unchanged.

## File contracts

### Change: `game/systems/PointerSystem.ts`

- Responsibility: derive pointer state and emit pointer commands each tick.
- Logic:
  - Mark the system as pause-aware by enabling `runsWhenPaused`.
  - Stop deriving hold durations from `dt`.
  - Derive hold durations from wall-clock timestamps stored on the pointer entity.
  - Continue writing derived hold-duration state fields so dependent UI/state readers do not break.
  - Continue target, preview, pickup-radius, and drop-choice resolution unchanged.
- Interface:
  - Public system registration shape remains the same.
  - Internal timing source changes from game `dt` to wall clock.

### Change: `game/systems/pointer/pointerSystemActions.ts`

- Responsibility: execute pickup/drop rules.
- Logic:
  - Stop accumulating pickup cadence with `dt`.
  - Base cadence on wall-clock timestamps.
  - Keep the existing pickup/drop command semantics.
- Interface:
  - Function inputs change so pickup timing uses explicit timestamps/elapsed wall time instead of `dt`.

### Change: `engine/phaser/scenes/PointerInputController.ts`

- Responsibility: convert Phaser pointer input into runtime commands.
- Logic:
  - On pointer down, write wall-clock start timestamps for the relevant pointer action.
  - On pointer up, clear or finalize the relevant timestamp state.
  - When runtime status is `paused`, use `stepOncePreservingPause` so the queued pointer state is actually applied through one runtime step instead of a flush-only no-op.
  - Preserve pointer position command emission.
- Interface:
  - No external API change.
  - Emitted state now includes pointer timing timestamps.

### Change: `data/schemas/v2/pointerSystemDefaults.ts`

- Responsibility: define default `sys_pointer` runtime state.
- Logic:
  - Add the new timestamp state keys needed by wall-clock pointer timing.
  - Keep existing derived hold/timer state keys so current readers remain valid.
- Interface:
  - Default pointer entity state now includes the additional timing keys.

### Change: `game/systems/pointer/pointerState.ts`

- Responsibility: shared pointer state utilities.
- Logic:
  - If needed, centralize timestamp-state enqueue helpers here so pointer state writes remain consistent.
  - Preserve current preview/target helpers.
- Interface:
  - If extended, the file exports helpers for timestamp-state writes in addition to the existing pointer state helpers.

### New test file: `game/systems/PointerSystem.test.ts`

- Responsibility: verify pointer timing behavior at the system level.
- Logic:
  - Cover hold-duration derivation from wall-clock timestamps.
  - Cover pickup cadence using wall-clock timestamps.
  - Cover pause-safe ticking when the system is allowed to run while paused.
- Interface:
  - Test-only file. No production exports.

### New test file: `engine/phaser/scenes/PointerInputController.test.ts`

- Responsibility: verify input-controller pause wiring.
- Logic:
  - Cover timestamp state writes on pointer down/up.
  - Cover the paused-runtime path using `stepOncePreservingPause` rather than flush-only behavior.
- Interface:
  - Test-only file. No production exports.

## Acceptance criteria

- Pickup/drop hold logic is no longer driven by game `dt`.
- Pointer pickup cadence no longer depends on game `dt`.
- Pointer logic is explicitly pause-aware.
- Paused-runtime pointer input is stepped through the existing pause-preserving runtime path.

---

# Change 6: remove parent master throttles and all supporting dead code

## Why

Parent master throttle is a cross-cutting feature, not a single UI control. It currently affects:

- energy demand aggregation,
- assignment owner usability,
- vein flow projection,
- node overlay throttle resolution,
- parent-section hydration,
- parent slider hooks and views,
- selection card data types and hydration equality,
- multiple tests.

Removing only the UI slider would leave the simulation and display layers in an inconsistent state.

## What

Delete the parent master throttle feature completely.

After this change:

- parent entities no longer own or write `parent_master_throttle`,
- descendant effective throttle is based only on each entity’s own `powerSink.throttle`,
- no selection card renders a parent master throttle section,
- selection card data no longer carries parent throttle-only data,
- the old helper modules and tests are removed.

## How

Collapse all effective-throttle math to local sink throttle and remove the parent-section UI/data path end to end.

### Behavior contract

- Energy demand is based only on each sink’s own throttle.
- Assignment owner usability is not blocked by ancestor throttle.
- Vein flow projection uses only the target sink’s own throttle.
- Node overlay waiting-resource throttling is based only on the local throttle-bearing ancestor search already present in `resolveNodeOverlayThrottle`, simplified to local throttle semantics.
- No selection card renders a `Master Throttle` slider.
- No selection-card data model carries a parent-section payload.

## File contracts

### Remove: `game/systems/energy/parentThrottle.ts`

- Responsibility after change: none. The file is removed.
- Logic after change: none.
- Interface after change: none.

### Remove: `game/systems/energy/parentThrottle.test.ts`

- Responsibility after change: none. The file is removed with the feature.
- Logic after change: none.
- Interface after change: none.

### Change: `game/systems/energy/energyDistributionDemandContext.ts`

- Responsibility: build energy demand context.
- Logic:
  - Remove ancestor-throttle multiplication.
  - Compute demand from each sink’s own throttle only.
- Interface:
  - Public return shape remains unchanged.
  - Internal throttle source is simplified.

### Change or replace: `game/systems/energy/energyDistributionDemandContext.parentThrottle.test.ts`

- Responsibility: verify demand throttling behavior.
- Logic:
  - Replace ancestor-throttle coverage with direct sink-throttle coverage, or delete the file if its coverage becomes redundant with broader demand-context tests.
- Interface:
  - Test-only file. No production exports.

### Change: `game/assignment/assignmentOwnerUsability.ts`

- Responsibility: determine whether an assignment owner is usable.
- Logic:
  - Remove the ancestor-master-throttle usability gate.
  - Preserve depleted-state and conditional-activation checks.
- Interface:
  - Public function name and return type remain unchanged.

### Change: `engine/phaser/veins/veinFlowProjection.ts`

- Responsibility: project edge flow and throttle for veins.
- Logic:
  - Remove ancestor-throttle multiplication.
  - Use only the local sink throttle for non-nervous flows.
- Interface:
  - Public function name and output fields remain unchanged.

### Change: `ui/runtime/world/node-overlays/resolveNodeOverlayThrottle.ts`

- Responsibility: resolve whether a node should be treated as throttled for overlay purposes.
- Logic:
  - Remove ancestor-master-throttle lookups.
  - Resolve effective throttle from the first local throttle-bearing entity found by the existing parent walk, without applying ancestor multiplication.
- Interface:
  - Public function name remains unchanged.

### Change: `ui/runtime/world/node-overlays/resolveNodeOverlayThrottle.test.ts`

- Responsibility: verify overlay throttle behavior.
- Logic:
  - Remove ancestor-throttle expectations.
  - Add coverage for direct local throttle behavior and the existing cycle-safe traversal.
- Interface:
  - Test-only file. No production exports.

### Remove: `ui/runtime/world/selection/components/useParentMasterThrottle.ts`

- Responsibility after change: none. The file is removed.
- Logic after change: none.
- Interface after change: none.

### Remove: `ui/runtime/world/selection/components/RuntimeParentSection.tsx`

- Responsibility after change: none. The file is removed because it exists only to render the parent master throttle slider.
- Logic after change: none.
- Interface after change: none.

### Remove: `ui/runtime/world/selection/components/RuntimeParentSection.test.tsx`

- Responsibility after change: none. The file is removed with the component.
- Logic after change: none.
- Interface after change: none.

### Remove: `ui/runtime/world/selection/components/resolveRuntimeParentSectionData.ts`

- Responsibility after change: none. The file is removed because its payload exists only for the removed parent section.
- Logic after change: none.
- Interface after change: none.

### Remove: `ui/runtime/world/selection/components/RuntimeParentChildrenStrip.tsx`

- Responsibility after change: none. The file is removed because it is unused and exists only in the removed parent-section type family.
- Logic after change: none.
- Interface after change: none.

### Change: `ui/runtime/world/selection/selectionHydrationUtils.ts`

- Responsibility: compare selection-card hydration payloads.
- Logic:
  - Remove `parentSectionDataEqual` and all parent-section data imports.
  - Preserve all remaining equality helpers.
- Interface:
  - The file no longer exports parent-section comparison logic.

### Change: `ui/runtime/world/selection/DisplayCardView.tsx`

- Responsibility: render display cards.
- Logic:
  - Remove `useParentMasterThrottle` usage.
  - Remove `RuntimeParentSection` rendering.
  - Preserve all remaining content.
- Interface:
  - Component props remain unchanged unless downstream card data drops the parent section field.

### Change: `ui/runtime/world/selection/body/BodyCardView.tsx`

- Responsibility: connect body card view data to body card content.
- Logic:
  - Remove parent throttle hook usage.
  - Stop threading throttle props into `BodyCardContent`.
- Interface:
  - Simplify the props passed to `BodyCardContent`.

### Change: `ui/runtime/world/selection/body/BodyCardContent.tsx`

- Responsibility: render body card content.
- Logic:
  - Remove `RuntimeParentSection` rendering.
  - Remove parent-throttle props from the component contract.
- Interface:
  - Component props no longer include target throttle or change-throttle callback.

### Change: `ui/runtime/world/selection/cave/CaveCardView.tsx`

- Responsibility: render cave card content.
- Logic:
  - Remove parent throttle hook usage.
  - Remove `RuntimeParentSection` rendering.
  - Preserve all remaining cave sections.
- Interface:
  - No remaining parent-throttle props or rendering.

### Change: `ui/runtime/world/selection/job-card/PowerJobCardView.tsx`

- Responsibility: render power job cards.
- Logic:
  - Remove parent throttle hook usage.
  - Remove `RuntimeParentSection` rendering.
- Interface:
  - No remaining parent-throttle props or rendering.

### Change: `ui/runtime/world/selection/resolveDisplayCardData.ts`

- Responsibility: build display card data.
- Logic:
  - Remove `parentSectionData` from the resolved data payload.
- Interface:
  - The display card data type no longer includes `parentSectionData`.

### Change: `ui/runtime/world/selection/body/resolveBodyCardData.ts`

- Responsibility: build body card data.
- Logic:
  - Remove `parentSectionData` from the resolved data payload.
- Interface:
  - The body card data type no longer includes `parentSectionData`.

### Change: `ui/runtime/world/selection/cave/resolveCaveCardData.ts`

- Responsibility: build cave card data.
- Logic:
  - Remove `parentSectionData` from the resolved data payload.
- Interface:
  - The cave card data type no longer includes `parentSectionData`.

### Change: `ui/runtime/world/selection/job-card/resolveJobCardData.ts`

- Responsibility: build job card data.
- Logic:
  - Remove `parentSectionData` from the resolved data payload.
- Interface:
  - The power job card data type no longer includes `parentSectionData`.

### Change: `ui/runtime/world/selection/body/bodyCardTypes.ts`

- Responsibility: define body card data.
- Logic:
  - Remove the parent-section field.
- Interface:
  - The type no longer exposes `parentSectionData`.

### Change: `ui/runtime/world/selection/cave/caveCardTypes.ts`

- Responsibility: define cave card data.
- Logic:
  - Remove the parent-section field.
- Interface:
  - The type no longer exposes `parentSectionData`.

### Change: `ui/runtime/world/selection/job-card/jobCardTypes.ts`

- Responsibility: define job card data.
- Logic:
  - Remove the parent-section field.
- Interface:
  - The type no longer exposes `parentSectionData`.

### Change: `ui/runtime/world/selection/displayCardHydration.ts`

- Responsibility: compare display card payloads for stable hydration.
- Logic:
  - Remove parent-section equality checks.
- Interface:
  - No public API change.

### Change: `ui/runtime/world/selection/body/bodyCardHydration.ts`

- Responsibility: compare body card payloads for stable hydration.
- Logic:
  - Remove parent-section equality checks.
- Interface:
  - No public API change.

### Change: `ui/runtime/world/selection/cave/caveCardHydration.ts`

- Responsibility: compare cave card payloads for stable hydration.
- Logic:
  - Remove parent-section equality checks.
- Interface:
  - No public API change.

### Change: `ui/runtime/world/selection/job-card/jobCardHydration.ts`

- Responsibility: compare job card payloads for stable hydration.
- Logic:
  - Remove parent-section equality checks.
- Interface:
  - No public API change.

### Change: `ui/runtime/world/SelectionOverlay.test.tsx`

- Responsibility: verify selection overlay rendering.
- Logic:
  - Remove assertions for `Master Throttle` UI.
- Interface:
  - Test-only file. No production exports.

### Change: `ui/runtime/world/SelectionOverlay.interaction.test.tsx`

- Responsibility: verify selection overlay interactions.
- Logic:
  - Remove parent-throttle-specific setup and expectations.
- Interface:
  - Test-only file. No production exports.

### Change: `game/systems/AssignmentOwnerValiditySystem.test.ts`

- Responsibility: verify assignment owner validity behavior.
- Logic:
  - Remove ancestor-throttle-invalid cases.
  - Preserve remaining validity coverage.
- Interface:
  - Test-only file. No production exports.

### Change: `engine/phaser/veins/veinFlowProjection.test.ts`

- Responsibility: verify vein flow projection.
- Logic:
  - Replace ancestor-throttle-based expectations with direct sink-throttle expectations.
- Interface:
  - Test-only file. No production exports.

## Acceptance criteria

- No production file references `parent_master_throttle`.
- No selection card renders `Master Throttle`.
- No production file imports `parentThrottle.ts`.
- Energy demand, assignment usability, vein projection, and node overlay throttle use only local throttle behavior.
- All parent-throttle-only data contracts are removed.

---

# Test plan summary

## Unit tests

- `tutorialModeMemory.test.ts`
- `resolveNodeOverlayModel.test.ts`
- `resolveNodeOverlayModel.waitingResource.test.ts`
- `resolveNodeOverlayThrottle.test.ts`
- `PointerSystem.test.ts` (new)
- `PointerInputController.test.ts` (new)

## Integration tests

- `useAppShellController.tutorialMode.test.tsx`
- `useAppShellController.newGame.test.tsx`
- `useResolvedNodeOverlayEntries.rebuild.test.tsx`
- `useResolvedNodeOverlayEntries.incremental.test.tsx`
- runtime notification viewport event cases

## View tests

- `MainMenuPanel.test.tsx`
- `NodeOverlayCard.test.tsx`
- `NodeOverlayViewport.screenCalloutLayer.test.tsx`
- selection overlay tests after parent-section removal

## Mandatory test assertions by change

### Node overlay values toggle

- Default off on cold load.
- Persisted on/off state is reflected.
- Toggling updates persisted state.
- Values are not rendered when off.
- Overlay models omit value fields when off.
- Entry cache rebuilds when value-toggle state changes.

### Tutorial mode

- Missing runtime world state falls back to stored mode.
- New-game restore reapplies stored mode `0` rather than defaulting to `1`.

### Toast timer removal

- Event notifications still render and auto-dismiss.
- No countdown text is present.

### Callout layering

- Screen callouts mount in the new topmost portal.
- Runtime/node callouts mount in the new topmost portal.

### Pointer pause behavior

- Hold duration uses wall-clock semantics.
- Pickup cadence uses wall-clock semantics.
- Paused runtime path steps once through the existing pause-preserving runtime mechanism.

### Parent throttle removal

- No `Master Throttle` UI remains.
- No `parent_master_throttle` dependency remains in production logic.
- Effective demand/usability/flow reflect direct throttle only.

---

# Rollout sequence

1. Implement the node overlay values toggle end to end, including the resolver/type/cache changes.
2. Fix tutorial mode extraction fallback and update the session tests.
3. Remove the runtime notification timer UI and timer-specific tests.
4. Add the new callout portal layer and migrate screen/runtime callouts to it.
5. Convert pointer timing to wall-clock semantics and make paused input step through the runtime correctly.
6. Remove the parent master throttle feature completely, then delete dead UI/data/test paths.
7. Run the touched unit, integration, and view suites.

## Completion condition

The work is complete only when:

- all six behavior changes match the contracts above,
- no removed feature references remain in production code,
- no obsolete timer or parent-throttle tests remain,
- the touched suites are green.
