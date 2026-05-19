# Phase 16 -- Systems Refactor LLD

## Overview

This document defines the Low-Level Design (LLD) for the Phase 16
Systems Refactor. The refactor improves readability, structure, and
performance of the System Phase execution path without altering runtime
behavior.

This document contains: - Why the refactor is required - What changes
are being introduced - How each affected file will change - Explicit
contracts and invariants - Complete testing strategy

No behavior changes are introduced.

------------------------------------------------------------------------

# 1. Why

## 1.1 Problem Statement

The current `systemPhase` implementation:

-   Interleaves scheduling policy and execution mechanics.
-   Repeats buffer creation and merge logic for each system group.
-   Obscures pause semantics and ordering rules.
-   Allocates and copies command buffers unnecessarily in the hot path.

Although behavior is correct and covered by tests, readability and
maintainability are below target standards.

## 1.2 Goals

-   Make System Phase scheduling readable as policy.
-   Centralize execution mechanics.
-   Reduce hot-path allocation and copying.
-   Preserve all runtime invariants.
-   Maintain full test coverage and determinism.

## 1.3 Non‑Goals

-   No changes to phase order.
-   No changes to pause semantics.
-   No changes to command budget behavior.
-   No changes to determinism.
-   No new features.

------------------------------------------------------------------------

# 2. What

## 2.1 High-Level Changes

1.  Introduce a named `Tickable<T>` interface.
2.  Add `runtimeSystemRunner.ts` to centralize system execution
    mechanics.
3.  Refactor `systemPhase` to delegate mechanics to the runner.
4.  Optimize `createSystemBuffer().drain()` to transfer ownership
    instead of copying.
5.  Add unit and integration tests for new logic.

## 2.2 Preserved Invariants

-   Systems read from Snapshot only.
-   Systems emit commands only.
-   Apply → Snapshot → System → Collect → Advance order remains
    unchanged.
-   Draft pause semantics remain identical.
-   Command overflow remains fatal.
-   Automation snapshot behavior unchanged.

------------------------------------------------------------------------

# 3. How

## 3.1 Add: runtime/systems/Tickable.ts

### Responsibility

Define canonical interface for tickable runtime units.

### Interface

Tickable`<T>`{=html} where: - tick(snapshot, commands, dt) returns T.

No logic in this file.

------------------------------------------------------------------------

## 3.2 Change: runtime/systems/System.ts

### Responsibility

Represent a runtime System.

### Changes

System now extends Tickable`<void>`{=html}. `runsWhenPaused` remains
unchanged.

No logic change.

------------------------------------------------------------------------

## 3.3 Add: runtime/runtimeSystemRunner.ts

### Responsibility

Centralize execution mechanics of systems.

### Exports

-   runTickableVoid
-   runTickableReturning
-   runRegisteredSystems

### Behavior

-   Uses provided reusable buffer.
-   Invokes tick.
-   Drains buffer.
-   Calls mergeSystemBatch.
-   Applies pause filtering for registered systems.

No scheduling policy in this file.

------------------------------------------------------------------------

## 3.4 Change: runtime/runtimeSystemBatch.ts

### Change: drain() optimization

Old behavior: - Returns copy of internal buffer.

New behavior: - Returns internal array. - Replaces internal storage with
new empty array. - Ownership transferred to caller.

### Postconditions

-   Buffer empty after drain.
-   Returned array safe to mutate.
-   No external semantic changes.

------------------------------------------------------------------------

## 3.5 Change: runtime/runtimePhases.ts

### Responsibility

Own phase orchestration.

### systemPhase refactor

1.  Early exit if dt \<= 0.
2.  Compute pauseSystems.
3.  If not paused:
    -   Run preBehaviorSystems
    -   Run behaviorSystem
    -   Run automationSystem (capture return)
4.  Always run registeredSystems (filtered by pause rule).
5.  Return emittedCommands + automationSnapshot.

Mechanics delegated to runner. Exactly one reusable buffer allocated per
systemPhase call.

No behavioral changes.

------------------------------------------------------------------------

# 4. Testing Strategy

## 4.1 Unit Tests

### runtimeSystemRunner.test.ts

-   Runs void tickable and merges commands.
-   Runs returning tickable and returns value unchanged.
-   Preserves ordering.
-   Applies pause filtering correctly.
-   Overflow sets fatal and throws.

### runtimeSystemBatch.test.ts

-   Drain returns commands and empties buffer.
-   Ownership transfer verified.
-   Subsequent enqueues unaffected by drained array mutation.

## 4.2 Integration Tests

### runtimePhases.systemPhase.test.ts

-   Verifies ordering when not paused.
-   Verifies pause semantics.
-   Verifies dt \<= 0 early exit.
-   Verifies automation snapshot passthrough.

All tests follow Given/When/Then structure.

------------------------------------------------------------------------

# 5. Rollout Plan

1.  Add Tickable.
2.  Update System interface.
3.  Add runtimeSystemRunner.
4.  Refactor systemPhase.
5.  Optimize drain().
6.  Add tests.
7.  Run full suite.

------------------------------------------------------------------------

# 6. Contract Compliance

-   No scope expansion.
-   No new features.
-   No behavioral changes.
-   Determinism preserved.
-   Test coverage maintained.

------------------------------------------------------------------------

End of Document.
