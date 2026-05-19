import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { SessionJsonEditor } from "./SessionJsonEditor";

const WORLD_ENTITY_PATH = "config.settings.world";

interface WorldEntityEditorProps {
    filename: string;
}

export const WorldEntityEditor: React.FC<WorldEntityEditorProps> = ({
    filename,
}) => {
    return (
        <ToolFrame title="World Entity">
            <SessionJsonEditor
                filename={filename}
                rootPath={WORLD_ENTITY_PATH}
            />
        </ToolFrame>
    );
};

