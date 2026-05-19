# LLD — Node Overlay UI Update Rate Decoupling

## 1. Scope

This document specifies the low-level design for detaching **node overlay value-text updates** from simulation mutation frequency in the current codebase.

The design is intentionally narrow:

- it preserves the underscore-version selection optimization already implemented
- it does **not** replace invalidation-driven semantic overlay selection
- it moves only **volatile node overlay value text** off the simulation mutation rate and onto a fixed wall-clock cadence
- it reuses the existing `entity-state-link` provider, runtime invalidation reader, imperative DOM update pattern, and node overlay entry/model caches

This document contains no code. Pseudocode is provided where required.

---

## 2. Problem Statement

### 2.1 Current post-selection-optimization behavior

In the current codebase, semantic node overlay selection is already incremental:

- `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.ts`
  - rebuilds on runtime / world / entity-list / blueprint changes
  - patches only `getLastChangedEntityIds()` on mutation changes
- `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`
  - projects node overlay models only when runtime, entry array reference, viewport size, or camera revision changes
- `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`
  - composes node models with guidance/callout/cave-status data

This reduced the broad semantic rebuild problem and restored 120 FPS when only node overlays are visible at normal speed.

### 2.2 Remaining problem

The remaining volatile field is **node overlay value text**.

The current semantic entry resolvers eagerly compute `valueText`:

- `resolveCycleOverlayEntry(...)` in `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts`
- `resolveAssignmentOverlayEntry(...)` in the same file
- `resolveStorageOverlayEntry(...)` in the same file

That eager text is then treated as semantic/render identity:

- `nodeOverlayEntryEqual(...)` compares `valueText`
- `nodeOverlayModelEqual(...)` inherits that comparison
- `nodeOverlayCardRenderEqual(...)` compares `valueText`
- `NodeOverlayCard.tsx` renders `model.valueText` directly through React

As a result, faster simulation speed still produces more frequent React-visible changes even though semantic selection is incremental.

### 2.3 Why simulation speed still affects FPS

The current text formatters are wall-clock unfriendly when driven directly by simulation mutations:

- `formatCountdownText(...)` and `formatDurationMs(...)` in `src/ui/runtime/world/selection/ability-display/abilityDisplay.utils.ts`
- sub-minute countdowns are rendered at tenths precision

At higher simulation speed, the underlying entity state changes faster in wall-clock time, so the formatted text string changes more often in wall-clock time. Because the text string is part of entry/model/render equality, React still rerenders more often.

### 2.4 Desired outcome

Node overlay value text must update at a fixed wall-clock cadence and must no longer be coupled to the raw mutation rate.

The design target is:

- semantic overlay structure remains invalidation-driven
- progress bars remain on the existing imperative mutation-driven path
- value text moves to a fixed **33 ms** cadence (~30 Hz)
- text updates are imperative DOM writes and do not require React rerenders

---

## 3. Existing Constraints to Preserve

The implementation must preserve all of the following:

1. `useResolvedNodeOverlayEntries(runtime, enabled)` remains the semantic selection hook.
2. `useNodeOverlayNodeModels(rootRef, enabled)` remains the projection hook.
3. `useNodeOverlayViewportData(rootRef, enabled)` remains the viewport aggregation hook.
4. `EntityStateLinkProvider` remains the provider wrapping `NodeOverlayViewport` in `RuntimeShellCanvas.tsx`.
5. `useEntityBarRef(...)` and `syncEntityBarBindings(...)` continue to work exactly as they do now.
6. `resolveNodeOverlayModel(...)` remains the only authority for whether an entity has a node overlay.
7. Node overlay ordering remains driven by the current entry index and model projection path.
8. No fixed-cadence loop is introduced for semantic selection.
9. No change is made to guidance, runtime callouts, cave status positioning, or camera projection logic.
10. No change is made to selection overlays, cave cards, or the existing `useLiveNumericValue` cave path.

---

## 4. Design Summary

### 4.1 High-level approach

The implementation splits node overlay value display into two categories:

