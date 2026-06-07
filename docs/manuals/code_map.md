# Cave Code Map — verified runtime models

How Cave's core subsystems *actually behave* at runtime (as opposed to how schemas and symbol names suggest they
behave), every claim anchored to `file:line`. Source of truth for behavior questions. Read the relevant section
before reasoning about or changing a subsystem.

**Discipline:** every claim is backed by a real read. When one is found wrong, overwrite it — a stale map is worse
than none. Re-verify after major refactors.

_Last verified: §1–6 on 2026-06-03, working tree (pre "tranche-1" body/assignment redesign); §7 (linker) added 2026-06-07 (MAP atlas). Per-section freshness is gated by `code_map.manifest.json` + `npm run code-map:check`._

## 1. Body attributes & comfort
Per-body effective attributes, each tick (`processEntity.ts:47-79`):
```
effective = max(1, ceil( baseAttributes + floor(caveAttributes × comfort) ))   // outer ceil is a practical no-op
then trait modifiers applied (SET/ADD/SUB/MULT/DIV)                            // bodyAttributeModifiers.ts:8-48
```
- `baseAttributes` = the body's OWN leveled attributes (`progression.baseAttributes`), grown by the level-up roll.
- `caveAttributes` = cave base + Σ `add_cave_attribute` from the cave's owned **habiti AND understandings**; computed
  once/tick and applied **uniformly to every body** (`resolveEffectiveCaveAttributes.ts:20-32`,
  `resolveOwnedCaveKnowledgeEffects.ts:19-23,61-72`, `BodySystem.ts:61-64,79-88`).
- **`comfort` arrives via a param named `healthMultiplier` — NAMING TRAP** (`BodySystem.ts:79-87`,
  `processEntity.ts:48-56`). `comfort = ((food/food.max)+(heat/heat.max))/2`, clamped [0,1], **defaults to 1 when
  unset** (`worldComfortRules.ts:11,15-60`, `worldState.ts:26,33-36`).

## 2. Power pool & assignment — DECOUPLED today
- **Node power = one global pool.** `AttributePoolSystem` sums each pool-contributing body's stored attributes,
  scaled by `clamp(health/maxHealth,0,1)` as `ceil(attr×eff)`, into `sys_world.state.power_{body,mind,social}`
  (`AttributePoolSystem.ts:18-62`). `EnergyDistributionSystem` distributes ONLY that global supply to `powerSink`
  entities and is **unaware of assignment** (`energyDistributionDemandContext.ts:16-26,37-84`).
- **Assignment has NO effect on power.** `AttributePoolSystem` calls `isPoolContributingBody(entity)` *without* the
  `excludedIds` arg, so assigned bodies feed the pool exactly like idle ones (test:
  `AttributePoolSystem.exclusion.test.ts` expects the assigned body counted). The exclusion path
  (`collectPoolExcludedBodyIds`) is wired ONLY into `killBodiesExcept.ts`. Assignment drives nav/orbit motion,
  kill-protection, and UI — not power. (`AttributePoolSystem.ts:51-57`, `poolContributors.ts:18-32`)
- **Assignment mechanism (universal).** Every body has an owner (`body.assignmentId`, default `sys_world`); invalid
  owners are re-homed to `sys_world` (`BodyAssignmentSystem.ts:26-36`, `AssignmentOwnerValiditySystem.ts:18-30`).
  Drag&drop: a valid `power|processing` drop target sets the owner; a miss restores origin
  (`entityDragController.assignment.ts:42-49`, `resolveDraggedBodyDropTarget.ts`). Acceptance = filter-then-slots
  (slots default ∞) (`assignmentAcceptance.ts:5-39`). Assigned bodies navigate→orbit (`BodyAssignmentSystem.ts:40-61`).
  The authored `assignment` *ability* only configures slots/filter; it is NOT required for a node to receive bodies.
- System order: `AssignmentOwnerValiditySystem → BodyAssignmentSystem → AttributePoolSystem → EnergyDistributionSystem`
  (`main.ts:81-86`).

