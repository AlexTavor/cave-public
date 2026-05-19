# LLD: Complete display unification with a dedicated display render host

## 1. Purpose

This document defines the low-level design for finishing the display-unification work in the inspected repository.

This LLD has three goals:

1. complete the unified display implementation that is still incomplete in the current codebase,
2. introduce a dedicated display render host for all React-side display image generation,
3. remove remaining authoritative legacy paths that contradict the existing display contract.

This document is grounded in the current repository state, the checked-in implementation, and the uploaded project contract documents. It is intentionally file-scoped and explicit. It contains the why, the what, and the how.

---

## 2. Scope

This task covers only the work required to make the display-unification system coherent and contract-compliant.

It includes:

1. the React display-image render path,
2. the export service and request contract,
3. avatar export unification,
4. strict display-key resolution,
5. draft preview completion,
6. save-time compatibility normalization for already-persisted legacy display keys,
7. deletion of remaining dead or contradictory icon/transfer detritus,
8. the tests required by the project testing contract.

It does **not** redesign world rendering or add new product behavior beyond the existing display-unification intent.

---

## 3. Non-goals

The following are out of scope and must not be added:

1. no second authored asset family,
2. no second runtime-side display registry,
3. no new rich-text syntax,
4. no redesign of body-avatar semantics in world rendering,
5. no gameplay-system refactor unrelated to display/image generation,
6. no speculative optimization work outside the files listed below,
7. no new editor abstraction beyond what is required for the dedicated display render host and completion items.

---

## 4. Why this work is required

### 4.1 Verified current state that is already complete and must not be reopened

The following prior remediation items are already implemented in the inspected repository and are **not** to be re-specified as missing work:

1. `src/ui/devtools/layout/LayoutRuntimeCanvas.tsx` already sets `publishDisplayImages: true`.
2. `src/data/raw/example/modules/assets.art` is already migrated to `assets.displays` and already defines authored `unknown` and `loading` entries.
3. `src/ui/runtime/world/selection/job-card/jobAnalysis.external.ts` already emits canonical resource display keys.
4. `src/ui/runtime/world/selection/components/TraitList.tsx` already uses canonical display keys.
5. the display-editor completion work is already present under `src/ui/devtools/editors/assets/display/**`.
6. the tab-guard stabilization work is already present in `src/ui/devtools/editors/assets/useAssetTabGuard.ts` and `src/ui/devtools/state/tabGuardStore.ts`.
7. `src/ui/devtools/editors/file/AssetPackEditor.tsx` and `src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.tsx` already use the `displays` asset category.

This LLD must preserve those completed changes.

### 4.2 Verified current gaps that still remain

The inspected code still has these live problems:

1. `GameIcon` still renders blank when no URL is returned.
2. the React export path can now prepare authored display requests, but the export service and spec resolver still fundamentally depend on an active runtime scene.
3. editor-only display previews still rely on a hidden temporary layout runtime in `DisplayAssetPreviewRuntime.tsx` instead of a dedicated display-only host.
4. `BodyAvatar` still uses a separate bridge/polling path before the export path.
5. display resolution still contains authoritative legacy key aliasing in `resolveDisplaySource.ts`.
6. old persisted save data still contains legacy display keys such as `status_exhausted`, so alias removal cannot simply be done with no compatibility plan.
7. draft card previews still use only the authored `icon` field and do not derive multiple preview ids from spawn actions.
8. dead icon/transfer files and dead compatibility aliases remain in the repository and still contradict the contract.

### 4.3 Root architectural issue

The current implementation mixes two incompatible ideas:

1. the React/UI side wants display-image export to work from editor/module data even when there is no gameplay runtime,
2. the actual export host is still an active `GameScene`, and the export service still reads runtime-owned cartridge state for ordinary display requests and for body avatars.

That contradiction is the reason the current implementation is only partially working.

---

## 5. Design summary

### 5.1 Chosen design

The implementation will introduce a **dedicated display render host**.

This is **not** a second gameplay runtime.

It is a singleton, hidden Phaser host whose only responsibility is:

1. hold the minimal rendering infrastructure required to export display images,
2. publish one display-image export service to React,
3. render self-contained display-image requests,
4. cache and reuse exported images.

### 5.2 What remains shared with the existing system

The new host must reuse existing mechanisms wherever they already exist and are still the correct mechanism:

1. `resolveDisplaySource(...)` remains the canonical key-resolution helper,
2. `resolveDisplaySpec(...)` remains the authoritative way to derive blueprint/world-facing display specs,
3. `DisplayImageExportService` remains the single React-side image-export service,
4. `TextureManager`, `GlyphRegistry`, `AvatarAppearanceRegistry`, and placeholder rendering remain reused rather than rewritten,
5. authored displays, authored styles, authored glyphs, and blueprint fallback semantics remain unchanged.

### 5.3 What changes structurally

The structural changes are:

1. export requests become **self-contained** and do not require a live gameplay scene runtime to render,
2. React no longer depends on whichever gameplay/layout runtime happens to be mounted,
3. avatars use the same export service boundary as `GameIcon`,
4. the hidden asset-grid preview runtime is removed,
5. legacy display-key compatibility is moved out of runtime resolution and into explicit compatibility normalization.

---

## 6. Design decisions

### 6.1 One display render host for all React image generation

There will be exactly one display-image export publisher in the UI tree.

That publisher is the dedicated display render host mounted once in `UiRoot`.

Gameplay and layout scenes stop publishing export services.

This removes race conditions and authority conflicts between:

1. gameplay runtime canvases,
2. layout/devtools canvases,
3. hidden preview runtimes.

