import React from "react";
import { ProgressBar } from "../../../../lib/atoms/progress-bar/ProgressBar";
import {
    MutedText,
    StatLabel,
    StatRow,
    StatValue,
} from "../SelectionCard.styles";
import { LiveNumericValue } from "./LiveNumericValue";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

type CaveSustainmentSectionProps = {
    runtime: { getEntity: (id: string) => any } | null;
    entityId: string;
    foodFillRef: React.RefObject<HTMLDivElement | null>;
    heatFillRef: React.RefObject<HTMLDivElement | null>;
};

export const CaveSustainmentSection: React.FC<CaveSustainmentSectionProps> = ({
    runtime,
    entityId,
    foodFillRef,
    heatFillRef,
}) => (
    <div>
        <SmartTooltip
            content={
                <RichText
                    variant="body"
                    text="My internal stores of heat and food.
I don't like it when they get low."
                />
            }
        >
            <RichText variant="body" text="How Full I Am" />
            <StatRow>
                <StatLabel>
                    <GameIcon id="food" size="md" /> Food
                </StatLabel>
                <StatValue>
                    <LiveNumericValue
                        runtime={runtime}
                        entityId={entityId}
                        path="state.food"
                    />
                    <MutedText> / </MutedText>
                    <LiveNumericValue
                        runtime={runtime}
                        entityId={entityId}
                        path="state.food.max"
                    />
                </StatValue>
            </StatRow>
            <ProgressBar
                current={0}
                max={100}
                height={6}
                color="#db4437"
                fillRef={foodFillRef}
            />

            <StatRow>
                <StatLabel>
                    <GameIcon id="heat" size="md" /> Heat
                </StatLabel>
                <StatValue>
                    <LiveNumericValue
                        runtime={runtime}
                        entityId={entityId}
                        path="state.heat"
                    />
                    <MutedText> / </MutedText>
                    <LiveNumericValue
                        runtime={runtime}
                        entityId={entityId}
                        path="state.heat.max"
                    />
                </StatValue>
            </StatRow>
            <ProgressBar
                current={0}
                max={100}
                height={6}
                color="#ff9800"
                fillRef={heatFillRef}
            />
        </SmartTooltip>
    </div>
);

