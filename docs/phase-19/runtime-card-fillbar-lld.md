# LLD: Organic 9-Slice Migration and Fill Bar Refactor

## 1. Purpose

This document defines the implementation design for the approved UI refactor.

It covers three workstreams:

1. Replace every current `organic-edge` SVG-filter consumer with one shared startup-generated 9-slice mechanism.
2. Keep the previously approved runtime render reductions for living cards and node overlays.
3. Keep the existing fill bar silhouette, but make fill motion and runtime bar updates cheaper.

This document is implementation-facing. It defines the why, the what, the how, the exact files to add, change, or remove, and the test contract.

This design is grounded in the current uploaded source.

---

## 2. Governing Constraints

The implementation defined here must obey the project contracts already provided by the user:

- Blueprints remain structural only; UI does not mutate simulation state.
- React components remain presentation-only.
- Shared reusable UI code belongs under `src/ui/lib/**`.
- Context is allowed only for dependency injection.
- No speculative refactors.
- No out-of-scope file churn.
- Tests must be readable, colocated, and behavior-oriented.

Where this design introduces new shared UI infrastructure, it does so under `src/ui/lib/**` and uses React Context only as a dependency-injection boundary.

---

## 3. Current-State Findings From Source

## 3.1 Complete current `organic-edge` surface area

The current source uses the SVG organic filter in exactly four places:

1. `src/ui/lib/atoms/card/Card.styles.ts`
   - `CardBackground` applies `filter: url(#organic-edge)`.
   - This affects every `Card` consumer across runtime, menus, production UI, and devtools.

2. `src/ui/lib/atoms/button/Button.styles.ts`
   - `BaseLayer` applies `filter: url("#organic-edge")`.

3. `src/ui/lib/atoms/button/buttonInteraction.ts`
   - `getFilterString()` returns `url("#organic-edge") brightness(...)`.
   - `Button.tsx` applies that filtered string to `EyeGradientLayer`.

4. `src/ui/runtime/world/selection/absorption/BodyBrick.styles.ts`
   - `BrickBackground` applies `filter: url(#organic-edge)`.

The filter definition itself is mounted once at the root in:

- `src/ui/lib/atoms/card/OrganicEdgeFilter.tsx`
- `src/ui/shell/UiRoot.tsx`

## 3.2 The current organic filter parameters that define the existing look

`OrganicEdgeFilter.tsx` currently defines:

- `baseFrequency = 0.02`
- `numOctaves = 3`
- `scale = 15`

These values define the existing edge language and must be preserved in the generated source assets.

## 3.3 The current card API is already the shared abstraction

`Card.tsx` currently owns:

- variant-to-background mapping
- padding resolution from theme spacing
- interactive hover semantics
- background and border color selection

Because `Card` already centralizes those semantics, changing `Card` internals is the lowest-churn way to migrate the entire card surface area to 9-slice.

## 3.4 The current button rendering path has two separate filtered surfaces

`Button.tsx` renders:

- `BaseLayer` for the button shell
- `EyeGradientLayer` for the active/hover glow

Both currently depend on the SVG organic filter.

The replacement must therefore provide two 9-slice surfaces for buttons:

- one base shell surface
- one glow surface

## 3.5 `BodyBrick` is a separate non-Card filtered surface

`BodyBrick.tsx` does not use `Card`.
It renders its own absolute background layer through `BrickBackground`.

`BodyBrick` therefore requires a direct migration path to the shared 9-slice system.

## 3.6 Fill bars do not use the organic filter today

`src/ui/lib/atoms/fill-bar/FillBar.styles.ts` uses a static `clip-path` polygon and gradient fills.

That means fill bars are not part of the organic-filter migration itself.
Their approved refactor remains:

- keep the current silhouette
- make the animated fill cheaper
- make runtime bar writes cheaper

## 3.7 Runtime bar updates still write `width` every frame

`EntityStateLinkContext.tsx` currently:

- rebuilds the entity index every RAF
- computes a percent for each registered binding
- writes `element.style.width = "${percent}%"`

`FillBarFill` also uses `width: ${({ progress }) => progress}%`.
`NodeOverlayViewport.styles.ts` uses the same width-based pattern for overlay bars.

That is the fill-motion path to change.

