# LLD — Runtime Clock and Notification UI Optimization

## 1. Purpose

Define the implementation required to remove avoidable UI-driven frame cost from:

- runtime time controls / clock
- runtime ongoing notifications
- runtime transient event notifications

The design must preserve current gameplay behavior and UI semantics while changing the reactivity model so the UI does not degrade runtime framerate.

---

## 2. Why

## 2.1 Current clock hot path

### Observed implementation

`src/ui/runtime/status/RuntimeClock.tsx`

- renders the clock readout and all control buttons in one component
- calls both `useRuntimeClockTime()` and `useRuntimeClockControls()`

`src/ui/runtime/status/useRuntimeClock.ts`

- `useRuntimeClockTime()` subscribes through `useRuntimeRevisionToken(...)` with:
    - `includeFrameRevision: true`
- therefore the component that calls the hook is invalidated on frame updates

### Cost consequence

Because `RuntimeClock.tsx` owns the frame-driven timer hook, the entire clock subtree rerenders on frame updates even though only the time readout changes.

This fan-out is unnecessary.

### Additional clock inefficiency

`useRuntimeClockControls()` installs a global `keydown` listener inside an effect that depends on callbacks derived from `runtime`, `status`, `timeScale`, `play`, `pause`, and `setTimeScale`.

That means the listener is repeatedly removed and re-added as those dependencies change.

This is unnecessary churn.

---

## 2.2 Current notification hot path

### Observed implementation

`src/ui/runtime/notifications/useRuntimeNotificationViewportState.ts`

- resolves the active runtime
- keeps `ongoingItems` in React state
- starts a `setInterval(..., 250)` loop
- on every interval tick it:
    - calls `resolveOngoingRuntimeNotifications(runtime)`
    - calls `runtimeNotificationStore.getState().sweepExpiredEvents(Date.now())`

`src/ui/runtime/notifications/RuntimeNotificationEventList.tsx`

- computes `Auto-dismiss mm:ss` during render with `Date.now()`
- the countdown changes only because the viewport is being repainted by the polling loop

`src/ui/runtime/notifications/runtimeNotificationStore.ts`

- event expiry is pull-based via `sweepExpiredEvents(nowMs)`
- expiry is not self-scheduled by the store

### Cost consequence

The notification viewport performs background work even when nothing meaningful changed:

- ongoing notification derivation runs every 250 ms
- entity scanning for cold/hungry counts runs every 250 ms
- event expiry sweep runs every 250 ms
- countdown freshness for one text label forces viewport-wide repaint behavior

This is unnecessary polling.

---

## 2.3 Existing mechanisms already available in codebase

The codebase already contains the mechanisms needed to fix this without inventing a new architecture:

- `useRuntimeRevisionToken(...)`
- `useImperativeRuntimeDerivedValue(...)`
- runtime invalidation scopes and mutation publication in `RuntimeInvalidationService`
- Zustand store for transient event items in `runtimeNotificationStore`

The optimization must reuse these existing mechanisms.

---

## 3. Goals

1. Keep runtime clock behavior unchanged.
2. Keep runtime notification behavior unchanged.
3. Eliminate viewport-level notification polling.
4. Eliminate clock subtree frame-driven rerender fan-out.
5. Update ongoing notifications only after runtime mutation publication, not by interval polling.
6. Update transient countdown text only inside the countdown leaf, not by rerendering the viewport.
7. Remove store expiry polling and replace it with scheduled expiry at the nearest event expiration.
8. Preserve authored text, ordering, click behavior, animation direction, and dismissal semantics.

---

## 4. Non-goals

The following are explicitly out of scope:

- changing notification copy
- changing notification colors or authored data
- changing toast TTL value
- changing notification ordering rules
- changing ongoing-card click behavior
- changing event aggregation rules
- changing visual styles, tone mapping, or animation choices
- changing runtime invalidation engine behavior

This LLD addresses reactivity and update boundaries only.

---

## 5. Design summary

