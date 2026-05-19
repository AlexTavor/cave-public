import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { resolveStorageAbilityBars } from "./ability-display/resolveStorageAbilityBars";
import {
    resolveEntityLabel,
    resolveVisibleEntityDescription,
} from "./selectionUtils";

export type ResourceCardData = {
    label: string;
    description: string;
    storageModels: ReturnType<typeof resolveStorageAbilityBars>;
};

export const resolveResourceCardData = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): ResourceCardData => ({
    label: resolveEntityLabel(entity),
    description: resolveVisibleEntityDescription(entity, runtime),
    storageModels: resolveStorageAbilityBars(entity, runtime),
});