## 3.8 Dormant living-card and node-overlay DOM still exists today

The current runtime still mounts dormant card surfaces:

- `LivingCardPool.tsx` mounts `POOL_SIZE = 50` wrappers and cards immediately.
- `useLivingCardsLoop.ts` runs a RAF loop continuously.
- `NodeOverlayViewport.tsx` renders 50 fixed overlay slots.

Those reductions remain in scope from the earlier LLD and remain required.

---

## 4. Scope

### In scope

- Replace all current `organic-edge` filter usage with startup-generated 9-slice rendering.
- Remove the root SVG filter mount.
- Migrate `Card` to the shared 9-slice mechanism.
- Migrate `Button` base and glow surfaces to the same 9-slice mechanism.
- Migrate `BodyBrick` to the same 9-slice mechanism.
- Keep living cards and node overlays on live-only rendering rather than dormant pool DOM.
- Keep the current fill bar shape and semantics, but move animated fill from width to transform.
- Update entity-linked runtime bars to use the same cheaper transform contract.
- Update and add tests required by the above.

### Out of scope

- Phaser rendering.
- Runtime simulation logic.
- Changing card text/content layout.
- Changing button variants or interaction semantics.
- Changing `BodyBrick` content or tooltip semantics.
- Changing fill bar colors, thresholds, or labels.
- Rewriting the node overlay model loop beyond the already approved render-only-live change.
- Rewriting selection or tooltip architecture.

---

## 5. Design Goals

1. Preserve the current organic visual language.
2. Remove all live SVG `organic-edge` filter cost from the app.
3. Use one shared 9-slice mechanism for every current organic-filter consumer.
4. Preserve existing public component APIs wherever possible.
5. Use existing theme tokens and current color mappings.
6. Keep fill bars visually identical in shape.
7. Reduce runtime DOM churn in bar updates.
8. Fail loudly when a generated frame key is missing.
9. Avoid out-of-scope abstractions.

---

## 6. High-Level Design

## 6.1 Shared frame strategy

A new shared organic-frame subsystem is added under `src/ui/lib/**`.

It is responsible for:

- generating all required organic 9-slice surfaces once at startup
- caching them in memory
- exposing them to UI components through dependency injection
- rendering them through one presentational 9-slice layer component

This shared subsystem replaces all live `organic-edge` usage.

## 6.2 What the generator produces

The generator does not produce one generic frame.
It produces a finite, explicit catalog of fully styled surfaces.

Each generated entry is identified by a stable key and contains nine raster slices.

The generated catalog covers:

- Card surfaces
- Button base surfaces
- Button glow surfaces
- BodyBrick surfaces

## 6.3 Why a finite explicit catalog is the correct fit

This codebase already uses a finite set of semantic style variants:

- `Card` has a finite `variant` union.
- `Button` has a finite `size` union and a finite `variant` union.
- `BodyBrick` has a finite selected/unselected state model.

Because the state space is finite and already encoded in current component APIs, the generator can precompute all required combinations at startup without introducing runtime asset churn.

## 6.4 Fill bar strategy

Fill bars stay on the current non-filter path.

The approved fill-bar changes remain:

- keep the existing `ORGANIC_BAR_EDGE` polygon unchanged
- keep threshold markers unchanged
- keep fill labels unchanged
- move fill motion from width to transform scale
- make runtime linked bars write transform instead of width
- suppress redundant writes when the computed visual state did not change

## 6.5 Runtime render reductions remain in force

The previously approved runtime DOM reductions remain part of this document:

- only live living cards render
- only live node overlay cards render
- dormant card wrappers are not mounted

These changes become even more important after the 9-slice migration because they prevent needlessly mounting decorative 9-slice surfaces that are not visible.

---

## 7. Organic 9-Slice Catalog

## 7.1 Bucket model

The bucket model is explicit and finite.

The system will generate these buckets:

- `card`
- `button-sm`
- `button-md`
- `button-lg`
- `button-unpadded`
- `body-brick`

This bucket set is grounded in the current source:

- `Card` is the shared abstraction for all existing card surfaces.
- `Button` already has four concrete sizes.
- `BodyBrick` is its own distinct non-Card organic surface.

No other bucket types are introduced.

## 7.2 Style key model

