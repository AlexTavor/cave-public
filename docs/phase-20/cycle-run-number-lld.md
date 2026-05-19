# LLD — Run Number Fact + `Cycle #` Run-Start Banner

## 1. Why

The game already has two relevant primitives in place:

1. **World facts** stored on `sys_world.run` and `sys_world.permanent`, adjusted through `ADJUST_FACT` and consumed by structured conditions.
2. **Cinematic-style presentation** already used by the full-screen cinematic overlay.

The requested feature needs both of these, but with strict constraints:

- it must **not invent a parallel progression state**;
- it must **not mutate runtime state directly from React**;
- it must **not delay the run-number fact until later ticks** if the fact is expected to be usable in authored Conditions at run start;
- it must **reuse existing fact, command, telemetry, and UI-store mechanisms** rather than introducing a second bespoke lifecycle.

This design therefore treats the run number as a **world fact authored through the existing command pipeline**, and treats the banner as a **UI-only event derived from applied commands**, matching the project rules that commands drive state and UI only observes semantic state. This matches the architectural laws in the uploaded context pack and prompt contract, including command-pipeline mutation, UI observation-only behavior, and no speculative refactors. fileciteturn3file0 fileciteturn3file2

---

## 2. What

### 2.1 User-visible behavior

At the start of every new run:

- a non-interactive banner appears at the **top center of the gameplay viewport**;
- the text is exactly:
  - `Cycle #1` for the first run,
  - `Cycle #2` for the second run,
  - etc.;
- the text uses the **same friendly visual language as the existing cinematic text**;
- it **fades/slides in**;
- it remains fully visible for **5,000 ms after the enter animation completes**;
- it then **fades/slides out upward**;
- it never blocks clicks, pointer input, or simulation;
- only one banner may be active at a time; a newer run-start event replaces the currently displayed banner immediately.

### 2.2 Fact behavior

A new fact type is added:

- `factType`: `run_number`
- `factAbout`: `world`

At the start of each run, the system seeds:

- `sys_world.run.run_number.world = current run number`
- `sys_world.permanent.run_number.world = current run number`

Example:

- first run start ⇒ both values become `1`
- rebirth from run 1 ⇒ both values become `2`
- rebirth from run 2 ⇒ both values become `3`

### 2.3 Scope semantics

This is intentional and not redundant.

- `permanent.run_number.world` is the carryover source across rebirth, because the existing rebirth flow already persists permanent facts.
- `run.run_number.world` is seeded at the beginning of the current run so authored Conditions can use **run scope** without requiring authors to reason about rebirth persistence internals.

### 2.4 Explicit non-goals

This change does **not**:

- introduce a new save-data format;
- introduce a new runtime command type;
- change how generic fact evaluation works;
- change authored content files;
- retroactively show the banner on save-load;
- preserve run count across a true fresh new-game lineage reset outside the existing rebirth/permanent-fact flow.

---

## 3. Current code facts this design is based on

### 3.1 Facts and Conditions already support generic world facts

The current condition compiler already resolves most fact-threshold conditions generically as:

- `sys_world.<scope>.<factType>.<factAbout>`

Only `throttle_level` and `cave_status` are special-cased. Therefore a new `run_number` fact type does **not** require a new evaluator path.

### 3.2 Fact storage is already open-record based

Facts are stored as sparse nested maps under `run` and `permanent`. `adjustFact()` creates missing maps lazily and clamps at zero. No schema migration or handler redesign is needed.

### 3.3 Rebirth already carries permanent facts forward

`gameRebirthCommand` already extracts permanent facts from the previous runtime and re-enqueues them into the fresh runtime. This existing path is the correct place to compute the next run number for rebirth-driven run transitions.

### 3.4 The main-menu start flow already has a post-cinematic control point

The current `handleCinematicComplete()` path runs `example/scripts/start.cvs`, restores tutorial session state, resumes gameplay, and closes the cinematic overlay. That is the correct start-of-lineage integration point for run 1.

### 3.5 UI runtime events already derive from applied commands

