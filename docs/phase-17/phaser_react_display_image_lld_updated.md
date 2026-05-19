# Updated LLD — Exact Phaser display images in React, using `BodyAvatar` for body-facing UI

## 1. Scope

This document updates the prior Phaser→React image-export LLD.

It covers only this change set:

1. React must be able to request an exact Phaser-rendered image by `display_key`.
2. The initial supported exports are:
   - `attr_body`
   - `attr_mind`
   - `attr_social`
   - `body_avatar`
3. The export path must return a cached image URL suitable for React `<img>` rendering.
4. Static exported images for the three attribute pools must flow through the existing icon-registry / `GameIcon` mechanism.
5. Body-specific exported images must flow through the existing `BodyAvatar` component, not through a new generic body UI atom.
6. The implementation must be extensible to additional display keys without changing the public React request mechanism.

This document does **not** redesign body identity, naming, card layout, lens routing, or ECS/runtime behavior.

---

## 2. Source-of-truth observations

### 2.1 Verified in the uploaded snapshot

The following facts are present in the uploaded codebase and are the basis for this design:

1. `GameIcon` already supports image icons. When `IconDefinition.type === "image"`, it renders `<img src=...>`.
2. `AppIconRegistryProvider` is the existing app-wide icon aggregation seam. It already merges editor icons and runtime cartridge icons into the icon registry.
3. `body_avatar` is already a first-class Phaser display key.
4. `body_avatar` rendering already uses the existing Phaser avatar pipeline:
   - `AvatarModule`
   - `AvatarGlyphModule`
5. Body avatar appearance is already derived deterministically from runtime seed + subject seed through `AvatarAppearanceRegistry`.
6. The subject-seed resolution rule already exists in Phaser through `resolveAvatarSubjectSeed(...)`, including proxy/original-body resolution.
7. `resolveDisplaySpec(...)` already resolves `glyph_key` for `body_avatar`, including passport glyph fallback.
8. `attr_body`, `attr_mind`, and `attr_social` are already first-class Phaser display keys.
9. Attribute-pool visuals already reuse the existing Phaser shape-texture path through `TextureManager.getShapeTexture(...)` and `resolvePowerShape(...)`.
10. `usePhaserGame(...)` owns creation and destruction of the active `GameScene`.
11. `SwarmRowItem.tsx` and `BodyBrick.tsx` still render body identity through icon-style rendering rather than a body-specific avatar component.
12. Runtime selection UI attribute icons are already rendered through `GameIcon`, which means they can be swapped to exact Phaser images by overriding the existing icon registry.

### 2.2 Explicit branch divergence

You explicitly stated that `BodyAvatar` already exists and already contains preparation for displaying a non-icon image.

That component file is **not present in the uploaded snapshot**. I am therefore treating `BodyAvatar` as an existing working-branch component whose **public interface must remain unchanged**. All other file paths in this document are grounded in the uploaded snapshot.

This is the only branch-dependent input in this design.

---

## 3. Why this design

### 3.1 Why a Phaser-side export service is required

React cannot consume Phaser texture keys directly. Phaser texture keys are scene-local identifiers, not browser image URLs.

Therefore a Phaser-side service must:

1. resolve the exact Phaser visual,
2. render a canonical static frame into a normal canvas,
3. convert that canvas into a normal image URL,
4. cache the result.

### 3.2 Why static attribute exports must go through the icon registry

The project already has a working app-wide icon path:

`AppIconRegistryProvider` → icon registry → `useIcon(...)` → `GameIcon`

The three attribute-pool exports are display-key-only visuals. They do **not** depend on entity identity. That makes them a natural fit for registry overrides.

Using the existing registry path avoids unnecessary callsite changes. Existing `GameIcon id="attr_body"` / `attr_mind` / `attr_social` consumers continue to work, but they render exact Phaser images instead of emoji.

### 3.3 Why body-avatar exports must go through `BodyAvatar`

`body_avatar` is **entity-dependent**. The correct output depends on runtime entity identity, proxy/original-body resolution, glyph state, and runtime seed.

