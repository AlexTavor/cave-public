import { useCallback } from "react";
import type { AssetCategory } from "../moduleStore.assets";
import type { AssetCollection } from "../../../../data/schemas/assets";
import { useSessionStore } from "../useSessionStore";

export const useAssetSlice = <TAsset = unknown>(
    filename: string | null,
    category: AssetCategory | null,
    assetId: string | null,
): TAsset | null =>
    useSessionStore(
        useCallback(
            (state) => {
                if (!filename || !category || !assetId) return null;
                const assets = state.sessions[filename]?.draft.assets as
                    | AssetCollection
                    | undefined;
                const bucket = assets?.[category] as
                    | Record<string, TAsset>
                    | undefined;
                return bucket?.[assetId] ?? null;
            },
            [filename, category, assetId],
        ),
    );

