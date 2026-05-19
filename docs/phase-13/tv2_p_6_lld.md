LLD: V2 Tooling — Phase 1.5 & Phase 6 (Refinements & Assignment)

Status: Approved for Implementation
Context: Updates previous V2 plans to align with the canonical abilities_manual.md.
Focus: Global Scaling, Assignment Ability, Storage Visibility, and Comprehensive UI Tooltips.

1. Executive Summary

The Why

To fully realize the "Designer Mode" vision, we must refine the compiler logic to match the "Civilization Scale" game design (Global vs Local scaling) and implement the "Station" archetype via the Assignment ability. Additionally, to reduce cognitive load, the UI must inline the documentation via strict tooltips.

The What

Global Scaling: ScalableValue (perBody) compiles to use global.population (System Scale) instead of local assignment count.

Assignment Ability: A new ability to configure the assignment component and state.processing_outputs, enabling the creation of Workstations and Altars.

Storage Visibility: Storage bars are toggleable to reduce UI noise.

Validation: Enforce dependencies (e.g., Production requires Cycle).

Tooltips: Every input field in the Designer must display a tooltip matching the Manual.

2. Data Layer Strategy

2.1. Schema Updates

src/data/schemas/abilities/storage.ts

Responsibility: Define Storage configuration.
Change: Add visible toggle.

export const StorageAbilitySchema = z.object({
// ... existing fields
/\*\*
_ If true, renders a progress bar in the entity display.
_ @default true
\*/
visible: z.boolean().default(true),
});

src/data/schemas/abilities/assignment.ts (New)

Responsibility: Define Assignment and Processing Output configuration.

import { z } from "zod";

export const ProcessingOutputConfigSchema = z.object({
resource: z.string().min(1),
source: z.enum(["fixed", "attribute", "lifetime_xp"]),
attribute: z.enum(["body", "mind", "social"]).optional(),
factor: z.number().default(1),
target: z.string().default("sys_world"),
});

export const AssignmentAbilitySchema = z.object({
slots: z.number().min(0).default(1),
locking: z.boolean().default(false),
// Advanced filters can be added later; keeping simple for now
filter: z.array(z.any()).default([]),
processing_outputs: z.array(ProcessingOutputConfigSchema).optional(),
});

export type AssignmentAbilityConfig = z.infer<typeof AssignmentAbilitySchema>;

src/data/schemas/abilities/index.ts

Responsibility: Register the new schema in the Editor config.

import { AssignmentAbilitySchema } from "./assignment";

export const EditorAbilitiesSchema = z.object({
// ... existing
assignment: AssignmentAbilitySchema.optional(),
});

3. Compiler Logic

3.1. ScalableValue Logic (Global Scaling)

File: src/engine/compiler/utils/scalableCompiler.ts

Responsibility: Generate a passiveEffects chain that calculates Y = Base + (GlobalPop \* PerBody).

Logic:

Target: The path provided (e.g., self.state.cycle.max).

Sequence:

Step 1 (Base): OP: SET, TARGET: target, VALUE: config.base.

Step 2 (Scaling): If config.perBody > 0:

Use a temp variable: self.state.vals.[tempVarName].

OP: SET, TARGET: temp, SOURCE: global.population.

OP: MULT, TARGET: temp, VALUE: config.perBody.

OP: ADD, TARGET: target, SOURCE: temp.

Constraint: This ensures perBody always refers to the global census, aligning with the "Civilization Scale" model defined in the manual.

3.2. Storage Compiler

File: src/engine/compiler/abilities/storageCompiler.ts

Logic Update:

Check config.visible.

IF true: Generate the display.bars entry (existing logic).

IF false: Do not generate the bar. The state entry is still created.

3.3. Assignment Compiler (New)

File: src/engine/compiler/abilities/assignmentCompiler.ts

Responsibility: Transform AssignmentAbilityConfig into assignment component and state.processing_outputs.

Interface:

export const assignmentCompiler = (draft: Blueprint, config: AssignmentAbilityConfig) => void;

Logic:

Component Generation:

Ensure draft.components.assignment exists.

Set slots, locking, filter from config.

Initialize assignedIds: [].

State Generation (Outputs):

If config.processing_outputs has entries:

Ensure draft.components.state exists.

Set draft.components.state.processing_outputs:

{
"value": config.processing_outputs, // Stores the array directly
"visible": false
}

3.4. Validation (Collision Detector)

File: src/engine/compiler/validation/collisionDetector.ts

Logic Update:

Iterate abilities.production entries.

Check: Does abilities.cycle exist?

If No: Push a ValidationIssue (Severity: Warning/Error) -> "Production Ability requires a Cycle Ability to trigger."

4. UI Layer & Tooltips

Strategy: Every form field in the Designer must accept a tooltip prop. The text must strictly match the intent in abilities_manual.md.

4.1. Atom Components (Field Updates)

Responsibility: Update base field components to accept and render a tooltip prop using SmartTooltip.

Files:

src/ui/devtools/editors/fields/number-field/NumberField.tsx

src/ui/devtools/editors/fields/string-field/StringField.tsx

src/ui/devtools/editors/fields/boolean-field/BooleanField.tsx

src/ui/devtools/editors/fields/enum-field/EnumField.tsx

Logic:

Update Props Interface: Add tooltip?: string.

