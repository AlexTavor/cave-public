# Phase 17 — Display Editor LLD

## 1. Purpose

This phase adds a blueprint-scoped visual editor for non-body blueprints.

It provides:
- a live background editor
- a live glyph editor
- a live runtime preview with pulse
- persistence through the existing `passport` ability fields and existing module asset buckets

It does **not** change body avatars.

This design is grounded in the current codebase. It reuses the existing:
- `passport` ability authoring surface
- `assets.styles` and `assets.glyphs` persistence model
- compiler pipeline
- Phaser display stack
- layout/runtime preview patterns
- session draft editing model

It does **not** introduce a parallel rendering system, a parallel asset system, or a new blueprint ability.

---

## 2. Why

### 2.1 Current state

The codebase already contains the runtime pieces needed for authored blueprint visuals:

- `src/data/schemas/abilities/passport.ts`
  - already owns `glyphKey` and `styleId`
- `src/data/schemas/assets/glyphs.ts`
  - already defines authored glyph presets
- `src/data/schemas/assets/styles.ts`
  - already defines authored style presets
- `src/engine/compiler/abilities/passportCompiler.ts`
  - already compiles `styleId`
  - already routes body glyphs into body passport data
- `src/engine/phaser/display/modules/GlyphModule.ts`
  - already renders pulse-driven glyph placements
- `src/engine/phaser/display/glyph/glyphRenderMath.ts`
  - already computes animated glyph placement transforms
- `src/engine/phaser/display/modules/BackgroundModule.ts`
  - already renders an organic pulse-driven blob background
- `src/engine/phaser/display/modules/backgroundBlobMath.ts`
  - already computes deterministic organic blob polygons
- `src/ui/devtools/layout/simulation/createSimulationRuntime.ts`
  - already proves the project supports a disposable runtime-backed editor surface

### 2.2 Missing pieces

What does **not** exist today:
- a dedicated visuals editor inside blueprint authoring
- a live glyph authoring surface
- a live background authoring surface
- a non-body generic glyph path that reads `glyphKey` directly from generic display data
- authored background shape families beyond the current circle blob path

### 2.3 Product need

Manual JSON editing is not viable for glyph authoring or visual iteration.

This feature must allow the author to:
- choose a background family from a palette
- choose fill color and alpha
- choose fill mode and invert direction
- edit glyph slots on a 3x3 grid
- edit per-position pulse delay values
- see all of that live using the real runtime pulse

---

## 3. Locked decisions

These decisions are fixed for this phase.

### 3.1 Authoring entry point

The entry point is the existing `passport` ability form.

Reason:
- `passport` already owns `glyphKey` and `styleId`
- adding a new ability would duplicate an existing responsibility

### 3.2 Persistence model

Visual presets continue to live in existing module asset buckets:
- background visuals in `assets.styles`
- glyph visuals in `assets.glyphs`

The blueprint continues to reference them via:
- `passport.styleId`
- `passport.glyphKey`

### 3.3 Preview architecture

The preview uses the real Phaser runtime.

It does **not** use a React/SVG approximation.

### 3.4 Body avatars

Body blueprints remain unchanged.

The visuals editor is not available for blueprints tagged with `body`.

### 3.5 Background palette

The new background palette includes exactly:
- circle
- triangle
- square
- hex
- spiky circle

Hex is part of the new palette.
It is not compatibility-only.

---

## 4. Non-goals and explicit exclusions

These are out of scope because the current codebase does not provide the required asset/runtime contract.

### 4.1 Arbitrary background textures

The current codebase does not have a persisted blob fill texture asset type or a blob fill texture loader path.

Therefore this phase does **not** implement arbitrary background texture selection.

The visuals editor must show the texture row as disabled and explicitly labeled unsupported.

### 4.2 Arbitrary per-slot images

The current glyph schema supports only built-in glyph shapes from `ALL_GLYPH_SHAPES`.

