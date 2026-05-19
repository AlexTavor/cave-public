# LLD — SwarmCard / BodyBrick / UI Avatar Optimization

## 0. Scope and locked decisions

This document specifies the implementation of four agreed changes:

1. `BrickBackground` becomes a glow-only background layer.
2. `SwarmCard` selection work is split so the card shell rerenders only on swarm membership-count changes, while totals stay live via a separate selector.
3. `BodyBrick` rerenders only when displayed row output changes.
4. UI avatars become cache-first and use cached UI-ready avatar URLs once resolved.

This design is constrained by the project architecture and testing contract in the uploaded canonical docs.

## 1. Why this change is needed

### 1.1 `BrickBackground`

Current `BrickBackground` in `src/ui/runtime/world/selection/absorption/BodyBrick.styles.ts` renders:

- a border,
- hover border changes,
- a box-shadow,
- and `filter: url(#organic-edge)`.

The requested behavior is strictly narrower: a glow behind the row, with no border behavior at all.

### 1.2 `SwarmCard`

Current `SwarmCard` (`src/ui/runtime/world/selection/swarm/SwarmCard.tsx`) uses `useRuntimeSelector` with `resolveSwarmCardHydrationPlan(...)` and `resolveSwarmCardData(...)`.

Current behavior:

- `resolveSwarmCardHydrationPlan(...)` subscribes to the selected swarm entity, `sys_world`, and every entity matching `body`, `assignment`, `face`, or `proxy`.
- `resolveSwarmCardData(...)` recomputes totals and full row payloads for every swarm member.
- `SwarmCardView` receives totals and fully materialized rows from the parent.

This makes the parent card pay row-selection cost and row-diff cost on broad invalidation.

### 1.3 `BodyBrick`

Current swarm rows use `BodyBrickView` with parent-built `SwarmRowData`. Current absorption rows use `BodyBrick` with `useBodyCardData(...)`.

That means there is no dedicated compact-row selector. Existing row inputs are heavier than the row display contract:

- `BodyBrickView` rounds health during render, but `swarmCardHydration.ts` compares raw `liveHealth` and `liveMaxHealth`.
- `BodyBrick` uses `useBodyCardData(...)`, which selects much more than the compact row renders.

### 1.4 UI avatar

Current `BodyAvatar`:

- builds a `body_avatar` export request from runtime each render,
- calls `useDisplayImageUrl(...)`,
- and each mount goes through local `loading -> ready/error` state.

Existing cache mechanisms already present in the codebase:

- `DisplayImageExportService` caches resolved image URLs by `buildDisplayCacheKey(...)`.
- `buildBodyAvatarCacheKey(...)` already exists.
- There is also a presentation cache in `src/engine/phaser/avatar/resolveBodyAvatarPresentation.ts`.

However, the UI path currently used by `BodyAvatar` does not maintain a UI-level ready/error cache keyed by avatar request identity. The existing `bodyAvatarBridge` path is not registered anywhere in the uploaded source, so it is not an existing active UI path for this work.

## 2. Design summary

### 2.1 Locked behavior after the change

#### `BrickBackground`

- No border.
- No `organic-edge` filter.
- Glow-only background layer.
- The glow shape and color behavior must match the existing button glow behavior, not the button border/background behavior.
- Hover and selected states may change glow intensity only.

#### `SwarmCard`

- The card shell tracks membership count, not live row payloads.
- The row list is recomputed only when the swarm membership count changes.
- Totals remain live and are read through a separate selector/component.
- The sort algorithm remains `resolveSwarmMemberIds(...)`.
- The recompute trigger changes from broad invalidation to membership-count change.

#### `BodyBrick`

- Compact row data is selected by a dedicated compact-row selector.
- A row rerenders only when the rendered output changes.
- Health changes that do not change displayed integers must not rerender the row.
- `BodyBrickView` becomes a pure view over compact-row render data.

#### UI avatar

