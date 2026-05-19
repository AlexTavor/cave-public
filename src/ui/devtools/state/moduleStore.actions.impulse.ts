import type { ImpulseConfig } from "../../../data/schemas/physics";
import { saveImpulseConfigToModule } from "./moduleStore.blueprint";
import { mutateModule } from "./moduleStore.helpers";
import { upsertModuleInState } from "./moduleStore.reducer";
import type { ModuleStoreActionContext } from "./moduleStore.actionContext";

export const createImpulseActions = ({
    get,
    set,
    io,
}: ModuleStoreActionContext) => ({
    applyImpulseConfig: ({
        filename,
        impulse,
    }: {
        filename: string;
        impulse: ImpulseConfig;
    }) => {
        set((state) => {
            const current = state.modules[filename];
            if (!current) return state;
            const updated = saveImpulseConfigToModule({
                moduleData: current,
                impulse,
            });
            return upsertModuleInState(state, filename, updated);
        });
    },

    saveImpulseConfig: async ({
        filename,
        impulse,
    }: {
        filename: string;
        impulse: ImpulseConfig;
    }) => {
        return mutateModule(get, set, io, filename, (mod) => {
            return saveImpulseConfigToModule({
                moduleData: mod,
                impulse,
            });
        });
    },
});
