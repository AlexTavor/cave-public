# LLD: Cave worried mood, node-specific curiosity boredom, and stronger assigned-node attention

## 1. Scope

This document defines the low-level design for three requested changes:

1. Add a **worried** Cave mood.
2. Add **node-specific curiosity boredom**.
3. Make **assignment-capable nodes with assigned bodies** pull much more Cave attention and focus.

This design is based on direct code reading of the current cave-mind pipeline and adjacent UI/render code. It does **not** introduce new runtime commands, new ECS mutation paths, or new React-side business logic.

## 2. Code-read basis

The design below is grounded in the current implementation in these files:

- `src/game/systems/CaveMindSystem.ts`
- `src/data/schemas/game/caveMind.ts`
- `src/game/systems/cave/CaveMindConfig.ts`
- `src/game/systems/cave/caveMindTypes.ts`
- `src/game/systems/cave/collectCaveStimuli.ts`
- `src/game/systems/cave/collectCaveCandidate.ts`
- `src/game/systems/cave/updateCaveEmotions.ts`
- `src/game/systems/cave/updateCaveSalience.ts`
- `src/game/systems/cave/updateCaveSalienceScore.ts`
- `src/game/systems/cave/resolveCaveAttention.ts`
- `src/game/systems/cave/resolveDominantCaveEmotion.ts`
- `src/game/systems/cave/resolveCaveRenderState.ts`
- `src/game/systems/cave/resolveCaveEyeRender.ts`
- `src/game/systems/cave/resolveCaveRenderLook.ts`
- `src/game/systems/cave/resolveCaveFurRender.ts`
- `src/game/assignment/assignmentNodeKinds.ts`
- `src/ui/runtime/status/caveStatusUtils.ts`
- `src/ui/runtime/status/CaveStatusNote.tsx`
- `src/engine/phaser/display/modules/lightModuleDecorState.ts`
- Current cave-mind tests under `src/game/systems/cave/**` and `src/game/systems/CaveMindSystem.*.test.ts`

## 3. Why

### 3.1 Worried mood

Current Cave mood state has four emotion channels: `happiness`, `sadness`, `terror`, and `curiosity`. There is no emotion dedicated to sustained comfort decline. The current system reacts to comfort increase, but it does not represent a separate "comfort is getting worse" mood.

The requested behavior requires a new emotional channel because:

- the trigger is specific: **comfort declining**;
- the request describes a persistent meter: **fills on decline, drains on rise**;
- the requested visual output is hybrid: **curious eyes/glow + scared fur**;
- the current four-channel render logic cannot express that hybrid mood exactly without a separate state.

### 3.2 Node-specific curiosity boredom

Current curiosity gain is mostly aggregated at world level:

- `explorationActive` contributes curiosity continuously;
- `absorptionActive` contributes curiosity continuously;
- `firstSeenCycleActivations` contributes curiosity as an impulse.

Those signals are counts, not per-node gains. Because of that, the system cannot reduce curiosity from "the same node" over repeated exposure, and it cannot let boredom for a specific node recover over time.

The requested behavior therefore requires per-node curiosity bookkeeping.

### 3.3 Stronger attention/focus for assigned nodes

Current salience scoring already considers assignment presence, but the current sustained `assignmentBonus` is also applied to any `cycleActive` node. That means simply increasing the current assignment numbers would also buff unrelated cycle nodes.

The requested behavior is specifically about **nodes with assign ability and assigned bodies**. The current scoring must therefore distinguish:

- cycle activity, from
- authored assignment-capable nodes that currently hold bodies.

## 4. Contract and architectural constraints

This design must preserve the current project laws:

- All runtime mutation remains in the apply phase via the existing `UPDATE_CAVE` command.
- `CaveMindSystem` remains read-only and continues emitting one `UPDATE_CAVE` command.
- UI remains observational only; no Cave logic is moved into `.tsx`.
- Existing utilities and domain helpers are reused where they already express the needed semantics.

Concretely:

- No new command type is introduced.
- No React store change is introduced.
- No display config schema change is introduced.
- No raw authored game-config JSON change is required.