1. **Static value text**
   - semantic text that must remain part of the overlay model
   - examples: cycle fallback states such as `"No power"` and `"Idle"`; assignment idle empty text

2. **Live value text**
   - fast-changing text that must not be part of semantic/model/render equality
   - examples: active cycle countdown, active assignment remaining duration, storage fraction text

Static value text stays in the node overlay model.

Live value text moves to a new imperative **text-binding** path inside `entity-state-link`, parallel to the existing bar-binding path.

### 4.2 Update-rate rule

All live node overlay text bindings update on a fixed **33 ms** interval.

No live node overlay text binding may write to the DOM outside these moments except for the immediate first sync that occurs during registration.

### 4.3 Why this is the correct layer

The current underscore implementation already fixed semantic entry selection.

The remaining simulation-rate coupling is not caused by entry discovery; it is caused by treating volatile text output as semantic/render state. Therefore the next change must be at the **display binding** layer, not at the semantic selection layer.

### 4.4 Why `entity-state-link` is the correct reuse point

The current code already has all of these properties in `entity-state-link`:

- a provider around the runtime HUD (`RuntimeShellCanvas.tsx`)
- entity-scoped registry management
- invalidation-driven dirty checking using `getLastChangedEntityIds()`
- imperative DOM mutation for progress bars
- `useLayoutEffect`-based registration hooks

This design extends that existing mechanism rather than introducing a second parallel provider for the same runtime HUD.

---

## 5. Non-Goals

The following are explicitly out of scope for this LLD:

1. Any change to node overlay selection/index rebuild rules.
2. Any change to `useResolvedNodeOverlayEntries(...)` rebuild-vs-patch logic.
3. Any change to `useNodeOverlayViewportData(...)` invalidation token composition.
4. Any change to bar update cadence.
5. Any change to countdown formatting precision.
6. Any change to overlay position updates or DOM layout strategy.
7. Any generic framework for all live text in the UI.
8. Any optimization of tutorial guidance, runtime callouts, cave status, or runtime clock.

This LLD solves only the node overlay live text rate problem.

---

## 6. Behavioral Contract

After implementation, all of the following must be true:

1. A node overlay whose visible value is represented by a live text binding does **not** rerender solely because the displayed text string changes.
2. A live node overlay text value updates no more frequently than once per 33 ms in wall-clock time.
3. A live node overlay text value is synchronized immediately when the binding is first registered, before the first cadence tick is needed for correctness.
4. The cadence loop updates only bindings whose source entities are dirty, unless a full refresh is required.
5. A dirty set is derived from `runtime.getInvalidation()?.getLastChangedEntityIds()`.
6. A runtime swap or entity-list revision change causes a full live-text refresh.
7. A mutation that changes only the current displayed value of a live text binding does **not** replace the corresponding semantic node overlay entry object.
8. Static node overlay states such as `"No power"`, `"Idle"`, and assignment idle empty text remain semantic/model data and continue to participate in visibility filtering.
9. Storage fraction text, assignment remaining-duration text, and active cycle countdown text all use the new live-text path.
10. Progress bars remain on the current `useEntityBarRef(...)` path and are unchanged by this work.

---

## 7. Detailed Design

## 7.1 New concept: entity text binding

A new binding type is added to `entity-state-link` for imperative text content updates.

### 7.1.1 Exported type: `EntityTextBinding`

`EntityTextBinding` is a discriminated union. It is exported from `src/ui/runtime/world/entity-state-link/types.ts`.

#### Variant A — compact fraction

Used for storage overlays.

Fields:

- `id: string`
- `entityId: string`
- `kind: "compact-fraction"`
- `valuePath: string`
- exactly one of:
  - `maxPath: string`
  - `maxValue: number`

Display contract:

- Reads current and max from the bound entity
- Formats using `formatCompactFraction(current, max)`

#### Variant B — remaining duration

Used for active assignment overlays.

Fields:

- `id: string`
- `entityId: string`
- `kind: "remaining-duration-ms"`
- `valuePath: string` (current progress path)
- `maxPath: string` (duration path)