### 6.2 Request building is separated from request rendering

The export pipeline is split into two explicit phases:

1. **request building**
   - read editor session / module / runtime state,
   - resolve display source,
   - derive the exact self-contained render payload.

2. **request rendering**
   - render the payload into an image using the dedicated display render host,
   - cache by deterministic request content.

No render-time lookup may depend on a live gameplay runtime.

### 6.3 Self-contained request contract

Every request given to `useDisplayImageUrl(...)` must carry the exact data required to render.

This is required because the current repository proves that carrying only `displayKey`, `glyphKey`, and `style` is insufficient for editor/module-only rendering. The host also needs access to the glyph definitions needed to materialize textures for authored glyphs that do not already exist in a live runtime scene.

### 6.4 Avatars go through the same host, but remain a distinct request kind

Avatars must use the same export service boundary as all other React display consumers.

However, avatar rendering remains a distinct request kind because its render inputs are materially different from authored display/resource rendering.

The avatar request must be based on stable subject/render inputs, not on looking up an entity inside an active runtime scene.

### 6.5 Strict resolver contract

`resolveDisplaySource(...)` must return only these authoritative cases:

1. exact authored display,
2. exact built-in display key that is still intentionally supported,
3. exact blueprint fallback,
4. authored `unknown`.

Legacy key aliasing must no longer live inside the authoritative resolver.

### 6.6 Compatibility normalization is explicit and narrow

The repository still contains persisted saves with legacy display keys.

Therefore legacy key support must move to a **compatibility normalization layer**, not remain embedded in the live resolver.

That compatibility layer must:

1. be pure,
2. be narrow,
3. run only where legacy persisted data is hydrated or explicitly normalized,
4. never become the runtime source of truth.

### 6.7 Draft previews are derived outside TSX

Draft preview derivation remains pure helper logic outside `.tsx`, as required by the display contract and the UI architecture laws.

### 6.8 The icon registry remains browse-only, not render-authoritative

The existing icon registry/provider may continue to exist for picker/search/browse use.

It must not be reintroduced as a rendering authority for `GameIcon` or avatar surfaces.

Its data must remain a browse index over display keys and blueprint ids only.

---

## 7. End-to-end behavior

### 7.1 `GameIcon` flow

1. caller passes `id`,
2. `useResolvedDisplayIcon(...)` reads the active editor/runtime source of truth,
3. it resolves the display source using the shared resolver,
4. it builds a self-contained export request,
5. `useDisplayImageUrl(...)` sends that request to the singleton display render host service,
6. `GameIcon` renders the returned image,
7. unresolved keys fall back only to authored `unknown`,
8. pending primary requests may render authored `loading` if present,
9. `GameIcon` never silently renders `null` for a resolvable or fallback-able key.

### 7.2 `BodyAvatar` flow

1. caller passes `subjectId`,
2. `BodyAvatar` derives the exact avatar export request from runtime state,
3. the request is sent through the same display-image export service,
4. the dedicated host renders the avatar image,
5. `BodyAvatar` renders the returned image,
6. there is no separate bridge/polling presentation path.

### 7.3 Asset-grid/editor preview flow

1. asset list mounts normally,
2. there is no hidden temporary runtime component,
3. preview `GameIcon` instances resolve from the active session/module state,
4. the singleton display render host renders those requests directly.

### 7.4 Draft preview flow

1. `DraftCard` receives the authored option,
2. `resolveDraftOptionPreviewIds(...)` derives ordered preview ids from spawn actions,
3. if spawn actions are present, those ids are rendered in order,
4. otherwise the authored `icon` field is used as the single fallback preview id.

---

## 8. Implementation order

Implement in this exact order.

1. introduce the dedicated display render host and self-contained request contract,
2. switch `GameIcon` and `BodyAvatar` to the new request-building path,
3. remove runtime-scene export publication and delete the hidden preview runtime,
4. tighten display resolution and move legacy key handling into explicit compatibility normalization,
5. complete draft preview derivation,
6. delete remaining dead icon/transfer/avatar-bridge detritus,
7. update and add tests.

Do not reorder.

---

## 9. File-by-file design

## 9.1 Files to add

### `src/engine/phaser/display-export/DisplayRenderHostScene.ts`

**Responsibility**

Own the minimal Phaser scene used only for display-image export.

**Logic**

1. Create and own only the rendering infrastructure needed by display-image export:
   - `TextureManager`
   - `GlyphRegistry`
   - `AvatarAppearanceRegistry`
   - placeholder-variant registry
2. Do not create or attach a gameplay runtime.
3. Do not create the world-display manager, world interaction systems, camera state systems, or any simulation-facing scene behavior.
4. Expose a stable scene-ready lifecycle so the export service can be bound once the host is ready.

**Interface**

Export one Phaser scene class with:

1. a stable debug/owner id,
2. public access to the minimal registries required by the render helpers,
3. no runtime getter,
4. no simulation-facing methods.

### `src/engine/phaser/display-export/DisplayRenderHost.ts`

**Responsibility**

Own the singleton Phaser game instance for the dedicated display render host.

**Logic**

1. Create one hidden Phaser game using `DisplayRenderHostScene`.
2. Publish exactly one `DisplayImageExportService` into the Zustand export store when the scene is ready.
3. Clear that service when the host unmounts.
4. Do not depend on gameplay runtime presence.
5. Reuse the existing store rather than introducing a second export-service store.

**Interface**

Export a host class with methods equivalent to:

1. create/start,
2. destroy,
3. read readiness.

The class must not expose React concerns.