## 5. What changes

### 5.1 New user-visible behavior

1. Cave can now be in a `worried` mood.
2. `worried` becomes the dominant mood when `worry` is the strongest non-terror emotion.
3. `worried` renders as:
   - the same **eyes** as `curious`;
   - the same **glow/eye color** as `curious`;
   - the same **fur behavior** as `scared`.
4. Repeated curiosity from the same node diminishes because that node accumulates boredom.
5. Boredom for a node decays when that node stops contributing curiosity.
6. Assignment-capable nodes with assigned bodies become much more likely to be the Cave's attention target and must drive visibly stronger `focusStrength` than they do now.

### 5.2 Explicit non-goals

The following are out of scope and must not be changed:

- Cave command flow
- Runtime phase ordering
- React store shape
- Authored `caveDisplay` config schema
- Cave eye shape enum values
- Pointer system behavior
- Any unrelated rendering or camera code

## 6. Detailed design

### 6.1 Worry emotion

#### 6.1.1 Data model

Add a new `worry` scalar to `CaveMind.emotions`.

Add these new Cave mind memory fields:

- `comfortDeclineTicks: number`
  - Meaning: count of consecutive ticks where comfort decreased versus the previous tick.
  - Range: integer, min `0`.
- `curiosityNodes: Record<string, { boredom01: number }>`
  - This is for node boredom and is described in section 6.2.

No new render enum is added. `worried` is a dominant mood label, not a new eye-shape value.

#### 6.1.2 Worry update algorithm

`worry` is treated as a Cave emotion meter and is updated inside `updateCaveEmotions()`.

Rules:

- On a declining comfort tick, `worry` increases.
- The larger the one-tick decline, the **smaller** the fill amount.
- The longer the consecutive decline streak, the **smaller** the fill amount.
- On a rising comfort tick, `worry` decreases.
- On a flat comfort tick, `worry` only decays.
- `worry` is clamped to `[0, 1]`.

Required pseudocode:

```text
next.worry = previous.worry * emotions.decay

comfortDelta = currentComfort - memory.previousComfort
fallMagnitude01 = clamp01(-comfortDelta)
riseMagnitude01 = clamp01(comfortDelta)
nextComfortDeclineTicks = fallMagnitude01 > 0
  ? memory.comfortDeclineTicks + 1
  : 0

if fallMagnitude01 > 0:
  fillScale = 1 / (
    1
    + fallMagnitude01 * CAVE_MIND_CONFIG.emotions.worry.quickDeclinePenalty
    + (nextComfortDeclineTicks - 1)
      * CAVE_MIND_CONFIG.emotions.worry.prolongedDeclinePenaltyPerTick
  )
  next.worry +=
    CAVE_MIND_CONFIG.emotions.worry.fillPerDeclineTick * fillScale

if riseMagnitude01 > 0:
  next.worry -=
    riseMagnitude01 * CAVE_MIND_CONFIG.emotions.worry.recoveryPerComfortRise

next.worry = clamp01(next.worry)
```

This algorithm is the contract. Implementation must not use any alternate meaning for "quicker decline" or "prolonged decline".

#### 6.1.3 Dominant mood precedence

`resolveDominantCaveEmotion()` must be extended to return:

- `"happy"`
- `"sad"`
- `"curious"`
- `"scared"`
- `"worried"`

The precedence must be:

1. `scared` when `terror` is the strongest emotion, including ties against every other emotion.
2. `worried` when `worry` is the strongest non-terror emotion, including ties against sadness, happiness, and curiosity.
3. `sad` when `sadness` is the strongest remaining emotion.
4. `happy` when `happiness >= curiosity` among the remaining emotions.
5. Otherwise `curious`.

This preserves the existing happy-vs-curious tie rule while inserting `worried` below `terror` and above the non-fear moods.

#### 6.1.4 Render mapping for worried

The current render pipeline already separates eye/glow logic from fur logic. That should be reused.

Required visual mapping:

- **Eyes and glow**: treat `worry` exactly like `curiosity`.
- **Fur and pulse preset**: treat `worry` exactly like `terror`.