That is not an icon-registry concern. It is a body-specific rendering concern.

You already have a `BodyAvatar` abstraction prepared for non-icon rendering. Therefore the correct change is:

- keep a **generic export service** underneath,
- keep a **generic React hook** underneath,
- but use **`BodyAvatar` as the body-facing atom**.

This preserves the existing body-specific UI seam and avoids introducing a second competing abstraction.

### 3.4 Why the service must be generic even though `BodyAvatar` is the body consumer

The request mechanism must still be generic because:

- the three attribute pools are not body-specific,
- future display exports will not all be body-specific,
- the service should not encode UI-specific assumptions.

Therefore:

- the **service API** is generic by `display_key`,
- the **body-facing UI atom** remains `BodyAvatar`.

That split is the correct level of reuse.

---

## 4. Non-goals

1. No new icon system.
2. No new body-avatar visual system.
3. No React duplication of Phaser state.
4. No direct React access to `TextureManager`, `GlyphRegistry`, or scene internals.
5. No per-frame polling.
6. No animated exported icons.
7. No widening beyond the four supported display keys in this pass.
8. No changes to authored cartridge icon assets.
9. No changes to selection lens routing.
10. No changes to body generation / passport / naming logic.

---

## 5. Target behavior

## 5.1 React request contract

React must be able to request a display image by:

- `displayKey: string`
- `entityId?: string`

### Initial supported requests

- `{ displayKey: "attr_body" }`
- `{ displayKey: "attr_mind" }`
- `{ displayKey: "attr_social" }`
- `{ displayKey: "body_avatar", entityId: "<entity-id>" }`

### Explicit validation rules

The service must reject the request loudly when:

1. `displayKey` is unsupported.
2. `displayKey === "body_avatar"` and `entityId` is absent.
3. `entityId` is supplied but the runtime entity cannot be resolved.
4. the active runtime does not exist.
5. the active Phaser scene has not finished initializing the display resources.
6. the resolved entity does not actually resolve to a `body_avatar` display.

No fallback guessing is allowed inside the service.

## 5.2 Canonical output form

The export service returns a **data URL string**.

Reason:

- directly usable in `<img src>`
- no separate object-URL lifecycle
- easy to cache
- easy to store in icon definitions of type `image`

## 5.3 Canonical static-frame policy

All exported images are static canonical frames.

### `body_avatar`

The exported image must include:

- glow layer
- silhouette layer
- eyes layer in the **open-eye** state
- glyph overlay when `glyph_key` exists

The exported image must exclude:

- interaction highlight
- selection overlay
- distress overlay
- animation sampling other than the canonical static frame

Canonical static frame rules:

- `blinkScale = 1`
- glyph pulse value = `0`
- glyph time reference = `0`

### `attr_body` / `attr_mind` / `attr_social`

The exported image must include:

- the existing attribute-pool foreground shape derived through `resolvePowerShape(...)`

The exported image must exclude:

- lighting / interaction / selection overlays
- any runtime animation
- any live fill-state or pulse-state

The canonical export is the shape texture at its normal unanimated appearance.

---

## 6. Architecture

There are four layers.

### Layer A — Phaser export service

Owns:

- request validation
- runtime/scene resolution
- cache signature resolution
- image rendering into a private canvas
- URL generation
- cache invalidation
- in-flight deduplication

### Layer B — tiny app-level dependency store

Owns only:

- current `DisplayImageExportService | null`

This is allowed app-level mutable dependency state. It is not gameplay state.

### Layer C — generic React hook

Owns:

- asking the service for a URL
- loading / ready / error state
- request deduplication at hook consumer level
- graceful fallback behavior at UI boundary

### Layer D — UI consumers

Two categories:

1. **Static display-key consumers**
   - flow through icon registry / `GameIcon`
   - initial set: `attr_body`, `attr_mind`, `attr_social`

2. **Body-specific consumers**
   - flow through existing `BodyAvatar`
   - initial set: all body identity surfaces currently using icon-style rendering

---

## 7. Cache rules

