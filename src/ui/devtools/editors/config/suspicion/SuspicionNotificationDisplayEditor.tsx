import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { SusDisplayForm } from "./SusDisplayForm";
import { useSuspicionNotificationDisplaysSession } from "./useSuspicionNotificationDisplaysSession";

export const SuspicionNotificationDisplayEditor: React.FC<{
    filename: string;
}> = ({ filename }) => {
    useEnsureModuleSession(filename);
    const { displays, addDisplay, removeDisplay } =
        useSuspicionNotificationDisplaysSession(filename);
    return (
        <ToolFrame title="Suspicion Notification Displays">
            <SmartTooltip content="Configure which ongoing Suspicion card label appears for a fraction of total Purge Progress.">
                <p style={{ opacity: 0.6, fontSize: 13, cursor: "help" }}>
                    Suspicion notification display rules
                </p>
            </SmartTooltip>
            {displays.map((display, index) => (
                <SusDisplayForm
                    key={`${display.text}:${index}`}
                    filename={filename}
                    basePath={`config.settings.game_config.suspicionNotificationDisplays.${index}`}
                    index={index}
                    thresholdMode="fraction"
                    onRemove={() => removeDisplay(index)}
                />
            ))}
            <SmartTooltip content="Add a Suspicion notification display rule.">
                <Button size="sm" variant="ghost" onClick={addDisplay}>
                    + Add Suspicion Notification Display
                </Button>
            </SmartTooltip>
        </ToolFrame>
    );
};
