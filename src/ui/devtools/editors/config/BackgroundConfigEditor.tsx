import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { SessionJsonEditor } from "./SessionJsonEditor";

interface BackgroundConfigEditorProps {
    filename: string;
}

export const BackgroundConfigEditor: React.FC<BackgroundConfigEditorProps> = ({
    filename,
}) => {
    return (
        <ToolFrame title="Background Config">
            <SessionJsonEditor
                filename={filename}
                rootPath="assets.settings.background"
            />
        </ToolFrame>
    );
};