## 3. Traits
- Schema `{id,label,description?,modifiers?,cycles?,rules?}` (`traits.ts:11-18`). Runtime reads **only `modifiers` +
  `cycles`** (`traitTickUtils.ts:60-73`, `traitCycleUtils.ts:29-58`). Attribute modifiers must target
  `self.body.attributes.{body|mind|social}` to affect attributes (`bodyAttributeModifiers.ts:50-71`).
- **`trait.rules` is DEAD config** — parsed, never executed; no trait→behavior compiler (contrast `bodyCompiler.ts:35-38`
  which folds body `config.rules` into `behavior.rules`). (`BehaviorSystem.ts:53-65`)
- `ADD_TRAIT`/`REMOVE_TRAIT` manipulate trait *instance* ids on a body, never the definition
  (`actionExecutorTraits.ts:29-66`).
- Authored content today: only `cold` (MULT body ×0.5), `starving` (−1 hp/3s), `healing` (+1 hp/5s).

## 4. Assignment filters (including by trait)
- Filter = discriminated union on `kind`: **`required_habiti_all` | `required_traits_all`**, each `{ids:string[]}`
  (`assignmentRules.ts:6-15`). `required_traits_all` requires all ids present in the body's trait-id set =
  union(`body.traits[]`, `entity.traits[].id`) (`assignmentFilterUtils.ts:11-35`).
- Enforced server-side: `canAssignBodyToOwner` checks filter before slots; `AssignBodiesBatchHandler` rejects
  mismatches (`assignmentAcceptance.ts:25-39`, `AssignBodiesBatchHandler.applyUpdate.ts:47-58`). Authored ability
  schema accepts it (`assignment.ts:68`); UI shows "Requires traits:" (`assignmentRequirementsData.ts:8-11`).
- **Filter-by-trait works today, config-only.** Reject-*if-present* would need a NEW kind (e.g. `forbidden_traits_any`).

## 5. Avatar & identity
- Stack = 3 images: glow + silhouette + eyes (`avatarStackRender.ts:48-79`); a scars layer would be a 4th. The
  "silhouette" layer is a FILLED shape drawing **face AND hair** (not a face outline); only the eyes layer is
  face-independent (`AvatarTextureGen.ts:21-72`).
- Appearance = `AvatarAppearanceRegistry.resolve(subjectSeed)`: `GlyphPRNG(epochSeed, fnv1a32(seed))` picks
  face/hair/eye indices from catalogs + eye placement/blink (`AvatarAppearanceRegistry.ts:39-62`). Faces are catalog
  `NormalizedShapePath` polylines.
- **`subjectSeed` is `body_avatar:<identitySerial>`** (via `resolveAvatarSubjectSeed` fallback chain), NOT
  `passport.glyphKey` (which exists but is unrelated) (`AvatarSeedResolver.ts:29-43`, `avatarDisplayKey.ts:13-20`,
  `identityBackfill.ts:32-40`).

## 6. Suspicion / Purge / cycle timing
- Suspicion meter = `sys_world.state.purge_progress.value`. That exact path is the **detection key**:
  `suspiciousActivityCompiler` TAGS blueprints whose `updater` ADDs to it (`suspicious_activity` tag, for UI
  job-cards) (`suspiciousActivity.ts:5`, `suspiciousActivityCompiler.ts:12-16`). The suspicion *level* is the raw
  value, compared to `susDisplays` and read by `purgeEvaluate`.
- Purge config: `maxProgress 100`, `killIntervalSeconds {5,10}`, milestones .25/.5/.75/.9/1.0 (`core.cave:27-71`).
  Ceiling = `purge.maxProgress + purgeProgressMaxBonus` (from `increase_max_purge` habiti) (`purgeEvaluate.ts:44-66`,
  `purgeResolvers.ts:25-28`).
- Cycle: `self.state.cycle.value += (Σ powerSink.allocatedDraw.attr) × global.dt_s`; `baseDemand==maxDemand==inputs`
  (`cycleCompilerAccum.ts:36-59`). Completion = `cycle.value ≥ cycle.max`, where **`cycle.max` = the ability's OWN
  `maxProgress.base` (default 100), NOT `purge.maxProgress`** (`cycleCompiler.ts:16-49`). At full supply, completion
  time = `cycle.max / Σ(inputs)`.

