import type { ModuleCartridge } from "../../../data/schemas/module";
import {
    buildBlueprintHeaders,
    buildReferenceIndex,
} from "../../../engine/registry/referenceIndex";
import type {
    BlueprintHeader,
    ReferenceIndex,
} from "../../../engine/registry/types";
import { makeLabelIndex } from "./moduleStore.labels";

export interface ModuleIndex {
    headers: Record<string, BlueprintHeader>;
    labelToId: Record<string, string>;
    refs: ReferenceIndex;
}

export function buildModuleIndex(moduleData: ModuleCartridge): ModuleIndex {
    const headers = buildBlueprintHeaders(moduleData);
    const labelToId = makeLabelIndex(headers);
    const refs = buildReferenceIndex(moduleData);

    return { headers, labelToId, refs };
}
