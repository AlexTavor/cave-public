import { useCallback, useMemo } from "react";
import { useSessionStore } from "../../../../state/useSessionStore";

const EMPTY_RESOURCES: Record<string, unknown> = {};

export const useResourceSuggestions = (filename: string) => {
    const resources = useSessionStore(
        useCallback(
            (state) => {
                const assets = state.sessions[filename]?.draft.assets;
                return assets?.resources ?? EMPTY_RESOURCES;
            },
            [filename],
        ),
    );

    return useMemo(() => Object.keys(resources), [resources]);
};
