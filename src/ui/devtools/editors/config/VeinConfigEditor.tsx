import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { SessionJsonEditor } from "./SessionJsonEditor";

interface VeinConfigEditorProps {
    filename: string;
}

export const VeinConfigEditor: React.FC<VeinConfigEditorProps> = ({
    filename,
}) => {
    return (
        <ToolFrame title="Vein Network Config">
            <SessionJsonEditor
                filename={filename}
                rootPath="assets.settings.vein_network"
            />
        </ToolFrame>
    );
};
