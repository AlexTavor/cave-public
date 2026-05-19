# LLD: Unify icons, resources, and blueprint visuals into authored displays

## 1. Purpose

This document defines the low-level design for replacing emoji-based icons and separate resource visuals with a single authored display system in `.art`, reusing the existing style/glyph/display machinery that already exists in the codebase.

The implementation target is an agent working in the IDE. This document is intentionally explicit and file-scoped. It contains the why, the what, and the how. It defines every required file addition, file change, and file deletion in scope for this work.

This document is grounded in the current repository state.

---

## 2. Why

### 2.1 Current problems in the codebase

The current codebase has three separate visual-authoring paths for related concerns:

1. **Icons in `.art`**
   - `.art` currently exposes `assets.icons`, backed by `IconAssetDefinitionSchema`.
   - These entries are limited to `emoji | image`.
   - `GameIcon` and rich text consume these through the icon registry.

2. **Resources in `.art`**
   - `.art` currently exposes `assets.resources`, backed by `ResourceVisualSchema`.
   - This contains both a legacy visual shape and an optional `transferVisual` payload with glyph/light/particles.
   - This is used by the special transfer-render pipeline.

3. **Blueprint/passport visuals**
   - Blueprint visuals are authored through the passport/style/glyph path and the existing “Edit Visuals” tooling.
   - These visuals are not first-class icon assets.

This split creates duplicated semantics, duplicated lookup paths, and dead-end authoring:

- `GameIcon` resolves icons through one mechanism.
- transfer nodes resolve visuals through another mechanism.
- blueprint visuals are authored through a third mechanism.
- emoji defaults still exist in code and in example content.
- the current icon registry contains special-case runtime overrides for attribute pools.
- transfer rendering still depends on a transfer-specific render snapshot and transfer-only modules.
- transfer particles exist in schema and runtime code even though they are no longer desired.

### 2.2 Desired outcome

The desired system is:

- one authored asset family: `assets.displays`
- one icon/display lookup mechanism everywhere
- no emoji-based icon assets
- no resource-specific visual subsystem
- no transfer-specific visual subsystem
- the same authored display can be used for:
  - `GameIcon`
  - rich text `[icon=...]`
  - blueprint/passport icon overrides
  - Draft previews
  - resource transfer entities
- blueprint visual fallback should be automatic when no explicit display asset exists for a key

This design also must preserve and reuse existing proven mechanisms where they already exist:

- style assets
- glyph assets
- blueprint visuals editor affordances
- existing display registry / module stack system
- existing body avatar rendering path
- existing display-image export path

---

## 3. What is changing

### 3.1 High-level changes

This change does all of the following:

1. Replace `assets.icons` and `assets.resources` with `assets.displays`.
2. Make `passport.icon` optional; when present, it becomes a display key into `assets.displays`.
3. Keep the current rich text tag semantics. `[icon=...]` remains the only icon/display tag.
4. Remove emoji-backed defaults and emoji-backed authored icon assets.
5. Replace the current transfer-render special case with regular display-key resolution.
6. Remove transfer particles and all transfer-particle detritus.
7. Extend style assets to include light configuration.
8. Extend the background family selection to support “no background”.
9. Allow Draft UI to show one or more spawned blueprint displays instead of a single authored emoji/icon.
10. Introduce exactly one display resolution pipeline for all of the above.

### 3.2 Non-goals

This change does **not** do the following:

- It does not redesign body avatars. The current body avatar runtime path remains in place.
- It does not create a second rich text syntax for blueprints.
- It does not introduce a second asset family beside `assets.displays`.
- It does not refactor unrelated gameplay systems.
- It does not preserve transfer particles.

---

## 4. Current repository facts this design is based on

The design below is based on these verified implementation facts in the repository:

- `.art` is currently parsed and serialized with `icons`, `glyphs`, `resources`, `styles`, and `settings`.
- `PassportAbilitySchema.icon` is currently required and defaults to `"unknown"`.
- `passportCompiler` currently writes `display.display_key = config.icon` for non-body blueprints and forces `"body_avatar"` for body blueprints.
- `GameIcon` currently renders `emoji | component | image` from the icon registry.
- `useRuntimeDisplayIcons()` currently hardcodes runtime replacements for `attr_body`, `attr_mind`, and `attr_social`.
- `DisplayRegistry` already has a default placeholder display definition with the stack:
  - `TransformModule`
  - `LightModule`
  - `BackgroundModule`
  - `GlyphModule`
  - `InteractionModule`
  - `SelectionModule`
