# System Truth Atlas — the module linker (+ compiler fold-in)

**Phase:** MAP (recover truth; characterize and route, never fix).
**Date:** 2026-06-07 · **Base commit:** `182e729` (clean `main`) · **Branch:** `map-experiment-linker`
**Scope:** `src/engine/linker/` (primary, read fresh) + the compiler's PBT-pilot findings (secondary, folded in).
**Data:** every finding here is a tracked record in [`atlas.json`](atlas.json); freshness anchors in [`atlas.manifest.json`](atlas.manifest.json); burn-down trend in [`../atlas-history.jsonl`](../atlas-history.jsonl) → [`../dashboard.html`](../dashboard.html).

This is the four-part MAP deliverable: a **verified code map**, a **footgun register**, a ranked **risk register**, and a **silent-failure census**. Every load-bearing behavioral claim carries a `file:line` anchor or is marked unverified. No production code changed.

---

## Headline — the one call

> **Remediate first: run Stryker (mutation) + targeted PBT on `src/engine/linker`.** [`RISK-linker-001`]

The linker is the **live content pipeline** — `ModuleLinker.linkProject` is *the* active-cartridge loader (`src/engine/workspace/WorkspaceService.ts:49`) and the menu-config loader (`src/ui/runtime/ambient/loadMenuAmbientConfig.ts:14`). It has **36 green tests across 15 files** but is **never mutation-graded**: Stryker's scope is the compiler only (`stryker.config.json:9-13`). So we know the linker *passes its tests*; we do **not** know whether those tests would *fail on a bug*. The compiler pilot just demonstrated the gap is real even on hardened code — a domain-spanning survivor that every hand-written example missed — and explicitly teed up the linker as the place "where the PBT money-metric gets its real test."

One move both retires the top risk and sharpens the rest: mutation survivors in `normalizeBpInput.ts` would directly confirm-or-deny the wrong-blueprint risk (`RISK-linker-002`); survivors in `deepMerge.ts` and `linkerUtils.ts` test the footgun-dense branches (`RISK-linker-004`, `FOOTGUN-linker-003/004`). **Adequacy-unknown is the risk that hides all the others** — convert it to a concrete weak-test list, then PIN those.

---

## Audit notes (Step 0 — audit before authoring)

The inherited recovered-truth was verified, not trusted:

- `npm run code-map:check` → **GREEN, 6/6 sections fresh** (a SHA-freshness check).
- Spot-verified **3 anchors against current code** (not just their SHAs) — all still hold:
  - `healthMultiplier` is fed **comfort** — `BodySystem.ts:80` passes `comfortMultiplier`; `processEntity.ts:47-57` scales the cave→body bonus by it. ✓
  - `cycle.max` = the ability's **own** `maxProgress.base` (default 100), not the Purge ceiling — `cycleCompiler.ts:33-35`. ✓
  - **Assignment has zero power effect** — `AttributePoolSystem.ts:53` calls `isPoolContributingBody(entity)` with no `excludedIds`, so `poolContributors.ts:31` returns `true` for assigned bodies. ✓
- **Verdict: no drift.** The existing `code_map.md` + `CLAUDE.md` footguns are reliable as of 2026-06-07. (Tracked: `CODEMAP-audit-001`.)

**Compiler fold-in** (read cross-branch from `hardening-ii-compiler:docs/hardening-ii-compiler-pilot.md`): the compiler is a **well-pinned zone** (~92.8–93% mutation, break-threshold 90). Two open findings carried in as already-routed tracked items: a latent unreachable-collision bug in `collisionDetectorExtras.ts` (locked by an `it.fails`), and a ~16-survivor dead-code cluster in `storageCompilerReconciler.ts`. (`RISK-compiler-001/002`.)

---

## Verified linker model (Part 1 — code map)

