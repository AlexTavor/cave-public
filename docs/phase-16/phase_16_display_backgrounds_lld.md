# Phase 16 — Display Backgrounds LLD
**File:** `phase_16_display_backgrounds_lld.md`  
**Owner:** Pixel Pie — Display / Phaser  
**Scope:** Replace `BackgroundModule` from “static circle texture” to “pulsing organic blob container + flat cycle fill + power-composition coloring”.

---

## 1. Why

### 1.1 Current behavior is inadequate
`BackgroundModule` currently renders a static circle texture (hardcoded white) scaled to radius. It does not communicate:
- **Cycle progress** (as an interior fill that rises with the cycle)
- **Power composition** (body/mind/social) across the cycle
- **Organic motion** (pulsing border / “organ-like” container)

### 1.2 Canon and source-of-truth constraints
Cycle accumulation is canonically tied to **allocated draw over time** in the cycle compiler (sum of allocated draw inputs multiplied by `global.dt_s`). This change must visually reflect that canon (cycle controls fill height; power draw controls fill composition) without mutating simulation state.

### 1.3 Architectural constraints that must remain true
- **UI observes, never cheats:** Display may keep local, visual-only accumulation state, but must never write to ECS/runtime.
- **No scope expansion:** Only implement what is required for this background behavior and tests.
- **No silent failures:** Invalid runtime states must log loudly and deterministically.
- **Testing standards:** Behavior-focused tests; isolation-first; fast in-memory tests.

---

## 2. What

### 2.1 Visual requirements
1. The background container is a **single organic blob** outline (not a perfect circle).
2. The blob has a **border ring** that is always visible and **never filled**.
3. The blob border **undulates with pulse** every tick.
4. Inside the blob, a **flat (non-undulating) vertical fill** rises from bottom as a function of **cycle progress**.
5. The fill is clipped so it never paints into the border ring area.
6. Fill coloring encodes **power draw composition over the current cycle**:
   - If no power has been drawn so far in the current cycle → fill uses a default color.
   - Otherwise the fill is stacked into **up to 3 vertical bands** (bottom→top):
     1) body color, 2) mind color, 3) social color
   - Band heights are proportional to accumulated draw per attribute (integrated over time during the cycle).

### 2.2 Container colors (global, same across nodes)
The organic container itself uses fixed project-wide colors (not per-node style):
- **Border (stroke):** `#F6F1E9` (off-white)
- **Interior base (unfilled background):** `#E6DDEA` (darker off-white with a subtle purple tint)

These values are constants owned by `BackgroundModule` and must not vary by entity, display_key, or style.

### 2.3 Inputs (hard contract)
`BackgroundModule` reads only:
- `spec.hasPhysics` (boolean)
- `spec.radius` (number)
- `spec.entityId` (string)
- `entity.state.cycle.value` (number)
- `entity.state.cycle.max` (number)
- `entity.powerSink.allocatedDraw.body|mind|social` (numbers; optional/missing allowed)
- `tickCtx.deltaMs` (number)
- `tickCtx.timeMs` (number)
- `tickCtx.pulseValue` (number in [0..1])
- `tickCtx.pulseEngine.getBaseAttributeColors()` (new API; returns 3 hex strings)

No other state is read or written.

### 2.4 Invalid states (explicit)
If any condition holds:
- `spec.hasPhysics === false`
- `spec.radius <= 0.5`
- `entity.state.cycle` missing or not an object
- `cycle.value` not finite
- `cycle.max` not finite OR `cycle.max <= 0`

Then:
- All BackgroundModule visuals for the entity are hidden.
- The module logs exactly once per entity instance:
  - `console.error("[BackgroundModule] Invalid cycle state for entity=<entityId>")`

If `powerSink` or `allocatedDraw` is missing/invalid:
- treat all allocated draw values as `0` for accumulation/composition.
- do not log (this is a supported “no power” path).

