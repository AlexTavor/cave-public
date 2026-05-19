import type { Blueprint } from "../../../data/schemas/blueprint";
import {
    createBlueprintInModule,
    deleteBlueprintFromModule,
    duplicateBlueprintInModule,
    saveBlueprintToModule,
} from "./moduleStore.blueprints";
import {
    DEFAULT_BLUEPRINT_ICON,
    DEFAULT_BLUEPRINT_LABEL,
} from "./moduleStore.constants";
import { generateEntityId } from "./moduleStore.ids";
import { mutateModule } from "./moduleStore.helpers";
import type { ModuleStoreActionContext } from "./moduleStore.actionContext";
import { CompilerService } from "../../../engine/compiler/CompilerService";
import { sanitizeBlueprintAbilities } from "./moduleStore.abilitySanitizer";
import { useShellStore } from "../shell/shell";

const logSanitizationWarnings = (
    label: string,
    result: ReturnType<typeof sanitizeBlueprintAbilities>,
): void => {
    const log = useShellStore.getState().log;
    if (result.removed > 0) {
        const noun = result.removed === 1 ? "ability" : "abilities";
        log(
            "info",
            `Warning: Removed ${result.removed} invalid ${noun} from '${label}' before saving.`,
        );
    }
    if (result.conditionsRemoved > 0) {
        log(
            "info",
            `Warning: Removed ${result.conditionsRemoved} invalid condition(s) from '${label}' before saving.`,
        );
    }
};

export const createBlueprintActions = ({
    get,
    set,
    io,
}: ModuleStoreActionContext) => ({
    createBlueprint: async ({ filename }: { filename: string }) => {
        const newId = generateEntityId();
        await mutateModule(get, set, io, filename, (mod) => {
            const { updated } = createBlueprintInModule({
                moduleData: mod,
                newId,
                baseLabel: DEFAULT_BLUEPRINT_LABEL,
                icon: DEFAULT_BLUEPRINT_ICON,
            });
            return updated;
        });
        return newId;
    },

    duplicateBlueprint: async ({
        filename,
        blueprintId,
    }: {
        filename: string;
        blueprintId: string;
    }) => {
        const newId = generateEntityId();
        await mutateModule(get, set, io, filename, (mod) => {
            const { updated } = duplicateBlueprintInModule({
                moduleData: mod,
                sourceId: blueprintId,
                newId,
            });
            return updated;
        });
        return newId;
    },

    computeDeleteImpact: ({
        filename,
        blueprintId,
    }: {
        filename: string;
        blueprintId: string;
    }) => {
        const refs = get().indexes[filename]?.refs;
        if (!refs) return [];
        return (refs.incomingByTarget[blueprintId] ?? []).map((r) => ({
            fromId: r.fromId,
            fromLabel: r.fromLabel,
            path: r.path,
        }));
    },

    deleteBlueprint: async ({
        filename,
        blueprintId,
    }: {
        filename: string;
        blueprintId: string;
    }) => {
        await mutateModule(get, set, io, filename, (mod) => {
            return deleteBlueprintFromModule({
                moduleData: mod,
                blueprintId,
            });
        });
    },

    saveBlueprint: async ({
        filename,
        blueprintId,
        blueprint,
    }: {
        filename: string;
        blueprintId: string;
        blueprint: Blueprint;
    }) => {
        const compiled = new CompilerService().compile(blueprint);
        const sanitizedResult = sanitizeBlueprintAbilities(compiled);
        logSanitizationWarnings(
            blueprint.label ?? blueprintId,
            sanitizedResult,
        );
        const sanitized = sanitizedResult.blueprint;
        return mutateModule(get, set, io, filename, (mod) => {
            return saveBlueprintToModule({
                moduleData: mod,
                blueprintId,
                blueprint: sanitized,
            });
        });
    },
});

