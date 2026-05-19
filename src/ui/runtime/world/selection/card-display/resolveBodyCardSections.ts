import { formatCompactNumber } from "../../../status/formatters";
import type { BodyCardData } from "../body/bodyCardTypes";
import { adaptHabitiEntriesToCapsules } from "./adaptHabitiEntriesToCapsules";
import {
    formatAttributeModifier,
    formatSignedRateText,
    resolveEffectTone,
} from "./cardDisplayFormatters";
import type {
    CapsuleEffectSegmentModel,
    CardSectionModel,
} from "./cardDisplayTypes";
import { resolveAnchoredEffects } from "./resolveAnchoredEffects";

const attributeEffects = (
    key: keyof BodyCardData["attributes"],
    data: BodyCardData,
    effects: Record<string, CapsuleEffectSegmentModel[]>,
) => {
    const modifier = data.attributes[key] - data.baseAttributes[key];
    const text = formatAttributeModifier(modifier);
    const local = text
        ? [{ id: `${key}:modifier`, text, tone: "neutral" as const }]
        : [];
    return [...local, ...(effects[key] ?? [])];
};

export const resolveBodyCardSections = (
    data: BodyCardData,
): CardSectionModel[] => {
    const anchored = resolveAnchoredEffects({
        modifiers: data.modifiers,
        traits: data.traits,
        localTargets: ["body", "mind", "social", "xp", "health"],
    });
    const sections: CardSectionModel[] = [
        {
            id: `${data.subjectId}:stats`,
            layout: "wrap",
            density: "normal",
            title: "Stats",
            capsules: [
                {
                    id: "xp",
                    skin: "value",
                    iconId: "cave_xp",
                    value: {
                        binding: {
                            id: `${data.subjectId}:xp`,
                            entityId: data.subjectId ?? "",
                            kind: "compact-fraction",
                            valuePath: "body.xp",
                            maxValue: data.xpMax,
                        },
                    },
                    effects: [
                        {
                            id: "xp:rate",
                            text: formatSignedRateText(data.xpRate, "/s"),
                            tone: resolveEffectTone("", data.xpRate),
                        },
                    ],
                },
                {
                    id: "level",
                    skin: "value",
                    iconId: "cave_level",
                    value: { text: formatCompactNumber(data.level) },
                    effects: [],
                },
                {
                    id: "health",
                    skin: "value",
                    iconId: "health",
                    value: {
                        binding: {
                            id: `${data.subjectId}:health`,
                            entityId: data.subjectId ?? "",
                            kind: "compact-fraction",
                            valuePath: "body.health",
                            maxPath: "body.maxHealth",
                        },
                    },
                    effects: anchored.byTarget.health ?? [],
                    testId: "body-health-bar",
                },
            ],
        },
        {
            id: `${data.subjectId}:habiti`,
            title: "Lifetime Experiences (Habiti)",
            layout: "wrap",
            density: "tight",
            capsules: adaptHabitiEntriesToCapsules(data.habiti, (entry) =>
                entry.isOwnedByCave ? "ownedHabitus" : "unownedHabitus",
            ),
        },
        {
            id: `${data.subjectId}:attributes`,
            title: "Attributes",
            layout: "wrap",
            density: "normal",
            capsules: (["body", "mind", "social"] as const).map((key) => ({
                id: key,
                skin: "value",
                iconId: `attr_${key}`,
                value: { text: formatCompactNumber(data.attributes[key]) },
                effects: attributeEffects(key, data, anchored.byTarget),
            })),
        },
    ];
    if (anchored.residualEffects.length)
        sections.push({
            id: `${data.subjectId}:effects`,
            title: "Effects",
            layout: "wrap",
            density: "tight",
            capsules: anchored.residualEffects,
        });
    return sections;
};
