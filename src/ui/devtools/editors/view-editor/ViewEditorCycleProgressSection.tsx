import {
    SectionTitle,
    VisualSection,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import { ViewEditorCycleProgressColorFields } from "./ViewEditorCycleProgressColorFields";
import { ViewEditorCycleProgressCoreFields } from "./ViewEditorCycleProgressCoreFields";
import type { ViewEditorAdapter } from "./ViewEditor.types";

export const ViewEditorCycleProgressSection: React.FC<{
    editor: ViewEditorAdapter;
}> = ({ editor }) => {
    if (!editor.cycleProgress) return null;
    return (
        <VisualSection>
            <SectionTitle>Cycle Progress</SectionTitle>
            <ViewEditorCycleProgressCoreFields
                cycleProgress={editor.cycleProgress}
            />
            <ViewEditorCycleProgressColorFields
                cycleProgress={editor.cycleProgress}
                paletteOptions={editor.projectDefaults.paletteOptions}
            />
        </VisualSection>
    );
};
