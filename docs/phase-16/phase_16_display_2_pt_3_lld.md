# phase_16_display_2_pt_3 — Display — Unique Glyphs per `display_key` (LLD)

**Status:** Ready for implementation  
**Scope:** `src/engine/phaser/**` only (display-side). No simulation/ECS mutation.

---

## 1. Why

### 1.1 Problem

`display_key` is the renderer’s stable semantic identifier. Today, displays fall back to a limited placeholder variant set, and that set can exhaust and reuse shapes. This makes it hard to visually distinguish types at a glance and violates the “no silent failures” rule when capacity is exceeded.

### 1.2 Goals

1. Every distinct `display_key` has a **stable, deterministic, unique** glyph within a seed epoch.
2. All displays sharing the same `display_key` share the same glyph.
3. No two different `display_key`s share the same glyph.
4. Glyphs are built from a required set of basic procedural textures and rendered as a 3×3 composite.
5. Provide a **preset loading path** so some/all `display_key`s can use pre-made glyph definitions supplied by content.

### 1.3 Architectural alignment

- **UI observes, never cheats:** glyph assignment is presentation-only; it must not mutate runtime state. fileciteturn5file0L22-L24
- **Determinism:** same seed + same command sequence ⇒ same results; glyph identity must be stable within a seed epoch. fileciteturn5file0L37-L39
- **Errors must log loudly; silent failures forbidden:** capacity exhaustion must throw. fileciteturn5file0L54-L56
- **Prompt contract:** no unrelated refactors; explicit error handling; tests green. fileciteturn5file3L19-L39 fileciteturn5file3L42-L49

---

## 2. What

### 2.1 Functional requirements (hard)

For each distinct `display_key`:

1. **Assignment**
    - First time the key is encountered in an epoch, generate/resolve a glyph config and cache it.
    - Same key ⇒ same glyph config.
    - Different keys ⇒ configs must be globally unique (**deep-equality**, excluding debug-only fields).

2. **Basic shape textures (must exist)**
    - `line`, `chevron`, `crescent`, `triangle`, `star5`, `star6`, `circle`, `pixel`,
      `ring`, `hex_ring`, `oct_ring`, `square_ring`.

3. **Glyph space**
    - Exactly **9 positions** arranged as a fixed 3×3 grid.
    - Each placement defines: `shape`, `position`, `rotationDeg`, `scale`, `colorHex`.

4. **Shape normalization and scale meaning**
    - Shapes are normalized to a **single cell** (1 of 9), i.e. **1/3 of glyph width and height**.
    - Visual pixel size is determined by the display radius.
    - `placement.scale = 1.0` fills a cell (with fixed padding).
    - `placement.scale = 0.5` fills half the cell.

5. **Distance semantics**
    - `distanceBetweenPositionsPx` is the **distance from glyph center** (position 4) to a position center.
    - Positions are placed at `(-d, 0, +d)` on each axis, where `d = distanceBetweenPositionsPx`.

6. **Pulse semantics**
    - Config contains min/max ranges.
    - Pulse never alters min/max; it selects a value **between min and max** based on pulse value `p∈[0,1]`.
    - Delay is per-position.

7. **Palette (exact)**
    - `BLACK = #000000`
    - `BLOOD = #660000`
    - `DARK_GREEN = #006400`
    - `DEEP_BLUE = #00008B`

8. **Preset glyph definitions**
    - System must support loading pre-made glyph definitions keyed by `display_key`.
    - Preset keys must use their preset glyph (procedural must not override them).
    - Presets must be validated and must not violate uniqueness.

### 2.2 Non-goals (hard)

- No ECS/runtime mutation.
- No changes to command pipeline.
- No UI `.tsx` logic changes.

---

## 3. Definitions and invariants (no ambiguity)

### 3.1 9-position mapping (G1)

Positions are fixed in row-major order:

| Position | (gx, gy) |
| -------: | :------: |
|        0 | (-1, -1) |
|        1 | ( 0, -1) |
|        2 | ( 1, -1) |
|        3 | (-1, 0)  |
|        4 | ( 0, 0)  |
|        5 | ( 1, 0)  |
|        6 | (-1, 1)  |
|        7 | ( 0, 1)  |
|        8 | ( 1, 1)  |

