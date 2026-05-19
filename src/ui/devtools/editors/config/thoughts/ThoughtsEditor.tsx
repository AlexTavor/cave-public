import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { Button } from "../../../../lib/atoms/button";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { ThoughtForm } from "./ThoughtForm";
import { useThoughtsSession } from "./useThoughtsSession";

interface ThoughtsEditorProps {
    filename: string;
}

export const ThoughtsEditor: React.FC<ThoughtsEditorProps> = ({ filename }) => {
    useEnsureModuleSession(filename);
    const { thoughts, addThought, removeThought, renameThought } =
        useThoughtsSession(filename);

    return (
        <ToolFrame title="Thoughts Editor">
            {thoughts.length === 0 ? (
                <p style={{ opacity: 0.6, fontSize: 13 }}>
                    No thoughts defined yet.
                </p>
            ) : null}
            {thoughts.map((thought, index) => (
                <ThoughtForm
                    key={thought.id}
                    filename={filename}
                    index={index}
                    onRemove={() => removeThought(index)}
                    onRename={renameThought}
                />
            ))}
            <SmartTooltip content="Create a new authored thought. Thoughts are checked from top to bottom, and the first eligible one is shown.">
                <Button size="sm" variant="ghost" onClick={addThought}>
                    + Add Thought
                </Button>
            </SmartTooltip>
        </ToolFrame>
    );
};