- `DisplayDefinitionCatalog` currently registers special stacks for `body_avatar`, `cave_level`, `attr_body`, `attr_mind`, `attr_social`, and transfer-related keys.
- transfer visuals currently use a separate pipeline:
  - `assets.resources`
  - `transferRender.ts`
  - `transferPendingBuilder.ts`
  - `TransferModule`
  - `TransferGlyphModule`
  - `TransferParticlesModule`
- `createBlueprintVisualsPreviewRuntime(...)` already exists and is the current preview-runtime seam for non-body blueprint visuals.
- `DisplayImageExportService` already exists but is currently limited to `attr_body`, `attr_mind`, `attr_social`, and `body_avatar`.

---

## 5. Design decisions

### 5.1 One resolver, one mental model

All icon/display consumers must resolve through one mechanism.

The canonical resolution API is:

- **Input**: a display key string
- **Output**: a resolved display source that can be rendered both:
  - as a `GameIcon` / rich text inline visual
  - as an in-world display

There must be no parallel lookup path for:

- icons
- resources
- transfer visuals
- Draft preview visuals
- passport icon overrides

### 5.2 Resolution order

Every display lookup must use this exact precedence order:

1. **Exact display asset match in `assets.displays`**
2. **Else exact blueprint id match**
3. **Else exact `unknown` display asset**

There are no additional fallback branches.

In particular:

- no emoji fallback
- no implicit style/glyph synthetic key fallback
- no transfer-specific fallback
- no special icon registry aliases

### 5.3 New authored asset family

`assets.displays` replaces both:

- `assets.icons`
- `assets.resources`

Each display entry is keyed by the same string that callers use at runtime.

Examples:

- `attr_body`
- `attr_mind`
- `attr_social`
- `body_xp`
- `body_level`
- `cave_xp`
- `cave_level`
- `wood`
- `food`
- `heat`
- `fire`
- `edibles`
- `unknown`
- `loading`

For resource displays specifically, the display key must equal the resource key used by transfer payloads. This eliminates the current split between transfer payload keys like `wood` and UI/icon keys like `resource_wood`.

### 5.4 Display types in `.art`

`assets.displays` uses authored display types.

Phase-1 supported types are:

- `body`
- `attribute_pool`
- `resource`

#### `body`

Purpose:

- reserved for the unified asset model
- future home of authored avatar builder configuration

Phase-1 behavior:

- no per-entry selector UI beyond the type itself
- resolution uses the existing body-avatar runtime/render/export path where applicable
- body world rendering remains `body_avatar`-driven in this phase

#### `attribute_pool`

Purpose:

- authored definition for attribute pool visuals

Required authored field:

- `attribute`: `body | mind | social`

Runtime rule:

- the canonical keys for this type are `attr_body`, `attr_mind`, and `attr_social`
- these continue to use the existing special attribute-pool display behavior

#### `resource`

Purpose:

- general display definition for any non-body, non-attribute display that should render as a regular display stack

Required authored fields:

- `styleId`
- `glyphKey`

Optional authored fields:

- `tooltip`
- `tags`

Runtime rule:

- these render through the normal display stack
- transfer visuals use this exact same display definition
- there is no transfer-only schema and no transfer-only module stack

### 5.5 Light belongs to style

The style asset schema must be extended so that light is authored inside style.

Light is not part of a separate resource or transfer schema.

The style editor and the blueprint “Edit Visuals” path must both expose the same light semantics.

### 5.6 Background family must support “none”

The style editor background-family selection must include “no background”.

This is not a second field. It is a valid family selection in the existing background/style path.

Runtime behavior for `family = none`:

- the background module must render no filled background and no background border
- glyph rendering and light rendering remain active

### 5.7 `passport.icon` becomes optional display-key override

`passport.icon` is **not removed**.

Its new meaning is:

- optional display key into `assets.displays`
- if omitted, the blueprint’s own id becomes the display key

Compiler rules:

- non-body blueprint:
  - `display.display_key = passport.icon ?? blueprint.id`
- body blueprint:
  - world `display.display_key` remains `body_avatar`
  - `body.passport.portraitIcon = passport.icon ?? blueprint.id`

This preserves the current body-avatar world render path while unifying authored display overrides.

### 5.8 Rich text semantics stay unchanged

No new rich text syntax is introduced.

The standard remains:

- `[icon=display_key]`

No `[bp=...]` or `[bp:...]` syntax is added in this phase.

### 5.9 Transfers become normal displays

Transfer visuals are not special.

The current special transfer rendering pipeline is removed.

Pending transfer entity rule:

- `display.display_key` must be the first payload key if one exists
- else `display.display_key = "unknown"`

There is no `render` snapshot attached for visual purposes.

The rendered transfer node uses the same display key and the same authored `assets.displays` entry as `GameIcon` and rich text.

### 5.10 Particles are removed

Particles are deprecated.

The following are removed from the system:

- particles in authored schema
- particles in runtime transfer-render props
- particles in transfer modules
- particles in example `.art` data

### 5.11 Draft previews are derived, not separately authored

Draft option schema keeps its existing `icon: string` field.

Draft UI behavior changes:

- if the option payload includes one or more spawn actions (`SPAWN`, `SPAWN_BODY`), the card preview must render the resolved display keys for those blueprint ids in a row
- if there are no spawn actions, Draft falls back to the authored `icon` field

This logic must live outside `.tsx` in a dedicated helper.

---

## 6. Runtime and UI resolution contract

### 6.1 Canonical resolution behavior

A single shared resolution helper must be introduced and reused by all UI icon/display consumers.

The helper accepts:

- display key
- runtime/module access needed to inspect:
  - `assets.displays`
  - blueprint table

The helper returns one of these exact cases:

1. **Authored display asset**
   - includes typed display metadata
   - includes any style/glyph/light data needed to render/export the display

2. **Blueprint fallback**
   - the key equals a blueprint id
   - blueprint preview/export path is used

3. **Unknown display**
   - the key resolves to `assets.displays.unknown`

The helper does not return emoji definitions.

### 6.2 In-world display resolution

`resolveDisplaySpec(...)` must be extended so that it can consume `assets.displays` in addition to the current component/passport fields.

Rules:

- if the display key resolves to an authored `resource` display, `resolveDisplaySpec(...)` must inject the display asset’s `styleId` and `glyphKey`
- if the display key resolves to an authored `attribute_pool` display, the special attribute pool stack remains in effect; its attribute semantics remain tied to the canonical keys `attr_body`, `attr_mind`, `attr_social`
- if the display key resolves to a body display in a world context where the body-avatar path applies, the existing body-avatar render path remains authoritative
- if no explicit display asset exists and the display key is a blueprint id, the entity/blueprint’s own display component remains authoritative

### 6.3 `GameIcon` / rich text rendering

`GameIcon` remains the universal UI entry point.

Its internal implementation changes from:

- icon-registry lookup of emoji/image/component

to:

- single display resolver
- display-image export request for the resolved display source
- image rendering of the exported display

`[icon=...]` in rich text continues to render through `GameIcon`.

### 6.4 Export/render path for UI icons

The existing display-image export service must be extended to handle:

- authored display assets by key
- blueprint fallback by key
- the existing body-avatar export path

The current special-case limitation to `attr_body | attr_mind | attr_social | body_avatar` must be removed.

The resulting UI rule is:

- all icon-like visuals shown in React are rendered display images
- no emoji icon rendering remains

---

## 7. Data migration rules

### 7.1 Asset migration

All modules and templates must migrate from:

- `assets.icons`
- `assets.resources`

to:

- `assets.displays`

### 7.2 Resource-key migration

For displays that represent transferable resources, the canonical display key must be the resource key itself.

The example module content and any editor defaults in this repository must migrate from keys like:

- `resource_wood`
- `resource_food`
- `resource_heat`
- `resource_fire`
- `resource_edibles`

into:

- `wood`
- `food`
- `heat`
- `fire`
- `edibles`

This is required so that transfers and icons can share the exact same display key without adapter logic.

### 7.3 Attribute-key migration

The canonical attribute pool keys are:

- `attr_body`
- `attr_mind`
- `attr_social`

Legacy UI aliases like:

- `body_attr_body`
- `body_attr_mind`
- `body_attr_social`

must be removed from code.

### 7.4 Unknown/loading migration

The repository must define authored display entries for:

- `unknown`
- `loading`

These replace the current emoji-based fallback definitions.

---

## 8. File-by-file implementation plan

This section is the contract for the implementation work.

For each file below, the responsibility, required logic, and required interface are defined.

### 8.1 Add new asset schema

#### `data/schemas/assets/displays.ts` **(new)**

**Responsibility**

Define the new `assets.displays` schema and TypeScript types.

**Logic**

Create a discriminated union with these variants:

- `body`
- `attribute_pool`
- `resource`

Preserve search/editor metadata fields that are currently useful on icon assets:

- `tooltip`
- `tags`

`resource` must reference existing authored style/glyph assets by key.

**Interface**

Export:

- `DisplayAssetSchema`
- `DisplayAssetTypeSchema`
- `BodyDisplayAssetSchema`
- `AttributePoolDisplayAssetSchema`
- `ResourceDisplayAssetSchema`
- inferred TS types

### 8.2 Replace asset collection wiring

#### `data/schemas/assets/collection.ts`

**Responsibility**

Define the top-level asset collection schema.

**Logic**

Replace:

- `icons`
- `resources`

with:

- `displays`

Defaults must initialize `displays: {}`.

**Interface**

