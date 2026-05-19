import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { Button } from "../../../lib/atoms/button";
import { SmartTooltip } from "../../../lib/atoms/tooltip";
import { useShellStore } from "../../shell/shell";
import type { AssetCategory } from "../../state/moduleStore.assets";
import { Breadcrumbs } from "../breadcrumbs/Breadcrumbs";
import { NotFoundState } from "./AssetEditor.styles";
import { DisplayEditor } from "./display/DisplayEditor";

interface AssetEditorProps {
    filename: string;
    category: AssetCategory;
    assetId: string;
    tabId?: string;
}

export const AssetEditor: React.FC<AssetEditorProps> = ({
    filename,
    category,
    assetId,
    tabId,
}) => {
    const { openFile } = useShellStore();
    const handleBack = () => openFile(`list::${filename}::assets::${category}`);
    if (category === "displays")
        return (
            <DisplayEditor
                filename={filename}
                assetId={assetId}
                tabId={tabId}
            />
        );

    return (
        <ToolFrame
            title={`Asset: ${assetId}`}
            toolbarActions={
                <>
                    <Breadcrumbs
                        path={[filename, category, assetId]}
                        onNavigate={(index) => {
                            if (index < 2) handleBack();
                        }}
                    />
                    <SmartTooltip content="Return to the asset list.">
                        <Button size="sm" variant="ghost" onClick={handleBack}>
                            Back
                        </Button>
                    </SmartTooltip>
                </>
            }
        >
            <NotFoundState>
                <div>Unsupported asset category: {category}</div>
                <Button size="sm" variant="ghost" onClick={handleBack}>
                    Back to Explorer
                </Button>
            </NotFoundState>
        </ToolFrame>
    );
};