To avoid double-counting, projection uses `max`, not addition.

Eye/glow projection contract:

```text
eyeCuriosity01 = max(emotions.curiosity, emotions.worry)
eyeTerror01 = emotions.terror
```

Fur/pulse projection contract:

```text
furTerror01 = max(emotions.terror, emotions.worry)
furCuriosity01 = emotions.curiosity
```

This is required because the request is hybrid, not blended:

- worried eyes must look like curiosity, not fear;
- worried fur must behave like fear, not curiosity.

#### 6.1.5 Status note behavior

`worried` must be surfaced by the existing Cave status note path:

- `resolveCaveStatusParts()` must be able to return `"worried"`.
- `CaveStatusNote` must render it without adding a new theme token.
- The text color for `worried` must reuse the existing `theme.colors.buttonSelected` token.

Reason: the request says worried uses the same eye/glow treatment as curious, and the current curious status already uses `buttonSelected`.

### 6.2 Node-specific curiosity boredom

#### 6.2.1 Curiosity sources that must become per-node

The current system already has three node-derived curiosity sources; they are only aggregated too early.

They must be converted from world counts into per-node contributor IDs:

1. Active exploration node contribution
2. Active assignment-node contribution
3. First-seen active cycle contribution

No new curiosity source is introduced.

#### 6.2.2 Stimulus shape change

`CaveWorldSignals` must stop expressing node curiosity only as counts.

It must expose these arrays instead:

- `explorationCuriosityEntityIds: string[]`
- `assignedNodeCuriosityEntityIds: string[]`
- `firstCycleCuriosityEntityIds: string[]`

Each array contains unique entity IDs for the current tick only.

Semantics:

- `explorationCuriosityEntityIds`
  - entity has `cave_exploration` tag and is currently cycle-active.
- `assignedNodeCuriosityEntityIds`
  - entity is an authored assignment-capable node and `assignedIds.length > 0`.
- `firstCycleCuriosityEntityIds`
  - entity is currently cycle-active and `memory.entities[entity.id]?.seenActiveCycle !== true`.

#### 6.2.3 Assignment-node eligibility

The system must not infer "assign ability" from `assignedIds.length > 0` alone.

It must use the existing assignment-owner helper from `src/game/assignment/assignmentNodeKinds.ts` and only treat these kinds as assignment-attention eligible:

- `power`
- `processing`

It must explicitly exclude:

- `world`
- `pointer`
- `other`

This keeps the implementation aligned with the existing authored-node classification and prevents system owners from being mistaken for authored assignment nodes.

#### 6.2.4 Boredom update algorithm

`updateCaveEmotions()` must aggregate all per-node base curiosity gains for the tick before boredom is applied.

Base gain contract per node per tick:

- each contributing exploration node adds the current existing exploration curiosity base gain;
- each contributing assigned node adds the current existing assigned-node curiosity base gain (`0.02` in the current code path);
- each first-cycle node adds the current existing `firstCycle` curiosity impulse.

For a node that contributes through more than one source in the same tick, the base gains must be **summed first**, then boredom must be applied **once**.

Required pseudocode:

```text
baseGainByEntityId = aggregate all node curiosity sources for this tick
nextCuriosityNodes = {}

for each entityId in union(keys(memory.curiosityNodes), keys(baseGainByEntityId)):
  previousBoredom01 = memory.curiosityNodes[entityId]?.boredom01 ?? 0
  tickBaseGain = baseGainByEntityId[entityId] ?? 0

  if tickBaseGain > 0:
    effectiveGain = tickBaseGain * (1 - previousBoredom01)
    next.curiosity += effectiveGain
    nextBoredom01 = clamp01(
      previousBoredom01
      + CAVE_MIND_CONFIG.emotions.curiosityBoredom.gainPerContributingTick
    )
  else:
    nextBoredom01 = clamp01(
      previousBoredom01
      - CAVE_MIND_CONFIG.emotions.curiosityBoredom.recoveryPerTick
    )

  if nextBoredom01 > 0:
    nextCuriosityNodes[entityId] = { boredom01: nextBoredom01 }
```