The cache key must be based on the **resolved visual signature**, not the raw request object.

## 7.1 Attribute-pool cache signatures

The cache key for each attribute export must include:

- runtime seed
- display key

Valid examples:

- `seed|attr_body`
- `seed|attr_mind`
- `seed|attr_social`

## 7.2 Body-avatar cache signatures

The cache key for `body_avatar` must include:

- runtime seed
- display key (`body_avatar`)
- resolved avatar subject seed
- resolved glyph key, or `none`

Valid example:

- `seed|body_avatar|subject=body_17|glyph=worker_mark`

### Why runtime seed is mandatory

`AvatarAppearanceRegistry` is epoch-synchronized against runtime seed. The same subject seed under a different runtime seed is not guaranteed to produce the same appearance.

## 7.3 Invalidation rules

The service cache must be invalidated when:

1. the active service instance is replaced,
2. the scene is destroyed,
3. the runtime seed changes,
4. the service is explicitly cleared.

The simplest correct implementation is:

- make the cache entirely service-instance-local,
- create a new service when a new `GameScene` is created,
- drop the old service on scene destruction.

That is sufficient and deterministic for this scope.

---

## 8. Resolution rules

## 8.1 `body_avatar`

Resolution steps:

1. Read the active runtime from the bound `GameScene`.
2. Resolve `entityId` to a runtime entity.
3. Resolve the entity blueprint from the runtime cartridge.
4. Call `resolveDisplaySpec(...)` using the runtime entity, resolved blueprint, `physics = null`, and the cartridge style map.
5. Validate that the resolved `display_key` is `body_avatar`.
6. Resolve the avatar subject seed through `resolveAvatarSubjectSeed(entity)`.
7. Read `glyph_key` from the resolved display spec.
8. Resolve avatar appearance through the existing `AvatarAppearanceRegistry` already held by the scene display system.
9. Build the resolved cache key.
10. Return cached URL or render-and-cache.

### Proxy rule

Callers must continue to pass the entity they have.

If that entity is a proxy, the export service must resolve the correct original-body subject seed by reusing `resolveAvatarSubjectSeed(...)`.

React must **not** duplicate proxy/original-body logic.

## 8.2 `attr_body` / `attr_mind` / `attr_social`

Resolution steps:

1. Validate that the display key is one of the three supported static keys.
2. Resolve the current runtime seed for cache-key purposes.
3. Build the resolved cache key.
4. Return cached URL or render-and-cache.

No entity lookup is permitted or required.

---

## 9. Rendering rules

## 9.1 `body_avatar` rendering

The export renderer must **reuse the existing Phaser texture-generation mechanisms**, not reimplement avatar generation math.

It must obtain the exact existing textures from:

- `TextureManager.getAvatarGlowTexture(appearance)`
- `TextureManager.getAvatarSilhouetteTexture(appearance)`
- `TextureManager.getAvatarEyesTexture(appearance)`

It must then draw those textures into a dedicated export canvas in the same visual order used by `renderAvatarStack(...)`:

1. glow
2. silhouette
3. eyes
4. glyph overlays, when present

### Glyph overlay rendering

When `glyph_key` exists, the export renderer must reuse the existing glyph pipeline inputs:

- `GlyphRegistry.get(...)`
- `resolveGlyphPlacementTransform(...)`
- `GLYPH_TEXTURE_KEYS`

It must render the glyph at canonical static pulse value `0`.

The glyph overlay must be included in the final exported URL whenever the resolved display spec includes it.

## 9.2 Attribute rendering

The export renderer must reuse:

- `resolveAttributePoolKey(...)`
- `resolvePowerShape(...)`
- `TextureManager.getShapeTexture(...)`

It must draw the resulting shape texture into the export canvas as the canonical attribute icon.

No separate hardcoded SVG, emoji, or alternate art path is allowed.

## 9.3 Canvas ownership

The export service owns a private canvas for rendering.

That canvas is:

- not mounted in React,
- not reused as shared UI state,
- only an implementation detail for generating data URLs.

---

