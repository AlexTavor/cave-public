import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import {
    resolveEntityDisplay,
    resolveEntityLabel,
    resolveNonBlankText,
    resolveVisibleEntityDescription,
} from "./selectionUtils";

export type DisplayCardData = {
    label: string;
    description: string;
    subtitle: string;
};

export const resolveDisplayCardData = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): DisplayCardData => ({
    label: resolveEntityLabel(entity),
    description: resolveVisibleEntityDescription(entity, runtime),
    subtitle:
        resolveNonBlankText(
            resolveEntityDisplay(entity, runtime)?.display_key,
        ) ??
        entity.id ??
        "Entity",
});