This is the contract for boredom:

- first gain from a node is largest;
- each subsequent gain from that same node is smaller;
- boredom is specific to that node only;
- boredom recovers over time when the node stops contributing.

### 6.3 Stronger attention and focus for assignment-capable nodes with bodies

#### 6.3.1 Current issue to fix

Current salience scoring conflates two different sustained conditions:

- `assignedCount > 0`
- `cycleActive`

Both currently receive the same sustained `assignmentBonus`.

That must be split so the new assignment-node emphasis does not unintentionally increase salience for every cycle-active node.

#### 6.3.2 Salience contract

Add `assignmentAttentionEligible: boolean` to `CaveStimulus`.

Definition:

- `true` only when the entity is a `power` or `processing` assignment owner.
- `false` otherwise.

`assignedCount > 0` contributes assignment-specific salience only when `assignmentAttentionEligible === true`.

#### 6.3.3 Scoring rules

`updateCaveSalienceScore.ts` must be changed as follows:

1. **Assignment multiplier**
   - apply only when `assignmentAttentionEligible && assignedCount > 0`.
2. **Assignment delta impulse**
   - apply only when `assignmentAttentionEligible && assignedCount` changed.
3. **Sustained cycle bonus**
   - use a dedicated `cycleActiveBonus` config field.
4. **Sustained assignment bonus**
   - use `assignmentBonus` only when `assignmentAttentionEligible && assignedCount > 0`.

The contract is behavioral, not numeric:

- dragged target remains highest priority;
- explicit selected target remains higher priority than passive competition;
- among non-dragged, non-selected candidates, an assignment-capable node that currently has assigned bodies must outrank an ordinary cycle-active node of similar activity;
- that same node must also produce visibly stronger `focusStrength` than its identical unassigned version.

No salience rule may depend on React/UI state.

## 7. File-by-file changes

### 7.1 `src/data/schemas/game/caveMind.ts`

**Responsibility**

Defines the canonical Cave mind runtime schema and defaults.

**Change**

- Add `emotions.worry`.
- Add `memory.comfortDeclineTicks`.
- Add `memory.curiosityNodes` as a record keyed by entity ID with `boredom01` values.

**Interface**

- `CaveMind["emotions"]` now includes `worry: number`.
- `CaveMind["memory"]` now includes:
  - `comfortDeclineTicks: number`
  - `curiosityNodes: Record<string, { boredom01: number }>`
- `createDefaultCaveMind()` must default all new fields.

**Logic**

Schema changes only; no runtime behavior here.

### 7.2 `src/game/systems/cave/CaveMindConfig.ts`

**Responsibility**

Central tuning constants for cave salience and emotion behavior.

**Change**

Add:

- `emotions.worry.fillPerDeclineTick`
- `emotions.worry.quickDeclinePenalty`
- `emotions.worry.prolongedDeclinePenaltyPerTick`
- `emotions.worry.recoveryPerComfortRise`
- `emotions.curiosityBoredom.gainPerContributingTick`
- `emotions.curiosityBoredom.recoveryPerTick`
- `salience.cycleActiveBonus`

Retain `salience.assignmentBonus`, but its meaning becomes assignment-only.

**Interface**

Config keys above become required by the touched cave-mind functions.

**Logic**

- `cycleActiveBonus` preserves the existing generic cycle-active sustained behavior.
- `assignmentBonus` becomes specifically about assignment-capable nodes with bodies.
- Worry and boredom tuning remains local to cave-mind logic.

### 7.3 `src/game/systems/cave/caveMindTypes.ts`

**Responsibility**

Defines internal cave-mind stimulus, salience, and render types.

**Change**

- Add `assignmentAttentionEligible` to `CaveStimulus`.
- Replace count-only node curiosity signals with per-node contributor ID arrays:
  - `explorationCuriosityEntityIds`
  - `assignedNodeCuriosityEntityIds`
  - `firstCycleCuriosityEntityIds`

**Interface**

Collector and emotion code must use the new arrays; node curiosity must no longer depend only on counts.

**Logic**

Type-only change; no logic here.