## 5.1 Clock

Split the current monolithic `RuntimeClock` into:

- a shell component that owns visibility / layout only
- a timer leaf that owns the frame-driven readout only
- a controls leaf that owns play/pause and time-scale buttons only

The timer leaf remains the only clock component allowed to observe frame invalidation.

The controls leaf must not observe frame invalidation.

The global hotkey listener must be registered once per mount and read current values from refs, not by re-registering on routine state changes.

---

## 5.2 Ongoing notifications

Remove the polling viewport state hook.

Derive ongoing notifications from runtime invalidation using `useImperativeRuntimeDerivedValue(...)`:

- subscribe to mutation publication, not to a timer
- recompute derived ongoing descriptors only when runtime mutation scopes fire
- rerender the ongoing list only when the derived descriptor array actually changed

This ensures ongoing notifications update at runtime mutation boundaries rather than on a fixed interval.

---

## 5.3 Transient event notifications

Move event expiry ownership into `runtimeNotificationStore`:

- the store schedules one timeout for the nearest `expiresAtMs`
- when the timeout fires, the store removes expired items and schedules the next timeout if needed
- no React component may poll the store for expiry

Move the dismiss countdown into a self-contained leaf component:

- each visible event card renders a timer leaf
- the timer leaf updates only its own label
- the event list, viewport, and unrelated cards must not rerender to keep the countdown fresh

---

## 6. File-by-file design

## 6.1 `src/ui/runtime/status/RuntimeClock.tsx` — change

### Responsibility

Own only:

- clock visibility
- clock shell layout
- composition of child leaves

It must not own any frame-driven readout state.

### Logic

- Keep the existing `useActiveRuntimeAttention()` visibility behavior.
- Preserve the existing animated shell behavior.
- Render `RuntimeClockTimer` and `RuntimeClockControls` inside the existing shell.

### Interface

- Public component name remains `RuntimeClock`.
- No props are added.
- DOM accessibility label remains `Runtime clock`.

### Contract

- The whole clock may still hide/show as it does today.
- Only the timer leaf may update on frame cadence.
- Controls must rerender only when their own inputs change.

---

## 6.2 `src/ui/runtime/status/RuntimeClockTimer.tsx` — add

### Responsibility

Render the formatted runtime time readout only.

### Logic

- Call `useRuntimeClockTime()`.
- Render the existing `ClockReadout` element.
- No buttons, no hotkeys, no control state.

### Interface

- New internal component.
- No props.
- Returns the styled readout span.

### Contract

- It is the only clock component allowed to observe frame revision updates.
- It must preserve the current formatted time text.
- It must not read or render control state.

---

## 6.3 `src/ui/runtime/status/RuntimeClockControls.tsx` — add

### Responsibility

Render play/pause and time-scale buttons only.

### Logic

- Call `useRuntimeClockControls()`.
- Render the existing play/pause button.
- Render the existing time-scale button set using the current scale list.
- Preserve button labels, pressed state, and tutorial-marking side effects.

### Interface

- New internal component.
- No props.

### Contract

- It must not call `useRuntimeClockTime()`.
- It must not subscribe to frame invalidation.
- It must preserve all existing button semantics and hotkeys.

---

## 6.4 `src/ui/runtime/status/useRuntimeClock.ts` — change

### Responsibility

Provide the existing clock hooks while removing unnecessary listener churn.

### Logic

#### `useRuntimeClockTime()`

Keep its external contract unchanged.

It continues to:

- resolve the runtime from the store
- observe frame revision
- write formatted text into a span ref

No behavior change is allowed here.

#### `useRuntimeClockControls()`

Keep its returned shape unchanged:

- `status`
- `timeScale`
- `togglePlayback`
- `handleScaleToggle`

Change internal hotkey registration as follows:

- maintain refs to the latest `runtime`, `status`, `timeScale`, `play`, `pause`, and `setTimeScale`
- register one `keydown` listener for the mounted hook instance
- the listener reads the latest refs
- the listener is not removed and re-added for normal status/time-scale changes

