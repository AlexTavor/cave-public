Low-Level Design: Updater Ability

1. The Why

The engine's High-Level Language (HLL) Abilities are currently heavily optimized for a "Pull" economic architecture (Storage, Production, Conversion, Upkeep). There is no dedicated capability to perform arbitrary state mutations (e.g., incrementing a global purge_progress tracker) upon the completion of a cycle.

Directly editing the Low-Level Language (LLL) behavior components to inject these rules violates the compiler contract, as manual edits risk being overwritten or misaligned with compiler sort-key conventions. The Updater ability fills this gap by providing a first-class, data-driven HLL capability to execute targeted state mutations precisely when a cycle completes, safely managed by the compiler.

2. The What

The Updater is a repeatable, array-based Ability that executes a MUTATE action whenever an entity's Cycle ability completes.

It defines:

Target: The fully qualified path to mutate (e.g., sys_world.state.purge_progress.value).

Operation: The arithmetic operation to apply, strictly constrained to "SET", "ADD", or "SUB".

Value: The amount to apply, which accepts an ActionValue (allowing static numbers or dynamic logic references like self.state.some_value.value).

Conditions: Optional logical gates that must pass (in addition to cycle completion) for the mutation to occur.

During compilation, this ability is transformed into a behavior rule equipped with the standard cycle-completion conditions. It utilizes a specific sortKey prefix (45\_) to ensure it executes before the engine resets the cycle state at the end of the tick.

3. The How (File Modifications & Additions)

3.1 Data Schema Layer

File: src/data/schemas/abilities/updater.ts (New)

Responsibility: Define the authoritative Zod schema and TypeScript typings for the Updater ability.

Logic:

Define UpdaterAbilitySchema as an object containing:

target: A required string.

op: A Zod enum explicitly restricted to ["SET", "ADD", "SUB"] (to match MutateActionSchema), defaulting to "ADD".

value: Uses ActionValueSchema (imported from ../behavior.ts) to permit both numbers and string logic references.

conditions: An optional array of strings, defaulting to an empty array.

Interface: Export UpdaterAbilitySchema and the inferred UpdaterAbilityConfig type.

File: src/data/schemas/abilities/index.ts (Modify)

Responsibility: Expose the new schema to the aggregate Editor Abilities definition.

Logic:

Import the newly created UpdaterAbilitySchema.

Append updater: z.array(UpdaterAbilitySchema).optional() to the EditorAbilitiesSchema object shape.

Interface: No interface changes, just extending the existing Zod object.

3.2 Compiler Layer

File: src/engine/compiler/abilities/updaterCompiler.ts (New)

Responsibility: Translate the HLL UpdaterAbilityConfig into an LLL BehaviorRule.

Logic:

Accepts the target blueprint, the UpdaterAbilityConfig, and the array index.

Ensures the components.behavior.rules array exists on the blueprint.

Constructs a new rule object:

ID: formatted as sys*updater*{index}.

Sort Key: formatted as 45*updater*{index} (ensuring execution before cycle reset).

Conditions: Populated first by calling cycleCompleteConditions().

Actions: A single object of type MUTATE, mapping the target, op, and value straight from the config.

If custom conditions exist in the config, call appendRuleConditions to compile and append them.

Push the rule into the behavior rules array.

Interface: Exports updaterCompiler function.

File: src/engine/compiler/CompilerService.ts (Modify)

Responsibility: Register the updater compiler in the primary compilation pipeline.

Logic:

Within the compile method, check if abilities.updater exists on the draft.

Iterate over the updater array, invoking updaterCompiler for each entry.

Interface: Internal modification to the compile method pipeline.

File: src/engine/compiler/validation/collisionDetector.ts (Modify)

Responsibility: Warn the user if they configure an Updater on an entity that has no Cycle ability.

Logic:

Within the collisionDetector function, extract the updater array.

If the updater array has a length greater than zero, and abilities.cycle is undefined, generate a warning issue.

Issue details: Severity warning, indicating that Updaters require a Cycle ability to trigger.

Interface: Returns the appended warnings via the standard ValidationIssue[] array.

3.3 UI State & Sanitization Layer

File: src/ui/devtools/editors/blueprint/mode/abilitySchemas.ts (Modify)

Responsibility: Inform the Designer Mode form orchestrator about the new ability.

Logic:

Import UpdaterAbilitySchema.

Add updater to the abilitySchemas map as an array of the schema.

Add the string "updater" to the arrayAbilities Set.

Interface: Modifies exported constants.

File: src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts (Modify)

Responsibility: Provide safe default values when a user clicks "Add Component -> Updater".

Logic:

