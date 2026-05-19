# HLD v2 — World Visual Engine (Aesthetic Foundation)
**Project:** Cave  
**Scope:** Production-Quality Aesthetic Foundation (World Space visuals + supporting infra)  
**Status:** Canonical (supersedes prior visual HLD where overlapping)  
**Principle:** UI observes runtime. Never mutates it.

---

## 1. Core Philosophy

The UI is the internal perception of Cave — a newborn hive-mind. Cave is:
- technically a monster, technically a god,
- also a cute baby animal (predatory, curious, bumbling).

The world renderer must:
- feel organic and systemic,
- scale to swarm-level entity counts,
- be deterministic and testable,
- respect ECS authority and the project’s simulation laws.

World space is simulation reality. Screen space is cognitive overlay.

---

## 2. Domain Separation

### 2.1 World Space (Phaser / WebGL)
Responsible for:
- Nodes (abstract rune glyphs)
- Resource icons
- Swarm (faces cloud)
- Veins (power transfer)
- Cave core display
- Lighting (heat, XP)
- Particles / effects
- LOD switching
- Camera
- Fillbars (linear + circular) over entities

World space never mutates ECS state.

### 2.2 Screen Space (React / DOM)
Responsible for:
- HUD / panels
- Draft choices
- Toolbars
- Debug UI / toggles
- Modals

React never renders world entities directly.

---

## 3. Visual Taxonomy

Visuals are divided into four ontological classes.

### 3.1 Concept Nodes (Abstract)
Examples:
- Foraging
- Lure Traveler
- Exploration
- Butcher
- Throne

Representation:
- Rune-like procedural glyphs (generated geometry, not static PNGs)
- Animated via the shared Pulse system

Constraints:
- Limited color palette
- Soft glow
- Organic asymmetry
- Stroke/segment based geometry

Animation:
- Pulse-synced deformation
- Concept-specific motion patterns

### 3.2 Physical Resources (Representational)
Examples:
- Wood
- Raw Edibles
- Cooked Food
- Bones

Representation:
- Atlas-based icons
- Simplified silhouettes
- 2–3 shade levels
- Thick outer outline

Constraints:
- Palette clamped
- No gradients
- Strong silhouette readability at low zoom

### 3.3 Energies (Non-Iconic)
Examples:
- Heat
- XP
- Notoriety

Representation:
- Light radius
- Particles
- Screen pulses / vignettes
- Vein intensity shifts

No icons.

### 3.4 Sentient Faces (Swarm)
Representation:
- Modular assembly:
  - Head shape
  - Hair shape
  - Eye shape
- Outline-only
- Eyes glow

Combination-based variety (not sprite-per-face).

---

## 4. Global Visual Rules (Design Bible Core)

### 4.1 Palette
- Fixed 8–12 color master palette
- All assets clamped or remapped to palette
- Glow colors derived from palette (no ad-hoc colors)

### 4.2 Outline Rule
- Constant pixel thickness (screen-space, not world-space)
- Outline uses darkest palette tone
- No internal outline noise at small scales

### 4.3 Glow System
All world objects may emit glow.

**Glow formula:**
```
radius    = baseSize * glowFactor * stateMultiplier
intensity = clamp(value / maxValue, min, max)
```

Glow layer is separate from base sprite (maskable, composable).

### 4.4 Pulse System (Global Time Source)
Single authoritative pulse:
```
Pulse.getHeartbeat(t)
```
All rhythmic animations reference this.
No local “heartbeat” timers.

---

## 5. Rendering Architecture

### 5.1 Layer Stack (Z Order)
Explicit Phaser Containers enforce order:

1. Background Layer
2. Vein Layer
3. Node Layer
4. Swarm Layer
5. Glow/Light Layer
6. Indicator Layer (fillbars, selection halos, status icons)
7. Effect Layer (particles, bursts, transient effects)

### 5.2 ECS → Visual Contract
Each frame:
- Read stable ECS snapshot
- Sync visual entities (create/update/destroy)
- Interpolate locally where needed
- Never write back into ECS

Visual objects maintain local animation state only.

### 5.3 Resource / Icon Binding
- Static assets (icons, atlases) loaded via a registry
- Procedural assets generated deterministically at preload/start
- Visual strategies choose appropriate atlas frame / procedural texture by “visual id”

---

## 6. Fillbars & Indicators

### 6.1 Objectives
Provide readable status/progress feedback without clutter:
- linear fillbars for most entity stats (health, hunger, progress, cooldown)
- circular fillbars for “core” or “channel” states (charging, absorption, special node cycles)

Fillbars live in **Indicator Layer** and are camera-scaled (readable across zoom ranges).

### 6.2 Bar Types
**A) Linear Fillbar**
- Default orientation: horizontal
- Two anchor modes:
  - Top-anchored (above entity)
  - Bottom-anchored (below entity)
- Fill direction: left → right (default); right → left allowed for specific semantics
- Optional “background rail” + “fill” + “cap” styling
- Supports discrete segments (optional) for “ticks” if needed

**B) Circular Fillbar**
- Arc around an entity or as a ring behind/around an icon
- Used for:
  - charging
  - absorption/processing cycles
  - high-salience node state

### 6.3 Layout Rules (Stacking)
**Linear bars only** participate in stacks.

