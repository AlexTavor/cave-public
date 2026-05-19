# LLD — Continuous Logarithmic Vein Thickness (10 px per decade)

## Governing documents (must be followed)
- **AI Context Pack v1** fileciteturn7file0  
- **Prompt Contract — Canonical** fileciteturn7file1  
- **Testing Standards — Canonical** fileciteturn7file2  

This LLD is a narrowly-scoped delta that changes only vein width computation for **supply** edges (power-driven) and the tests/config required to keep the project deterministic and green.

---

## Why

### Problem
Current supply vein thickness is computed **linearly** from `power` (throughput). Linear scaling produces visually incorrect results across large ranges of power: low-power veins become indistinguishable and high-power veins saturate too quickly, failing to communicate orders-of-magnitude differences.

### Requirement
Vein thickness must scale **continuously logarithmically** such that **each order of magnitude (×10) increase in vein power adds +10 pixels of width**.

### Constraints
- Deterministic, pure computation in `src/engine/**` (no UI business logic). fileciteturn7file0
- No scope creep or unrelated refactors. fileciteturn7file1
- Thorough unit tests for happy path, negative path, and edge cases. fileciteturn7file2
- No silent failures: invalid inputs must log loudly. fileciteturn7file0

---

## What (contracts)

## Functional contract (supply width)
For **supply** edges (those whose width is derived from `edge.power`), the base (non-pulsed) width in pixels is:

- Let:
  - `min = config.thickness.min_width`
  - `max = config.thickness.max_width`
  - `pxPerDecade = 10` (project constant; see config contract below)
  - `log10` be base-10 logarithm
- If `power` is **finite** and `power > 0`:
  - `raw = min + pxPerDecade * log10(power)`
  - `width = clamp(raw, min, max)`
- Else:
  - `width = min`
  - Emit a loud error log (see error contract)

**Continuity requirement:** the mapping is continuous for all `power > 0`.

**Decade requirement:** for any `p > 0`, increasing `p` by ×10 increases `raw` by exactly +10 (before clamping).

**Clamping rule:** once `raw >= max`, the width is exactly `max` and no longer increases.

## Non-goals / unchanged behavior
- **Demand** edge widths are unchanged. They are not computed from `power` and therefore do not participate in the “power per decade” rule.
- Pulse logic is unchanged: it multiplies the base width by the heartbeat multiplier and clamps to `[min, max]`.

## Error contract (no silent failures)
If `power` is:
- `<= 0`, or
- `NaN`, or
- `Infinity` / `-Infinity`, or
- otherwise not finite,

then:
- `resolveBaseWidth` returns `min_width` deterministically, and
- logs a single loud error message prefixed with `[resolveBaseWidth]` that includes the invalid value.

---

## How (design and algorithms)

## Algorithm: base width for supply edges
### Inputs
- `power: number`
- `config: VeinConfig` (thickness values)

### Output
- `widthPx: number` (float; not rounded)

### Steps (pseudocode; authoritative)
```text
min = config.thickness.min_width
max = config.thickness.max_width
pxPerDecade = 10

IF power is not finite OR power <= 0:
    log error: "[resolveBaseWidth] Invalid power=<value>; using min_width=<min>"
    RETURN min

raw = min + pxPerDecade * log10(power)
RETURN clamp(raw, min, max)
```

## Configuration contract (unambiguous)
To avoid any ambiguity about “10 pixels per decade”, the vein config must encode this constant as follows:

- `config.thickness.attribute_scale_factor` is treated as a **required constant** whose value is exactly **10**.
- Parsing/validation must reject configs where this value is not 10.
- Default project data must set it to 10.

This preserves the existing config shape while making the 10px-per-decade rule explicit and enforced.

---

## Files to change or add (responsibility, logic, interface)

### CHANGED — `src/engine/phaser/veins/veinGeometry.ts`

**Responsibility**
- Pure geometry/math for vein widths and offsets (no Phaser dependency).

**Public interface**
- `resolveBaseWidth(power: number, config: VeinConfig): number`
- `resolvePulsedWidth(base: number, intensity: number, config: VeinConfig): number`
- `resolveDemandWidth(...)` (unchanged)