The catalog keys are exact.

### Card keys

- `card:default:idle`
- `card:default:hover`
- `card:surface:idle`
- `card:surface:hover`
- `card:highlight:idle`
- `card:highlight:hover`
- `card:modal:idle`
- `card:modal:hover`

No key is generated for `Card` variant `transparent`.
`transparent` remains a no-frame case.

### Button base keys

For each button size bucket (`button-sm`, `button-md`, `button-lg`, `button-unpadded`):

- `<bucket>:primary:base`
- `<bucket>:danger:base`

No base key is generated for `ghost` because the current source renders `ghost` with transparent border and transparent background.

### Button glow keys

For each button size bucket (`button-sm`, `button-md`, `button-lg`, `button-unpadded`):

- `<bucket>:button-default:glow`
- `<bucket>:button-danger:glow`
- `<bucket>:button-selected:glow`

No glow key is generated for the transparent ghost-hover state because the current source uses `transparent` for that path.

### BodyBrick keys

- `body-brick:idle`
- `body-brick:hover`
- `body-brick:selected`

Selected-hover uses `body-brick:selected` plus the existing hover box-shadow semantics.
No separate selected-hover frame key is introduced.

## 7.3 Visual inputs used for generation

All generation inputs come from existing source semantics.

### Shared displacement inputs

Use the current `OrganicEdgeFilter.tsx` values exactly:

- `baseFrequency = 0.02`
- `numOctaves = 3`
- `scale = 15`

### Shared shape inputs

Use the existing theme tokens:

- `theme.radius.md`
- `theme.borderWidth.thin`

### Card color inputs

Use the current `Card.tsx` mappings exactly:

- `default -> theme.colors.background`
- `surface -> theme.colors.surface`
- `highlight -> theme.colors.surfaceHighlight`
- `modal -> theme.colors.modal`

Card border colors remain:

- idle border: `theme.colors.surfaceHighlight`
- hover border: `theme.colors.buttonSelected`

### Button color inputs

Use the current `Button.styles.ts` and `Button.tsx` mappings exactly:

Base surface:

- `primary`: background `rgba(0,0,0,1)`, border `theme.colors.surfaceHighlight`
- `danger`: background `rgba(0,0,0,1)`, border `theme.colors.surfaceHighlight`
- `ghost`: no generated base surface

Glow surface color roles:

- `button-default -> theme.colors.buttonDefault`
- `button-danger -> theme.colors.danger`
- `button-selected -> theme.colors.buttonSelected`

### BodyBrick color inputs

Use the current `BodyBrick.styles.ts` mappings exactly:

- idle border: `theme.colors.surfaceHighlight`
- hover border: `theme.colors.buttonSelected`
- selected border: `theme.colors.buttonSelected`
- fill remains transparent

## 7.4 Source-art generation contract

For each catalog key, the generator must:

1. Create the same semantic source surface currently rendered by CSS.
2. Apply the existing organic displacement values during generation only.
3. Rasterize that result once.
4. Slice it into nine regions.
5. Store those nine regions under the catalog key.

The generator must not run per component render.
The generator must run once per app boot under the provider.

## 7.5 Missing-key behavior

Missing generated frames are an error.
They must not fail silently.

The shared subsystem must:

- warn once per missing key using `console.warn`
- return `null` for the missing generated layer

Each consumer must render its plain non-filter fallback surface underneath the generated layers so the UI remains usable even if a generated key is unavailable.

No fallback path may reintroduce `filter: url(#organic-edge)`.

---

## 8. New Shared Files

## 8.1 `src/ui/lib/foundation/organic-frame/types.ts`

### Responsibility

Define the shared type contract for the generated frame system.

### Logic

This file is type-only.
It defines the stable catalog vocabulary used by the provider, generator, and presentational layer.

### Interface

This file defines:

- `OrganicFrameBucket`
- `OrganicFrameKey`
- `OrganicFrameSliceSet`
- `OrganicFrameCatalog`

`OrganicFrameSliceSet` must represent exactly nine slices.
The contract must not permit a partial slice set.

## 8.2 `src/ui/lib/foundation/organic-frame/organicFrameCatalog.ts`

### Responsibility

Generate the complete startup frame catalog from the current theme and current organic-edge semantics.

