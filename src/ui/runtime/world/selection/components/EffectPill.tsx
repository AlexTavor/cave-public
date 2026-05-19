import React from "react";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import {
    EffectPillRoot,
    EffectPillValue,
} from "./analysisStyles";

type EffectPillProps = {
    iconId?: string;
    valueText: string;
    tooltipContent: React.ReactNode;
};

export const EffectPill: React.FC<EffectPillProps> = ({
    iconId,
    valueText,
    tooltipContent,
}) => {
    const pill = (
        <EffectPillRoot>
            {iconId ? <GameIcon id={iconId} size="sm" /> : null}
            <EffectPillValue>{valueText}</EffectPillValue>
        </EffectPillRoot>
    );
    return tooltipContent ? (
        <SmartTooltip content={tooltipContent}>{pill}</SmartTooltip>
    ) : (
        pill
    );
};
