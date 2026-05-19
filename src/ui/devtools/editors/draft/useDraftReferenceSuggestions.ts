import { useCallback, useMemo } from "react";
import { workspaceService } from "../../../../engine/terminal/commands/projectServices";
import { useSessionStore } from "../../state/useSessionStore";

const uniqueSorted = (values: string[]) =>
    [...new Set(values)].sort((left, right) => left.localeCompare(right));

export const useDraftOptionIdSuggestions = (filename: string) => {
    const sessionOptions = useSessionStore(
        useCallback(
            (state) => state.sessions[filename]?.draft.draftOptions ?? null,
            [filename],
        ),
    );
    return useMemo(
        () =>
            uniqueSorted([
                ...Object.keys(sessionOptions ?? {}),
                ...Object.keys(
                    (
                        workspaceService.activeCartridge as unknown as {
                            draftOptions?: Record<string, unknown>;
                        }
                    )?.draftOptions ?? {},
                ),
            ]),
        [sessionOptions],
    );
};

export const useDraftPoolIdSuggestions = (filename: string) => {
    const sessionPools = useSessionStore(
        useCallback(
            (state) => state.sessions[filename]?.draft.draftPools ?? null,
            [filename],
        ),
    );
    return useMemo(
        () =>
            uniqueSorted([
                ...Object.keys(sessionPools ?? {}),
                ...Object.keys(
                    (
                        workspaceService.activeCartridge as unknown as {
                            draftPools?: Record<string, unknown>;
                        }
                    )?.draftPools ?? {},
                ),
            ]),
        [sessionPools],
    );
};
