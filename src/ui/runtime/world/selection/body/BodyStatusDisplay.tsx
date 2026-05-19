import React from "react";
import { GameIcon } from "../../../../lib/atoms/game-icon/GameIcon";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import {
    BodyStatus,
    StatusIcon,
    UnownedHabitiMarker,
} from "./BodyStatus.styles";

export const BodyStatusDisplay: React.FC<{
    hasUnownedHabiti: boolean;
    statusIcons: Array<{ traitId: string; iconId: string }>;
}> = ({ hasUnownedHabiti, statusIcons }) => (
    <BodyStatus>
        {hasUnownedHabiti ? (
            <SmartTooltip content="Carries unowned Habiti">
                <UnownedHabitiMarker aria-label="unowned-habiti">
                    H
                </UnownedHabitiMarker>
            </SmartTooltip>
        ) : null}
        {statusIcons.map(({ traitId, iconId }) => (
            <StatusIcon key={traitId} title={traitId}>
                <GameIcon id={iconId} size="sm" />
            </StatusIcon>
        ))}
    </BodyStatus>
);
