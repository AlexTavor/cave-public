import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { EditorContainer, LoadingState } from "./BlueprintEditor.styles";
import type { Blueprint } from "../../../../../data/schemas/blueprint";
import { DesignerMode } from "../mode/DesignerMode";
import { ValidationHud } from "../components/validation/ValidationHud";
import { useBlueprintValidation } from "../hooks/useBlueprintValidation";
import { TagsBar } from "../tags-bar/TagsBar";
import { BlueprintIdTitle } from "../components/BlueprintIdTitle";
import { ChangeIdModal } from "../components/change-id-modal/ChangeIdModal";
import { useBlueprintContext } from "../BlueprintContext";
import { useScrollMemory } from "../../../hooks/useScrollMemory";
import { BlueprintVisualsModal } from "../visuals/BlueprintVisualsModal";

interface BlueprintEditorViewProps {
    isReady: boolean;
    blueprint: Blueprint | null;
}

export const BlueprintEditorView: React.FC<BlueprintEditorViewProps> = ({
    isReady,
    blueprint,
}) => {
    const { blueprintId } = useBlueprintContext();
    const scrollRef = useScrollMemory(`blueprint::${blueprintId}`);
    const { issues } = useBlueprintValidation(blueprint);

    if (!isReady) {
        return <LoadingState>Initializing Session...</LoadingState>;
    }

    if (!blueprint) {
        return (
            <LoadingState>Blueprint Not Found or Loading Error</LoadingState>
        );
    }

    return (
        <EditorContainer>
            <ToolFrame title={<BlueprintIdTitle />} bodyRef={scrollRef}>
                <TagsBar />
                <DesignerMode />
                <ValidationHud issues={issues} />
                <ChangeIdModal />
                <BlueprintVisualsModal />
            </ToolFrame>
        </EditorContainer>
    );
};