The tutorial-marking behavior for time-scale changes remains exactly as implemented today.

### Interface

No public hook signature changes.

### Contract

- Number hotkeys and spacebar behavior remain unchanged.
- Typing into editable elements still blocks hotkeys.
- Time-control tutorial completion behavior remains unchanged.
- Listener registration becomes stable per mount.

---

## 6.5 `src/ui/runtime/notifications/RuntimeNotificationViewport.tsx` — change

### Responsibility

Own only viewport layout and tutorial visibility for the notification layer.

### Logic

- Keep `useActiveRuntimeAttention()` visibility behavior.
- Remove dependency on `useRuntimeNotificationViewportState()`.
- Render the anchored stacks directly:
    - bottom-left ongoing list component
    - top-left event list component

The viewport itself must not own ongoing notification state, transient event state, polling timers, or countdown logic.

### Interface

- Public component name remains `RuntimeNotificationViewport`.
- No props are added.
- ARIA label remains `Runtime notifications`.

### Contract

- Visibility behavior remains unchanged.
- Anchor positions remain unchanged.
- The viewport becomes a layout shell only.

---

## 6.6 `src/ui/runtime/notifications/useRuntimeNotificationViewportState.ts` — delete

### Responsibility being removed

This file currently mixes:

- runtime resolution
- ongoing-notification derivation
- event-store polling
- expiry sweeping
- tutorial visibility aggregation

That design is the polling hotspot.

### Replacement

Its responsibilities are split into:

- layout visibility in `RuntimeNotificationViewport.tsx`
- ongoing derivation in `useRuntimeOngoingNotifications.ts`
- transient event selection in `RuntimeNotificationEventList.tsx`
- store-owned expiry scheduling in `runtimeNotificationStore.ts`

### Contract

This file must be removed from runtime notification render flow.

---

## 6.7 `src/ui/runtime/notifications/useRuntimeOngoingNotifications.ts` — add

### Responsibility

Resolve ongoing notification descriptors from runtime state without polling.

### Logic

- Resolve runtime the same way the deleted viewport hook does today:
    - prefer `WorldInteractionContext.runtime`
    - otherwise fall back to `useRuntimeStore(state => state.runtime)`
- Use `useImperativeRuntimeDerivedValue(...)`.
- Subscribe with this dependency plan:
    - `entityIds: ["sys_world"]`
    - `includeEntityListRevision: true`
    - `includeBlueprintRevision: false`
    - `includeMutationRevision: true`
    - `includeFrameRevision: false`
- Use `resolveOngoingRuntimeNotifications(runtime)` as the resolver.
- Use a dedicated equality function so the hook rerenders only when the descriptor array changed semantically.

### Interface

- Export one hook: `useRuntimeOngoingNotifications(): RuntimeOngoingDescriptor[]`

### Contract

- No interval polling.
- No `Date.now()`-driven updates.
- Recompute only after runtime mutation publication or relevant invalidation.
- Rerender only when the resolved ongoing descriptor list actually changed.

### Rationale for dependency plan

This is grounded in the current invalidation implementation:

- ongoing notifications depend on `sys_world` state (`purge_active`, `suspicion`)
- ongoing notifications also depend on body mutations and entity-list changes (`hungry_bodies`, `cold_bodies`)
- `includeMutationRevision: true` is required so body-state changes are observed without polling
- `includeFrameRevision: false` is required so ongoing notifications do not update every frame

---

## 6.8 `src/ui/runtime/notifications/areRuntimeOngoingDescriptorsEqual.ts` — add

### Responsibility

Provide semantic equality for `RuntimeOngoingDescriptor[]`.

### Logic

Two descriptor arrays are equal iff all of the following are true:

- same length
- same order
- each item has the same:
    - `key`
    - `kind`
    - `guidanceId`
    - `priority`