`runtimeFactory.ts` already turns applied commands into UI events/stores for cinematics, notifications, callouts, and visual effects. The run-start banner should use the same observation pattern.

---

## 4. Design

## 4.1 Data contract

### New fact type

Add `run_number` to `FactTypeSchema`.

### Fact authoring contract

The only valid authored `factAbout` for `run_number` is `world`.

The editor autocomplete must therefore treat `run_number` the same way it currently treats other world-scoped fact types such as `elapsed_real_seconds`, `elapsed_game_seconds`, `active_bodies`, and `purge_began`.

### Invariants

For any active run after bootstrap completes:

- `run.run_number.world` exists and is a finite positive number;
- `permanent.run_number.world` exists and is the same number;
- neither value changes again until the next run begins.

---

## 4.2 Run-number bootstrap algorithm

A dedicated helper will bootstrap the run number through the existing `ADJUST_FACT` command pipeline.

### Inputs

- `previousRunNumber`: the last completed/current permanent run number from the previous lineage state
  - fresh new lineage: `0`
  - rebirth: previous runtime’s `permanent.run_number.world` or `0`

### Output

- `nextRunNumber = max(0, finite(previousRunNumber) ? previousRunNumber : 0) + 1`

### Commands enqueued

1. `ADJUST_FACT(scope: "run", factType: "run_number", factAbout: "world", delta: nextRunNumber)`
2. `ADJUST_FACT(scope: "permanent", factType: "run_number", factAbout: "world", delta: 1)`

### Why this shape is correct

- `run` scope starts empty on a fresh runtime, so adding `nextRunNumber` writes the absolute current run number into the current run.
- `permanent` scope either starts empty (fresh start) or is rehydrated/re-enqueued from the prior lineage (rebirth). Adding `1` advances the permanent counter by exactly one run.

### Important constraint

This helper must **only** be called by run-start bootstrap flows. It must not be used as a general-purpose mutator during normal gameplay.

---

## 4.3 Integration points

### A. Fresh lineage start after main-menu cinematic

After `run example/scripts/start.cvs` succeeds in `handleCinematicComplete()`:

1. resolve the active runtime from `useRuntimeStore.getState().runtime`;
2. restore tutorial session state exactly as today;
3. close the cinematic overlay **before** emitting the banner-triggering fact commands;
4. enqueue run-number bootstrap with `previousRunNumber = 0`;
5. immediately `flushCommands()`;
6. resume gameplay.

### Why close the overlay before flushing

The banner is triggered from the applied `run_number` command batch.

If the commands are flushed while the full-screen cinematic overlay is still visible, the 5-second banner lifetime would begin while hidden behind that overlay. Closing the overlay first prevents the timer from being consumed off-screen.

### B. Rebirth-driven run start (`game.rebirth`)

In `gameRebirthCommand`:

1. extract `savedPermanent` exactly as today;
2. compute `previousRunNumber = savedPermanent.run_number.world ?? 0`;
3. run the start script exactly as today;
4. restore passport carryover exactly as today;
5. enqueue cave restore exactly as today;
6. enqueue carrier restore exactly as today;
7. enqueue permanent fact restore exactly as today;
8. enqueue run-number bootstrap with `previousRunNumber`;
9. enqueue `CLEAR_THOUGHT` exactly as today;
10. call `flushCommands()` once.

### Why this is the correct rebirth location

- it already owns permanent-fact carryover;
- it already coordinates new-runtime restoration work;
- it runs before the first animation-frame tick after `tick.run`, so the run-number fact is available before normal simulation advances.

### C. Save/load behavior

No additional bootstrap is performed on save-load.

Reason:

- save hydration already restores the current `run` and `permanent` facts;
- replaying the bootstrap on load would incorrectly increment the run number and incorrectly show the banner.

This is guaranteed because the bootstrap helper is only called from:

- `handleCinematicComplete()` for a fresh lineage start;
- `gameRebirthCommand` for rebirth.

---

## 4.4 Banner event derivation