### 2.5 Non-goals
- No undulating fill “surface” (top edge remains flat).
- No changes to cycle simulation / compiler behavior.
- No changes to interaction hit-shapes (InteractionModule continues using the existing target rules).
- No per-style container coloring; container colors are global constants.

---

## 3. How

Definitions used throughout this document:
- `frac(x) = x - floor(x)`
- `clamp(x, lo, hi) = max(lo, min(hi, x))`
- `Point = { x: number, y: number }`

## 3.1 Rendering objects and layering
`BackgroundModule` renders using pooled Phaser `Graphics` and a geometry mask.

### 3.1.1 Objects created
On `create()` acquire from `pool.graphicsPool`:
1. `blobMaskGraphics` — draws the **inner blob polygon** (mask source)
2. `blobFillGraphics` — draws:
   - interior base tint (clipped)
   - fill bands (flat rectangles; clipped)
3. `blobBorderGraphics` — draws outer blob **stroke** on top (unmasked)

All 3 are added to `scratch.backgroundAnchor`.

### 3.1.2 Masking
`blobFillGraphics` is clipped using a `GeometryMask` created from `blobMaskGraphics`.

Mask contract:
- Mask shape is the **inner blob polygon** (not the outer stroke polygon).
- If the module is hidden due to invalid state, mask is kept intact but graphics are hidden.

### 3.1.3 Draw order
Within `backgroundAnchor`:
1. `blobFillGraphics` (masked)
2. `blobBorderGraphics` (unmasked; always above fill)

---

## 3.2 Geometry: outer blob vs inner blob (border ring guarantee)

### 3.2.1 Constants (derived per-entity from radius)
Let `R = spec.radius`.

- `BORDER_WIDTH_PX = max(2, round(R * 0.10))`
- `BORDER_GAP_PX   = max(2, round(R * 0.06))`
- `OUTER_MAX_RADIUS = R - (BORDER_WIDTH_PX / 2)` (stroke stays inside the node envelope)

The **outer blob** defines the stroke path.
The **inner blob** defines the fill mask.

For every angle θ:
- `rInner(θ) = max(0, rOuter(θ) - (BORDER_WIDTH_PX + BORDER_GAP_PX))`

This guarantees:
- The border ring stays visible.
- The fill never touches or bleeds into the border ring.

---

## 3.3 Organic blob shape function (deterministic + pulse-undulating)

### 3.3.1 Sampling
- Sample count: `N = 48`
- For i = 0..N-1:
  - `θ_i = 2π * i / N`

### 3.3.2 Stable per-entity seed
Use existing deterministic hash utility:
- `seedUnit = stringHash(spec.entityId)` ∈ [0,1)

### 3.3.3 Base (static) organic variation
Constants:
- `BASE_WOBBLE_AMP = 0.07` (7% radius variation)
- `W1 = 3`, `W2 = 5` (angular frequencies)
- `φ1 = 2π * seedUnit`
- `φ2 = 2π * frac(seedUnit * 13.37)`

Base term:
- `baseWobble(θ) = BASE_WOBBLE_AMP * (0.6*sin(W1*θ + φ1) + 0.4*sin(W2*θ + φ2))`

### 3.3.4 Pulse-driven undulation (the moving border)
Constants:
- `PULSE_WOBBLE_AMP = 0.05` (5% additional radius variation at pulse=1)
- `W3 = 4` (angular frequency)
- `F_HZ = 0.8` (temporal frequency)
- `φ3 = 2π * frac(seedUnit * 7.77)`

Pulse term:
- `pulseWobble(θ, tMs, pulse) = (PULSE_WOBBLE_AMP * pulse) * sin(W3*θ + 2π*F_HZ*(tMs/1000) + φ3)`