### 3.2 Glyph bounds and cell size (G2)

Let `d = distanceBetweenPositionsPx` (distance from glyph center to a neighbor cell center).  
Then:

- Centers are at `x = gx * d`, `y = gy * d`.
- Glyph bounds in each axis are `[-1.5d, +1.5d]`.
- A single cell’s width/height is exactly `d` (one-third of the glyph’s width/height).

### 3.3 Uniqueness and canonicalization (G3)

- `GlyphConfig.id` is debug-only and **excluded** from uniqueness comparison.
- Two glyphs are “the same” iff their canonical forms are deeply equal:
    - same pulse config values (including delays),
    - same placements after canonical sorting.

Canonical placement sorting:

1. `position` asc
2. `shape` lexicographic
3. `rotationDeg` asc
4. `scale` asc
5. `colorHex` lexicographic

### 3.4 Seed epoch (G4)

Glyph assignments are scoped to an epoch of:

- `runtimeSeed` (from `runtime.getState().seed`) and
- `glyphPresetSignature` (computed from loaded preset definitions)

If either changes, all glyph assignments are reset and re-derived deterministically.

---

## 4. Data model

### 4.1 `GlyphShape` (12)

`line | chevron | crescent | triangle | star5 | star6 | circle | pixel | ring | hex_ring | oct_ring | square_ring`

### 4.2 `GlyphPlacement`

- `shape: GlyphShape`
- `position: 0..8`
- `rotationDeg: number`
- `scale: number` (fraction of cell size; see §2.1.4)
- `colorHex: one of the 4 palette hex strings`

### 4.3 `GlyphPulseConfig`

- `distanceFromCenterMinFactor: number` (multiplied by `spec.radius`)
- `distanceFromCenterMaxFactor: number`
- `scalePulseMin: number` (multiplier applied to placement.scale)
- `scalePulseMax: number`
- `rotationDeltaMinDeg: number` (added to placement.rotationDeg)
- `rotationDeltaMaxDeg: number`
- `delayMsByPosition: number[9]` (per-position delay)

### 4.4 `GlyphConfig`

- `id: string` (debug only; excluded from uniqueness)
- `placements: GlyphPlacement[]` (1..5 placements)
- `pulse: GlyphPulseConfig`

---

## 5. Texture generation (basic shapes)

### 5.1 Keys

Texture keys namespace:

- `glyph:line`, `glyph:chevron`, …, `glyph:square_ring`

### 5.2 Generation rules (deterministic)

Textures are generated at `128×128` with center `(64,64)`, as white-on-transparent primitives. Tint is applied at render time.

Required shapes:

- **line:** filled rectangle (thickness 10) spanning the vertical axis
- **chevron:** stroked V polyline with thickness 10
- **crescent:** filled crescent via two offset arcs
- **triangle:** filled triangle
- **star5:** filled 5-point star
- **star6:** two overlaid equilateral triangles (hexagram)
- **circle:** filled circle
- **pixel:** filled 16×16 square centered
- **ring:** stroked circle
- **hex_ring:** stroked regular hexagon
- **oct_ring:** stroked regular octagon
- **square_ring:** stroked square

Filtering: all glyph textures must use LINEAR filtering.

---

## 6. Glyph composition rules (procedural)

### 6.1 Deterministic PRNG

Procedural generation uses a deterministic PRNG seeded by `(runtimeSeed, ordinal)`.

**Seed string:** `runtimeSeed + ":" + ordinal`  
**Hash:** `fnv1a32(seedString) -> uint32`  
**Step:** `xorshift32`  
**unit():** `nextUint32 / 2^32` in `[0,1)`.

### 6.2 Allowed templates (positions; center excluded)

- `CROSS_4 = [1,3,5,7]`
- `CORNERS_4 = [0,2,6,8]`
- `TOP_3 = [0,1,2]`
- `BOT_3 = [6,7,8]`
- `LEFT_3 = [0,3,6]`
- `RIGHT_3 = [2,5,8]`
- `DIAG_MAIN_2 = [0,8]`
- `DIAG_ANTI_2 = [2,6]`
- `V_3 = [0,7,2]`
- `ARROW_DOWN_3 = [1,6,8]`