### 7.4 `src/game/systems/cave/collectCaveCandidate.ts`

**Responsibility**

Builds one `CaveStimulus` entry from one runtime entity.

**Change**

- Determine assignment owner kind through the existing `assignmentNodeKinds` utility.
- Set `assignmentAttentionEligible` only for `power` and `processing` owners.
- Contribute entity IDs into the new curiosity-source arrays.

**Interface**

The function continues returning either one candidate or `null`, but the candidate now includes `assignmentAttentionEligible`.

**Logic**

- `assignedNodeCuriosityEntityIds` must only receive authored assignment nodes with bodies.
- `firstCycleCuriosityEntityIds` must still use the existing `seenActiveCycle` memory rule.
- No ECS mutation is performed.

### 7.5 `src/game/systems/cave/collectCaveStimuli.ts`

**Responsibility**

Aggregates world-level Cave signals and the list of entity candidates.

**Change**

- Totals object changes from count-only curiosity fields to the new ID arrays.
- World signal payload exposes those arrays.

**Interface**

`collectCaveStimuli()` still returns `CaveStimuli | null`, but `world` now contains the new contributor arrays.

**Logic**

- Arrays are current-tick only.
- IDs must be unique.
- Existing non-curiosity signals remain unchanged.

### 7.6 `src/game/systems/cave/updateCaveSalienceScore.ts`

**Responsibility**

Converts one current candidate and one previous-memory entry into a salience score.

**Change**

- Split current sustained `assignmentBonus` behavior into:
  - assignment-only sustained bonus;
  - generic `cycleActiveBonus`.
- Gate assignment impulse/multiplier/bonus by `assignmentAttentionEligible`.

**Interface**

Function signatures stay the same; logic depends on the new `CaveStimulus.assignmentAttentionEligible` field and the new config field.

**Logic**

- `cycleActive` keeps its own sustained bonus.
- Assignment nodes with bodies get a much stronger dedicated sustained contribution.
- Unauthored owners must not receive assignment-specific salience.

### 7.7 `src/game/systems/cave/updateCaveEmotions.ts`

**Responsibility**

Evolves Cave emotion meters from current stimuli and prior memory.

**Change**

- Add `worry` emotion update logic.
- Convert node curiosity from count-based application to per-node boredom-weighted application.
- Return both updated emotions and the memory patch needed for the next tick.

**Interface**

`updateCaveEmotions()` must change from returning `CaveEmotions` to returning:

```text
{
  emotions: CaveEmotions,
  memoryPatch: {
    comfortDeclineTicks: number,
    curiosityNodes: Record<string, { boredom01: number }>
  }
}
```

**Logic**

- Implement the exact worry and boredom algorithms defined in sections 6.1.2 and 6.2.4.
- Preserve current happiness/sadness/terror/curiosity rules unless explicitly replaced by the new per-node curiosity logic.
- Clamp all emotions to `[0, 1]`.

### 7.8 `src/game/systems/CaveMindSystem.ts`

**Responsibility**

Orchestrates one Cave mind tick and emits the authoritative `UPDATE_CAVE` command.

**Change**

- Consume the new `{ emotions, memoryPatch }` return shape from `updateCaveEmotions()`.
- Persist `comfortDeclineTicks` and `curiosityNodes` into the outgoing mind memory payload.

**Interface**

No command-type change. The existing `UPDATE_CAVE` payload still carries `mind`, but `mind.emotions` and `mind.memory` contain the expanded schema.

**Logic**

- Continue writing one full `mind` object.
- Continue updating `previousComfort`, `previousXp`, `previousLevel`, event counters, and per-entity salience memory exactly as before.
- Add the two new memory fields explicitly.

### 7.9 `src/game/systems/cave/resolveDominantCaveEmotion.ts`

**Responsibility**

Selects the single dominant Cave mood label from the emotion meters.

**Change**

- Add `worried` to the union.
- Apply the precedence defined in section 6.1.3.

**Interface**

Return type becomes:

```text
"happy" | "sad" | "curious" | "scared" | "worried"
```

**Logic**

Pure comparison only. No side effects.