Therefore this phase does **not** implement arbitrary per-slot image upload or generic image asset selection.

The slot picker in this phase is a picker over existing glyph shapes only.

---

## 5. User-facing behavior

## 5.1 Entry

Inside the passport form for a non-body blueprint, the user sees:
- the existing label field
- the existing icon field
- the existing description field
- the existing style id field
- a new glyph id field with suggestions from `assets.glyphs`
- a new `Edit Visuals` button

For body blueprints:
- the glyph id field remains available if already supported by the form design decision
- the `Edit Visuals` button is hidden

## 5.2 Modal behavior

Clicking `Edit Visuals` opens a modal with three sections:
- Background
- Glyph
- Preview

The modal edits the active session draft directly.
It does not have a separate save pipeline.
Closing the modal does not commit the file; the existing session save flow remains the persistence boundary.

## 5.3 Asset mutation behavior

Opening the modal must not dirty the session.

If the blueprint already references a style or glyph asset:
- the modal edits that referenced asset in place

If the blueprint does not yet reference a style asset:
- the first background edit creates `assets.styles[blueprintId]`
- the first background edit also writes `passport.styleId = blueprintId`

If the blueprint does not yet reference a glyph asset:
- the first glyph edit creates `assets.glyphs[blueprintId]`
- the first glyph edit also writes `passport.glyphKey = blueprintId`

This behavior is explicit and deterministic.

## 5.4 Live preview behavior

The preview must:
- use the real runtime
- pulse continuously
- reflect draft changes immediately
- show the real authored background and glyph behavior
- not mutate gameplay state outside the disposable preview runtime

If preview cannot be built, the preview section must render an explicit failure reason.
No silent fallback is allowed.

---

## 6. Data contract

## 6.1 Persisted blueprint contract

Blueprint authoring continues to use the existing `passport` ability config.
No new ability schema is introduced.

Author-facing persisted references remain:
- `passport.styleId?: string`
- `passport.glyphKey?: string`

## 6.2 Persisted display component contract

### File changed
`src/data/schemas/components/display.ts`

### Responsibility
Defines the compiled display component contract.

### Change
Add an optional `glyphKey` field.

### Interface
`DisplayComponentSchema` gains:
- `glyphKey?: string`

### Meaning
For non-body blueprints, the compiler writes the resolved glyph preset key here so generic glyph rendering can use it.

## 6.3 Persisted style asset contract

### File changed
`src/data/schemas/assets/styles.ts`

### Responsibility
Defines authored background style presets stored under `assets.styles`.

### Change
Extend the schema so it accepts both:
- the current legacy style shape
- the new rich style shape used by the display editor

### Accepted persisted forms

#### Legacy style form
- `shape: circle | rect | hex`
- `color: string`
- `borderColor?: string`

#### Rich style form
- `family: circle | triangle | square | hex | spiky_circle`
- `color: string`
- `alpha: number`
- `fillMode: solid | horizontal | vertical | circular`
- `invertFill: boolean`
- `borderColor?: string`

### Normalized parsed output
All valid styles must normalize to one internal shape:
- `family: circle | triangle | square | hex | spiky_circle`
- `color: string`
- `alpha: number`
- `fillMode: solid | horizontal | vertical | circular`
- `invertFill: boolean`
- `borderColor?: string`

### Legacy normalization rules
- `shape: circle` => `family: circle`
- `shape: rect` => `family: square`
- `shape: hex` => `family: hex`
- `alpha` defaults to the current legacy overlay alpha
- `fillMode` defaults to `solid`
- `invertFill` defaults to `false`

### Validation rules
- `alpha` must be between `0` and `1`, inclusive
- `fillMode` must be one of the allowed enum values
- invalid values must fail parsing loudly

## 6.4 Display spec contract

### File changed
`src/engine/phaser/display/types.ts`

### Responsibility
Defines the render-ready spec passed into display modules.

### Change
Extend `DisplaySpec` with an optional resolved style object.

