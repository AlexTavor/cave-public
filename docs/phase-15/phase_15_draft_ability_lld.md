Low-Level Design: Draft Ability (HLL & Editor)

This document provides the unambiguous Low-Level Design (LLD) for implementing the Draft Ability in the Cave Engine's High-Level Language (HLL) and Designer Mode.

The Draft Ability allows an entity to trigger a draft UI sequence upon cycle completion, emitting a TRIGGER_DRAFT behavior action with configurable pool IDs, pull counts, and prompt labels.

1. Schema Definitions

src/data/schemas/abilities/draft.ts (New File)

Why: Defines the canonical data structure for the Draft ability in the HLL payload.

What: Zod schema and TypeScript type for DraftAbilityConfig.

How:

Define DraftAbilitySchema as z.object.

poolId: z.string().min(1) (The ID of the draft pool to use).

count: z.number().min(1).max(5).default(3) (Number of options presented).

label: z.string().optional() (Display title for the draft UI).

conditions: ConditionLinesSchema.optional().default([]) (Standard condition gating).

Export DraftAbilityConfig inferred from the schema.

src/data/schemas/abilities/index.ts

Why: Integrates the new ability into the global editor configuration schema.

What: Updates EditorAbilitiesSchema to include the draft ability array.

How:

Import DraftAbilitySchema from ./draft.

Add draft: z.array(DraftAbilitySchema).optional() to the EditorAbilitiesSchema object definition.

Re-export DraftAbilitySchema and DraftAbilityConfig from the module index.

2. Compiler Implementation & Logic

src/engine/compiler/abilities/draftCompiler.ts (New File)

Why: Translates the high-level draft intent into low-level ECS behavior components.

What: A compiler function that generates a TRIGGER_DRAFT behavior rule.

How:

Export draftCompiler(draft: Blueprint, config: DraftAbilityConfig, index: number): void.

Validate config.poolId. If empty, console.warn and return early without mutating.

Validate draft.components?.state?.cycle. If missing, console.warn that the ability requires a cycle.

Create a BehaviorRule using cycleCompleteConditions() (imported from ./cycleConditions).

Set the rule ID to sys*draft*${config.poolId}_${index} and sortKey to "sys_070".

Add the action: { type: "TRIGGER_DRAFT", poolId: config.poolId, count: config.count, label: config.label, triggerEntityId: "self" }. (Note: triggerEntityId explicitly targets the executing entity).

Call appendRuleConditions(rule, config.conditions, ${draft.id}:draft).

Initialize draft.components.behavior.rules if it doesn't exist, and push the rule into the array.

src/engine/compiler/abilities/draftCompiler.test.ts (New File)

Why: Ensures the compiler logic behaves correctly and fails gracefully, adhering to AAA testing standards.

What: Unit tests for the draft compiler.

How:

Test Happy Path: Given a valid draft config and a blueprint with a cycle, verify it outputs the correct sys*draft*... rule with a TRIGGER_DRAFT action and triggerEntityId: "self".

Test Negative Path: Given a config with an empty poolId, verify it returns without mutating the blueprint and calls console.warn.

Test Edge Case: Given a blueprint without a cycle, verify it still outputs the rule but logs a warning (soft failure).

src/engine/compiler/CompilerService.ts

Why: Registers the Draft compiler in the execution pipeline.

What: Updates the compile method to process Draft abilities.

How:

Import draftCompiler.

Retrieve draftConfigs = abilities.draft ?? [].

Iterate over draftConfigs and execute draftCompiler(draft, config, index).

src/engine/compiler/validation/collisionDetectorExtras.ts

Why: Enforces logic constraints to prevent silent failures at runtime.

What: Adds validation rules for the Draft ability.

How:

Export buildDraftDependencyIssues(abilities: EditorAbilities): ValidationIssue[].

If abilities.draft?.length > 0 but !abilities.cycle, return an error issue: { id: "draft_requires_cycle", severity: "error", ability: "draft", message: "Draft Ability requires a Cycle Ability to trigger." }.

src/engine/compiler/validation/collisionDetector.ts

Why: Wires the new validation checks into the primary detector.

What: Updates collisionDetector pipeline.

How:

Import buildDraftDependencyIssues.

Spread ...buildDraftDependencyIssues(abilities) into the returned array of issues.

3. Editor UI State & Utilities

src/ui/devtools/editors/blueprint/mode/abilitySchemas.ts

