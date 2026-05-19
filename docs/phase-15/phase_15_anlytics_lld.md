Entity Analysis LLD

1. The Why

Entities in Cave Engine are subject to complex, compounding mutations applied by isolated systems (Upkeep, Traits, Buffs, Energy Distribution). Currently, these effects are scattered across the ECS state and are not easily human-readable.

To give players immediate insight into what is happening to an entity and why (e.g., "health -1/3s (starving)"), we need a unified analytical layer that can parse the entity's current state, its active traits, and its power sink efficiency. This layer will reduce these disparate data sources into a standardized, read-only view model for the UI, explicitly separating continuous state/power modifiers from discrete narrative Traits.

2. The What

We will introduce an entityAnalysis module in the selection UI directory. This module will expose pure functions to extract an EntityAnalysisResult and a React hook (useEntityAnalysis) to consume it.

We will introduce two presentational components:

<ModifierList />: Displays generic numeric modifiers (Upkeep drains, Power overloads).

<TraitList />: Displays active traits with their specific effects and narrative reasons (e.g., "Starving: -25% efficiency, -1/3s health (no food)").

Scope of Extraction

Upkeep (Modifiers): Scan entity.state for compiler-generated rate keys (vals*upkeep_rate*${resource}_${index}).

Power (Modifiers): Evaluate entity.powerSink.efficiency to detect overload (>1.0) or brownout (<1.0) states.

Traits: Iterate entity.traits, cross-reference with global cartridge.config.traits, and extract/format modifiers and cycles into discrete trait summaries, utilizing the trait's description as the narrative reason (the "why").

3. The How: Technical Design & Interfaces

3.1. src/ui/runtime/world/selection/entityAnalysis/entityAnalysis.types.ts

Responsibility: Define the strictly typed contract for the view model.
Logic: None.

export type ModifierSourceType = "upkeep" | "power";

export interface EntityModifierLabel {
targetKey: string; // e.g., "food", "work speed"
valueStr: string; // e.g., "-0.3", "+250%"
intervalStr?: string; // e.g., "/s"
sourceType: ModifierSourceType;
sourceId: string; // e.g., "upkeep", "overload"
}

export interface TraitEffectLabel {
targetKey: string; // e.g., "health", "efficiency"
valueStr: string; // e.g., "-1", "-25%"
intervalStr?: string; // e.g., "/3s", ""
}

export interface EntityTraitSummary {
traitId: string;
label: string; // e.g., "Starving"
description?: string; // e.g., "no food" (pulled from TraitDefinition.description)
effects: TraitEffectLabel[];
remainingSeconds?: number;
}

export interface EntityAnalysisResult {
modifiers: EntityModifierLabel[];
traits: EntityTraitSummary[];
}

3.2. src/ui/runtime/world/selection/entityAnalysis/entityAnalysis.ts

Responsibility: Pure business logic to extract and format modifiers and traits from an entity snapshot.
Dependencies: Uses formatTarget and formatNumber from jobAnalysis.utils.ts.

Logic / Implementation Details:

Upkeep Extraction: \* Iterate Object.keys(entity.state || {}). Match /^vals*upkeep_rate*(.+)\_\d+$/.

If found, read the value.

Yield to modifiers: { targetKey: formatTarget(resourceName), valueStr: formatNumber(-value), intervalStr: "/s", sourceType: "upkeep", sourceId: "upkeep" }.

Power Extraction: \* If entity.powerSink exists, check efficiency.

If efficiency > 1.01, calculate pct = Math.round((efficiency - 1) \* 100). Yield: { targetKey: "work speed", valueStr: "+"+pct+"%", sourceType: "power", sourceId: "overload" }.

If efficiency < 0.99, calculate pct = Math.round((1 - efficiency) \* 100). Yield: { targetKey: "work speed", valueStr: "-"+pct+"%", sourceType: "power", sourceId: "brownout" }.

Traits Extraction: \* Iterate entity.traits || []. Fetch definition from traitIndex[trait.id].

Parse Modifiers: For each mod in def.modifiers:

