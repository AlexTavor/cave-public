import React from "react";
import { GameIcon } from "../../../../lib/atoms/game-icon/GameIcon";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { BodyAvatar } from "../body/BodyAvatar";
import { BodyStatusDisplay } from "../body/BodyStatusDisplay";
import type { BodyBrickRenderData } from "./bodyBrickTypes";
import {
    AttributeRow,
    AvatarSlot,
    Brick,
    BrickBackground,
    MetricItem,
    MetricValue,
    SelectionIndicator,
    StatusSlot,
} from "./BodyBrick.styles";

const BodyBrickViewBase: React.FC<{
    data: BodyBrickRenderData;
    tooltipContent: React.ReactNode;
    onMouseDown?: () => void;
    onMouseEnter?: () => void;
    selected?: boolean;
    showSelectionIndicators?: boolean;
}> = ({
    data,
    tooltipContent,
    onMouseDown,
    onMouseEnter,
    selected = false,
    showSelectionIndicators = false,
}) => {
    return (
        <SmartTooltip content={tooltipContent} placement="left-start">
            <Brick
                selected={selected}
                showSelectionIndicators={showSelectionIndicators}
                onMouseDown={onMouseDown}
                onMouseEnter={onMouseEnter}
                data-testid={`body-brick-${data.entityId}`}
                data-entity-id={data.entityId}
            >
                <BrickBackground selected={selected} />
                {showSelectionIndicators ? (
                    <SelectionIndicator id="absorption" selected={selected} />
                ) : null}
                <AvatarSlot selected={selected}>
                    <BodyAvatar
                        subjectId={data.subjectId}
                        fallbackIconId={data.fallbackIconId}
                        size="sm"
                    />
                </AvatarSlot>
                <MetricItem>
                    <GameIcon id="cave_level" size="sm" />
                    <MetricValue>{data.liveLevel}</MetricValue>
                </MetricItem>
                <AttributeRow>
                    <MetricItem>
                        <GameIcon id="attr_body" size="sm" />
                        <MetricValue>{data.attributes.body}</MetricValue>
                    </MetricItem>
                    <MetricItem>
                        <GameIcon id="attr_mind" size="sm" />
                        <MetricValue>{data.attributes.mind}</MetricValue>
                    </MetricItem>
                    <MetricItem>
                        <GameIcon id="attr_social" size="sm" />
                        <MetricValue>{data.attributes.social}</MetricValue>
                    </MetricItem>
                </AttributeRow>
                <MetricItem>
                    <GameIcon id="health" size="sm" />
                    <MetricValue>
                        {data.displayHealth}/{data.displayMaxHealth}
                    </MetricValue>
                </MetricItem>
                <StatusSlot>
                    <BodyStatusDisplay
                        hasUnownedHabiti={data.hasUnownedHabiti}
                        statusIcons={data.statusIcons}
                    />
                </StatusSlot>
                {showSelectionIndicators ? (
                    <SelectionIndicator id="absorption" selected={selected} />
                ) : null}
            </Brick>
        </SmartTooltip>
    );
};

export const BodyBrickView = React.memo(BodyBrickViewBase);
