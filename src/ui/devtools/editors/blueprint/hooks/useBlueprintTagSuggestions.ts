import { useCallback, useMemo } from "react";
import { workspaceService } from "../../../../../engine/terminal/commands/projectServices";
import { useShellStore } from "../../../shell/shell";
import { useSessionStore } from "../../../state/useSessionStore";

const EMPTY_BLUEPRINTS = {};

const collectTags = (blueprints: Record<string, unknown>): string[] => {
    const tags = new Set<string>();
    Object.values(blueprints).forEach((blueprint) => {
        const list = (blueprint as { tags?: unknown }).tags;
        if (!Array.isArray(list)) return;
        list.forEach((tag) => {
            if (typeof tag === "string" && tag.trim()) tags.add(tag);
        });
    });
    return [...tags].sort((left, right) => left.localeCompare(right));
};

export const useBlueprintTagSuggestions = (filename: string): string[] => {
    const activeManifestPath = useShellStore(
        (state) => state.activeManifestPath,
    );
    const draftBlueprints = useSessionStore(
        useCallback(
            (state) =>
                state.sessions[filename]?.draft.blueprints ?? EMPTY_BLUEPRINTS,
            [filename],
        ),
    );

    return useMemo(() => {
        const linkedBlueprints =
            workspaceService.activeCartridge?.blueprints ?? {};
        return collectTags({ ...linkedBlueprints, ...draftBlueprints });
    }, [activeManifestPath, draftBlueprints]);
};