### 3.3.5 Final radii and points
For each θ:
- `rOuter(θ) = clamp( OUTER_MAX_RADIUS * (1 + baseWobble(θ) + pulseWobble(θ,t,pulse)), 0, OUTER_MAX_RADIUS )`
- `rInner(θ) = max(0, rOuter(θ) - (BORDER_WIDTH_PX + BORDER_GAP_PX))`

Points:
- Outer: `(xOuter, yOuter) = (rOuter*cosθ, rOuter*sinθ)`
- Inner: `(xInner, yInner) = (rInner*cosθ, rInner*sinθ)`

---

## 3.4 Cycle fill (flat bar, clipped by inner blob)

### 3.4.1 Fill fraction
- `fillFraction = clamp(cycle.value / cycle.max, 0, 1)`

### 3.4.2 Fill rectangle envelope
Let:
- `Y_TOP    = -OUTER_MAX_RADIUS`
- `Y_BOTTOM = +OUTER_MAX_RADIUS`
- `Y_FILL_TOP = Y_BOTTOM - (Y_BOTTOM - Y_TOP) * fillFraction`

The fill is drawn as one or more **axis-aligned rectangles** spanning:
- x from `-OUTER_MAX_RADIUS` to `+OUTER_MAX_RADIUS` (mask clips to blob)
- y from `Y_FILL_TOP` to `Y_BOTTOM`

The top edge of the fill is a straight line (no undulation).

### 3.4.3 Interior base tint
Even at fillFraction=0, the interior should read as a container.
`blobFillGraphics` draws a full-coverage rectangle (clipped by inner mask) in interior base tint:
- color: `#E6DDEA`
- alpha: `0.22`

---

## 3.5 Power composition (per-cycle, visual-only)

### 3.5.1 Per-instance state (owned by module runtime)
Within `BackgroundModule.create()` closure:
- `prevCycleValue: number | null = null`
- `drained = { body: 0, mind: 0, social: 0 }`
- `hasLoggedInvalidCycle: boolean = false`

### 3.5.2 Reset on cycle rollover
On each tick:
- If `prevCycleValue != null` AND `cycle.value < prevCycleValue` then:
  - `drained.body = drained.mind = drained.social = 0`
- Set `prevCycleValue = cycle.value`

### 3.5.3 Accumulate drained values
Pseudocode (no code):
```
dt_s = deltaMs / 1000
drawBody   = max(0, allocatedDraw.body   or 0)
drawMind   = max(0, allocatedDraw.mind   or 0)
drawSocial = max(0, allocatedDraw.social or 0)

drained.body   += drawBody   * dt_s
drained.mind   += drawMind   * dt_s
drained.social += drawSocial * dt_s
```

### 3.5.4 Band heights from drained proportions
Let:
- `total = drained.body + drained.mind + drained.social`
- `H_TOTAL = Y_BOTTOM - Y_FILL_TOP` (pixel height of current fill)

If `total <= 1e-6`:
- Fill uses **default fill color** `#D8D8D8` with alpha `0.85`, as a single band.

Else (power-composition mode):
- All attribute-colored bands use alpha `0.85`.

Else:
- `pBody = drained.body / total`
- `pMind = drained.mind / total`
- `pSocial = drained.social / total`

Heights (pixel exact):
- `H_BODY = round(H_TOTAL * pBody)`
- `H_MIND = round(H_TOTAL * pMind)`
- `H_SOCIAL = H_TOTAL - H_BODY - H_MIND` (remainder; ensures exact fill height)

Stacked bottom→top:
1. body band
2. mind band
3. social band

Colors are sourced from `pulseEngine.getBaseAttributeColors()`.

---

## 3.6 Lifecycle and pooling

### 3.6.1 Scratch slots
New slots added to `DisplayScratch`:
- `blobMaskGraphics: Graphics | null`
- `blobFillGraphics: Graphics | null`
- `blobBorderGraphics: Graphics | null`

These must always be set to null after `destroy()`.