### 7.10 `src/game/systems/cave/resolveCaveRenderLook.ts`

**Responsibility**

Resolves eye color and eye shape selection inputs.

**Change**

- `mixEmotionColor()` must treat `worry` as curiosity-equivalent for color blending.
- `resolveCaveEyeShape()` must treat dominant `worried` exactly the same as the current curious branch.

**Interface**

Existing exported function names remain unchanged.

**Logic**

- Eye color must not treat `worry` as terror.
- Eye shape must not introduce a new eye-shape enum value.

### 7.11 `src/game/systems/cave/resolveCaveEyeRender.ts`

**Responsibility**

Builds the eye-render state, including offsets, pupil size, blink cadence, and color.

**Change**

- Use curiosity-projected eye emotion channels when resolving:
  - eye color
  - pupil size
  - any other eye-only calculation that currently reads raw curiosity/terror

**Interface**

Function signature stays the same.

**Logic**

For worried mood, the resolved eye output must match the curious path for the same input intensity and attention state.

### 7.12 `src/game/systems/cave/resolveCaveFurRender.ts`

**Responsibility**

Builds the fur-render state from current comfort, focus, and emotions.

**Change**

- Use fear-projected fur emotion channels where `terror01 = max(terror, worry)`.

**Interface**

Function signature stays the same.

**Logic**

For worried mood, fur output must match the scared path for the same input intensity.

### 7.13 `src/game/systems/cave/resolveCaveRenderState.ts`

**Responsibility**

Composes final Cave render, pulse preset override, and render-memory patch.

**Change**

- `resolvePulsePreset()` must use fear-projected emotion channels so worried pulse selection follows the scared branch.

**Interface**

Function signature stays the same.

**Logic**

- Eye and fur remain separately resolved.
- Worried pulse selection must be consistent with worried fur behavior.

### 7.14 `src/ui/runtime/status/caveStatusUtils.ts`

**Responsibility**

Builds the human-readable Cave status keyword list from runtime state.

**Change**

- Add `"worried"` to `CaveStatusKeyword`.
- Continue sourcing the dominant mood from `resolveDominantCaveEmotion()`.

**Interface**

`resolveCaveStatusParts()` may now return `"worried"`.

**Logic**

No new runtime reads beyond the existing dominant-emotion path.

### 7.15 `src/ui/runtime/status/CaveStatusNote.tsx`

**Responsibility**

Renders the Cave status note text and colors.

**Change**

- Add a color mapping for `worried`.
- Reuse `theme.colors.buttonSelected`.

**Interface**

No prop change.

**Logic**

Presentation-only update. No business logic is added.

## 8. Files explicitly not changed

These files must remain untouched:

- `src/data/schemas/game/caveDisplay.ts`
- `src/data/schemas/game/caveDisplay.defaults.ts`
- `src/data/schemas/game/caveMindRender.ts`
- `src/engine/phaser/display/modules/caveEyesRenderMath.ts`
- `src/engine/phaser/display/modules/lightModuleDecorState.ts`
- `src/engine/runtime/handlers/UpdateCaveHandler.ts`

Reason:

- render-shape enum does not need expansion;
- glow already follows `render.eyeColor` automatically;
- cave-mind replacement already happens through the existing whole-mind update path;
- authored display config does not need new weight channels because worry reuses existing terror/curiosity channels via projection.

## 9. Tests

Testing must follow the existing testing contract:

- pure logic in unit tests;
- cave-mind system orchestration in integration tests using a real snapshot/world;
- UI keyword display in view tests only.

### 9.1 Unit tests

#### 9.1.1 `src/game/systems/cave/updateCaveEmotions.test.ts`

Add and update tests to cover:

1. **worry grows on a fresh comfort decline**
2. **a larger one-tick decline produces less worry gain than a smaller decline**
3. **a prolonged consecutive decline produces less worry gain than the first decline tick**
4. **comfort rise reduces worry**
5. **repeated curiosity from the same node is reduced by boredom**
6. **node boredom decays when the node stops contributing and later allows larger curiosity gain again**
7. Existing tests updated to include `worry: 0` in typed emotion fixtures