### 6.3 Shapes, rotations, scales, colors

**Core (position 4)**

- `CORE_SHAPES = [ring, hex_ring, oct_ring, square_ring, circle, star5, star6]`
- `CORE_SCALE = 1.00`
- rotation choices follow §6.4

**Satellites**

- `SAT_SHAPES = [line, chevron, crescent, triangle, circle, pixel, star5, star6, ring]`
- `SAT_SCALE_CHOICES = [0.35, 0.50, 0.65, 0.80]`

**Colors**

- Choose `primary` uniformly from the 4 palette colors.
- `secondary` is `(primaryIdx + 1) mod 4`.
- Core uses `primary`.
- Satellites alternate: even index uses `secondary`, odd uses `primary`.

### 6.4 Rotation sets (degrees; exact)

- `line: [0,45,90,135]`
- `chevron: [0,90,180,270]`
- `crescent: [0,90,180,270]`
- `triangle: [0,90,180,270]`
- `star5: [0,36,72,108,144]`
- `star6: [0,30,60,90,120,150]`
- `circle, pixel, ring, hex_ring, oct_ring, square_ring: [0]`

### 6.5 Satellite count and position selection (exact)

- Pick a template `T` uniformly.
- `satCount = min(4, floor(unit() * (len(T) + 1)))` -> `0..min(4,len(T))`
- `shift = floor(unit() * len(T))`
- Rotate `T` by `shift` and take first `satCount` positions.

Resulting placements count is `1 + satCount` in `[1..5]`.

### 6.6 Selection mechanics (exact)

All “random” choices in procedural generation are deterministic and use this rule:

- Given an array `A` with length `L` and `r = unit()` in `[0,1)`, select:
    - `idx = floor(r * L)`
    - `value = A[idx]`

This rule is used for:

- choosing the position template,
- choosing core/satellite shapes,
- choosing rotations from the per-shape rotation sets,
- choosing satellite scales,
- choosing the primary color index,
- choosing pulse parameter option pairs (see §6.7).

### 6.7 Procedural pulse config generation (exact)

Procedural glyphs select pulse parameter pairs from discrete option sets (to avoid float drift and ambiguity).

Option sets (exact):

- `DIST_FACTOR_PAIRS = [(0.50, 0.70), (0.55, 0.75), (0.60, 0.80)]`
- `SCALE_PULSE_PAIRS = [(0.96, 1.04), (0.95, 1.05), (0.94, 1.06)]`
- `ROT_DELTA_PAIRS = [(-4, 4), (-6, 6), (-8, 8), (-12, 12)]`

Selection (exact):

- Choose one pair from each set using §6.6.
- Set:
    - `distanceFromCenterMinFactor, distanceFromCenterMaxFactor` from the chosen `DIST_FACTOR_PAIR`
    - `scalePulseMin, scalePulseMax` from the chosen `SCALE_PULSE_PAIR`
    - `rotationDeltaMinDeg, rotationDeltaMaxDeg` from the chosen `ROT_DELTA_PAIR`

Delays:

- `delayMsByPosition` is always derived from the assigned ordinal via §8.2.

Constraints are guaranteed:

- min < max for all ranges.

---

## 7. Pulse + layout math (render-time, exact)

### 7.1 Inputs

- `R = spec.radius` (pixels)
- For each placement:
    - `pos = placement.position`
    - `delay = delayMsByPosition[pos]`
    - `p = pulseEngine.getDemandPulse(spec.entityId, timeMs - delay)` clamped to `[0,1]`

### 7.2 Derived values

**Distance from center**

- `distFactor = lerp(minFactor, maxFactor, p)`
- `d = distanceFromCenterPx = R * distFactor`

**Placement center**

- `(gx, gy)` from §3.1
- `xPx = gx * d`
- `yPx = gy * d`

**Scale normalization (scale is fraction of cell)**
Constants:

- `TEXTURE_SIZE_PX = 128`
- `CELL_FILL_FRACTION = 0.90` (padding so scale=1 does not touch cell boundary)