### `src/ui/runtime/world/display-images/DisplayRenderHost.tsx`

**Responsibility**

Mount the singleton display render host inside the UI tree.

**Logic**

1. Create the host once on mount.
2. Destroy it once on unmount.
3. Render no visible UI.
4. Mount it at app root so editor, runtime, and hybrid surfaces all share the same publisher.

**Interface**

Export one React component with no props.

### `src/engine/phaser/display-export/buildDisplayImageRequest.ts`

**Responsibility**

Build self-contained display-image requests from editor/runtime state.

**Logic**

1. Accept the active display key or avatar subject id plus the available source-of-truth inputs.
2. Resolve authored display, built-in display, blueprint fallback, or authored `unknown` using `resolveDisplaySource(...)`.
3. For authored resource displays, include:
   - resolved display key,
   - resolved style payload,
   - resolved glyph key,
   - glyph definitions needed to materialize the glyph.
4. For built-in/attribute displays, include the exact built-in key and any required render metadata.
5. For blueprint fallback, derive the resolved display spec using the existing `resolveDisplaySpec(...)` logic, then package the exact renderable style/glyph payload.
6. For body-avatar requests, derive:
   - runtime seed or stable render seed,
   - subject seed,
   - resolved glyph key if one applies,
   - glyph definitions needed by that glyph,
   - resolved avatar appearance payload.
7. Fail loudly on unsupported or unresolvable inputs.

**Interface**

Export pure builders for:

1. generic display-key requests,
2. body-avatar requests.

No DOM, no Phaser game creation, no React hooks.

### `src/lib/displays/normalizeLegacyDisplayKey.ts`

**Responsibility**

Provide the single narrow mapping for legacy display-key compatibility.

**Logic**

1. Move the currently verified legacy alias map out of `resolveDisplaySource.ts` into this file.
2. Keep only aliases that are required by already-persisted data or still-existing legacy fixture inputs.
3. Return the canonical key or the original key unchanged.
4. Do not resolve authored assets or blueprints here.

**Interface**

Export one pure function:

`normalizeLegacyDisplayKey(input: string): string`

### `src/engine/runtime/persistence/normalizeHydratedDisplayKeys.ts`

**Responsibility**

Normalize legacy persisted display keys during runtime hydration.

**Logic**

1. Traverse the hydrated runtime/module data that can still contain persisted display keys.
2. Normalize legacy portrait/display keys using `normalizeLegacyDisplayKey(...)`.
3. Preserve all non-display data unchanged.
4. Be idempotent.
5. Do not invent authored display assets.

**Interface**

Export one pure normalization function that accepts the hydrated persistence payload and returns the normalized payload.

### `src/ui/runtime/draft/resolveDraftOptionPreviewIds.ts`

**Responsibility**

Derive ordered preview ids for draft options.

**Logic**

1. Inspect the draft option payload.
2. Collect blueprint ids from `SPAWN` and `SPAWN_BODY` actions in authored order.
3. Preserve order.
4. Remove only accidental duplicate repetitions if and only if the current UI contract requires de-duplication of consecutive duplicates.
5. If one or more spawn-derived ids exist, return them.
6. Otherwise return the authored `icon` field as the single fallback preview id.

**Interface**

Export one pure helper:

`resolveDraftOptionPreviewIds(option): string[]`

---

## 9.2 Files to change — display export host and request contract

### `src/engine/phaser/display-export/DisplayImageExportTypes.ts`

**Responsibility**

Define the display-image export request contract.

**Required change**

Replace the current partially self-contained union with a fully self-contained request union.

**Required logic**

1. Remove the runtime-coupled `display` request shape that requires later scene/runtime lookup.
2. Replace `resolved_display` with an explicit authored/renderable request shape that carries:
   - resolved display key,
   - request source kind,
   - resolved glyph key,
   - resolved style payload or null,
   - glyph definitions required for rendering,
   - stable render seed for deterministic caching where needed.
3. Replace `body_avatar { entityId }` with a self-contained avatar request carrying:
   - subject seed,
   - resolved avatar appearance,
   - resolved glyph key or none,
   - glyph definitions required for rendering,
   - stable render seed.
4. Keep request kinds explicit and discriminated.
5. Remove any request kind that requires the renderer to inspect a gameplay runtime scene.

**Interface**

Export:

1. the new discriminated request union,
2. any narrowed request subtypes required by render helpers,
3. the unchanged `DisplayImageExportService` interface.

### `src/engine/phaser/display-export/resolveDisplayImageSpec.ts`

**Responsibility**

Convert a self-contained request into the exact render spec used by image rendering.

**Required change**

Make it pure with respect to gameplay runtime.

**Required logic**

1. Accept only the self-contained request payload.
2. For authored and blueprint-derived display requests, return the exact render spec directly from request data.
3. For built-in attribute displays, return the exact built-in display spec with no runtime lookup.
4. For avatar requests, return the avatar render spec derived directly from request data.
5. Remove all calls to `scene.readRuntime()`.
6. Remove all cartridge lookup logic from this file.
7. Fail loudly on malformed requests.

**Interface**

Keep one resolver entry point that returns render specs for the render helpers.

### `src/engine/phaser/display-export/DisplayImageExportService.ts`

**Responsibility**

Render and cache image URLs for display requests.

**Required change**

Make the service operate on the dedicated display render host scene.

**Required logic**

1. Accept `DisplayRenderHostScene`, not `GameScene`.
2. Remove all runtime lookup.
3. Use the new spec resolver to obtain render specs from the request payload only.
4. Continue to cache in this service.
5. Continue to deduplicate in-flight work.
6. Preserve explicit error behavior.
7. Keep body-avatar rendering and ordinary display rendering inside the same service boundary.

