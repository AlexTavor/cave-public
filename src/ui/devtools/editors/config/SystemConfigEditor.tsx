import React from "react";
import { RawJsonEditor } from "../manifest/RawJsonEditor";

interface SystemConfigEditorProps {
    filename: string;
}

export const SystemConfigEditor: React.FC<SystemConfigEditorProps> = ({
    filename,
}) => {
    return (
        <div>
            <h3>System Config</h3>
            <RawJsonEditor filename={filename} />
        </div>
    );
};
