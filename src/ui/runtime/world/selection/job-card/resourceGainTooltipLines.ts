import { formatEffectAmount } from "../ability-display/abilityDisplay.utils";
import type { ResourceGainContribution } from "../../../../../game/habiti/resolveResourceGainBonusBreakdown";

const formatPercent = (delta: number) => {
    const percent = Math.round(delta * 10_000) / 100;
    return `${percent >= 0 ? "+" : ""}${percent}%`;
};

const contributionLines = (contributions: ResourceGainContribution[]) =>
    contributions.flatMap((item) => [
        `${item.label}: ${formatPercent(item.delta)}`,
        ...item.descriptions,
    ]);

export const buildResourceGainTooltip = (input: {
    title: string;
    baseAmount: number;
    finalAmount: number;
    breakdown: {
        totalDelta: number;
        contributions: ResourceGainContribution[];
    };
}) => ({
    tooltipTitle: input.title,
    tooltipLines: [
        `Base: ${formatEffectAmount(input.baseAmount)}`,
        input.breakdown.contributions.length === 0
            ? "Bonuses: none"
            : `Bonuses: ${formatPercent(input.breakdown.totalDelta)}`,
        ...contributionLines(input.breakdown.contributions),
        `Final: ${formatEffectAmount(input.finalAmount)}`,
    ],
});