**What the linker is.** A pure-data content pipeline. `ModuleLinker.linkProject(rootPath)` turns a project directory (a `manifest.json` plus semantic files) into a `RuntimeCartridge` the engine runs. The editor *save* path uses two siblings: `ModuleSerializer` (export) and `Gatekeeper` (validate-before-persist).

**The link pipeline** (`ModuleLinker.ts:84-99`):

1. **Seed** an empty cartridge — `createRuntimeCartridge` sets `config = SysConfigSchema.parse({})` (zod defaults), `version` hardcoded `"0.0.1"`, `metadata.id = rootPath` (`moduleLinkerRuntime.ts:11-18`).
2. **Read the manifest** — `${root}/manifest.json`, schema `{ files: string[] }`; missing file → `LinkerParseError`, invalid → `LinkerValidationError` (`ModuleLinker.ts:51-63`).
3. **Per file → fragment** — `readFragment` gates on extension (`.cave/.draft/.art/.bp`); an unsupported extension is **warned and skipped** (`ModuleLinker.ts:71-74`); otherwise `readJson` (missing → `LinkerParseError`) then `parseSemanticFragment` (`ModuleLinker.ts:65-82`).
4. **Merge by kind** — `mergeSemanticFragment` routes `cave→config`, `draft→draft`, `art→assets` through `deepMergeObjects`; `bp→blueprints` through `mergeRegistry(namespaceBlueprints(...))` (`moduleLinkerRuntime.ts:20-44`).
5. **Compile** — `compileRuntimeBlueprints` runs `new CompilerService().compile()` over every blueprint in place (`moduleLinkerRuntime.ts:46-53`).

**Parsing** (`semanticParser.ts:63-83`): an extension→`{kind,schema}` table (`:21-61`); `.bp` input is run through `normalizeBpInput` *first* (`:75`); `safeParse` failure → `LinkerValidationError`. The `.cave` schema is a hand-written `.strict()` literal; `.bp` is `z.record(string, BlueprintV2Schema)`.

**Merge semantics** (`deepMerge.ts:12-25`) — load-bearing and surprising: `undefined` override → keep base; **`null` override → erase** (returns null); **array override → replace** wholesale; object → recurse, later-wins.

**Namespacing** (`linkerUtils.ts:21-43`, `utils/namespaces.ts:1-4`): a blueprint's resolved id is `namespace::key` — **unless** the blueprint carries an explicit `id` (which wins) or that id already contains `::` (namespacing skipped). Duplicate resolved id within one file → `LinkerValidationError`.

**Registry merge** (`registryMerge.ts:11-22`): later blueprint overrides earlier by id; a collision only fires `onCollision` → a **debug** log.

**Serializer (save/export)** (`ModuleSerializer.ts:32-39`): deep-clone, strip the `targetNamespace::` prefix off local refs, drop `_computed` keys. The inverse of namespacing.

**Gatekeeper (validate-before-persist)** (`Gatekeeper.ts:44-87`): `ModuleCartridgeSchema.safeParse` + a recursive collector (`collectRefs`) that flags any fully-qualified `ns::id` string (anchored regex, skips `.id` definition keys) not present among existing blueprint/draft ids; throws `ValidationError`. It **does not link** — see `FOOTGUN-linker-001`.

**Error discipline is clean.** The whole linker has exactly **one** `catch` (`linkerUtils.ts:11-19`, `parseJsonOrThrow`) and it re-throws as a typed `LinkerParseError` with the path. No empty catches, no fire-and-forget, no unchecked subprocess; every `safeParse` checks `.success`. The linker's risk is **not** in lost exceptions — it is in *valid-but-wrong output* (the census below).

**Tests:** 36 pass / 15 files (`npx vitest run src/engine/linker`, 1.47s). **Mutation: never run.**

---

## Footgun register (Part 2) — 6 entries

Each is a place a name / type / signature **contradicts** verified behavior. Full records in [`atlas.json`](atlas.json).

