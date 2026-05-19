# LLD: Authoring-Side "Generate Description" for Habitus and Understanding Effect Rows

## 1. Why

### 1.1 Problem
The editor currently requires authors to type `effects[].description` manually for every Habitus effect row.

Observed current state:
- `HabitusEffectsSection` renders effect rows and only provides add/remove behavior.
- `HabitusEffectRow` exposes editable fields for `type`, `attribute` or `resource` or `producerTag`, `description`, and `amount`.
- `Description` is a freeform `StringField` with no authoring assist.
- `UnderstandingRowEditor` reuses `HabitusEffectsSection`, so Understanding effects follow the same editing path.

This makes repeated authoring slower and increases the chance that descriptions drift away from the project’s established authored format.

### 1.2 Authoritative pattern source
The existing pattern is already present in authored project data under `src/data/raw/example/modules/core.cave`.

Observed examples:
- `add_absorption_xp_conversion` descriptions use `+{percent}% [icon=xp]XP`
- `add_cave_attribute` descriptions use `+{amount} [icon=attr_<attribute>]<CapitalizedAttribute>`
- `add_resource_gain_multiplier` descriptions use `+{percent}% [icon=<resource>]<CapitalizedResource>`
- `add_producer_output_multiplier` descriptions use `+{percent}% to all [icon=<producerTag>]<CapitalizedProducerTag> production`

The requested feature is therefore an editor convenience that should synthesize the description from fields the author already entered, using the exact authored pattern already present in the project.

### 1.3 Goal
Add a manual `Generate Description` action on the effect-row Description field so authors can populate the description deterministically from the current effect data.

This is an editor-only change. It must not alter runtime behavior, schemas, persistence shape, or effect semantics.

## 2. What

### 2.1 User-visible behavior
For each effect row rendered by `HabitusEffectsSection`, add a `Generate Description` button adjacent to the `Description` field.

When the user activates the button:
- the current effect object at that row is read from the draft
- a deterministic description string is generated from the row’s current authored values
- the generated value replaces the current `description` at that row in the draft
- the change is recorded through the existing session draft update mechanism so undo/redo continues to work

### 2.2 Scope
In scope:
- Habitus effect rows rendered inside `HabitusEffectsSection`
- Understanding effect rows, because `UnderstandingRowEditor` already reuses `HabitusEffectsSection`
- Exact formatting support for the four currently supported effect types:
  - `add_cave_attribute`
  - `add_absorption_xp_conversion`
  - `add_resource_gain_multiplier`
  - `add_producer_output_multiplier`

Out of scope:
- changing effect schemas
- changing runtime display rendering
- auto-regenerating the description when fields change
- preserving any portion of a previous manual description
- adding new effect types
- changing the authored description conventions already present in `core.cave`

### 2.3 Explicit behavioral contract
The button is a one-shot overwrite action.

It does not keep the description synchronized after the click.

After generation, authors may still edit the description manually. Later field edits do not modify the description until the button is clicked again.

## 3. How

## 3.1 Design overview
The implementation will split into two responsibilities:

1. **Pure generation logic**
   - takes one `HabitusEffect`
   - returns either a generated description string or a failure result indicating generation is currently impossible from the row’s data

2. **Editor wiring**
   - renders the button in the row UI
   - reads the current effect from the draft
   - invokes the generator
   - writes the generated string back into `description` using the existing session draft mutation path

This keeps formatting logic out of `.tsx` and keeps the UI layer responsible only for rendering and invoking editor actions.

## 3.2 Generation rules
The generated string must follow the authored patterns already present in `src/data/raw/example/modules/core.cave`.

### 3.2.1 `add_cave_attribute`
Input fields used:
- `amount`
- `attribute`

Output format:
- `+<amount> [icon=attr_<attribute>]<CapitalizedAttribute>`

Examples from current authored data:
- body -> `+1 [icon=attr_body]Body`
- social -> `+1 [icon=attr_social]Social`

### 3.2.2 `add_absorption_xp_conversion`
Input fields used:
- `amount`

Output format:
- `+<percent>% [icon=xp]XP`

Percent conversion contract:
- displayed percent is `amount * 100`
- no additional text is appended

Example from current authored data:
- `0.05` -> `+5% [icon=xp]XP`

### 3.2.3 `add_resource_gain_multiplier`
Input fields used:
- `amount`
- `resource`

Output format:
- `+<percent>% [icon=<resource>]<CapitalizedResource>`

Percent conversion contract:
- displayed percent is `amount * 100`

Generation precondition:
- `resource` must be a non-empty string after trimming

Example from current authored data:
- `resource = wood`, `amount = 0.1` -> `+10% [icon=wood]Wood`

### 3.2.4 `add_producer_output_multiplier`
Input fields used:
- `amount`
- `producerTag`

Output format:
- `+<percent>% to all [icon=<producerTag>]<CapitalizedProducerTag> production`

Percent conversion contract:
- displayed percent is `amount * 100`

