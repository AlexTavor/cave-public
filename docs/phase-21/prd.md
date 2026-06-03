# Phase 21 — Bodies as Individuals (PRD)

**Status:** Draft · **Branch:** `phase-21-bodies-as-individuals`
**Verified foundation:** `docs/manuals/code_map.md` (§1–§6). Every "today" claim below is anchored there; changes to
those files will flip their map sections STALE — re-bless is part of done (see §"Methodology").

---

## 1. Problem & motivation

Bodies are **fungible** today: a living body's attributes are `base + caveBonus×comfort` (uniform cave bonus) — its
*identity* (habiti) only pays out as cave bonus **on absorption**, never as a personal, living difference
(`code_map.md` §1). So you can't tell one body from another in play, losing a body costs nothing emotional, and the
rich habiti content is homogenised into three pooled numbers.

Making bodies **individuals** — each with its own traits, visible marks, and a legible contribution to the node it
works — is the foundation that makes the game *engaging* (you care about specific bodies), *less confusing* (a body's
look tells you what it's for), and *challenging via stakes* (an individual you invested in is worth protecting). It is
also the prerequisite for the later "events / gambling" layer (Phase 22).

## 2. Goals

- A body's **own traits** give it **personal** attribute bonuses/penalties, distinct from the cave-wide habiti bonus.
- Traits are **legible**: visible on the avatar (marks layer) and usable as **assignment filters**.
- A power node's output is driven by **the bodies assigned to it**, not a global pool — so *which* body you put
  *where* matters and is visible.
- Determinism preserved end-to-end (the headless balancing runner must replay runs).

## 3. Non-goals (explicitly out of scope for Phase 21)

- The **random events / "gambling"** system (dynamic trait add/remove from hazards) → **Phase 22**, builds on R1.
- **XP-by-action.** Rejected — the existing random, strength-weighted level-up stays unchanged.
- **Training / recuperation nodes.** Deferred.
- Any change to the **assignment mechanism, slots, drag&drop, or orbit** — they already exist and are sufficient
  (`code_map.md` §2; `resolveDraggedBodyDropTarget` already types targets `power|processing` and enforces slots/filter).
- **Trait indicator badges *around* the avatar** (an at-a-glance ring/readout of a body's full trait set) → **Phase
  22**. Distinct from R4's on-face procedural *marks* (scars/eyepatch for permanent physical statuses), which stay in
  Phase 21.

## 4. Verified foundation this design relies on

| Fact (verified) | Anchor | Consequence for this phase |
| --- | --- | --- |
| Trait engine applies `modifiers`/`cycles` to body attributes; **`trait.rules` is dead** | code_map §3 | Reuse traits for body bonuses; never author `trait.rules`. |
| Cave→body bonus is **comfort-scaled and stays** | code_map §1 | Traits are *additive on top*, not a replacement. |
| **Assignment has zero effect on power today** (pool is assignment-blind) | code_map §2 | R2 is a *coupling*, not an un-wiring; no exclusion logic to undo. |
| Assignment + drag&drop + slots + filter + orbit already exist | code_map §2 | R2/R5 need **no** assignment or UX work. |
| **`required_traits_all` filter exists** and is enforced server-side | code_map §4 | R5 is config-only once the trait + `forcedTraits` exist. |
| Avatar = 3-layer stack; seed = `body_avatar:<identitySerial>` | code_map §5 | R4 adds a 4th layer, seeded the same way. |

## 5. Requirements

### R1 — Body trait system
- **R1.1** Add `excludes: string[]` to `TraitDefinition` (mirror habiti `excludes`). Mutually-exclusive traits cannot
  co-exist on a body.
- **R1.2** Add `associatedTraits: string[]` to `HabitusDefinition`. Granting a habitus to a body (spawn `forcedHabiti`
  or `GAIN_HABITI`) also grants its associated traits to **that body**. *Example:* `Beautiful` habitus → `Beautiful`
  trait.
- **R1.3** **Body vs cave split.** Habiti continue to give **cave** bonuses (comfort-scaled to all bodies, unchanged).
  Traits give **personal** bonuses to the **owning body only**, applied via existing `bodyAttributeModifiers`
  (targets `self.body.attributes.*`). Traits may be negative or zero-effect (condition-only).
  - **R1.3a (D2/D7)** A habitus-**associated** trait's effect defaults to the linked habitus's effect **× a
    data-defined default multiplier** — a config value authored in the `.cave` file (currently **3**), not a hardcoded
    constant — with the effector switched from `cave` to `body`/`assigned_node`: `Beautiful` cave +3 social →
    `Beautiful` trait **+9 social** on the body. Overridable per trait; the multiplier is a balance lever.
  - **R1.3b (D1)** Trait bonuses are **comfort-independent** — applied intact regardless of comfort; only the cave's
    contributed bonus is comfort-scaled.
- **R1.4** **Seeded random trait roll** at body generation: roll **0–3** traits (weighted heaviest on 0, lightest on
  3 — D4) from the pool of **free** traits (those not `associatedTraits` of any habitus), respecting `excludes`, in
  addition to the habitus-linked traits. Must derive from `(worldSeed, bodyId)` — no `Math.random`.
- **R1.5** **`forcedTraits: string[]`** on the spawner ability (mirror `forcedHabiti`), applied on the spawn path.
- **R1.6** **Permanent body-only statuses** (e.g. `one_eyed`, `strong`) are ordinary traits that confer **nothing to
  the cave** on absorption. Traits do **not** transfer on absorption (only habiti do); a body's traits die with it.
- **R1.7** A trait carries an optional `visual` descriptor consumed by R4.
- **R1.8** **Effects & effectors — generalize the effect model.** Today's effect types bake the carrier into the name
  (`add_cave_attribute`, `add_resource_gain_multiplier`, …). Split them:
  - An **effect** is the change *only*, carrier-agnostic: `attribute(±N)`, `resource_gain_multiplier(resource, ×M)`,
    `producer_output_multiplier(producerTag, ×M)`, `absorption_xp_conversion(×M)`, `max_purge(+N)`.
  - An **effector** is the activation scope/condition that decides *where* the effect lands and *how it aggregates*:
    `cave` (uniform; carrier owned by the cave — today's habitus behavior; owned once → applied once), `body` (the
    owning body), or `assigned_node` (the node the carrying body is assigned to, while assigned; **stacks** — R2.5).
    Designed to generalize to richer conditions later (e.g. "while wounded") without new effect names.
  - Habiti and traits both carry `(effect, effector)` pairs from **one shared vocabulary**. Habitus effects use the
    `cave` effector; **trait effects are restricted to `body` or `assigned_node`** (D5 — a living body never has
    cave-global reach, so `max_purge`/`absorption_xp_conversion` are habitus-only).
  - **`modifiers`/`cycles` vs `effects` — verified boundary (D8).** `modifiers` (always-on `PassiveEffect[]`) and
    `cycles` (periodic) are a general **state-path mutator**: `applyPassiveEffects` computes a value, `applyPendingUpdates`
    commits it routed by prefix (`self.state.*`, `self.powerSink.*`, `self.body.{health,maxHealth,xp,level,
    baseAttributes.*}`) — but **`self.body.attributes.*` is explicitly skipped** (`passiveEffectsSystemUtils.ts:89`)
    because `bodyAttributeModifiers` owns effective attributes (no double-apply). New model: **effective-attribute /
    resource / producer changes move to typed `effects`**; `modifiers`/`cycles` keep only health (`starving`/`healing`),
    `powerSink`, `baseAttributes`, custom state. `cold` (`MULT attributes.body ×0.5`) becomes an `attribute(×0.5)`
    effect with a `body` effector, retiring the `:89` special-case.
  - **Scope of work:** this **refactors** the existing habitus effect schema (`habitusEffects.ts`) and accumulation
    (`resolveOwnedHabitiEffects` / `resolveOwnedCaveKnowledgeEffects`) — it is *not* additive. Treat as the R1
    foundation; land and re-bless before dependent work.
- **R1.9** **One-time data migration (D1).** The effect/effector rename breaks every existing habitus authored against
  the old schema (~40 in `core.cave`: `add_cave_attribute`, `add_resource_gain_multiplier`, …). Ship a **one-time
  migration** rewriting existing habiti `effects` to the new `(effect, effector: cave)` shape. Gate: the migrated
  cartridge loads, and the six code-map behaviors are provably unchanged.

### R2 — Power from assigned bodies (replaces the global pool)
- **R2.1** A power node's per-attribute draw = **Σ over its assigned bodies** of that body's effective attribute
  (`base + caveBonus×comfort + trait modifiers`, per code_map §1), capped by the node's `inputs` demand.
- **R2.2** Preserve the **weakest-attribute (Liebig) efficiency** at the **node** level: a node runs at the efficiency
  of its most-starved demanded attribute given its assigned bodies.
- **R2.3** **Retire and remove the global pool/distribution** (`AttributePoolSystem`'s global write +
  `EnergyDistribution`'s global supply, code_map §2) — no fallback (D3). **But re-home, do not delete, the
  demand-allocation + min-attribute (Liebig) efficiency** (`resolveSinkEfficiency`) into per-node sourcing (R2.2) — it
  currently lives *inside* the system being removed. And `processEntity`'s per-body attribute computation (incl.
  **comfort-scaling**) **stays** — only the global *aggregation* is removed, not the per-body math. Idle bodies (owner
  `sys_world`) contribute to nothing.
- **R2.4** **No** change to assignment, slots, drag&drop, orbit, or acceptance. (`code_map.md` §2.)
- **R2.5** **Per-node production/resource multipliers from assigned bodies (`assigned_node` effector).** A node's
  output / resource-gain is multiplied by its assigned bodies' `resource_gain_multiplier`(resource) and
  `producer_output_multiplier`(producerTag) effects — parallel to the attribute sourcing in R2.1. These effects
  **stack by sum across every body assigned to that node**: N lumberjacks on one wood node give N× the per-body wood
  bonus. This extends, **per-node**, the currently cave-global path (`resolveOwnedHabitiEffects` →
  `enqueueResourceGainBonusStateSync` → world-state multipliers → production/gain). Cave-owned **habitus** multipliers
  (`cave` effector) stay global; **body-trait** multipliers (`assigned_node`) add per-node; the two stack, **bounded
  by the node's slot count** (R2.4) — no separate cap (D6). (LLD: locate the production-output read seam and make it
  assigned-body-aware.)

### R3 — Veins reflect the new power flow
- **R3.1** Render power veins **body → the node it is assigned to** (replacing cave→node power veins).
- **R3.2** Reuse the existing per-attribute vein colours (body/mind/social) for hue, and contribution magnitude for
  thickness/flow.

### R4 — Avatar marks layer (visible statuses)
- **R4.1** Add a **4th image** to the avatar stack (`code_map.md` §5) for marks; do **not** alter the face/eyes
  generation.
- **R4.2** Marks are drawn procedurally in the face's normalised space (reuse `glyphTextureDrawStroke`), placement
  seeded from `(subjectSeed, traitId)` so a body's mark is stable and differs across bodies.
- **R4.3** A trait's `visual` descriptor names one primitive: `stroke` (scar) · `patch` (eyepatch, placed from eye
  coords) · `tint` (pallor) · `emblem` (brand). Abstract traits with no facial form carry no `visual` (inspect-panel
  only).
