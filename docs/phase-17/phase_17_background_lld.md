# LLD — Biological Fog Background for `.art` with Devtools Editor

## 1. Why

The current scene already has strong foreground life: veins pulse, packets move, nodes animate. What is missing is a quiet substrate layer behind the world. The goal is to add a **scene-level patterned background** that reinforces the “living organism interior” aesthetic without affecting simulation, entity rendering, or editor/runtime architecture.

This change must preserve the existing project laws:

- runtime remains deterministic and phase-based
- no simulation mutation happens from UI or presentation
- React editors remain render/wiring only
- implementation stays within the existing route/editor/session mechanisms, without speculative refactors

## 2. Grounded observations from the current code

These are direct consequences of the files currently in the repo.

1. `.art` files are parsed strictly by `SemanticArtSchema`, which currently accepts:
    - `icons`
    - `glyphs`
    - `resources`
    - `styles`
    - `settings.vein_network`

    Therefore `settings.background` must be explicitly added or the linker will reject it.

2. The asset pack dashboard is file-level, not category-level:
    - `AssetPackEditor.tsx` already opens file-level cards for `Icons`, `Resources`, `Styles`, `Glyphs`, and `Vein Network`.
    - `Vein Network` is routed as a dedicated config tab (`vein_config`), not as an asset category.

    Therefore the new background entry must be a **new file-level config route**, not a new `AssetCategory`.

3. Raw JSON config editing already exists in the exact shape needed:
    - `VeinConfigEditor.tsx` is just `ToolFrame + SessionJsonEditor`
    - it edits `assets.settings.vein_network`

    Therefore the background editor must mirror that mechanism and edit `assets.settings.background`.

4. `.art` round-trip is not only linker-facing. It also goes through:
    - `src/lib/modules/semanticModuleFragments.ts`
    - `src/lib/modules/fragmentSerializers.ts`

    Therefore adding background only to the schema is insufficient; without updating these files the new config will be dropped on read/save.

5. The visual effect belongs to the **scene**, not to entity display instances:
    - `GameScene.create.ts` composes `TextureManager`, `VeinsSystem`, and `GameDisplaySystem`
    - `GameScene.ts` updates `VeinsSystem` and then ticks the display manager
    - `LayerRegistry` already defines world layers, with `Veins` at depth `0` and `Background` at depth `5`

    Therefore the fog background should be a **scene-owned visual object** created during `GameScene` initialization and updated each frame after `VeinsSystem.update(runtime)`.

## 3. Scope

This task includes exactly:

- a new `.art` background config at `assets.settings.background`
- a new asset-pack dashboard button for Background
- a raw JSON editor tab for that config
- runtime rendering of a full-screen biological fog shader background
- config/schema/round-trip support for that background
- tests that lock the contract

## 4. Non-goals

This task does **not** include:

- reaction–diffusion backgrounds
- multiple background modes
- biome/background switching
- moving background logic into React
- adding `background` as an `AssetCategory`
- refactoring the existing `RuntimeCartridge.assets` typing debt
- refactoring existing glyph serialization behavior
- adding debug HUD entries for background state

Those are all out of scope under the prompt contract.

---

# 5. Functional contract

## 5.1 Authoring contract

The authored location is:

- `assets.settings.background`

The background config is edited as raw JSON in a dedicated file-level tab.

The dashboard entry is:

- title: `Background`
- description: `Fullscreen biological fog background.`

The route string is:

- `background_config::<filename>`

## 5.2 Runtime contract

At runtime:

- if `assets.settings.background.enabled !== true`, no fog is shown
- if enabled, exactly one full-screen shader background is shown
- it renders **behind veins and entities**
- it is sampled in **world space**, so camera pan/zoom reveals stable substrate rather than screen-space drift
- it is modulated by the **current supply heartbeat pulse**
- it never mutates runtime state
- invalid authored config fails loudly via schema parsing; no silent fallback beyond declared defaults

This matches the project’s “UI observes, never cheats” and “systems/read phases do not mutate directly” rules.