## 10. File-by-file plan

## 10.1 New file — `src/engine/phaser/display-export/DisplayImageExportTypes.ts`

### Responsibility

Define the request and service contracts for Phaser display-image export.

### Logic

No runtime logic. Types/constants only.

### Interface

This file must define:

- the supported display-key union for this feature:
  - `"attr_body" | "attr_mind" | "attr_social" | "body_avatar"`
- `DisplayImageRequest`
  - `displayKey: SupportedDisplayImageKey`
  - `entityId?: string`
- `DisplayImageExportService`
  - `getImageUrl(request: DisplayImageRequest): Promise<string>`
  - `clear(): void`

No React types belong here.

---

## 10.2 New file — `src/engine/phaser/display-export/buildDisplayImageCacheKey.ts`

### Responsibility

Pure cache-key construction for resolved export signatures.

### Logic

Must accept already-resolved inputs and return a deterministic cache key string.

Must not read React state, runtime state, or scene state directly.

### Interface

Two pure functions:

- `buildStaticDisplayCacheKey(runtimeSeed, displayKey): string`
- `buildBodyAvatarCacheKey(runtimeSeed, subjectSeed, glyphKeyOrNone): string`

### Error handling

No silent normalization. Empty seed / empty subject seed must throw with explicit error text.

---

## 10.3 New file — `src/engine/phaser/display-export/resolveBodyAvatarExportInputs.ts`

### Responsibility

Resolve the exact non-render inputs required to export a `body_avatar` image.

### Logic

This file is the single place that:

1. reads the runtime,
2. resolves the entity,
3. resolves the blueprint,
4. resolves the display spec,
5. validates `body_avatar`,
6. resolves `subjectSeed`,
7. resolves `glyphKey`,
8. resolves the runtime seed.

It must reuse:

- `coerceBlueprintId(...)`
- `resolveDisplaySpec(...)`
- `resolveAvatarSubjectSeed(...)`

### Interface

One pure-ish resolver function that takes:

- `scene: GameScene`
- `entityId: string`

and returns a resolved object containing at minimum:

- `runtime`
- `runtimeSeed`
- `entity`
- `subjectSeed`
- `glyphKey: string | null`
- `appearance`

### Error handling

Reject explicitly when runtime, entity, blueprint id, display spec, or subject seed cannot be resolved.

---

## 10.4 New file — `src/engine/phaser/display-export/renderBodyAvatarImage.ts`

### Responsibility

Render the canonical static `body_avatar` image into a canvas and return a data URL.

### Logic

This file must:

1. accept fully resolved body-avatar export inputs,
2. pull existing Phaser textures from `TextureManager`,
3. draw them into the export canvas in correct order,
4. optionally draw glyph layers,
5. return the resulting data URL.

It must **not** re-resolve runtime entities, display specs, or cache keys.

### Interface

One function:

- input: resolved body-avatar export inputs + export canvas dependency
- output: `string` data URL

### Error handling

If a required Phaser texture source cannot be read, this function must throw explicitly.

---

## 10.5 New file — `src/engine/phaser/display-export/renderAttributeDisplayImage.ts`

### Responsibility

Render the canonical static image for `attr_body`, `attr_mind`, or `attr_social`.

### Logic

This file must:

1. validate that the display key is one of the supported attribute keys,
2. resolve the shape through existing helpers,
3. obtain the existing Phaser texture through `TextureManager.getShapeTexture(...)`,
4. draw that texture into the export canvas,
5. return the data URL.

It must not read entity state.

### Interface

One function:

- input: `scene`, `displayKey`, export canvas dependency
- output: `string` data URL

### Error handling

Unsupported keys must throw explicitly.

---

## 10.6 New file — `src/engine/phaser/display-export/DisplayImageExportService.ts`

### Responsibility

Single entry point for all React-facing Phaser display image requests.

### Logic

This class must:

1. hold a reference to the active `GameScene`,
2. validate requests,
3. resolve cache keys,
4. return cached URLs when present,
5. deduplicate concurrent identical requests,
6. render and cache uncached requests,
7. clear cache on demand.

