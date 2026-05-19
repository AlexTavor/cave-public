# LLD: Canonical Interaction Target Fix for Carrier Collection

## 1. Scope and governing constraints

This design is intentionally narrow. It changes only the Phaser display interaction plumbing that determines which game object receives entity-selection input. It does **not** change carrier runtime behavior, command execution, ECS state shape, selection state shape, or React/store flow. That scope is required by the project’s architecture and prompt contract: runtime state remains command-driven, UI continues to observe and propose change, and unrelated refactors are out of scope. fileciteturn1file0 fileciteturn1file1

The test plan below is behavior-first, colocated, and explicit about negative/edge cases, per the testing standard. fileciteturn1file2

---

## 2. Code basis inspected

The design below is based on the uploaded source, specifically these files:

- `src/game/systems/CarrierInteractionSystem.ts`
- `src/ui/runtime/world/context/useSyncRuntimeSelection.ts`
- `src/engine/phaser/display/modules/InteractionModule.ts`
- `src/engine/phaser/display/interactionHitArea.ts`
- `src/engine/phaser/display/EntityVisualInstanceRuntime.ts`
- `src/engine/phaser/display/DisplayInstanceManager.tutorialAttention.ts`
- `src/engine/phaser/display/DisplayDefinitionCatalog.ts`
- `src/engine/phaser/display/modules/BackgroundModule.ts`
- `src/engine/phaser/display/modules/CaveBackgroundModule.ts`
- `src/engine/phaser/display/EntityVisualInstanceHelpers.ts`
- `src/engine/phaser/display/layers/LayerIds.ts`
- `src/game/carriers/carrierMotion.ts`
- `src/data/schemas/v2/systemDefaults.ts`

No assumptions below depend on files that were not read.

---

## 3. Problem statement

### 3.1 Observed runtime contract

`CarrierInteractionSystem` is already correct in isolation. It reads `sys_world.state.cave_selected_entity_id`, resolves the selected entity, and executes carrier commands only when the selected entity is a carrier.

`useSyncRuntimeSelection` is also already correct in isolation. When the UI store selection changes, it writes that value into `sys_world.state.cave_selected_entity_id` through `UPDATE_STATE`.

Therefore, if a clicked carrier does not trigger `CarrierInteractionSystem`, the failure is **upstream of runtime sync**: the click is not reliably becoming the selected entity id.

### 3.2 Actual display-side defect

The current interaction contract is split by render composition:

- `InteractionModule` binds interaction to `scratch.backgroundImage` when it exists.
- Otherwise it binds interaction to `scratch.root`.

That means the interactive object is **not canonical**. It depends on whether the display stack happened to materialize a `backgroundImage`.

That split is real in the current display definitions:

- generic/resource-style nodes use `BackgroundModule` + `InteractionModule`
- cave uses `CaveBackgroundModule` + `InteractionModule`

`BackgroundModule` writes `scratch.backgroundImage`; `CaveBackgroundModule` does not.

At the same time:

- `root` lives on `LayerId.Entities`
- `backgroundAnchor` lives on `LayerId.Background`

So the current interaction target is also layer-dependent.

The same non-canonical target resolution is duplicated in two more places:

- `EntityVisualInstanceRuntime.updateScratchInteraction`
- `DisplayInstanceManager.tutorialAttention.setInstanceInteractionBlocked`

Those files also resolve `backgroundImage ?? root`.

### 3.3 Why carriers are the concrete failure

Carriers resolve through the generic/resource node path, so they take the `backgroundImage` interaction branch. The cave does not. The system therefore gives carriers and cave different input anchors even though both are entities participating in the same selection flow.

That is the defect to fix.

---

## 4. Root cause

The root cause is **not** `CarrierInteractionSystem`.

The root cause is that display interaction is bound to a render-dependent object (`backgroundImage`) instead of a single canonical entity anchor (`root`), and that same incorrect rule is duplicated across create/tick/restore/tutorial-blocking paths.

This violates a required invariant:

> Entity selection, interaction restoration, and tutorial interaction blocking must all target the same display object for a given entity.

That invariant is not true today.

---

## 5. Design objective

Make `scratch.root` the **only** interactive target for entity selection and interaction blocking/restoration.

This is the smallest change that fixes the actual defect while preserving the existing runtime contract.

---

## 6. Non-goals

This design does **not**:

- change `CarrierInteractionSystem`
- change `useSyncRuntimeSelection`
- change carrier orbit motion
- change cave radius or carrier radius
- change display definitions or layer depths
- add new runtime commands
- add new UI state
- introduce a new interaction subsystem

---

## 7. Final behavioral contract

After the fix, the following statements must all be true:

1. Every selectable entity binds pointer interaction to `scratch.root`.
2. `scratch.backgroundImage` is visual-only for interaction purposes.
3. The canonical hit circle is centered in `root` local space and uses `spec.radius`.
4. Tutorial blocking and interaction restoration operate on the same target that `InteractionModule` bound.
5. Clicking a carrier selects that carrier entity id.
6. When selection sync writes that carrier id into `sys_world.state.cave_selected_entity_id`, `CarrierInteractionSystem` executes exactly as it does today.

No other behavior changes.

---

## 8. Detailed design

## 8.1 Production files to change

### File 1: `src/engine/phaser/display/interactionHitArea.ts`

**Responsibility**

Own hit-area binding/refresh/restore utilities for display interaction.

**Why this file changes**

The codebase currently has three separate call sites deciding which display object is “interactive.” That decision must become canonical in one existing interaction utility module.

**Change**

Add a single helper that resolves the canonical interaction target from `DisplayScratch`.

**Required logic**

- Input: `DisplayScratch`
- Output: the entity’s canonical interactive target
- Resolution rule: return `scratch.root`
- No fallback to `backgroundImage`
- If `root` is absent, return `null` or equivalent non-target result

**Interface**

Add one exported helper with this contract:

- accepts `DisplayScratch`
- returns the canonical interactive display object
- has no side effects

**Pseudocode**

- read `scratch.root`
- if missing, return null
- else return `scratch.root`

**Important note**

This helper is not a new abstraction layer. It is a normalization of an already duplicated rule into the existing interaction utility module.

---

### File 2: `src/engine/phaser/display/modules/InteractionModule.ts`

**Responsibility**

Bind entity-selection input at display-instance creation time and maintain the hit area over ticks.

**Why this file changes**

It currently has two incompatible paths:
- background-image-backed interaction
- root-backed interaction

That split must be removed.

**Change**

Replace the current `backgroundImage`-preferred target selection with the canonical target helper from `interactionHitArea.ts`.

**Required logic**

On `create`:

- resolve the canonical interaction target from `scratch`
- if absent, log the existing error and return inert runtime
- bind the interactive circle to that target
- set `entityId` data on that target
- attach `pointerdown` listener to that target
- on pointerdown:
  - if tutorial-blocked, do nothing
  - else call `selectEntity(spec.entityId)`

On `tick`:

- refresh the interactive circle on the same canonical target
- set `input.enabled` based on:
  - `spec.hasPhysics`
  - `isRadiusVisible(spec.radius)`
  - tutorial-blocked flag
- do **not** gate on `backgroundImage.visible`
- the visual object’s visibility is no longer the input contract

On `destroy`:

- remove `pointerdown` listeners from the same canonical target
- disable interaction on that same target

**Interface**

No public interface change.
`InteractionModule` remains a `DisplayModuleFactory`.

**Behavioral contract**

- `backgroundImage` presence must not change which object receives interaction.
- `entityId` metadata must exist on `root`, not on `backgroundImage`.
- Root is now the single source of input truth.

---

### File 3: `src/engine/phaser/display/EntityVisualInstanceRuntime.ts`

**Responsibility**

Restore or toggle display interaction state for an already-created visual instance.

**Why this file changes**

It currently restores/toggles `backgroundImage ?? root`, which will become inconsistent with the new `InteractionModule` behavior unless updated.

**Change**

Make `updateScratchInteraction` operate on the canonical interaction target only.

**Required logic**

When `blocked === true`:

- resolve canonical target
- if target has input, disable it
- otherwise do nothing

When `blocked === false`:

- resolve canonical target
- if target already has input, set `input.enabled = true`
- otherwise restore interaction from the stored hit area on that same target

**Interface**

No public interface change.

**Behavioral contract**

- restore/unblock must target the same object that `InteractionModule` originally bound
- `backgroundImage` must never be restored as an interactive target

**Explicit non-change**

`setScratchAlpha` remains visual behavior and stays separate from input targeting.

---

### File 4: `src/engine/phaser/display/DisplayInstanceManager.tutorialAttention.ts`

**Responsibility**

Apply tutorial attention effects, including non-focused interaction blocking.

**Why this file changes**

It currently blocks `backgroundImage ?? root`, which will be wrong after `InteractionModule` is fixed unless this file is made consistent.

**Change**

Make `setInstanceInteractionBlocked` resolve and modify only the canonical interaction target.

**Required logic**

- resolve canonical interaction target from instance scratch
- set `__tutorialInteractionBlocked` on that target
- if target has input, set `input.enabled = !blocked`
- if input does not exist:
  - when blocked, disable if possible
  - when unblocked, preserve current fallback test behavior (`interactiveEnabled`) only for the resolved root target

**Interface**

No public interface change.

**Behavioral contract**

Tutorial attention must never block a different target than the one used for actual selection.

---

## 8.2 Production files explicitly not changed

These files were read and remain unchanged by design:

- `src/game/systems/CarrierInteractionSystem.ts`
- `src/ui/runtime/world/context/useSyncRuntimeSelection.ts`
- `src/engine/phaser/display/DisplayDefinitionCatalog.ts`
- `src/engine/phaser/display/modules/BackgroundModule.ts`
- `src/engine/phaser/display/modules/CaveBackgroundModule.ts`
- `src/engine/phaser/display/EntityVisualInstanceHelpers.ts`
- `src/engine/phaser/display/layers/LayerIds.ts`
- `src/game/carriers/carrierMotion.ts`
- `src/data/schemas/v2/systemDefaults.ts`

Reason: these files describe existing runtime flow, display composition, and layout facts that explain the bug, but they are not the defect location.

---

## 9. Test design

Tests must verify behavior, not internal implementation detail. The behavior under test is: **presence of `backgroundImage` must not change input ownership**. fileciteturn1file2

## 9.1 Test files to change

### File 5: `src/engine/phaser/display/modules/InteractionModule.test.ts`

**Responsibility**

Unit-test interaction target binding and selection wiring.

**Change**

Replace the obsolete assertion:

- current behavior: “uses backgroundImage as target when scratch.backgroundImage is not null”

with the new contract:

- “uses root as target even when scratch.backgroundImage is present”

**Required assertions**

Given both `root` and `backgroundImage` exist:

- `root` becomes interactive
- `backgroundImage` does not become the interactive target
- `pointerdown` on the bound target selects the entity id exactly once

---

### File 6: `src/engine/phaser/display/modules/InteractionModule.backgroundHitArea.test.ts`

**Responsibility**

Verify hit-area shape maintenance when a background image exists.

**Change**

Update the test so it no longer assumes image-backed interaction.

**Required assertions**

Given both `root` and `backgroundImage` exist:

- the hit area is bound to `root`
- the hit area center remains root-local center
- the radius refreshes from initial radius to tick radius
- background-image presence does not alter target ownership

**Note**

The file name is now slightly misleading but still acceptable if the team prefers to avoid file churn. If the team wants exact naming, this file may be renamed instead of modified. That rename is optional and not required for correctness.

---

### File 7: `src/engine/phaser/display/EntityVisualInstanceRuntime.test.ts`

**Responsibility**

Verify interaction restoration/unblocking behavior.

**Change**

Replace the obsolete background-image restoration test.

**Required assertions**

Given `root` and `backgroundImage` both exist:

- unblocking restores/enables interaction on `root`
- `root.setInteractive(...)` is used when input was cleared and a stored hit area exists
- `backgroundImage` is not restored as the interactive target

Keep existing root-only tests.

---

## 9.2 Test file to add

### File 8: `src/engine/phaser/display/DisplayInstanceManager.tutorialAttention.interaction.test.ts`

**Responsibility**

Verify tutorial attention blocks the canonical target when an instance has both `root` and `backgroundImage`.

**Why add this file**

There is currently no focused test that covers tutorial interaction blocking for the dual-object case, which is exactly where the bug originates.

**Required assertions**

Case A: blocking
- Given an instance with both `root` and `backgroundImage`
- And tutorial attention with `blockNonFocusedInteraction = true`
- When the instance is non-focused
- Then the root target is marked blocked
- And root interaction is disabled

Case B: unblocking
- Given the same instance
- When tutorial attention no longer blocks
- Then root interaction is re-enabled/restored

**Negative assertion**
- The test must not require `backgroundImage` to become interactive or blocked

---

## 10. Acceptance criteria

The implementation is complete only when all of the following are true:

1. `InteractionModule` binds interaction to `root` only.
2. `updateScratchInteraction` restores/enables `root` only.
3. Tutorial attention blocks/unblocks `root` only.
4. Existing carrier runtime behavior remains unchanged.
5. All updated and new tests pass.
6. No unrelated production files are touched.
7. No TODOs, feature creep, or speculative refactors are introduced. fileciteturn1file1

---

## 11. Risk assessment

### Primary risk
Low.

This is a localized contract correction in display interaction plumbing.

### Compatibility risk
Low to moderate.

Any entity that previously relied on `backgroundImage` being the interactive target will now use `root`. In this codebase that is the intended normalization, because:

- interaction circle is already radius-based
- entity position is already owned by the transform/root anchor
- root is already the stable anchor across instance lifecycle

### Runtime risk
Low.

No ECS mutation path changes. No command semantics change. No system ordering change. This preserves the command/apply discipline required by the context pack. fileciteturn1file0

---

## 12. Implementation summary

### Why
Carrier collection fails because selection input is bound to a render-dependent target (`backgroundImage`) instead of the canonical entity anchor. That same incorrect rule is duplicated across interaction creation, restoration, and tutorial blocking.

### What
Normalize the interaction target to `scratch.root` everywhere input ownership is decided.

### How
Change the existing interaction utility and the three production call sites that currently resolve `backgroundImage ?? root`, then update/add tests so the contract is explicit and enforced.