- UI list/card avatar rendering becomes cache-first.
- Once a UI avatar URL is resolved for a body-avatar cache key, UI consumers read that cached URL directly.
- Repeated mounts of the same avatar must not go through per-instance local loading churn.
- Existing export request building and export service logic remain the source of truth.

## 3. Implementation design

## 3.1 Point 1 — `BrickBackground`

### File: `src/ui/runtime/world/selection/absorption/BodyBrick.styles.ts` (change)

**Responsibility**

Define compact row layout and the glow-only row background.

**Logic**

- Replace the current border/filter-based `BrickBackground` with a glow layer.
- Keep `BrickBackground` absolutely positioned behind row content.
- Remove all border rules.
- Remove `filter: url(#organic-edge)`.
- Use the same glow model as `EyeGradientLayer` in `src/ui/lib/atoms/button/Button.styles.ts`:
  - radial gradient,
  - rounded corners,
  - positioned slightly outside the content box to let the glow breathe.
- Glow color source:
  - selected: `theme.colors.buttonSelected`
  - idle/hover: use the same row-safe color choice already used by the current background logic; only intensity changes, not a border.
- Hover must be derived from CSS on the row container, not React state.

**Interface**

`BrickBackground` keeps the existing prop contract:

- `selected: boolean`

No new props are introduced.

**Contract**

- The component renders no visible border in any state.
- The component does not use `organic-edge`.
- Row glow is the only background affordance.

## 3.2 Point 2 — `SwarmCard` shell/data split

### File: `src/ui/runtime/world/selection/swarm/swarmCardTypes.ts` (change)

**Responsibility**

Define the new card-shell types.

**Logic**

Replace the old type that bundled totals and row payloads.

**Interface**

Define exactly these types:

- `SwarmCardListData`
  - `memberCount: number`
  - `memberIds: string[]`
- `SwarmTotalsData`
  - `body: number`
  - `mind: number`
  - `social: number`

`SwarmRowData` is removed from this file. Compact row data moves to the absorption row domain.

### File: `src/ui/runtime/world/selection/swarm/swarmCardSelectors.ts` (change)

**Responsibility**

Provide selector helpers for swarm shell data and totals.

**Logic**

Add selectors for the selected swarm entity state:

- `selectSwarmCount(entity)`
  - reads `entity.state["swarm.count"].value`
  - returns a non-negative integer, or `0` if missing/invalid
- `selectSwarmTotals(entity)`
  - reads `swarm.body`, `swarm.mind`, `swarm.social`
  - returns `SwarmTotalsData`
- `swarmTotalsEqual(left, right)`
  - compares `body`, `mind`, `social`

Existing row helper selectors in this file remain if still used elsewhere.

**Interface**

The selectors are pure functions over a runtime entity.

### File: `src/ui/runtime/world/selection/swarm/useSwarmMemberIds.ts` (add)

**Responsibility**

Own the shell-level membership list contract for `SwarmCard`.

**Logic**

- Read swarm membership count from the selected swarm entity using `useEntitySelector(...)` and `selectSwarmCount(...)`.
- Recompute `memberIds` with the existing `resolveSwarmMemberIds(runtime.getEntities())` only when:
  - the runtime instance changes, or
  - the selected swarm count changes.
- Return a stable `{ memberCount, memberIds }` object between membership-count changes.

**Interface**

`useSwarmMemberIds(runtime, swarmEntityId) -> SwarmCardListData | null`

Inputs:

- `runtime: Runtime | null`
- `swarmEntityId: string | undefined`

Output:

- `null` if runtime or swarm entity id is missing
- otherwise `SwarmCardListData`

**Contract**

- The hook does not subscribe to every body/proxy/assignment/face entity.
- It does not build row payloads.
- It recomputes list ordering only when `swarm.count` changes.

### File: `src/ui/runtime/world/selection/swarm/useSwarmTotals.ts` (add)

**Responsibility**

Provide live totals data independently of list-shell selection.

**Logic**