The cache and in-flight maps must be **private** to the service instance.

### Interface

Public interface:

- constructor receives `GameScene`
- `getImageUrl(request): Promise<string>`
- `clear(): void`

No additional public methods are required.

### Explicit behavior

- `body_avatar` requests route through `resolveBodyAvatarExportInputs(...)` and `renderBodyAvatarImage(...)`
- `attr_*` requests route through `renderAttributeDisplayImage(...)`
- errors are thrown, not swallowed

---

## 10.7 New file — `src/ui/runtime/state/useDisplayImageExportStore.ts`

### Responsibility

Hold the current active display-image export service instance for React.

### Logic

This store holds dependency state only.

It must not hold:

- cached URLs
- runtime entities
- duplicated avatar state
- any gameplay state

### Interface

State:

- `service: DisplayImageExportService | null`

Actions:

- `setService(service: DisplayImageExportService | null): void`
- `clear(): void` (optional convenience; equivalent to setting `null`)

### Architectural note

This store is compliant with the contract because it stores a runtime-side dependency reference, not simulation state.

---

## 10.8 New file — `src/ui/runtime/world/display-images/useDisplayImageUrl.ts`

### Responsibility

Generic React hook for requesting exported Phaser display images.

### Logic

This hook must:

1. read the current service from `useDisplayImageExportStore`,
2. accept a request object,
3. request an image URL asynchronously,
4. expose stable render state,
5. ignore stale async results when the request changes or unmount occurs.

It must not contain body-specific logic.

### Interface

Input:

- `request: DisplayImageRequest | null`

Output:

- `url: string | null`
- `status: "idle" | "loading" | "ready" | "error"`

### Explicit behavior

- `null` request → `idle`
- absent service → `idle`, `url = null`
- failed request → `error`, `url = null`

No throwing from the hook into React render.

---

## 10.9 New file — `src/ui/runtime/world/display-images/useRuntimeDisplayIcons.ts`

### Responsibility

Build icon-registry overrides for the three static attribute images.

### Logic

This hook must:

1. request URLs for `attr_body`, `attr_mind`, and `attr_social` through `useDisplayImageUrl(...)`,
2. build an icon-definition map only for the URLs that are ready,
3. return an empty map when no exported URL is ready,
4. never produce overrides for `body_avatar`.

### Interface

Output:

- `Record<string, IconDefinition>`

Keys produced:

- `attr_body`
- `attr_mind`
- `attr_social`

Each produced definition must be:

- `type: "image"`
- `value: <data-url>`

Tooltip behavior remains unchanged from existing icon semantics; only the visual source changes.

---

## 10.10 Change file — `src/engine/phaser/hooks/usePhaserGame.ts`

### Responsibility after change

Continue to own `GameScene` lifecycle, and additionally publish/unpublish the active export service instance.

### Logic change

After creating the `GameScene`, this hook must:

1. create one `DisplayImageExportService` bound to that scene,
2. register it in `useDisplayImageExportStore`,
3. unregister it on Phaser destruction and on hook cleanup.

### Interface

Public interface remains unchanged.

- no prop changes
- no return-type changes

### Explicit behavior

Whenever the game is destroyed, the store must be cleared in the same cleanup path.

No stale service instance may survive scene destruction.

---

## 10.11 Change file — `src/ui/devtools/shell/AppIconRegistryProvider.tsx`

### Responsibility after change

Continue to aggregate app icons, and additionally overlay runtime-generated Phaser-exported attribute icons.

### Logic change

This component must:

1. keep existing editor icon aggregation,
2. keep existing runtime cartridge icon aggregation,
3. call `useRuntimeDisplayIcons()`,
4. merge generated display-image overrides **after** cartridge/runtime icons,
5. pass the final map into `IconRegistryProvider`.

### Interface

Public interface remains unchanged.

### Merge order requirement

Final merge order must be:

1. editor icons
2. runtime cartridge icons
3. generated display-image overrides