**Interface**

The public API remains:

`getImageUrl(request): Promise<string>`

No caller contract changes beyond the new request shapes.

### `src/engine/phaser/display-export/buildDisplayImageCacheKey.ts`

**Responsibility**

Build deterministic cache keys for display-image requests.

**Required change**

Stop keying ordinary React display rendering by active runtime seed alone.

**Required logic**

1. For authored and blueprint-derived display requests, key by the exact render payload that affects pixels.
2. Include the stable render seed only when the visual output is intentionally seed-sensitive.
3. For body avatars, key by:
   - stable render seed,
   - subject seed,
   - glyph key or none,
   - any appearance inputs that affect rendered output.
4. Validate empty inputs and fail loudly.

**Interface**

Keep pure cache-key builders only.

### `src/engine/phaser/display-export/renderResolvedDisplayImage.ts`

**Responsibility**

Render an authored or blueprint-derived non-avatar display image.

**Required change**

Make the renderer consume the dedicated host scene and the self-contained glyph/style inputs.

**Required logic**

1. Use the host scene’s `TextureManager`.
2. Sync the host scene’s `GlyphRegistry` from request-provided glyph definitions before rendering.
3. Render background, light, glyph, and placeholder behavior exactly as today.
4. Preserve `family = none` behavior.
5. Preserve placeholder behavior only for cases already part of the current renderer.
6. Do not read cartridge/runtime data.

**Interface**

Keep a pure render helper that returns a data URL.

### `src/engine/phaser/display-export/renderAttributeDisplayImage.ts`

**Responsibility**

Render built-in attribute-pool display images.

**Required change**

Point it at the dedicated host scene type.

**Required logic**

1. Use only the host scene texture manager.
2. Preserve the current attribute icon rendering behavior.
3. Do not read gameplay runtime data.

**Interface**

No caller-visible behavior changes.

### `src/engine/phaser/display-export/renderBodyAvatarImage.ts`

**Responsibility**

Render avatar display images.

**Required change**

Make it consume the self-contained avatar request inputs.

**Required logic**

1. Use the host scene’s `TextureManager`, `GlyphRegistry`, and `AvatarAppearanceRegistry`.
2. Sync the glyph registry from request-provided glyph definitions before rendering.
3. Use the request-provided avatar appearance directly.
4. Remove any expectation that the helper will derive appearance from a live runtime scene.

**Interface**

Keep one render helper that returns a data URL.

---

## 9.3 Files to change — UI mounting, store, and consumers

### `src/ui/runtime/state/useDisplayImageExportStore.ts`

**Responsibility**

Hold the active display-image export service.

**Required change**

Simplify the store for singleton-host ownership.

**Required logic**

1. Keep only one authoritative service at a time.
2. Preserve explicit clear semantics.
3. Remove multi-owner semantics if they are no longer required after the dedicated host is introduced.
4. Do not introduce a second store.

**Interface**

Keep a simple Zustand store with:

1. current service,
2. set service,
3. clear service.

### `src/ui/runtime/world/display-images/useDisplayImageUrl.ts`

**Responsibility**

Resolve image URLs from the shared export service.

**Required change**

Keep the hook, but make its state semantics explicit for the singleton-host model.

**Required logic**

1. Continue to return `idle | loading | ready | error`.
2. When no request or no service exists, return `idle` with `url = null`.
3. Keep deterministic request-key invalidation.
4. Do not guess or synthesize fallback URLs here.

**Interface**

No prop or return-shape changes.

### `src/ui/shell/UiRoot.tsx`

**Responsibility**

Mount app-wide UI infrastructure.

**Required change**

Mount the singleton display render host.

**Required logic**

1. Add `DisplayRenderHost` once at root level.
2. Keep existing providers and filters unchanged.
3. Ensure both editor and gameplay surfaces can access the same export service.

**Interface**

No prop changes.

### `src/ui/lib/foundation/icon-registry/useResolvedDisplayIcon.ts`

**Responsibility**

Build the display-image request used by React display consumers.

**Required change**

Replace the current mixed request guessing with explicit self-contained request building.

**Required logic**

1. Keep source-of-truth precedence:
   - active module session draft,
   - active module data,
   - active runtime cartridge,
   - loaded modules only when required for blueprint visibility.
2. Delegate request construction to `buildDisplayImageRequest.ts`.
3. Build authored `unknown` fallback requests explicitly.
4. Build authored `loading` fallback requests explicitly when present.
5. Fail loudly if neither the primary key nor authored `unknown` can be built.
6. Do not synthesize image URLs in this hook.
7. Do not read from the old icon registry.

**Interface**

Keep the hook return shape conceptually unchanged:

1. request,
2. url,
3. status.

### `src/ui/lib/atoms/game-icon/GameIcon.tsx`

**Responsibility**

Render React-side display visuals.

**Required change**

Remove silent blank rendering.

**Required logic**

1. Render the primary URL when ready.
2. While the primary request is loading, render authored `loading` if available.
3. If the primary request fails or cannot resolve, render authored `unknown`.
4. If the export service is absent, keep behavior explicit and non-silent.
5. Never render `null` for a key that can resolve to primary, loading, or unknown.
6. Preserve component props and sizing behavior.

**Interface**

Props remain unchanged.

### `src/ui/runtime/world/selection/body/BodyAvatar.tsx`

**Responsibility**

Render portrait/avatar visuals in React.

**Required change**

Move it fully onto the shared display-image export path.

**Required logic**