Pulse scale multiplier:

- `pulseScale = lerp(scalePulseMin, scalePulseMax, p)`

Target render size:

- `targetSizePx = d * CELL_FILL_FRACTION * placement.scale * pulseScale`

Phaser image scale:

- `imageScale = targetSizePx / TEXTURE_SIZE_PX`

**Rotation**

- `rotDelta = lerp(rotationDeltaMinDeg, rotationDeltaMaxDeg, p)`
- `finalRotationDeg = placement.rotationDeg + rotDelta`

(Conversion to radians is done at the Phaser call site.)

---

## 8. Uniqueness strategy (guaranteed)

### 8.1 Assignment ordinals

Each newly seen `display_key` gets a monotonically increasing `ordinal` within the current epoch, skipping reserved ordinals if needed (see presets).

### 8.2 Delay signature encoding (guaranteed uniqueness driver)

Delays encode a unique base-4 signature per ordinal.

Constants:

- `BASE = 4`
- `SIGNATURE_LEN = 9`
- `DELAY_STEP_MS = 60`

For ordinal `n`:

- `digit[pos] = floor(n / BASE^pos) mod BASE`
- `delayMsByPosition[pos] = digit[pos] * DELAY_STEP_MS`

Capacity is `BASE^9 = 262,144` unique signatures per epoch.

### 8.3 Hard failure on exhaustion

If more than 262,144 unique glyphs are requested in one epoch (after reserving signatures for presets), the system:

- logs `console.error` with seed and the failing `display_key`,
- throws an Error (no silent reuse). fileciteturn5file0L54-L56

---

## 9. Preset glyph definitions (loading, validation, precedence)

### 9.1 Source

Preset glyph definitions are loaded from the module cartridge’s asset collection as an optional field:

- `runtime.getCartridge().assets.glyphs`

`assets` is a catchall schema, so this does not require schema changes.

### 9.2 Format (exact JSON shape)

`assets.glyphs` must be an object:

```
{
  "<display_key>": {
    "placements": [
      { "shape": "ring", "position": 4, "rotationDeg": 0, "scale": 1.0, "colorHex": "#000000" },
      ...
    ],
    "pulse": {
      "distanceFromCenterMinFactor": 0.55,
      "distanceFromCenterMaxFactor": 0.75,
      "scalePulseMin": 0.95,
      "scalePulseMax": 1.05,
      "rotationDeltaMinDeg": -6,
      "rotationDeltaMaxDeg": 6,
      "delayMsByPosition": [0, 60, 0, 120, 0, 60, 180, 0, 120]
    }
  },
  ...
}
```

Rules:

- `shape` must be one of the 12 `GlyphShape` strings.
- `position` must be an integer `0..8`.
- `colorHex` must be exactly one of the 4 palette hex values.
- `placements.length` must be `1..5`.
- No duplicate `position` is permitted within a single glyph.
- Pulse values must satisfy strict ordering:
    - `distanceMinFactor < distanceMaxFactor`
    - `scalePulseMin < scalePulseMax`
    - `rotationDeltaMinDeg < rotationDeltaMaxDeg`
- `delayMsByPosition` must be length 9.
- Each delay must be one of `{0, 60, 120, 180}`.

### 9.3 Precedence

- If a preset exists for a `display_key`, that key always uses the preset glyph.
- Procedural generation applies only to keys not present in presets.

### 9.4 Preset validation and uniqueness

On epoch sync:

1. Parse and validate all preset glyphs.
2. Canonicalize each preset glyph config (excluding `id`) and ensure no two preset keys have identical canonical configs.
    - On conflict: log `console.error` listing both keys and throw Error.
3. Reserve the delay signatures used by presets so procedural allocation skips those ordinals whose computed delay vectors collide with a preset delay vector.
    - This preserves preset delays while keeping global uniqueness.

### 9.5 Epoch signature for presets

To detect preset changes deterministically, compute:

- `glyphPresetSignature = stableSerialize(presetsObject)`

`stableSerialize` is defined as:

- sort top-level keys ascending
- for each key, serialize its value with:
    - placements sorted by canonical placement ordering (§3.3)
    - pulse fields serialized in fixed key order