- **R4.4** Legibility: render ≤2 defining marks at world scale (silhouette/eye-region/tint); the rest in the inspect
  panel. Cache the marks texture by `(appearanceKey, trait-set)`.

### R5 — Filter-by-trait acceptance (lure_accountant)
- **R5.1** Convert `lure_accountant` to filter by trait: tag the lover's body with an `accountants_lover` trait
  (via `forcedTraits`, R1.5) and set the node's assignment filter to
  `{ kind: "required_traits_all", ids: ["accountants_lover"] }` — replacing the `required_habiti_all`
  Woman+Shaman+Heterosexual soup. **Config-only** (engine already supports it, code_map §4).
- **R5.2 (D4)** The **upstream** action that spawns the lover's body (the investigate chain) must apply
  `forcedTraits: ["accountants_lover"]` (R1.5) — `lure_accountant` only *filters*; it does not create the lover. LLD:
  identify that spawn and add the forcedTrait there, or the filter matches nothing.
- **R5.3** **`trick_accountant` gates differently — not an assignment filter (verified).** It is a cycle node gated by
  a `conditionalActivation` `fact_threshold` on **`habitus_owned`** (a permanent *cave* fact), with **no
  `assignment.filter`**. So converting its body-gate to trait-based is **not** config-only like R5.1: traits live on
  living bodies, not as cave facts, so `habitus_owned` has no direct trait equivalent. LLD: choose between (a) a **new
  condition kind** — "a living body carrying trait X exists / is assigned" — usable inside `conditionalActivation`, or
  (b) restructuring the node's gate; first confirm whether any body-trait condition kind already exists.

