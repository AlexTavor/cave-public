# Cycle/Assignment Node Discovery and Unlock Notifications — Low-Level Design

## Status and scope

This document supersedes the earlier unlock-only draft.

It defines the exact implementation contract for runtime event notifications for **node discovery** and **node unlock** under the following product rule:

- whenever a blueprint with a **cycle** ability or an **assignment** ability is spawned, show the existing **discovered** notification;
- when such a node already exists, is locked by conditional activation, and later becomes unlocked, show the existing **unlocked** notification.

This design is intentionally narrow.

- It changes **notification derivation only**.
- It does **not** add gameplay mechanics.
- It does **not** add runtime commands.
- It does **not** add persisted discovery state.
- It does **not** change the runtime notification store, card UI, TTL, or click pipeline.
- It does **not** change `draft_option` provenance itself; it only removes notification logic that incorrectly depends on that provenance.

---

## Why

### Current code reality

The current repository already contains the full runtime-notification pipeline.

1. `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.ts`
   - derives `RuntimeEventInput[]` from applied commands plus previous/current snapshots.
   - currently emits `entity_discovered` only when the spawn command metadata resolves to `sourceLane === "draft_option"`.

2. `src/ui/runtime/notifications/resolveRuntimeNotificationUnlocks.ts`
   - already derives `entity_unlocked` from conditional-activation state transitions between snapshots.

3. `src/ui/runtime/notifications/runtimeNotificationTypes.ts` and `src/ui/runtime/notifications/formatRuntimeEventDisplayModel.ts`
   - already support `entity_unlocked` and format it as `"<label> unlocked"`.

4. `src/ui/runtime/notifications/handleRuntimeEventClick.ts`
   - already handles clickable entity-focused notifications generically by `entityId`, without event-kind branching.

### Why the current discovery rule is wrong

The present discovery gate is **spawn provenance**, not **what was spawned**.

That is incorrect for the stated product requirement. A node does not become discoverable only when it came from a draft option. The requirement is tied to the spawned blueprint’s authored capabilities:

- `blueprint._editor.abilities.cycle`, or
- `blueprint._editor.abilities.assignment`.

The runtime already carries blueprint data inside snapshots through `Snapshot.getBlueprint(...)`. That is the correct existing mechanism to answer the discovery question without adding state or guessing from UI-only heuristics.

### Why the unlock rule must align with the discovery rule

The unlock notification is specified as the same notification interaction pattern for a node that was already present but previously locked.

Therefore the unlock resolver must operate on the same notification-eligible node class as discovery. Otherwise the system would permit unlock notifications for entities that are outside the discovery contract, which would make the notification set internally inconsistent.

---

## What

## Canonical domain definition

### Notification-eligible node

An entity is a **notification-eligible node** if and only if all of the following are true:

1. the entity exists in the current snapshot;
2. the entity has a non-blank string `blueprintId`;
3. `currentSnapshot.getBlueprint(entity.blueprintId)` resolves to a blueprint;
4. that blueprint has `_editor.abilities.cycle` **or** `_editor.abilities.assignment` present.

This definition is authoritative.

### Explicit exclusions

The following are **not** valid discovery or unlock eligibility checks:

- command provenance such as `draft_option`;
- tags;
- entity body-ness;
- transfer component presence;
- compiled component shape alone (`state.cycle`, `assignment`, etc.) when blueprint ability data is unavailable.

The request defines eligibility by **blueprint ability**, so the implementation must do exactly that and nothing else.

### Missing blueprint data

If the current snapshot cannot resolve the entity’s blueprint, the entity is **not eligible** for discovery or unlock notifications.

The implementation must not guess eligibility from compiled runtime state in that case.

This is acceptable because real runtime snapshots already carry blueprints; only tests need to ensure that eligible fixtures provide them.

---

## Discovery notification contract

### Trigger

Emit `entity_discovered` when all of the following are true:

1. an applied command is `RuntimeCommandType.SPAWN`;
2. `resolveSpawnEntities(...)` resolves that command to a concrete spawned entity in the current snapshot;
3. that spawned entity is a notification-eligible node.

