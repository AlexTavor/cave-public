import { useMemo, useCallback } from "react";
import { useExplorerStore } from "../state/explorerStore";
import { useShellStore } from "../../../../shell/shell";
import { useModuleStore } from "../../../../state/moduleStore";
import { useSessionStore } from "../../../../state/useSessionStore";
import type { ModuleDisplayAsset } from "../../../../state/moduleStore.assets";
import { ASSET_CATEGORY_DISPLAYS } from "../../../../state/moduleStore.assets";

export interface AssetGridItem {
    id: string;
    asset: ModuleDisplayAsset;
}

export interface UseAssetGridResult {
    assets: AssetGridItem[];
    onEditAsset: (id: string) => void;
    onDeleteAsset: (id: string) => void;
    onCreateAsset: () => void;
}

export function useAssetGrid(
    filename: string,
    sessionId: string,
): UseAssetGridResult {
    const session = useExplorerStore((s) => s.sessions[sessionId]);
    const filter = session?.filter || "";
    const actions = useExplorerStore((s) => s.actions);

    const moduleData = useModuleStore((s) => s.modules[filename]);
    const sessionDisplays = useSessionStore(
        (s) => s.sessions[filename]?.draft.assets?.displays ?? null,
    );
    const displayAssets: Record<string, ModuleDisplayAsset> = useMemo(
        () => sessionDisplays ?? moduleData?.assets?.displays ?? {},
        [moduleData, sessionDisplays],
    );

    const assets = useMemo(() => {
        const normalizedFilter = filter.trim().toLowerCase();
        return Object.entries(displayAssets)
            .filter(([id, asset]) => {
                if (!normalizedFilter) return true;
                const haystack = [
                    id,
                    asset?.tooltip ?? "",
                    ...(asset?.tags ?? []),
                ]
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(normalizedFilter);
            })
            .map(([id, asset]) => ({ id, asset }));
    }, [displayAssets, filter]);

    const { openFile } = useShellStore();

    const onEditAsset = useCallback(
        (id: string) =>
            openFile(`${filename}::assets::${ASSET_CATEGORY_DISPLAYS}::${id}`),
        [filename, openFile],
    );

    const onDeleteAsset = useCallback(
        (id: string) => actions.setPendingDeleteAssetId(sessionId, id),
        [actions, sessionId],
    );

    const onCreateAsset = useCallback(
        () => actions.openCreateAsset(sessionId),
        [actions, sessionId],
    );

    return {
        assets,
        onEditAsset,
        onDeleteAsset,
        onCreateAsset,
    };
}