Display contract:

- Reads progress and duration from the bound entity
- Computes `remaining = max(duration - progress, 0)`
- Converts to milliseconds using the current assignment contract (`remaining * 1000`)
- Formats using `formatDurationMs(...)`

#### Variant C — cycle countdown

Used for active cycle overlays.

Fields:

- `id: string`
- `entityId: string`
- `kind: "cycle-countdown"`

Display contract:

- Resolves text from the current entity and runtime using the same logic currently used by `resolveCycleOverlayEntry(...)`
- Reuses `resolveJobCycleStatus(entity, runtime)`
- Reuses `formatCountdownText(...)`
- Reuses `resolvePowerSink(entity)` for fallback text when needed

### 7.1.2 Equality contract for `EntityTextBinding`

A new equality helper must compare text bindings by identity-defining fields only.

Required rules:

- bindings of different `kind` are not equal
- `id` and `entityId` must match
- for `compact-fraction`, `valuePath`, `maxPath`, and `maxValue` identity must match
- for `remaining-duration-ms`, `valuePath` and `maxPath` must match
- for `cycle-countdown`, `entityId` is sufficient after `id`/`kind` match

The current displayed string is **not** part of binding equality.

---

## 7.2 Node overlay value representation split

### 7.2.1 Current problem

`ResolvedNodeOverlayEntry` currently has a single field:

- `valueText: string`

That field mixes two different responsibilities:

- semantic/static state
- live/volatile display state

This is the coupling that must be removed.

### 7.2.2 New contract

`ResolvedNodeOverlayEntry` and `ResolvedNodeOverlayModel` must represent value display as an exclusive union:

#### Static value variant

Fields:

- `valueText: string`
- `valueBinding` is absent

#### Live value variant

Fields:

- `valueBinding: EntityTextBinding`
- `valueText` is absent

This contract is mandatory.

At no point may a node overlay entry/model contain both fields or neither field.

### 7.2.3 Mapping rules by overlay kind

#### Storage overlay

Current behavior:

- eager `valueText` via `resolveStorageAbilityBars(...)[0].valueText`

New behavior:

- `label` remains semantic
- `bar` remains semantic binding identity plus initial numeric snapshot
- `valueBinding` is `compact-fraction`
- `valueText` is absent

#### Active assignment overlay

Current behavior:

- eager `valueText` via `formatDurationMs((duration - progress) * 1000)`

New behavior:

- `label = "Time to completion"`
- `bar` remains current bar binding
- `valueBinding` is `remaining-duration-ms`
- `valueText` is absent

#### Idle assignment overlay

Behavior remains semantic/static:

- `label = "Idle"`
- `valueText = ""`
- `valueBinding` is absent

#### Active cycle overlay

Current behavior:

- eager `valueText` via `formatCountdownText(ticksRemaining)`

New behavior:

- `label = "Next cycle"`
- `bar` remains current bar binding
- `valueBinding` is `cycle-countdown`
- `valueText` is absent

#### Static cycle fallback overlay

Behavior remains semantic/static:

- if current logic resolves `"No power"`, use static `valueText`
- if current logic resolves `"Idle"`, use static `valueText`
- `valueBinding` is absent

This preserves the current visibility-filter contract for blackout cycle overlays.

---

## 7.3 Imperative live-text sync model

### 7.3.1 Registration model

The existing `EntityStateLinkProvider` is extended to manage two registries:

1. bar registry (existing behavior)
2. text registry (new behavior)

Text binding registration is performed through a new hook, `useEntityTextRef(binding)`.

That hook mirrors the existing `useEntityBarRef(binding)` pattern:

- it returns a ref to the text element
- it registers the binding in `useLayoutEffect`
- it unregisters on cleanup

### 7.3.2 Immediate first sync rule

When a text binding is registered and `runtime` is non-null, the provider must immediately synchronize that specific text element once.

This initial sync must happen before the cadence loop is required for correctness.

This prevents a blank or stale text node on first mount.