The banner must not be authored by React and must not inspect simulation internals directly.

Instead, the UI derives the banner from the applied command batch in `runtimeFactory.ts`, exactly like other runtime UI event pipelines.

### Trigger rule

A run-start banner event is emitted when an applied command batch contains at least one command matching all of:

- `type === ADJUST_FACT`
- `payload.scope === "run"`
- `payload.factType === "run_number"`
- `payload.factAbout === "world"`

### Displayed number source

The displayed number is **not** taken from the command delta.

It is read from the **current post-apply snapshot** at:

- `sys_world.run.run_number.world`

### Why snapshot is the source of truth

This makes the UI robust even if command batching changes in the future. The banner reflects the actual applied runtime state, not an assumption about how the delta was constructed.

---

## 4.5 Banner UI behavior

### Render contract

- render location: top-center of the runtime viewport
- pointer behavior: `pointer-events: none`
- z-layer: same runtime overlay stratum used for other floating runtime UI, above gameplay and below cinematic/main-menu overlays
- text styling: exact same base text styling as `CinematicText`
- text content: `Cycle #<runNumber>`

### Animation contract

- enter animation: `400 ms`
  - opacity `0 -> 1`
  - vertical offset `-24 px -> 0 px`
- hold duration: `5000 ms`, measured **after** enter completes
- exit animation: `400 ms`
  - opacity `1 -> 0`
  - vertical offset `0 px -> -16 px`

### Store contract

The banner store is UI-only ephemeral state and holds the latest run-start event.

It must expose:

- current banner payload (`runNumber` + monotonic revision/id)
- `show(runNumber)`
- `reset()`

It does **not** own simulation truth.

### Component contract

The component owns timing and animation phases.

On a new store revision:

1. cancel any existing timers;
2. replace local displayed number immediately;
3. start enter phase;
4. after `400 ms`, transition to hold;
5. after `5000 ms`, start exit;
6. after `400 ms`, clear the local visible banner.

### Reset contract

When runtime UI state resets (runtime unload, fresh cartridge load, explicit UI reset), the banner store resets immediately and the component clears any pending timers.

---

## 5. Files to add or change

## 5.1 `src/data/schemas/conditionPrimitives.ts` — **change**

### Responsibility

Defines the canonical allowed fact-type enum for authored conditions and command payload typing.

### Logic

Add `run_number` to `FactTypeSchema`.

### Interface

- exported `FactTypeSchema`
- exported inferred `FactType`

### Contract

After this change, `run_number` is a valid fact type anywhere the existing `FactType` is accepted.

---

## 5.2 `src/ui/devtools/editors/conditions/structuredConditionAutocomplete.shared.ts` — **change**

### Responsibility

Provides fact-about suggestions for structured condition editing.

### Logic

Add `run_number` to the `WORLD_FACT_TYPES` set so the editor suggests only:

- `world`

for that fact type.

### Interface

- `resolveStructuredFactAboutSuggestions(...)`

### Contract

For `factType === "run_number"`, the returned suggestions must be exactly `['world']`.

---

## 5.3 `src/game/facts/runNumberFact.ts` — **add**

### Responsibility

Own the run-number bootstrap constants and command-enqueue helper.

### Logic

Defines:

- the canonical fact type and about key for run-number facts;
- normalization of `previousRunNumber`;
- computation of `nextRunNumber`;
- enqueueing of the two `ADJUST_FACT` commands required to seed the current run and advance permanent carryover.

### Interface

This file must export:

- `RUN_NUMBER_FACT_TYPE` (`'run_number'`)
- `RUN_NUMBER_FACT_ABOUT` (`'world'`)
- `resolvePreviousRunNumber(...)` (or equivalent normalization helper)
- `enqueueRunNumberBootstrap(commands, previousRunNumber): number`

### Contract

`enqueueRunNumberBootstrap(...)` must:

- never mutate runtime entities directly;
- only enqueue commands;
- return the `nextRunNumber` it authored;
- clamp invalid previous input to `0` before incrementing.

---

