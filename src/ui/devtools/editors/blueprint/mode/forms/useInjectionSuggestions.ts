import { useCallback, useMemo } from "react";
import { useSessionStore } from "../../../../state/useSessionStore";

type InjectionSuggestions = {
    tagSuggestions: string[];
    targetPathSuggestions: string[];
};

const collectTagSuggestions = (draft: any): string[] => {
    const tags = new Set<string>();
    const blueprints = Object.values(draft?.blueprints ?? {});
    for (const blueprint of blueprints) {
        const list = (blueprint as any)?.tags;
        if (!Array.isArray(list)) continue;
        for (const tag of list) {
            if (typeof tag === "string" && tag.trim()) tags.add(tag);
        }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
};

const collectTargetPaths = (draft: any): string[] => {
    const paths = new Set<string>();
    const blueprints = Object.values(draft?.blueprints ?? {});
    for (const blueprint of blueprints) {
        const state = (blueprint as any)?.components?.state;
        if (!state || typeof state !== "object") continue;
        for (const key of Object.keys(state)) {
            paths.add(`self.state.${key}.value`);
            paths.add(`self.state.${key}.max`);
        }
    }
    return Array.from(paths).sort((a, b) => a.localeCompare(b));
};

export const useInjectionSuggestions = (filename: string) => {
    const draft = useSessionStore(
        useCallback((state) => state.sessions[filename]?.draft, [filename]),
    );

    return useMemo<InjectionSuggestions>(() => {
        if (!draft) {
            return { tagSuggestions: [], targetPathSuggestions: [] };
        }
        return {
            tagSuggestions: collectTagSuggestions(draft),
            targetPathSuggestions: collectTargetPaths(draft),
        };
    }, [draft]);
};
