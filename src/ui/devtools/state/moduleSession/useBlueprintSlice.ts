import { useCallback } from "react";
import { useSessionStore } from "../useSessionStore";

export const useBlueprintSlice = (
    filename: string | null,
    blueprintId: string | null,
) => {
    return useSessionStore(
        useCallback(
            (state) => {
                if (!filename || !blueprintId) return null;
                const session = state.sessions[filename];
                return session?.draft.blueprints?.[blueprintId] ?? null;
            },
            [filename, blueprintId],
        ),
    );
};
