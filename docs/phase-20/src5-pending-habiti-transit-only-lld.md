# LLD — Pending Habiti Transit and Cave Orbit Only

## 1. Purpose

This document defines the low-level design for fixing only the pending-Habiti pickup movement contract in the current codebase.

This document covers exactly these behaviors:

- newly spawned pending-Habiti pickups must move toward Cave
- simultaneous pending-Habiti pickups must not remain collapsed on top of each other; they must separate using normal physics
- after reaching Cave, pending-Habiti pickups must enter Cave orbit

This document does not cover any other Habiti behavior.

---

## 2. Why This Change Is Required

### 2.1 Required player-facing contract

When one or more new Habiti are discovered from a body-processing event:

- one pickup entity is spawned per newly discovered habitus
- each pickup begins at the discovery source
- each pickup travels toward Cave
- simultaneous pickups can push apart during transit
- once a pickup reaches Cave, it stops traveling and begins orbiting Cave

### 2.2 Current implementation defects

The current implementation violates that contract in three concrete ways.

#### A. Discovered pickups are forced into the `phantom` layer immediately

File: `src/game/habiti/pendingHabitiPickupCommands.ts`

The discovered-pickup spawn path places the pickup into the `phantom` physics layer at spawn time.

That is incompatible with the transit contract because phantom bodies do not participate in normal separation.

#### B. Discovered pickups are explicitly re-collapsed onto the exact same source position

Files:

- `src/game/handlers/processingPendingHabiti.ts`
- `src/game/habiti/pendingHabitiPickupCommands.ts`
- `src/engine/runtime/handlers/spawnCollisionPlacement.ts`

The runtime already has spawn-time overlap correction for new physics entities. However, the discovered-pickup command sequence explicitly repositions the pickup back onto the exact source point after spawn.

When multiple Habiti are discovered from the same body, that explicit reposition step collapses them back onto one another.

#### C. Orbit semantics are mixed into the discovery spawn path

Files:

- `src/game/habiti/pendingHabitiPickupCommands.ts`
- `src/game/systems/PendingHabitiPickupSystem.ts`
- `src/game/habiti/pendingHabitiPickupMotion.ts`

The implementation currently blurs two different states:

- transit pickup: traveling to Cave
- arrived pickup: orbiting Cave

The discovered spawn path currently includes orbit-compatible setup too early. That prevents a clean transit phase.

### 2.3 Runtime evidence provided by the implementation review

The reported runtime state is consistent with the above defects:

- all pending-Habiti pickups share the same position
- all pickups remain unarrived
- all pickups do not move toward Cave

The movement failure and overlap failure are therefore not presentation issues. They are runtime state and command-sequencing issues.

---

## 3. Scope

### 3.1 In scope

This change includes only:

- discovered pending-Habiti pickup spawn semantics
- pending-Habiti pickup transit toward Cave
- separation of simultaneous pending-Habiti pickups during transit
- transition from transit to arrived-orbit state
- tests for those behaviors

### 3.2 Out of scope

This change does not modify:

- claim/tap semantics
- Cave data ownership semantics
- rebirth persistence semantics
- Habiti announcement behavior
- generic pickup architecture
- assignment-body processing
- any non-Habiti pickup entity type

---

## 4. Design Constraints

The implementation must adhere to the project contract.

- Blueprints remain structural only. Runtime behavior is implemented through commands, handlers, systems, and existing motion utilities. fileciteturn3file0
- Systems remain read-only and emit commands only. Runtime mutation occurs in apply. fileciteturn3file0
- The design must use existing mechanisms where possible and must not introduce speculative abstractions. fileciteturn3file1
- Tests must verify behavior using real world/runtime state, with readable Given/When/Then structure. fileciteturn3file2

---

## 5. Behavioral Contract After This Change

A pending-Habiti pickup must be in exactly one of the following two states.

### 5.1 Transit pickup

A transit pickup is a newly discovered pickup that has not yet reached Cave.

Required state:

- `pending_habiti_arrived = 0`
- dynamic physics body
- non-phantom physics layer
- target set to `sys_world`
- position governed by existing steering and collision/separation

Behavior:

- it moves toward Cave
- it can separate from other transit pickups through the normal physics pipeline
- it does not yet orbit Cave

