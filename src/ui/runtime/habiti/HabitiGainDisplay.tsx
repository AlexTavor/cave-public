import React from "react";
import { CardTitle } from "../world/selection/SelectionCard.styles";
import type { HabitiDisplayEntry } from "../../../game/habiti/resolveHabitiDisplayEntries";
import { formatCompactNumber } from "../status/formatters";
import { HabitiList } from "../world/selection/components/HabitiList";
import { GainsDisplay } from "../world/selection/absorption/BodySelector.styles";
import { RichText } from "../../lib/atoms/rich-text/RichText";
import { AbilityEffectList } from "../world/selection/ability-display/AbilityEffectList";
import { buildResourceGainTooltip } from "../world/selection/job-card/resourceGainTooltipLines";
import { formatEffectAmount } from "../world/selection/ability-display/abilityDisplay.utils";

export const HabitiGainDisplay: React.FC<{
    items: HabitiDisplayEntry[];
    xpTotal?: number;
    resourceRows?: Array<{
        resource: string;
        baseAmount: number;
        finalAmount: number;
        breakdown: { totalDelta: number; contributions: any[] };
    }>;
    title?: string;
}> = ({
    items,
    xpTotal = 0,
    resourceRows = [],
    title = "Expected Outcome",
}) => (
    <GainsDisplay>
        <CardTitle>{title}</CardTitle>
        {xpTotal === 0 && resourceRows.length === 0 && (
            <RichText text="No gains expected." />
        )}
        {xpTotal > 0 && (
            <RichText
                text={`XP: [icon=xp][b]${formatCompactNumber(xpTotal)}[/b]`}
            />
        )}
        {resourceRows.length > 0 && (
            <AbilityEffectList
                title="Resources"
                effects={resourceRows.map((item) => ({
                    id: `preview:${item.resource}`,
                    iconId: item.resource,
                    label: item.resource,
                    valueText: `+${formatEffectAmount(item.finalAmount)}`,
                    tone: "positive" as const,
                    ...buildResourceGainTooltip({
                        title: "Expected resource gain",
                        baseAmount: item.baseAmount,
                        finalAmount: item.finalAmount,
                        breakdown: item.breakdown,
                    }),
                }))}
            />
        )}
        <HabitiList items={items} title="New Habiti" />
    </GainsDisplay>
);
