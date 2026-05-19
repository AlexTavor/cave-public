import React from "react";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { AttributeValue, StatGrid, StatItem } from "../SelectionCard.styles";
import type { AttributeTotals } from "../../../../../game/systems/body/attributes";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";
import { formatCompactNumber } from "../../../status/formatters";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

type CaveCapabilitiesSectionProps = {
    attributes: AttributeTotals;
    comfort: number;
};

const content = (base: number, comfort: number) => {
    const total = Math.floor(base * comfort);
    return (
        <RichText
            variant="body"
            text={`Attribute bonus provided to each body:

${formatCompactNumber(total)} = (base) ${formatCompactNumber(base)} * comfort ${comfort.toFixed(2)}
`}
        />
    );
};

export const CaveCapabilitiesSection: React.FC<
    CaveCapabilitiesSectionProps
> = ({ attributes, comfort }) => {
    return (
        <div>
            <RichText variant="body" text="Per-Body Bonus" />
            <StatGrid>
                <SmartTooltip content={content(attributes.body, comfort)}>
                    <StatItem>
                        <GameIcon id="attr_body" size="sm" />
                        <StatItem>
                            <AttributeValue>
                                {formatCompactNumber(attributes.body * comfort)}
                            </AttributeValue>
                            <AttributeValue>({attributes.body})</AttributeValue>
                        </StatItem>
                    </StatItem>
                </SmartTooltip>
                <SmartTooltip content={content(attributes.mind, comfort)}>
                    <StatItem>
                        <GameIcon id="attr_mind" size="sm" />
                        <StatItem>
                            <AttributeValue>
                                {formatCompactNumber(attributes.mind * comfort)}
                            </AttributeValue>
                            <AttributeValue>({attributes.mind})</AttributeValue>
                        </StatItem>
                    </StatItem>
                </SmartTooltip>
                <SmartTooltip content={content(attributes.social, comfort)}>
                    <StatItem>
                        <GameIcon id="attr_social" size="sm" />
                        <StatItem>
                            <AttributeValue>
                                {formatCompactNumber(
                                    attributes.social * comfort,
                                )}
                            </AttributeValue>
                            <AttributeValue>
                                ({attributes.social})
                            </AttributeValue>
                        </StatItem>
                    </StatItem>
                </SmartTooltip>
            </StatGrid>
        </div>
    );
};