1. Build a self-contained avatar request for `subjectId`.
2. Resolve that request through `useDisplayImageUrl(...)`.
3. Remove use of `useBodyAvatarPresentation(...)`.
4. Keep fallback to `GameIcon` when no subject id is available or rendering fails.
5. Preserve size behavior.

**Interface**

Props remain unchanged.

### `src/ui/devtools/editors/fields/module-explorer/AssetListPanel.tsx`

**Responsibility**

Render the display asset list panel.

**Required change**

Remove the hidden preview-runtime mount.

**Required logic**

1. Delete the `DisplayAssetPreviewRuntime` dependency.
2. Continue to render the same list/grid content.
3. Rely on the singleton display render host for all preview rendering.

**Interface**

No prop changes.

### `src/ui/runtime/draft/DraftCard.tsx`

**Responsibility**

Render a draft option card.

**Required change**

Render one or more derived preview ids instead of always rendering only the authored `icon` field.

**Required logic**

1. Call `resolveDraftOptionPreviewIds(...)` outside JSX logic as a pure helper.
2. Render the returned ids in order.
3. Keep title, rarity, description, and select behavior unchanged.
4. Preserve fallback to the authored `icon` field through the helper.

**Interface**

Change the view internals only. Public props remain aligned with the current draft-option surface.

### `src/ui/runtime/draft/DraftCard.styles.ts`

**Responsibility**

Provide draft-card layout primitives.

**Required change**

Support multiple preview icons.

**Required logic**

1. Add a row/wrap primitive for multiple icons.
2. Preserve current spacing and card layout.
3. Avoid introducing business logic here.

**Interface**

Export only styled primitives.

### `src/ui/runtime/world/selection/AttributePoolCard.tsx`

**Responsibility**

Render attribute-pool selection card visuals.

**Required change**

Remove the remaining legacy `resource_heat` fallback.

**Required logic**

1. Keep `attr_<attribute>` when an attribute exists.
2. Replace the fallback with canonical `heat`.
3. Preserve all other card behavior.

**Interface**

No prop changes.

---

## 9.4 Files to change — remove runtime-scene export publication

### `src/engine/phaser/hooks/usePhaserGame.ts`

**Responsibility**

Mount gameplay/layout Phaser games.

**Required change**

Stop using gameplay/layout scenes as display-image export publishers.

**Required logic**

1. Remove `bindDisplayImageExportService(...)` usage.
2. Remove export-store clearing tied to gameplay/layout scene destruction.
3. Preserve all actual gameplay/layout scene creation behavior.
4. Keep this hook focused on gameplay/layout scene lifecycle only.

**Interface**

Remove `publishDisplayImages` from the hook contract.

### `src/ui/runtime/shell/RuntimeShellCanvas.tsx`

**Responsibility**

Mount the gameplay canvas.

**Required change**

Remove the `publishDisplayImages` prop and related wiring.

**Required logic**

1. Continue to mount the gameplay canvas.
2. Do not publish a display export service from this component.
3. Preserve visibility and chrome behavior.

**Interface**

Remove `publishDisplayImages` from the prop contract.

### `src/ui/devtools/layout/LayoutRuntimeCanvas.tsx`

**Responsibility**

Mount the layout runtime canvas.

**Required change**

Stop publishing display images from the layout runtime scene.

**Required logic**

1. Keep the layout runtime canvas itself.
2. Remove display-image publication wiring from this component.
3. Preserve all layout runtime rendering behavior.

**Interface**

No prop changes.

### `src/ui/runtime/ambient/MenuAmbientRuntime.tsx`

**Responsibility**

Mount the menu ambient runtime.

**Required change**

Remove the now-obsolete `publishDisplayImages={false}` prop usage.

**Required logic**

Keep ambient runtime behavior unchanged.

**Interface**

No prop changes.

### `src/engine/phaser/scenes/GameScene.ts`

**Responsibility**

Own gameplay-scene state.

**Required change**

Remove display-export publication configuration from the scene contract.

**Required logic**

1. Remove scene config fields that exist only to publish display-image export service or avatar bridge state.
2. Preserve gameplay rendering and interaction responsibilities.

**Interface**

Remove `publishDisplayImages` from scene construction parameters.

### `src/engine/phaser/scenes/GameScene.create.ts`

**Responsibility**

Initialize gameplay-scene runtime concerns.

**Required change**

Remove display-export publication and avatar bridge registration.

**Required logic**

1. Do not register body-avatar bridge resolvers.
2. Do not perform display-export publication here.
3. Preserve all remaining scene initialization.

**Interface**

No new exports.

### `src/engine/phaser/scenes/GameScene.cleanup.ts`

**Responsibility**

Tear down gameplay-scene runtime concerns.

**Required change**

Remove avatar bridge cleanup tied to the old export publication model.

**Required logic**

Preserve all non-display cleanup.

**Interface**

No new exports.

---

## 9.5 Files to change — strict resolution and compatibility normalization

### `src/lib/displays/resolveDisplaySource.ts`

**Responsibility**

Resolve a display key into the canonical source kind.

**Required change**

Remove authoritative legacy aliasing from the resolver.

**Required logic**

1. Remove the inline legacy alias map.
2. Keep this exact resolution order:
   - authored display,
   - built-in display key that is still intentionally supported,
   - blueprint fallback,
   - authored `unknown`,
   - explicit failure.
3. Keep failure loud.
4. Do not normalize legacy keys here.

**Interface**

Keep the same source-kind contract, minus alias behavior.

### `src/data/schemas/assets/normalizeLegacyArt.ts`

**Responsibility**

