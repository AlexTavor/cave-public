import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { TutorialForm } from "./TutorialForm";
import { useTutorialsSession } from "./useTutorialsSession";

type TutorialsEditorProps = { filename: string };

export const TutorialsEditor: React.FC<TutorialsEditorProps> = ({
    filename,
}) => {
    useEnsureModuleSession(filename);
    const { tutorials, addTutorial, removeTutorial, renameTutorial } =
        useTutorialsSession(filename);

    return (
        <ToolFrame title="Tutorials Editor">
            {tutorials.length === 0 ? (
                <p style={{ opacity: 0.6, fontSize: 13 }}>
                    No tutorials defined yet.
                </p>
            ) : null}
            {tutorials.map((tutorial, index) => (
                <TutorialForm
                    key={tutorial.id}
                    filename={filename}
                    index={index}
                    onRemove={() => removeTutorial(index)}
                    onRename={renameTutorial}
                />
            ))}
            <SmartTooltip content="Create a new authored runtime tutorial.">
                <Button size="sm" variant="ghost" onClick={addTutorial}>
                    + Add Tutorial
                </Button>
            </SmartTooltip>
        </ToolFrame>
    );
};