| id | Appearance → Reality | Anchor |
|---|---|---|
| `FOOTGUN-linker-001` | `Gatekeeper(linker)` looks like it links to validate → it only checks `typeof linkProject === "function"`; validation is pure schema + ref-walk. The real linking is `WorkspaceService.ts:49`. | `Gatekeeper.ts:45,52` |
| `FOOTGUN-linker-002` | `.cave` fragment typed `Partial<SysConfig>` → validated by a **separate** `.strict()` literal that adds `swarm`/`understanding` and **omits `pointer`**. The type is a promise the validator doesn't keep. | `semanticParser.types.ts:8` vs `semanticParser.ts:25-41` |
| `FOOTGUN-linker-003` | A `.bp` map **key is the id** → an explicit `blueprint.id` overrides the key, and a pre-`::`'d id skips namespacing entirely. | `linkerUtils.ts:28-32`, `namespaces.ts:2` |
| `FOOTGUN-linker-004` | "deepMerge" implies accretive combine → **`null` erases** the base subtree and **arrays replace** wholesale. | `deepMerge.ts:14-15` |
| `FOOTGUN-linker-005` | `compileRuntimeBlueprints` reads as a typed step → it bridges linker→compiler types with a double `as unknown as` cast. | `moduleLinkerRuntime.ts:49-51` |
| `FOOTGUN-linker-006` | `BlueprintV2Schema` ≈ `BlueprintV2` type → the schema accepts `components`/`_editor` the type omits; a `components`-form blueprint validates but is invisible to the type. | `blueprintV2Schema.ts:21-22` vs `types.ts:28-44` |

> This is a footgun-rich subsystem, as expected for a DSL semantic linker. 002/003/004 are the dangerous ones — they govern *what data ends up in the cartridge* and each invites a wrong edit.

---

## Silent-failure census (Part 3) — 4 sites (2 real, 2 benign)

The exception-shaped lexical seeds (empty catch / floating promise / unchecked subprocess) found **nothing** in the linker. Its silent failures are **data-shaped** — found only by reading the data path.

| id | Site | Class | Why |
|---|---|---|---|
| `NSF-linker-003` | `normalizeBpInput` first-entry guess (`normalizeBpInput.ts:10,21`) | **real** | On an ambiguous `.bp` shape it picks `entries[0]`; a wrong pick yields a schema-valid blueprint that links & ships untraced. |
| `NSF-linker-004` | Manifest `files` defaults to `[]` (`ModuleLinker.ts:12`) | **real** | A typo'd manifest key validates → empty cartridge, no error — indistinguishable from an intentionally empty project. |
| `NSF-linker-001` | Unsupported-extension skip (`ModuleLinker.ts:71-74`) | benign | Has a `warn` trace (observed firing on a `flow.cvs` typo in tests), but warn-level — a mis-extensioned content file is dropped while the build "succeeds". |
| `NSF-linker-002` | Blueprint id collision override (`registryMerge.ts:18`) | benign | Intended mod-layering, but the only trace is a **debug** log — an accidental clash reads as a silent override outside debug runs. |

---

## Risk register (Part 4) — ranked by P(wrong) × cost

Each risk carries a **falsifiable condition**: the observation that would confirm it, turning it into a PIN/SHIP target instead of a worry. Full evidence + links in [`atlas.json`](atlas.json).