### 5.2 Arrived pickup

An arrived pickup is a pending-Habiti pickup that has reached Cave.

Required state:

- `pending_habiti_arrived = 1`
- target cleared
- `phantom` physics layer
- position governed by existing Cave-orbit placement

Behavior:

- it no longer performs transit steering
- it orbits Cave using the existing orbit motion utility

No third state is allowed for this feature.

---

## 6. Design Summary

The fix must reuse existing runtime mechanisms instead of inventing custom movement.

### 6.1 Existing mechanisms to reuse

- `SPAWN` with initial coordinates
- spawn-time overlap correction already present in `spawnCollisionPlacement.ts`
- existing target steering toward `sys_world`
- existing arrival detection in `PendingHabitiPickupSystem.ts`
- existing Cave orbit placement in `pendingHabitiPickupMotion.ts`
- existing `SET_PHYSICS_LAYER` transition for arrived orbiters

### 6.2 Core design decision

The discovered pickup path must become a pure transit-materialization path.

That means:

- do not set the discovered pickup to `phantom` at spawn
- do not explicitly reposition it after spawn
- let the runtime’s existing spawn placement and non-phantom separation handle spread
- only switch to `phantom` after arrival, at the orbit handoff point

This preserves existing engine behavior and avoids any new motion subsystem.

---

## 7. File-by-File Design

### 7.1 `src/game/habiti/pendingHabitiPickupCommands.ts`

#### Responsibility

This file remains the single source of truth for command sequences that materialize pending-Habiti pickups.

#### Why it must change

The current discovered-pickup command sequence sets the wrong physics semantics for transit and explicitly destroys spawn separation by repositioning pickups back onto the exact same source coordinate.

#### Required logic

This file must expose two distinct command builders with non-overlapping semantics.

##### A. Discovered pickup command sequence

`enqueueDiscoveredPendingHabitiPickup(...)` must produce a transit pickup.

Required behavior:

- spawn the pickup at the provided source position
- set `pending_habiti_arrived = 0`
- set target to `sys_world`
- do not set the pickup to `phantom`
- do not issue a follow-up `POSITION_ENTITY` command after spawn

Required interface contract:

- input remains the habitus id and source position
- output remains a list of runtime commands only
- no direct ECS mutation

##### B. Restored/arrived pickup command sequence

If this file still contains the helper for already-arrived pickup restoration, it remains an arrived-orbit materialization path.

Required behavior:

- set `pending_habiti_arrived = 1`
- clear or omit target
- set the pickup to `phantom`
- position it directly onto the Cave orbit ring

The discovered and restored command sequences must remain separate.

---

### 7.2 `src/game/handlers/processingPendingHabiti.ts`

#### Responsibility

This file translates completed body-processing results into pending-Habiti pickup materialization commands.

#### Why it must change

This file currently relies on a discovered-pickup spawn sequence that collapses simultaneous spawns and prevents transit separation.

#### Required logic

This file must continue to:

- compute newly discovered Habiti from the processed body
- add those Habiti to `cave.pendingHabiti`
- enqueue one discovered pickup per new habitus

This file must not implement its own spread logic.

The source position passed into the discovered pickup command must remain the processed body position. Separation is handled by spawn placement plus dynamic non-phantom transit physics.

Required interface contract:

- no change to handler inputs or outputs
- no direct physics mutation
- the handler continues to emit commands only

---

### 7.3 `src/game/systems/PendingHabitiPickupSystem.ts`

#### Responsibility

This system is the runtime reconciler for pending-Habiti pickup entities.

It is responsible for:

- maintaining correspondence between `cave.pendingHabiti` and live pickup entities
- steering unarrived pickups toward Cave
- detecting arrival
- switching arrived pickups into Cave orbit state

#### Why it must change

The system must own the transit-to-orbit handoff cleanly. Discovery spawn must not pre-apply arrived/orbit semantics.

#### Required logic

For each pending-Habiti pickup entity:

##### A. If pickup is unarrived

Required behavior:

- ensure target is `sys_world`
- ensure physics layer remains non-phantom
- check Cave-arrival condition using the existing arrival helper
- if not yet arrived, emit no orbit-positioning command