- Read the selected swarm entity with `useEntitySelector(...)`.
- Use `selectSwarmTotals(...)` and `swarmTotalsEqual(...)`.
- Return `SwarmTotalsData | null`.

**Interface**

`useSwarmTotals(runtime, swarmEntityId) -> SwarmTotalsData | null`

### File: `src/ui/runtime/world/selection/swarm/SwarmTotals.tsx` (add)

**Responsibility**

Render live totals behind their own selector boundary.

**Logic**

- Call `useSwarmTotals(...)`.
- Render `AttributesList` when totals are available.
- Return `null` if totals are unavailable.

**Interface**

Props:

- `runtime: Runtime | null`
- `swarmEntityId: string | undefined`

This component has no side effects.

### File: `src/ui/runtime/world/selection/swarm/SwarmCard.tsx` (change)

**Responsibility**

Compose the shell-level swarm card.

**Logic**

- Remove use of `resolveSwarmCardData(...)` and `swarmCardHydration.ts`.
- Use `useSwarmMemberIds(runtime, entity.id)`.
- Pass the selected swarm entity id to the view so totals can be rendered by `SwarmTotals`.

**Interface**

No public prop changes. It still accepts `SelectionCardProps`.

### File: `src/ui/runtime/world/selection/swarm/SwarmCardView.tsx` (change)

**Responsibility**

Render the swarm card shell without owning live totals selection or row data derivation.

**Logic**

- Accept only shell data (`memberCount`, `memberIds`) plus `runtime` and `swarmEntityId`.
- Render `SwarmTotals` inside the card instead of receiving totals data from the parent.
- Render rows by `entityId`, not by fully built row payloads.
- The `Virtuoso` data source becomes `memberIds: string[]`.
- `itemContent` renders `BodyBrick` using `entityId`.
- `itemContent` must be stable across totals-only updates.

**Interface**

Props:

- `data: SwarmCardListData | null`
- `runtime: Runtime | null`
- `swarmEntityId: string | undefined`

**Contract**

- Totals updates must not force the row list to rerender.
- The row list input is entity ids only.

### File: `src/ui/runtime/world/selection/swarm/resolveSwarmCardData.ts` (delete)

**Responsibility after change**

None. This file is removed.

**Reason**

The old file bundles shell data, totals, and row payload derivation into one broad selector path. That is explicitly out of contract after this change.

### File: `src/ui/runtime/world/selection/swarm/swarmCardHydration.ts` (delete)

**Responsibility after change**

None. This file is removed.

**Reason**

The old hydration plan subscribes too broadly and is no longer part of the design.

## 3.3 Point 3 — compact `BodyBrick` selector

### File: `src/ui/runtime/world/selection/absorption/bodyBrickTypes.ts` (add)

**Responsibility**

Define the compact row render contract.

**Logic**

Define exactly one render-data type for compact rows.

**Interface**

`BodyBrickRenderData` fields:

- `entityId: string`
- `subjectId: string`
- `fallbackIconId: string`
- `liveLevel: number`
- `attributes: { body: number; mind: number; social: number }`
- `displayHealth: number`
- `displayMaxHealth: number`
- `hasUnownedHabiti: boolean`
- `statusIcons: Array<{ traitId: string; iconId: string }>`

Important: this type stores already-displayed health integers, not raw floats.

### File: `src/ui/runtime/world/selection/absorption/resolveBodyBrickData.ts` (add)

**Responsibility**

Build compact-row render data only.

**Logic**

- Read only data required by the compact row UI.
- Use existing helpers where already available:
  - `resolveBodySelectionTargetId(...)`
  - `selectBodyFallbackIconId(...)`
  - `selectBodyLevel(...)`
  - `selectBodyAttributes(...)`
  - `selectBodyHealth(...)`
  - `selectBodyMaxHealth(...)`
  - `selectBodyHabiti(...)`
  - `readTraitIds(...)`
  - `resolveSwarmStatusIcon(...)`
