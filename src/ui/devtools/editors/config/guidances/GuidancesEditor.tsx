import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { GuidanceForm } from "./GuidanceForm";
import { useGuidancesSession } from "./useGuidancesSession";

export const GuidancesEditor: React.FC<{ filename: string }> = ({
    filename,
}) => {
    useEnsureModuleSession(filename);
    const { guidances, addGuidance, removeGuidance, renameGuidance } =
        useGuidancesSession(filename);

    return (
        <ToolFrame title="Guidances Editor">
            {guidances.map((guidance, index) => (
                <GuidanceForm
                    key={guidance.id}
                    filename={filename}
                    index={index}
                    onRemove={() => removeGuidance(index)}
                    onRename={renameGuidance}
                />
            ))}
            <SmartTooltip content="Create a new guidance definition.">
                <Button size="sm" variant="ghost" onClick={addGuidance}>
                    + Add Guidance
                </Button>
            </SmartTooltip>
        </ToolFrame>
    );
};