Stack rules:
- A bar stack belongs to an entity “anchor” (top or bottom).
- Bars are ordered by priority (highest priority nearest the entity).
- Constant spacing between bars (screen-space pixels).
- A stack can contain N bars; N is clamped to avoid unreadable clutter (default 3).
- Bars beyond clamp should be suppressed or merged (design decision per entity type).

Example rule:
- Top stack: progress (closest), then health, then hunger
- Bottom stack: cooldowns / secondary states

### 6.4 Zoom Behavior
- Bar thickness remains within min/max screen-space range
- Bar length scales mildly with zoom but is clamped for readability
- At far zoom, bars may collapse into:
  - a single summarized bar, or
  - a minimal indicator (e.g., one dot / one ring)

### 6.5 API / Integration
Fillbars are created/updated by a BarManager that:
- observes ECS components (value, max, thresholds)
- chooses bar type and placement via configuration
- updates only on value changes where possible (avoid per-frame expensive rebuilds)

The fillbar system must be testable via:
- pure layout math tests (stacking, spacing, clamping)
- value-to-visual mapping tests (threshold colors via palette rules, without Phaser dependency)

---

## 7. Cave Core Display

Representation:
- Black-hole container
- Circular mask
- Optional inner distortion shader (phase 2)
- Two separate eye objects (simple shapes)

Eye behaviors:
- Blink (pulse-synced)
- Track nearby activity / cursor / points of interest (configurable)
- Emotional states (initial set):
  - Idle
  - Content
  - Worried

State selection is derived from runtime signals (e.g., deficits, notoriety pressure).

---

## 8. Swarm System

### 8.1 Face Assembly
Parts:
- Head atlas
- Hair atlas
- Eye atlas

Each face:
- Container
- Eyes glow via mask/glow layer
- Blink animation (pulse-synced; with jitter to avoid perfect sync)

### 8.2 Cloud Layout
Swarm node displays multiple faces:
- Radial/spiral packing
- Faces scale down dynamically to fit node radius
- No per-frame object churn; reuse objects and toggle visibility

### 8.3 LOD
Based on camera zoom:
- Near: individual faces rendered
- Far: single symbolic face with glowing eyes

LOD switch toggles container visibility only; avoid destroying/creating many objects.

---

## 9. Vein System (Power Network)

### 9.1 Representation
- Phaser Rope objects (segmented)
- Organic undulation driven by pulse + noise

### 9.2 Thickness Mapping (Logarithmic)
Width mapping:
```
width = base + scale * log10(power + 1)
```
This ensures perceptual scaling:
- 1 → 10 has similar visual change as 100 → 1000.

### 9.3 Growth Behavior (“Reach Out”)
When target spawns/moves:
- Vein grows toward target (animate length from 0 → full)
- Segment positions interpolate outward
- No snap placement

### 9.4 Undulation
- Segment offsets computed via configurable wave function:
  - sine wave + phase offset per segment
  - amplitude and frequency configurable by vein type
- Optional secondary noise for “organic jitter” (clamped)

### 9.5 Node Integration (Endpoint Tangles / Bounds)
At endpoints:
- Vein clusters create a boundary/tangle around node radius
- Endpoint geometry pulses with global Pulse system
- Endpoint visuals scale with node physical radius
- Vein endpoint contributes to “node silhouette” feel

---

## 10. Camera System

Capabilities:
- Zoom (clamped)
- Pan with inertia
- Bounds padding
- Screen-to-world coordinate mapping
- Selection raycast (world pick)

Constraints:
- Deterministic math
- Unit-testable
- No drift

---

## 11. Performance Model

Must support:
- 100+ faces
- 50+ veins
- Dynamic glow + lights
- Fillbars/indicators for visible entities
- LOD switching

Strategies:
- Prefer reuse over recreate
- Toggle container visibility for LOD
- Clamp light count / radius
- Consider RenderTexture caching for high-count visuals
- Debug FPS overlay and counters (faces, veins, lights, draw calls where possible)

---

## 12. Debug & Profiling Controls

Runtime toggles:
- Disable lights
- Disable veins
- Disable swarm animation
- Disable pulse
- Disable fillbars
- Show power values (veins)
- Show LOD state (swarm)
- Show counts (entities/faces/veins/lights) + FPS

---

## 13. Milestone Roadmap

### Phase 1 — Foundations
- Camera
- Layer stack
- Pulse system integration
- ECS → visual sync contract

### Phase 2 — Static Nodes + Indicators
- Icon atlas + binding
- Fillbar system (linear + circular) + stacking rules
- Glow/light logic (heat/XP as VFX)

### Phase 3 — Cave Core
- Black hole + eyes
- Blink + eye motion
- Emotional states (content/worried)

### Phase 4 — Swarm
- Modular face assembly
- Packing layout
- LOD switching

### Phase 5 — Veins
- Rope base
- Log width mapping
- Growth behavior
- Undulation
- Endpoint tangles / node bounds integration

### Phase 6 — Integration & Hardening
- Performance budgets + kill switches
- Debug overlay polish
- Regression tests for math/layout systems

---

## 14. Non-Goals
- Decorative environment art
- Manual per-entity bespoke animation work
- Simulation mutation from visuals
- Per-frame object churn
- Palette drift

---

## 15. Definition of “Production-Quality Foundation”
Complete when:
- Visual grammar is coherent across entity types
- Swarm scales without performance collapse
- Veins communicate power through thickness and motion
- Cave feels alive (eyes + states)
- Fillbars/indicators are readable and uncluttered
- New content can be added without architectural rewrites