- concatenate into a single string and hash with `fnv1a32`

If signature changes, glyph assignments reset (see §3.4).

---

## 10. Integration into the Phaser display system (how)

### 10.1 Rendering approach

Replace the single-image placeholder shape with a composite glyph module:

- Acquire **exactly 5 pooled Images** per display instance.
- Use the first N images for placements; hide the remainder.
- Update each tick based on radius visibility, pulse, and glyph config.

### 10.2 Module lifecycle (exact)

**Create**

- Acquire 5 images from the pool for `spec.display_key`.
- Add all 5 to `scratch.root`.
- Set `scratch.mainImage = images[0]` (keeps existing conventions).

**Tick**

- If `!isRadiusVisible(spec.radius)`: set all images invisible and return.
- `glyph = glyphRegistry.get(spec.display_key)`
- For `i in 0..4`:
    - If `i >= glyph.placements.length`: hide image i.
    - Else:
        - Set texture key for `shape`.
        - Set tint to `colorHex`.
        - Compute `delay` by position.
        - Sample pulse value with delayed time.
        - Apply transforms per §7.
        - Show image.

**Destroy**

- Remove all images from `scratch.root`.
- Release all 5 images back to the pool.
- Set `scratch.mainImage = null`.

### 10.3 Epoch synchronization point

`DisplayInstanceManager.tick()` is the single place that:

- reads `runtime.getState().seed`
- loads presets from `runtime.getCartridge().assets.glyphs`
- calls `glyphRegistry.syncEpoch(seed, presetsRaw)` once per tick (idempotent; resets only when epoch changes)

This keeps all glyph logic on the display side, obeying “UI observes, never cheats”.

---

## 11. Files: responsibilities, logic, interfaces (no ambiguity)

> Paths are relative to `src/`.

### 11.1 Add: `engine/phaser/display/glyph/GlyphTextureKeys.ts`

- **Responsibility:** Canonical texture key strings for the 12 glyph shapes.
- **Logic:** None.
- **Interface:** exports constants (or enum) of the 12 texture keys.

### 11.2 Add: `engine/phaser/utils/GlyphTextureGen.ts`

- **Responsibility:** Generate Phaser textures for the 12 shapes.
- **Logic:** Deterministic procedural drawing into the TextureManager scratch graphics; no randomness.
- **Interface:** `generateGlyphTextures(scene, graphics): void`

### 11.3 Change: `engine/phaser/utils/TextureManager.ts`

- **Responsibility change:** Initialize placeholder textures and glyph textures once.
- **Logic change:** `initialize()` must call `generateGlyphTextures(...)` after placeholder generation.
- **Interface change:** None.

### 11.4 Add: `engine/phaser/display/glyph/GlyphTypes.ts`

- **Responsibility:** Define glyph types and position coordinate table (§3.1).
- **Logic:** None.
- **Interface:** exports `GlyphShape`, `GlyphPlacement`, `GlyphPulseConfig`, `GlyphConfig`, `GLYPH_POSITION_COORDS`.

### 11.5 Add: `engine/phaser/display/glyph/GlyphPresetParser.ts`

- **Responsibility:** Validate and canonicalize presets loaded from `assets.glyphs`.
- **Logic:** Strict validation per §9.2; canonical sorting per §3.3; signature computation per §9.5.
- **Interface:**
    - `parsePresets(raw: unknown): { presetsByKey: Map<string, GlyphConfigWithoutId>; signature: string; reservedDelaySignatures: Set<string> }`
    - “Delay signature” is the 9-element delay array serialized as `"d0,d1,...,d8"`.

### 11.6 Add: `engine/phaser/display/glyph/GlyphGenerator.ts`

- **Responsibility:** Pure procedural generator: `(seed, ordinal) -> GlyphConfigWithoutId`.
- **Logic:** Implements §6 (composition) and uses §8.2 to produce delay vector for the given ordinal.
- **Interface:** `generateGlyph(seed: string, ordinal: number): GlyphConfigWithoutId`

### 11.7 Add: `engine/phaser/display/glyph/GlyphRegistry.ts`

