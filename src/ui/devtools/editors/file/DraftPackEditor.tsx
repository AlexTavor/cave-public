import React from "react";
import { DraftPackEditor as DraftPackDashboard } from "../draft/DraftPackEditor";

interface DraftPackEditorProps {
    filename: string;
}

export const DraftPackEditor: React.FC<DraftPackEditorProps> = ({
    filename,
}) => {
    return <DraftPackDashboard filename={filename} />;
};
