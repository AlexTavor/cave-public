import React from "react";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { formatCompactNumber } from "../../../status/formatters";
import { StatGrid, StatItem, StatValue } from "../SelectionCard.styles";

export const CaveXpAndPop: React.FC<{
    liveLevel: number;
    liveXp: number;
    liveXpMax: number;
    livePopulation: number;
}> = ({ liveLevel, liveXp, liveXpMax, livePopulation }) => {
    return (
        <StatGrid>
            <SmartTooltip
                content={
                    <RichText
                        variant="body"
                        text={`XP is gained by absorbing bodies. \nWhen XP is full, I level up and gain an attribute point to spend on Body, Mind, or Social.`}
                    />
                }
            >
                <StatItem>
                    <GameIcon id="cave_xp" size="md" />
                    <StatValue>
                        {formatCompactNumber(liveXp)}/
                        {formatCompactNumber(liveXpMax)}
                    </StatValue>
                </StatItem>
            </SmartTooltip>
            <SmartTooltip
                content={<RichText variant="body" text="Current level." />}
            >
                <StatItem>
                    <GameIcon id="cave_level" size="md" />
                    <StatValue>{formatCompactNumber(liveLevel)}</StatValue>
                </StatItem>
            </SmartTooltip>
            <SmartTooltip
                content={
                    <RichText
                        variant="body"
                        text="Current number of my bodies."
                    />
                }
            >
                <StatItem>
                    <GameIcon id="cave_body" size="md" />
                    <StatValue>{formatCompactNumber(livePopulation)}</StatValue>
                </StatItem>
            </SmartTooltip>
        </StatGrid>
    );
};