### Non-trigger

Do **not** emit `entity_discovered` when any of the following are true:

- the spawned entity is not notification-eligible;
- the snapshot cannot resolve the blueprint;
- the blueprint has neither `cycle` nor `assignment` ability;
- the spawn command cannot be matched to a concrete entity by the existing spawn-resolution logic.

### Provenance rule

`sourceLane` is irrelevant.

Discovery must be emitted regardless of whether the spawn came from:

- `draft_option`,
- `draft_on_complete`,
- `behavior_rule`,
- `carrier_interaction`,
- or no metadata at all.

### Aggregation and payload

For each emitted discovery event:

- `kind = "entity_discovered"`
- `aggregationKey = "entity_discovered:" + normalizeDiscoveredLabel(entityLabel)`
- `count = 1`
- `entityId = resolved entity id`
- `entityLabel = readNotificationEntityLabel(entity)`

### Label resolution

Use the existing label fallback order exactly as implemented today:

1. `entity.display.label`
2. `entity.label`
3. `entity.id`
4. `"unknown"` only if the entity has no id

### Coexistence with existing spawn notifications

`body_added` behavior remains unchanged.

If a single spawn satisfies both contracts, both runtime events may be emitted in the same batch. There must be no mutual suppression between `body_added` and `entity_discovered`.

---

## Unlock notification contract

### Trigger

Emit `entity_unlocked` when all of the following are true:

1. the entity exists in the current snapshot;
2. the entity also exists in the previous snapshot;
3. the entity is a notification-eligible node in the current snapshot;
4. the entity has at least one `conditional_activation_active*` state key in the current snapshot;
5. the entity was locked in the previous snapshot;
6. the entity is unlocked in the current snapshot.

### Lock semantics

The unlock resolver must preserve the existing conditional-activation semantics already implemented in `resolveRuntimeNotificationUnlocks.ts`.

#### Relevant conditional-activation config

A config is relevant only when all of the following are true:

1. `inactiveExplanation` is non-blank;
2. the config targets at least one valid target on the entity blueprint;
3. the target validation uses the existing `hasValidConditionalActivationTarget(...)` mechanism.

#### Locked

An eligible entity is **locked** when any relevant config is inactive.

#### Fallback when no relevant config is resolvable

If no relevant config can be resolved, keep the existing fallback semantics:

- inspect all state keys with the `conditional_activation_active` prefix;
- treat the entity as unlocked only when **all** such keys are truthy (`1` or `true`);
- otherwise treat it as locked.

This fallback remains allowed only after blueprint eligibility has been established.

### Non-trigger

Do **not** emit `entity_unlocked` when any of the following are true:

- the entity first appears in the current snapshot;
- the entity is not notification-eligible;
- the entity remains locked;
- the entity was already unlocked and stays unlocked;
- the entity has no conditional-activation active state keys;
- the current snapshot cannot resolve an eligible blueprint.

### Aggregation and payload

For each emitted unlock event:

- `kind = "entity_unlocked"`
- `aggregationKey = "entity_unlocked:" + normalizeDiscoveredLabel(entityLabel)`
- `count = 1`
- `entityId = resolved entity id`
- `entityLabel = readNotificationEntityLabel(entity)`

### Rendered text

Rendered text remains the already-implemented contract:

- `"<label> unlocked"` for count `1`
- `"<label> unlocked (xN)"` for count `N > 1`

Tone remains `default`.

### Interaction

Unlock notifications must continue to use the same click interaction as discovery notifications:

- select the live entity by `entityId` when present;
- focus the camera if a physics body exists;
- dismiss the notification afterward.

No new click handler branch is allowed.

---

## Deprecated behavior and required cleanup

The following behavior is deprecated and must be removed from the implementation and tests.

1. **Draft-only discovery provenance**
   - `entity_discovered` must no longer depend on `readCommandSourceLane(command) === "draft_option"`.

