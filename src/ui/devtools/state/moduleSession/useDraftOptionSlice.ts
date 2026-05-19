import { useCallback } from "react";
import { useSessionStore } from "../useSessionStore";

export const useDraftOptionSlice = (
    filename: string | null,
    optionId: string | null,
) => {
    return useSessionStore(
        useCallback(
            (state) => {
                if (!filename || !optionId) return null;
                const session = state.sessions[filename];
                return session?.draft.draftOptions?.[optionId] ?? null;
            },
            [filename, optionId],
        ),
    );
};
