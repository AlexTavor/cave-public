LLD — Activity conditions Field + Smart Autocomplete (Behavior-based Scope)

Owner: Alex Tavor
Audience: Engine + Devtools implementers
Status: Design-ready (Revised for Conditions List & UI Safety)

0. Why

0.1 Product goal

Keep HLL small and tight, while supporting:

Conditional availability of active Abilities without requiring bespoke “Injection Ability” hacks.

A single, consistent condition language for designers (same mental model as DSL Behavior IF… but without DO).

0.2 User-facing problem

Active abilities need a conditions field to control whether they run.

Multiple conditions: Users need to define multiple checks (implicitly AND-ed) as a list, rather than one giant complex string.

The condition editor must autocomplete intelligently:

know whether the current token is a ref/op/value.

avoid inserting unnecessary spaces.

for path suggestions, prefer ".[more]" instead of suggesting "." and then "[more]" on separate steps.

Value literal dual-typing: treat numbers as numbers (no string suggestions).

0.3 Scope Constraint (Revised)

Included: Production, Spawner, Cycle, Conversion.

These compile to BehaviorRule objects at runtime, providing a valid target for conditions.

Excluded: Storage, Upkeep, Sampler, Injection, Assignment.

These compile to passive state/effects or system configurations and lack a unified "rule" structure to attach dynamic conditions to without architectural refactoring.

1. What (exact requirements)

1.1 Data model: conditions list on specific Activity entries

Definition

The following ability config schemas in the Blueprint editor gain:

type ConditionLine = string; // Single condition expression (e.g. "self.state.foo > 5")
// Added to specific schemas only

This must apply ONLY to:

production[]

conversion[]

spawner[]

cycle (single object)

Semantics

The field is conditions: string[].

If the array is empty → always true.

Runtime evaluation: All conditions in the list must return true for the ability to execute (AND logic).

If parsing of any line fails:

The entry is invalid.

The editor must show a validation error for that specific line.

Compilation must not silently ignore the condition (fail safe).

1.2 Execution semantics: Runtime Rule Integration

Conditions are evaluated at runtime as part of the standard BehaviorSystem rule evaluation pipeline.

Exact gating rule

The compiled BehaviorRule for the ability will include one condition object per line in the conditions array.
The BehaviorSystem already requires ALL conditions in a rule to be met.

Context inputs are:

Standard BehaviorContext (self, snapshot, globals).

1.3 Editor behavior

Where the field appears

For the allowed ability rows (Production, Conversion, Spawner, Cycle):

Add a Conditions section.

It acts as a list of text inputs (CRUD):

Add: Button to append a new condition line.

Remove: Button to remove a specific line.

Edit: Each line is an individual ConditionInput.

Tooltips:

The section header must have a tooltip: "Conditions that must be met for this ability to run. All conditions must pass."

The "Add" button must have a tooltip: "Add a new condition check."

Validation UI rules

When any input line is non-empty and cannot parse:

show an inline error for that line.

block save/apply via Zod schema validation.

1.4 Autocomplete behavior (smart input)

“Smart input” must:

Use the existing Suggestion model (insertText supported).

Never insert redundant whitespace:

If cursor is at "IF|" and you choose "self.state.foo", result must be "IF self.state.foo|" (one space).

If cursor is already after a space, it must not add another.

Path suggestions:

If the next valid syntactic token is . followed by [...] expansion, show one suggestion that inserts ".[more]" (or the specific segment), rather than a bare ".".

Value literal dual-typing:

If the user has typed a number prefix (-, digits, . patterns) and the current token is a value:

treat as numeric mode → do not suggest strings.

Otherwise, if a string is valid at this position:

suggest strings (e.g., enum-like values, quoted strings if required).

2. How (implementation plan)

This section defines exact file responsibilities, interfaces, and logic.

2.1 Schema changes (data layer)

Change: extend specific ability schemas with conditions: string[]

File: src/ui/devtools/editors/blueprint/mode/abilitySchemas.ts
Responsibility: Zod schemas used by editor.

Interface change:

For CycleAbilitySchema, ProductionAbilitySchema, ConversionAbilitySchema, SpawnerAbilitySchema:

Add: conditions: z.array(z.string()).optional().default([]).

Do NOT add to Storage, Upkeep, etc.

Change:

create\*AbilityDraft helpers must include conditions: [] in their returned defaults.

File: src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts
Responsibility: Provide default new entries for editor add actions.

2.2 Parsing conditions into Logic tokens

Reuse existing logic token model

Draft options already store conditions as:

{ id: string; sortKey: string; tokens: LogicToken[] }

New module: src/engine/compiler/conditions/compileConditionText.ts

Responsibility:

Convert ConditionText into LogicToken[].

Provide deterministic errors.

Interface:

import type { LogicToken } from "../../../data/schemas/logic";

export type CompileConditionResult =
| { ok: true; tokens: LogicToken[] }
| { ok: false; error: string };

export function compileConditionText(input: string): CompileConditionResult;

Implementation Detail:

Move the core tokenization logic from src/ui/devtools/editors/behaviors/compiler/tokenizer.ts to src/lib/logic/tokenizer.ts (or similar shared path) so the engine can use it without importing from ui.