2. **Draft-only discovery test language**
   - any test title, expectation, or fixture whose purpose is to assert that discovery requires `draft_option` provenance must be removed or rewritten.

3. **Broad unlock eligibility without blueprint-backed node identity**
   - unlock tests that emit `entity_unlocked` for entities with no eligible blueprint backing must be removed or rewritten.
   - after this change, unlock semantics are defined only for notification-eligible nodes.

4. **Unused helper/import detritus introduced by the old gate**
   - remove notification-specific imports or helpers that become unused after provenance gating is deleted.

---

## How

## End-to-end flow

1. Runtime apply phase processes commands.
2. Runtime telemetry hands `commands`, `previousSnapshot`, and `currentSnapshot` to `resolveRuntimeNotificationEvents(...)`.
3. Discovery derivation:
   - resolve each applied spawn to its spawned entity using the existing `resolveSpawnEntities(...)` helper;
   - look up the entity blueprint from the current snapshot;
   - emit `entity_discovered` if the blueprint has `cycle` or `assignment` ability.
4. Unlock derivation:
   - scan current entities;
   - keep only notification-eligible nodes;
   - compare previous vs current conditional-activation lock state;
   - emit `entity_unlocked` on lock-to-unlock transition.
5. Existing runtime notification store aggregates by aggregation key.
6. Existing viewport renders the notifications.
7. Existing click handler handles both discovered and unlocked cards identically via `entityId`.

---

## Pseudocode

### Discovery

```text
for each applied command:
  if command.type is not SPAWN:
    continue

  entity = resolveSpawnEntities(...)
  if entity not found:
    continue

  if entity is a body:
    emit body_added as today

  if current snapshot says entity blueprint has cycle or assignment ability:
    emit entity_discovered with existing label and aggregation behavior
```

### Unlock

```text
for each entity in current snapshot:
  if entity missing in previous snapshot:
    continue

  if current snapshot does not resolve an eligible blueprint:
    continue

  if entity has no conditional_activation_active* state key:
    continue

  previousLocked = existing lock-resolution logic on previous snapshot/entity
  currentLocked = existing lock-resolution logic on current snapshot/entity

  if previousLocked and not currentLocked:
    emit entity_unlocked with existing label and aggregation behavior
```

---

## Scenario matrix

| Scenario | Previous snapshot | Current snapshot | Expected result |
|---|---|---|---|
| Eligible cycle node spawned from `draft_option` | absent | present | `entity_discovered` |
| Eligible assignment node spawned from `behavior_rule` | absent | present | `entity_discovered` |
| Eligible node spawned with no metadata | absent | present | `entity_discovered` |
| Ineligible blueprint spawned from `draft_option` | absent | present | no discovery |
| Entity present with activation keys but no eligible blueprint | present | present | no unlock |
| Eligible node first appears already active | absent | present, active | discovery only; no unlock |
| Eligible node first appears locked | absent | present, inactive | discovery only; no unlock |
| Eligible node remains locked | present, inactive | present, inactive | no unlock |
| Eligible node transitions locked → unlocked | present, inactive | present, active | `entity_unlocked` |
| Eligible node already unlocked stays unlocked | present, active | present, active | no unlock |
| Eligible node has stale conditional target but real relevant target unlocks | present, locked | present, unlocked | `entity_unlocked` |

---

## File-by-file change specification

## 1) `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.helpers.ts` — change

### Responsibility

Shared, pure notification helpers used by discovery and unlock derivation.

### Required logic

Keep the following existing responsibilities unchanged:

- `readNotificationEntityLabel(...)`
- `normalizeDiscoveredLabel(...)`
- `resolveSpawnEntities(...)`
- any helper behavior unrelated to notification-eligibility classification

Add one exported helper that becomes the canonical notification-eligibility gate:

- `isNotificationEligibleNode(snapshot, entity): boolean`

Its logic must be exactly:

1. read `entity.blueprintId` as a non-blank string;
2. resolve `snapshot.getBlueprint(blueprintId)`;
3. read `blueprint._editor?.abilities`;
4. return `true` only when `abilities.cycle` or `abilities.assignment` is present.