### Logic

This file owns:

- the explicit key list defined in section 7.2
- the mapping from keys to generation inputs
- the one-time creation of nine-slice raster assets
- the in-memory catalog object returned to the provider

This file must not render React.

### Interface

Export one pure builder:

- input: current Emotion theme
- output: complete `OrganicFrameCatalog`

If any catalog entry cannot be generated, the builder must still return the catalog object, but that entry must be absent so consumers fall back and warn once.

## 8.3 `src/ui/lib/foundation/organic-frame/OrganicFrameProvider.tsx`

### Responsibility

Create the frame catalog once at startup and expose it through React Context.

### Logic

This provider:

- reads the current theme
- builds the catalog once per theme identity
- stores the catalog in context
- exposes a hook or context consumer used by `OrganicFrameLayer`

Context is DI only. No frequently changing runtime data flows through it.

### Interface

- component props: `children`
- exported hook: `useOrganicFrameCatalog()`

The hook must return the full catalog object.
If the hook is used outside the provider, it must warn and return an empty catalog, matching existing provider patterns in the codebase.

## 8.4 `src/ui/lib/atoms/organic-frame/OrganicFrameLayer.styles.ts`

### Responsibility

Define the static 9-slice DOM layout and positioning styles.

### Logic

This file owns only styling for:

- the absolute fill container
- the nine positioned slice nodes
- pointer-event behavior
- stacking safety

### Interface

No runtime logic.
This file exports styled primitives consumed only by `OrganicFrameLayer.tsx`.

## 8.5 `src/ui/lib/atoms/organic-frame/OrganicFrameLayer.tsx`

### Responsibility

Render one 9-slice surface for a supplied catalog key.

### Logic

This component:

- reads the catalog from `OrganicFrameProvider`
- looks up the supplied key
- renders nine slice nodes when present
- returns `null` and warns once when the key is missing

It must be presentation-only.
It must not generate assets.

### Interface

Props:

- `frameKey: OrganicFrameKey`
- `className?: string`

The component must accept `className` so existing styled-component composition can wrap it inside `Card`, `Button`, and `BodyBrick` styles.

---

## 9. Changed Files: Root Wiring

## 9.1 `src/ui/shell/UiRoot.tsx`

### Responsibility

Wire the one-time frame provider into the existing UI root.

### Logic

Change the root composition to:

- keep `ThemeProvider`
- replace `OrganicEdgeFilter` with `OrganicFrameProvider`
- preserve `DisplayRenderHost`, `PortalManager`, and `IconRegistryProvider`

The provider must be mounted inside `ThemeProvider` because generation needs the active theme.

### Interface

`UiRootProps` remains unchanged.
No caller changes are allowed.

## 9.2 `src/ui/lib/atoms/card/OrganicEdgeFilter.tsx`

### Responsibility

This file is removed.

### Logic

The live SVG filter is no longer part of the runtime or app UI path.

### Interface

None. All imports must be removed.

## 9.3 `src/ui/lib/atoms/card/index.ts`

### Responsibility

Stop exporting the removed SVG filter component.

### Logic

Continue exporting only the `Card` component and `CardProps`.

### Interface

Public exports become:

- `Card`
- `CardProps`

No `OrganicEdgeFilter` export remains.

---

## 10. Changed Files: Card Migration

## 10.1 `src/ui/lib/atoms/card/types.ts`

### Responsibility

Preserve the public `Card` API.

### Logic

No new public prop is introduced for this migration.
The card bucket is internal and fixed to `card`.

### Interface

`CardProps` remains unchanged.

This is intentional. `Card` already centralizes the surface semantics, so the migration happens internally.

## 10.2 `src/ui/lib/atoms/card/Card.styles.ts`

### Responsibility

Replace the live-filter surface styling with a stacked plain-fallback plus generated-layer structure.

### Logic

This file must stop defining any CSS `filter: url(#organic-edge)`.

It must instead define:

- `CardContainer` (preserved)
- `CardFallbackSurface`
  - absolute
  - uses the current background and border colors
  - no SVG filter
- `CardFrameIdle`
  - styled `OrganicFrameLayer`
  - absolute
  - default visible