### 7.3.3 Dirty tracking rules

The provider tracks dirty text entities using runtime invalidation.

Required rules:

1. On runtime swap, mark **all** registered text bindings dirty.
2. On entity-list revision change, mark **all** registered text bindings dirty.
3. On mutation revision change, union `getLastChangedEntityIds()` into the dirty set, but only for entity IDs that have at least one registered text binding.
4. On unrelated mutations, do not mark unrelated text bindings dirty.

### 7.3.4 Cadence loop

A single cadence loop exists inside `EntityStateLinkProvider` for text bindings only.

Cadence:

- fixed interval: **33 ms**

Lifecycle rules:

- start the interval when `runtime` is non-null and the text registry is non-empty
- stop the interval when `runtime` becomes null, the provider unmounts, or the registry becomes empty
- do not create one timer per text binding

### 7.3.5 Text sync rules

On each cadence tick:

1. If a full refresh is pending, synchronize all registered text bindings.
2. Otherwise synchronize only bindings whose `entityId` is currently dirty.
3. For each synchronized binding, compute the next text using the binding’s resolver contract.
4. Write `element.textContent = nextText` only if the current DOM text differs.
5. Clear the dirty set or full-refresh flag that was consumed by the tick.

### 7.3.6 Missing entity rule

If a synchronized text binding’s entity no longer exists, the binding sync must set the bound element’s text content to the empty string.

The subsequent semantic overlay pass is still responsible for removing the overlay from React.

This rule prevents stale live text from persisting during the one-tick overlap between mutation and unmount.

---

## 7.4 Equality changes required for selection/render stability

### 7.4.1 `nodeOverlayEntryEqual(...)`

Current behavior incorrectly compares the eagerly formatted `valueText` for all overlays.

New behavior:

- compare shared semantic fields (`entityId`, `kind`, `label`, `bar`)
- compare value display variant kind
- if both entries are static, compare `valueText`
- if both entries are live, compare `valueBinding` identity using the new binding equality helper
- current live text output must not participate in equality

### 7.4.2 `nodeOverlayModelEqual(...)`

Behavior remains:

- `nodeOverlayEntryEqual(...)`
- plus position equality

### 7.4.3 `nodeOverlayCardRenderEqual(...)`

New behavior mirrors the same split:

- compare semantic card fields
- compare position
- compare bar identity only (existing rule)
- compare value binding identity for live-value overlays
- compare `valueText` only for static-value overlays

This ensures the card does not rerender because the live displayed string changed.

---

## 7.5 Filtering contract

`filterVisibleNodeOverlayModels(...)` currently hides blackout cycle overlays by checking `model.valueText === "No power"`.

That rule must remain semantically correct after the value split.

Required rule:

- only static cycle overlays with `valueText === "No power"` are hidden
- live countdown overlays are never filtered using their live text output
- assignment idle filtering continues to use the semantic/static label `"Idle"`

---

## 8. File-Level Design

## 8.1 New file: `src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.ts`

### Responsibility

Own all text-binding runtime logic, parallel to `entityStateLinkRuntime.ts` for bars.

### Exports

The file must export all of the following:

1. `TEXT_SYNC_INTERVAL_MS`
   - constant value: `33`
2. `InternalTextBinding`
3. `createInternalTextBinding(binding, element)`
4. `entityTextBindingEqual(left, right)`
5. `syncEntityTextBindings(runtime, registry, entityIndex, dirtyEntityIds, forceAll)`
6. `syncSingleEntityTextBinding(runtime, binding, entityIndex)`

### Logic

#### `InternalTextBinding`

Must store:

- the exported binding identity fields
- the bound DOM element
- any prebuilt path resolvers needed for efficient sync

#### `createInternalTextBinding(...)`

Must:

- preserve binding identity fields
- attach the DOM element
- precompute path resolvers for path-based text bindings using existing path-resolver utilities where applicable

#### `entityTextBindingEqual(...)`

Must implement the exact equality contract from section 7.1.2.

#### `syncSingleEntityTextBinding(...)`

