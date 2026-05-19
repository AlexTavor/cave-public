import { ViewEditorModal } from "../../view-editor/ViewEditorModal";
import { useBlueprintVisualsEditor } from "./useBlueprintVisualsEditor";

export function BlueprintVisualsModal() {
    const editor = useBlueprintVisualsEditor();
    return <ViewEditorModal editor={editor} />;
}