Provide narrow compatibility handling for legacy `.art` input.

**Required change**

Narrow this file so it remains compatibility-only and non-authoritative.

**Required logic**

1. Keep only the minimum transformations required to read legacy `.art` shapes.
2. Use `normalizeLegacyDisplayKey(...)` where key normalization is still required.
3. Do not synthesize runtime-authoritative fallback displays.
4. Do not become the runtime source of truth for missing displays.
5. Preserve explicit failures for unsupported/malformed legacy cases.

**Interface**

Keep pure normalization only.

### `src/engine/runtime/persistence/hydrateRuntime.ts`

**Responsibility**

Hydrate persisted runtime data.

**Required change**

Run explicit display-key compatibility normalization during hydration.

**Required logic**

1. Normalize persisted legacy display keys before the runtime starts using them.
2. Use `normalizeHydratedDisplayKeys(...)`.
3. Keep all other hydration behavior unchanged.
4. Do not introduce hidden fallback logic outside the normalizer.

**Interface**

No public API change.

### `src/ui/lib/foundation/icon-registry/IconKey.ts`

**Responsibility**

Provide convenience constants for common display keys.

**Required change**

Remove dead legacy aliases that contradict canonical display vocabulary.

**Required logic**

1. Remove alias entries such as `body_attr_*` and any other non-canonical display ids that remain only for historical reasons.
2. Keep only canonical ids that still exist in the live display vocabulary.

**Interface**

The file remains a convenience enum/constant layer only.

### `src/ui/devtools/state/moduleStore.assets.types.ts`

**Responsibility**

Define editor-side asset category and asset types.

**Required change**

Remove dead icon-only compatibility aliases and types.

**Required logic**

1. Remove `ASSET_CATEGORY_ICONS`.
2. Remove `ModuleIconAsset`.
3. Keep only `displays`, `styles`, and `glyphs`.
4. Preserve the current `ModuleDisplayAsset` contract.

**Interface**

Expose only the canonical asset-category and display asset types.

### `src/ui/devtools/state/moduleStore.assets.ts`

**Responsibility**

Re-export editor asset helpers.

**Required change**

Stop exporting the dead icon-asset module.

**Required logic**

Export only the live display asset helpers and types.

**Interface**

No caller-visible semantic change beyond removed dead exports.

### `src/ui/devtools/shell/window-manager/virtualPath.parseRouted.ts`

**Responsibility**

Parse routed virtual paths.

**Required change**

Stop defaulting to the dead icon-category alias.

**Required logic**

1. Default `assets` list routes to `displays` directly.
2. Preserve all other route parsing behavior.

**Interface**

No route grammar changes.

### `src/ui/devtools/shell/window-manager/virtualPath.parseLegacy.ts`

**Responsibility**

Parse legacy virtual paths.

**Required change**

Map missing asset categories directly to `displays`.

**Required logic**

1. Preserve legacy-path reading behavior.
2. Remove dependency on `ASSET_CATEGORY_ICONS`.

**Interface**

No route grammar changes.

---

## 9.6 Files to change — browse/index layer remains non-authoritative

### `src/ui/devtools/shell/AppIconRegistryProvider.tsx`

**Responsibility**

Provide the browse/search index used by picker UI.

**Required change**

Make the provider explicitly browse-only and remove references to deleted runtime icon compatibility paths.

**Required logic**

1. Continue to index authored display ids and blueprint ids.
2. Continue to expose them as image-backed definitions for picker/search use.
3. Do not reintroduce render-authoritative fallback behavior.
4. Remove any expectation of runtime-special image overrides.

**Interface**

Keep the same provider interface.

### `src/ui/devtools/state/selectors/selectAggregatedIcons.ts`

**Responsibility**

Build the aggregated picker/search index.

**Required change**

Keep it aligned with the browse-only provider role.

**Required logic**

1. Aggregate authored display ids and blueprint ids only.
2. Do not depend on deleted icon-only helpers.
3. Keep ordering and merge behavior unchanged unless required by removed dead exports.

**Interface**

No signature change.

---

## 9.7 Files to change — transfer/display cleanup completion

### `src/engine/runtime/handlers/transferPendingBuilder.ts`

**Responsibility**

Build pending transfer entities.

**Required change**

Complete the remaining cleanup so only canonical display-key behavior remains.

**Required logic**

1. Keep `display.display_key = first payload key ?? "unknown"`.
2. Preserve non-visual transfer behavior.
3. Remove any visual bookkeeping that exists only because of the old transfer render pipeline if it is no longer required elsewhere.

**Interface**

Pending transfer entities remain valid runtime entities with ordinary display data only.

### `src/engine/runtime/handlers/transferUtils.ts`

**Responsibility**

Provide shared transfer helpers.

**Required change**

Remove dependency on the deleted transfer render module.

**Required logic**

1. Inline or relocate any still-needed non-render helpers from `transferRender.ts`.
2. Keep only helpers that remain part of live transfer behavior.

**Interface**

Preserve the public helper exports that are still genuinely used by live transfer code.

---

## 9.8 Files to delete

### `src/engine/phaser/display-export/bindDisplayImageExportService.ts`

**Responsibility**

This file currently binds a gameplay/layout scene to the export store.

**Deletion logic**

Delete it entirely. Its responsibility is superseded by the singleton display render host.

**Interface after deletion**

There is no scene-local export-service binder.

### `src/ui/devtools/editors/fields/module-explorer/DisplayAssetPreviewRuntime.tsx`

**Responsibility**

This file currently creates a hidden temporary layout runtime to make display previews render.

**Deletion logic**