### Interface
`DisplaySpec` gains:
- `style?: EntityStyle | null`

The existing `glyph_key?: string | null` field remains in place.

The style field is optional to avoid widening unrelated test/setup churn.
When present, it must already be normalized.

---

## 7. Compiler and resolution flow

## 7.1 Passport compiler

### File changed
`src/engine/compiler/abilities/passportCompiler.ts`

### Responsibility
Compiles author-facing passport ability data into runtime-facing blueprint components.

### Existing behavior to preserve
- body blueprints compile `display.display_key = body_avatar`
- body blueprints keep `portraitIcon` and `glyphKey` on `components.body.passport`
- `styleId` continues to compile to `display.style`

### New behavior
For non-body blueprints only:
- if `config.glyphKey` is a non-empty string, write it to `draft.components.display.glyphKey`
- if `config.glyphKey` is empty or absent, remove `draft.components.display.glyphKey` if present

For body blueprints:
- do not write `display.glyphKey`
- keep current body avatar path unchanged

### Interface
No function signature change.

## 7.2 Visual parsing

### File changed
`src/engine/phaser/scenes/gameSceneVisualParsers.ts`

### Responsibility
Parses runtime-facing display and visual data before it enters render resolution.

### Change
`parseEntityStyle` must stop doing the current loose `color` check.
It must validate through the updated `EntityStyleSchema` and return the normalized rich style shape.

### Interface
No public function signature change.

## 7.3 Display spec resolution

### File changed
`src/engine/phaser/display/resolveDisplaySpec.ts`

### Responsibility
Builds the render-ready `DisplaySpec` from runtime entity data, compiled blueprint data, physics, and module assets.

### Glyph resolution rule
Resolve glyph key in this order:
1. runtime entity `display.glyphKey`, if present and non-empty
2. compiled blueprint `components.display.glyphKey`, if present and non-empty
3. existing body passport glyph fallback, but only when `display_key === body_avatar`

### Style resolution rule
- read `display.style` as style asset id
- parse the asset through `parseEntityStyle`
- set `styleId` only when style parsing succeeds
- set `style` to the normalized parsed style or `null`

### Failure rule
If style parsing fails, do not silently invent a fallback style.
The resolved spec must carry `style = null` and the invalid asset must be surfaced through the existing loud parse/error behavior.

---

## 8. Runtime rendering

## 8.1 Generic glyph rendering

### File changed
`src/engine/phaser/display/modules/GlyphModule.ts`

### Responsibility
Renders generic glyph overlays.

### Current issue
The module currently resolves glyph presets using `spec.display_key` only.
That prevents generic non-body entities from using a separate authored glyph key.

### Change
Glyph preset lookup must use:
- `spec.glyph_key` when present
- otherwise `spec.display_key`

### Pooling rule
Do not change pool ownership.
Image objects continue to come from `pools.get(spec.display_key).imagePool`.

Reason:
- the pool is for reusable image objects, not for glyph preset identity
- changing pool partitioning is unnecessary scope

## 8.2 Organic background families

### File changed
`src/engine/phaser/display/modules/backgroundBlobMath.ts`

### Responsibility
Computes deterministic organic blob polygons.

### Change
`computeBlobPolygons` must accept a `family` input.

### Supported families
- circle
- triangle
- square
- hex
- spiky_circle

### Family semantics
- `circle`: current behavior
- `triangle`: rounded 3-lobe organic outline
- `square`: rounded 4-lobe organic outline
- `hex`: rounded 6-lobe organic outline
- `spiky_circle`: circular base with additional spike modulation layered into the undulation

### Non-negotiable rule
All families must remain organic and pulse-reactive.
No hard geometric corners are allowed.

## 8.3 Styled background rendering

### Files changed
- `src/engine/phaser/display/modules/BackgroundModule.ts`

### Files added
- `src/engine/phaser/display/modules/backgroundStyledRenderer.ts`

