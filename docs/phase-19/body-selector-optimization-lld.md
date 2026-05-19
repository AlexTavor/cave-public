# BodySelector optimization LLD

## Scope

Implement the `BodySelector` performance optimization by applying the same architectural pattern already used by `SwarmCard`:

- split shell from memoized view
- feed the virtual list a stable `string[]` of entity ids
- virtualize the body list with `react-virtuoso`
- remove per-row inline mouse handlers
- localize the optimization to the `absorption` feature

This design preserves the existing user-visible contract and avoids speculative refactors.

## Governing constraints

This design is constrained by the project’s canonical rules:

- UI components render only; business logic stays in hooks/selectors/services.
- Zustand/runtime selectors must use granular subscriptions.
- Scope must remain local to the requested feature.
- Tests must verify behavior and wiring, not implementation trivia.

## Why this change is required

### 1. `BodySelector` currently re-renders the full list on every drag step

`src/ui/runtime/world/selection/absorption/BodySelector.tsx` currently maps all candidates directly in render and creates fresh inline handlers per item.

Effect:

- every selection update re-renders the entire list
- every visible and non-visible brick is mounted because the list is not virtualized
- every brick receives fresh handler props

### 2. `BodySelector` currently derives candidates through `useEntityQuery`

`src/ui/runtime/world/selection/absorption/useBodySelector.ts` currently calls:

- `useEntityQuery(world, "body")`
- `useEntityQuery(world, "face")`

This is a poor fit for this modal because:

- `BodySelector` does not render faces
- `faceAssignments` is returned but not consumed by `BodySelector.tsx`
- `useEntityQuery` clones entities and is wired to frame invalidation
- the selector only needs a stable ordered list of candidate ids, not cloned entity objects

### 3. The current implementation does not follow the established `SwarmCard` optimization pattern

`SwarmCard` is already structured correctly for this exact problem:

- thin shell component
- derived stable list data hook (`useSwarmMemberIds`)
- memoized view component (`SwarmCardView`)
- `Virtuoso` fed by `memberIds: string[]`
- body rows rendered from ids only

`BodySelector` should follow the same shape.

## Non-goals

The implementation shall **not**:

- change absorption math
- change assignment requirement math
- change `BodyBrick` visuals
- change `BodySelector` props
- change confirm/cancel semantics
- refactor generic `useEntityQuery`
- reintroduce sort UI
- add new feature behavior

## External contract to preserve

The optimized implementation must preserve all of the following:

1. `BodySelector` export and props remain unchanged.
2. Candidate eligibility remains defined by the existing `filterCandidates` function.
3. Candidate ordering remains defined by the existing `sortBodies(..., "xp")` behavior.
4. Preview output remains defined by the existing `resolveAbsorptionPreview` function.
5. Assignment requirements remain defined by the existing `resolveAssignmentRequirementsData` function.
6. Mouse interaction semantics remain unchanged:
   - mouse down toggles the first body
   - drag applies the same target state to hovered bodies
   - mouse up ends drag
7. `onConfirm` still receives `Array.from(selectedIds)` from the internal `Set`.
8. All logic remains outside `.tsx` view files except rendering and event wiring.

## Design summary

The feature will be restructured as follows:

- `BodySelector.tsx` becomes a thin shell.
- A new memoized `BodySelectorView.tsx` renders header, preview, requirements, footer, and the `Virtuoso` list.
- A new `useBodySelectorCandidateIds.ts` derives a stable candidate id list using `useRuntimeSelector`, not `useEntityQuery`.
- `useBodySelector.ts` becomes the controller for:
  - selection state
  - drag state
  - delegated mouse event handling
  - preview derivation
  - assignment requirements derivation
- `BodyBrick.tsx` becomes memoized so unchanged visible rows bail out.
- `BodySelector.styles.ts` is updated to provide a fixed-height list frame required by `Virtuoso` and to preserve the existing spacing contract for rows.

## File-by-file design

### 1. Change: `src/ui/runtime/world/selection/absorption/BodySelector.tsx`

### Responsibility

Public feature entry point. It owns no rendering logic beyond wiring the controller to the view.