- and, for kind-specific fields:
    - `count` for `hungry_bodies` and `cold_bodies`
    - `levelText` and `levelColor` for `suspicion`

### Interface

- Export one pure function.

### Contract

- No React dependency.
- No runtime access.
- Used only to suppress rerenders when ongoing descriptors did not meaningfully change.

---

## 6.9 `src/ui/runtime/notifications/RuntimeNotificationOngoingList.tsx` — change

### Responsibility

Render the ongoing-notification stack only.

### Logic

- Remove the `items` prop.
- Resolve items internally using `useRuntimeOngoingNotifications()`.
- Keep `useWorldInteraction()` for click handling runtime access.
- Preserve existing display formatting via `formatOngoingRuntimeNotificationText(...)`.
- Preserve click behavior via `handleRuntimeOngoingClick(...)`.
- Preserve `slideUp` animation and bottom-left stack direction.

### Interface

- Remove the `items` prop from the component interface.
- Public component name remains unchanged.

### Contract

- The ongoing list rerenders only when ongoing items change.
- It does not depend on transient event state.
- It does not depend on a polling viewport hook.

---

## 6.10 `src/ui/runtime/notifications/RuntimeNotificationEventList.tsx` — change

### Responsibility

Render the transient event stack only.

### Logic

- Remove the `items` prop.
- Read event items directly from `useRuntimeNotificationStore(selectEventItems)`.
- Remove `formatDismissLabel(...)` from this file.
- For each event card, render a `RuntimeNotificationDismissTimer` leaf.
- Preserve click behavior via `handleRuntimeEventClick(...)`.
- Preserve existing `slideDown` animation.
- Preserve newest-first rendering order by consuming the store order directly.
- Remove all array cloning for render.

### Interface

- Remove the `items` prop from the component interface.
- Public component name remains unchanged.

### Contract

- The event list rerenders only when event items change.
- Countdown freshness must not require list rerender.
- Ordering remains newest-first.

---

## 6.11 `src/ui/runtime/notifications/RuntimeNotificationDismissTimer.tsx` — add

### Responsibility

Render and update one `Auto-dismiss mm:ss` label for one event card.

### Logic

- Accept `expiresAtMs`.
- Render the same textual format currently used by `RuntimeNotificationEventList.tsx`.
- Maintain its own timer lifecycle.
- Schedule the next update at the next second boundary.
- Stop scheduling once the remaining time reaches zero.
- Clean up scheduled work on unmount.

This component updates only itself.

### Interface

- Props:
    - `expiresAtMs: number`

### Contract

- It must not mutate store state.
- It must not own dismissal.
- It must not trigger viewport-wide rerenders.
- It must preserve the current `Auto-dismiss mm:ss` text contract.

---

## 6.12 `src/ui/runtime/notifications/RuntimeNotificationCard.tsx` — change

### Responsibility

Render one notification card frame and optional secondary footer content.

### Logic

Change the secondary footer prop from a string-only label to renderable content so the dismiss timer can be a self-contained leaf component.

The component must:

- keep current frame, tone, and clickable behavior
- keep current primary text rendering behavior
- render optional dismiss footer content in the existing footer slot

### Interface

Change the secondary footer prop to:

- `dismissContent?: React.ReactNode`

All current call sites must be updated to use this prop.

### Contract

- Visual placement of the footer row remains unchanged.
- Event cards can supply a live timer component.
- Ongoing cards continue to omit footer content.

---

## 6.13 `src/ui/runtime/notifications/runtimeNotificationStore.ts` — change

### Responsibility

Remain the single source of truth for transient event items and now also own event expiry scheduling.

### Logic

Remove polling ownership from the viewport and move expiry ownership into the store.

#### Required internal behavior

The store module must own one module-local expiry timer handle.

When event items change via:

- `applyEventBatch(...)`
- `dismissEvent(...)`
- `reset()`

it must:

- clear any stale scheduled timeout
- compute the nearest unexpired `expiresAtMs`
- schedule exactly one timeout for that timestamp if any items remain

