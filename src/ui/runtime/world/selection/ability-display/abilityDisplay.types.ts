import type { EntityTextBinding } from "../../entity-state-link";

type AbilityBarBase = {
    id: string;
    entityId: string;
    valuePath: string;
    maxPath?: string;
    maxValue?: number;
    current: number;
    max: number;
    color?: string;
    iconId: string;
    title: string;
    titleMetaText?: string;
    tooltipTitle: string;
    tooltipLines: string[];
    height?: number;
};

type StaticAbilityBarModel = AbilityBarBase & {
    valueText: string;
    valueBinding?: never;
};

type LiveAbilityBarModel = AbilityBarBase & {
    valueBinding: EntityTextBinding;
    valueText?: never;
};

export type AbilityBarModel = StaticAbilityBarModel | LiveAbilityBarModel;

export type AbilityEffectTone = "positive" | "negative" | "neutral";

export interface AbilityEffectModel {
    id: string;
    iconId: string;
    label: string;
    valueText: string;
    tone: AbilityEffectTone;
    tooltipTitle: string;
    tooltipLines: string[];
}

export interface AbilityInlineDisplayToken {
    kind: "text" | "icon";
    text?: string;
    iconId?: string;
}

export interface AbilityInlineDisplayLine {
    id: string;
    tokens: AbilityInlineDisplayToken[];
    tooltipTitle?: string;
    tooltipLines?: string[];
}

export interface AbilityEffectGroup {
    id: string;
    kind: "production" | "conversion" | "draft" | "transform";
    sourceIndex?: number;
    title: string;
    effects: AbilityEffectModel[];
}

export interface ResolvedAbilityEffectGroup {
    id: string;
    title: string;
    headerLines: AbilityInlineDisplayLine[];
    effects: AbilityEffectModel[];
}