- **Responsibility:** Resolve `display_key -> GlyphConfig` with:
    - preset precedence,
    - epoch resets,
    - guaranteed uniqueness,
    - capacity enforcement.
- **Logic:**
    - Maintains current epoch `{seed, presetSignature}`.
    - On epoch change: clear assignments; load presets; rebuild reserved signature set.
    - `get(display_key)`:
        - if preset exists: return preset (with debug id injected).
        - else: allocate next available ordinal whose delay signature is not reserved and not already used; generate config; cache.
    - Throws on capacity exhaustion.
- **Interface:**
    - `syncEpoch(seed: string, presetsRaw: unknown): void`
    - `get(display_key: string): GlyphConfig`
    - `clear(): void` (used when runtime is null)

### 11.8 Add: `engine/phaser/display/glyph/glyphRenderMath.ts`

- **Responsibility:** Pure math for transform resolution (§7).
- **Logic:** No Phaser access; returns x/y/scale/rotationDeg.
- **Interface:** `resolveGlyphPlacementTransform(params): { xPx, yPx, imageScale, rotationDeg }`

### 11.9 Add: `engine/phaser/display/modules/GlyphModule.ts`

- **Responsibility:** Render glyphs as a composite of up to 5 images.
- **Logic:** Lifecycle per §10.2; uses registry + render math; samples pulse with delay.
- **Interface:** `createGlyphModule(glyphRegistry: GlyphRegistry): DisplayModuleFactory`

### 11.10 Change: `engine/phaser/display/DisplayDefinitionCatalog.ts`

- **Responsibility change:** Use `GlyphModule` in entity/transfer stacks (replacing placeholder shape).
- **Logic change:** `createDisplayDefinitions(glyphRegistry)` returns defs using `createGlyphModule(glyphRegistry)`.
- **Interface change:** function signature changes from `(variants)` to `(glyphRegistry)`.

### 11.11 Change: `engine/phaser/display/DefaultPlaceholderDisplayDefinition.ts`

- **Responsibility change:** Default fallback uses glyph module.
- **Interface change:** `createDefaultPlaceholderDefinition(glyphRegistry)`.

### 11.12 Change: `engine/phaser/scenes/GameSceneDisplayInit.ts`

- **Responsibility change:** Construct and expose `GlyphRegistry`, pass it into:
    - default placeholder definition creation
    - display definitions creation
    - display manager deps
- **Interface change:** `GameDisplaySystem` includes `glyphRegistry: GlyphRegistry`.

### 11.13 Change: `engine/phaser/display/DisplayInstanceManager.types.ts`

- **Responsibility change:** Add `glyphRegistry` to deps.
- **Interface change:** `DisplayInstanceManagerDeps` adds `glyphRegistry: GlyphRegistry`.

### 11.14 Change: `engine/phaser/display/DisplayInstanceManager.ts`

- **Responsibility change:** Sync glyph epoch each tick and clear on runtime absence.
- **Logic change:**
    - If runtime is null: `glyphRegistry.clear()` before destroying visuals.
    - If runtime exists: `glyphRegistry.syncEpoch(runtime.getState().seed, (runtime.getCartridge().assets as any).glyphs)`
- **Interface change:** none beyond deps usage.

### 11.15 Change: `engine/phaser/display/pooling/DisplayTypePool.ts`

- **Responsibility change:** Reset pooled images fully for glyph rendering.
- **Logic change:** `imagePool.reset(img)` must clear tint (`clearTint()`).
- **Interface change:** none.

---

## 12. Testing (complete and thorough; adheres to standards)

Testing must follow:

- Behavior over implementation, fileciteturn5file1L7-L27
- Given/When/Then structure, fileciteturn5file1L59-L70
- Isolation-first with pure functions and small registries. fileciteturn5file1L7-L27

### 12.1 Unit tests (logic & utilities)

#### Add: `engine/phaser/display/glyph/GlyphGenerator.test.ts`

Covers:

1. Determinism

- Given: seed S and ordinal N
- When: generate twice
- Then: canonical configs are deeply equal

2. Guaranteed uniqueness driver

- Given: seed S and ordinals N and N+1
- When: generate both
- Then: delay arrays differ (and thus configs differ)

3. Output validity