- `CardFrameHover`
  - styled `OrganicFrameLayer`
  - absolute
  - default hidden
  - shown only on hover when `interactive` is true

This file continues to own hover transitions because `Card` already expresses hover via the existing `interactive` prop.

### Interface

The file continues to export styled primitives for `Card.tsx`.
No consumer outside the card atom imports these styles directly.

## 10.3 `src/ui/lib/atoms/card/Card.tsx`

### Responsibility

Render the new stacked card surface while preserving current card semantics.

### Logic

This file continues to own:

- background variant mapping
- padding resolution
- interactive hover semantics
- border color mapping

It must change rendering from:

- one `CardBackground`

To:

- one `CardFallbackSurface`
- one `CardFrameIdle`
- one `CardFrameHover` when the card is interactive and non-transparent

`variant="transparent"` remains a no-frame case.

Frame keys are exact:

- `default -> card:default:*`
- `surface -> card:surface:*`
- `highlight -> card:highlight:*`
- `modal -> card:modal:*`
- `transparent -> no generated layer`

### Interface

`Card` props, ref behavior, and DOM attribute pass-through remain unchanged.

---

## 11. Changed Files: Button Migration

## 11.1 `src/ui/lib/atoms/button/Button.styles.ts`

### Responsibility

Replace the filtered base and filtered glow layers with plain fallbacks plus generated layers.

### Logic

This file must stop defining any CSS `filter: url("#organic-edge")`.

It must replace the current layer model with:

- `BaseFallbackLayer`
  - preserves current non-ghost button border/background semantics
  - no SVG filter
- `BaseFrameLayer`
  - styled `OrganicFrameLayer`
  - absolute
- `GlowFallbackLayer`
  - preserves the current radial-gradient glow without SVG filter
- `GlowFrameLayer`
  - styled `OrganicFrameLayer`
  - absolute

`EyeGradientLayer` currently expands beyond the container to compensate for SVG filter distortion.
That expansion is no longer needed and must be removed from the fallback and generated glow layers.

### Interface

`ButtonContainer`, `ButtonContent`, `IconWrapper`, and `getVariantColor()` remain available to `Button.tsx`.

## 11.2 `src/ui/lib/atoms/button/buttonInteraction.ts`

### Responsibility

Keep button interaction timing and brightness math, but remove SVG-filter string generation.

### Logic

This file must stop constructing `url("#organic-edge") ...` strings.

It retains:

- `calculateBrightness()`
- `useClickPulse()`

It replaces `getFilterString()` with a brightness-only string helper, or inlines that formatting into `Button.tsx`.

No SVG filter reference may remain in this file.

### Interface

`useClickPulse()` remains unchanged.

If a brightness formatter helper remains exported, its contract is:

- input: numeric brightness
- output: brightness-only CSS filter string

## 11.3 `src/ui/lib/atoms/button/Button.tsx`

### Responsibility

Render button base and button glow using the shared 9-slice mechanism while preserving existing button behavior.

### Logic

This file must preserve:

- hover state
- click pulse state
- selected state
- disabled handling
- `framer-motion` outer scale behavior

It must change the surface rendering to:

- always render `BaseFallbackLayer`
- render `BaseFrameLayer` for non-ghost variants
- always render `GlowFallbackLayer`
- render `GlowFrameLayer` only when the resolved glow role is non-transparent

Glow frame key mapping is exact:

- selected state -> `<button-size-bucket>:button-selected:glow`
- primary hovered/unselected -> `<button-size-bucket>:button-default:glow`
- danger hovered/unselected -> `<button-size-bucket>:button-danger:glow`
- ghost hovered/unselected -> no glow frame

Base frame key mapping is exact:

- primary -> `<button-size-bucket>:primary:base`
- danger -> `<button-size-bucket>:danger:base`
- ghost -> no base frame

Size-to-bucket mapping is exact:

- `sm -> button-sm`
- `md -> button-md`
- `lg -> button-lg`
- `unpadded -> button-unpadded`

The click/hover pulse must continue to affect brightness, but only through a non-SVG filter or equivalent brightness styling.

### Interface

`ButtonProps` remains unchanged.
No caller changes are allowed.

---

## 12. Changed Files: BodyBrick Migration

## 12.1 `src/ui/runtime/world/selection/absorption/BodyBrick.styles.ts`