#### 9.1.2 `src/game/systems/cave/resolveDominantCaveEmotion.test.ts`

Add cases to verify:

- worried is selected when `worry` is the strongest non-terror emotion;
- terror still beats worried on ties;
- worried beats sadness/happiness/curiosity on ties.

#### 9.1.3 `src/game/systems/cave/resolveCaveRenderState.test.ts`

Add a worried-eye equivalence case:

- same attention state;
- worried render and curious render must match for eye-specific outputs.

#### 9.1.4 `src/game/systems/cave/resolveCaveRenderState.fur.test.ts`

Add a worried-fur equivalence case:

- same attention state and comfort;
- worried fur output must match scared fur output for the same intensity.

#### 9.1.5 `src/game/systems/cave/resolveCaveRenderState.pulse.test.ts`

Add a worried pulse case:

- worried must resolve the same pulse preset as scared for the same effective intensity.

### 9.2 Integration tests

#### 9.2.1 `src/game/systems/CaveMindSystem.emotions.test.ts`

Add system-level coverage for:

1. comfort decline produces non-zero `worry` in the emitted `UPDATE_CAVE` payload;
2. emitted memory includes `comfortDeclineTicks`;
3. emitted memory includes updated `curiosityNodes` when a node contributes curiosity.

This test ensures the new memory patch produced by `updateCaveEmotions()` is actually persisted by `CaveMindSystem`.

#### 9.2.2 `src/game/systems/CaveMindSystem.attention.test.ts`

Add system-level coverage for:

1. an assignment-capable node with assigned bodies outranks a comparable ordinary cycle node;
2. the same node produces stronger `focusStrength` when assigned than when unassigned;
3. explicit selected target still wins over passive assignment competition;
4. existing drag-dominance behavior remains intact.

This is the contract for the salience change. It must be tested at system level because the observable requirement is target selection plus focus.

### 9.3 View tests

#### 9.3.1 `src/ui/runtime/status/CaveStatusNote.content.cases.tsx`

Add a case asserting:

- `worried` is rendered in the Cave status sentence when dominant;
- the rendered token has a color style applied.

### 9.4 Existing typed-fixture updates

Because `CaveEmotions` gains a new required field, the following typed unit-test files must be updated to include `worry: 0` where they currently construct direct emotion literals:

- `src/game/systems/cave/updateCaveEmotions.test.ts`
- `src/game/systems/cave/resolveDominantCaveEmotion.test.ts`
- `src/game/systems/cave/resolveCaveRenderState.test.ts`
- `src/game/systems/cave/resolveCaveRenderState.fur.test.ts`
- `src/game/systems/cave/resolveCaveRenderState.happy.test.ts`
- `src/game/systems/cave/resolveCaveRenderState.pulse.test.ts`

No broad test churn outside the Cave mind/status surface is required.

## 10. Acceptance criteria

The implementation is complete only when all of the following are true:

1. `CaveMind` schema includes `worry`, `comfortDeclineTicks`, and `curiosityNodes` with defaults.
2. `worry` increases on comfort decline and decreases on comfort rise.
3. Faster one-tick declines and longer decline streaks both reduce worry fill amount.
4. Repeated curiosity from the same node diminishes.
5. Node boredom recovers over time when that node stops contributing.
6. Assignment-capable nodes with assigned bodies clearly outcompete ordinary passive/cycle nodes for Cave attention.
7. Selected and dragged targets retain their current precedence.
8. Worried mood appears in status text as `worried`.
9. Worried eyes/glow match curious behavior.
10. Worried fur and pulse behavior match scared behavior.
11. No new ECS mutation path is introduced.
12. No React business logic is added.
13. No out-of-scope files are changed.

## 11. Implementation notes that are mandatory, not optional

- Do not add a new eye-shape enum for worried.
- Do not add a new render-driver weight channel to `caveDisplay`.
- Do not add a new runtime command.
- Do not infer assignment-node eligibility from `assignedIds` alone.
- Do not let the stronger assignment-node bonus also strengthen all cycle-active nodes.
- Do not move any of this logic into the UI layer.