If mod.op === "MULT", calculate percentage: pct = Math.round((mod.value - 1) \* 100). Format as +X% or -X%.

If mod.op === "ADD" || mod.op === "SUB", format raw value with sign.

Create TraitEffectLabel: { targetKey: formatTarget(mod.target), valueStr: formattedValue }.

Parse Cycles: For each cycle in def.cycles, iterate cycle.effects:

Determine sign based on op (SUB = "-", ADD = "+").

Create TraitEffectLabel: { targetKey: formatTarget(effect.target), valueStr: sign + formatNumber(effect.value), intervalStr: "/" + cycle.periodSeconds + "s" }.

Assemble EntityTraitSummary mapping the definition's label and description (which acts as the "why", e.g., "no food"), and push to traits array.

export const analyzeEntityState = (
entity: RuntimeEntity,
traitIndex: Record<string, TraitDefinition>
): EntityAnalysisResult => {
// Returns { modifiers: [], traits: [] }
}

3.3. src/ui/runtime/world/selection/entityAnalysis/useEntityAnalysis.ts

Responsibility: React hook to bridge the ECS runtime data to the pure analyzer function.
Dependencies: useEntitySelector for reactive updates.

export const useEntityAnalysis = (
entity: RuntimeEntity,
runtime: Runtime | null
): EntityAnalysisResult => {
// 1. Fetch static trait index once from runtime.getCartridge().config.traits
// 2. Use `useEntitySelector` to reactively get entity.state, entity.traits, entity.powerSink
// 3. Return useMemo(() => analyzeEntityState(reactiveEntityData, traitIndex), [reactiveEntityData, traitIndex])
}

3.4. Presentation Components

File: src/ui/runtime/world/selection/components/ModifierList.tsx
Responsibility: Renders the generic EntityModifierLabel[].
Design: Compact list mapping each modifier to a styled row (e.g., targetKey: valueStr/intervalStr (sourceId)).

File: src/ui/runtime/world/selection/components/TraitList.tsx
Responsibility: Renders the EntityTraitSummary[].
Design: Renders a distinct visual list below the standard analytics.
Format Example: <StatLabel>{trait.label}:</StatLabel> <StatValue>{effects.map(e => e.valueStr + e.intervalStr + " " + e.targetKey).join(", ")} ({trait.description})</StatValue> -> Starving: -25% efficiency, -1/3s health (no food)

3.5. Component Integrations

Files to change:

src/ui/runtime/world/selection/FaceCard.tsx

src/ui/runtime/world/selection/CaveCard.tsx

src/ui/runtime/world/selection/JobCard.tsx

Logic:
Inject const { modifiers, traits } = useEntityAnalysis(entity, runtime); below existing hooks.
Add <ModifierList modifiers={modifiers} /> followed immediately by <TraitList traits={traits} /> to the bottom of the respective card layouts.

4. Testing Contract

File: src/ui/runtime/world/selection/entityAnalysis/entityAnalysis.test.ts
Mandate: Must use AAA pattern. Must use factories for setup. No React/DOM dependencies. Tests purely validate the deterministic output of analyzeEntityState.

Required Scenarios:

Happy Path (Upkeep Modifier): Given an entity with state vals_upkeep_rate_food_0: { value: 0.3 }, it returns a properly formatted upkeep modifier for food inside the modifiers array.

Happy Path (Power Modifier): Given a powerSink with efficiency: 3.5, it returns a +250% work speed overload modifier inside the modifiers array.

Happy Path (Trait Parsing - Math & Text): Given an entity with trait starving and a provided trait index mapping starving to:

A description of "no food"

A modifier of op: MULT, value: 0.75 targeting efficiency

A cycle of periodSeconds: 3 with op: SUB, value: 1 targeting health
Assert: It returns a trait summary in the traits array with label "Starving", description "no food", and exact effect strings ["-25%", "efficiency"] and ["-1", "/3s", "health"].

Edge Case (Empty): Given an entity with no modifiers, traits, or power sink, it returns { modifiers: [], traits: [] }.
