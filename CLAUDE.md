# CLAUDE.md — Cave

Browser management/sim game. Content is data (JSON blueprints) compiled by an HLL→LLL compiler into runtime
components; engine systems run it. See `README.md`, `docs/manuals/` (DSL, HLL, data architecture), and especially
**`docs/manuals/code_map.md`** — verified runtime models with `file:line` anchors. Read the relevant section there
before reasoning about any subsystem's *behavior*.

## Working rules (they exist because they were repeatedly violated)

1. **Read the system; don't infer from names, greps, or schemas.** In this repo, symbol and param names lie (see
   footguns). For any load-bearing claim about *runtime behavior*, open and read the actual file. A grep hit or a
   type is a lead, not a fact.
2. **Determinism is required.** Anything random (events, trait rolls, avatar shape) must derive from
   `(worldSeed/epochSeed, stableId)` — the headless balancing runner replays runs and cannot tolerate
   `Math.random()`. The avatar already does this (`AvatarAppearanceRegistry`); follow that pattern.
3. **Data vs engine.** Costs/thresholds/content live in data (`config.*`, blueprints); execution lives in engine
   systems. Prefer data changes; the compiler overwrites hand-edited compiled components.

## Footguns (verified, with anchors)

- **`healthMultiplier` is actually COMFORT.** `BodySystem` passes `worldState.comfortMultiplier` into a param named
  `healthMultiplier`; it scales the cave→body attribute bonus. Not health. (`BodySystem.ts:79-87`,
  `processEntity.ts:48-56`)
- **Assignment has ZERO effect on power.** Node power = one global pool (`AttributePoolSystem` →
  `sys_world.state.power_*`); the energy path ignores assignment, and the pool does NOT exclude assigned bodies (the
  exclusion arg is omitted — see `AttributePoolSystem.exclusion.test.ts`). Assignment only drives nav/orbit motion,
  kill-protection, and UI. (`AttributePoolSystem.ts:51-57`, `poolContributors.ts:18-32`)
- **The `assignment` *ability* ≠ the assignment *mechanism*.** Any body is drag-assignable to any node (owner = node,
  default `sys_world`); the authored `assignment` ability only configures slots/filter. "No ability" ≠ "unassignable".
  (`BodyAssignmentSystem.ts`, `resolveDraggedBodyDropTarget.ts`)
- **`trait.rules` is dead config.** `TraitDefinition.rules?: BehaviorRule[]` is parsed but never executed (no
  trait→behavior compiler). Only `modifiers` + `cycles` run. (`traits.ts:17`, `traitTickUtils.ts:60-73`)
- **Filter-by-trait already exists.** Assignment filters support `required_traits_all`, not just
  `required_habiti_all`, enforced server-side. (`assignmentRules.ts:6-15`, `assignmentFilterUtils.ts:24-35`)
- **Two unrelated `maxProgress`.** A cycle's `maxProgress.base` (per-ability, default 100 → `state.cycle.max`) is NOT
  `config.purge.maxProgress` (the Purge ceiling, also 100). They share a default and nothing else.
  (`cycleCompiler.ts:16-49`)
- **Avatar seed is `body_avatar:<identitySerial>`**, not `passport.glyphKey`. (`AvatarSeedResolver.ts:29-43`,
  `identityBackfill.ts:32-40`)

_Last verified: 2026-06-03 against the working tree. When a claim here proves wrong, FIX it — a stale footgun is
worse than none._