| # | id | Risk | P×cost | Falsifiable condition | Route |
|---|---|---|---|---|---|
| 1 | `RISK-linker-001` | Linker tested but **never mutation-graded** — adequacy unknown | high×high | Stryker on `src/engine/linker` reports survivors that are **weak tests**, not dead code | **SHIP** |
| 2 | `RISK-linker-002` | `normalizeBpInput` first-entry heuristic can ship the **wrong blueprint**, no error | med×high | An ambiguous multi-key `.bp` links to a different blueprint than authored, no `LinkerValidationError` | PIN |
| 3 | `RISK-linker-003` | `.cave` schema **drifted** from `SysConfig`: `pointer` unauthorable; `swarm`/`understanding` land untyped | high×med | A `.cave` with `pointer` is rejected; one with `swarm` lands that key in `runtime.config` though `SysConfig` omits it | PIN |
| 4 | `RISK-linker-004` | `BlueprintV2` type narrower than its schema, then **cast unchecked** to the compiler `Blueprint` | med×med | A `components`-form blueprint loses data through link→serialize, or reaches `compile()` mishandled | PIN |
| 5 | `RISK-linker-005` | Manifest `files` default-`[]` → silent empty cartridge | low×med | A typo'd manifest key links to an empty cartridge with no trace | SHIP |
| 6 | `RISK-compiler-001` | `collisionDetectorExtras.ts` latent bug (unreachable collision) | confirmed×med | Already locked by an `it.fails`; fixing flips it green | routed |
| 7 | `RISK-compiler-002` | `storageCompilerReconciler.ts` ~16 dead-code survivors | confirmed×low | Deleting the subsumed predicate + dead reads keeps the suite GREEN | routed |

Three **coverage-gap** targets sit under `RISK-001` as the first places a mutation run should bite: `normalizeBpInput.ts` (`CG-linker-001`, branch-dense + the wrong-pick heuristic), `deepMerge.ts` (`CG-linker-002`, the null-erase/array-replace branches), `linkerUtils.ts`/`namespaces.ts` (`CG-linker-003`, the id-override branch).

---

## Scope & honesty (what I did *not* map)

Scoped by attention to the load-bearing data paths, **not** uniform depth:

- **Mapped deep:** the link pipeline, merge semantics, normalization, namespacing, the serializer, the Gatekeeper — where the footguns and silent failures live.
- **Mapped light (read, low-risk):** the `.art`/`.draft` zod schemas (`semanticArtSchema.ts`, the draft branch of `semanticParser.ts`) — thin validation passthroughs; `errors.ts` (two trivial Error subclasses).
- **Did not enter:** `CompilerService.compile` internals — that's the compiler, separately hardened (~93% mutation) and covered by its own pilot. The linker→compiler boundary is recorded as a footgun (`FOOTGUN-linker-005`), not traced further.
- **Asserted-not-verified consequences** (marked as the falsifiable half of their risk): whether `swarm`/`understanding` config keys are *consumed* anywhere (`RISK-003`); whether a `components`-form blueprint actually loses data downstream (`RISK-004`). These are PIN experiments, not claims.

---

## Decisions, not actions

- **Severity calls.** `RISK-002` is rated **high** despite *medium* probability — a silently-wrong blueprint in the live content pipeline is severe enough that the probability doesn't have to be high. `RISK-003`'s probability is "high" because the drift is **already verified present**, not predicted; its severity is held to medium because the blast radius is bounded (one unauthorable key + untyped extras).
- **Footgun vs risk split.** The `.cave` drift appears as both `FOOTGUN-linker-002` (the name-lie: typed `Partial<SysConfig>`) and `RISK-linker-003` (the rankable consequence), linked. Same for `FOOTGUN-006`/`RISK-004`. The footgun records the contradiction; the risk records the danger.
- **The remediate-first pick is a leverage call, not just the top score.** `RISK-001` ranks first on P×cost *and* it's the move that makes 002–005 checkable (its survivors land on exactly their modules). It's also the move the compiler pilot already pointed at.
- **Compiler findings kept `routed`, not `open`.** They already have homes (background tasks) and an `it.fails` lock, so they don't inflate the open burn-down — but they're tracked so the atlas is the single inventory.
- **Couldn't verify within MAP scope:** the actual mutation-survivor set (needs a Stryker run — that *is* the remediate-first action) and the downstream fate of the untyped `.cave` keys. Both are recorded as falsifiable conditions, not asserted.

---

*Generated by the MAP move of Proof-Driven Development. Inventory: [`atlas.json`](atlas.json) · Freshness: [`atlas.manifest.json`](atlas.manifest.json) · Trend: [`../dashboard.html`](../dashboard.html).*