- Read owned habiti from `sys_world`.
- Convert health to displayed integers in this resolver.
- Do not compute XP, description, modifiers, traits, or parent-section data.

**Interface**

`resolveBodyBrickData(entityId, runtime) -> BodyBrickRenderData | null`

Inputs:

- `entityId: string`
- `runtime: Runtime | null`

Output:

- `null` if the row entity is unavailable or invalid
- otherwise `BodyBrickRenderData`

### File: `src/ui/runtime/world/selection/absorption/bodyBrickHydration.ts` (add)

**Responsibility**

Define compact-row subscription scope and equality.

**Logic**

Hydration plan:

- subscribe only to:
  - the row entity id,
  - `sys_world`
- do not include entity list revision
- do not include blueprint revision

Equality:

- compare `entityId`, `subjectId`, `fallbackIconId`, `liveLevel`
- compare `attributes` with `attributesEqual(...)`
- compare `displayHealth` and `displayMaxHealth` exactly
- compare `hasUnownedHabiti`
- compare `statusIcons` by ordered `traitId` + `iconId`

**Interface**

Exports:

- `resolveBodyBrickHydrationPlan(entityId): HydrationDependencyPlan`
- `bodyBrickDataEqual(left, right): boolean`

**Contract**

- Raw health values are not part of equality.
- Equality is defined in terms of rendered output.

### File: `src/ui/runtime/world/selection/absorption/useBodyBrickData.ts` (add)

**Responsibility**

Provide compact-row selector access.

**Logic**

- Use `useRuntimeSelector(...)`.
- Use `resolveBodyBrickHydrationPlan(...)`.
- Use `resolveBodyBrickData(...)`.
- Use `bodyBrickDataEqual(...)`.

**Interface**

`useBodyBrickData(entityId, runtime) -> BodyBrickRenderData | null`

### File: `src/ui/runtime/world/selection/absorption/BodyBrick.tsx` (change)

**Responsibility**

Act as the compact-row container component.

**Logic**

- Stop using `useBodyCardData(...)`.
- Stop building row data inline.
- Accept `entityId` instead of a full `entity` object.
- Resolve the current entity from runtime for tooltip content only.
- Use `useBodyBrickData(...)` for row render data.
- Pass pure render data to `BodyBrickView`.

**Interface**

New prop contract:

- `entityId: string`
- `runtime: Runtime`
- `onMouseDown?: () => void`
- `onMouseEnter?: () => void`
- `selected?: boolean`
- `showSelectionIndicators?: boolean`

The old `entity: RuntimeEntity` prop is removed.

**Contract**

- The component is the only container for compact rows.
- `BodyBrickView` must not own runtime selection logic.

### File: `src/ui/runtime/world/selection/absorption/BodyBrickView.tsx` (change)

**Responsibility**

Render compact row UI only.

**Logic**

- Replace `SwarmRowData` input with `BodyBrickRenderData`.
- Stop rounding health in render.
- Render `displayHealth` and `displayMaxHealth` directly.
- Receive tooltip content from the container instead of resolving runtime entity inside the view.

**Interface**

Props:

- `data: BodyBrickRenderData`
- `tooltipContent: React.ReactNode`
- `selected?: boolean`
- `showSelectionIndicators?: boolean`
- `onMouseDown?: () => void`
- `onMouseEnter?: () => void`

No runtime prop.

### File: `src/ui/runtime/world/selection/absorption/BodySelector.tsx` (change)

**Responsibility**

Render selectable body rows in absorption.

**Logic**

Update `BodyBrick` usage to pass `entityId`, not `entity`.

**Interface**

No public interface change.

### File: `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx` (change)

**Responsibility**

Remain a deprecated compatibility wrapper.

**Logic**

Update it to call `BodyBrick` with `entityId`.

**Interface**

No public interface change.

## 3.4 Point 4 — UI avatar cache

### File: `src/ui/runtime/state/useUiAvatarStore.ts` (add)

**Responsibility**

Store UI-ready avatar cache entries.

