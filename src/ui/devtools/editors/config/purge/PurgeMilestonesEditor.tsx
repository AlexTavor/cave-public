import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { Button } from "../../../../lib/atoms/button";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { usePurgeMilestonesSession } from "./usePurgeMilestonesSession";
import { PurgeMilestoneForm } from "./PurgeMilestoneForm";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

interface PurgeMilestonesEditorProps {
    filename: string;
}

export const PurgeMilestonesEditor: React.FC<PurgeMilestonesEditorProps> = ({
    filename,
}) => {
    useEnsureModuleSession(filename);
    const { milestones, addMilestone, removeMilestone } =
        usePurgeMilestonesSession(filename);

    return (
        <ToolFrame title="Purge Milestones">
            <SmartTooltip content="Configure narrative messages that trigger at specific purge progress thresholds.">
                <p style={{ opacity: 0.6, fontSize: 13, cursor: "help" }}>
                    Narrative milestones for purge progression
                </p>
            </SmartTooltip>
            {milestones.map((milestone, index) => (
                <PurgeMilestoneForm
                    key={milestone.id}
                    filename={filename}
                    index={index}
                    milestoneId={milestone.id}
                    onRemove={() => removeMilestone(index)}
                />
            ))}
            <Button size="sm" variant="ghost" onClick={addMilestone}>
                + Add Milestone
            </Button>
        </ToolFrame>
    );
};