### Responsibilities
`BackgroundModule.ts`
- decides whether to use legacy background rendering or styled background rendering
- retains ownership of pooled graphics objects and module lifecycle

`backgroundStyledRenderer.ts`
- contains the pure rendering logic for rich authored background styles
- draws styled fills into the existing background graphics objects

### Dispatch rule
If `spec.style` is absent or null:
- use the current legacy path unchanged

If `spec.style` is present:
- use the styled rendering path
- do not read gameplay-driven fill band state for the fill visual
- continue using the same pooled graphics objects already acquired by `BackgroundModule`

### Styled rendering rules
The styled path must use the existing graphics objects already owned by `BackgroundModule`:
- mask graphics
- fill graphics
- border graphics

### Fill behavior
Base interior:
- render the current neutral base fill inside the inner polygon

Overlay fill:
- use `style.color`
- use `style.alpha`
- animate the fill using the existing pulse value already provided to the module tick

Fill mode semantics:
- `solid`: overlay covers the full inner polygon
- `horizontal`: coverage expands along the Y axis with pulse
- `vertical`: coverage expands along the X axis with pulse
- `circular`: coverage expands radially with pulse

Invert semantics:
- `horizontal`: top-to-bottom instead of bottom-to-top
- `vertical`: right-to-left instead of left-to-right
- `circular`: edge-to-center instead of center-to-edge

Border rule:
- use `style.borderColor` when present
- otherwise use the current default border color

### Lifecycle rule
No new field is added to `DisplayScratch` for a mask object.
If the styled renderer needs a Phaser geometry mask, that mask is owned inside the `BackgroundModule` runtime closure and destroyed there.
The shared scratch contract remains limited to the existing pooled graphics references.

---

## 9. Preview runtime

## 9.1 Reused mechanism

The preview must reuse the existing runtime-backed editor pattern from layout mode.

Specifically it must reuse:
- `createGameRuntime`
- `usePhaserGame`
- `LayoutWorldAdapter`
- `useLayoutEditorTicker`

It must not invent a second preview loop.

## 9.2 Preview runtime factory

### File added
`src/ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.ts`

### Responsibility
Creates a disposable runtime that previews exactly one non-body blueprint from the current session draft.

### Input
- current `ModuleCartridge` draft
- target `blueprintId`

### Output
- `Runtime` when preview is supported
- `null` when preview is not supported

### Unsupported conditions
Return `null` when:
- the target blueprint does not exist
- the target blueprint has the `body` tag
- the compiled target blueprint has no display component

### Logic
1. Deep-clone the current module draft.
2. Resolve the target blueprint from the cloned draft.
3. Compile only the target blueprint with `CompilerService`.
4. Build a preview cartridge containing:
   - the current module metadata
   - the current assets
   - the current config, when present
   - the current `sys_world` blueprint, when present
   - the compiled target blueprint
5. Sanitize the compiled target blueprint to the minimum component set required by the current display modules used in this feature:
   - `display`
   - `physics`
   - `state`
   - `powerSource`
   - `powerSink`
   - `assignment`
   - `face`
   - `body`
6. If the sanitized blueprint has no physics component, inject preview-only physics with:
   - `x = 0`
   - `y = 0`
   - `radius = existing resolved display radius when available, otherwise the current default preview radius`
7. Create the runtime with a fixed seed string.
8. Spawn only the target blueprint entity.
9. Tick once before returning.

### Rationale for the sanitize allowlist
This allowlist is derived from what the current visual stack reads:
- `BackgroundModule` reads `state`, `powerSource`, `powerSink`, `assignment`, and `display_key`
- `backgroundBandSelector.ts` also reads `face.attribute`
- `body` is preserved because the existing layout preview sanitizer already preserves it and it is harmless for this feature

## 9.3 Preview component

### File added
`src/ui/devtools/editors/blueprint/visuals/BlueprintVisualsPreview.tsx`