**Logic**

Use Zustand, consistent with the project state-management rule.

State shape:

- `entries: Record<string, UiAvatarCacheEntry>`

Entry shape:

- `status: "ready" | "error"`
- `url: string | null`

Actions:

- `setReady(key, url)`
- `setError(key)`
- `clear()`

The store does not own export logic. It stores only UI-consumable cache results.

**Interface**

`useUiAvatarStore` exports store state and actions.

### File: `src/ui/runtime/world/body-avatar/useUiAvatarUrl.ts` (add)

**Responsibility**

Provide a cache-first UI avatar URL hook.

**Logic**

- Read runtime from `useRuntimeStore(...)`, matching the current `BodyAvatar` pattern.
- Build a request with `buildBodyAvatarImageRequest(...)`.
- Build the exact cache key with `buildBodyAvatarCacheKey(...)`.
- Read cached entry from `useUiAvatarStore`.
- If a ready/error entry exists, return it immediately.
- If no entry exists and the export service exists, request `service.getImageUrl(request)`.
- On resolve, write `setReady(key, url)`.
- On rejection, write `setError(key)`.
- Do not duplicate request-key logic.
- Do not replace `DisplayImageExportService` caching.

**Interface**

`useUiAvatarUrl(subjectId) -> { status: "idle" | "ready" | "error"; url: string | null; fallbackIconId?: string }`

Behavior:

- `idle` when no request can be built or no export service exists yet
- `ready` when UI cache has a URL
- `error` when the request failed

### File: `src/ui/runtime/world/body-avatar/UiAvatar.tsx` (add)

**Responsibility**

Render compact UI avatars from the UI cache.

**Logic**

- Use `useUiAvatarUrl(...)`.
- Render cached image when status is `ready`.
- Render fallback `GameIcon` otherwise.
- Reuse the existing avatar frame sizing contract used by `BodyAvatar`.

**Interface**

Props:

- `subjectId: string | undefined`
- `fallbackIconId?: string`
- `size?: "sm" | "md" | "lg"`

### File: `src/ui/runtime/world/selection/body/BodyAvatar.tsx` (change)

**Responsibility**

Remain the stable body-avatar component used by the rest of the UI.

**Logic**

Convert `BodyAvatar` into a compatibility wrapper over `UiAvatar`.

- Keep the existing public props unchanged.
- Remove direct use of `useDisplayImageUrl(...)` from this component.
- Remove direct request-building logic from this component.

**Interface**

Unchanged:

- `subjectId: string | undefined`
- `fallbackIconId?: string`
- `size?: "sm" | "md" | "lg"`

### File: `src/engine/phaser/display-export/DisplayRenderHost.ts` (change)

**Responsibility**

Own lifecycle cleanup for display-export-backed avatar UI cache.

**Logic**

On host destroy, clear the new UI avatar store in addition to clearing the display image export store.

This avoids keeping stale UI cache entries across host teardown.

**Interface**

No public interface change.

## 4. Files that must not change

These files remain source-of-truth helpers and are reused as-is:

- `src/ui/runtime/hooks/useRuntimeSelector.ts`
- `src/ui/runtime/world/selection/useEntitySelector.ts`
- `src/ui/runtime/world/selection/selectionUtils/swarm.ts`
- `src/ui/runtime/world/selection/body/bodyCardSelectors.ts`
- `src/engine/phaser/display-export/buildBodyAvatarImageRequest.ts`
- `src/engine/phaser/display-export/buildDisplayImageCacheKey.ts`
- `src/engine/phaser/display-export/DisplayImageExportService.ts`

No new caching mechanism may duplicate these responsibilities.

## 5. Tests

The tests must follow the uploaded testing standard: behavior-focused, readable, Given/When/Then, colocated, and no implementation-detail assertions.

### File: `src/ui/runtime/world/selection/SwarmCard.test.tsx` (change)

**Responsibility**

Verify the card still renders totals and rows correctly under the new shell/data split.

