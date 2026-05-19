Phase 3 — Refactor & Hardening

Status: Locked (Updated)
Focus: Performance, Determinism, Type Safety
Context: Concrete implementation spec for Phase 3

0. Explicit Scope and Overrides

This document introduces intentional, logged exceptions to the canonical architectural rules for the purpose of performance and determinism hardening. These exceptions are approved and tracked separately. All other canonical laws remain in force.

This document augments (and where noted, overrides) the Phase 3 LLD. Any divergence is explicitly declared below; no implicit overrides exist.

1. Snapshot Architecture Refactor

1.1 The Problem

The previous Snapshot design used structuredClone and deep freezing to enforce immutability. This creates an O(N) cost per tick proportional to entity count and physics body count, causing unacceptable GC pressure and frame instability at scale.

1.2 The Solution: Reference-Based Snapshot

The Snapshot will transition from eager cloning to a zero-copy, reference-based model.

Declared Override (LLD §2 / Context Pack §2–3):

Snapshot no longer clones ECS entities or physics bodies.

Snapshot holds direct references to the ECS World and ImpulseEngine.

class Snapshot {
private readonly entities: ReadonlyArray<Readonly<RuntimeEntity>>;
// ...
}

1.3 Immutability Enforcement Strategy

The "Type-Only" Contract:

Runtime: No runtime freezing or proxying is performed in any environment.

Compiler: All Snapshot accessors return Readonly<T>.

Discipline: Mutation of Snapshot data is forbidden. Developers must rely on TypeScript errors and linting to prevent accidental mutation.

Rationale:

Proxy overhead (wrapping/unwrapping) is prohibitive for high-entity-count simulations, even in Dev.

Performance consistency between Dev and Prod is prioritized over runtime safety rails.

2. Determinism Guarantees (Augmented)

2.1 Stable Entity Ordering (Dirty Flag Optimization)

Miniplex does not guarantee iteration order. Sorting $O(N \log N)$ every tick is too expensive.

Implementation:

Runtime State: The Runtime class maintains a persistent cachedSortedEntities array and a isEntityListDirty flag.

Write Phase: Runtime.addEntity and Runtime.killEntity operations set isEntityListDirty = true.

Snapshot Phase:

If isEntityListDirty is true: Re-fetch all entities, sort by ID, update cache, clear flag.

If isEntityListDirty is false: Reuse existing cache.

Read Phase: Snapshot receives the stable cachedSortedEntities array reference.

Cost Profile:

Static Ticks: $O(1)$ (Reference copy).

Dynamic Ticks: $O(N \log N)$ (Sort only when topology changes).

2.2 Snapshot Temporal Isolation

Guarantees:

Snapshot entity list, query results, and physics projections are tick-stable.

No entities created, destroyed, or reordered during System Phase are visible until the next tick.

All Systems operate on the same frozen-in-time view.

3. Logic System Optimization (GC Reduction)

3.1 The Problem

Allocating a fresh EvaluationContext per entity per tick creates significant GC churn.

3.2 The Solution: Hoisted Mutable Context (Approved Exception)

The LogicSystem owns a single reusable context object:

private readonly context: Partial<EvaluationContext> = {};

Per tick:

Tick-scoped fields (snapshot, globals) are set once.

Per-entity field (self) is hot-swapped inside the loop.

Context is cast to EvaluationContext at evaluation time.

Declared Exception:

This introduces controlled shared mutable state inside LogicSystem.

Justified by GC reduction and hot-path performance.

Invariant:

Context object MUST NOT escape the system.

No rule may retain references to the context.

4. Runtime Safety Valve (Command Budget)

4.1 Atomic Batch Commit

Each System (WorldSystem, LogicSystem, TriggerSystem):

Emits commands into a local buffer.

Before merging, the Runtime checks:

if (globalCount + localBatch.length > MAX_COMMANDS_PER_TICK) {
localBatch.length = 0;
throw new Error(
`Command Overflow in ${systemName}: ${JSON.stringify(analyzeBatch(localBatch))}`,
);
}

4.2 Failure Semantics

On overflow:

Entire local batch is discarded.

No commands from that System are applied.

Tick does not advance.

Runtime enters fatal error state.

No partial application is permitted.

5. Schema Introspection Hardening

(Approved Scope)

All schema introspection utilities MUST use strict Zod interfaces.

any is forbidden.

ZodFirstPartyTypeKind is the only supported discriminator.

This reduces fragility against Zod internal changes.

6. Summary of Architecture

Feature

Implementation Strategy

Snapshot

Zero-copy reference

Immutability

Type-Only (TS Readonly<T>)

Iteration

Dirty-Flag Sorted Cache (Runtime-managed)

Determinism

Tick-stable snapshot view

Logic Context

Hoisted mutable context

Safety Valve

Atomic per-system batches

Schema Types

Strict Zod interfaces

7. Explicit Overrides Log

Snapshot cloning removed (Performance exception).

Runtime Immutability Guards removed (Performance/Complexity tradeoff).

Sorting moved from Snapshot-read to Runtime-write (Dirty Flag optimization).

Shared mutable context inside LogicSystem.

All overrides are intentional, reviewed, and logged.
