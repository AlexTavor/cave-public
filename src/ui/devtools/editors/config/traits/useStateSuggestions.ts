import { useCallback, useMemo } from "react";
import { useSessionStore } from "../../../state/useSessionStore";

/**
 * Collect `self.state.<key>.<leaf>` paths from all blueprints in the module.
 * Returned as a sorted array for use as autocomplete suggestions.
 */
const collectStatePaths = (draft: unknown): string[] => {
    const paths = new Set<string>();
    const blueprints = Object.entries(
        (draft as Record<string, unknown>)?.blueprints ?? {},
    );
    for (const [, blueprint] of blueprints) {
        const bp = blueprint as Record<string, unknown>;
        const comps = bp?.components as Record<string, unknown> | undefined;
        const state = comps?.state as Record<string, unknown> | undefined;
        if (!state || typeof state !== "object") continue;
        for (const key of Object.keys(state)) {
            paths.add(`self.state.${key}.value`);
            paths.add(`self.state.${key}.max`);
            paths.add(`self.state.${key}.min`);
        }
    }
    return Array.from(paths).sort((a, b) => a.localeCompare(b));
};

export const useStateSuggestions = (filename: string): string[] => {
    const draft = useSessionStore(
        useCallback((state) => state.sessions[filename]?.draft, [filename]),
    );
    return useMemo(() => (draft ? collectStatePaths(draft) : []), [draft]);
};