### Responsibility
Owns preview runtime lifecycle and preview canvas rendering.

### Reused mechanisms
- `usePhaserGame`
- `LayoutWorldAdapter`
- `useLayoutEditorTicker`

### Interface
Props:
- current module draft
- target `blueprintId`
- `enabled: boolean`

### Behavior
- when enabled, build the preview runtime from the current draft
- run the preview ticker continuously
- destroy the old runtime before building a new one
- render an explicit empty/unsupported state when runtime creation returns `null`

### No direct runtime mutation rule
This component must never mutate the real application runtime.
It owns only its disposable preview runtime.

---

## 10. Editor UI

## 10.1 Session UI state

### File changed
`src/ui/devtools/state/sessionLogic.ts`

### Responsibility
Defines per-session UI metadata.

### Change
Add an explicit optional field:
- `isVisualsOpen?: boolean`

### Reason
The current type allows arbitrary keys, but this modal is now a first-class editor state and must be named explicitly.

## 10.2 Passport ability form

### File changed
`src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx`

### Responsibility
Renders the passport ability authoring form.

### Changes
Add:
- glyph id field using the existing `AutocompleteStringField`
- glyph suggestions sourced from `session.draft.assets.glyphs`
- `Edit Visuals` button for non-body blueprints only

### Logic
- read the active blueprint through existing blueprint/session hooks
- hide the button when the blueprint has the `body` tag
- on click, set `ui.isVisualsOpen = true` for the current blueprint scope

### Interface
No prop signature change.

## 10.3 Blueprint editor view

### File changed
`src/ui/devtools/editors/blueprint/editor/BlueprintEditorView.tsx`

### Responsibility
Composes the top-level blueprint editor surface.

### Change
Mount the visuals modal alongside the existing editor content.

### Interface
No prop signature change.

## 10.4 Visuals modal

### Files added
- `src/ui/devtools/editors/blueprint/visuals/BlueprintVisualsModal.tsx`
- `src/ui/devtools/editors/blueprint/visuals/BlueprintVisualsModal.styles.ts`

### Responsibility
Provides the presentation shell for the display editor.

### Layout
Three sections:
- Background
- Glyph
- Preview

### Rule
This component is presentation-only.
Business logic does not live in this `.tsx` file.

## 10.5 Visuals editor hook

### File added
`src/ui/devtools/editors/blueprint/visuals/useBlueprintVisualsEditor.ts`

### Responsibility
Owns all editor business logic.

### Interface returned by the hook
- `isOpen`
- `close()`
- `styleDraft`
- `glyphDraft`
- `selectedPosition`
- `selectPosition(position)`
- `updateBackgroundFamily(value)`
- `updateBackgroundColor(value)`
- `updateBackgroundAlpha(value)`
- `updateBackgroundFillMode(value)`
- `updateBackgroundInvert(value)`
- `togglePlacement(position)`
- `updatePlacementShape(position, value)`
- `updatePlacementScale(position, value)`
- `updatePlacementRotation(position, value)`
- `removePlacement(position)`
- `updateDelay(position, value)`
- `previewDraft`
- `previewSupported`
- `previewReason`

### Mutation rule
All draft mutation must go through `useSessionStore().updateDraft(...)`.

### No-dirty-on-open rule
The hook must not create missing assets merely by opening the modal.
Asset creation happens only on the first actual edit.

## 10.6 Draft helper module

### File added
`src/ui/devtools/editors/blueprint/visuals/blueprintVisualsDraft.ts`

### Responsibility
Contains pure helper logic for:
- resolving effective style and glyph ids
- reading current style and glyph assets from draft
- lazily creating missing style and glyph assets on first edit
- generating a default glyph preset from the existing procedural glyph system
- validating whether preview is supported

### Interface
Pure functions only.
No React code.
No direct store access.

### Default glyph creation rule
When a glyph asset must be created from nothing, use the existing procedural glyph system to materialize a stable starting glyph for the effective glyph id.

