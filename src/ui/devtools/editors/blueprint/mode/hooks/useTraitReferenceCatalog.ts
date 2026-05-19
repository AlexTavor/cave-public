import { useCallback, useMemo } from "react";
import { workspaceService } from "../../../../../../engine/terminal/commands/projectServices";
import { useRuntimeStore } from "../../../../../runtime/state/useRuntimeStore";
import { useShellStore } from "../../../../shell/shell";
import { useSessionStore } from "../../../../state/useSessionStore";
import type { SessionStoreState } from "../../../../state/useSessionStore";
import { useBlueprintContext } from "../../BlueprintContext";

const EMPTY_TRAITS = {};

export const useTraitReferenceCatalog = () => {
    const { filename } = useBlueprintContext();
    const activeManifestPath = useShellStore(
        (state) => state.activeManifestPath,
    );
    const runtime = useRuntimeStore((state) => state.runtime);
    const traits = useSessionStore(
        useCallback(
            (state: SessionStoreState) =>
                state.sessions[filename]?.draft.config?.traits ?? EMPTY_TRAITS,
            [filename],
        ),
    );

    return useMemo(() => {
        const ids = [
            ...new Set([
                ...Object.keys(
                    workspaceService.activeCartridge?.config?.traits ?? {},
                ),
                ...Object.keys(traits),
            ]),
        ].sort((left, right) => left.localeCompare(right));
        return { ids, options: ids.map((id) => ({ id, label: id })) };
    }, [activeManifestPath, runtime, traits]);
};