Generation precondition:
- `producerTag` must be a non-empty string after trimming

Example from current authored data:
- `producerTag = hommlet`, `amount = 0.1` -> `+10% to all [icon=hommlet]Hommlet production`

## 3.3 String normalization rules
The generator must not invent new naming rules beyond what is required to match the existing authored pattern.

Normalization contract:
- preserve the stored raw identifier for icon ids
- for the visible label segment, capitalize the first character of the raw identifier and preserve the remaining characters as authored
- do not replace underscores with spaces
- do not apply title-casing across multiple segments
- do not localize or otherwise transform the raw identifier beyond first-character capitalization for the visible label segment

Reason:
- this is the minimum transformation required by the current authored examples
- no broader identifier-to-display-name mapping mechanism is used in the current effect row authoring path

## 3.4 Failure contract
Description generation must be deterministic and explicit.

If required source data is missing, generation must not guess.

Failure cases:
- `add_resource_gain_multiplier` with empty or whitespace-only `resource`
- `add_producer_output_multiplier` with empty or whitespace-only `producerTag`

Required UI behavior for failure cases:
- the button must be disabled when generation cannot succeed from the current row state
- the button tooltip must explain why generation is unavailable
- clicking must not mutate the draft when disabled

Generation must always be available for:
- `add_cave_attribute`
- `add_absorption_xp_conversion`

because the current schema and defaults provide the required fields.

## 3.5 Numeric formatting contract
The current authored examples show whole-number percent outputs for decimal multipliers such as `0.05` and `0.1`.

The generator contract is:
- use `amount` directly for `add_cave_attribute`
- use `amount * 100` for percentage-based effects
- render the numeric portion without trailing explanatory text

Implementation detail:
- numeric formatting must be centralized inside the generator helper, not duplicated in the component

The implementation must not introduce alternative percentage wording or rounding behavior not required by the current observed data.

## 4. File-by-file design

## 4.1 Change: `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.tsx`

### Responsibility
Render a single effect-row editor and wire the row-level generate-description action into the existing draft editing flow.

### Required changes
- keep existing field rendering intact
- add a `Generate Description` button adjacent to the `Description` field
- read the current effect object from the current session draft
- invoke the pure generator helper with that effect object
- write the generated string to `<path>.description` through `useSessionStore.getState().updateDraft(...)` and `setByPath(...)`
- disable the button when generation is impossible from current row data
- expose a tooltip explaining both the positive action and disabled-state reason

### Logic contract
Input sources:
- `filename`
- `path`
- current draft state in `useSessionStore`

Output side effect:
- updates exactly one draft path: `<path>.description`

Must not:
- generate description text inline in JSX
- change any path other than `<path>.description`
- auto-run on field change
- update schema or other editor sections

### Interface contract
Props remain unchanged:
- `filename`
- `path`
- `index`
- `subjectLabel?`
- `onDelete`

No parent component API change is required.

## 4.2 Change: `src/ui/devtools/editors/config/body/habiti/HabitusEffectsSection.tsx`

### Responsibility
Continue to render the list of effect rows and add/remove controls.

### Required changes
None are required to support generation behavior if the action is implemented inside `HabitusEffectRow`.

### Logic contract
The section remains a row container only.

### Interface contract
No prop changes.

## 4.3 Change: `src/ui/devtools/editors/config/understanding/UnderstandingRowEditor.tsx`

### Responsibility
Render Understanding-specific fields and reuse `HabitusEffectsSection` for effect editing.

### Required changes
None are required.

### Behavioral consequence
Because this component already reuses `HabitusEffectsSection`, the new row-level button will appear for Understanding effect rows automatically.

This is intentional and within scope because the request targets `HabitusEffectsSection`, which is already shared.

## 4.4 Add: `src/game/habiti/generateHabitusEffectDescription.ts`

### Responsibility
Provide the single pure source of truth for editor-side effect description generation.

### Logic contract
Input:
- one `HabitusEffect`

Output:
- either a success result containing the generated description string
- or a failure result containing a machine-readable reason suitable for the caller to map to disabled-state UI

The helper must:
- branch by `effect.type`
- read only the fields defined by that discriminated union member
- apply the exact format rules defined in section 3
- perform missing-data validation for `resource` and `producerTag`
- keep formatting deterministic and side-effect free

The helper must not:
- read global state
- access React
- mutate inputs
- read module config or runtime state
- attempt to infer labels from external registries

### Interface contract
The module must export:
- the pure generation function
- the explicit result type used by the editor to determine whether to enable the button and what text to write

The return shape must distinguish success from failure without exceptions.

## 4.5 Change: `src/game/habiti/formatHabitusEffectSummary.ts`

### Responsibility
Continue resolving stored authored descriptions for runtime display entry generation.

### Required changes
None are required for this feature.

### Reason
This file currently only returns already-authored descriptions. The requested feature is generation, not runtime summary resolution. Mixing the new authoring action into the existing runtime-facing helper is unnecessary and would blur responsibilities.