That guarantees exported Phaser images replace emoji/icon-asset definitions for the three supported attribute keys whenever the service is available.

---

## 10.12 Change file — `src/ui/devtools/shell/AppIconRegistryProvider.test.tsx`

### Responsibility after change

Verify that generated display-image overrides win over runtime cartridge emoji icons.

### Logic

This test file must continue to cover the existing registry behavior and add coverage for:

- runtime-generated `image` icon definitions overriding runtime cartridge `emoji` icon definitions for `attr_body` / `attr_mind` / `attr_social`

### Interface

Test-only file. No production interface.

---

## 10.13 Change file — existing `BodyAvatar` component file on the working branch

### Responsibility after change

Remain the single body-facing avatar atom.

### Logic change

Internally, `BodyAvatar` must:

1. request the exported Phaser image URL for `body_avatar`, using the entity identity mechanism it already owns,
2. render the exported non-icon image when the URL is ready,
3. fall back to its current rendering path when no URL is available,
4. not talk directly to `GameScene`, `TextureManager`, or other Phaser internals.

### Interface

**Public interface must remain unchanged.**

This is mandatory because the component already exists on your working branch and is already the intended body-facing abstraction.

### Explicit rule

`BodyAvatar` is a consumer of the generic export hook/service. It is not itself the export service.

---

## 10.14 Change file — `src/ui/runtime/world/selection/SwarmRowItem.tsx`

### Responsibility after change

Render swarm member identity using `BodyAvatar` rather than icon-style rendering.

### Logic change

Replace the current identity icon rendering path:

- remove body identity use of `GameIcon id={icon}`
- render `BodyAvatar` for the row’s entity instead

The attribute stat row remains unchanged and continues to use `GameIcon` for `attr_body` / `attr_mind` / `attr_social`.

Those three `GameIcon` calls will automatically pick up the exported Phaser images through the provider override.

### Interface

Public props remain unchanged:

- `runtime`
- `entityId`

### Selector impact

After this change, `SwarmRowItem` no longer needs `selectIcon(...)`.

---

## 10.15 Change file — `src/ui/runtime/world/selection/swarmCardSelectors.ts`

### Responsibility after change

Continue to provide only the selectors still needed by `SwarmRowItem`.

### Logic change

Remove `selectIcon(...)` if it is no longer referenced anywhere.

If another verified caller still uses it at implementation time, keep it.

### Interface

All remaining exported selectors are unchanged.

This is a cleanup-only delta; no new selector belongs here.

---

## 10.16 Change file — `src/ui/runtime/world/selection/absorption/BodyBrick.tsx`

### Responsibility after change

Render body identity using `BodyAvatar` rather than a plain icon.

### Logic change

Replace the current brick identity rendering path:

- remove `resolveIcon(...)`
- remove `GameIcon id={icon}` for the body itself
- render `BodyAvatar` for the entity instead

The existing tooltip and selection behavior remain unchanged.

### Interface

Public props remain unchanged.

### Explicit rule

`BodyBrick` must remain render-only. It must not acquire export service logic directly.

---

## 10.17 Change file — `src/ui/runtime/world/selection/absorption/BodyBrick.flyweight.test.tsx`

### Responsibility after change

Verify that body bricks render through the body-avatar path rather than icon-style rendering.

### Logic

Add or update coverage for:

- `BodyAvatar` rendering in the brick
- existing selection / face-badge wiring remaining intact

---

## 10.18 Optional verified callsite review (no new abstraction)

The following files do **not** need logic changes if the provider override is implemented correctly, because they already use `GameIcon` with the supported attribute display keys:

- `src/ui/runtime/world/selection/FaceCard.tsx`
- `src/ui/runtime/world/selection/SwarmCard.tsx`
- `src/ui/runtime/world/selection/cave/CaveCapabilitiesSection.tsx`
- `src/ui/runtime/world/selection/job-card/PowerMatrix.tsx`
- `src/ui/runtime/world/selection/components/TraitList.tsx`

Their attribute icons will switch automatically through the registry override.

No speculative refactor is required in these files.

---

## 11. Error handling rules