---

# 6. Data contract

## 6.1 New schema

Add a new schema file for background config.

### Authored path

- `assets.settings.background`

### Shape

- `enabled: boolean`
- `base_color: string`
- `lift_color: string`
- `intensity: finite number >= 0`
- `large_scale: finite number > 0`
- `small_scale: finite number > 0`
- `large_drift_per_ms: { x: finite number, y: finite number }`
- `small_drift_per_ms: { x: finite number, y: finite number }`
- `threshold_low: number in [0, 1]`
- `threshold_high: number in [0, 1]`
- `heartbeat_amplitude: finite number >= 0`

### Validation rules

- `large_scale > 0`
- `small_scale > 0`
- `threshold_low < threshold_high`
- all numeric fields must be finite
- color fields remain plain strings, matching the existing asset schema convention; no new hex-format validator is introduced in this task

### Defaults

- `enabled: false`
- `base_color: "#08060a"`
- `lift_color: "#130d18"`
- `intensity: 0.24`
- `large_scale: 0.0028`
- `small_scale: 0.0065`
- `large_drift_per_ms: { x: 0.000025, y: -0.000010 }`
- `small_drift_per_ms: { x: -0.000013, y: 0.000018 }`
- `threshold_low: 0.30`
- `threshold_high: 0.72`
- `heartbeat_amplitude: 0.025`

## 6.2 Default behavior

The default config is **disabled**. This is deliberate.

Reason:

- it gives the editor a complete JSON subtree immediately
- it avoids changing visuals for existing modules unless the user opts in
- it allows runtime parse helpers to return a valid config even when the authored key is absent

---

# 7. Rendering contract

## 7.1 Effect type

The background is a **single full-screen Phaser shader object** owned by the scene.

It is not:

- an entity module
- a display instance
- a React component
- a texture generated on CPU

## 7.2 Depth contract

The shader object depth must be:

- `LAYER_DEPTHS[LayerId.Veins] - 1`

Reason:

- it must sit behind all world content
- this avoids adding a new layer and reuses the existing layer depth constants

No new `LayerId` is added.

## 7.3 Camera contract

The shader object itself is screen-fixed (`scrollFactor = 0`), but the shader samples **world coordinates** using:

- viewport resolution
- main camera `scrollX`
- main camera `scrollY`
- main camera `zoom`

This gives a background that is visually anchored to the world rather than to the monitor.

## 7.4 Heartbeat contract

Heartbeat input must be computed from the existing pulse engine:

- source: `veinsSystem.getPulseEngine().getSupplyPulse(runtime.getAccumulatedTime())`

No new heartbeat API is introduced.

This is important because `PulseEngine` already exposes a global supply pulse, and the background should track the global organism rhythm rather than per-entity demand pulses.

## 7.5 Shader algorithm contract

The fragment logic is:

1. Convert fragment position from screen space to world space using:
    - `resolution`
    - `camera scroll`
    - `camera zoom`

2. Sample two drifting simplex/fbm layers:
    - one large-scale field
    - one small-scale field

3. Combine them using a fixed mix:
    - `0.60 * large + 0.40 * small`

4. Normalize to `0..1`

5. Apply a smooth threshold window:
    - `threshold_low`
    - `threshold_high`

6. Apply heartbeat modulation:
    - multiplier = `1 + heartbeat_amplitude * heartbeat01`

7. Output color:
    - `base_color + lift_color * intensity * fog01 * heartbeat_multiplier`

No other color grading, vignette, or cellular overlay is part of this task.

---

# 8. Integration flow

## 8.1 Editor flow

1. User opens `.art` file
2. `AssetPackEditor` shows `Background` card
3. Clicking the card opens `background_config::<filename>`
4. Window manager resolves that to `BackgroundConfigEditor`
5. `BackgroundConfigEditor` renders `SessionJsonEditor`
6. `SessionJsonEditor` reads/writes `assets.settings.background`

## 8.2 Runtime flow

