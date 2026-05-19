import { useCallback, useMemo } from "react";
import { workspaceService } from "../../../../../../engine/terminal/commands/projectServices";
import { useRuntimeStore } from "../../../../../runtime/state/useRuntimeStore";
import { useShellStore } from "../../../../shell/shell";
import { useSessionStore } from "../../../../state/useSessionStore";
import type { SessionStoreState } from "../../../../state/useSessionStore";
import { useBlueprintContext } from "../../BlueprintContext";

const EMPTY_HABITI = {};

export const useHabitusReferenceCatalog = () => {
    const { filename } = useBlueprintContext();
    const activeManifestPath = useShellStore(
        (state) => state.activeManifestPath,
    );
    const runtime = useRuntimeStore((state) => state.runtime);
    const habiti = useSessionStore(
        useCallback(
            (state: SessionStoreState) =>
                state.sessions[filename]?.draft.config?.habiti ?? EMPTY_HABITI,
            [filename],
        ),
    );

    return useMemo(() => {
        const ids = [
            ...new Set([
                ...Object.keys(
                    workspaceService.activeCartridge?.config?.habiti ?? {},
                ),
                ...Object.keys(habiti),
            ]),
        ].sort((left, right) => left.localeCompare(right));
        return { ids, options: ids.map((id) => ({ id, label: id })) };
    }, [activeManifestPath, habiti, runtime]);
};
