import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useUnderstandingConfigSession } from "./useUnderstandingConfigSession";
import { UnderstandingRowEditor } from "./UnderstandingRowEditor";

export const UnderstandingEditor: React.FC<{ filename: string }> = ({
    filename,
}) => {
    const {
        understandingIds,
        addUnderstanding,
        removeUnderstanding,
        renameUnderstanding,
    } = useUnderstandingConfigSession(filename);
    return (
        <ToolFrame title="Understanding Editor">
            {understandingIds.map((understandingId) => (
                <UnderstandingRowEditor
                    key={understandingId}
                    filename={filename}
                    understandingId={understandingId}
                    onDelete={() => removeUnderstanding(understandingId)}
                    onRename={renameUnderstanding}
                />
            ))}
            <SmartTooltip content="Add a new Understanding definition.">
                <Button size="sm" variant="ghost" onClick={addUnderstanding}>
                    + Add Understanding
                </Button>
            </SmartTooltip>
        </ToolFrame>
    );
};