## 7. Module linker — content pipeline (`.cave/.draft/.art/.bp` → `RuntimeCartridge`)
Turns a project dir (`manifest.json` + semantic files) into the cartridge the engine runs. `ModuleLinker.linkProject`
is the LIVE active-cartridge loader (`WorkspaceService.ts:49`) + menu-config loader (`loadMenuAmbientConfig.ts:14`).
Full recovered model, footgun + risk registers: `docs/pdd/atlas/system-truth-atlas.md`.
- **Pipeline** (`ModuleLinker.ts:84-99`): seed empty cartridge (`config = SysConfigSchema.parse({})`,
  `moduleLinkerRuntime.ts:11-18`) → read `manifest.json` (`{files:string[]}`; missing → `LinkerParseError`,
  `ModuleLinker.ts:51-63`) → per file: extension gate `.cave/.draft/.art/.bp`, unsupported → **warn + skip**
  (`ModuleLinker.ts:71-74`) → `parseSemanticFragment` → `mergeSemanticFragment` by kind → `compileRuntimeBlueprints`
  (`new CompilerService().compile()` each, `moduleLinkerRuntime.ts:46-53`).
- **Merge is destructive at boundaries** (`deepMerge.ts:12-25`): an override **`null` ERASES** the base subtree, an
  override **array REPLACES** wholesale; only `undefined` is skipped. Drives cave→`config`, draft→`draft`, art→`assets`.
- **A `.bp` registry KEY is not the blueprint id** — an explicit `blueprint.id` overrides the map key, and an id
  already containing `::` skips namespacing (`linkerUtils.ts:28-32`, `utils/namespaces.ts:2`).
- **`Gatekeeper` does NOT link.** It takes a `ModuleLinker` but only checks `typeof linkProject === "function"`
  (`Gatekeeper.ts:52`); validation is pure schema + FQ-ref collection on the payload. Real linking is `WorkspaceService.ts:49`.
- **`.cave` is TYPED `Partial<SysConfig>` but VALIDATED by a divergent strict schema** (`semanticParser.types.ts:8`
  vs `semanticParser.ts:25-41`): the schema accepts `swarm`/`understanding` (absent from `SysConfig`) and rejects
  `pointer` (present in `SysConfig`) — so `pointer` is unauthorable via `.cave` and the type is a promise unkept.
- **`BlueprintV2Schema` ⊋ the `BlueprintV2` type** (`blueprintV2Schema.ts:21-22` vs `types.ts:28-44`): schema accepts
  `components`/`_editor` the type omits; the linker→compiler step then casts `as unknown as Blueprint` (`moduleLinkerRuntime.ts:49-51`).
- **Never mutation-tested** — `stryker.config.json` mutates `src/engine/compiler/**` only; 36 green tests, adequacy
  ungraded. Error handling is clean (one re-throwing `catch`, `linkerUtils.ts:11-19`); the real silent failures are
  data-shaped — heuristic wrong-pick (`normalizeBpInput.ts:10`) and empty-cartridge-on-typo'd-manifest (`ModuleLinker.ts:12`).

## Corrections ledger — models that were confidently wrong this session
- "Assigned bodies are excluded from the power pool / muscle-or-labour." **Wrong** — assignment has zero power effect
  today (§2).
- "`healthMultiplier` scales by body health." **Wrong** — it's fed comfort (§1).
- "Power nodes can't take bodies (no `assignment` ability)." **Wrong** — assignment is universal (§2).
- "`trait.rules` runs at runtime." **Wrong** — dead config (§3).
- "Filter-by-trait needs a new mechanism." **Wrong** — `required_traits_all` already exists (§4).
- "Avatar seed = `passport.glyphKey`." **Wrong** — it's `body_avatar:<serial>` (§5).
- "Cycle completion uses `purge.maxProgress`." **Wrong** — uses the ability's own `cycle.max` (§6).
