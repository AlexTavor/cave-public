import type { Blueprint } from "../../../data/schemas/blueprint";
import { CompilerService } from "../../../engine/compiler/CompilerService";
import { mutateModule } from "./moduleStore.helpers";
import type { ModuleStoreActionContext } from "./moduleStore.actionContext";

export const createEjectActions = ({
    get,
    set,
    io,
}: ModuleStoreActionContext) => ({
    ejectBlueprint: async ({
        filename,
        blueprintId,
    }: {
        filename: string;
        blueprintId: string;
    }) => {
        return mutateModule(get, set, io, filename, (mod) => {
            const blueprint = mod.blueprints?.[blueprintId];
            if (!blueprint) {
                throw new Error(`Blueprint '${blueprintId}' not found.`);
            }
            if (!blueprint._editor) return mod;

            const compiled = new CompilerService().compile(blueprint);
            const { _editor: _ignored, ...rest } = compiled;

            return {
                ...mod,
                blueprints: {
                    ...mod.blueprints,
                    [blueprintId]: rest as Blueprint,
                },
            };
        });
    },
});