**Change**
- Update `resolveBaseWidth` from linear scaling to the logarithmic contract above.
- Add explicit invalid-input handling:
  - if `power` non-finite or `<= 0`, return `min_width` and log loudly.

**Unchanged**
- `resolvePulsedWidth`, `resolveDemandWidth`, `clamp`, and offset grouping behavior remain exactly as-is.

---

### CHANGED — `src/data/schemas/assets/veins.ts`

**Responsibility**
- Define the authoritative Zod schema and defaults for vein config.

**Public interface**
- `VeinConfigSchema` (Zod schema)
- `DEFAULT_VEIN_CONFIG`

**Change**
- Enforce the “10 px per decade” constant via schema:
  - `thickness.attribute_scale_factor` must validate as exactly `10`
  - default value must be `10`

This makes the constant part of validated configuration and prevents accidental divergence.

---

### CHANGED — `src/data/raw/game_data.json`

**Responsibility**
- Provide the default project asset settings consumed by bootstrap / tests.

**Interface**
- JSON structure under `assets.settings.vein_network.thickness`

**Change**
- Set `attribute_scale_factor` to `10` to satisfy the schema constant requirement and match the new thickness semantics.

---

### CHANGED — `src/engine/phaser/veins/PulseEngine.test.ts`

**Responsibility**
- Verify PulseEngine behavior with valid vein config.

**Change**
- Update any test config fixtures to set `thickness.attribute_scale_factor = 10` (to satisfy schema and the constant contract).
- No change to PulseEngine assertions unless they depend on the old fixture value.

---

### CHANGED — `src/engine/linker/CompileProject.system.test.ts`

**Responsibility**
- Verify project compilation / linking using representative config.

**Change**
- Update embedded vein_network thickness fixture:
  - `attribute_scale_factor = 10`

---

### ADDED — `src/engine/phaser/veins/veinGeometry.test.ts`

**Responsibility**
- Unit test the logarithmic thickness computation as a pure function.

**Test layer**
- Unit tests (engine logic). fileciteturn7file2

**Test cases (AAA; no ambiguity)**

1) Happy path — exact decade steps (no clamping)
- Given:
  - `min_width = 2`, `max_width = 1000`, `attribute_scale_factor = 10`
- When / Then:
  - `power=1` returns `2`
  - `power=10` returns `12`
  - `power=100` returns `22`
  - `power=1000` returns `32`

2) Happy path — continuous between decades
- Given same config (no clamping)
- When:
  - `power = 10^1.5` (i.e., 31.6227766…)
- Then:
  - width is `17` within a small float tolerance (continuous log behavior)

3) Edge case — power < 1 clamps to min (but remains continuous for power>0)
- Given same config (no clamping at max)
- When:
  - `power = 0.1`
- Then:
  - raw would be below min; returned width is exactly `min_width` due to clamp

4) Clamp behavior at max
- Given:
  - `min_width = 2`, `max_width = 20`, `attribute_scale_factor = 10`
- When:
  - `power = 1000`
- Then:
  - returned width is exactly `20` (max clamp)

5) Negative path — invalid powers log loudly and return min
- Given any valid config
- When:
  - `power = 0`, `power = -5`, `power = NaN`, `power = Infinity`
- Then:
  - width is exactly `min_width`
  - `console.error` is called once per invocation with prefix `[resolveBaseWidth]`

**Mocking rules**
- Only `console.error` is mocked/spied (external boundary). Everything else uses real pure functions. fileciteturn7file2

---

## Acceptance criteria
1) For supply edges, each ×10 increase in power increases unconstrained width by exactly +10 pixels (continuous) until clamped.
2) Invalid `power` values never crash and never silently fail: they log loudly and deterministically return `min_width`.
3) All tests are green and adhere to AAA readability and coverage requirements. fileciteturn7file2
4) No other behavior changes: demand widths and pulse rules remain identical.

---

## Out of scope confirmation
No other files, systems, or UI components are modified. No refactors, no new features beyond the stated thickness rule. fileciteturn7file1