## 5.4 `src/app-shell/useAppShellControllerCallbacks.ts` — **change**

### Responsibility

Owns the new-game cinematic completion flow.

### Logic

In the `main-menu` cinematic completion path only:

- after the start script succeeds,
- after tutorial session state restoration,
- close the overlay,
- then enqueue and flush run-number bootstrap with `previousRunNumber = 0`,
- then resume gameplay.

The runtime-cinematic path remains unchanged and must not seed run numbers.

### Interface

- `handleCinematicComplete()`

### Contract

`handleCinematicComplete()` must:

- seed run number exactly once for fresh new-game entry;
- never seed it for `cinematicSource !== 'main-menu'`;
- not silently ignore a missing runtime after a successful script run; it must fail explicitly via the existing shell error path.

---

## 5.5 `src/ui/runtime/terminal/commands/gameRebirthCommand.ts` — **change**

### Responsibility

Owns rebirth-driven fresh-runtime restoration.

### Logic

Extend the existing rebirth flow to:

- read the previous permanent run number from the extracted permanent facts snapshot;
- enqueue the run-number bootstrap into the new runtime before the final `flushCommands()`.

### Interface

- `gameRebirthCommand.execute(...)`

### Contract

On successful rebirth:

- the new runtime must end the restoration flush with:
  - `run.run_number.world = previousPermanentRunNumber + 1`
  - `permanent.run_number.world = previousPermanentRunNumber + 1`
- the command must not increment the run number more than once per rebirth.

---

## 5.6 `src/ui/runtime/status/runStartCycleBannerStore.ts` — **add**

### Responsibility

Hold the latest banner event as ephemeral UI state.

### Logic

Store only the latest `runNumber` plus a revision/id used by the component to restart its local animation lifecycle.

### Interface

Must export:

- the store itself
- `show(runNumber)`
- `reset()`
- selector(s) used by the banner component

### Contract

- no timers live in this store;
- no simulation state lives in this store;
- `show(...)` replaces any previous banner payload;
- `reset()` clears the payload synchronously.

---

## 5.7 `src/ui/runtime/status/evaluateRunStartCycleBannerCommands.ts` — **add**

### Responsibility

Translate applied runtime commands into a banner-store event.

### Logic

Given the applied `commands` and the `current` snapshot:

- detect whether the batch contains the canonical run-number bootstrap command;
- if not, do nothing;
- if yes, read `sys_world.run.run_number.world` from `current`;
- if the value is a finite positive number, call `runStartCycleBannerStore.show(value)` exactly once for the batch.

### Interface

- `evaluateRunStartCycleBannerCommands(commands, currentSnapshot): void`

### Contract

This function must:

- never mutate runtime state;
- never derive display text itself;
- ignore malformed or incomplete snapshots rather than inventing a number.

---

## 5.8 `src/ui/runtime/state/runtimeFactory.ts` — **change**

### Responsibility

Central runtime-to-UI event adapter for applied commands.

### Logic

Call `evaluateRunStartCycleBannerCommands(commands, current)` inside `onCommandsApplied`, alongside the existing cinematic, notification, callout, and visual-effect observers.

### Interface

- `buildRuntime(...)`

### Contract

The new observer call must be observational only and must not change existing command application ordering.

---

## 5.9 `src/ui/runtime/state/resetRuntimeUiState.ts` — **change**

### Responsibility

Reset ephemeral runtime UI stores on unload/reset/cartridge changes.

### Logic

Reset the run-start banner store together with notifications, inspector state, visual effects, and runtime callouts.

### Interface

- `resetRuntimeUiState()`

### Contract

After reset, no prior run-start banner may remain visible or resumable.

---

## 5.10 `src/ui/runtime/status/RunStartCycleBanner.styles.ts` — **add**

### Responsibility

Own the layout/styling primitives for the banner.

### Logic

- create a top-centered non-interactive anchor layer;
- reuse the cinematic text styling by extending `CinematicText` rather than reauthoring a second visual language;
- keep positioning concerns separate from the animated text node so animation transforms do not conflict with anchor centering.