1. Game scene is created
2. A scene-owned `BiologicalFogBackground` object is created
3. Each frame:
    - `VeinsSystem.update(runtime)` runs first
    - current pulse is read from the pulse engine
    - `BiologicalFogBackground.update(runtime, pulse01)` runs
    - entity display manager ticks after that

This update order is required so the background sees the same current heartbeat preset that veins just resolved.

---

# 9. File-by-file design

Every file below is either new or changed. Unlisted files remain untouched.

## 9.1 Schema and data round-trip

### `src/data/schemas/assets/background.ts` — new

**Responsibility**

- authoritative schema, defaults, and type for biological fog background config

**Logic**

- define `DEFAULT_BACKGROUND_CONFIG`
- define `BackgroundConfigSchema`
- enforce all numeric bounds and the `threshold_low < threshold_high` invariant

**Interface**

- exports:
    - `DEFAULT_BACKGROUND_CONFIG`
    - `BackgroundConfigSchema`
    - `BackgroundConfig`

### `src/data/schemas/assets.ts` — changed

**Responsibility**

- central asset schema export surface

**Logic**

- re-export background schema/types

**Interface**

- must export the new background members so the rest of the codebase uses the standard import path

### `src/data/schemas/assets/collection.ts` — changed

**Responsibility**

- editor/module-side schema for `assets`

**Logic**

- extend `AssetSettingsSchema` with:
    - `background: BackgroundConfigSchema.default(DEFAULT_BACKGROUND_CONFIG)`

- keep current catchall behavior unchanged
- keep `vein_network` behavior unchanged

**Interface**

- `AssetCollectionSchema` must parse modules that contain `assets.settings.background`
- parsed module assets must always expose a complete defaulted `background` object

### `src/engine/linker/semanticArtSchema.ts` — changed

**Responsibility**

- strict semantic `.art` linker schema

**Logic**

- extend `settings` object to accept optional `background`

**Interface**

- `.art` semantic fragments containing `settings.background` must parse successfully
- missing `background` remains allowed

### `src/lib/modules/semanticModuleFragments.ts` — changed

**Responsibility**

- convert raw semantic `.art` fragments into `ModuleCartridge`

**Logic**

- when reading `.art`, copy `settings.background` into `assets.settings.background`
- default it with `BackgroundConfigSchema.parse(settings.background ?? {})`
- keep current handling for icons/resources/styles/vein_network unchanged

**Interface**

- `toAssetModule(filename, raw)` must preserve background config in the module model

### `src/lib/modules/fragmentSerializers.ts` — changed

**Responsibility**

- serialize `ModuleCartridge` back into semantic `.art` fragment shape

**Logic**

- include `settings.background`
- value must come from `m.assets.settings.background`
- if absent, write `DEFAULT_BACKGROUND_CONFIG`

**Interface**

- `serializeAssetFragment(m)` must round-trip background config losslessly

### `src/ui/devtools/project/newFileTemplates.ts` — changed

**Responsibility**

- authored template content for new semantic files

**Logic**

- add `background: DEFAULT_BACKGROUND_CONFIG` under `.art -> settings`

**Interface**

- a newly created `.art` file already contains a complete editable background subtree

### `src/ui/devtools/state/moduleStore.assets.normalize.ts` — changed

**Responsibility**

- editor-side normalization of module assets

**Logic**

- add `background` to the normalized `assets.settings`
- update the early-return guard so it only returns the original object when `background` is already present

**Interface**

- editor sessions loaded from legacy `.art` files expose `assets.settings.background`
- the default object is editor-visible even for old modules

---

## 9.2 Devtools route and editor

### `src/ui/devtools/editors/config/BackgroundConfigEditor.tsx` — new

**Responsibility**

- raw JSON editor for background config

**Logic**

- exact mirror of `VeinConfigEditor`
- render:
    - `ToolFrame` title = `Background Config`
    - `SessionJsonEditor`
    - `rootPath = "assets.settings.background"`

**Interface**

- props:
    - `filename: string`

No business logic is added to the component, consistent with the UI architecture rules.