## 6. Cross-cutting: determinism

Every new random draw (R1.4 trait roll, R4.2 mark placement) MUST derive from a stable seed — **`epochSeed` +
`identitySerial`** (D10), the same basis as `AvatarAppearanceRegistry`, so a body's traits and marks derive
consistently (and re-roll per run/rebirth, since bodies are per-run). CI/headless replay is a release gate;
`Math.random()` is forbidden in sim/content paths.

## 7. Resolved decisions (locked 2026-06-03)

- **D1 — Comfort does NOT scale trait bonuses.** A body's own traits are intrinsic and apply intact regardless of
  comfort; only the cave's contributed bonus is comfort-scaled. (Folded into R1.3.)
- **D2 — Body traits are ×3 the linked habitus's cave bonus** (default). E.g. `Beautiful` habitus gives the cave
  +3 social → the `Beautiful` trait gives the owning body **+9 social**. Overridable per trait. The ×3 ratio is the
  use-it-or-absorb-it dial. (Folded into R1.3.)
- **D3 — Retire and remove** `AttributePoolSystem` + `EnergyDistribution` (full clean-up, no fallback). (Folded into R2.3.)
- **D4 — Random free traits: 0–3, weighted heaviest on 0 and lightest on 3**, in addition to the habitus-linked ones.
  (Folded into R1.4.)