Render: If tooltip is present, wrap the Label or Input in <SmartTooltip content={tooltip}>.

4.2. Atom Updates (Composite)

File: src/ui/devtools/editors/blueprint/mode/forms/atoms/ScalableValueInput.tsx

Interface: Update props to include tooltipBase and tooltipPerBody.

Implementation:

Pass tooltipBase to the Base NumberField.

Pass tooltipPerBody to the Per Body NumberField.

4.3. Cycle Form

File: src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.tsx

Tooltips:

maxProgress: "The total energy (Joules) required to complete one loop."

inputs: "Defines energy demand per second (Watts) for specific attributes."

inputs.[attr]: "Base demand + scaling based on Global Population."

transformTo: "If set, the entity transforms into this Blueprint ID upon cycle completion."

keepProgress: "If true, attempts to map current progress % to the new blueprint."

4.4. Storage Form

File: src/ui/devtools/editors/blueprint/mode/forms/StorageAbilityForm.tsx

Updates: Add BooleanField for visible.

Tooltips:

resource: "The Resource ID (e.g., wood, heat)."

capacity: "Maximum amount the entity can hold."

visible: "If true, adds a progress bar to the entity display. Set to false for hidden buffers."

isDefault: "If true, adds the tag storage:[resource], allowing Producers to find this entity automatically."

entropy: "Amount of resource lost per second (Decay). Useful for Heat or perishable goods."

4.5. Production Form

File: src/ui/devtools/editors/blueprint/mode/forms/ProductionAbilityForm.tsx

Tooltips:

resource: "The Resource ID to produce."

amount: "Quantity produced per cycle completion."

target: "Target Logic: 'self', undefined (smart), or tag:x."

4.6. Conversion Form

File: src/ui/devtools/editors/blueprint/mode/forms/ConversionAbilityForm.tsx

Tooltips:

id: "Unique ID for this process (e.g., smelt_iron)."

inputs: "List of resources consumed per operation."

outputs: "List of resources generated per operation."

resetCycle: "If true, progress resets to 0 after conversion."

4.7. Upkeep Form

File: src/ui/devtools/editors/blueprint/mode/forms/UpkeepAbilityForm.tsx

Tooltips:

resource: "The resource to consume (must have Storage for this)."

rate: "Amount consumed per second."

failureState: "The boolean flag to set in state.flags when empty (e.g., is_starving)."

autoRequest: "If true, automatically issues TRANSFER requests to tag:storage:[resource] when empty."

4.8. Injection Form

File: src/ui/devtools/editors/blueprint/mode/forms/InjectionAbilityForm.tsx

Tooltips:

targetTag: "The tag to search for in the world (e.g., producer)."

effects: "List of math operations to apply to the target."

effects.op: "Operation: ADD, MULT, or SET."

effects.target: "The state path on the destination entity (e.g., state.cycle.max)."

effects.value: "Static number to apply."

4.9. Assignment Form (New)

File: src/ui/devtools/editors/blueprint/mode/forms/AssignmentAbilityForm.tsx

Responsibility: Render configuration for AssignmentAbility.

Fields:

Slots: NumberField

Tooltip: "The maximum number of entities that can be assigned here simultaneously."

Locking: BooleanField

Tooltip: "If true, assigned entities cannot be automatically recalled by the Dispatch system logic."

Processing Outputs: ArrayField

Label: "Processing Outputs (Sacrifice)"

Tooltip: "Defines resources produced when assigned bodies are absorbed/sacrificed."

Item Fields:

Resource: StringField (Tooltip: "The resource ID to produce.")

Source: EnumField (Fixed, Attribute, Lifetime XP)

Attribute: EnumField (Body, Mind, Social) - Conditionally shown if Source = Attribute.

Factor: NumberField (Tooltip: "Multiplier applied to the source value.")

Target: StringField (Tooltip: "Destination: 'sys_world' or 'self'.")

5. Testing Strategy

5.1. Compiler Unit Tests

File: src/engine/compiler/abilities/assignmentCompiler.test.ts

Case 1: Config with slots only. Verify components.assignment is created. Verify state.processing_outputs is undefined.

Case 2: Config with outputs. Verify state.processing_outputs contains the correct JSON structure.

File: src/engine/compiler/utils/scalableCompiler.test.ts

Case 1: perBody: 10. Verify generated passiveEffects logic chain references global.population.

5.2. Validation Tests

Case: Blueprint has Production but no Cycle. Verify collisionDetector returns an issue with message "Production requires Cycle".

5.3. UI Verification (Manual)

Storage Visibility: Open Designer. Toggle "Visible" on Storage. Verify generated blueprint display.bars array updates accordingly.

Assignment: Add Assignment ability. Hover over "Processing Outputs" label. Verify tooltip appears.

Global Scaling: In Cycle ability, set "Per Body" to 10. Check runtime for a sys_world population increase and verify entity metrics update.

6. Implementation Order

Schemas: Create assignment.ts and update storage.ts, index.ts.

Compiler: Update scalableCompiler (Global Scaling), storageCompiler (Visibility), and create assignmentCompiler.

UI Atoms: Update NumberField, StringField, BooleanField, EnumField to support tooltip.

UI Forms: Create AssignmentAbilityForm and update existing forms with tooltips.

Registry: Register assignment in useDesignerAbilities and AbilityListSections.

Tests: Write unit tests
