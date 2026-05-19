import { formatCompactNumber } from "../../../status/formatters";
import type { CaveCardData } from "../cave/caveCardTypes";
import { adaptHabitiEntriesToCapsules } from "./adaptHabitiEntriesToCapsules";
import type { CardSectionModel, ValueCapsuleModel } from "./cardDisplayTypes";
import { resolveAnchoredEffects } from "./resolveAnchoredEffects";

const caveAttributeCapsules = (
    data: CaveCardData,
    anchored: ReturnType<typeof resolveAnchoredEffects>,
): ValueCapsuleModel[] =>
    (["body", "mind", "social"] as const).map((key) => ({
        id: key,
        skin: "value" as const,
        iconId: `attr_${key}`,
        value: {
            binding: {
                id: `${data.targetId}:${key}`,
                entityId: data.targetId,
                kind: "numeric-text" as const,
                valuePath: "state.comfort.value",
                format: "compact-number" as const,
                multiplier: data.attributes[key],
            },
        },
        effects: [
            {
                id: `${key}:base`,
                text: `(${formatCompactNumber(data.attributes[key])})`,
                tone: "neutral" as const,
            },
            ...(anchored.byTarget[key] ?? []),
        ],
    }));

export const resolveCaveCardSections = (data: CaveCardData): CardSectionModel[] => {
    const anchored = resolveAnchoredEffects({
        modifiers: data.modifiers,
        traits: data.traits,
        localTargets: ["xp", "population", "comfort", "food", "heat", "body", "mind", "social"],
    });
    const sections: CardSectionModel[] = [
        {
            id: `${data.targetId}:stats`,
            layout: "wrap",
            density: "normal",
            capsules: [
                { id: "xp", skin: "value", iconId: "cave_xp", value: { binding: { id: `${data.targetId}:xp`, entityId: data.targetId, kind: "compact-fraction", valuePath: "cave.progression.xp", maxValue: data.xpMax } }, effects: anchored.byTarget.xp ?? [] },
                { id: "level", skin: "value", iconId: "cave_level", value: { text: formatCompactNumber(data.level) }, effects: [] },
                { id: "population", skin: "value", iconId: "cave_body", value: { binding: { id: `${data.targetId}:population`, entityId: data.targetId, kind: "numeric-text", valuePath: "state.population.value", format: "compact-number" } }, effects: anchored.byTarget.population ?? [] },
            ],
        },
        {
            id: `${data.targetId}:comfort`,
            title: "How I Feel",
            layout: "column",
            density: "normal",
            capsules: [{ id: "comfort", skin: "value", title: "Comfort", value: { binding: { id: `${data.targetId}:comfort`, entityId: data.targetId, kind: "numeric-text", valuePath: "state.comfort.value", format: "integer-percent", multiplier: 100 } }, effects: anchored.byTarget.comfort ?? [], progress: { id: `cave:${data.targetId}:comfort`, entityId: data.targetId, valuePath: "state.comfort.value", maxPath: "state.comfort.max" } }],
        },
        {
            id: `${data.targetId}:stores`,
            title: "How Full I Am",
            layout: "column",
            density: "normal",
            capsules: [
                { id: "food", skin: "value", iconId: "food", title: "Food", value: { binding: { id: `${data.targetId}:food`, entityId: data.targetId, kind: "compact-fraction", valuePath: "state.food.value", maxPath: "state.food.max" } }, effects: anchored.byTarget.food ?? [], progress: { id: `cave:${data.targetId}:food`, entityId: data.targetId, valuePath: "state.food.value", maxPath: "state.food.max" } },
                { id: "heat", skin: "value", iconId: "heat", title: "Heat", value: { binding: { id: `${data.targetId}:heat`, entityId: data.targetId, kind: "compact-fraction", valuePath: "state.heat.value", maxPath: "state.heat.max" } }, effects: anchored.byTarget.heat ?? [], progress: { id: `cave:${data.targetId}:heat`, entityId: data.targetId, valuePath: "state.heat.value", maxPath: "state.heat.max" } },
            ],
        },
        { id: `${data.targetId}:attributes`, title: "Per-Body Bonus", layout: "wrap", density: "normal", capsules: caveAttributeCapsules(data, anchored) },
    ];
    if (data.habiti.length) sections.push({ id: `${data.targetId}:habiti`, title: "Lifetime Experiences (Habiti)", layout: "wrap", density: "tight", capsules: adaptHabitiEntriesToCapsules(data.habiti, () => "caveOwned") });
    if (data.understanding.length) sections.push({ id: `${data.targetId}:understanding`, title: "Understanding", layout: "wrap", density: "tight", capsules: adaptHabitiEntriesToCapsules(data.understanding, () => "caveOwned") });
    if (anchored.residualEffects.length) sections.push({ id: `${data.targetId}:effects`, title: "Modifiers", layout: "wrap", density: "tight", capsules: anchored.residualEffects });
    return sections;
};