# Phase 3.5 Proposal — Logic Hardening & Design-Time Safety

**Status:** Proposed

**Positioning:** Phase 3.5 (post-Engine, pre-UX overhaul)

**Intent:** Reduce catastrophic failure modes and cognitive load in Phase 3 without changing the core simulation model, runtime laws, or architectural accords.

Phase 3 established a powerful, low-level simulation and logic engine. Phase 3.5 acknowledges that this power is easy to misuse. The goal is not to make the system “safe” or “friendly”, but to make **failure legible, preventable, and diagnosable at design time**.

This phase introduces _editorial and analytical infrastructure only_. No new gameplay mechanics, no changes to runtime semantics, and no relaxation of existing constraints.

---

## 1. Non‑Goals

Phase 3.5 explicitly does **not**:

- Change tick semantics, snapshot timing, or physics isolation
- Add new runtime systems or execution paths
- Add gameplay abstractions
- Guarantee correctness or prevent all designer error
- Replace or weaken the Safety Valve

This phase assumes:

- Few dozen nodes at most
- Designers are system-literate
- Future UX iterations will revisit deeper affordances

---

## 2. Problem Statement

Phase 3 exposes several known failure modes:

1. **Global Thrash** — expensive Tier 1 logic accumulating silently
2. **Self‑DDOS** — runaway triggers detected only at runtime via hard crash
3. **Valid Nonsense** — syntactically valid but semantically unreadable logic
4. **Opaque Failure** — Safety Valve halts without actionable provenance
5. **Soft Determinism Gaps** — undefined ordering leading to subtle divergence

Phase 3.5 addresses these through _static analysis, design-time warnings, and explicit ordering rules_.

---

## 3. Scope Overview

Phase 3.5 introduces five pillars:

1. **Logic Linter (Static Analysis)**
2. **Cost & Risk Estimation (Warnings Only)**
3. **Dry‑Run Simulation Mode**
4. **Command Provenance & Diagnostics**
5. **Determinism Hardening (Non‑Physics)**

All features are optional at runtime and advisory by default.

---

## 4. Logic Linter

### 4.1 Purpose

Catch dangerous or unreadable logic _before_ simulation.

This is a static pass over the projectional token stream. No ECS, no tick loop, no physics.

### 4.2 When It Runs

- On rule save
- On blueprint save
- On `SIMULATE --dry-run`

### 4.3 Initial Rule Set (MVP)

**Structural Rules**

- Entity‑tier logic may not contain world queries
- Triggers must contain at least one state transition or effect

**Complexity Rules**

- Boolean operator count
- Nested IF depth
- Total referenced symbols (locals + globals + slots)

**Mutation Rules**

- Multiple writes from a single rule (warn)
- Self‑referential writes (read/write same field)

**Semantic Smell Rules**

- Boolean‑like state stored as numeric without naming convention
- Triggers that appear edge‑less (likely firing every tick)

### 4.4 Output

- Inline warnings on rules
- Aggregated warnings panel per blueprint
- No hard errors unless architecture laws are violated

---

## 5. Cost & Risk Estimation

### 5.1 Philosophy

This is **budget signaling**, not enforcement.

The engine remains permissive. The editor becomes opinionated.

### 5.2 Estimates

**Tier 1 (World Logic)**

- Count of aggregate queries per tick
- Count of globals derived

**Tier 2 (Entity Logic)**

- Rule count × estimated entity count

**Triggers**

- Estimated command emission per tick

### 5.3 Presentation

- Green / Yellow / Red indicators
- Tooltips explaining _why_ a rule is expensive
- No blocking behavior

---

## 6. Dry‑Run Simulation Mode

### 6.1 Command

```
SIMULATE --dry-run
```

### 6.2 Behavior

- Compile all logic token streams
- Run linter
- Run cost estimation
- Validate determinism invariants
- **Do not tick the runtime**

### 6.3 Purpose

- Prevent instant catastrophic crashes
- Enable safe experimentation
- Encourage iteration before live simulation

---

## 7. Command Provenance & Diagnostics

### 7.1 Problem

Current Safety Valve halts execution but provides insufficient context.

### 7.2 Proposal

Attach provenance metadata to emitted commands:

- System name (World / Entity / Trigger)
- Blueprint ID
- Rule ID or index

### 7.3 On Safety Valve Trigger

- Display offending rule(s)
- Display command counts per rule
- Dump provenance summary to terminal

No partial application. No recovery. Just **actionable failure**.

---

## 8. Determinism Hardening (Non‑Physics)

Physics nondeterminism is accepted. Logic nondeterminism is not.

### 8.1 Stable Entity Iteration

- Snapshot builds a deterministically ordered entity list
- Tier 2 logic and triggers iterate this list

### 8.2 Explicit System Order

Lock and document execution order:

1. World Logic
2. Entity Logic
3. Trigger System

Add a unit test asserting this order.

### 8.3 Command Resolution Policy

Define and document one rule:

- **FIFO / enqueue order wins** (or equivalent)

This rule becomes part of the determinism contract.

---

## 9. Editor‑Only Readability Improvements (Optional)

These do not affect runtime or compilation.

- Named constants (compile‑time substitution)
- Rule “shape” templates (cooldowns, clamps, one‑shots)
- Write‑summary header per rule
- Improved visual grouping for nested logic

These are opportunistic but high‑leverage.

---

## 10. Deliverables

Phase 3.5 is complete when:

- Linter runs on save and dry‑run
- Dry‑run simulation exists
- Safety Valve reports provenance
- Entity iteration order is stable
- Command ordering policy is explicit and tested

No UX polish required beyond basic surfacing.

---

## 11. Risks

- False positives may annoy advanced designers
- Over‑warning may lead to alert fatigue
- Static analysis cannot predict all runtime behavior

These are acceptable tradeoffs.

---

## 12. Outcome

Phase 3.5 does not make the engine safer.

It makes **failure earlier, clearer, and cheaper**.

It preserves Phase 3’s power while buying time for future UX‑focused cycles.

**Phase 3 remains the engine. Phase 3.5 makes it usable.**
