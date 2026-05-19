import React from "react";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import type { SuspiciousActivityIndicatorModel } from "../job-card/resolveSuspiciousActivityIndicator";
import { SuspiciousPill } from "./SuspiciousActivityIndicator.styles";

export const SuspiciousActivityIndicator: React.FC<{
    model?: SuspiciousActivityIndicatorModel | null;
}> = ({ model }) => {
    if (!model) return null;
    return (
        <SmartTooltip
            content={
                <div>
                    <div>{model.tooltipTitle}</div>
                    {model.tooltipLines.map((line) => (
                        <div key={line}>{line}</div>
                    ))}
                </div>
            }
        >
            <SuspiciousPill color={model.color}>{model.text}</SuspiciousPill>
        </SmartTooltip>
    );
};