`AssetCollectionSchema` and `AssetCollection` must expose `assets.displays` as the canonical display asset map.

#### `engine/linker/semanticArtSchema.ts`

**Responsibility**

Parse `.art` source files.

**Logic**

Replace `icons` and `resources` fields with `displays`.

**Interface**

`SemanticArtSchema` and `SemanticArtData` must expose `displays` only.

#### `engine/linker/types.ts`

**Responsibility**

Define runtime cartridge typings.

**Logic**

Replace `assets.icons` and `assets.resources` with `assets.displays`.

**Interface**

`RuntimeCartridge.assets` type must expose `displays`.

#### `engine/linker/moduleLinkerRuntime.ts`

**Responsibility**

Construct runtime cartridges.

**Logic**

Initialize `assets.displays = {}` and remove `icons` / `resources` initialization.

**Interface**

Runtime cartridge creation must preserve shape compatibility with the updated runtime type.

#### `lib/modules/semanticModuleFragments.ts`

**Responsibility**

Define the semantic module file fragments used for `.art` reading/writing.

**Logic**

Replace the fragment model so `.art` uses `displays` instead of `icons` and `resources`.

**Interface**

Only `displays`, `glyphs`, `styles`, and `settings` remain for `.art` asset fragments.

#### `lib/modules/fragmentSerializers.ts`

**Responsibility**

Serialize/deserialize module fragments.

**Logic**

Remove icon/resource fragment handling and add display fragment handling.

**Interface**

The `.art` serializer/deserializer must round-trip `assets.displays`.

#### `engine/terminal/commands/projectCartridgeAdapter.ts`

**Responsibility**

Convert runtime cartridges back into module cartridges.

**Logic**

Remove `icons` and `resources` from the emitted asset root and emit `displays`.

**Interface**

The module cartridge projection must preserve authored display assets.

#### `engine/vfs/bootstrapHydration.ts`

**Responsibility**

Create an empty module cartridge when needed.

**Logic**

Seed `assets.displays` instead of `assets.icons` and `assets.resources`.

**Interface**

New empty cartridges must have `assets.displays = {}`.

#### `engine/test/factories.ts`

**Responsibility**

Create valid test cartridges.

**Logic**

Default `assets.displays` must replace icon/resource defaults.

**Interface**

All test helpers creating modules must produce the new asset shape.

#### `ui/devtools/project/newFileTemplates.ts`

**Responsibility**

Seed new editor files/templates.

**Logic**

Create `.art` files with `displays`, not `icons` or `resources`.

**Interface**

New `.art` templates must match the new schema exactly.

### 8.3 Extend styles for light and no-background

#### `data/schemas/assets/styles.ts`

**Responsibility**

Define authored entity style schema.

**Logic**

Add authored light configuration to the rich style schema.

Add `none` to the allowed family values.

Legacy transforms must continue to produce valid rich styles.

**Interface**

`EntityStyleSchema` must accept:

- the new optional `light` object
- `family = "none"`

#### `ui/devtools/editors/blueprint/visuals/BackgroundVisualSection.tsx`

**Responsibility**

Render the existing background editor controls.

**Logic**

Add `none` to the family selector.

When `family = none`, background-only fields must remain well-defined and not produce invalid draft state.

**Interface**

The family selector must expose the new option explicitly.

#### `engine/phaser/display/modules/backgroundModuleRuntime.ts`

**Responsibility**

Render the background layer of a display.

**Logic**

When the resolved style family is `none`, render no background and no border.

Glyph and light rendering remain unaffected.

**Interface**

`renderBackground(...)` must treat `family = none` as a valid non-error state.

#### `engine/phaser/display/modules/lightModuleState.ts`

**Responsibility**

Resolve light state for a display.

**Logic**

Extend the light resolution path so authored `style.light` is recognized as the primary explicit light source for regular displays.

Decor/state-driven light rules remain for the special cases that still exist.

**Interface**

`resolveLightState(...)` must be able to emit light from the resolved style alone.

#### `engine/phaser/display/modules/lightModuleBaseState.ts`

**Responsibility**

Resolve non-decor light behavior.

**Logic**

Remove all dependency on transfer render snapshots.

Preserve the remaining non-transfer light behavior that is still live.

**Interface**

There must be no reference to transfer render props or transfer helper functions after this change.

### 8.4 Make passport icon optional and display-key based

#### `data/schemas/abilities/passport.ts`

**Responsibility**

Define the authored passport ability schema.

**Logic**

Make `icon` optional.

Update its schema description to reflect display-key semantics rather than emoji/icon semantics.

**Interface**

`PassportAbilitySchema.icon` becomes optional string.

#### `engine/compiler/abilities/passportCompiler.ts`

