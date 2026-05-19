import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

const wrapButton = (content: string, label: string, onClick: () => void) => (
    <SmartTooltip content={content}>
        <Button size="sm" variant="ghost" onClick={onClick}>
            {label}
        </Button>
    </SmartTooltip>
);

export const TutorialNewGuidanceButton: React.FC<{ onClick: () => void }> = ({
    onClick,
}) =>
    wrapButton(
        "Create a new guidance, assign it here, and open the Guidances Editor.",
        "+ New Guidance",
        onClick,
    );

export const TutorialAddGuidanceButton: React.FC<{ onClick: () => void }> = ({
    onClick,
}) =>
    wrapButton(
        "Add another guidance use to this tutorial.",
        "+ Add Guidance",
        onClick,
    );

export const TutorialToggleTargetOverrideButton: React.FC<{
    enabled: boolean;
    onClick: () => void;
}> = ({ enabled, onClick }) =>
    wrapButton(
        "Override the authored target for this tutorial guidance use.",
        enabled ? "Disable Target Override" : "Enable Target Override",
        onClick,
    );

export const TutorialRemoveGuidanceButton: React.FC<{
    onClick: () => void;
}> = ({ onClick }) =>
    wrapButton(
        "Remove this guidance use from the tutorial.",
        "Remove Guidance",
        onClick,
    );
