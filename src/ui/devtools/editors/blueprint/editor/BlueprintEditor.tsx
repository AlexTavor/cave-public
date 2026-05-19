import React from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";
import { BlueprintProvider } from "../BlueprintContext";
import { BlueprintEditorView } from "./BlueprintEditorView";
import { EditorIdContext } from "../../EditorIdContext";

interface BlueprintEditorProps {
    filename: string;
    blueprintId: string;
}

export const BlueprintEditor: React.FC<BlueprintEditorProps> = ({
    filename,
    blueprintId,
}) => {
    useEnsureModuleSession(filename);
    const blueprint = useBlueprintSlice(filename, blueprintId);
    const hasSession = useSessionStore(
        (state) => !!filename && !!state.sessions[filename],
    );

    return (
        <EditorIdContext.Provider value={filename}>
            <BlueprintProvider value={{ filename, blueprintId }}>
                <BlueprintEditorView
                    isReady={hasSession}
                    blueprint={blueprint}
                />
            </BlueprintProvider>
        </EditorIdContext.Provider>
    );
};