This avoids inventing a second default glyph rule.

## 10.7 Background section

### File added
`src/ui/devtools/editors/blueprint/visuals/BackgroundVisualSection.tsx`

### Responsibility
Presentation-only controls for the background editor.

### Props
Controlled props only.
No draft access.

### Controls
- family palette
  - circle
  - triangle
  - square
  - hex
  - spiky circle
- fill color
- alpha slider
- fill mode selector
  - solid
  - horizontal
  - vertical
  - circular
- invert direction toggle
- texture row marked unsupported and disabled

## 10.8 Glyph section

### File added
`src/ui/devtools/editors/blueprint/visuals/GlyphVisualSection.tsx`

### Responsibility
Presentation-only controls for the glyph editor.

### Props
Controlled props only.
No draft access.

### Layout
- 3x3 slot grid
- slot inspector
- delay slider list

### Slot grid semantics
- positions are the existing glyph positions `0..8`
- click selects a position
- if a placement exists at that position, the inspector edits it
- if no placement exists, the inspector can create one there
- max placements remain `5`

### Max placement rule
Attempting to enable a sixth placement is rejected explicitly.
The UI must show clear feedback.
No silent failure is allowed.

### Slot inspector controls
- shape picker from `ALL_GLYPH_SHAPES`
- scale slider
- rotation slider
- remove action when occupied

### Delay controls
- one slider per position `0..8`
- allowed values are restricted to the current schema-supported delay steps only

---

## 11. File-by-file change list

This section is exhaustive.
Only the files listed below are to be added or changed for this phase.

## 11.1 Production files changed

### `src/data/schemas/components/display.ts`
- Responsibility: compiled display component schema
- Logic: add optional `glyphKey`
- Interface: schema gains `glyphKey?: string`

### `src/data/schemas/assets/styles.ts`
- Responsibility: persisted style preset schema
- Logic: accept legacy and rich style forms and normalize them
- Interface: parsed output exposes normalized rich shape

### `src/engine/compiler/abilities/passportCompiler.ts`
- Responsibility: compile passport ability into blueprint components
- Logic: emit `display.glyphKey` for non-body blueprints only
- Interface: unchanged function signature

### `src/engine/phaser/scenes/gameSceneVisualParsers.ts`
- Responsibility: parse display/style data for rendering
- Logic: validate styles through updated schema and return normalized style
- Interface: unchanged function signatures

### `src/engine/phaser/display/types.ts`
- Responsibility: render spec contract
- Logic: add optional normalized style field
- Interface: `DisplaySpec` gains `style?: EntityStyle | null`

### `src/engine/phaser/display/resolveDisplaySpec.ts`
- Responsibility: resolve render-ready display spec
- Logic: generic glyph key resolution and resolved style injection
- Interface: unchanged function signature

### `src/engine/phaser/display/modules/GlyphModule.ts`
- Responsibility: generic glyph rendering
- Logic: prefer `spec.glyph_key` over `spec.display_key` for glyph preset lookup
- Interface: unchanged module factory interface

### `src/engine/phaser/display/modules/backgroundBlobMath.ts`
- Responsibility: organic blob polygon generation
- Logic: support `circle`, `triangle`, `square`, `hex`, and `spiky_circle`
- Interface: `computeBlobPolygons(...)` gains `family`

### `src/engine/phaser/display/modules/BackgroundModule.ts`
- Responsibility: background rendering dispatch and lifecycle
- Logic: select legacy vs styled rendering path; preserve pooled graphics lifecycle
- Interface: unchanged module factory interface

### `src/ui/devtools/state/sessionLogic.ts`
- Responsibility: session UI state type
- Logic: add explicit `isVisualsOpen?: boolean`
- Interface: `SessionUiState` gains one named optional property

### `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx`
- Responsibility: passport ability form UI
- Logic: add glyph id suggestions and visuals editor launch control
- Interface: unchanged props