Why: Registers the schema for the UI Designer Mode forms.

What: Updates schema maps.

How:

Import DraftAbilitySchema.

Add draft: DraftAbilitySchema.array() to abilitySchemas.

Add "draft" to the arrayAbilities Set.

src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts

Why: Provides the default object instantiation when a user clicks "Add Draft" in the UI.

What: Adds a factory function for Drafts.

How:

Export createDraftAbilityDraft = () => ({ poolId: "", count: 3, label: "", conditions: [] }).

src/ui/devtools/editors/blueprint/mode/abilityListMutations.ts

Why: Enables array-based addition logic for the Draft ability in the UI.

What: Type and factory mappings update.

How:

Add "draft" to the ArrayAbilityKey union type.

Map draft: ReturnType<typeof createDraftAbilityDraft> in ArrayAbilityItemMap.

Add draft: createDraftAbilityDraft to arrayAbilityFactories.

src/ui/devtools/editors/blueprint/mode/abilityListUtils.ts

Why: Configures rendering keys and human-readable labels.

What: Key and label generation.

How:

Export buildDraftKey = (entry: NonNullable<EditorAbilities["draft"]>[number], index: number) => \draft-${index}-${entry.poolId}-${entry.count}``.

Add draft: "Draft" to the abilityLabels map.

src/ui/devtools/state/moduleStore.abilitySanitizer.ts

Why: Strips empty/invalid Draft abilities on save to keep the JSON payload clean.

What: Updates sanitizeBlueprintAbilities.

How:

Create a specific sanitizer for drafts (since sanitizeAbilityList strictly expects { resource: string }):

const sanitizeDraftList = (list: EditorAbilities["draft"]): { list: EditorAbilities["draft"]; removed: number } => {
if (!Array.isArray(list)) return { list, removed: 0 };
const valid = list.filter((entry) => typeof entry.poolId === "string" && entry.poolId.trim().length > 0);
return { list: valid.length ? valid : undefined, removed: list.length - valid.length };
};

Invoke sanitizeDraftList(abilities.draft) in sanitizeBlueprintAbilities.

Add draft.removed to the total removed count.

Ensure the returned blueprint payload reconstructs with draft: condDraft.list ?? draft.list (accounting for conditions sanitizer).

Update condDraft using sanitizeConditionsInList(draft.list) and add condDraft.removed to conditionsRemoved.

4. Editor Presentation (React Components)

src/ui/devtools/editors/blueprint/mode/forms/DraftAbilityForm.tsx (New File)

Why: The physical React form for editing the Draft ability properties.

What: Component rendering Autocomplete, Slider, and String fields.

How:

Define interface DraftAbilityFormProps { basePath: string; }.

Import useBlueprintContext, useSessionStore.

Import AutocompleteStringField, SliderField, SimpleStringField, ConditionsField.

Fetch available draft pools from the active session:
const poolSuggestions = Object.keys(useSessionStore(state => state.sessions[filename]?.draft.draftPools ?? {}))

Render AutocompleteStringField for path={\${basePath}.poolId`}usingpoolSuggestions`.

Render SliderField for path={\${basePath}.count`}. Pass sliderMeta={{ min: 1, max: 5, step: 1 }}`.

Render SimpleStringField for path={\${basePath}.label`}` to accept custom string titles.

Render ConditionsField for path={\${basePath}.conditions`}`.

src/ui/devtools/editors/blueprint/mode/AbilityListSections.tsx

Why: Renders the section container wrapping the Draft Form.

What: Exports DraftAbilitySection.

How:

Export DraftAbilitySection component taking { entries: NonNullable<EditorAbilities["draft"]>, rootPath: string, onRemoveItem: (index: number) => void }.

Iterate over entries using buildDraftKey.

Return a <ComponentRow> with the title entry.poolId ? \Draft: ${entry.poolId}`:`Draft ${index + 1}``.

Inside the row, render <DraftAbilityForm basePath={\${rootPath}.\_editor.abilities.draft.${index}`} />`.

Add export { DraftAbilitySection } from "./AbilityListSections"; to the exports list at the bottom.

src/ui/devtools/editors/blueprint/mode/AbilityList.tsx

Why: Wires the section into the main ability iteration loop.

What: Updates AbilityList switch statement.

How:

Import DraftAbilitySection.

Add the draft case to the array abilities rendering loop, invoking DraftAbilitySection identically to spawner or sampler.