### Interface

Must export styling primitives used only by `RunStartCycleBanner.tsx`.

### Contract

The visible text styling must remain visually aligned with the existing cinematic text tokens.

---

## 5.11 `src/ui/runtime/status/RunStartCycleBanner.tsx` — **add**

### Responsibility

Render the banner and own its phase/timer lifecycle.

### Logic

- subscribe to the banner store;
- on new revision, restart the enter/hold/exit sequence;
- render through `AnimatePresence` / `motion`;
- display `Cycle #<runNumber>`.

### Interface

- no props
- runtime-status overlay component mounted by `RuntimeShellCanvas`

### Contract

This component must:

- render nothing when no banner is active;
- never mutate runtime state;
- never block input;
- clear timers on unmount and on store reset;
- restart cleanly if another event arrives while one is already visible.

---

## 5.12 `src/ui/runtime/shell/RuntimeShellCanvas.tsx` — **change**

### Responsibility

Mount the runtime chrome overlays for full gameplay UI.

### Logic

Mount `RunStartCycleBanner` inside the existing full-chrome overlay set.

### Interface

- `RuntimeShellCanvas`

### Contract

The banner is mounted only when `chrome === 'full'`, consistent with other gameplay chrome.

---

## 5.13 Files explicitly **not** changed

### `src/engine/compiler/conditions/compileStructuredConditions.ts`
No change. The generic fact-threshold path already supports `sys_world.<scope>.<factType>.<factAbout>`.

### `src/game/conditions/evaluateStructuredConditionSet.ts`
No change. It already delegates to the compiled gate and world fact path.

### `src/game/facts/factUtils.ts`
No change. Fact storage is already sparse and generic.

### `src/game/handlers/AdjustFactHandler.ts`
No change. It already applies any valid `FactType` through `adjustFact()`.

### Save/hydration serializers
No change. Facts are already part of entity data and therefore persist automatically.

### Authored content / scripts
No change to authored content files is required.

---

## 6. Sequence contracts

## 6.1 Fresh new game

Pseudocode:

1. user confirms New Game
2. workspace manifest loads fresh runtime
3. main-menu cinematic plays
4. cinematic completes
5. run `example/scripts/start.cvs`
6. restore tutorial session state
7. close cinematic overlay
8. enqueue run-number bootstrap with previous `0`
9. flush commands
10. gameplay continues
11. applied command observer emits banner event
12. banner appears as `Cycle #1`

Resulting facts after step 9:

- `run.run_number.world = 1`
- `permanent.run_number.world = 1`

## 6.2 Rebirth

Pseudocode:

1. existing runtime triggers `game.rebirth`
2. extract old permanent facts
3. read old permanent run number
4. run start script to create fresh runtime
5. restore passport carryover
6. enqueue old permanent facts
7. enqueue run-number bootstrap with previous old run number
8. enqueue other existing restoration commands
9. flush commands once
10. applied command observer emits banner event
11. banner appears as `Cycle #N`

If previous permanent run number was `2`, resulting facts after flush:

- `run.run_number.world = 3`
- `permanent.run_number.world = 3`

## 6.3 Save/load

Pseudocode:

1. save serializes current world facts as-is
2. load hydrates those facts back into the runtime
3. no bootstrap helper is called
4. no banner event is emitted

Result:

- run number is preserved exactly;
- no false “new run started” banner appears.

---

## 7. Error handling contract

### Missing runtime after successful fresh-start script

`handleCinematicComplete()` must set an explicit shell error and abort the run-number bootstrap. It must not silently continue.

### Missing or malformed run number in post-apply snapshot

`evaluateRunStartCycleBannerCommands()` must ignore the batch and emit no banner. It must not invent a fallback number.

### Invalid previous run number input

`enqueueRunNumberBootstrap()` must normalize invalid input to `0` and proceed deterministically.

---

## 8. Tests