- placements length is 1..5
- each placement position in 0..8 and unique within glyph
- shapes only from `GlyphShape`
- colors only from palette
- rotations are from the allowed set per shape
- scales:
    - core placement scale == 1.0
    - satellite scale ∈ SAT_SCALE_CHOICES
- pulse min/max ordering holds
- delay array length 9 and each delay ∈ {0,60,120,180}

#### Add: `engine/phaser/display/glyph/GlyphPresetParser.test.ts`

Covers:

1. Happy path parsing

- Given: valid presets object with two keys
- When: parsePresets
- Then: returns 2 parsed configs, stable signature string, reserved delay signature set

2. Negative path: invalid shape / color / positions

- Given: preset with invalid shape string
- When: parsePresets
- Then: throws with a key-specific error message

3. Negative path: duplicates

- Given: two preset keys with identical canonical glyph config
- When: parsePresets
- Then: throws and logs loud

4. Signature stability

- Given: presets with keys in different order
- When: parsePresets
- Then: signature is identical (stable serialization works)

#### Add: `engine/phaser/display/glyph/GlyphRegistry.test.ts`

Covers:

1. Same key returns same glyph

- Given: epoch synced
- When: get same key twice
- Then: deep-equal configs

2. Different keys are unique

- Given: epoch synced with no presets
- When: get 1..500 distinct keys
- Then: all canonical configs are unique

3. Preset precedence

- Given: presets define key K
- When: get(K)
- Then: returned glyph equals preset glyph (same canonical config)

4. Procedural skips reserved signatures

- Given: one preset consumes a known delay signature
- When: allocate many procedural keys
- Then: none of them use the reserved delay signature

5. Epoch reset

- Given: epoch A (seed or preset signature), allocate key K
- When: syncEpoch to epoch B
- Then: allocations restart and cached keys are cleared (K re-resolves under new epoch)

6. Capacity exhaustion

- Given: epoch synced
- When: attempt to allocate more than effective capacity
- Then: throws and logs `console.error`

#### Add: `engine/phaser/display/glyph/glyphRenderMath.test.ts`

Covers:

1. Distance semantics

- Given: d computed from radius and factors; position (1,0)
- Then: x == d, y == 0

2. Scale normalization

- Given: placement.scale=0.5, pulseScale=1.0
- Then: target size == 0.5 _ cell size _ CELL_FILL_FRACTION

3. Pulse interpolation

- Given: p=0 and p=1
- Then: min is used at 0, max used at 1 (distance, scale multiplier, rotation delta)

### 12.2 Integration tests

No new ECS/runtime integration tests are required because this feature is display-only and does not alter runtime state. View tests are not needed because the work is in Phaser display modules, not React UI. This matches the testing standards’ separation of concerns. fileciteturn5file1L13-L56

---

## 13. Error handling (explicit; no ambiguity)

1. Preset parse/validation failures:

- Must `console.error` with the offending `display_key` and field, then throw.

2. Preset uniqueness conflicts:

- Must `console.error` listing both keys and throw.

3. Procedural capacity exhaustion:

- Must `console.error` with seed/preset signature and failing key and throw.

4. Render safety:

- GlyphModule must tolerate `scratch.mainImage == null` (matches existing module patterns).

---

## 14. Review checklist (this LLD)

### Why / What / How

- **Why:** §1 states motivation and architectural alignment.
- **What:** §2 enumerates hard requirements and non-goals.
- **How:** §5–§11 define deterministic algorithms, pulse math, preset loading, integration points, and file-level interfaces.

### Interfaces and responsibilities

- §11 lists every file to add/change with responsibilities, logic, and interface.

### Standards & contract adherence

- No scope expansion beyond display-side glyphs + preset loading.
- No silent errors; explicit throws + loud logs.
- Testing follows Given/When/Then and isolates logic into pure modules/registries. fileciteturn5file1L59-L70 fileciteturn5file1L7-L27

### Completeness

- Covers texture generation, composition rules, epoch behavior, preset format, precedence, uniqueness, integration, errors, and testing.

### Remaining ambiguities

- None left by design: all constants, ranges, mappings, and precedence rules are explicitly specified.

---

