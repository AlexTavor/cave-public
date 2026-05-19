import {
    createDraftOptionInModule,
    createDraftPoolInModule,
    deleteDraftOptionFromModule,
    deleteDraftPoolFromModule,
} from "./moduleStore.drafts";
import { mutateModule } from "./moduleStore.helpers";
import type { ModuleStoreActionContext } from "./moduleStore.actionContext";
import type { DraftPoolEntry } from "../../../data/schemas/draft";

export const createDraftActions = ({
    get,
    set,
    io,
}: ModuleStoreActionContext) => ({
    createDraftOption: async ({ filename }: { filename: string }) => {
        let createdId = "";
        await mutateModule(get, set, io, filename, (mod) => {
            const { updated, optionId } = createDraftOptionInModule({
                moduleData: mod,
            });
            createdId = optionId;
            return updated;
        });
        return createdId;
    },

    createDraftPool: async ({ filename }: { filename: string }) => {
        let createdId = "";
        await mutateModule(get, set, io, filename, (mod) => {
            const { updated, poolId } = createDraftPoolInModule({
                moduleData: mod,
            });
            createdId = poolId;
            return updated;
        });
        return createdId;
    },

    deleteDraftOption: async ({
        filename,
        optionId,
    }: {
        filename: string;
        optionId: string;
    }) => {
        await mutateModule(get, set, io, filename, (mod) => {
            return deleteDraftOptionFromModule({
                moduleData: mod,
                optionId,
            });
        });
    },

    deleteDraftPool: async ({
        filename,
        poolId,
    }: {
        filename: string;
        poolId: string;
    }) => {
        await mutateModule(get, set, io, filename, (mod) => {
            return deleteDraftPoolFromModule({
                moduleData: mod,
                poolId,
            });
        });
    },

    updateDraftPoolEntries: async ({
        filename,
        poolId,
        entries,
    }: {
        filename: string;
        poolId: string;
        entries: DraftPoolEntry[];
    }) => {
        await mutateModule(get, set, io, filename, (mod) => {
            const pool = mod.draftPools?.[poolId];
            if (!pool) return mod;
            return {
                ...mod,
                draftPools: {
                    ...mod.draftPools,
                    [poolId]: { ...pool, entries },
                },
            };
        });
    },
});
