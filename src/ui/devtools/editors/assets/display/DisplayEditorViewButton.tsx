import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

export const DisplayEditorViewButton: React.FC<{
    enabled: boolean;
    onClick(): void;
}> = ({ enabled, onClick }) =>
    enabled ? (
        <SmartTooltip content="Open the shared view editor for this display asset.">
            <Button size="sm" variant="ghost" onClick={onClick}>
                Edit View
            </Button>
        </SmartTooltip>
    ) : null;
