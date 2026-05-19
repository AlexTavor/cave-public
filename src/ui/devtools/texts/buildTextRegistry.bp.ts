import type { ModuleCartridge } from "../../../data/schemas/module";
import { blueprintTextSpecs } from "./textRegistryBlueprintSpecs";
import {
    buildOwnerBlock,
    collectOwnerFields,
} from "./textRegistryBuilderUtils";
import type { TextOwnerBlock } from "./types";

export const buildBlueprintTextBlocks = (
    filename: string,
    moduleData: ModuleCartridge,
): TextOwnerBlock[] => {
    const blocks: TextOwnerBlock[] = [];
    Object.entries(moduleData.blueprints ?? {}).forEach(
        ([blueprintKey, blueprint]) => {
            const ownerId = blueprint?.id;
            if (typeof ownerId !== "string") return;
            const basePath = `blueprints.${blueprintKey}`;
            blueprintTextSpecs.forEach((spec) => {
                const fields = collectOwnerFields(
                    filename,
                    basePath,
                    spec.ownerType,
                    ownerId,
                    blueprint,
                    spec,
                );
                const block = buildOwnerBlock(
                    filename,
                    spec.ownerType,
                    ownerId,
                    fields,
                );
                if (block) blocks.push(block);
            });
        },
    );
    return blocks;
};
