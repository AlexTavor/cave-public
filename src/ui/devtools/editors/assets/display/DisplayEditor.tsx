import React, { useId } from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { Breadcrumbs } from "../../breadcrumbs/Breadcrumbs";
import { EditorBody, LoadingState, NotFoundState } from "../AssetEditor.styles";
import { SectionStack } from "./DisplayEditor.styles";
import { DisplayEditorDefinitionSection } from "./DisplayEditorDefinitionSection";
import { DisplayEditorMetadataSection } from "./DisplayEditorMetadataSection";
import { ViewEditorModal } from "../../view-editor/ViewEditorModal";
import { useDisplayViewEditor } from "./useDisplayViewEditor";
import { useDisplayEditor } from "./useDisplayEditor";

export const DisplayEditor: React.FC<{
    filename: string;
    assetId: string;
    tabId?: string;
}> = ({ filename, assetId, tabId }) => {
    const viewEditor = useDisplayViewEditor({ filename, assetId });
    const ids = {
        type: useId(),
        attribute: useId(),
        style: useId(),
        glyph: useId(),
        transferMinValue: useId(),
        transferMinRadius: useId(),
        transferMaxValue: useId(),
        transferMaxRadius: useId(),
        tooltip: useId(),
        tags: useId(),
    };
    const editor = useDisplayEditor({ filename, assetId, tabId });
    const toolbar = (
        <>
            <Breadcrumbs
                path={[filename, "displays", assetId]}
                onNavigate={(index) => index < 2 && editor.handleBack()}
            />
            <SmartTooltip content="Return to the display list.">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={editor.handleBack}
                    title="Back to display list"
                >
                    Back
                </Button>
            </SmartTooltip>
        </>
    );
    if (editor.isLoading)
        return <LoadingState>Loading display...</LoadingState>;
    if (!editor.draft) {
        return (
            <NotFoundState>
                <div>Display not found: {assetId}</div>
                <Button size="sm" variant="ghost" onClick={editor.handleBack}>
                    Back to Explorer
                </Button>
            </NotFoundState>
        );
    }
    const draftEditor = { ...editor, draft: editor.draft };
    return (
        <ToolFrame title={`Display: ${assetId}`} toolbarActions={toolbar}>
            <EditorBody>
                <SectionStack>
                    <DisplayEditorDefinitionSection
                        assetId={assetId}
                        editor={draftEditor}
                        ids={ids}
                    />
                    <DisplayEditorMetadataSection
                        editor={draftEditor}
                        ids={ids}
                    />
                </SectionStack>
                <ViewEditorModal editor={viewEditor} />
            </EditorBody>
        </ToolFrame>
    );
};