The parser must validate that the token sequence forms a valid logic expression.

2.3 Evaluating conditions at runtime

No new runtime evaluator module is needed.
Since we are attaching these conditions to BehaviorRule objects, the existing BehaviorSystem and JsonLogicAdapter will handle evaluation automatically.

2.4 Ability compiler integration

Goal

Inject the compiled tokens into the generated BehaviorRule.

Where to implement

Files (engine compilers):

src/engine/compiler/abilities/cycleCompiler.ts

src/engine/compiler/abilities/productionCompiler.ts

src/engine/compiler/abilities/conversionCompiler.ts

src/engine/compiler/abilities/spawnerCompiler.ts

Responsibility change (all these files):

Read config.conditions (array).

For each string in the array:

If empty/whitespace, skip.

Call compileConditionText.

If valid, append a new condition object to the generated BehaviorRule.conditions.

If invalid, log an error but continue (treat as passed to avoid breaking the runtime, or fail compilation if strict mode preferred). Strict mode decision: Compiler should just skip invalid conditions but warn loudly, allowing the game to load.

// Example inside compiler:
config.conditions?.forEach((condText, index) => {
if (!condText.trim()) return;
const result = compileConditionText(condText);
if (result.ok) {
rule.conditions.push({
id: `gate_${rule.id}_${index}`,
sortKey: `z_gate_${index}`,
tokens: result.tokens
});
} else {
console.warn(`Condition error in ${draft.id}: ${result.error}`);
}
});

2.5 Devtools UI: Conditions List + Smart Autocomplete

UI goal

Provide a list-based editor for conditions using the behavior autocomplete.

New hook: src/ui/devtools/editors/conditions/useConditionAutocomplete.ts

Responsibility:

Provide behavior-like suggestions for conditions-only grammar.

Interface:

export const useConditionAutocomplete: (input: string, cursor: number) => Suggestion[];

Logic:

It must call the shared state machine with a flag or filtered operator set that disables DO and Action suggestions.

New UI component: ConditionInput.tsx

File: src/ui/devtools/editors/conditions/ConditionInput.tsx
Responsibility: Single line text input with inline autocomplete.

Interface:

export interface ConditionInputProps {
value: string;
onChange: (next: string) => void;
error?: string | null;
placeholder?: string;
}

New UI component: ConditionsField.tsx

File: src/ui/devtools/editors/conditions/ConditionsField.tsx
Responsibility:

Renders the list of ConditionInput rows.

Handles Add/Remove operations.

Integrates with the parent form using useArrayField or similar pattern.

Displays tooltips for the section and actions.

Behavior:

Use useArrayField to manage the list of strings.

Render a "Add Condition" button at the bottom.

Ensure adding/removing items does not cause focus loss or render loops (use stable keys, not index, if possible, though primitive strings usually require index keys. Mitigation: Ensure onChange is debounced or handled efficiently to prevent cursor jumps).

2.6 Smart insertion & Shared Logic

Change: extend Suggestion with optional replacement metadata

File: src/lib/terminal/types.ts

export interface Suggestion {
// ... existing
replace?: { from: number; to: number }; // input indices
cursor?: { at: number }; // post-insert cursor position
}

Shared Logic Update

File: src/ui/devtools/editors/behaviors/autocomplete/behaviorStateMachine.helpers.ts

Update buildSeeds to populate replace when handling partial tokens.

2.7 Value literal dual-typing

New helper: parseGameValueLiteral

File: src/lib/logic/parseGameValueLiteral.ts
Responsibility: Check if current token is numeric-in-progress.

Interface:

export type ParsedValue =
| { kind: "empty" }
| { kind: "number"; value: number | null; isPartial: boolean }
| { kind: "string"; value: string };

export function parseGameValueLiteral(raw: string): ParsedValue;

3. Tests

3.1 Unit tests

compileConditionText.test.ts

"" -> []

"self.state.a > 5" -> tokens

"invalid syntax" -> error

productionCompiler.test.ts (and others)

Verify conditions array in config results in multiple rule.conditions entries.

3.2 View Tests (UI Smoke)

ConditionsField.test.tsx (New)

Goal: Verify rendering stability and interaction.

Given: A ConditionsField with value={['self.state.a > 1']}.

Then: Renders one input with that value.

When: User clicks "Add".

Then: onChange called with ['self.state.a > 1', ''].

When: User types in the new field.

Then: onChange called with updated array.

Check: Ensure no infinite render loops during typing (mock onChange).

ConditionInput.test.ts

Verify autocomplete suggestions appear on typing.

3.3 Integration tests

Ability Gating

Setup: World with Production ability having conditions: ["self.state.active > 0", "global.season == 1"].

Given: active=1, season=0.

When: Tick.

Then: No transfer.

When: Set season=1.

Then: Transfer occurs.

4. Documentation

Requirement

Update hll_manual.md to document the new conditions field for the supported abilities.

Explain the syntax (Logic tokens, no DO).

Explain the "AND" behavior of the list.

Ensure the manual examples are correct and compile.

5. Non-goals

Implementing conditions for Storage/Upkeep/Passive abilities.

Visualizing runtime condition failures in the UI (out of scope).