### Interface

The helper’s interface must be:

```text
isNotificationEligibleNode(snapshot: Snapshot, entity: RuntimeEntity): boolean
```

No side effects.

### Required cleanup

- Remove any notification helper that exists only to support the deprecated draft-only discovery path and becomes unused.
- If `isDiscoveryBlockedEntity(...)` becomes unused after this change, delete it from this file and update imports accordingly.

### Acceptance condition

Both discovery and unlock resolvers import and use this helper as their only eligibility gate.

---

## 2) `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.ts` — change

### Responsibility

Single top-level runtime-event resolver that combines spawn-derived discovery, unlock transitions, lifecycle events, and purge milestones.

### Required logic

Within `addSpawnEvents(...)`:

1. keep the existing `resolveSpawnEntities(...)` call;
2. keep the existing `body_added` emission logic;
3. remove the `readCommandSourceLane(...)` dependency entirely from discovery emission;
4. emit `entity_discovered` whenever the resolved spawned entity is a notification-eligible node;
5. do not add any new event kinds or store fields.

### Interface

The exported function signature remains unchanged:

```text
resolveRuntimeNotificationEvents(
  commands: RuntimeCommand[],
  previousSnapshot: Snapshot,
  currentSnapshot: Snapshot,
): RuntimeEventInput[]
```

### Required cleanup

- Remove the `readCommandSourceLane` import from this file.
- Remove any inline branch that depends on `sourceLane` for discovery.

### Acceptance condition

Discovery event emission is determined only by:

- applied `SPAWN` commands,
- spawn-to-entity resolution,
- blueprint ability eligibility.

Nothing else.

---

## 3) `src/ui/runtime/notifications/resolveRuntimeNotificationUnlocks.ts` — change

### Responsibility

Pure unlock-transition resolver for runtime notification events.

### Required logic

Keep the existing lock-resolution semantics and label/aggregation behavior.

Change only the entity eligibility gate:

1. before evaluating conditional-activation lock state, require `isNotificationEligibleNode(currentSnapshot, entity)`;
2. if the entity is not eligible, return no unlock event;
3. continue to require presence in both previous and current snapshots;
4. continue to require at least one `conditional_activation_active*` key;
5. continue to use the current relevant-config logic and the existing state-key fallback.

### Interface

The exported function signature remains unchanged:

```text
resolveConditionalActivationUnlocks(
  previousSnapshot: Snapshot,
  currentSnapshot: Snapshot,
): RuntimeEventInput[]
```

### Required cleanup

- Remove imports and branches that were only needed for the broader pre-change eligibility logic if they become unused.
- Do not introduce a second, parallel unlock-semantic implementation.

### Acceptance condition

`entity_unlocked` is emitted only for notification-eligible nodes.

---

## 4) `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.discovery.test.ts` — change

### Responsibility

Behavior-level discovery tests for spawn-derived runtime notifications.

### Required logic

Rewrite this file so its assertions match the new contract.

It must cover all of the following:

1. **positive: cycle blueprint**
   - spawn a node whose blueprint has `abilities.cycle`;
   - assert `entity_discovered` is emitted.

2. **positive: assignment blueprint**
   - spawn a node whose blueprint has `abilities.assignment`;
   - assert `entity_discovered` is emitted.

3. **source-lane irrelevance**
   - at least one positive case must use non-`draft_option` metadata or no metadata at all;
   - discovery must still be emitted.

4. **negative: ineligible blueprint**
   - spawn an entity whose blueprint has neither `cycle` nor `assignment`;
   - assert no discovery event is emitted even if command metadata says `draft_option`.

5. **label fallback order**
   - preserve verification of `display.label` over `entity.label` over `id`.

### Interface

This remains a pure unit test around `resolveRuntimeNotificationEvents(...)` using real `Snapshot` instances.

### Required cleanup

- Remove the old assertion that discovery requires `draft_option` provenance.
- Rename the test description so it reflects blueprint-capability-based discovery.

