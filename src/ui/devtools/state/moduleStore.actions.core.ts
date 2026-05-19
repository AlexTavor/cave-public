import { ModuleCartridgeSchema } from "../../../data/schemas/module";
import { ensureModuleAssets } from "./moduleStore.assets";
import { ensureModuleBlueprint } from "./moduleStore.blueprint";
import { bumpLoadOrder } from "./moduleStore.helpers";
import { upsertModuleInState } from "./moduleStore.reducer";
import {
    suggestUniqueLabelForIndex,
    validateUniqueLabelForIndex,
} from "./moduleStore.labels";
import { MODULE_PARSE_ERROR_PREFIX } from "./moduleStore.constants";
import type { ModuleStoreActionContext } from "./moduleStore.actionContext";

export const createCoreActions = ({
    get,
    set,
    io,
}: ModuleStoreActionContext) => {
    const pendingLoads = new Map<string, Promise<void>>();

    const loadModule = async (filename: string) => {
        const pending = pendingLoads.get(filename);
        if (pending) return pending;

        const work = (async () => {
            set((s) => ({ loading: { ...s.loading, [filename]: true } }));
            try {
                const mod = await io.readModule(filename);
                if (!mod) return;
                const parsed = ModuleCartridgeSchema.safeParse(mod);
                if (!parsed.success) {
                    throw new Error(
                        `${MODULE_PARSE_ERROR_PREFIX}: ${parsed.error.message}`,
                    );
                }

                const normalized = ensureModuleBlueprint(
                    ensureModuleAssets(parsed.data),
                );

                set((s) => {
                    const next = upsertModuleInState(s, filename, normalized);
                    return {
                        ...next,
                        loadOrder: bumpLoadOrder(next.loadOrder, filename),
                    };
                });
            } finally {
                pendingLoads.delete(filename);
                set((s) => ({ loading: { ...s.loading, [filename]: false } }));
            }
        })();

        pendingLoads.set(filename, work);
        await work;
    };

    return {
        loadModule,

        getModule: (filename: string) => get().modules[filename] ?? null,

        getHeaders: (filename: string) =>
            get().indexes[filename]?.headers ?? {},

        getLabel: (filename: string, blueprintId: string) => {
            const header = get().indexes[filename]?.headers?.[blueprintId];
            return header?.label ?? blueprintId;
        },

        validateUniqueLabel: ({
            filename,
            label,
            currentId,
        }: {
            filename: string;
            label: string;
            currentId?: string;
        }) => {
            const labelToId = get().indexes[filename]?.labelToId ?? {};
            return validateUniqueLabelForIndex({
                labelToId,
                label,
                currentId,
            });
        },

        suggestUniqueLabel: ({
            filename,
            baseLabel,
        }: {
            filename: string;
            baseLabel: string;
        }) => {
            const labelToId = get().indexes[filename]?.labelToId ?? {};
            return suggestUniqueLabelForIndex(baseLabel, labelToId);
        },
    };
};