### Logic

- Keep the existing exported component and props.
- Call `useBodySelector(runtime, stationEntity)`.
- Pass the returned controller data and callbacks into `BodySelectorView`.
- Do not map candidates directly.
- Do not create inline row handlers.

### Interface

Exported component interface remains exactly:

- `runtime: Runtime`
- `stationEntity?: RuntimeEntity`
- `onConfirm(ids: string[]): void`
- `onCancel(): void`

No new props. No removed props.

---

### 2. Add: `src/ui/runtime/world/selection/absorption/BodySelectorView.tsx`

### Responsibility

Pure presentational view for the optimized selector.

### Logic

Render:

- selected count
- `HabitiGainDisplay`
- `AssignmentRequirementsSection`
- virtualized list of candidate ids via `Virtuoso`
- cancel/proceed actions

List behavior:

- `Virtuoso` data source is `candidateIds: string[]`
- `computeItemKey` uses the entity id
- each row renders `BodyBrick` with:
  - `entityId`
  - `runtime`
  - `selected`
- no per-row mouse handler props are passed to `BodyBrick`

Event handling:

- the list frame owns delegated mouse handlers
- use bubbling events only
- use `onMouseDown` for drag start
- use `onMouseOver` for drag continuation
- use `onMouseUp` for drag end
- row identity is resolved from the existing `data-entity-id` attribute emitted by `BodyBrickView`

Memoization:

- export `React.memo(BodySelectorViewBase)`

### Interface

The view receives only render data and callbacks from the controller. It does not read runtime state on its own.

Required props:

- `runtime: Runtime`
- `candidateIds: string[]`
- `selectedIds: ReadonlySet<string>`
- `preview: ReturnType of resolveAbsorptionPreview`
- `requirements: ReturnType of resolveAssignmentRequirementsData`
- `onCancel(): void`
- `onConfirm(): void`
- `onListMouseDown(event): void`
- `onListMouseOver(event): void`
- `onListMouseUp(): void`

The view must not own selection state.

---

### 3. Add: `src/ui/runtime/world/selection/absorption/useBodySelectorCandidateIds.ts`

### Responsibility

Derive a stable, ordered, minimal list of selector candidates.

This is the `BodySelector` equivalent of `useSwarmMemberIds`.

### Logic

Data source:

- use `useRuntimeSelector`
- do not use `useEntityQuery`
- read from `runtime.getEntities()`

Invalidation plan:

- include entity list revision
- include mutation revision
- include the current station entity id when one exists
- do **not** include frame revision
- do **not** include blueprint revision

Selector steps:

1. resolve the latest station entity from runtime by id
2. read all runtime entities
3. keep only entities with a `body` component
4. apply existing `filterCandidates`
5. apply existing `sortBodies(..., "xp")`
6. map to `entity.id`

Equality contract:

- if the resulting id array has identical length and identical ids in identical order, return the previous array reference
- otherwise return a new array reference

This hook must guarantee stable `candidateIds` across selection-only updates and unrelated mutations.

### Interface

Input:

- `runtime: Runtime | null`
- `stationEntityId?: string`

Output:

- `string[]`

No side effects.

---

### 4. Change: `src/ui/runtime/world/selection/absorption/useBodySelector.ts`

### Responsibility

Single controller for `BodySelector` interaction state and derived data.

### Logic

#### A. Candidate derivation

- replace the body query with `useBodySelectorCandidateIds`
- remove the face query entirely
- remove `faceAssignments` entirely

#### B. Station resolution

- resolve the current station entity from runtime by id on each controller evaluation
- when runtime has no fresher entity, fall back to the incoming prop

This ensures preview and requirement reads stay current while the modal is open.

#### C. Selection state

Keep:

- `selectedIds: Set<string>`
- `isDragging: boolean`
- `dragTargetState: boolean`

Remove:

- `sortMode`
- `setSortMode`

Reason: there is no sort UI in `BodySelector.tsx`; the current state is dead.

#### D. Selection update contract

`updateSelection` must be idempotent.

Rule:

- if membership for `id` already equals `shouldSelect`, return the existing `Set` reference
- otherwise clone the set, apply the change, and return the new set

This is required to prevent redundant rerenders during drag-over of already-processed rows.

#### E. Delegated event handling

The controller shall expose three handlers:

- list mouse down
- list mouse over
- list mouse up

Event resolution rules:

1. find the nearest ancestor carrying `data-entity-id`
2. ignore the event when no id is found
3. ignore drag-over when `isDragging` is false
4. on mouse down, compute target state as `!selectedIds.has(id)`
5. on mouse over during drag, apply `dragTargetState`
6. on mouse up, clear dragging state

The controller must not depend on per-row closures.

#### F. Preview derivation

- derive a memoized `selectedIdList` from `selectedIds`
- resolve each selected id through `runtime.getEntity(id)`
- discard missing entities
- call the existing `resolveAbsorptionPreview`

The preview contract remains identical.

#### G. Assignment requirements derivation

- use the same `selectedIdList`
- call the existing `resolveAssignmentRequirementsData`
- continue to use `runtime.getEntity(id)` as the entity resolver

### Interface

Input remains:

- `runtime: Runtime`
- `stationEntity?: RuntimeEntity`

Output becomes exactly:

- `candidateIds: string[]`
- `selectedIds: ReadonlySet<string>`
- `preview`
- `requirements`
- `onListMouseDown(event): void`
- `onListMouseOver(event): void`
- `onListMouseUp(): void`

It shall no longer return:

- `candidates`
- `sortMode`
- `setSortMode`
- `faceAssignments`
- per-id mouse handlers

---

### 5. Change: `src/ui/runtime/world/selection/absorption/BodyBrick.tsx`

### Responsibility

Flyweight row adapter from entity id to `BodyBrickView` data.

### Logic

- keep the existing data hydration path via `useBodyBrickData`
- keep the existing tooltip behavior
- wrap the component export in `React.memo`
- preserve all existing props and defaults

Rationale:

Once `BodySelector` is virtualized and uses stable ids, unchanged visible rows must bail out when only sibling selection changes.

### Interface

Unchanged:

- `entityId: string`
- `runtime: Runtime`
- `onMouseDown?: () => void`
- `onMouseEnter?: () => void`
- `selected?: boolean`
- `showSelectionIndicators?: boolean`

Even though `BodySelector` will stop using the optional row handlers, those props remain for compatibility.

---

### 6. Change: `src/ui/runtime/world/selection/absorption/BodySelector.styles.ts`

### Responsibility

Provide layout primitives for the virtualized selector list.

### Logic

Replace the current non-virtual list container usage with two explicit primitives:

1. a fixed-height list frame suitable for `Virtuoso`
2. a row wrapper that preserves the current vertical spacing contract

Requirements:

- use existing theme spacing/radius primitives only
- do not introduce magic numbers when an existing theme size already exists
- the list frame must hide overflow and provide the viewport height
- the row wrapper must preserve the visual gap previously supplied by `BrickBar`

The old `BrickBar` shall no longer be used by `BodySelectorView`.

### Interface

Export the new style primitives required by `BodySelectorView`.

No other feature may depend on their internal CSS.

## Event model

The delegated event model is the core interaction change.

### Required behavior

Given a row element with `data-entity-id="body-a"`:

- mouse down on any descendant inside that row toggles `body-a`
- while dragging, mouse over any descendant inside another row applies the same target state to that row
- mouse up anywhere inside the selector ends dragging

### Required event source

Use bubbling events. The implementation shall not rely on delegated `mouseenter` because the drag continuation handler must be reachable from the list container.

## Data model

### Candidate list contract

`candidateIds` is the sole list input for `Virtuoso`.

Properties:

- ordered
- unique
- stable by reference when ids and order do not change
- recomputed only from runtime mutation/entity-list invalidation, never from frame ticks

### Selection contract

`selectedIds` remains a `Set<string>`.

Properties:

- uniqueness preserved
- confirm payload preserves `Array.from(selectedIds)` behavior
- idempotent updates return the previous `Set` reference

## Exact files to add