### `src/ui/devtools/editors/file/AssetPackEditor.tsx` — changed

**Responsibility**

- file-level dashboard for `.art`

**Logic**

- add one new card
- label: `Background`
- description: `Fullscreen biological fog background.`
- click action: `openFile("background_config::<filename>")`

**Interface**

- no prop changes

### `src/ui/devtools/shell/window-manager/virtualPath.types.ts` — changed

**Responsibility**

- virtual-path type contract

**Logic**

- add:
    - `{ kind: "background_config"; filename: string }`

**Interface**

- background config becomes a first-class virtual path kind

### `src/ui/devtools/shell/window-manager/virtualPath.constants.ts` — changed

**Responsibility**

- allowed routed path prefixes

**Logic**

- add `"background_config"` to `ROUTE_PREFIXES`

**Interface**

- `parseVirtualPath` recognizes the new prefix

### `src/ui/devtools/shell/window-manager/virtualPath.parseRouted.ts` — changed

**Responsibility**

- parse routed virtual paths

**Logic**

- add `background_config` branch
- return `{ kind: "background_config", filename }`

**Interface**

- `background_config::<filename>` parses to the new virtual path kind

### `src/ui/devtools/shell/window-manager/virtualPath.serialize.ts` — changed

**Responsibility**

- serialize virtual paths

**Logic**

- add serialization for `background_config`

**Interface**

- serializes to:
    - `background_config::<filename>`

### `src/ui/devtools/shell/window-manager/tabIds.ts` — changed

**Responsibility**

- window/tab identity contract

**Logic**

- add new `TabIdParams` variant:
    - `{ kind: "background_config"; filename: string }`

- generate tab id:
    - `background_config:<encoded filename>`

**Interface**

- tab id round-trip works for the new editor

### `src/ui/devtools/shell/window-manager/tabIdToVirtualPath.ts` — changed

**Responsibility**

- reconstruct virtual path from tab id

**Logic**

- map `background_config:<encoded>` to `background_config::<filename>`

**Interface**

- persisted layout restores the background editor correctly

### `src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.base.ts` — changed

**Responsibility**

- open the correct tab for routed config paths

**Logic**

- add handler for `background_config`
- tab name: `Background Config`
- component: `background_config`

**Interface**

- calling `openFile("background_config::<filename>")` opens the correct tab

### `src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx` — changed

**Responsibility**

- resolve config component string to editor element

**Logic**

- add case:
    - `"background_config" -> <BackgroundConfigEditor filename={filename} />`

**Interface**

- component resolution for the new route

## Important unchanged files

These files must remain unchanged:

- `src/ui/devtools/state/moduleStore.assets.types.ts`
- `src/ui/devtools/editors/config/AssetCategoryEditor.tsx`
- `src/ui/devtools/editors/fields/module-explorer/AssetListPanel.tsx`

Reason:

- background is **not** an asset category
- it is a file-level settings editor like `vein_config`

---

## 9.3 Runtime background system

### `src/engine/phaser/background/backgroundRuntimeHelpers.ts` — new

**Responsibility**

- scene/runtime-side helpers for reading background config from runtime assets

**Logic**

- follow the same pattern as `veinsRuntimeHelpers.ts`
- define:
    - `readRawBackgroundConfig(assets: unknown): BackgroundConfig | undefined`
    - `parseBackgroundConfig(assets: unknown): BackgroundConfig`

**Interface**

- input: `unknown` assets object
- output: parsed/defaulted `BackgroundConfig`

### `src/engine/phaser/background/resolveBiologicalFogUniforms.ts` — new

**Responsibility**

- pure mapping from config + scene state to shader uniform state

**Logic**

- input:
    - `config`
    - `timeMs`
    - `pulse01`
    - `cameraScrollX`
    - `cameraScrollY`
    - `cameraZoom`
    - `viewportWidth`
    - `viewportHeight`

- output:
    - a plain object containing all shader uniform values

- include local hex-to-rgb normalization here
- no Phaser objects in this file

**Interface**

