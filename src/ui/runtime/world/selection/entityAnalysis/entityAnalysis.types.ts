export type ModifierSourceType = "upkeep" | "power" | "cave";

export interface EntityModifierLabel {
    targetKey: string;
    valueStr: string;
    intervalStr?: string;
    sourceType: ModifierSourceType;
    sourceId: string;
}

export interface TraitEffectLabel {
    targetKey: string;
    valueStr: string;
    intervalStr?: string;
}

export interface EntityTraitSummary {
    traitId: string;
    label: string;
    description?: string;
    effects: TraitEffectLabel[];
    remainingSeconds?: number;
}

export interface EntityAnalysisResult {
    modifiers: EntityModifierLabel[];
    traits: EntityTraitSummary[];
}