The tests must follow the existing testing standard: behavior-first, readable Given/When/Then structure, real data where practical, timers made deterministic, UI tests only verifying presentation/wiring, and logic isolated into unit-testable helpers. fileciteturn3file1

## 8.1 `src/game/facts/runNumberFact.test.ts` — **add**

### Responsibility

Unit-test the bootstrap helper.

### Cases

1. **fresh lineage start**
   - Given previous run number `0`
   - When bootstrap commands are enqueued
   - Then run delta is `1` and permanent delta is `1`

2. **rebirth from prior run**
   - Given previous run number `2`
   - When bootstrap commands are enqueued
   - Then run delta is `3` and permanent delta is `1`

3. **invalid previous input**
   - Given `NaN`, negative, or non-finite input
   - Then next run resolves to `1`

## 8.2 `src/game/conditions/evaluateStructuredConditionSet.test.ts` — **change**

### Responsibility

Prove the new fact type works in Conditions without new evaluator logic.

### Case

- Given `sys_world.run.run_number.world = 3`
- When evaluating a `fact_threshold` on `run_number/world`
- Then the expected operator/value comparisons succeed/fail correctly.

## 8.3 `src/ui/devtools/editors/conditions/structuredConditionAutocomplete.test.ts` — **change**

### Responsibility

Verify authoring UX contract.

### Case

- Given `factType = 'run_number'`
- Then `resolveStructuredFactAboutSuggestions(...)` returns `['world']`.

## 8.4 `src/app-shell/useAppShellController.cinematic.test.tsx` — **change**

### Responsibility

Verify fresh-start wiring.

### Cases

1. **main-menu cinematic completion seeds run 1**
   - Given successful start script execution
   - When `onCinematicComplete()` runs for `cinematicSource = 'main-menu'`
   - Then run-number bootstrap commands are enqueued and flushed
   - And the overlay is closed before gameplay resumes

2. **runtime cinematic completion does not seed run numbers**
   - Existing contract remains true.

## 8.5 `src/ui/runtime/terminal/commands/gameRebirthCommand.test.ts` — **change**

### Responsibility

Verify rebirth increments the run number exactly once.

### Case

- Given extracted permanent facts with `run_number.world = 2`
- When rebirth succeeds
- Then the new runtime receives:
  - permanent carryover restoration for previous facts
  - run-number bootstrap for run `3`
- And flush occurs once at the end of restoration.

## 8.6 `src/ui/runtime/status/evaluateRunStartCycleBannerCommands.test.ts` — **add**

### Responsibility

Verify command-batch to UI-event translation.

### Cases

1. matching `ADJUST_FACT(run, run_number, world)` emits banner using the current snapshot value
2. permanent-scope `run_number` alone does not emit
3. unrelated facts do not emit
4. malformed current snapshot value does not emit

## 8.7 `src/ui/runtime/status/RunStartCycleBanner.test.tsx` — **add**

### Responsibility

View-test the banner lifecycle.

### Cases

1. **display**
   - Given `show(3)`
   - Then `Cycle #3` renders at the top of the viewport

2. **timing**
   - With deterministic fake timers
   - banner remains present through enter + hold window
   - then exits and disappears after the defined exit duration

3. **replacement**
   - Given banner `3` is active
   - When `show(4)` arrives before exit
   - Then the visible text resets to `Cycle #4` and the timer restarts

4. **reset**
   - Given an active banner
   - When the store resets or component unmounts
   - Then timers are cleared and nothing remains rendered

---

## 9. Acceptance criteria

This change is complete only when all of the following are true:

1. starting a fresh game shows `Cycle #1` after the opening cinematic;
2. rebirth shows `Cycle #N+1` based on prior permanent progression;
3. loading a save does not increment the run number and does not show the banner;
4. authored conditions can use `factType = run_number`, `factAbout = world`;
5. the run-number fact is present before normal gameplay advances after a run start;
6. the banner is purely observational UI state and does not mutate simulation;
7. all tests covering helper logic, condition usage, rebirth wiring, and banner UI behavior are green;
8. no unrelated files or abstractions are introduced.

