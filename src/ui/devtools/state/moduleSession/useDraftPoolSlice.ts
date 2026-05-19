import { useCallback } from "react";
import { useSessionStore } from "../useSessionStore";

export const useDraftPoolSlice = (
    filename: string | null,
    poolId: string | null,
) => {
    return useSessionStore(
        useCallback(
            (state) => {
                if (!filename || !poolId) return null;
                const session = state.sessions[filename];
                return session?.draft.draftPools?.[poolId] ?? null;
            },
            [filename, poolId],
        ),
    );
};
