import React from "react";
import { RawJsonEditor } from "../../manifest/RawJsonEditor";

export const BlueprintFileEditor: React.FC<{ filename: string }> = ({
    filename,
}) => {
    return <RawJsonEditor filename={filename} />;
};