**Responsibility**

Compile authored passport data into blueprint runtime-facing data.

**Logic**

Non-body blueprints:

- set `display.display_key = config.icon ?? draft.id`

Body blueprints:

- keep world `display.display_key = "body_avatar"`
- set `body.passport.portraitIcon = config.icon ?? draft.id`
- preserve `glyphKey` behavior for body portraits

Style and description behavior remain unchanged.

**Interface**

The compiler must no longer require `config.icon` to exist.

#### `ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx`

**Responsibility**

Render the passport editor UI.

**Logic**

Keep the display-key field, but its semantics become “optional display override”.

The existing picker path must browse/select display keys, not emoji assets.

The label/help text must reflect the new behavior:

- empty value means “use blueprint id”

**Interface**

The field remains in the form, but it is now optional and display-backed.

### 8.5 Replace icon registry semantics with display-backed resolution

#### `ui/lib/foundation/icon-registry/types.ts`

**Responsibility**

Define icon registry types.

**Logic**

Remove `emoji` from the supported icon type set.

Retain only the types still needed after the migration.

This design requires the React icon path to be display-image-based. `component` may remain only if still needed elsewhere in the UI; `emoji` must not remain.

**Interface**

`IconType` must no longer include `emoji`.

#### `ui/lib/foundation/icon-registry/useIcon.ts`

**Responsibility**

Resolve icons for React consumers.

**Logic**

Remove the emoji fallback.

Delegate to the new single display resolution path.

If a key does not resolve, the hook must return the authored `unknown` display-backed definition.

**Interface**

The hook must not synthesize emoji definitions.

#### `ui/lib/atoms/game-icon/GameIcon.tsx`

**Responsibility**

Render icon/display visuals in React.

**Logic**

Remove emoji rendering.

The component must render the image result of the resolved display/export path.

**Interface**

`GameIcon` props remain unchanged. Behavior changes only internally.

#### `ui/devtools/shell/AppIconRegistryProvider.tsx`

**Responsibility**

Provide the app-wide icon/display registry to the UI.

**Logic**

Stop aggregating:

- module icon assets
- `useRuntimeDisplayIcons()` special cases

Start aggregating display-backed definitions derived from:

- module/runtime `assets.displays`
- blueprint fallback resolution

**Interface**

The provider remains the app-wide entry point, but its data source is the new display resolver.

#### `ui/runtime/world/display-images/useRuntimeDisplayIcons.ts` **(delete)**

**Responsibility**

This file currently injects special-case runtime image icons for attribute pools.

**Logic**

Delete it entirely. Its behavior is superseded by the unified display resolver.

**Interface**

No replacement special-case hook is allowed.

#### `ui/lib/foundation/icon-registry/defaultIcons.body.ts` **(delete)**
#### `ui/lib/foundation/icon-registry/defaultIcons.cave.ts` **(delete)**
#### `ui/lib/foundation/icon-registry/defaultIcons.misc.ts` **(delete)**

**Responsibility**

These files currently define emoji-based defaults.

**Logic**

Delete them. Their semantics move into authored `assets.displays` content.

**Interface**

Any remaining references must be removed or migrated to authored display keys.

#### `ui/lib/foundation/icon-registry/useResolvedDisplayIcon.ts` **(new)**

**Responsibility**

Provide the shared UI-side display resolution helper used by `GameIcon` and any picker/editor UI that needs resolved display previews.

**Logic**

Implement the exact resolution order defined in section 5.2.

This helper must be the single React-side resolution point.

**Interface**

Accept a display key and expose the resolved display source plus the exported image URL/status needed for rendering.

### 8.6 Extend display-image export to support authored displays and blueprint fallback

#### `engine/phaser/display-export/DisplayImageExportTypes.ts`

**Responsibility**

Define export request types.

**Logic**

Remove the hard-coded static union limited to:

- `attr_body`
- `attr_mind`
- `attr_social`
- `body_avatar`

Replace it with request types that can represent:

- authored display asset by key
- blueprint fallback by blueprint id
- existing body-avatar export by entity id or body display key as needed

**Interface**

The request contract must be generic enough to serve the unified display resolver.

#### `engine/phaser/display-export/DisplayImageExportService.ts`

**Responsibility**

Export display renderings to image URLs.

**Logic**

Extend the service to support:

- authored `resource` display keys
- authored `attribute_pool` display keys
- blueprint fallback by blueprint id
- existing body-avatar export

The service must continue caching by deterministic cache keys.

It must fail loudly on unsupported or unresolved requests.

**Interface**

The service API remains the single image-export entry point.

### 8.7 Replace icon/resource asset editing with display asset editing

#### `ui/devtools/state/moduleStore.assets.types.ts`

**Responsibility**

