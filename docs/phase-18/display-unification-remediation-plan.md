# Display unification remediation plan

## Objective

Restore the display-unification implementation to the contract already defined in `display-unification-lld.md`, eliminate the three live regressions now visible in the repository state, and finish only the missing work needed to make the system coherent:

1. React icon surfaces must render actual display images.
2. Runtime/world displays must stop collapsing to the same wood display.
3. The `.art` displays editor must stop crashing when a display asset is opened or edited.

This plan is implementation-scoped. It is intended for an agent working in the IDE.

## Constraints

- Do not introduce new product behavior beyond the existing display-unification contract.
- Reuse existing mechanisms where they already exist: `resolveDisplaySource`, `DisplayImageExportService`, `resolveDisplaySpec`, the existing Phaser display stack, the existing module/session stores, and the existing FlexLayout shell.
- Do not reintroduce emoji or icon-registry rendering as a fallback.
- Do not leave legacy compatibility paths as authoritative runtime behavior.
- Do not change unrelated gameplay logic.
- All changes must end with green tests and no silent fallback behavior.

## Verified current defects

### Defect A — React icon surfaces are blank

Verified current code:

- `ui/lib/atoms/game-icon/GameIcon.tsx`
  - renders `<img>` only when `useResolvedDisplayIcon(id)` returns a non-null `url`
  - otherwise renders nothing
- `ui/lib/foundation/icon-registry/useResolvedDisplayIcon.ts`
  - does not resolve authored displays from the active module/session draft
  - only guesses `blueprint` vs `display` request kind
  - always delegates rendering to `useDisplayImageUrl(...)`
- `engine/phaser/display-export/resolveDisplayImageSpec.ts`
  - always reads assets and blueprints from `scene.readRuntime().getCartridge()`
  - cannot render an editor/module draft display unless that exact display also exists inside the scene runtime cartridge
- `ui/devtools/layout/LayoutRuntimeCanvas.tsx`
  - calls `usePhaserGame(... publishDisplayImages: false)`
  - therefore layout/devtools runtime surfaces never publish the display export service
- `ui/runtime/world/display-images/useDisplayImageUrl.ts`
  - returns `{ url: null, status: "idle" }` whenever the export service is not registered

Result:

- editor surfaces and layout-runtime surfaces have no usable export service
- even when a service exists, editor/module draft displays are not resolved from the editor’s source of truth
- `GameIcon` renders `null` instead of a visible fallback

### Defect B — most world displays collapse to the same wood display

Verified current code:

- `data/raw/example/modules/assets.art`
  - still authored with legacy `icons` and `resources`
  - not migrated to `displays`
- many example blueprints and drafts still use legacy ids such as:
  - `resource_wood`
  - `resource_food`
  - `activity_forest`
  - `activity_lumber`
  - `pool_icon`
  - `outside`
  - `status_exhausted`
- `data/schemas/assets/normalizeLegacyArt.ts`
  - synthesizes `assets.displays` from legacy inputs
  - only maps legacy `resources` keys directly
  - only maps `attr_*` from legacy `icons`
  - synthesizes `unknown` and `loading` from a shared style/glyph fallback chosen from `unknown`, `loading`, `wood`, `egg`, `hearth`, then defaulting to `wood`
- `lib/displays/resolveDisplaySource.ts`
  - still contains a non-contract `placeholder` branch
- `ui/runtime/world/selection/job-card/jobAnalysis.external.ts`
  - still emits `resource_${action.resource}` icon keys
- `ui/runtime/world/selection/components/TraitList.tsx`
  - still maps `food` to `resource_food`
- `ui/lib/foundation/icon-registry/IconKey.ts`
  - still contains legacy display ids

Result:

- the authored content is not using canonical display keys
- most lookups miss authored `assets.displays`
- misses resolve to synthesized `unknown`
- synthesized `unknown` currently resolves to the wood style/glyph pair
- many runtime visuals therefore converge on the same wood display

### Defect C — opening/editing a display asset can trigger a FlexLayout redraw loop

Verified current code:

- `ui/devtools/editors/assets/useAssetSession.ts`
  - registers a tab guard in an effect whose dependency list includes `isDirty`, `handleSave`, and `handleDiscard`
  - cleans up with `removeGuard(tabId)` on every effect re-run, not only on actual unmount / tab change
- `ui/devtools/state/tabGuardStore.ts`
  - `upsertGuard(...)` always writes a fresh store object, even when nothing semantically changed
- display editing is one of the new editor paths that uses this shared asset-session/tab-guard path
- the reported runtime stack terminates in FlexLayout redraw code during layout effects

Result:

- the display-asset tab path is vulnerable to a mount/update feedback loop between editor state changes and FlexLayout redraw
- the current guard registration path is not stable enough for tabbed editor usage

## Remediation order

Implement in this exact order.

1. Fix icon rendering/export wiring.
2. Remove legacy fallback authority and complete key/data migration.
3. Stabilize the display editor tab lifecycle.
4. Delete remaining detritus that contradicts the contract.
5. Add regression coverage.

Do not reorder. The first two defects invalidate visual verification for the third.

---

## Bug 1 — Restore React display-image rendering everywhere

### Required outcome

Every `GameIcon` surface must resolve through the unified display path and render an actual image for:

- authored display assets from the active editor/module draft
- blueprint fallback keys
- runtime keys in the active game/layout runtime
- authored `unknown` / `loading` keys

Blank icon output is not acceptable.

### Files to change

#### `ui/devtools/layout/LayoutRuntimeCanvas.tsx`

**Responsibility**

Mount the layout/runtime Phaser canvas used by editor/runtime hybrid views.

**Required change**

Change it to publish display images.

**Required logic**

- call `usePhaserGame(... publishDisplayImages: true)`
- do not add a second export service path
- continue using the existing `usePhaserGame` + `bindDisplayImageExportService` seam

**Reason**

The current `false` value guarantees that layout-runtime icons cannot render.

#### `ui/lib/foundation/icon-registry/useResolvedDisplayIcon.ts`

**Responsibility**

Resolve a display key for React icon consumers.

**Required change**

Replace the current “blueprint-or-display request guesser” with a real unified resolver-backed hook.

**Required logic**

- read the active editor source of truth in this precedence order:
  1. active module session draft for `activeModuleFilename`
  2. persisted module data for `activeModuleFilename`
  3. active runtime cartridge
- call the shared display-source resolver against those assets and blueprints
- return a resolved-source object, not only a guessed request kind
- when the resolved source is an authored display, prepare an export request that contains enough information to render that authored display even when it is only present in the editor draft/module and not in the scene runtime cartridge
- when the resolved source is a blueprint fallback, prepare a blueprint export request
- when the resolved source is `unknown`, prepare an authored-unknown export request
- when the key is missing and authored `unknown` is also missing, fail loudly instead of silently returning blank UI

**Do not do**

- do not read from the old icon registry
- do not synthesize emoji or image URLs directly in the hook

#### `engine/phaser/display-export/DisplayImageExportTypes.ts`

**Responsibility**

Define the request contract for display-image export.

**Required change**

Extend the request union so the service can render both runtime-backed and editor/module-backed display sources.

**Required logic**

The request contract must distinguish at least these cases:

- authored display source
- blueprint fallback source
- body-avatar source

For the authored-display case, the request must carry the exact resolved authored data required to render the display without re-deriving it from the scene runtime cartridge.

That means the authored-display request must be able to provide:

- display key
- display asset
- any referenced style needed for rendering

The service must not rely on the scene runtime cartridge for editor-only authored assets.

#### `engine/phaser/display-export/resolveDisplayImageSpec.ts`

**Responsibility**

Convert an export request into a renderable display-image spec.

**Required change**

Split runtime-backed resolution from authored-source-backed resolution.

**Required logic**

- for authored-display requests, derive the glyph/style pair from the request payload itself
- for blueprint requests, continue to use `resolveDisplaySpec(...)` against the runtime cartridge
- for body-avatar requests, keep the existing body-avatar path
- remove the current behavior that assumes every `display` request must be resolvable from `scene.readRuntime().getCartridge()`
- remove the `placeholder` success path for unresolved requests; unresolved export must fail loudly