## 8. Acceptance criteria

_Criteria are deliberately **qualitative / relative** (comparisons, not absolute magnitudes) so they survive balance
retuning (D9) — each is testable headlessly as "strictly more/less than an otherwise-identical body without the trait."_

- A body spawned with `forcedHabiti:[Beautiful]` carries the `Beautiful` trait and shows its body-level bonus;
  re-spawning with the same `(worldSeed, bodyId)` yields identical rolled traits (determinism test).
- Assigning a high-`mind` body vs a low-`mind` body to a mind node produces visibly different node throughput
  (per-node sourcing, R2).
- A body carrying a `lumberjack` trait (`add_resource_gain_multiplier: wood`) assigned to a wood node yields more wood
  than a generic body on the same node; un-assigning it removes the bonus (R1.8 / R2.5).
- `lure_accountant` accepts only a body carrying `accountants_lover` and rejects others, enforced server-side (R5).
- A `one_eyed` trait renders an eyepatch on the avatar; absorbing that body grants the cave its **habiti** but not the
  `one_eyed` trait (R1.6, R4).
- `npm run code-map:check` is green at merge: every map section whose source files changed has been re-blessed with a
  note (see Methodology).
- Full suite + coverage gates pass; headless replay is deterministic.

## 9. Risks

- **Currency/indicator overload** — traits + marks + attributes + habiti. Mitigate with R4.4's ≤2-mark rule and
  inspect-panel overflow.
- **Power-sourcing perf** — per-node summation over assigned bodies each tick vs one global pool. Profile in LLD.
- **Scope creep into events** — keep R1 the *data model*; dynamic add/remove is Phase 22.
- **Effect-model refactor touches working habitus code** (R1.8) — the effect/effector split changes
  `habitusEffects.ts` + accumulation, not just additive trait code. It is the R1 foundation: land it, re-verify, and
  re-bless `code_map.md` §1/§6 (which reference `resolveOwnedCaveKnowledgeEffects`) before building dependents.

## 10. Methodology (definition of done)

This phase edits files tracked by the Code Map — at minimum §1 (body attrs), §2 (power/assignment), §3 (traits), §4
(filters), §5 (avatar). Per `docs/methodology/code-map.md`: when an edit changes a documented behavior, **re-read and
reconcile that section, then `npm run code-map:bless -- <section> --note "…"`**. The CI gate (`.github/workflows/
code-map.yml`) fails the PR if any touched section is left stale. The map must describe the *new* behavior at merge —
e.g. §2 must be rewritten from "power is assignment-blind" to "power is sourced from assigned bodies."

This phase also makes **new** areas load-bearing — effect accumulation + effectors (`resolveOwnedHabitiEffects`), the
production-output read seam, the spawn/`forcedTraits` path, and body generation. Per the methodology (D11) these earn
**new code-map sections**, bootstrap-blessed as they land — not just re-bless of the existing six.