Define editor-side asset category and asset shapes.

**Logic**

Replace categories:

- `icons`
- `resources`

with:

- `displays`

Define the editor-side display asset type that mirrors `data/schemas/assets/displays.ts`.

**Interface**

`AssetCategory` must include `displays` and drop the removed categories.

#### `ui/devtools/state/moduleStore.assets.normalize.ts`

**Responsibility**

Normalize session/module asset roots.

**Logic**

Ensure `assets.displays` exists.

Stop creating `assets.icons` and `assets.resources`.

**Interface**

All editor sessions must normalize to the new asset shape.

#### `ui/devtools/state/moduleStore.actions.assets.ts`

**Responsibility**

Persist asset edits from the editor.

**Logic**

Replace icon-only save/delete behavior with display-asset save/delete behavior.

**Interface**

Asset actions must support the `displays` category as the canonical visual asset category.

#### `ui/devtools/state/moduleStore.assets.icons.ts` **(replace or rename)**

**Responsibility**

This file currently saves/deletes icon assets and converts them into icon-registry entries.

**Logic**

Replace it with display-asset equivalents.

It must no longer convert emoji/image asset definitions.

**Interface**

Either rename the file to a display-specific name or replace its contents entirely. The resulting module-store helper must operate on `assets.displays`.

#### `ui/devtools/editors/assets/AssetEditor.tsx`

**Responsibility**

Render the asset editor.

**Logic**

Switch from the icon-asset form to a display-asset form.

Editor routing remains asset-based, but it now edits display definitions.

**Interface**

The editor must accept the new display asset shape.

#### `ui/devtools/editors/fields/icon-asset-editor/IconAssetEditorForm.tsx` **(replace or rename)**

**Responsibility**

This currently edits emoji/image icon assets.

**Logic**

Replace with a display-asset form that:

- selects `type: body | attribute_pool | resource`
- uses the existing style/glyph linking affordances where appropriate
- exposes tooltip/tags
- for `attribute_pool`, exposes attribute selection only
- for `body`, exposes no inner selector in phase 1
- for `resource`, exposes style and glyph selection

**Interface**

The edited asset shape must match `assets.displays`.

#### `ui/devtools/editors/assets/create-asset-modal/CreateAssetModal.tsx`
#### `ui/devtools/editors/assets/create-asset-modal/useCreateAssetModal.ts`
#### `ui/devtools/editors/assets/create-asset-modal/CreateAssetModal.constants.ts`

**Responsibility**

Create new visual assets in the editor.

**Logic**

Replace icon-type creation (`emoji | image`) with display-type creation (`body | attribute_pool | resource`).

Create sensible default placeholders for each display type.

**Interface**

Create flow must create a `displays` asset and open it in the asset editor.

#### `ui/devtools/editors/file/AssetPackEditor.tsx`

**Responsibility**

Render the asset pack dashboard.

**Logic**

Replace the “Icons” and “Resources” cards with a single “Displays” card.

Styles, Glyphs, Background, and Vein Network remain.

**Interface**

The dashboard must route into the `assets::displays` explorer path.

#### `ui/devtools/editors/fields/icon-picker/IconPicker.tsx`
#### `ui/devtools/editors/fields/icon-picker/useIconPicker.ts`

**Responsibility**

Provide the UI for selecting the string key used by `passport.icon` and similar fields.

**Logic**

Retain the picker UX, but source its search/browse data from unified display keys.

The create-asset CTA must create display assets, not emoji/image assets.

**Interface**

Picker output remains a string key. Source-of-truth changes to `assets.displays` plus blueprint fallback visibility.

### 8.8 Runtime display resolution and special display stacks

#### `engine/phaser/display/resolveDisplaySpec.ts`

**Responsibility**

Build `DisplaySpec` from entity/blueprint/runtime assets.

**Logic**

Augment resolution so authored `assets.displays` can contribute style/glyph data by display key.

Regular display asset resolution must not require a second display component shape.

Blueprint fallback must not override an entity’s explicit display component; it only applies when display-key lookup is needed for icon/display rendering by key.

**Interface**

The function must accept whatever additional asset map it needs to read `assets.displays`.

#### `engine/phaser/display/DisplayDefinitionCatalog.ts`

**Responsibility**

Define explicitly registered special display stacks.

**Logic**

Keep only the special definitions still required after the migration.

Required retained special definitions:

- `body_avatar`
- `cave_level` if its special rendering remains intentionally distinct
- `attr_body`
- `attr_mind`
- `attr_social`

Required removals:

- `transfer`
- `transfer_wood`
- `transfer_heat`
- `transfer_xp`
- `transfer_food`
- any transfer-only module stacks

Regular authored `resource` displays must render through the default placeholder stack using authored style/glyph/light.