### 3.6.2 Create
- Acquire the 3 Graphics objects from `pool.graphicsPool`.
- Add them to `scratch.backgroundAnchor`.
- Create a geometry mask from `blobMaskGraphics` and set it on `blobFillGraphics`.
- Store them in scratch.

### 3.6.3 Tick (strict order)
1. Validate `hasPhysics`, radius visibility, and cycle state.
2. If invalid: hide all 3 graphics and log once; return.
3. Compute outer/inner polygons from §3.2–§3.3.
4. Redraw `blobMaskGraphics` using the **inner polygon**.
5. Redraw `blobFillGraphics`:
   - clear
   - draw interior base tint rectangle (masked)
   - draw fill band rectangles (masked)
6. Redraw `blobBorderGraphics`:
   - clear
   - set line style: `width=BORDER_WIDTH_PX`, `color=#F6F1E9`, `alpha=1.0`
   - stroke the **outer polygon**
7. Set all visible.

Polygon draw contract (pseudocode, applies to both mask and border):
```
graphics.clear()
graphics.beginPath()
graphics.moveTo(points[0].x, points[0].y)
for i in 1..points.length-1:
    graphics.lineTo(points[i].x, points[i].y)
graphics.closePath()

// For mask: fillPath()
// For border: strokePath() with lineStyle already set
```

### 3.6.4 Destroy
- Remove the 3 graphics from `backgroundAnchor`.
- Clear the mask from `blobFillGraphics` (set to null).
- Release all 3 graphics to `graphicsPool`.
- Null all scratch slots.

---

## 4. File-by-file changes (responsibility, logic, interface)

## 4.1 `src/engine/phaser/display/modules/BackgroundModule.ts` (CHANGE)
**Responsibility:** Render pulsing organic blob border + flat cycle fill with power-composition colors.

**External interface:** unchanged (DisplayModuleFactory with id `"BackgroundModule"`).

**Internal logic changes:**
- Replace image/texture approach with graphics + geometry mask approach.
- Own per-instance drained accumulators (visual-only).
- Use fixed container colors from §2.2.
- Read attribute colors via `pulseEngine.getBaseAttributeColors()`.

**Scratch slots written:** `blobMaskGraphics`, `blobFillGraphics`, `blobBorderGraphics`.

---

## 4.2 `src/engine/phaser/display/types.ts` (CHANGE)
**Responsibility:** Define the runtime contract for display specs and scratch storage.

**Interface changes:**
- Add 3 nullable fields to `DisplayScratch`:
  - `blobMaskGraphics`
  - `blobFillGraphics`
  - `blobBorderGraphics`

No other changes.

---

## 4.3 `src/engine/phaser/display/EntityVisualInstanceHelpers.ts` (CHANGE)
**Responsibility:** Ensure scratch is correctly initialized and leaks are detected.

**Logic changes:**
- `acquireAnchors()` initializes the new scratch slots to `null`.
- `validateScratchSlots()` flags leaks if any of the 3 new slots are non-null.

**Interface:** unchanged.

---

## 4.4 `src/engine/phaser/display/DisplayDefinitionCatalog.ts` (CHANGE)
**Responsibility:** Define which modules are active for each display_key stack.

**Logic change:**
- Insert `BackgroundModule` into `entityStack` directly after `TransformModule` and before the glyph module.

**Interface:** unchanged.

---

## 4.5 `src/engine/phaser/veins/PulseEngine.ts` (CHANGE)
**Responsibility:** Provide pulse samples; additionally expose base attribute colors from config for display consumption.

**New additive interface:**
- `getBaseAttributeColors(): { body: string; mind: string; social: string }`

**Logic:** Return current config `colors.base_body/base_mind/base_social`.

No other behavior changes.

---

## 4.6 `src/engine/phaser/display/modules/backgroundBlobMath.ts` (ADD)
**Responsibility:** Pure, unit-testable blob geometry math.