Must:

1. resolve the current entity using `runtime.getEntity(...)` if available, else fallback to the same entity-index pattern already used by bars
2. compute the next text according to binding kind
3. compare against `element.textContent`
4. write only on actual text change
5. write empty string if entity is missing

#### `syncEntityTextBindings(...)`

Must:

- support both full refresh and dirty-entity-only refresh
- never update a binding whose entity is not dirty unless `forceAll` is true
- clear and rebuild the fallback entity index exactly as needed for the sync pass, matching the current bar-runtime pattern

### Interfaces reused

This file must reuse existing helpers where already available:

- `createPathResolver(...)`
- `resolveNumericValue(...)`
- `formatCompactFraction(...)`
- `formatDurationMs(...)`
- `formatCountdownText(...)`
- `resolveJobCycleStatus(...)`
- `resolvePowerSink(...)`

No duplicate formatter logic is allowed.

---

## 8.2 New file: `src/ui/runtime/world/entity-state-link/useEntityTextRef.ts`

### Responsibility

Provide the text-binding registration hook for imperative text elements.

### Interface

Input:

- `binding: EntityTextBinding`

Output:

- `RefObject<HTMLDivElement | null>`

### Logic

The hook must:

1. read `EntityStateLinkContext`
2. create a ref
3. register the text binding in `useLayoutEffect`
4. unregister on cleanup
5. depend on the identity-defining binding fields only

The hook must mirror the structure and lifecycle guarantees of `useEntityBarRef(...)`.

---

## 8.3 Changed file: `src/ui/runtime/world/entity-state-link/types.ts`

### Responsibility

Define exported binding contracts for `entity-state-link`.

### Changes

Add:

1. `EntityTextBinding`
2. any supporting discriminated-union input types needed for `EntityTextBinding`

### Contract

The new types must be exported alongside the existing bar-binding types and must not change existing bar-binding contracts.

---

## 8.4 Changed file: `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`

### Responsibility

Manage both bar and text binding registries and coordinate runtime-driven imperative syncing.

### Interface changes

Extend the context value with:

- existing bar methods retained unchanged:
  - `register(...)`
  - `unregister(...)`
- new text methods:
  - `registerText(id, binding, element)`
  - `unregisterText(id)`

No existing bar caller may need to change.

### Internal state additions

The provider must add:

1. a text registry ref: `Map<string, InternalTextBinding>`
2. a text entity index ref for fallback lookup
3. a dirty text entity-ID set ref
4. a full-refresh flag ref for text bindings
5. text revision bookkeeping parallel to the existing bar bookkeeping
6. cadence timer lifecycle management

### Logic

#### Bar path

The current bar path must remain unchanged in behavior.

#### Text invalidation path

On each invalidation-driven provider effect:

- compute current runtime, entity-list revision, and mutation revision exactly as the provider already does for bars
- apply the dirty-tracking rules from section 7.3.3
- do **not** write text DOM updates in this invalidation effect except for initial registration

#### Text cadence path

A second effect must manage the 33 ms interval.

That effect must:

- start only when both runtime and text bindings exist
- call `syncEntityTextBindings(...)` on each interval tick
- pass `forceAll` only when a full refresh is pending
- clear consumed dirty state after each tick
- cancel the interval on cleanup or when no longer needed

#### Registration path

`registerText(...)` must:

1. create and store the internal binding
2. immediately call `syncSingleEntityTextBinding(...)` when `runtime` is present
3. not wait for the cadence loop for first correctness

#### Unregistration path

`unregisterText(...)` must remove the internal binding from the registry.

If the binding’s entity ID no longer has any text bindings registered, it must not remain in the dirty set after the next cleanup cycle.

---

## 8.5 Changed file: `src/ui/runtime/world/entity-state-link/index.ts`

### Responsibility

Export the new text-binding hook and type.

### Changes

Add exports for:

- `useEntityTextRef`
- `EntityTextBinding`

Do not remove or rename any existing exports.

---

## 8.6 Changed file: `src/ui/runtime/world/node-overlays/nodeOverlayTypes.ts`

