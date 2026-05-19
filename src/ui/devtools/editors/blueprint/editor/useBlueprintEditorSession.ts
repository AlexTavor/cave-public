import { useSessionStore } from "../../../state/useSessionStore";
import type { Blueprint } from "../../../../../data/schemas/blueprint";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";

export interface BlueprintEditorSessionState {
    sessionId: string;
    hasSession: boolean;
    draftData: Blueprint | undefined;
}

export function useBlueprintEditorSession(params: {
    filename: string;
    blueprintId: string;
}): BlueprintEditorSessionState {
    const { filename, blueprintId } = params;
    useEnsureModuleSession(filename);

    const draftData = useBlueprintSlice(filename, blueprintId) ?? undefined;
    const hasSession = useSessionStore((s) => !!s.sessions[filename]);

    return { sessionId: filename, hasSession, draftData };
}