**Interface**

The catalog must no longer define transfer-only display stacks.

#### `engine/phaser/scenes/GameSceneDisplayInit.ts`

**Responsibility**

Initialize the display registry and display system.

**Logic**

No new parallel display registry may be introduced.

This file should continue registering the catalog definitions and rely on the placeholder definition for ordinary authored display assets.

Only change it if required to pass the new authored display map into downstream resolution code.

**Interface**

Display system initialization remains centralized here.

### 8.9 Remove special transfer visual pipeline

#### `engine/runtime/handlers/transferRender.ts` **(delete)**
#### `engine/runtime/handlers/transferRenderTypes.ts` **(delete)**

**Responsibility**

These files currently derive transfer-only visual props from `assets.resources`.

**Logic**

Delete them entirely.

**Interface**

No transfer-specific render-prop object remains.

#### `engine/runtime/handlers/transferPendingBuilder.ts`

**Responsibility**

Build pending transfer entities.

**Logic**

Set `display.display_key` to the first payload key when present, else `unknown`.

Remove the `render` snapshot used only for transfer visual rendering.

Preserve non-visual transfer behavior.

**Interface**

Pending transfer entities remain valid runtime entities, but they carry only normal display data.

#### `engine/phaser/display/modules/TransferModule.ts` **(delete)**
#### `engine/phaser/display/modules/TransferGlyphModule.ts` **(delete)**
#### `engine/phaser/display/modules/TransferParticlesModule.ts` **(delete)**
#### `engine/phaser/display/modules/transferDisplayHelpers.ts` **(delete)**

**Responsibility**

These files currently implement the transfer-only display subsystem.

**Logic**

Delete them. Transfer visuals become ordinary display rendering.

**Interface**

No remaining display module may depend on transfer render snapshots.

### 8.10 Draft preview derivation

#### `ui/runtime/draft/resolveDraftOptionPreviewIds.ts` **(new)**

**Responsibility**

Derive display preview keys for a draft option.

**Logic**

Inspect the draft option payload.

Rules:

- collect every `blueprintId` from `SPAWN`
- collect every `blueprintId` from `SPAWN_BODY`
- preserve payload order
- de-duplicate only if the same blueprint id appears multiple times consecutively and the intended UI should not show repeated identical icons; if exact repetition is intended by design, keep exact repetition
- if one or more spawn preview ids exist, return them
- otherwise return the authored `icon` key as the single fallback preview id

**Interface**

Input: one `DraftOptionBlueprint`

Output: ordered array of display keys to render

This helper must contain the logic; the view stays dumb.

#### `ui/runtime/draft/DraftCard.tsx`

**Responsibility**

Render a draft option card.

**Logic**

Render one or more `GameIcon` instances in a row using the derived preview ids.

Do not derive preview logic in the component body.

**Interface**

The card UI must support multiple preview icons without changing the authored schema.

### 8.11 Module explorer and asset-routing updates

#### `ui/devtools/editors/fields/module-explorer/*` **(all files that assume `icons` or `resources`)**

**Responsibility**

Render module asset exploration lists and routes.

**Logic**

Replace asset-category assumptions so the explorer supports `displays` and no longer exposes `icons` and `resources` as separate categories.

This includes:

- category labels
- list/filter sources
- create/delete flows
- route construction

**Interface**

Explorer routes must expose `assets::displays` as the single visual-asset namespace.

### 8.12 Example/module data migration

#### `data/raw/example/modules/assets.art`

**Responsibility**

Repository example module data.

**Logic**

Rewrite from `icons` + `resources` to `displays`.

Remove all emoji definitions.

Remove all particle definitions.

Use canonical resource keys (`wood`, `food`, `heat`, `fire`, `edibles`, etc.) where the same display must be used by transfers and UI.

Add explicit authored entries for `unknown` and `loading`.

**Interface**

The example `.art` file must validate against the new schema.

#### `data/raw/example/modules/*.bp` and `data/raw/example/modules/*.draft` **(all files using migrated keys)**

**Responsibility**

Repository example gameplay content.

**Logic**

Migrate old icon keys to new canonical display keys where needed.

Examples already verified in this repo include resource-prefixed icon ids used in passports and draft options.

**Interface**

Example content must validate and resolve through the unified display pipeline.

### 8.13 Optional cleanups to key enums and schema annotations

#### `ui/lib/foundation/icon-registry/IconKey.ts`

**Responsibility**

Provide shared string constants for common icon/display ids.

**Logic**

Remove legacy aliases that are no longer canonical, especially the `body_attr_*` and `resource_*` alias forms if the rest of the repo has been migrated to canonical display keys.

Keep only ids that remain part of the new unified display vocabulary.