#### `engine/phaser/display-export/DisplayImageExportService.ts`

**Responsibility**

Render and cache image URLs for display requests.

**Required change**

Support the new request types without changing the service’s role.

**Required logic**

- keep the existing cache ownership in this service
- cache keys must differentiate authored-display requests from blueprint requests
- authored-display requests must cache deterministically by the authored display payload actually rendered, not only by a bare display key
- blueprint requests must keep using runtime-seed-aware cache keys
- body-avatar requests keep their existing cache behavior
- unsupported requests must throw with explicit error text

#### `ui/lib/atoms/game-icon/GameIcon.tsx`

**Responsibility**

Render the resolved icon/display image in React.

**Required change**

Stop returning a blank container when the request is unresolved or still pending.

**Required logic**

- when the resolved export is ready, render the image normally
- when the primary request is unresolved, request/render authored `unknown`
- when the primary request is loading, request/render authored `loading` if available
- if the export service itself is absent, log loudly and render the same authored `unknown` path once the service becomes available
- never silently render `null` for a resolvable display key

Do not reintroduce emoji rendering.

### Validation for Bug 1

Manual:

- icons are visible in asset grids, icon picker, draft cards, and lens/selection cards
- icons are visible in layout-runtime/editor contexts without requiring the gameplay shell

Tests:

- `GameIcon` renders a display image for an authored display asset resolved from editor/module data
- `GameIcon` renders blueprint fallback images by blueprint id
- `GameIcon` renders authored `unknown` when the requested key is missing
- layout runtime publishes a display export service

---

## Bug 2 — Remove the wood fallback collapse and complete canonical key migration

### Required outcome

All display resolution must obey the contract:

1. exact `assets.displays` match
2. else exact blueprint id match
3. else exact authored `unknown`

There must be no runtime behavior where unresolved legacy keys collapse to a synthesized wood display.

### Files to change

#### `data/raw/example/modules/assets.art`

**Responsibility**

Repository example authored display assets.

**Required change**

Fully migrate the file from legacy `icons` / `resources` to canonical `displays`.

**Required logic**

- delete the legacy `icons` root
- delete the legacy `resources` root
- add a `displays` root only
- create explicit display entries for all keys that are still used by example content
- define authored `unknown`
- define authored `loading`
- use canonical transfer/resource display keys such as:
  - `wood`
  - `food`
  - `heat`
  - `fire`
  - `edibles`
- keep attribute pools as `attr_body`, `attr_mind`, `attr_social`
- keep any intentionally special blueprint ids or built-ins unchanged only where they are actually part of the design

#### `data/raw/example/modules/*.bp`
#### `data/raw/example/modules/*.draft`

**Responsibility**

Repository example gameplay content.

**Required change**

Replace legacy display keys with canonical display keys or blueprint ids.

**Required logic**

This includes, at minimum, the currently verified keys:

- `resource_wood` -> `wood`
- `resource_food` -> `food`
- `resource_heat` -> `heat`
- `resource_fire` -> `fire`
- `resource_edibles` -> `edibles`
- `activity_forest` -> a real authored display key or a blueprint id that exists in `displays`
- `activity_lumber` -> same rule as above
- `pool_icon` -> a real authored display key or a blueprint id that exists in `displays`
- `outside` -> a real authored display key or a blueprint id that exists in `displays`
- `status_exhausted` -> a real authored display key or blueprint id if still intended

Do not keep legacy ids alive through adapter logic.

#### `data/schemas/assets/normalizeLegacyArt.ts`

**Responsibility**

Legacy input normalization for `.art` parsing.

**Required change**

Remove the current synthesized-authority behavior.

**Required logic**

- stop generating `unknown` and `loading` from an arbitrary shared style/glyph pair
- stop making legacy `resources` or legacy `icons` the effective runtime source of truth
- keep only the minimum compatibility normalization needed to read old files without crashing
- compatibility normalization must not invent a wood-based fallback
- if compatibility input is missing authored `unknown`, parsing should surface that explicitly rather than silently fabricating a display from `wood`