### `src/ui/devtools/editors/blueprint/editor/BlueprintEditorView.tsx`
- Responsibility: blueprint editor composition
- Logic: mount visuals modal
- Interface: unchanged props

## 11.2 Production files added

### `src/engine/phaser/display/modules/backgroundStyledRenderer.ts`
- Responsibility: pure styled background rendering helpers
- Logic: render rich fill modes into existing graphics objects
- Interface: helper functions called only by `BackgroundModule`

### `src/ui/devtools/editors/blueprint/visuals/BlueprintVisualsModal.tsx`
- Responsibility: display editor modal shell
- Logic: presentation only
- Interface: context/hook driven component

### `src/ui/devtools/editors/blueprint/visuals/BlueprintVisualsModal.styles.ts`
- Responsibility: styled component definitions for the modal
- Logic: styling only
- Interface: exported styled wrappers

### `src/ui/devtools/editors/blueprint/visuals/useBlueprintVisualsEditor.ts`
- Responsibility: editor business logic and draft mutations
- Logic: session-ui state, draft mutations, selection state, preview inputs
- Interface: custom hook returning state and actions

### `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsDraft.ts`
- Responsibility: pure draft helpers
- Logic: resolve ids, lazily create assets, create default glyph preset, read preview support
- Interface: pure functions only

### `src/ui/devtools/editors/blueprint/visuals/BackgroundVisualSection.tsx`
- Responsibility: background controls UI
- Logic: presentation only
- Interface: controlled component

### `src/ui/devtools/editors/blueprint/visuals/GlyphVisualSection.tsx`
- Responsibility: glyph controls UI
- Logic: presentation only
- Interface: controlled component

### `src/ui/devtools/editors/blueprint/visuals/BlueprintVisualsPreview.tsx`
- Responsibility: preview runtime and canvas lifecycle
- Logic: build/destroy preview runtime and render canvas
- Interface: controlled component

### `src/ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.ts`
- Responsibility: preview runtime factory
- Logic: build one-entity disposable preview runtime from current draft
- Interface: pure factory returning `Runtime | null`

---

## 12. Tests

All tests must follow the existing project contract:
- logic in unit tests
- runtime interactions in integration tests
- UI wiring in view tests
- Given/When/Then readability
- no complex business logic in UI tests

## 12.1 Test files changed

### `src/engine/compiler/abilities/passportCompiler.test.ts`
Add coverage for:
- non-body blueprint compiles `display.glyphKey`
- body blueprint behavior remains unchanged

### `src/engine/phaser/display/resolveDisplaySpec.test.ts`
Add coverage for:
- generic glyph key resolution from display component
- body avatar glyph fallback still works
- resolved normalized style is attached when valid
- invalid style does not silently produce a fake style

### `src/engine/phaser/display/modules/GlyphModule.test.ts`
Add coverage for:
- glyph registry lookup prefers `glyph_key`
- fallback to `display_key` still works

### `src/engine/phaser/display/modules/backgroundBlobMath.test.ts`
Add coverage for:
- deterministic output for each family
- triangle differs from circle
- square differs from circle
- hex differs from circle
- spiky circle has greater radial variance than circle

### `src/engine/phaser/display/modules/BackgroundModule.test.ts`
Add coverage for:
- styled path bypasses legacy fill-band composition
- each fill mode reacts to pulse
- invert direction flips the appropriate axis/radial behavior
- legacy no-style behavior remains unchanged

## 12.2 Test files added

### `src/data/schemas/assets/styles.test.ts`
Unit tests for:
- legacy style parsing
- rich style parsing
- normalization rules
- invalid alpha rejection
- invalid fillMode rejection

### `src/data/schemas/components/display.test.ts`
Unit tests for:
- `glyphKey` accepted when present
- legacy display component input still parses when absent

### `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsDraft.test.ts`
Unit tests for:
- effective asset id resolution
- modal open does not dirty session
- first edit creates missing asset and writes passport reference
- procedural glyph materialization used for new glyph asset
- preview support correctly rejects body blueprints

