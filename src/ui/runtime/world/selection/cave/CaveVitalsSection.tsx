import React from "react";
import { ProgressBar } from "../../../../lib/atoms/progress-bar/ProgressBar";
import { StatLabel, StatRow, StatValue } from "../SelectionCard.styles";
import { LiveNumericValue } from "./LiveNumericValue";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

type CaveVitalsSectionProps = {
    runtime: { getEntity: (id: string) => any } | null;
    entityId: string;
    comfortFillRef: React.RefObject<HTMLDivElement | null>;
};

export const CaveVitalsSection: React.FC<CaveVitalsSectionProps> = ({
    runtime,
    entityId,
    comfortFillRef,
}) => (
    <div>
        <RichText variant="body" text="How I Feel" />
        <SmartTooltip
            content={
                <RichText
                    variant="body"
                    text={`Comfort is a factor of how warm and fed I am. 
The more comfort I have, the better my bodies perform.`}
                />
            }
        >
            <StatRow>
                <StatLabel>Comfort</StatLabel>
                <StatValue>
                    <LiveNumericValue
                        runtime={runtime}
                        entityId={entityId}
                        path="state.comfort"
                        formatter={(v) => `${Math.round(v * 100)}%`}
                    />
                </StatValue>
            </StatRow>
        </SmartTooltip>
        <ProgressBar
            current={0}
            max={1}
            height={8}
            color="#4caf50"
            fillRef={comfortFillRef}
        />
    </div>
);