##### B. When pickup reaches Cave

Required behavior:

- set `pending_habiti_arrived = 1`
- clear target
- set physics layer to `phantom`
- from that point onward, position using the existing Cave-orbit placement utility

##### C. If pickup is arrived

Required behavior:

- keep it in Cave orbit using the existing orbit motion helper
- do not restore transit targeting

Required interface contract:

- system remains read-only with command emission only
- no new data model is introduced
- existing arrival helper and existing orbit helper are reused

---

### 7.4 `src/game/habiti/pendingHabitiPickupMotion.ts`

#### Responsibility

This file provides deterministic Cave-orbit placement for arrived pending-Habiti pickups.

#### Why it may need change

It should not need semantic redesign. It must continue to be used only after arrival.

#### Required logic

No new transit logic belongs here.

If the current file assumes orbit for all pickups regardless of arrival, that assumption must be removed. This file must remain an arrived-orbit motion utility only.

Required interface contract:

- input remains Cave anchor plus pickup identity/order data used for deterministic orbit placement
- output remains orbit position data only

---

## 8. Tests

All tests must follow the project testing contract. fileciteturn3file2

### 8.1 `src/game/handlers/processingPendingHabiti.test.ts`

#### Why it must change

The current tests protect the broken discovered-spawn semantics.

#### Required test coverage

Add or update tests to verify:

- discovered pickups are spawned as unarrived pickups
- discovered pickups are not set to `phantom` at spawn
- discovered pickups are not explicitly repositioned after spawn
- one discovered pickup command sequence is emitted per newly discovered habitus

---

### 8.2 `src/game/systems/PendingHabitiPickupSystem.test.ts`

#### Why it must change

The current system tests must protect the transit-to-arrival handoff rather than implicitly assuming arrived/orbit semantics too early.

#### Required test coverage

Add or update tests to verify:

- unarrived pickups are targeted at `sys_world`
- unarrived pickups are kept off the `phantom` layer
- unarrived pickups do not receive orbit-positioning commands
- pickups switch to `pending_habiti_arrived = 1` only after reaching Cave
- on arrival, pickups transition to `phantom`
- after arrival, pickups are positioned using Cave orbit motion

---

### 8.3 New or updated integration test around simultaneous discovered pickups

#### Why it is required

The core regression is specifically about multiple discovered pickups collapsing onto one another and failing to separate.

#### Required test coverage

Add an integration-style test at the appropriate system/handler layer to verify:

- when multiple Habiti are discovered from one processed body, multiple pickup entities are materialized
- the discovered spawn path does not emit a command sequence that re-collapses all pickups to the exact same source point after spawn
- the resulting pickups remain eligible for normal non-phantom separation during transit

The test must assert behavior through emitted commands and/or resulting runtime state, not implementation trivia.

---

## 9. Acceptance Criteria

The change is complete only when all of the following are true.

### 9.1 Spawn and transit

- newly discovered pending-Habiti pickups spawn as unarrived pickups
- newly discovered pending-Habiti pickups are not phantom during transit
- newly discovered pending-Habiti pickups are not explicitly re-positioned after spawn in a way that destroys spawn separation
- newly discovered pending-Habiti pickups target Cave and move toward it

### 9.2 Separation

- simultaneous discovered pickups can separate from one another during transit using the existing physics pipeline
- the implementation does not introduce custom spread logic when existing spawn placement and separation already suffice

### 9.3 Orbit handoff

- a pickup begins Cave orbit only after arrival is detected
- upon arrival, the pickup transitions to the `phantom` layer
- arrived pickups are positioned by the existing Cave orbit utility

### 9.4 Test contract

- tests no longer assert phantom-at-spawn semantics for discovered pickups
- tests explicitly protect transit, separation eligibility, and arrival-to-orbit handoff
- all tests remain deterministic and readable per project standards fileciteturn3file2

---

## 10. Summary

This fix is intentionally narrow.

It corrects only the pending-Habiti pickup movement contract by making discovered pickups:

- spawn as true transit objects
- remain dynamic and non-phantom while traveling to Cave
- use existing spawn placement and separation to avoid permanent stacking
- switch to phantom orbiters only after reaching Cave

No other Habiti behavior is changed.