## 4.6 Tests: `src/game/habiti/generateHabitusEffectDescription.test.ts`

### Responsibility
Unit-test the pure generation contract.

### Required coverage
Happy path:
- generates correct description for `add_cave_attribute`
- generates correct description for `add_absorption_xp_conversion`
- generates correct description for `add_resource_gain_multiplier`
- generates correct description for `add_producer_output_multiplier`

Negative path:
- returns failure for empty `resource`
- returns failure for whitespace-only `resource`
- returns failure for empty `producerTag`
- returns failure for whitespace-only `producerTag`

Edge coverage:
- preserves the raw id for icon token construction
- capitalizes only the first character of the visible label segment
- keeps generation deterministic for repeated calls with the same input

### Test style contract
- pure unit tests only
- no DOM
- no mocks for data structures
- explicit Given / When / Then organization

## 4.7 Change: `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.test.tsx`

### Responsibility
Verify row-level editor wiring for the new action.

### Required coverage additions
- renders a `Generate Description` button
- clicking the button writes the generated description into the correct draft path
- existing manual edit behavior for the textarea remains intact
- remove-effect behavior remains intact

### Required setup style
Use the existing session initialization pattern already present in this test file.

## 4.8 Add or change: `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.generateDescription.test.tsx` or expand existing row tests

### Responsibility
Verify disabled-state behavior for row types that require `resource` or `producerTag`.

### Required coverage
- button is disabled for resource multiplier rows with missing `resource`
- button is disabled for producer-output rows with missing `producerTag`
- activating generation on valid rows updates only `description`

### File choice contract
Either:
- extend `HabitusEffectRow.test.tsx`, or
- add a focused test file beside it

Do not duplicate setup unnecessarily. Prefer whichever option keeps the tests shorter and clearer.

## 4.9 Change: `src/ui/devtools/editors/config/body/habiti/HabitusEffectsSection.test.tsx`

### Responsibility
Continue covering section-level add/remove behavior.

### Required changes
No behavior change is required at section level.

The existing test may remain unchanged unless a UI text collision from the new button requires a more precise query.

## 5. Detailed interaction flow

### 5.1 Generate Description action flow
1. User opens a Habitus or Understanding effect row.
2. User edits the effect fields as needed.
3. User clicks `Generate Description`.
4. The row component reads the current effect object from `state.sessions[filename].draft` at `path`.
5. The row component passes that object into the pure generation helper.
6. If the helper returns failure:
   - no draft mutation occurs
   - the disabled state and tooltip explain the missing prerequisite
7. If the helper returns success:
   - the row component calls `updateDraft(filename, recipe)`
   - the recipe writes the generated description to `<path>.description` using `setByPath`
8. The textarea reflects the updated value via the existing field subscription flow.

## 6. Contract adherence

### 6.1 Architectural laws
This design adheres to the supplied architecture contract:
- UI components remain render/wiring layers only
- generation logic lives in a pure non-React module
- editor changes flow through Zustand session draft actions
- no runtime mutation or direct ECS state changes are introduced

### 6.2 Prompt contract
This design stays within scope:
- no schema change
- no refactor of unrelated editor fields
- no new abstractions beyond one small pure helper required by the feature
- no changes outside the effect-row authoring path and its direct tests

### 6.3 Testing standards
This design matches the testing contract:
- business logic isolated into a pure helper for unit testing
- UI tests verify rendering and wiring only
- tests remain colocated with their source files

## 7. Non-goals and rejected alternatives

### 7.1 Rejected: auto-regenerate on field change
Rejected because:
- the requirement is explicitly a button-driven action
- current `description` is authored text, not a derived-only field
- auto-sync would overwrite manual edits and change field semantics

### 7.2 Rejected: add generation logic to `StringField`
Rejected because:
- `StringField` is a generic field primitive used broadly across the editor
- the requested behavior is specific to Habitus/Understanding effect descriptions
- changing the generic field component would increase scope and couple unrelated editors to this feature

### 7.3 Rejected: change `formatHabitusEffectSummary.ts` to own generation
Rejected because:
- that module currently resolves stored descriptions for runtime display use
- this feature is an editor authoring action, not runtime summary resolution
- a dedicated generator helper keeps responsibilities unambiguous

## 8. Acceptance criteria

The implementation is complete when all of the following are true:

1. Every effect row in `HabitusEffectsSection` shows a `Generate Description` button.
2. Clicking the button on a valid row writes the exact generated description into that row’s `description` field.
3. The generated strings follow the current authored `core.cave` pattern for all four supported effect types.
4. Resource multiplier rows without a usable `resource` keep the button disabled.
5. Producer-output multiplier rows without a usable `producerTag` keep the button disabled.
6. Manual editing of `description` still works exactly as before.
7. Remove-effect behavior still works exactly as before.
8. Understanding effect rows receive the same button through the existing shared section path.
9. Unit and UI tests covering the above behavior are present and green.
