import type {
    ModuleCartridge,
    ModuleMetadata,
} from "../../../data/schemas/module";
import { ModuleCartridgeSchema } from "../../../data/schemas/module";
import { saveModuleMetadataToModule } from "./moduleStore.blueprints";
import { mutateModule } from "./moduleStore.helpers";
import type { ModuleStoreActionContext } from "./moduleStore.actionContext";
import { sanitizeModuleAbilities } from "./moduleStore.abilitySanitizer";
import { useShellStore } from "../shell/shell";

export const createModuleActions = ({
    get,
    set,
    io,
}: ModuleStoreActionContext) => ({
    saveModuleMetadata: async ({
        filename,
        metadata,
    }: {
        filename: string;
        metadata: ModuleMetadata;
    }) => {
        return mutateModule(get, set, io, filename, (mod) => {
            return saveModuleMetadataToModule({
                moduleData: mod,
                metadata,
            });
        });
    },

    saveModuleCartridge: async ({
        filename,
        module,
    }: {
        filename: string;
        module: ModuleCartridge;
    }) => {
        const sanitizedResult = sanitizeModuleAbilities(module);
        if (sanitizedResult.removed > 0) {
            const abilityLabel =
                sanitizedResult.removed === 1 ? "ability" : "abilities";
            useShellStore
                .getState()
                .log(
                    "info",
                    `Warning: Removed ${sanitizedResult.removed} invalid ${abilityLabel} from '${filename}' before saving.`,
                );
        }
        const parsed = ModuleCartridgeSchema.parse(sanitizedResult.module);
        return mutateModule(get, set, io, filename, () => parsed);
    },
});