Delete it entirely. The dedicated display render host supersedes it.

**Interface after deletion**

Asset-grid previews must render without a hidden temporary runtime.

### `src/ui/runtime/world/body-avatar/useBodyAvatarPresentation.ts`

**Responsibility**

This file currently polls the avatar bridge for prebuilt presentation layers.

**Deletion logic**

Delete it entirely. `BodyAvatar` moves fully onto the shared export-service path.

**Interface after deletion**

There is no separate React-side avatar-presentation polling hook.

### `src/engine/phaser/avatar/bodyAvatarBridge.ts`

**Responsibility**

This file currently stores a bridge resolver for avatar presentation data.

**Deletion logic**

Delete it entirely. The dedicated display render host removes the need for a separate bridge.

**Interface after deletion**

There is no avatar bridge registry.

### `src/engine/phaser/avatar/resolveBodyAvatarPresentation.ts`

**Responsibility**

This file currently derives bridge presentation payloads from a live runtime scene.

**Deletion logic**

Delete it entirely. Avatar export now uses self-contained export requests built before rendering.

**Interface after deletion**

There is no bridge presentation resolver.

### `src/engine/phaser/display-export/resolveBodyAvatarExportInputs.ts`

**Responsibility**

This file currently derives avatar export inputs from a live `GameScene` and entity id.

**Deletion logic**

Delete it entirely. Avatar request construction moves to `buildDisplayImageRequest.ts`.

**Interface after deletion**

There is no runtime-scene-based avatar export input resolver.

### `src/ui/runtime/world/display-images/useRuntimeDisplayIcons.ts`

**Responsibility**

This file is dead runtime display-icon compatibility scaffolding.

**Deletion logic**

Delete it entirely.

**Interface after deletion**

No replacement special-case hook is allowed.

### `src/ui/lib/foundation/icon-registry/defaultIcons.body.ts`
### `src/ui/lib/foundation/icon-registry/defaultIcons.cave.ts`
### `src/ui/lib/foundation/icon-registry/defaultIcons.misc.ts`

**Responsibility**

These files are dead legacy default-icon definitions.

**Deletion logic**

Delete them entirely.

**Interface after deletion**

There is no emoji/default-icon fallback file set.

### `src/ui/devtools/state/moduleStore.assets.icons.ts`

**Responsibility**

This file contains dead icon-asset save/delete helpers and icon-registry conversion.

**Deletion logic**

Delete it entirely.

**Interface after deletion**

Only display-asset helpers remain.

### `src/ui/devtools/editors/fields/icon-asset-editor/IconAssetEditorForm.tsx`

**Responsibility**

This file is the dead icon-asset editor form.

**Deletion logic**

Delete it entirely. The display editor is already the live editor path.

**Interface after deletion**

There is no icon-asset editor form.

### `src/data/schemas/assets/icons.ts`
### `src/data/schemas/assets/resources.ts`
### `src/data/schemas/assets/resourceTransferVisual.ts`

**Responsibility**

These files define superseded icon/resource transfer schema.

**Deletion logic**

Delete them entirely.

**Interface after deletion**

`assets.displays` remains the single visual authored asset family.

### `src/engine/runtime/handlers/transferRender.ts`
### `src/engine/runtime/handlers/transferRenderTypes.ts`

**Responsibility**

These files define the superseded transfer-only visual pipeline.

**Deletion logic**

Delete them entirely.

**Interface after deletion**

There is no transfer-only render snapshot/type layer.

### `src/engine/phaser/display/modules/TransferModule.ts`
### `src/engine/phaser/display/modules/TransferGlyphModule.ts`
### `src/engine/phaser/display/modules/TransferParticlesModule.ts`
### `src/engine/phaser/display/modules/transferDisplayHelpers.ts`

**Responsibility**

These files implement the superseded transfer-only display subsystem.

**Deletion logic**

Delete them entirely.

**Interface after deletion**

Transfer visuals render through ordinary display rendering only.

---

## 10. Tests

All tests must follow the project testing standards:

1. behavior over implementation,
2. fast pure unit tests for pure logic,
3. integration tests for runtime interactions,
4. view tests for React rendering and wiring,
5. factories over setup boilerplate,
6. explicit Given / When / Then structure.

## 10.1 Unit tests to add or update

### `src/engine/phaser/display-export/buildDisplayImageRequest.test.ts`

**Responsibility**

Verify self-contained request construction.

**Cases**

1. authored resource display from active editor draft,
2. authored attribute display,
3. built-in display key,
4. blueprint fallback request,
5. authored `unknown` fallback,
6. avatar request carries subject seed, appearance, glyph inputs, and no entity lookup contract,
7. missing authored `unknown` fails loudly.

### `src/engine/phaser/display-export/DisplayImageExportService.test.ts`

**Responsibility**

Verify service rendering and caching against the dedicated host scene.

**Cases**

1. authored display renders from self-contained payload with no runtime,
2. blueprint-derived request renders with no runtime,
3. attribute display renders,
4. avatar request renders,
5. deterministic cache hit for identical payload,
6. explicit failure for malformed request.

### `src/engine/phaser/display-export/buildDisplayImageCacheKey.test.ts`

**Responsibility**

Verify deterministic cache-key behavior.

**Cases**

1. authored requests with identical payload share a key,
2. authored requests with different pixel-affecting payload do not share a key,
3. avatar keys vary by subject/glyph/appearance inputs,
4. empty required inputs fail loudly.

### `src/lib/displays/normalizeLegacyDisplayKey.test.ts`

**Responsibility**

Verify the explicit compatibility alias mapping.

**Cases**