**Exports (public interface):**
- `computeBlobPolygons(params): { outer: Point[]; inner: Point[] }`
  - Implements §3.2 and §3.3 exactly.
- `computeDerivedBlobConstants(radius: number): { borderWidthPx; borderGapPx; outerMaxRadius }`
  - Implements §3.2.1 exactly.

**Logic:** No Phaser calls; only math.

---

## 5. Testing plan

## 5.1 Unit tests — pure math (`backgroundBlobMath`)
**File:** `src/engine/phaser/display/modules/backgroundBlobMath.test.ts` (ADD)

Behavioral assertions:
1. Determinism: same `entityId`, radius, timeMs, pulseValue → identical polygons.
2. Pulse effect: pulseValue=0 vs pulseValue=1 at same time → outer polygon differs.
3. Ring guarantee: for each point i, `distance(inner[i]) <= distance(outer[i]) - (borderWidthPx + borderGapPx)` within epsilon.
4. Envelope guarantee: all outer radii are `<= outerMaxRadius` within epsilon.
5. Edge cases: very small radius (<=0.5) returns empty polygon arrays.

## 5.2 Unit tests — module behavior (`BackgroundModule`)
**File:** `src/engine/phaser/display/modules/BackgroundModule.test.ts` (ADD)

Approach:
- Use faked `graphicsPool` and fake `Graphics` objects that record:
  - `visible` changes
  - `clear()` calls
  - stroke style settings (width/color/alpha)
  - fill rect calls (x,y,w,h, color, alpha)
  - whether `setMask()` was applied and cleared
- Mock `phaser` to provide a minimal `GeometryMask` class usable by the module runtime.

Behavioral assertions (Given/When/Then):
1. **Invalid cycle hides and logs once**  
   Given missing/invalid `state.cycle`, When tick, Then all graphics hidden and `console.error` called once per instance.
2. **Valid cycle renders container at fillFraction=0**  
   Given cycle.value=0, When tick, Then border + interior base visible; fill bands not drawn.
3. **Default fill color when no power drained this cycle**  
   Given fillFraction>0 and allocatedDraw all zero over multiple ticks, Then fill uses default fill color only.
4. **Band stacking follows drained proportions and fixed order**  
   Given allocatedDraw body/mind/social and time steps, Then band rectangles are issued in order body→mind→social and heights match rounding rules in §3.5.4.
5. **Cycle rollover resets composition**  
   Given cycle.value decreases (rollover), Then drained resets and subsequent band proportions reflect only new-cycle draw.
6. **Destroy releases and clears scratch**  
   Then all 3 graphics released back to pool; mask cleared; scratch slots set to null.

## 5.3 Unit tests — PulseEngine new getter
**File:** `src/engine/phaser/veins/PulseEngine.test.ts` (CHANGE)

Assertions:
- Returns the current config’s base colors.
- After `setConfig()`, getter returns updated values.

## 5.4 Compile fixes for existing tests
Because `DisplayScratch` gains 3 fields, tests that build scratch objects must initialize them to null:
- `src/engine/phaser/display/modules/GlyphModule.test.ts`
- `src/engine/phaser/display/modules/InteractionModule.test.ts`
(and any other tests constructing `DisplayScratch` literals)

---

## 6. Acceptance criteria (pass/fail)
1. Every node (attr_body/attr_mind/attr_social) displays the same organic container border and interior base tint.
2. Border visibly undulates with pulse; fill does not undulate.
3. Fill height matches `cycle.value / cycle.max` exactly.
4. Border ring area is never filled; border always remains visible on top.
5. If no power is drawn in the cycle, fill uses default color `#D8D8D8`.
6. If power is drawn, fill shows stacked bands in order body→mind→social with heights matching drained proportions (per §3.5.4).
7. No leaks: scratch leak validator reports no leaked objects; all graphics are released on destroy.
8. All tests pass, no TODOs, no silent failure paths, no out-of-scope edits.