If this file is no longer needed after example data migration and test updates, delete it and remove its preprocess usage.

#### `lib/displays/resolveDisplaySource.ts`

**Responsibility**

Canonical display resolution.

**Required change**

Bring it into exact contract compliance.

**Required logic**

- keep authored display match first
- keep blueprint fallback second
- keep authored `unknown` third
- keep only truly intentional built-in cases that are still explicitly part of the design (`body_avatar`, `cave_level`, attribute pools, other retained special keys)
- remove the generic `placeholder` success path
- unresolved state without authored `unknown` must fail loudly

#### `engine/phaser/display-export/resolveDisplayImageSpec.ts`

**Responsibility**

Display export resolution.

**Required change**

Make unresolved requests fail loudly rather than drifting into non-contract fallback behavior.

**Required logic**

- remove the current `placeholder` branch behavior for ordinary unresolved keys
- only blueprint fallback is allowed after authored-display resolution misses
- if the request is neither an authored display nor a blueprint and authored `unknown` is absent, throw

#### `ui/runtime/world/selection/job-card/jobAnalysis.external.ts`

**Responsibility**

Derive UI yield icons for external transfer/spawn actions.

**Required change**

Emit canonical resource display keys.

**Required logic**

- `TRANSFER` yield icons must use `action.resource` directly
- stop emitting `resource_${action.resource}`

#### `ui/runtime/world/selection/components/TraitList.tsx`

**Responsibility**

Display trait effect icons.

**Required change**

Use canonical display keys.

**Required logic**

- map `food` to `food`, not `resource_food`
- update any other legacy `resource_*` mappings found during implementation

#### `ui/lib/foundation/icon-registry/IconKey.ts`

**Responsibility**

Shared convenience constants for icon/display ids.

**Required change**

Delete legacy ids that contradict the canonical display vocabulary.

**Required logic**

Remove aliases such as `resource_*` and any other deprecated display ids once call sites are migrated.

#### `engine/runtime/handlers/transferPendingBuilder.ts`

**Responsibility**

Build pending transfer entities.

**Required change**

Confirm and lock in canonical transfer display-key behavior.

**Required logic**

- `display.display_key` must remain the first payload key or `unknown`
- do not restore any transfer-specific visual snapshot or transfer-only visual key adapter

### Validation for Bug 2

Manual:

- runtime entities that previously rendered as wood now render distinct authored displays
- only intentional special cases remain visually special: avatars, cave, attribute pools, other explicitly retained special stacks

Tests:

- `.art` parsing/serialization round-trips `displays` only
- example content validates with canonical display keys
- `resolveDisplaySource(...)` resolves authored display, blueprint fallback, and authored `unknown` only
- transfer job/yield analysis emits canonical resource keys

---

## Bug 3 — Eliminate the display editor / FlexLayout redraw loop

### Required outcome

Opening and editing a display asset must not trigger `Maximum update depth exceeded`.

### Files to change

#### `ui/devtools/editors/assets/useAssetSession.ts`

**Responsibility**

Provide the shared editor session wrapper for asset tabs.

**Required change**

Make tab-guard registration stable and unidirectional.

**Required logic**

- do not unregister and re-register the tab guard on every render or every dirty-state change
- split the current effect into:
  - one lifecycle path that registers the guard for the current `tabId` and cleans it up only on actual unmount / tab-id change
  - one update path that mutates guard metadata only when `title` or `isDirty` actually changed
- keep `requestSave` and `discardChanges` stable across renders using refs or stable callbacks
- do not allocate a fresh async no-op on every render for the clean state

This hook is shared. Fix it once here rather than introducing display-editor-specific guard logic.

#### `ui/devtools/state/tabGuardStore.ts`

**Responsibility**

Store tab guard state for dirty/save/discard flows.

**Required change**

Make `upsertGuard(...)` idempotent.

**Required logic**

