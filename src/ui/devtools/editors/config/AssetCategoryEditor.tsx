import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { SessionJsonEditor } from "./SessionJsonEditor";
import type { AssetCategory } from "../../state/moduleStore.assets";

const CATEGORY_LABELS: Record<string, string> = {
    displays: "Displays",
    glyphs: "Glyphs",
    styles: "Styles",
};

interface AssetCategoryEditorProps {
    filename: string;
    category: AssetCategory;
}

export const AssetCategoryEditor: React.FC<AssetCategoryEditorProps> = ({
    filename,
    category,
}) => {
    const label = CATEGORY_LABELS[category] ?? category;
    return (
        <ToolFrame title={label}>
            <SessionJsonEditor
                filename={filename}
                rootPath={`assets.${category}`}
            />
        </ToolFrame>
    );
};