### Responsibility

Replace the filtered `BrickBackground` with plain fallback and generated-layer wrappers.

### Logic

This file must stop defining `filter: url(#organic-edge)`.

It must define:

- `BrickBackgroundFallback`
  - absolute
  - transparent fill
  - current idle/selected border colors
  - current hover box-shadow behavior preserved by selector rules
- `BrickFrameIdle`
  - styled `OrganicFrameLayer`
- `BrickFrameHover`
  - styled `OrganicFrameLayer`
  - hidden until parent hover
- `BrickFrameSelected`
  - styled `OrganicFrameLayer`
  - visible when `selected` is true

### Interface

The file continues to export the existing content layout styles unchanged.
Only the background surface primitives change.

## 12.2 `src/ui/runtime/world/selection/absorption/BodyBrick.tsx`

### Responsibility

Render the new BodyBrick surface stack while preserving tooltip and row content behavior.

### Logic

This file keeps all current data wiring and tooltip behavior.

It must replace the single `BrickBackground` node with a background stack:

- `BrickBackgroundFallback`
- `BrickFrameIdle`
- `BrickFrameHover`
- `BrickFrameSelected` when `selected` is true

Frame keys are exact:

- idle -> `body-brick:idle`
- hover -> `body-brick:hover`
- selected -> `body-brick:selected`

Hover semantics remain CSS-driven.
Selection semantics remain prop-driven.

### Interface

`BodyBrickProps` remains unchanged.
No caller changes are allowed.

---

## 13. Changed Files: Runtime Card Mount Reduction

## 13.1 `src/ui/runtime/world/living-cards/LivingCardPool.tsx`

### Responsibility

Render only active living-card slots.

### Logic

This file must stop mounting 50 dormant wrappers.

It must instead:

- receive active slot models from the loop hook
- render only active slot wrappers
- keep portal placement and existing shell/content semantics

Because `LivingCardShell` is a `Card`, it automatically picks up the new 9-slice card mechanism through the shared `Card` migration.

### Interface

Component name and external usage remain unchanged.

## 13.2 `src/ui/runtime/world/living-cards/useLivingCardsLoop.ts`

### Responsibility

Keep slot simulation logic, but only expose live slot view models and stop the RAF loop when idle.

### Logic

This file must:

- preserve the current `CardEventBridge` drain path
- preserve current spawn/simulate/apply logic
- derive a list of active slot view models each frame
- stop scheduling RAF when there are no active nodes and the bridge queue is empty
- restart scheduling immediately when a new event arrives

This file must no longer assume a permanently mounted 50-node DOM array.

### Interface

The hook interface changes from:

- input: refs array only
- output: none

To:

- output: active slot view models and ref registration hooks needed by the DOM layer

The exact shape is implementation-owned, but it must be sufficient for `LivingCardPool.tsx` to render only active cards.

## 13.3 `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx`

### Responsibility

Render only currently visible overlay cards.

### Logic

This file must stop iterating fixed `SLOT_IDS`.

It must instead:

- map directly over the visible overlay models returned by `useNodeOverlayModels()`
- keep existing filtering by focus and guidance callout collisions
- preserve `CaveStatusOverlay`, guidance callouts, runtime callouts, and `ScreenOverlay`

Because `CardShell` is a `Card`, it automatically picks up the new 9-slice card mechanism through the shared `Card` migration.

### Interface

Component name and external usage remain unchanged.

## 13.4 `src/ui/runtime/world/node-overlays/useNodeOverlayModels.ts`

### Responsibility

Keep overlay model resolution, but stop allocating toward a permanently rendered 50-slot view.

### Logic

This file must stop passing a render-pool size chosen only for dormant DOM slots.

It must use the actual visible overlay list as the rendering source.
The existing visibility filtering and warning behavior stay intact.

### Interface

The hook continues returning `ResolvedNodeOverlayModel[]`.
No caller other than `NodeOverlayViewport.tsx` changes.

---

## 14. Changed Files: Fill Bars and Runtime Bar Updates

## 14.1 `src/ui/lib/atoms/fill-bar/FillBar.styles.ts`

### Responsibility

Keep the current fill-bar silhouette and decorative gradients, but change the moving fill implementation from width to transform.

