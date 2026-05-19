import React from "react";
import { Modal } from "../../../lib/atoms/modal";
import {
    ModalBody,
    ModalTitle,
} from "../blueprint/editor/BlueprintEditor.styles";
import {
    CloseButton,
    VisualsColumn,
    VisualsGrid,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import { ViewEditorCycleProgressSection } from "./ViewEditorCycleProgressSection";
import { ViewEditorGlyphSection } from "./ViewEditorGlyphSection";
import { ViewEditorLightSection } from "./ViewEditorLightSection";
import { ViewEditorPreview } from "./ViewEditorPreview";
import { ViewEditorTransferNodeRadiusFields } from "./ViewEditorTransferNodeRadiusFields";
import type { ViewEditorAdapter } from "./ViewEditor.types";

export const ViewEditorModal: React.FC<{
    editor: ViewEditorAdapter | null;
}> = ({ editor }) => {
    if (!editor?.isOpen) return null;
    return (
        <Modal isOpen={editor.isOpen} onClose={editor.close}>
            <ModalBody>
                <ModalTitle>{editor.contextLabel}</ModalTitle>
                <VisualsGrid>
                    <VisualsColumn>
                        {editor.cycleProgress ? (
                            <ViewEditorCycleProgressSection editor={editor} />
                        ) : null}
                        <ViewEditorLightSection
                            light={editor.light}
                            paletteOptions={
                                editor.projectDefaults.paletteOptions
                            }
                        />
                    </VisualsColumn>
                    <ViewEditorTransferNodeRadiusFields
                        radius={editor.transferNodeRadius}
                    />
                    <ViewEditorGlyphSection editor={editor} />
                    <ViewEditorPreview editor={editor} />
                </VisualsGrid>
                <CloseButton size="md" variant="primary" onClick={editor.close}>
                    Close
                </CloseButton>
            </ModalBody>
        </Modal>
    );
};
