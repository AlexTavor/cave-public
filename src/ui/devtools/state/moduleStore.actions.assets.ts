import type { AssetCategory, ModuleDisplayAsset } from "./moduleStore.assets";
import {
    ASSET_CATEGORY_DISPLAYS,
    deleteDisplayAssetFromModule,
    saveDisplayAssetToModule,
} from "./moduleStore.assets";
import { mutateModule } from "./moduleStore.helpers";
import type { ModuleStoreActionContext } from "./moduleStore.actionContext";

export const createAssetActions = ({
    get,
    set,
    io,
}: ModuleStoreActionContext) => ({
    saveAssetToModule: async ({
        filename,
        category,
        assetId,
        assetData,
    }: {
        filename: string;
        category: AssetCategory;
        assetId: string;
        assetData: ModuleDisplayAsset;
    }) => {
        if (category !== ASSET_CATEGORY_DISPLAYS) {
            throw new Error(`Unsupported asset category '${category}'`);
        }
        return mutateModule(get, set, io, filename, (mod) => {
            return saveDisplayAssetToModule({
                moduleData: mod,
                assetId,
                asset: assetData,
            });
        });
    },

    deleteAssetFromModule: async ({
        filename,
        category,
        assetId,
    }: {
        filename: string;
        category: AssetCategory;
        assetId: string;
    }) => {
        if (category !== ASSET_CATEGORY_DISPLAYS) {
            throw new Error(`Unsupported asset category '${category}'`);
        }
        await mutateModule(get, set, io, filename, (mod) => {
            return deleteDisplayAssetFromModule({
                moduleData: mod,
                assetId,
            });
        });
    },
});