**Required assertions**

- Given a swarm entity with `swarm.count`, `swarm.body`, `swarm.mind`, `swarm.social`
- When `SwarmCard` renders
- Then totals are displayed
- And the expected row entity ids are rendered through `BodyBrick`

Add a regression case:

- Given totals change but `swarm.count` does not
- When only totals selector output changes
- Then totals update
- And the row list input remains unchanged

### File: `src/ui/runtime/world/selection/swarm/useSwarmMemberIds.test.tsx` (add)

**Responsibility**

Verify shell data recomputes only on membership-count changes.

**Required assertions**

- Given stable runtime and stable `swarm.count`
- When unrelated swarm totals change
- Then returned `memberIds` reference and contents stay unchanged
- When `swarm.count` changes
- Then `memberIds` recompute using `resolveSwarmMemberIds(...)`

### File: `src/ui/runtime/world/selection/swarm/useSwarmTotals.test.tsx` (add)

**Responsibility**

Verify totals selector behavior.

**Required assertions**

- Reads `swarm.body`, `swarm.mind`, `swarm.social`
- Rerenders only when one of those values changes

### File: `src/ui/runtime/world/selection/absorption/bodyBrickHydration.test.ts` (add)

**Responsibility**

Verify compact-row equality is render-based.

**Required assertions**

- Given two row payloads whose raw health differs but displayed integers match
- Then `bodyBrickDataEqual(...)` returns true
- Given a change in displayed health integer
- Then `bodyBrickDataEqual(...)` returns false
- Given a change in `statusIcons`, attributes, level, or fallback icon
- Then `bodyBrickDataEqual(...)` returns false

### File: `src/ui/runtime/world/selection/absorption/BodyBrick.flyweight.test.tsx` (change)

**Responsibility**

Verify the compact row still renders the same displayed information under the new container/data contract.

**Required assertions**

- Render by `entityId`
- Verify avatar, level, attributes, health text, and status icon display remain correct

### File: `src/ui/runtime/world/body-avatar/UiAvatar.test.tsx` (add)

**Responsibility**

Verify cache-first UI avatar behavior.

**Required assertions**

- Given a cached ready entry
- When `UiAvatar` mounts
- Then it renders the cached image without entering a loading path
- Given no cache entry and a successful export service response
- Then it stores and renders the resolved URL
- Given a failed export
- Then it stores error state and renders fallback icon

### File: `src/ui/runtime/state/useUiAvatarStore.test.ts` (add)

**Responsibility**

Verify store behavior.

**Required assertions**

- `setReady` stores a ready entry
- `setError` stores an error entry
- `clear` removes all entries

### File: `src/ui/runtime/world/selection/body/BodyAvatar.test.tsx` (change)

**Responsibility**

Verify `BodyAvatar` remains a stable wrapper.

**Required assertions**

- It renders through the new `UiAvatar` path
- Its public prop contract remains unchanged

## 6. Acceptance criteria

The implementation is complete only if all of the following are true:

1. `BrickBackground` has no border and no `organic-edge` filter.
2. `SwarmCard` no longer builds row payloads in the parent selector path.
3. `SwarmCard` totals are live through a separate selector boundary.
4. `SwarmCard` row list input is `memberIds`, not row payload objects.
5. Compact row equality is defined on rendered output, not raw floating health values.
6. `BodyBrick` no longer uses `useBodyCardData(...)`.
7. `BodyAvatar` no longer owns per-instance `useDisplayImageUrl(...)` request lifecycle logic.
8. UI avatar cache keys are built with the existing `buildBodyAvatarCacheKey(...)` helper.
9. `DisplayRenderHost.destroy()` clears the UI avatar cache.
10. All changed and new tests pass.

## 7. Non-goals

- No tooltip redesign.
- No change to the underlying swarm member sort algorithm.
- No change to `DisplayImageExportService` internals.
- No refactor of `Button` implementation.
- No change to full `BodyCard` selection behavior.