**Interface**

The enum remains a convenience layer, not a second source of truth.

#### `data/schemas/components/display.ts`

**Responsibility**

Define the display component schema.

**Logic**

Update the field annotation on `display_key` so editor tooling reflects display-key semantics rather than old icon semantics.

**Interface**

The field remains a string display key.

---

## 9. Files to delete as detritus cleanup

These files are in scope for deletion because their responsibilities are superseded by the new design:

- `data/schemas/assets/icons.ts`
- `data/schemas/assets/resources.ts`
- `data/schemas/assets/resourceTransferVisual.ts`
- `ui/runtime/world/display-images/useRuntimeDisplayIcons.ts`
- `ui/lib/foundation/icon-registry/defaultIcons.body.ts`
- `ui/lib/foundation/icon-registry/defaultIcons.cave.ts`
- `ui/lib/foundation/icon-registry/defaultIcons.misc.ts`
- `engine/runtime/handlers/transferRender.ts`
- `engine/runtime/handlers/transferRenderTypes.ts`
- `engine/phaser/display/modules/TransferModule.ts`
- `engine/phaser/display/modules/TransferGlyphModule.ts`
- `engine/phaser/display/modules/TransferParticlesModule.ts`
- `engine/phaser/display/modules/transferDisplayHelpers.ts`

If a deleted file has tests, those tests must either be deleted or rewritten against the new replacement behavior.

---

## 10. Tests

The implementation must follow the repository testing contract.

### 10.1 Unit tests

Add or update unit tests for:

- `data/schemas/assets/displays.ts`
  - valid/invalid display assets by type
- `data/schemas/assets/styles.ts`
  - `family = none`
  - light parsing
  - legacy style migration compatibility
- `engine/compiler/abilities/passportCompiler.ts`
  - non-body fallback to blueprint id when `icon` is absent
  - body `portraitIcon` fallback to blueprint id
- shared display-resolution helper
  - explicit display asset
  - blueprint fallback
  - unknown fallback
- `ui/runtime/draft/resolveDraftOptionPreviewIds.ts`
  - multiple spawn actions
  - fallback to authored icon when no spawns exist

### 10.2 Integration tests

Add or update integration tests for:

- `.art` parsing/serialization with `assets.displays`
- empty cartridge/template/bootstrap flows using `displays`
- `resolveDisplaySpec(...)` consuming authored display assets
- transfer pending entity creation using regular display keys and no transfer render snapshot
- display export service rendering:
  - authored display asset by key
  - blueprint fallback by key
  - body-avatar path still working
- display catalog no longer registering transfer-only keys

### 10.3 View tests

Add or update view tests for:

- `GameIcon`
  - renders exported display image
  - no emoji rendering path remains
- `AssetPackEditor`
  - shows Displays card instead of Icons/Resources split
- display asset editor/create flow
- `IconPicker`
  - displays unified display keys and create-display CTA
- `DraftCard`
  - renders multiple preview icons in a row for multiple spawn actions

### 10.4 Regression deletions

Delete or rewrite tests that explicitly assert old behavior, including:

- emoji fallback/default icon behavior
- `useRuntimeDisplayIcons()` special cases
- transfer render snapshot / pretty-transfer behavior
- transfer particle behavior
- `assets.icons` / `assets.resources` schema assumptions

---

## 11. Rollout order

The implementation should be done in this order to keep the repo coherent:

1. Add `assets.displays` schema and replace cartridge/linker/template wiring.
2. Extend styles with light + `none` background family.
3. Update passport schema/compiler semantics.
4. Introduce the unified display-resolution helper and extend display-image export.
5. Convert `GameIcon` and app icon provider to the new path.
6. Remove `useRuntimeDisplayIcons` and emoji defaults.
7. Replace asset-editor/create-picker flows with display-aware versions.
8. Remove transfer special pipeline and point transfers at ordinary display keys.
9. Update Draft preview derivation.
10. Migrate example content and delete detritus.
11. Update all impacted tests.

---

## 12. Acceptance criteria

The implementation is complete only when all of the following are true:

1. `.art` uses `assets.displays` and no longer uses `assets.icons` or `assets.resources`.
2. `passport.icon` is optional and behaves exactly as the display-key override defined above.
3. `GameIcon`, rich text, transfer nodes, and Draft previews all resolve through the same display-key mechanism.
4. No emoji-based icon rendering remains in code or example authored assets.
5. Transfer particles and the transfer-only visual subsystem are removed.
6. The style editor supports light, and background family supports `none`.
7. The same display key can be used both as an icon and as a transfer/world display.
8. Blueprint fallback works when no explicit display asset exists for the key.
9. The repository example content validates and renders through the new path.
10. All updated tests pass.

