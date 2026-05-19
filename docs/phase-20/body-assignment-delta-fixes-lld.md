# LLD — Body Assignment Delta Fixes for `src2`

## 1. Purpose

This document defines the remaining implementation delta for the current `src2` branch.

It covers only the confirmed defects still present in the reviewed implementation:

1. runtime remains paused after cinematic completion, producing a black screen on new game start
2. pointer pickup cannot reclaim bodies already orbiting assignable nodes
3. pointer preview semantics still describe carried bodies instead of target-node need
4. power job card data still carries legacy throttle-visibility semantics instead of a read-only power-usage presentation
5. required tests for the above fixes are missing

This document is grounded in the current code . It is constrained by the uploaded context pack, prompt contract, and testing standards. It is prescriptive and contains no optional paths.

---

## 2. Scope

### 2.1 In scope

This delta covers only:

- cinematic-completion runtime resume
- node-to-pointer body pickup
- pointer preview need-based semantics
- removal of legacy `showThrottleSlider` / `showsThrottle` gating from the power job card path
- tests required to lock these behaviors down

### 2.2 Out of scope

This delta must not add or change:

- habitus bubble work
- resource arcs / curved node bars
- new pointer selector UX beyond what is required by the fixes above
- further architectural cleanup not directly required by the five defects listed in Section 1

---

## 3. Current confirmed defects

## 3.1 Cinematic completion leaves runtime paused

Current code:

- `src/app-shell/useAppShellControllerCallbacks.ts`
- `src/ui/runtime/state/useRuntimeStore.ts`
- `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

Current behavior:

- `loadCartridge()` creates a paused runtime
- new game opens the main-menu cinematic
- `handleCinematicComplete()` closes the overlay but does not call `runtime.play()`
- `RuntimeShellCanvas` remains hidden while tick is `<= 2`

Required outcome:

- after a successful main-menu cinematic completion, runtime resumes and the canvas becomes visible
- after a runtime-triggered cinematic completion, runtime resumes

## 3.2 Pointer pickup cannot reclaim node-owned orbiting bodies

Current code:

- `src/game/systems/pointer/pointerSystemActions.ts`

Current behavior:

- pickup only considers bodies with `assignmentId === "sys_world"` and `assignmentStatus === "orbiting"`

Required outcome:

- pickup can reclaim orbiting bodies owned by `sys_world`, power nodes, and processing nodes
- pickup still excludes bodies already owned by `sys_pointer`
- pickup still excludes navigating bodies

## 3.3 Pointer preview semantics are incorrect for power nodes

Current code:

- `src/game/systems/pointer/pointerState.ts`
- `src/game/systems/PointerSystem.ts`
- `src/engine/phaser/pointer/PointerPreviewSystem.ts`

Current behavior:

- preview width and color are derived from carried-body totals
- target kind only toggles `power` vs `nervous`
- unmet node demand is not part of preview resolution

Required outcome:

- preview for power nodes is derived from the target node’s unmet demand and the carried set’s effective contribution to that unmet demand
- preview for processing nodes remains nervous
- preview remains immediate and wiggling

## 3.4 Power job card still uses legacy throttle-visibility semantics

Current code:

- `src/ui/runtime/world/selection/job-card/jobCardTypes.ts`
- `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`
- `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx`
- `src/ui/runtime/world/selection/job-card/JobCard.throttleVisibility.test.tsx`

Current behavior:

- power job card data still carries `showsThrottle`
- `resolveJobCardData()` still reads `powerSink.showThrottleSlider` and `isConditionalActivationThrottleHidden()`
- `PowerJobCardView` still gates `PowerMatrix` on `showsThrottle`

Required outcome:

- power job cards always render the read-only power-usage matrix when there is positive demand
- no legacy throttle-visibility gating remains in the job-card data path
- no slider is introduced

## 3.5 Tests are incomplete

Current behavior:

- no tests lock the cinematic-resume fix
- no tests lock node-body pickup
- no tests lock need-based preview semantics
- no tests lock the job-card data cleanup

Required outcome:

- the fixes above are covered by colocated unit, integration, and view tests consistent with the uploaded testing standards

---

## 4. Locked behavior after the delta

## 4.1 Cinematic completion contract

`handleCinematicComplete()` has exactly two behavior branches:

### Main-menu cinematic

If `params.shell.cinematicSource === "main-menu"`:

1. run `example/scripts/start.cvs`
2. if the script returns success:
   - restore tutorial completion memory
   - clear the temporary tutorial memory cache
   - call `params.runtime.play()`
   - close the cinematic overlay
3. if the script returns error:
   - do not call `play()`
   - do not close the cinematic overlay

### Runtime cinematic

If `params.shell.cinematicSource !== "main-menu"`:

1. call `params.runtime.play()`
2. close the cinematic overlay

No other branch is allowed.

## 4.2 Pointer pickup eligibility contract

A body is eligible for RMB pickup if and only if all of the following are true:

1. it is a body entity
2. it has a physics body in the current snapshot
3. `body.assignmentStatus === "orbiting"`
4. its current owner is one of:
   - `sys_world`
   - a power assignment node
   - a processing assignment node
5. its current owner is not `sys_pointer`
6. its world position is within the resolved pickup radius

Pointer pickup order is fixed:

1. nearest body to pointer center
2. stable tie-break by body id

Exactly one body is reassigned per pickup cadence tick.

## 4.3 Pointer preview contract

Preview state remains stored on `sys_pointer.state` using the existing keys:

- `pointer_preview_amount`
- `pointer_preview_body`
- `pointer_preview_mind`
- `pointer_preview_social`
- `pointer_preview_mode`

The semantics of those keys are fixed as follows.

### No target or no carried bodies

- `pointer_preview_mode = "none"`
- all numeric preview keys are `0`

### Power target

Let:

- `carried[attr]` = sum of carried-body attributes for `attr ∈ { body, mind, social }`
- `unmet[attr] = max(0, baseDemand[attr] - allocatedDraw[attr])`
- `effective[attr] = min(carried[attr], unmet[attr])`

Then:

- `pointer_preview_mode = "power"`
- `pointer_preview_body = effective[body]`
- `pointer_preview_mind = effective[mind]`
- `pointer_preview_social = effective[social]`
- `pointer_preview_amount = effective[body] + effective[mind] + effective[social]`

Color selection is fixed:

- choose the attribute with the greatest `effective[attr]`
- tie-break order is `body`, then `mind`, then `social`
- map that attribute to the existing palette used by `PointerPreviewSystem`

Width selection is fixed:

- derive width from `pointer_preview_amount`
- width is monotonic with `pointer_preview_amount`
- width must not use raw carried totals

If `pointer_preview_amount === 0`, no connection vein is rendered.

### Processing target

- `pointer_preview_mode = "nervous"`
- `pointer_preview_amount = carried body count`
- `pointer_preview_body = 0`
- `pointer_preview_mind = 0`
- `pointer_preview_social = 0`

Processing preview uses the existing nervous color path in `PointerPreviewSystem`.

## 4.4 Power job card contract

The power job card is read-only.

It must:

- render `PowerMatrix` whenever the entity has positive demand rows
- never read `powerSink.showThrottleSlider`
- never read `isConditionalActivationThrottleHidden()` for power-matrix visibility
- never carry `showsThrottle` in `PowerJobCardData`

This delta does not change any other selection-card component.

---

## 5. File-level design

Only files named below are to be changed or added.

## 5.1 Files to change

### `src/app-shell/useAppShellControllerCallbacks.ts`

**Responsibility**

Own shell-level callback behavior for new game, continue, load, and cinematic completion.

**Required logic change**

- Update `handleCinematicComplete()` to resume runtime in both completion branches defined in Section 4.1.
- Preserve the existing new-game start-script execution and tutorial-memory restore behavior.
- Preserve the existing continue/load behavior.
- Preserve the current error behavior when `run example/scripts/start.cvs` fails.

**Interface after change**

- function signature remains unchanged
- `handleCinematicComplete()` becomes the sole place where cinematic dismissal resumes runtime for this hook

---

### `src/game/systems/pointer/pointerSystemActions.ts`

**Responsibility**

Resolve pointer-triggered pickup and drop command emission from current snapshot state.

**Required logic change**

- Change pickup candidate filtering so it accepts eligible orbiting bodies owned by:
  - `sys_world`
  - power assignment nodes
  - processing assignment nodes
- Continue excluding:
  - bodies owned by `sys_pointer`
  - navigating bodies
  - non-body entities
  - entities without physics bodies
- Reuse the existing distance ordering from `resolveEligiblePickupIds()`.
- Keep the existing pickup cadence and one-body-per-cadence behavior.
- Keep existing drop behavior unchanged in this delta.

**Required existing-mechanism reuse**

- use `readAssignmentId()` and `readAssignmentStatus()` from `game/assignment/bodyAssignment.ts`
- use node classification from `game/assignment/assignmentNodeKinds.ts`
- reuse `resolveEligiblePickupIds()` and `resolvePickupCadenceMs()`

**Interface after change**

- exported function signatures remain unchanged
- emitted commands remain `ASSIGN_BODIES_BATCH` and `UPDATE_STATE`

---

### `src/game/systems/pointer/pointerState.ts`

**Responsibility**

Resolve pointer-side derived target and preview state and enqueue it to `sys_pointer.state`.

**Required logic change**

- Change `resolvePointerPreviewState()` so it derives preview values from the current target entity, not only target kind.
- Keep `collectPointerTargets()` behavior unchanged except for whatever parameter shape is needed by the new preview resolver.
- Preserve the existing preview state key names listed in Section 4.3.
- Implement the exact power-target and processing-target semantics defined in Section 4.3.

**Required existing-mechanism reuse**

- use `isAssignableTargetNode()` and `resolveAssignmentOwnerKind()` for target filtering/classification
- use the existing attribute names `body`, `mind`, `social`
- use existing `powerSink.baseDemand` and `powerSink.allocatedDraw`

**Interface after change**

- `resolvePointerPreviewState()` input changes from `(carriedBodies, targetKind)` to `(carriedBodies, targetEntity)` or an equivalent single-object shape that includes the full target entity
- `enqueuePointerState()` signature remains unchanged

---

### `src/game/systems/PointerSystem.ts`

**Responsibility**

Drive pointer-state resolution each tick.

**Required logic change**

- Pass the full target entity into the pointer preview resolver instead of only `target.kind`.
- Continue to resolve nearest target with existing target collection and radius logic.
- Continue to enqueue the same `sys_pointer.state` keys.

**Interface after change**

- public system interface remains unchanged
- internal call site to `resolvePointerPreviewState()` changes to match the updated interface in `pointerState.ts`

---

### `src/engine/phaser/pointer/PointerPreviewSystem.ts`

**Responsibility**

Render the pointer’s visual pickup and connection preview in Phaser.

**Required logic change**

- Keep the existing bright pickup-radius light and faint connection-radius light.
- Keep the existing immediate, wiggling path generation through `buildPointerPreviewPath()`.
- Change connection-vein style resolution so:
  - nervous preview uses `pointer_preview_mode === "nervous"`
  - power preview width uses `pointer_preview_amount`
  - power preview color uses the dominant `pointer_preview_body/mind/social` contribution defined in Section 4.3
- Do not use raw carried totals when choosing width or color.
- Continue to skip rendering the connection vein when preview amount is `0`.

**Required existing-mechanism reuse**

- reuse `buildPointerPreviewPath()`
- reuse `DisplayPaletteKey` and `DISPLAY_PALETTE_DEFAULT_COLORS`
- reuse the current `NERVOUS_COLOR` path

**Interface after change**

- class constructor and public methods remain unchanged
- state keys read from runtime remain the same; only their semantics change

---

### `src/ui/runtime/world/selection/job-card/jobCardTypes.ts`

**Responsibility**

Define job-card data contracts.

**Required logic change**

- Remove `showsThrottle` from `PowerJobCardData`.
- Keep all other fields unchanged.

**Interface after change**

`PowerJobCardData` contains:

- `variant`
- `label`
- `description`
- `sink`
- `liveEfficiency`
- `analysis`
- `storageModels`
- `traits`
- `parentSectionData`
- `suspiciousActivity`

It does not contain `showsThrottle`.

---

### `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`

**Responsibility**

Resolve render-ready job-card data from a runtime entity.

**Required logic change**

- Remove use of `isConditionalActivationThrottleHidden()` from the power job path.
- Remove use of `powerSink.showThrottleSlider` from the power job path.
- Stop writing `showsThrottle` to `PowerJobCardData`.
- Keep assignment-card behavior unchanged.
- Keep storage models, trait analysis, suspicious activity, and parent-section data unchanged.

**Interface after change**

- function signature remains unchanged
- returned power-job data matches the updated `PowerJobCardData` contract from `jobCardTypes.ts`

---

### `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx`

**Responsibility**

Render the power-node selection card.

**Required logic change**

- Remove the `showsThrottle` gate around `PowerMatrix`.
- Render `PowerMatrix` unconditionally.
- Rely on `PowerMatrix`’s own row filtering to return `null` when the entity has no demand rows.
- Do not introduce any slider control.

**Interface after change**

- component props remain unchanged except that `data.showsThrottle` no longer exists
- `PowerMatrix` is always mounted from this view and decides internally whether to render content

---

### `src/app-shell/useAppShellController.newGame.test.tsx`

**Responsibility**

Verify new-game controller behavior.

**Required test additions**

Add tests that prove:

1. after main-menu cinematic completion with successful `start.cvs`, `runtime.play()` is called exactly once
2. after main-menu cinematic completion with successful `start.cvs`, tutorial restoration still occurs
3. after main-menu cinematic completion with failed `start.cvs`, `runtime.play()` is not called and the cinematic remains open

**Interface after change**

- file remains a jsdom hook test
- no production code is imported differently

---

### `src/app-shell/useAppShellController.cinematic.test.tsx`

**Responsibility**

Verify generic cinematic-completion behavior.

**Required test additions**

Add or update tests that prove:

1. runtime-source cinematic completion calls `runtime.play()` exactly once
2. runtime-source cinematic completion closes the overlay
3. runtime-source cinematic completion does not run `start.cvs`

**Interface after change**

- file remains a jsdom hook test
- mocks remain shell-controller scoped

---

### `src/ui/runtime/world/selection/job-card/JobCard.throttleVisibility.test.tsx`

**Responsibility**

Verify the power job-card visibility contract.

**Required logic change**

- Update the test cases to reflect the new contract:
  - power requirements render whenever there is positive demand
  - `powerSink.showThrottleSlider` does not suppress the power matrix
  - conditional-activation throttle-hide state does not suppress the power matrix
- Keep the file if desired; renaming is out of scope for this delta.

**Interface after change**

- remains a jsdom view test
- asserts `PowerMatrix` presence by `data-testid`
- does not assert any slider behavior

---

## 5.2 Files to add

### `src/game/systems/pointer/pointerSystemActions.test.ts`

**Responsibility**

Unit-test pickup filtering and command emission in `pointerSystemActions.ts`.

**Required coverage**

1. picks the nearest orbiting body owned by `sys_world`
2. picks the nearest orbiting body owned by a power node
3. picks the nearest orbiting body owned by a processing node
4. does not pick bodies already owned by `sys_pointer`
5. does not pick bodies in `navigating` state
6. emits at most one `ASSIGN_BODIES_BATCH` per cadence step
7. preserves distance-first, id-second ordering

**Test style requirement**

- unit test with explicit Given / When / Then structure
- use small real data objects; do not mock the snapshot shape more than needed

---

### `src/game/systems/pointer/pointerState.test.ts`

**Responsibility**

Unit-test need-based preview-state resolution.

**Required coverage**

1. no carried bodies returns `mode = none` and zero preview values
2. no target returns `mode = none` and zero preview values
3. power target computes `effective[attr] = min(carried[attr], unmet[attr])`
4. power target sets `pointer_preview_amount` to the sum of effective contributions
5. power target ignores excess carried power beyond unmet demand
6. power target with zero unmet demand returns zero preview amount
7. processing target sets nervous mode and uses carried-body count as preview amount
8. dominant attribute tie-break order is `body`, then `mind`, then `social`

**Test style requirement**

- pure unit test only
- no DOM, no Phaser

---

## 6. Files not to change in this delta

The following files are intentionally unchanged by this delta:

- `src/ui/runtime/world/pointer/PointerSelectorOverlay.tsx`
- `src/ui/runtime/world/pointer/usePointerBodySelector.ts`
- `src/ui/runtime/world/pointer/resolvePointerSelectorPreview.ts`
- `src/game/systems/pointer/pointerDropChoice.ts`
- `src/game/systems/ProcessingNodeSystem.ts`
- `src/game/systems/BodyAssignmentSystem.ts`

Reason:

- the current review did not identify defects in those files that must be changed to resolve the five in-scope issues in Section 1
- changing them would expand scope beyond the confirmed delta

---

## 7. Implementation order

The work must be implemented in this order:

1. fix cinematic completion resume path in `useAppShellControllerCallbacks.ts`
2. add the controller tests for cinematic resume
3. fix pointer pickup eligibility in `pointerSystemActions.ts`
4. add pickup tests in `pointerSystemActions.test.ts`
5. fix preview semantics in `pointerState.ts` and wire the updated call in `PointerSystem.ts`
6. update `PointerPreviewSystem.ts` to consume the corrected preview semantics
7. add preview-state tests in `pointerState.test.ts`
8. remove legacy throttle-visibility gating from the power job-card path
9. update the job-card view test to lock the new contract

This order is mandatory.

---

## 8. Acceptance criteria

The delta is complete only when all of the following are true:

1. starting a new game, completing the opening cinematic, and closing the overlay resumes runtime immediately
2. completing a runtime-triggered cinematic resumes runtime immediately
3. orbiting bodies already assigned to power and processing nodes can be picked back up by the pointer
4. preview vein width and color for power nodes reflect unmet node demand filtered by carried effective contribution
5. processing-node preview remains nervous and uses carried-body count for thickness
6. no legacy `showsThrottle` or `showThrottleSlider` gating remains in the power job-card path
7. all new and updated tests pass
8. no unrelated files are changed

