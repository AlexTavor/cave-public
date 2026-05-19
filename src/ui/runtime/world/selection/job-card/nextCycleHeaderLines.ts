import type {
    AbilityEffectGroup,
    AbilityEffectModel,
    AbilityInlineDisplayLine,
    AbilityInlineDisplayToken,
} from "../ability-display/abilityDisplay.types";
import { formatCountdownText } from "../ability-display/abilityDisplay.utils";
import { buildConversionHeaderTooltip } from "./conversionHeaderTooltip";

const amountText = (valueText: string) => valueText.replace(/^[+-]/, "");

const effectTokens = (
    effect: AbilityEffectModel,
): AbilityInlineDisplayToken[] => [
    { kind: "text", text: `${amountText(effect.valueText)} ` },
    { kind: "icon", iconId: effect.iconId },
    { kind: "text", text: ` ${effect.label}` },
];

const withTooltip = (
    effect: AbilityEffectModel,
    tokens: AbilityInlineDisplayToken[],
) => ({
    id: `${effect.id}:header`,
    tokens,
    tooltipTitle: effect.tooltipTitle,
    tooltipLines: effect.tooltipLines,
});

const buildConversionLine = (
    id: string,
    effects: AbilityEffectModel[],
): AbilityInlineDisplayLine[] => {
    const inputs = effects.filter((effect) => effect.tone === "negative");
    const outputs = effects.filter((effect) => effect.tone === "positive");
    if (inputs.length === 0 || outputs.length === 0) return [];
    const tokens = [...inputs, ...outputs].reduce<AbilityInlineDisplayToken[]>(
        (items, effect, index) => {
            const splitAt = inputs.length;
            if (index > 0 && index !== splitAt)
                items.push({ kind: "text", text: " + " });
            if (index === splitAt) items.push({ kind: "text", text: " -> " });
            items.push(...effectTokens(effect));
            return items;
        },
        [],
    );
    return [
        { id: `${id}:rate`, tokens, ...buildConversionHeaderTooltip(effects) },
    ];
};

export const buildNextCycleHeaderLines = (
    group: AbilityEffectGroup,
    ticksRemaining: number | null,
): AbilityInlineDisplayLine[] => {
    const countdown = formatCountdownText(ticksRemaining);
    if (group.effects.length === 0) return [];
    if (group.kind === "conversion") {
        const outputs = group.effects.filter(
            (effect) => effect.tone === "positive",
        );
        const predicted =
            !countdown || outputs.length === 0
                ? []
                : [
                      {
                          id: `${group.id}:predicted`,
                          ...buildConversionHeaderTooltip(outputs),
                          tokens: outputs
                              .reduce<AbilityInlineDisplayToken[]>(
                                  (items, effect, index) => {
                                      if (index > 0)
                                          items.push({
                                              kind: "text",
                                              text: " + ",
                                          });
                                      items.push(...effectTokens(effect));
                                      return items;
                                  },
                                  [],
                              )
                              .concat({
                                  kind: "text",
                                  text: ` in ${countdown}`,
                              }),
                      },
                  ];
        return [...predicted, ...buildConversionLine(group.id, group.effects)];
    }
    if (!countdown) return [];
    return group.effects.map((effect) => {
        if (group.kind === "draft") {
            const prefix =
                effect.valueText === "Unlock" ? "" : `${effect.valueText} `;
            return withTooltip(effect, [
                {
                    kind: "text",
                    text: `${prefix}${effect.label} in ${countdown}`,
                },
            ]);
        }
        if (group.kind === "transform") {
            return withTooltip(effect, [
                { kind: "text", text: "Transform to " },
                { kind: "icon", iconId: effect.iconId },
                { kind: "text", text: ` ${effect.label} in ${countdown}` },
            ]);
        }
        return withTooltip(
            effect,
            effectTokens(effect).concat({
                kind: "text",
                text: ` in ${countdown}`,
            }),
        );
    });
};
