import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { SusDisplayForm } from "./SusDisplayForm";
import { useSusDisplaysSession } from "./useSusDisplaysSession";

export const SusDisplayEditor: React.FC<{ filename: string }> = ({
    filename,
}) => {
    useEnsureModuleSession(filename);
    const { susDisplays, addSusDisplay, removeSusDisplay } =
        useSusDisplaysSession(filename);
    return (
        <ToolFrame title="Suspicious Displays">
            <SmartTooltip content="Configure which suspicious-activity pill appears for a fraction of total Purge Progress.">
                <p style={{ opacity: 0.6, fontSize: 13, cursor: "help" }}>
                    Suspicious activity indicator rules
                </p>
            </SmartTooltip>
            {susDisplays.map((display, index) => (
                <SusDisplayForm
                    key={`${display.text}:${index}`}
                    filename={filename}
                    basePath={`config.settings.game_config.susDisplays.${index}`}
                    index={index}
                    thresholdMode="absolute"
                    onRemove={() => removeSusDisplay(index)}
                />
            ))}
            <SmartTooltip content="Add a suspicious display rule.">
                <Button size="sm" variant="ghost" onClick={addSusDisplay}>
                    + Add Sus Display
                </Button>
            </SmartTooltip>
        </ToolFrame>
    );
};