### `src/ui/devtools/editors/blueprint/visuals/createBlueprintVisualsPreviewRuntime.test.ts`
Integration tests for:
- preview runtime created for supported non-body blueprint
- preview runtime returns null for body blueprint
- preview-only physics injection when missing
- runtime spawns only the preview entity

### `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.visuals.test.tsx`
View tests for:
- glyph suggestions are displayed
- `Edit Visuals` button appears for non-body blueprints
- `Edit Visuals` button is hidden for body blueprints
- clicking the button sets visuals modal UI state

### `src/ui/devtools/editors/blueprint/visuals/BlueprintVisualsModal.test.tsx`
View tests for:
- modal renders background, glyph, and preview sections when open
- disabled texture row is visible
- explicit preview-unavailable state renders when unsupported

### `src/ui/devtools/editors/blueprint/visuals/BackgroundVisualSection.test.tsx`
View tests for:
- family palette includes circle, triangle, square, hex, and spiky circle
- alpha, fill mode, and invert callbacks are wired correctly

### `src/ui/devtools/editors/blueprint/visuals/GlyphVisualSection.test.tsx`
View tests for:
- selecting a slot changes selection
- shape/scale/rotation callbacks are wired correctly
- sixth placement is rejected explicitly
- delay sliders emit the correct position/value pairs

---

## 13. Acceptance criteria

The phase is complete only when all conditions below are true.

1. Non-body blueprints can open a visuals editor from the passport form.
2. The background editor palette includes:
   - circle
   - triangle
   - square
   - hex
   - spiky circle
3. Opening the modal does not dirty the session.
4. The first background edit creates a missing style asset only when needed.
5. The first glyph edit creates a missing glyph asset only when needed.
6. The modal preview uses the real Phaser runtime and pulses live.
7. Generic non-body glyph rendering honors authored `glyphKey`.
8. Body avatars remain unchanged.
9. Legacy blueprints with no authored style continue to render through the existing legacy background path unchanged.
10. Unsupported capabilities are explicit in UI:
    - arbitrary background texture selection is unsupported
    - arbitrary per-slot image selection is unsupported
11. All added and changed tests pass.

---

## 14. Implementation order

The implementation order is fixed.

### Step 1
Update the persisted contracts and parser path:
- `display.ts`
- `styles.ts`
- `gameSceneVisualParsers.ts`

### Step 2
Update compile/resolve/runtime flow:
- `passportCompiler.ts`
- `resolveDisplaySpec.ts`
- `GlyphModule.ts`
- `backgroundBlobMath.ts`
- `BackgroundModule.ts`
- `backgroundStyledRenderer.ts`

### Step 3
Add editor UI state and passport entry point:
- `sessionLogic.ts`
- `PassportAbilityForm.tsx`
- `BlueprintEditorView.tsx`

### Step 4
Add visuals editor hook/helpers/UI:
- `blueprintVisualsDraft.ts`
- `useBlueprintVisualsEditor.ts`
- `BlueprintVisualsModal.tsx`
- `BackgroundVisualSection.tsx`
- `GlyphVisualSection.tsx`

### Step 5
Add preview runtime and preview view:
- `createBlueprintVisualsPreviewRuntime.ts`
- `BlueprintVisualsPreview.tsx`

### Step 6
Add and update all tests listed in Section 12.

---

## 15. Final notes

This phase is intentionally narrow.

It reuses existing mechanisms wherever the codebase already provides them:
- existing passport ability fields
- existing assets buckets
- existing compiler flow
- existing Phaser display modules
- existing runtime preview pattern
- existing session draft editing model

It does not introduce:
- a new ability
- a new asset storage system
- a second rendering implementation
- body avatar changes
- speculative texture/image asset systems

This is the smallest implementation that satisfies the requested feature without violating the project contract.
