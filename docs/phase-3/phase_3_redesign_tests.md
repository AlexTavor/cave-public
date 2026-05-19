Phase 3.5: Behavior System Quality & View Layer Fixes

Status: Approved
Context: Post-Phase 3 Review
Objective: Remediate the "dumb" input implementation in the Behavior Editor and establish a comprehensive test safety net for the unified behavior system.

1. Implementation Remediation (View Layer)

The current BehaviorInput uses a raw HTML input, failing to deliver the "Smart Input" experience promised in the LLD.

1.1 BehaviorInput Upgrade

Target: src/ui/devtools/editors/behaviors/BehaviorInput.tsx

Refactor: Replace InputField with SmartInput.

New Hook: Create src/ui/devtools/editors/behaviors/useBehaviorSuggestions.ts.

Level 1 (Verbs): Suggest GIVE, TAKE, SET, WHEN when input is empty.

Level 2 (Refs): If previous token is a Verb or Operator, suggest self, global, or Entity IDs (from useModuleStore).

Integration: Ensure SmartInput handles the "Enter" key correctly to trigger the compiler flow.

2. View Layer Testing Strategy

We must prove the UI works as a functional gateway to the ECS data.

2.1 Component & Hook Tests

File: src/ui/devtools/editors/behaviors/useBehaviorSuggestions.test.ts

Verb Suggestions: Verify empty input returns verb list.

Entity Suggestions: Verify input matching an entity prefix returns that entity ID.

File: src/ui/devtools/editors/behaviors/BehaviorInput.test.tsx

Suggestion Rendering: Verify typing "G" suggests "GIVE" (integration with SmartInput).

Submission: Verify pressing Enter with valid text calls onSubmit.

Error Feedback: Verify passing an error prop renders the error message visually.

File: src/ui/devtools/editors/behaviors/BehaviorList.test.tsx

Rendering: Verify a list of mixed Logic, Flow, and Trigger items renders the correct badges and text.

Interaction: Verify clicking "Remove" calls the onDelete handler with the correct item ID.

Empty State: Verify the "No behaviors yet" message appears when the list is empty.

2.2 Integration Tests (Panel Level)

File: src/ui/devtools/editors/behaviors/BehaviorsPanel.test.tsx

Flux Cycle:

Mount Panel with a mock session.

Simulate typing "GIVE 10 wood TO target" into Input.

Simulate Enter.

Verify the List updates to show the new item.

Reactivity: Simulate an external Undo operation and verify the List updates to reflect the previous state.

3. Compiler & Parser Testing Strategy

We must prove the compiler is robust against garbage input and edge cases.

3.1 Extended Compiler Tests

File: src/ui/devtools/editors/behaviors/compiler/compiler.extended.test.ts

Negative Testing:

Input: INVALID_VERB args -> Expect Error "Unknown verb".

Input: GIVE ten wood (NaN) -> Expect Error "Amount must be a number".

Input: WHEN (incomplete) -> Expect Error "Incomplete sentence".

Complex Parsing:

Input: SET self.hp self.hp + 10 IF self.hp < 100 -> Verify correct tokenization of condition vs expression.

Input: GIVE 10 "space wood" TO chest -> Verify quoted string handling (or fail gracefully if unsupported).

3.2 Migration Verification

File: src/ui/devtools/editors/hooks/useEntityBehaviors.migration.test.tsx

Scenario:

Create a mock Session with legacy flow.inputs and flow.outputs.

Render the hook/component.

Assert that draft.components.flow.rules is populated.

Assert that draft.components.flow.inputs is undefined.

4. Runtime Integration Testing Strategy

We must prove the systems interact correctly in a living world.

4.1 Integration Test Suite

File: src/engine/runtime/behavior.integration.test.ts

Circular Triggers:

Setup: Entity A triggers on hp < 10 -> Heals self -> Entity B damages A.

Verify: The loop stabilizes or executes correctly per tick.

Resource Contention (Flow):

Setup: Source has 10 wood. Rule 1: GIVE 10 to A. Rule 2: GIVE 10 to B.

Verify: Only one rule succeeds (or partial if logic permits), state remains valid (no negative wood).

Order of Operations:

Setup: Logic SET A = 1, Flow GIVE A....

Verify: Does Flow see the updated value of A in the same tick or next? (Determinism check).

5. Data Integrity & Schema Strategy

We must ensure that the data structure is robust against serialization issues.

5.1 Schema Stability Tests

File: src/data/schemas/schemas.test.ts

SortKey Injection:

Input: Raw JSON object without sortKey.

Verify: LogicRuleSchema / TriggerRuleSchema injection of ulid based sortKey.

Persistence:

Input: Object with existing sortKey.

Verify: sortKey is preserved (not regenerated) on parse.

6. Execution Order

Fix: BehaviorInput implementation (add SmartInput & useBehaviorSuggestions).

Test: View Layer (Unit tests for Hook, Input, List; Integration test for Panel).

Test: Compiler Extended & Migration.

Test: Data Integrity & Schema.

Test: Runtime Integration.
