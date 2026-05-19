LLD: Capacity-Aware Resource Transfer System

1. Objective

Implement a deterministic pre-transfer reservation system that prevents nodes from overdrawing resources beyond a target entity's defined capacity.

2. Why: Architectural Necessity

Deterministic Efficiency: Currently, resources are debited from sources and instantiated as physical entities even if the target cannot hold them. This violates the mental model of "Commands propose change; Apply decides reality" by allowing wasteful proposes that fail only upon physical arrival.

Single Source of Truth: By integrating capacity checks into the TransferHandler, the ledger.incoming becomes a reliable hard-reservation lock, ensuring the ECS world accurately reflects projected storage saturation.

3. Implementation Plan

3.1 Utility: src/engine/runtime/handlers/capacityUtils.ts

Responsibility: Pure, stateless logic for calculating storage availability.
Logic Rules:

Capacity Resolution: Check target.state.capacity.value. Fallback to target.state[resourceKey + "_capacity"].value. Default to Number.POSITIVE_INFINITY.

Saturation Calculation: Sum target.state[resourceKey].value and target.ledger.incoming[resourceKey].

Headroom: Return Math.max(0, Capacity - Saturation).

Clamping: Map requested payload to available headroom per resource.

3.2 Handler: src/engine/runtime/handlers/TransferHandler.ts

Responsibility: Intercept and validate transfer requests.
Deltas:

Call clampPayloadToCapacity immediately upon receiving TRANSFER_ASSETS.

Guard: If total clamped payload sum is $\leq 0$, log a loud error via telemetry.log("errors", ...) and abort.

Proceed with debiting source and queuing the physical transfer entity using the clamped payload.

4. Testing Specification (Canonical Standards)

4.1 Unit Tests: capacityUtils.test.ts

Adhere to Given-When-Then and factory-based setup.

Scenario: Partial Clamping

Given: A target with capacity: 100, current: 80, and incoming: 10.

When: clampPayloadToCapacity is called with a request for 50.

Then: The resulting payload should be exactly 10.

Scenario: Over-Saturation

Given: A target that is already over capacity (current: 110, capacity: 100).

When: calculateHeadroom is called.

Then: Result must be 0, never negative.

4.2 Integration Tests: TransferHandler.integration.test.ts

Verify interaction between command proposal and world state.

Scenario: Illegal Overdraw Command

Given: A world where Target is full.

When: TRANSFER_ASSETS command is proposed.

Then: Source state remains unchanged, no transfer entity is spawned, and an error is logged to telemetry.

5. Constraints & Mental Model

No Direct Mutation: Clamping logic must return a new payload object; it must not mutate the command or the target state directly.

Loud Failures: As per Law #3, if a node attempts to transfer to a full target, we log loudly rather than failing silently.

Phase Integrity: Clamping happens during the Apply Phase inside the handler, ensuring the Read-Only System phase remains pure.