Create a factory function returning a plain object: target as an empty string, op as "ADD", value as 1, and conditions as an empty array.

Interface: Export createUpdaterAbilityDraft function.

File: src/ui/devtools/editors/blueprint/mode/abilityListMutations.ts (Modify)

Responsibility: Wire the draft factory into the array mutation handler.

Logic:

Add "updater" to the ArrayAbilityKey union type.

Map the "updater" key to createUpdaterAbilityDraft in the arrayAbilityFactories map.

Interface: Type and mapping extension only.

File: src/ui/devtools/editors/blueprint/mode/useDesignerAbilities.ts (Modify)

Responsibility: Update the hook signature to accept the new ability type.

Logic: Add "updater" to all union types referencing ability keys within the hook's arguments and return signatures.

Interface: Extension of TypeScript literal unions.

File: src/ui/devtools/state/moduleStore.abilitySanitizer.ts (Modify)

Responsibility: Remove broken or empty Updaters before persisting the blueprint to disk.

Logic:

Create a local filter function sanitizeUpdaterList to remove updater entries where target is empty or only whitespace.

Pass the surviving updater entries to sanitizeConditionsInList to strip empty conditional strings.

Update the overall removed and conditionsRemoved counts based on the deltas.

Apply the cleaned array back to the draft abilities object.

Interface: Internal logic addition to sanitizeBlueprintAbilities.

3.4 UI Presentation Layer

File: src/ui/devtools/editors/blueprint/mode/abilityListUtils.ts (Modify)

Responsibility: Provide React list keys and human-readable labels.

Logic:

Add a buildUpdaterKey function taking the entry and index, returning a composite string (e.g., updater-{index}-{target}-{op}-{value}).

Add "updater": "Updater" to the abilityLabels dictionary.

Interface: Export new utility function and update the label map.

File: src/ui/devtools/editors/blueprint/mode/forms/UpdaterAbilityForm.tsx (New)

Responsibility: Render the interactive form fields for a single Updater instance.

Logic:

Render a container grouping three fields horizontally:

SimpleStringField bound to ${basePath}.target.

EnumField bound to ${basePath}.op using a localized z.enum(["SET", "ADD", "SUB"]) schema.

A text/string field compatible with ActionValueSchema (e.g., StringFieldWithPlaceholder or SimpleStringField) bound to ${basePath}.value to allow numbers or logic refs.

Render a ConditionsField component below bound to ${basePath}.conditions.

Crucial UI Requirement: Every user-interactable field component rendered here must be passed a descriptive tooltip prop. This ensures that the underlying components (which leverage the SmartTooltip system) provide inline documentation for all interactable elements upon hover.

Interface: React functional component taking filename and basePath as props.

File: src/ui/devtools/editors/blueprint/mode/AbilityListSections.tsx (Modify)

Responsibility: Map over an array of Updaters and render their forms in collapsible accordion rows.

Logic:

Export a new UpdaterAbilitySection component.

Iterate over the entries prop.

For each entry, render a ComponentRow (title derived from the target or index, icon represents a refresh/update symbol).

Inside the row, render the UpdaterAbilityForm.

Interface: React functional component taking entries, rootPath, and onRemoveItem.

File: src/ui/devtools/editors/blueprint/mode/AbilityList.tsx (Modify)

Responsibility: Embed the new section into the master ability list.

Logic:

Extract abilities.updater (defaulting to empty array).

Render UpdaterAbilitySection beneath the existing sections, passing the required props.

Interface: Extend the onRemoveItem prop type to include "updater".

4. Testing Strategy

Following the Canonical Testing Standards:

Unit Test Target: src/engine/compiler/abilities/updaterCompiler.test.ts

Happy Path:

Given a blueprint draft with a cycle ability and an updater configuration.

When updaterCompiler is invoked.

Then the resulting behavior rules contain a rule with the correct 45*updater* sort key, the standard cycle conditions, and a strictly matching MUTATE action using the configured operation and action value.

Negative/Edge Path:

Given an updater config with no target or a zero value.

When compiled.

Then ensure the compiler does not throw, and emits exactly what was configured (sanitization is the store's job, the compiler must be deterministic).

Given an updater config with custom text conditions.

When compiled.

Then ensure the output rules array aggregates the cycle completion conditions AND the custom compiled conditions correctly.

View Test Target: src/ui/devtools/editors/blueprint/mode/forms/UpdaterAbilityForm.test.tsx

Smoke Test:

Given a valid filename and basePath prop.

When the UpdaterAbilityForm component renders.

Then it mounts without crashing and displays the Target, Operation, Value, and Conditions input fields to the user, ensuring tooltips are present on interactable inputs.