The implementation must log loudly and fail explicitly when invalid requests are made.

Required explicit failure cases:

1. unsupported display key
2. missing `entityId` for `body_avatar`
3. missing runtime
4. missing active scene display system
5. missing texture manager
6. missing body entity
7. empty subject seed
8. missing readable Phaser texture source

UI behavior on failure:

- `useDisplayImageUrl(...)` returns `status = "error"` and `url = null`
- `BodyAvatar` falls back to its current non-export path
- `GameIcon` continues to show existing registry icon values when no override exists

This ensures the UI never hard-crashes due to export unavailability.

---

## 12. Tests

The test plan below follows the project testing contract.

## 12.1 Unit tests (logic / helper files)

### `buildDisplayImageCacheKey.test.ts`

Must verify:

- stable key generation for static attribute exports
- stable key generation for body-avatar exports
- rejection of empty required inputs

### `resolveBodyAvatarExportInputs.test.ts`

Must verify:

- direct body resolution
- proxy resolution through existing subject-seed logic
- glyph-key inclusion when present
- failure when entity is missing
- failure when resolved display is not `body_avatar`

### `DisplayImageExportService.test.ts`

Must verify:

- static attribute request returns cached URL on second request
- body-avatar request returns cached URL on second request
- in-flight deduplication for identical concurrent requests
- explicit failure for unsupported display key
- explicit failure for missing `entityId`
- cache is instance-local and reset on `clear()`

These are unit tests because the service logic should be isolated behind small helpers.

## 12.2 View tests (React)

### `AppIconRegistryProvider.test.tsx`

Must verify:

- generated `image` overrides replace runtime emoji definitions for `attr_body`
- provider still exposes non-overridden runtime icons unchanged

### `BodyAvatar` test file on the working branch

Must verify:

- exported image path renders when `useDisplayImageUrl(...)` returns ready URL
- current fallback path still renders when URL is unavailable
- no direct Phaser dependency leaks into the component

### `SwarmRowItem` view test

Must verify:

- body identity renders through `BodyAvatar`
- attribute icons still render through `GameIcon`
- existing labels / bars / status icons remain visible

### `BodyBrick.flyweight.test.tsx`

Must verify:

- body identity renders through `BodyAvatar`
- face badge remains intact
- tooltip wiring remains intact

No complex rendering logic should be tested in the React tests. React tests verify presentation and wiring only.

## 12.3 What not to test

Do **not** test:

- Phaser internals in UI view tests
- exact pixel values in React tests
- implementation details of canvas drawing order in provider tests

Pixel/render composition belongs in the unit tests around the export service/helpers.

---

## 13. Implementation order

The implementation must proceed in this order:

1. add export types and pure cache-key helper
2. add body-avatar input resolver
3. add body-avatar and attribute render helpers
4. add `DisplayImageExportService`
5. add service store
6. wire service lifecycle into `usePhaserGame(...)`
7. add generic `useDisplayImageUrl(...)`
8. add `useRuntimeDisplayIcons(...)`
9. update `AppIconRegistryProvider`
10. update existing `BodyAvatar` internals without changing its public interface
11. swap body-icon callsites (`SwarmRowItem`, `BodyBrick`) to `BodyAvatar`
12. remove dead selector/icon code if unused
13. add/update tests

This ordering keeps the surface area small and ensures the new UI consumers only land after the service path exists.

---

## 14. Final acceptance criteria

This change is complete only when all of the following are true:

1. `attr_body`, `attr_mind`, and `attr_social` render exact Phaser-exported images through existing `GameIcon` callsites.
2. Body-facing selection surfaces that currently render a body icon use `BodyAvatar` instead.
3. `BodyAvatar` renders the exported exact Phaser image when available.
4. `body_avatar` export respects proxy/original-body identity through existing subject-seed logic.
5. Exported results are cached and reused.
6. React does not duplicate Phaser/runtime state.
7. No public interface changes are introduced for existing components/hook entry points other than the new internal export path.
8. All added/changed tests follow the testing contract and pass.