- if the incoming guard is semantically unchanged from the existing guard, return the current store state without allocating a new `guards` object
- only write when at least one persisted field actually changed
- preserve existing `removeGuard(...)` behavior

#### `ui/devtools/editors/assets/display/useDisplayEditor.ts`

**Responsibility**

Bind the display editor to the asset session.

**Required change**

Keep it purely editor-state-facing.

**Required logic**

- do not add any layout or shell mutation here beyond the existing rename/open-file behavior
- after stabilizing `useAssetSession`, confirm this hook contains no additional render-loop triggers
- if a problem remains after the shared session fix, isolate it here and fix it locally, but do not fork asset-session behavior unless proven necessary

#### `ui/devtools/editors/assets/display/DisplayEditor.tsx`

**Responsibility**

Render the custom display editor form.

**Required change**

No behavioral refactor is planned here unless the shared session fix is insufficient.

**Required logic**

- keep JSX presentation-only
- no business logic should move into this file
- if any editor-only mount side effect is later found, move it into the hook/store layer, not into JSX

### Validation for Bug 3

Manual:

- opening an existing display asset tab does not crash
- typing in `styleId`, `glyphKey`, `tooltip`, and `tags` does not crash
- changing `type` between `resource`, `attribute_pool`, and `body` does not crash
- renaming a display asset does not crash

Tests:

- view/integration test mounting the display editor inside the FlexLayout window manager and editing multiple fields without throwing
- `useAssetSession` regression test proving that dirty-state transitions do not churn tab-guard registration
- `tabGuardStore` unit test proving `upsertGuard` is a no-op for unchanged guard payloads

---

## Cleanup required before sign-off

These files still contradict the LLD and must not remain authoritative after the above bugs are fixed:

- `data/schemas/assets/icons.ts`
- `data/schemas/assets/resources.ts`
- `data/schemas/assets/resourceTransferVisual.ts`
- `engine/runtime/handlers/transferRender.ts`
- `engine/runtime/handlers/transferRenderTypes.ts`
- transfer-only Phaser modules under `engine/phaser/display/modules/`
- any tests that still assert `resource_*`, emoji, or transfer-only render behavior

Delete them or rewrite their tests only after the replacement behavior is fully in place.

## Test plan

### Unit

Add or update:

- `lib/displays/resolveDisplaySource.test.ts`
  - authored display
  - blueprint fallback
  - authored unknown
  - no generic placeholder success path
- `ui/devtools/state/tabGuardStore.test.ts`
  - idempotent upsert
  - changed guard writes once
- `ui/runtime/world/selection/job-card/jobAnalysis.external.test.ts`
  - transfer icons emit canonical resource keys
- any helper tests added for the new authored-display export request builder

### Integration

Add or update:

- display export service integration for:
  - authored display asset from editor/module data
  - blueprint fallback
  - body-avatar
- `.art` parsing integration using migrated `displays`
- runtime/entity display resolution integration proving distinct authored displays survive end-to-end

### View

Add or update:

- `GameIcon` renders an authored display image and does not render blank when a key is resolvable
- layout runtime publishes the export service
- asset grid / icon picker shows visible display previews
- display editor can be opened and edited inside the window manager without crashing

## Acceptance criteria

The remediation is complete only when all of the following are true:

1. `GameIcon` no longer renders blank for valid display keys in editor or runtime surfaces.
2. Layout-runtime/editor views publish and consume the display export service.
3. Editor/module draft displays can be rendered as icons without requiring those displays to already exist inside the active scene runtime cartridge.
4. Example content no longer uses `icons`, `resources`, or legacy `resource_*` ids.
5. `unknown` and `loading` are explicit authored displays, not synthesized from `wood`.
6. Ordinary unresolved keys do not collapse to a wood-style fallback.
7. Transfer/resource UI surfaces use canonical resource display keys directly.
8. Opening and editing a display asset in the `.art` displays editor does not crash.
9. Legacy transfer/icon detritus is removed or fully de-authorized.
10. All relevant unit, integration, and view tests are green.