### Acceptance condition

The test file reads as a specification for **capability-based discovery**, not provenance-based discovery.

---

## 5) `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.unlock.test.ts` — change

### Responsibility

Happy-path unlock transition tests.

### Required logic

Update fixtures so positive unlock cases use notification-eligible blueprints.

It must cover:

1. eligible node unlocks when `conditional_activation_active` changes `0 -> 1`;
2. eligible node unlocks when a suffixed activation key changes `0 -> 1`;
3. each positive case provides current-snapshot blueprint data establishing `cycle` or `assignment` eligibility.

### Interface

Pure unit tests around `resolveRuntimeNotificationEvents(...)` using real `Snapshot` instances and explicit blueprint maps.

### Required cleanup

- Remove positive fixtures that rely on state keys alone with no eligible blueprint backing.

### Acceptance condition

No positive unlock test passes without explicit blueprint eligibility.

---

## 6) `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.unlockSemantics.test.ts` — change

### Responsibility

Negative-path and semantic-edge tests for unlock notification derivation.

### Required logic

Retain and adapt the current semantic coverage:

1. **no unlock on first appearance already active**
   - must use an eligible blueprint fixture;
   - expected result remains no unlock.

2. **stale conditional targets ignored**
   - keep the existing stale-target case;
   - the fixture blueprint must remain notification-eligible.

3. **negative: ineligible blueprint**
   - add or rewrite one case where activation toggles but the blueprint has neither `cycle` nor `assignment`;
   - expected result: no unlock notification.

### Interface

Pure unit tests around `resolveRuntimeNotificationEvents(...)` using real `Snapshot` instances.

### Acceptance condition

The semantic test file proves both of these facts:

- unlock still follows existing conditional-activation semantics;
- unlock now requires notification-eligible blueprint identity.

---

## 7) `src/ui/runtime/notifications/RuntimeNotificationViewport.entityClick.cases.tsx` — change

### Responsibility

View-level interaction contract for clickable runtime event notifications.

### Required logic

Add explicit coverage that `entity_unlocked` uses the same interaction behavior as `entity_discovered`.

The test must verify that clicking an unlocked notification:

1. selects the entity;
2. requests camera focus using the current zoom;
3. dismisses the notification.

### Interface

This remains a UI/view test only. It must not assert internal implementation branching. It must assert visible interaction behavior.

### Acceptance condition

The viewport test suite explicitly proves that discovery and unlock notifications share the same click contract.

---

## Test contract

The tests for this change must satisfy the project testing rules.

### Unit tests

Use real `Snapshot` objects and explicit blueprint maps.

Every changed unit test must read in Given/When/Then form and cover:

- happy path,
- negative path,
- edge behavior.

### View tests

The viewport click test must verify only presentation/wiring behavior.

It must not inspect implementation details inside the click handler.

### Required negative cases

At minimum, the revised suite must prove all of the following:

1. ineligible blueprint spawn does not discover;
2. eligible blueprint spawn discovers without draft provenance;
3. first appearance already unlocked does not emit unlock;
4. activation toggling on an ineligible blueprint does not emit unlock;
5. stale conditional targets do not block a real unlock event when a relevant target becomes active.

---

## Non-goals

The implementation must not:

- change `RuntimeCommandSourceLane` definitions;
- change `DraftSystem` provenance behavior;
- add new runtime commands;
- add new ECS fields;
- add new persisted discovery flags;
- infer node identity from tags or arbitrary component shape;
- refactor unrelated notification code.

---

## Acceptance summary

This change is complete only when all of the following are true:

1. discovery notifications are emitted for spawned blueprints with `cycle` or `assignment` abilities, regardless of `sourceLane`;
2. discovery notifications are not emitted for spawned blueprints without those abilities, even if they came from `draft_option`;
3. unlock notifications are emitted only for the same notification-eligible node class;
4. unlock notifications preserve existing lock/unlock semantic resolution;
5. discovery and unlock continue to share the same rendering and click behavior;
6. obsolete draft-only discovery logic and tests are removed.