### Responsibility

Define the node overlay semantic/model types.

### Changes

Replace the single `valueText: string` contract with an exclusive value-display union.

Required shape:

- base semantic fields remain unchanged (`entityId`, `kind`, `label`, `bar`)
- add a static-value variant with `valueText`
- add a live-value variant with `valueBinding: EntityTextBinding`

`ResolvedNodeOverlayModel` must preserve the same structure plus `position`.

### Contract

Exactly one value-display variant must be present for every entry/model.

---

## 8.7 Changed file: `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.helpers.ts`

### Responsibility

Resolve semantic node overlay entries from runtime entities.

### Changes

#### `resolveStorageOverlayEntry(...)`

Must return:

- semantic `label`
- existing bar binding
- `valueBinding` of kind `compact-fraction`
- no static `valueText`

#### `resolveAssignmentOverlayEntry(...)`

Must return:

- active assignment:
  - `label = "Time to completion"`
  - existing bar binding
  - `valueBinding` of kind `remaining-duration-ms`
  - no static `valueText`
- idle assignment:
  - `label = "Idle"`
  - `valueText = ""`
  - no `valueBinding`

The current rule that assigned entities lacking progress/duration return `null` must remain unchanged.

#### `resolveCycleOverlayEntry(...)`

Must return:

- active cycle countdown:
  - `label = "Next cycle"`
  - existing bar binding
  - `valueBinding` of kind `cycle-countdown`
  - no static `valueText`
- static fallback states:
  - `valueText = "No power"` when the current fallback logic resolves blackout
  - `valueText = "Idle"` otherwise
  - no `valueBinding`

### Identifier contract

Binding IDs must be deterministic and entity-scoped.

Required patterns:

- storage text binding ID: `node-overlay:text:storage:${entityId}`
- assignment text binding ID: `node-overlay:text:assignment:${entityId}`
- cycle text binding ID: `node-overlay:text:cycle:${entityId}`

No other ID format is allowed in this implementation.

---

## 8.8 Changed file: `src/ui/runtime/world/node-overlays/nodeOverlayComparators.ts`

### Responsibility

Define semantic, model, and card-render equality for node overlays.

### Changes

Add or inline the value-display equality logic described in section 7.4.

Required outcomes:

1. static text changes remain semantic/render changes
2. live text binding identity changes remain semantic/render changes
3. changes only to the currently displayed live text string are ignored by entry/model/card equality
4. existing bar-render rule remains unchanged: bar identity matters; live bar current/max snapshot does not

---

## 8.9 Changed file: `src/ui/runtime/world/node-overlays/NodeOverlayCard.tsx`

### Responsibility

Render a single node overlay card.

### Changes

Add an internal live-text view path.

#### Static-value rendering path

If the model carries static `valueText`, render the current `ValueText` node with that text exactly as today.

#### Live-value rendering path

If the model carries `valueBinding`, render a `ValueText` node whose ref is bound via `useEntityTextRef(model.valueBinding)`.

Required rules:

- live-value text content is not passed as a React child string
- the live-value element must be a stable DOM node for the provider to mutate imperatively
- the card component remains wrapped in `React.memo(...)`
- the card equality function remains `nodeOverlayCardRenderEqual(...)`

### Initial render contract

Because `registerText(...)` performs an immediate sync, the live-value `ValueText` node may render with empty content initially and still satisfy the user-visible contract.

---

## 8.10 Changed file: `src/ui/runtime/world/node-overlays/filterVisibleNodeOverlayModels.ts`

### Responsibility

Filter semantically hidden node overlays.

### Changes

Update the cycle rule so that it checks only static cycle text.

Required logic:

- if `model.kind === "cycle"` and the model carries static `valueText`, hide only when the text is `"No power"`
- if the model carries a live `valueBinding`, do not apply the blackout text filter
- assignment idle filtering remains label-based and unchanged

---

## 8.11 Unchanged files by contract

The following production files must remain unchanged:

- `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayNodeModels.ts`
- `src/ui/runtime/world/node-overlays/useNodeOverlayViewportData.ts`
- `src/ui/runtime/world/node-overlays/nodeOverlayViewportHydration.ts`
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts`
- `src/ui/runtime/world/node-overlays/overlayViewportModels.ts`
- `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

Reason:

This LLD does not change semantic selection flow, model projection flow, or viewport aggregation flow. The detachment is achieved by changing how live text is represented and synchronized, not by changing those hook topologies.

---

## 9. Test Design

## 9.1 New test file: `src/ui/runtime/world/EntityStateLink.text.test.tsx`

### Responsibility

Integration-test provider-driven live text registration, dirty tracking, and cadence throttling.

### Test 1 — initial registration synchronizes text immediately

Given:

- a runtime entity with assignment progress and duration fields
- a test component that renders a text node bound through `useEntityTextRef(...)`
- `EntityStateLinkProvider` wrapping the component

When:

- the component mounts

Then:

- the text node displays the correct formatted value immediately
- no cadence tick is required for first correctness

### Test 2 — rapid mutations do not update text until the cadence tick

Given:

- fake timers enabled
- an active assignment binding or storage fraction binding

When:

- the entity value mutates multiple times faster than 33 ms
- matching mutation summaries are published
- time has not yet advanced by 33 ms

Then:

- the text node still shows the previous value

When:

- time advances by one 33 ms tick

Then:

- the text node updates once to the latest value

### Test 3 — unrelated entity mutations do not update the text node

Given:

- one bound text entity and one unrelated entity

When:

- only the unrelated entity is included in `changedEntityIds`
- time advances through one cadence tick

Then:

- the text node remains unchanged

### Test 4 — runtime swap forces a full text refresh

Given:

- a mounted text binding and provider

When:

- the runtime instance changes

Then:

- the next sync uses the new runtime state even if no dirty entity IDs were recorded from the old runtime

---

## 9.2 Changed test file: `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.test.ts`

### Responsibility

Update resolver expectations to the new static-vs-live contract.

### Required assertions

1. Active cycle overlay resolves to a `valueBinding` of kind `cycle-countdown`, not static `valueText`.
2. Blackout cycle overlay still resolves to static `valueText = "No power"`.
3. Active assignment overlay resolves to a `valueBinding` of kind `remaining-duration-ms`.
4. Idle assignment overlay still resolves to static `valueText = ""`.
5. Storage overlay resolves to a `valueBinding` of kind `compact-fraction`.
6. Unsupported entities still resolve to `null`.

---

## 9.3 Changed test file: `src/ui/runtime/world/node-overlays/nodeOverlayComparators.test.ts`

### Responsibility

Verify comparator behavior after the value-display split.

### Required assertions

1. Static text remains part of entry equality.
2. Live text binding identity remains part of entry equality.
3. Card render equality still ignores live bar current/max differences.
4. Card render equality for live-text overlays does **not** change merely because the current displayed text would differ.
5. Card render equality for live-text overlays changes when the text binding identity changes.

---

## 9.4 Changed test file: `src/ui/runtime/world/node-overlays/filterVisibleNodeOverlayModels.test.ts`

### Responsibility

Verify visibility filtering remains semantic after the value-display split.

### Required assertions

1. Static cycle `"No power"` overlays remain hidden.
2. Live cycle-countdown overlays remain visible.
3. Idle assignment overlays remain hidden.
4. Storage overlays with live fraction bindings remain visible.

---

## 9.5 Changed test file: `src/ui/runtime/world/node-overlays/useResolvedNodeOverlayEntries.incremental.test.tsx`

### Responsibility

Verify the incremental entry cache remains stable for live-value-only mutations.

### New required assertion

Given:

- a runtime with an active cycle or active assignment overlay
- `useResolvedNodeOverlayEntries(runtime, true)` rendered

When:

- the underlying value used only for live text changes
- the entity remains overlay-eligible with the same binding identity
- a mutation summary is emitted for that entity

Then:

- the returned entry object for that entity remains referentially equal to the previous entry object
- sibling entry references remain unchanged

This is the direct proof that live text no longer churns semantic entry identity.

---

## 9.6 Optional new logic test file: `src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.test.ts`

### Responsibility

Unit-test the binding-to-text resolver logic without React.

### Recommended assertions

1. `compact-fraction` computes `[current/max]` using `formatCompactFraction(...)`.
2. `remaining-duration-ms` computes `formatDurationMs(max(progress-subtracted))` correctly.
3. `cycle-countdown` reuses `resolveJobCycleStatus(...)` and blackout fallback semantics.
4. missing entity writes empty string.

This file is optional but recommended to keep React integration tests smaller and more focused.

---

## 10. Pseudocode

## 10.1 Provider dirty tracking

```text
on invalidation effect:
    read runtime, entityListRevision, mutationRevision, lastChangedEntityIds

    if runtime changed:
        mark full text refresh
        replace last runtime reference
        store revisions
        return

    if entityListRevision changed:
        mark full text refresh
        store revisions
        return

    if mutationRevision changed:
        for each changed entity id:
            if text registry contains any binding for that entity id:
                add entity id to dirty text set
        store revisions
```

## 10.2 Provider cadence loop

```text
start interval every 33 ms when runtime exists and text registry is non-empty

on each tick:
    if full refresh pending:
        sync all registered text bindings
        clear full refresh flag
        clear dirty text set
        return

    if dirty text set is empty:
        do nothing
        return

    sync only registered bindings whose entity id is in dirty text set
    clear dirty text set
```

## 10.3 Node overlay resolver split

```text
resolveStorageOverlayEntry:
    resolve storage bar
    if no bar: return null
    return semantic entry with label + bar + compact-fraction text binding

resolveAssignmentOverlayEntry:
    read assigned ids, progress, duration
    if assigned and progress/duration missing: return null
    if assigned:
        return semantic entry with label "Time to completion" + bar + remaining-duration-ms text binding
    return semantic entry with label "Idle" + static empty value text

resolveCycleOverlayEntry:
    resolve job cycle binding
    if no cycle binding: return null
    resolve cycle status
    if ticksRemaining is not null:
        return semantic entry with label "Next cycle" + bar + cycle-countdown text binding
    return semantic entry with label "Next cycle" + static fallback text (No power or Idle)
```

---

## 11. Acceptance Criteria

The implementation is complete only if all of the following are true:

1. The production file changes are limited to the files listed in section 8.
2. Node overlay value text for active cycle, active assignment, and storage overlays is no longer carried as eager semantic `valueText`.
3. Live node overlay text updates at a fixed 33 ms cadence and not on every mutation publication.
4. Live node overlay text is synchronized immediately on mount/registration.
5. Semantic node overlay entries remain stable across live-value-only mutations.
6. `NodeOverlayCard` does not rerender solely because a live displayed text string changed.
7. Static fallback semantics (`"No power"`, `"Idle"`, assignment idle empty text) remain unchanged.
8. Existing bar syncing behavior remains unchanged.
9. All tests listed in section 9 pass.
10. No code path duplicates the existing formatter or cycle-status logic instead of reusing the current utilities.

---

## 12. Explicit Non-Ambiguity Notes

1. The cadence interval is **exactly 33 ms** in this implementation.
2. The cadence loop exists only inside `EntityStateLinkProvider`.
3. There is exactly one cadence timer per mounted provider instance.
4. `useResolvedNodeOverlayEntries(...)` remains invalidation-driven and timer-free.
5. `useNodeOverlayNodeModels(...)` remains invalidation/projection-driven and timer-free.
6. `useNodeOverlayViewportData(...)` remains unchanged by this LLD.
7. Progress bars remain immediate and mutation-driven.
8. Live text updates are imperative DOM writes and must not depend on React state.
9. Live node overlay text must use `valueBinding`; static node overlay text must use `valueText`.
10. Active cycle overlays, active assignment overlays, and storage overlays must all use the live-text path in this implementation.