### Logic

This file keeps unchanged:

- `ORGANIC_BAR_EDGE`
- track background styling
- threshold marks
- metadata layout

It changes `FillBarFill` to:

- full-width element
- `transform-origin: left center`
- `transform: scaleX(progress / 100)`
- transition on transform instead of width

No width-based fill motion remains in this file.

### Interface

The public component API remains unchanged.
The internal style prop continues receiving numeric progress.

## 14.2 `src/ui/lib/atoms/fill-bar/FillBar.tsx`

### Responsibility

Preserve current fill-bar behavior while driving the new transform-based fill.

### Logic

This file keeps unchanged:

- clamping
- threshold filtering
- heading/value rendering
- `fillRef` forwarding
- `data-progress` for debug and tests

It continues passing computed `progress`, but the visual interpretation is now transform-based.

### Interface

`FillBarProps` remains unchanged.

## 14.3 `src/ui/lib/molecules/fill-slider/FillSlider.tsx`

### Responsibility

Continue reusing the shared fill-bar styling under the new transform contract.

### Logic

No behavioral change.
This file only picks up the shared `FillBarFill` implementation change.

### Interface

`FillSliderProps` remains unchanged.

## 14.4 `src/ui/runtime/world/node-overlays/NodeOverlayViewport.styles.ts`

### Responsibility

Make overlay micro-bars use the same transform-based fill contract.

### Logic

`ProgressFill` must change from width-based fill to full-width transform-based fill:

- full width
- `transform-origin: left center`
- transform based on progress

The rest of the overlay styling remains unchanged.

### Interface

Existing props remain, but the prop now feeds transform instead of width.

## 14.5 `src/ui/runtime/world/node-overlays/NodeOverlayCard.tsx`

### Responsibility

Initialize overlay micro-bars using the new transform contract.

### Logic

This file keeps:

- current binding resolution through `useEntityBarRef`
- current initial progress calculation

It changes only the visual application path so that initial render and ref-driven updates use the same transform semantics.

### Interface

Component props remain unchanged.

## 14.6 `src/ui/runtime/world/entity-state-link/valueMath.ts`

### Responsibility

Continue percentage math and add the value-shaping helpers required by the new transform path.

### Logic

This file keeps `computePercentage()`.

It adds helper logic for:

- formatting the scale transform string from a percentage
- determining whether the visual progress value changed and therefore requires a DOM write

This is the correct place because this file already owns percentage normalization for the entity-state-link domain.

### Interface

Exports become:

- `computePercentage()`
- one transform formatter helper
- one change-detection helper

The helpers must be pure.

## 14.7 `src/ui/runtime/world/entity-state-link/EntityStateLinkContext.tsx`

### Responsibility

Keep runtime-to-DOM fill binding, but switch to transform updates and suppress redundant writes.

### Logic

This file keeps:

- registry lifecycle
- path resolution
- runtime entity indexing
- RAF scheduling model

It changes the DOM write contract to:

- compute percentage
- format transform through the new value-math helper
- compare against the last applied visual value
- write only when the visual state actually changed
- update `data-progress` alongside transform for parity with existing tests and debug tooling

No width write remains in this file.

### Interface

`EntityStateLinkContextValue` remains unchanged.
No consumer API changes are allowed.

## 14.8 `src/ui/runtime/world/entity-state-link/useEntityBarRef.ts`

### Responsibility

Preserve DOM registration semantics.

### Logic

No behavioral change.
This hook stays as the same ref-registration boundary.

### Interface

Unchanged.

---

## 15. Removed Technical Behavior

After this refactor, none of the following may remain anywhere in `src/ui/**`:

- `filter: url(#organic-edge)`
- `filter: url("#organic-edge")`
- `url("#organic-edge") brightness(...)`
- mounting `OrganicEdgeFilter` at the root

This is a hard acceptance criterion.

---

## 16. Test Contract

All tests remain colocated.
All tests follow Given-When-Then structure.
All UI tests verify presentation and wiring, not unrelated business logic.

## 16.1 New tests to add

### `src/ui/lib/foundation/organic-frame/organicFrameCatalog.test.ts`

#### Responsibility

Verify the startup catalog contract.

#### Cases