- one pure exported function returning a serializable uniform payload

This file exists specifically so the numeric logic is unit-testable and the Phaser wrapper stays thin, which matches the testing standards.

### `src/engine/phaser/background/BiologicalFogBackground.ts` — new

**Responsibility**

- own the scene-level shader object and apply uniform updates

**Logic**

- constructor takes the scene
- internally manages:
    - the single shader game object
    - current parsed config
    - last seen raw config reference
    - resize subscription

- `update(runtime, pulse01)`:
    1. read and parse background config from `runtime.getCartridge().assets`
    2. if disabled:
        - hide shader if it exists
        - return

    3. lazily create shader if missing
    4. compute uniform state with `resolveBiologicalFogUniforms`
    5. push uniforms to the shader
    6. ensure visible

- `destroy()`:
    - unregister resize listener
    - destroy shader object if present

**Interface**

- methods:
    - `update(runtime: Runtime, pulse01: number): void`
    - `destroy(): void`

**Shader ownership contract**

- exactly one shader object per `GameScene`
- depth is `LAYER_DEPTHS[LayerId.Veins] - 1`
- `scrollFactor = 0`
- resize handler updates viewport-dependent uniforms and object size

### `src/engine/phaser/scenes/GameScene.create.ts` — changed

**Responsibility**

- compose scene-owned subsystems

**Logic**

- create `BiologicalFogBackground`
- return it alongside `textureManager`, `veinsSystem`, `displaySystem`

**Interface**

- initialize result gains one new field:
    - `backgroundSystem`

### `src/engine/phaser/scenes/GameScene.ts` — changed

**Responsibility**

- lifecycle orchestration

**Logic**

- add field:
    - `private backgroundSystem?: BiologicalFogBackground`

- in `create()`:
    - receive and store `backgroundSystem`

- in `update()`:
    1. attach runtime if needed
    2. update camera
    3. if no runtime, return
    4. `veinsSystem.update(runtime)`
    5. `pulse01 = veinsSystem.getPulseEngine().getSupplyPulse(runtime.getAccumulatedTime())`
    6. `backgroundSystem.update(runtime, pulse01)`
    7. tick display manager

- in shutdown callback:
    - `backgroundSystem.destroy()`

**Interface**

- no public API changes outside scene internals

---

# 10. Pseudocode

## 10.1 Editor route

```text
AssetPackEditor
  on Background click
    -> openFile("background_config::<filename>")

route parser
  "background_config::<filename>"
    -> { kind: "background_config", filename }

route handler
  kind "background_config"
    -> open tab id "background_config:<filename>"
    -> component "background_config"

config editor resolver
  component "background_config"
    -> BackgroundConfigEditor
```

## 10.2 Runtime frame

```text
GameScene.update
  if no runtime -> return

  veinsSystem.update(runtime)

  pulse01 =
    veinsSystem.getPulseEngine().getSupplyPulse(runtime.getAccumulatedTime())

  backgroundSystem.update(runtime, pulse01)

  displayManager.tick(...)
```

## 10.3 Background system update

```text
read raw background config from runtime.getCartridge().assets
parse with BackgroundConfigSchema using defaults

if config.enabled is false
  hide shader if created
  return

if shader not created
  create one full-screen shader object
  set depth behind veins
  set scrollFactor 0
  subscribe to scene resize

uniforms =
  resolveBiologicalFogUniforms(
    config,
    timeMs,
    pulse01,
    camera scroll,
    camera zoom,
    viewport size
  )

apply uniforms to shader
show shader
```

---

# 11. Test plan

This test plan follows the project testing standard:

- pure logic in unit tests
- UI editors/routes in view tests
- no implementation-detail assertions when behavior can be asserted directly
- Given/When/Then structure and colocated tests.

## 11.1 Unit tests

### `src/data/schemas/assets/background.test.ts` — new

**Given**

- empty config
- invalid numeric fields
- invalid threshold ordering

**When**

- parse with `BackgroundConfigSchema`

**Then**