When the timeout fires:

- remove all items whose `expiresAtMs <= now`
- reschedule the next timeout if unexpired items remain

#### Required batching behavior

`applyEventBatch(...)` must continue to:

- aggregate by `aggregationKey`
- increment `count`
- refresh `updatedAtMs`
- refresh `expiresAtMs`
- sort newest-first by `updatedAtMs`

Before merging, it must discard already-expired items based on the provided `nowMs` so stale entries are not carried forward.

#### Public interface

Public state interface after change:

- `eventItems`
- `applyEventBatch(batch, nowMs?)`
- `dismissEvent(aggregationKey)`
- `reset()`

`selectEventItems` remains exported.

`sweepExpiredEvents` must be removed from the public store API because expiry is no longer externally driven.

### Contract

- Event auto-dismiss still occurs at the same TTL.
- No React component may call an interval-based sweep.
- Store expiry scheduling is authoritative.
- There is never more than one active store expiry timeout.

---

## 7. Update flow after change

## 7.1 Clock update flow

1. Runtime frame invalidation occurs.
2. Only `RuntimeClockTimer` observes that frame-driven token.
3. The readout text updates.
4. `RuntimeClockControls` does not rerender unless `status` or `timeScale` changes.
5. Global hotkey listener remains attached once and reads latest state from refs.

---

## 7.2 Ongoing notification update flow

1. Runtime applies commands and publishes invalidation summary.
2. `useRuntimeOngoingNotifications()` receives invalidation.
3. It recomputes `resolveOngoingRuntimeNotifications(runtime)`.
4. It compares the new descriptor array against the previous array.
5. It rerenders the ongoing list only if the descriptor list changed semantically.

No interval is involved.

---

## 7.3 Transient event update flow

### Event creation/update

1. Runtime telemetry adapter resolves runtime notification events.
2. `runtimeNotificationStore.applyEventBatch(...)` merges them.
3. Store schedules one timeout for the nearest `expiresAtMs`.
4. `RuntimeNotificationEventList` rerenders because event items changed.
5. Each visible event card renders its own `RuntimeNotificationDismissTimer`.

### Countdown refresh

1. A countdown leaf reaches its next local update boundary.
2. Only that leaf updates its text.
3. The list and viewport do not rerender solely to refresh countdown text.

### Event expiry

1. Store-owned timeout fires at the nearest event expiration.
2. Store removes expired entries.
3. Store schedules the next expiration timeout if needed.
4. The event list rerenders because its source store items changed.

No viewport polling is involved.

---

## 8. Tests

All tests must follow the existing project testing standards:

- behavior-focused
- readable Given / When / Then structure
- deterministic fake timers where time is involved
- no implementation-noise assertions unless required by the contract

## 8.1 `src/ui/runtime/status/RuntimeClock.test.tsx` — change

### Purpose

Keep the existing behavior contract for `useRuntimeClockControls()`.

### Required assertions

- tutorial is marked seen when time scale changes
- tutorial is not marked on play/pause toggle
- selecting the already-selected scale is ignored
- paused runtime still flushes immediately after time-scale change
- numeric hotkeys still map to supported time scales
- editable targets still block hotkeys

### Additional assertion

Add one test that confirms the keydown listener remains functional across status and time-scale changes without requiring re-registration behavior in the test arrangement.

The test must verify behavior, not implementation details such as exact effect dependency arrays.

---

## 8.2 `src/ui/runtime/status/RuntimeClockTimer.test.tsx` — add

### Purpose

Verify the extracted timer leaf preserves display behavior.

### Required assertions

- renders the formatted runtime time
- updates when runtime frame invalidation advances
- does not require control buttons to be present

This test must use the existing runtime test double / invalidation utilities rather than inventing a new timer harness.

---

## 8.3 `src/ui/runtime/notifications/useRuntimeOngoingNotifications.test.tsx` — add

### Purpose

Verify the ongoing-notification hook is mutation-driven, not polling-driven.