1. each currently verified legacy alias normalizes to the expected canonical key,
2. canonical keys pass through unchanged,
3. unknown keys pass through unchanged.

### `src/lib/displays/resolveDisplaySource.test.ts`

**Responsibility**

Verify strict resolver behavior.

**Cases**

1. exact authored display,
2. exact built-in key,
3. exact blueprint fallback,
4. authored `unknown`,
5. explicit failure when `unknown` is absent,
6. no legacy aliasing inside resolver.

### `src/engine/runtime/persistence/normalizeHydratedDisplayKeys.test.ts`

**Responsibility**

Verify hydration-time compatibility normalization.

**Cases**

1. portrait icon legacy keys normalize,
2. entity display keys normalize,
3. already-canonical data is unchanged,
4. normalization is idempotent.

### `src/ui/runtime/draft/resolveDraftOptionPreviewIds.test.ts`

**Responsibility**

Verify derived draft preview ids.

**Cases**

1. multiple spawn actions preserve authored order,
2. spawn-body actions are included,
3. fallback to authored icon when no spawn actions exist,
4. duplicate handling matches the chosen contract.

## 10.2 View tests to add or update

### `src/ui/lib/atoms/game-icon/GameIcon.test.tsx`

**Responsibility**

Verify visible React rendering through the new export path.

**Cases**

1. renders authored display image from editor/module data with no gameplay runtime,
2. renders blueprint-derived image,
3. renders authored `loading` during pending state when available,
4. renders authored `unknown` for missing keys,
5. never renders blank for resolvable/fallback-able keys.

### `src/ui/runtime/world/selection/body/BodyAvatar.test.tsx`

**Responsibility**

Verify avatar rendering through the shared export service.

**Cases**

1. renders avatar image from self-contained avatar request,
2. falls back to `GameIcon` when no subject id is available,
3. does not depend on the deleted bridge hook.

### `src/ui/runtime/draft/DraftOverlay.test.tsx`

**Responsibility**

Verify draft cards show derived previews.

**Cases**

1. spawn-derived preview ids render in order,
2. fallback to authored icon when no spawn actions exist.

### `src/ui/devtools/shell/AppIconRegistryProvider.test.tsx`

**Responsibility**

Verify browse-index behavior remains correct after dead compatibility layers are removed.

**Cases**

1. displays and blueprint ids are indexed,
2. no emoji/default-icon expectations remain,
3. no runtime special-case icon hook is required.

## 10.3 Integration tests to add or update

### `src/ui/runtime/world/display-images/DisplayRenderHost.test.tsx`

**Responsibility**

Verify singleton host publication behavior.

**Cases**

1. publishes one export service on mount,
2. clears it on unmount,
3. does not require gameplay runtime presence.

### `src/ui/devtools/editors/fields/module-explorer/AssetListPanel.test.tsx`

**Responsibility**

Verify display previews render without the deleted hidden preview runtime.

**Cases**

1. display asset rows show visible previews from editor/module data,
2. no temporary layout runtime is required.

### `src/engine/runtime/handlers/transferPendingBuilder.test.ts`

**Responsibility**

Verify transfer pending entities continue using canonical display keys after transfer detritus removal.

**Cases**

1. first payload key becomes `display.display_key`,
2. empty payload falls back to `unknown`,
3. no transfer render snapshot contract remains.

## 10.4 Tests to delete or rewrite

Delete or rewrite tests that assert superseded behavior, including:

1. `src/engine/phaser/display-export/bindDisplayImageExportService.test.ts`,
2. `src/engine/phaser/display-export/resolveBodyAvatarExportInputs.test.ts`,
3. `src/engine/phaser/avatar/resolveBodyAvatarPresentation.test.ts`,
4. `src/engine/runtime/handlers/transferRender.test.ts`,
5. any test that still asserts emoji/default-icon fallback,
6. any test that still asserts `ASSET_CATEGORY_ICONS`,
7. any test that still asserts transfer module/particle behavior.

---

## 11. Acceptance criteria

The implementation is complete only when all of the following are true:

1. all React-side display image rendering is published by one dedicated display render host,
2. `GameIcon` renders visible images for authored displays, blueprint fallbacks, and authored `unknown`/`loading` without needing a gameplay runtime scene,
3. `BodyAvatar` renders through the same export service boundary as `GameIcon`,
4. no hidden preview runtime is required for editor display previews,
5. display-image export requests are fully self-contained and do not require `scene.readRuntime()` for ordinary React rendering,
6. legacy display-key compatibility no longer lives inside `resolveDisplaySource(...)`,
7. persisted legacy display keys still load correctly through explicit hydration-time normalization,
8. draft previews render spawn-derived blueprint display ids in order,
9. dead icon/transfer/avatar-bridge files listed above are removed or fully de-authorized,
10. all new and updated unit, integration, and view tests are green,
11. no silent fallback behavior remains,
12. the implementation respects the project contract, context pack, and testing standards.

---

## 12. Rationale for the chosen design

This is the narrowest design that resolves the verified contradiction in the current codebase.

It deliberately does **not** introduce:

1. a second gameplay runtime,
2. a second display registry,
3. a second resolver,
4. a second export-service store,
5. a speculative editor abstraction.

Instead it:

1. reuses the existing display-image export service,
2. reuses the existing display/glyph/style/avatar machinery,
3. moves export hosting into a dedicated minimal scene,
4. makes requests self-contained,
5. keeps compatibility handling explicit and narrow,
6. finishes the previously specified but still incomplete display-unification work.

That is the minimal, grounded, contract-compliant way to finish the implementation.