- empty config yields exact declared defaults
- invalid scales/intensity/heartbeat values are rejected
- `threshold_low >= threshold_high` is rejected

### `src/engine/phaser/background/backgroundRuntimeHelpers.test.ts` — new

**Given**

- assets with `settings.background`
- assets without `settings.background`

**When**

- call `readRawBackgroundConfig`
- call `parseBackgroundConfig`

**Then**

- raw reader returns the authored subtree or `undefined`
- parser returns the authored config with defaults
- missing config yields the default disabled config

### `src/engine/phaser/background/resolveBiologicalFogUniforms.test.ts` — new

**Given**

- one enabled config
- known camera values
- known viewport values
- known time and pulse

**When**

- resolve uniforms

**Then**

- output contains exact numeric mappings for:
    - resolution
    - scroll
    - zoom
    - thresholds
    - scales
    - drifts
    - intensity
    - heartbeat amplitude

- color normalization is deterministic
- no Phaser objects appear in the result

### `src/engine/phaser/background/BiologicalFogBackground.test.ts` — new

**Given**

- a fake scene with:
    - add/existing shader boundary
    - cameras.main
    - scale resize emitter

- disabled and enabled configs

**When**

- call `update(runtime, pulse01)`

**Then**

- disabled config does not create visible fog
- enabled config creates exactly one shader object
- uniform application uses current camera/viewport state
- resize updates size/uniform resolution
- `destroy()` unsubscribes and destroys the shader

Mocking the Phaser scene boundary is allowed here because Phaser is an external boundary.

## 11.2 Linker and module round-trip tests

### `src/engine/linker/semanticParser.art.test.ts` — changed

Add one case:

**Given**

- `.art` fragment containing `settings.background`

**When**

- parse semantic fragment

**Then**

- result kind is `art`
- parsing succeeds

### `src/lib/modules/semanticModuleFragments.test.ts` — new

This file must cover both read and write round-trip.

**Given**

- raw `.art` fragment with partial `settings.background`

**When**

- `toAssetModule(...)`

**Then**

- module contains `assets.settings.background`
- defaults are filled

**Given**

- module with `assets.settings.background`

**When**

- `serializeAssetFragment(...)`

**Then**

- serialized output includes `settings.background` unchanged

## 11.3 View/editor tests

### `src/ui/devtools/editors/config/BackgroundConfigEditor.test.tsx` — new

Mirror `VeinConfigEditor.test.tsx`.

**Given**

- session draft with `assets.settings.background`
- distractor config at `config.settings.background`

**When**

- render editor

**Then**

- textbox shows the `assets.settings.background` subtree only

### `src/ui/devtools/editors/file/AssetPackEditor.test.tsx` — changed

Add one test:

**Given**

- asset pack editor for `modules/assets.art`

**When**

- click `Background`

**Then**

- `openFile("background_config::modules/assets.art")` is called

## 11.4 Window-manager tests

### `src/ui/devtools/shell/window-manager/virtualPath.test.ts` — changed

Add:

- round-trip for `background_config`

### `src/ui/devtools/shell/window-manager/tabIdToVirtualPath.test.ts` — changed

Add:

- `background_config:<encoded>` maps to `background_config::<filename>`

### `src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.test.tsx` — changed

Add:

- resolver returns `BackgroundConfigEditor` for component `background_config`

No new asset-list tests are needed because background is not an asset list category.

---

# 12. Exact acceptance criteria

Implementation is complete only when all of the following are true:

1. `.art` accepts `settings.background`
2. `assets.settings.background` is preserved on read/save round-trip
3. `AssetPackEditor` shows a `Background` file-level card
4. clicking that card opens a dedicated `Background Config` tab
5. that tab edits `assets.settings.background` via raw JSON
6. old modules without background still load
7. old modules do not show fog unless background is enabled
8. enabled background renders as a scene-level full-screen shader behind all world visuals
9. camera movement reveals a stable world-anchored pattern
10. heartbeat modulation uses the existing supply pulse
11. no simulation state is mutated by the background system
12. tests listed above are green