### Required assertions

- initial resolved descriptors are returned correctly
- a mutation publication that changes the derived ongoing descriptors updates the hook result
- frame-only invalidation does not update the hook result
- unchanged derived descriptors do not produce a changed returned value

Use `createRuntimeTestDouble(...)` and runtime invalidation publication already present in test utilities.

---

## 8.4 `src/ui/runtime/notifications/runtimeNotificationStore.test.ts` — change

### Purpose

Verify store-owned expiry scheduling and aggregation.

### Required assertions

- matching aggregation keys still merge and refresh expiry
- distinct aggregation keys remain separate
- the store auto-removes expired events when fake timers reach the expiry timestamp
- extending an existing event refreshes its scheduled expiry correctly
- `dismissEvent(...)` reschedules to the next nearest expiration when other items remain
- `reset()` clears items and clears any scheduled expiry work

No test may call `sweepExpiredEvents(...)` after this change because that API is removed.

---

## 8.5 `src/ui/runtime/notifications/RuntimeNotificationDismissTimer.test.tsx` — add

### Purpose

Verify countdown updates are self-contained.

### Required assertions

- renders `Auto-dismiss mm:ss` from `expiresAtMs`
- updates at the next second boundary
- clamps at `0:00`
- cleans up scheduled work on unmount

Use fake timers.

---

## 8.6 `src/ui/runtime/notifications/RuntimeNotificationViewport.events.cases.tsx` — change

### Purpose

Preserve event-list behavior after polling removal.

### Required assertions

- ongoing and event stacks still render together
- clicking an event still dismisses it
- countdown text still changes over time
- event still auto-dismisses at TTL expiry
- newest-first ordering remains intact

The test must no longer rely on viewport polling behavior.

---

## 8.7 `src/ui/runtime/notifications/RuntimeNotificationViewport.ongoingClick.cases.tsx` — change only if needed

### Purpose

Preserve ongoing-card click behavior after list ownership changes.

### Required assertions

- clicking an ongoing card still enqueues `SHOW_NOTIFICATION_ABILITY_GUIDANCE`
- paused runtimes still flush immediately

Behavior remains the same; only fixture wiring may change.

---

## 8.8 Existing pure resolver tests — unchanged authority

The following pure-logic tests remain authoritative and must stay green:

- `resolveOngoingRuntimeNotifications.test.ts`
- `resolveOngoingRuntimeNotifications.timeControls.test.ts`
- existing runtime event resolution tests

These tests already cover the business rules that this LLD intentionally does not change.

---

## 9. Acceptance criteria

Implementation is complete only when all of the following are true:

1. `RuntimeClock` no longer owns both frame-driven timer and controls in one component.
2. Clock controls do not rerender because the time readout updated.
3. Notification viewport no longer contains any interval polling.
4. `useRuntimeNotificationViewportState.ts` is removed from the render path.
5. Ongoing notifications update from runtime invalidation, not from interval polling.
6. Event countdown updates do not require event-list or viewport rerender.
7. Event expiry is owned and scheduled by `runtimeNotificationStore`.
8. Transient event order remains newest-first.
9. Ongoing click guidance behavior remains unchanged.
10. Existing visible strings and authored data interpretation remain unchanged.
11. All tests pass.
12. No lint / Sonar issues are introduced.

---

## 10. Implementation order

1. Extract `RuntimeClockTimer` and `RuntimeClockControls`.
2. Stabilize hotkey listener inside `useRuntimeClockControls()`.
3. Add `RuntimeNotificationDismissTimer` and widen `RuntimeNotificationCard` footer content type.
4. Move expiry scheduling into `runtimeNotificationStore`.
5. Add `useRuntimeOngoingNotifications()` and descriptor equality helper.
6. Remove `useRuntimeNotificationViewportState.ts` from render flow.
7. Make event and ongoing lists own their own data sources.
8. Update tests.

This order keeps the system working after each step and limits blast radius.