- Given the default theme, building the catalog returns every key listed in section 7.2.
- Every returned entry contains exactly nine slices.
- No transparent-card key is generated.
- No ghost-button base key is generated.

### `src/ui/lib/atoms/card/Card.test.tsx`

#### Responsibility

Verify card rendering behavior under the new internal surface implementation.

#### Cases

- Default card renders children without crashing under the provider.
- Interactive card still exposes hover-capable structure.
- Transparent card renders content without a generated frame requirement.

This test must not assert on implementation-only DOM ordering beyond what is required to verify behavior.

### `src/ui/lib/atoms/button/Button.test.tsx`

#### Responsibility

Verify button behavior survives the surface migration.

#### Cases

- Primary button renders and calls `onClick`.
- Danger button renders.
- Ghost button renders without requiring a generated base key.
- Selected button still exposes the active visual path without crashing.

### `src/ui/shell/UiRoot.test.tsx`

#### Responsibility

Verify root wiring after provider replacement.

#### Cases

- `UiRoot` renders children successfully.
- The frame provider path is present.
- No hidden organic filter SVG is rendered.

## 16.2 Existing tests to update

### `src/ui/runtime/world/selection/absorption/BodyBrick.flyweight.test.tsx`

#### Update required

Keep the current content assertions.
Also verify the component still renders under the new shared frame provider path.

### `src/ui/lib/atoms/fill-bar/FillBar.test.tsx`

#### Update required

Keep the current title/icon/value/ref assertions.
Change the visual assertion from width-based expectations to transform/data-progress expectations.

### `src/ui/runtime/world/EntityStateLink.test.tsx`

#### Update required

Keep the current binding behavior assertions.
Change visual assertions from `style.width` to transform-based assertions.
Add a case proving the change-detection helper suppresses redundant writes.

### `src/ui/runtime/world/LiveProgressBar.test.tsx`

#### Update required

No API change.
Update expectations to the transform-based DOM contract.

### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.test.tsx`

#### Update required

Update any assumptions tied to fixed dormant slot rendering.
The viewport must now render only the visible overlay cards.

### `src/ui/runtime/world/living-cards/LivingCardPool.smoke.test.tsx`

#### Update required

Update any assumptions tied to fixed dormant wrapper counts.
The pool must now render only active cards.

---

## 17. Acceptance Criteria

The implementation is complete only when all of the following are true:

1. No file in `src/ui/**` contains `organic-edge` filter usage.
2. `OrganicEdgeFilter.tsx` is removed and `UiRoot` no longer mounts it.
3. `Card`, `Button`, and `BodyBrick` all render through the shared generated 9-slice mechanism.
4. `CardProps`, `ButtonProps`, and `BodyBrickProps` remain unchanged.
5. Missing frame keys warn once and fall back safely without reintroducing SVG filters.
6. Living cards render only active cards.
7. Node overlays render only visible cards.
8. Fill bars keep the current shape and thresholds.
9. Runtime-linked bars update with transform, not width.
10. Redundant runtime bar writes are suppressed.
11. All affected tests pass.
12. No unrelated files are changed.

---

## 18. Implementation Order

The implementation order is fixed.

1. Add the shared organic-frame subsystem.
2. Wire `OrganicFrameProvider` into `UiRoot`.
3. Migrate `Card`.
4. Migrate `Button`.
5. Migrate `BodyBrick`.
6. Remove `OrganicEdgeFilter` export and file.
7. Apply the already approved living-card live-only rendering.
8. Apply the already approved node-overlay live-only rendering.
9. Switch fill bars and overlay bars to transform.
10. Switch entity-linked runtime bars to transform and redundant-write suppression.
11. Update existing tests.
12. Add new shared-frame tests.

No later step may reintroduce a removed filter dependency.

---

## 19. Non-Negotiable Design Decisions

These decisions are locked by this LLD:

- The migration uses one shared startup-generated 9-slice mechanism.
- `Card` public API does not grow for this migration.
- `Button` public API does not grow for this migration.
- `BodyBrick` public API does not grow for this migration.
- `ghost` buttons do not gain a new visible base frame.
- Fill bars do not migrate to 9-slice.
- Missing frame keys warn once and fall back without SVG filters.
- The root SVG filter mount is deleted, not retained as a fallback.

