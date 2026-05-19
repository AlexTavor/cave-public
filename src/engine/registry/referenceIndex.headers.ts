import type { ModuleCartridge } from "../../data/schemas/module";
import type { BlueprintHeader, BlueprintId } from "./types";

export function buildBlueprintHeaders(
    moduleData: ModuleCartridge,
): Record<BlueprintId, BlueprintHeader> {
    const headers: Record<string, BlueprintHeader> = {};
    const blueprints = moduleData.blueprints ?? {};

    for (const [id, bp] of Object.entries(blueprints)) {
        const displayLabel = bp.components?.display?.label;
        const rootLabel = bp.label;

        const label =
            (rootLabel?.trim() ? rootLabel : null) ??
            (displayLabel?.trim() ? displayLabel : null) ??
            id;

        headers[id] = { id, label };
    }

    return headers;
}