1. `src/ui/runtime/world/selection/absorption/BodySelectorView.tsx`
2. `src/ui/runtime/world/selection/absorption/useBodySelectorCandidateIds.ts`
3. `src/ui/runtime/world/selection/absorption/useBodySelectorCandidateIds.test.tsx`

## Exact files to change

1. `src/ui/runtime/world/selection/absorption/BodySelector.tsx`
2. `src/ui/runtime/world/selection/absorption/useBodySelector.ts`
3. `src/ui/runtime/world/selection/absorption/BodyBrick.tsx`
4. `src/ui/runtime/world/selection/absorption/BodySelector.styles.ts`
5. `src/ui/runtime/world/selection/absorption/BodySelector.test.tsx`

No other files are in scope.

## Test design

Tests must follow the existing standards: behavior-oriented, readable, factory-based where useful, and colocated.

### 1. New: `useBodySelectorCandidateIds.test.tsx`

### Responsibility

Prove the stable-list contract.

### Cases

#### Case A: stable reference when unrelated mutation does not change candidate ids or order

Given:

- a runtime with a station and at least two body candidates
- current sort order is stable under `xp`

When:

- mutate a field that does not participate in `filterCandidates` or `sortBodies`
- publish a runtime mutation

Then:

- returned array contents remain the same
- returned array reference remains the same

#### Case B: new reference when candidate membership changes

Given the same setup

When:

- toggle one candidate to locked, or add/remove a body candidate

Then:

- returned array contents change correctly
- returned array reference changes

#### Case C: new reference when sort order changes

Given two eligible bodies with different sortable values

When:

- mutate a sortable field used by `sortBodies(..., "xp")`

Then:

- returned ids reorder correctly
- returned array reference changes

### 2. Change: `BodySelector.test.tsx`

### Responsibility

Prove that virtualization and delegated events preserve feature behavior.

### Test harness requirements

- mock `react-virtuoso` exactly as done in `SwarmCard.test.tsx`
- expose the `data` prop reference from the mock so stability can be asserted

### Cases

#### Case A: drag-select still works end-to-end

Given:

- two valid body rows
- station entity that enables habiti absorption preview

When:

- mouse down on the first row
- mouse over the second row
- mouse up on the selector

Then:

- selected count is `2`
- expected preview content is rendered
- habiti display content is rendered

#### Case B: list data reference is stable across selection-only updates

Given:

- a rendered selector
- the first `Virtuoso.data` reference captured from the mock

When:

- perform selection changes only

Then:

- the captured `candidateIds` reference remains identical
- no runtime mutation is required for list stability

This test encodes the primary optimization contract.

### 3. Existing: `BodyBrick.flyweight.test.tsx`

No new assertions are required unless the memoization change alters public behavior. The existing test already protects visible flyweight output.

## Acceptance criteria

Implementation is complete only when all of the following are true:

1. `BodySelector` uses `Virtuoso`.
2. `BodySelector` no longer maps the full candidate list directly in render.
3. `BodySelector` no longer uses per-row inline drag handlers.
4. `BodySelector` no longer depends on `useEntityQuery` for body candidates.
5. `useBodySelector` no longer queries faces or returns `faceAssignments`.
6. `candidateIds` stays referentially stable across selection-only updates and unrelated runtime mutations.
7. Drag-select behavior remains unchanged.
8. Preview and assignment requirements remain unchanged.
9. Only the files listed above are added or modified.
10. All tests remain green.

## Rollout risk assessment

### Low-risk changes

- shell/view split
- `Virtuoso` adoption for the list
- removal of dead `faceAssignments`
- removal of dead sort state
- `BodyBrick` memoization

### Controlled-risk change

- delegated drag events

Mitigation:

- keep the row identity source anchored on the existing `data-entity-id`
- verify drag-select behavior with the updated view test
- use bubbling events only

## Final implementation note

This design intentionally copies the proven `SwarmCard` pattern instead of inventing a new one. It uses the project’s existing selector and runtime invalidation mechanisms, keeps business logic out of view files, and limits changes to the `BodySelector` feature surface.
