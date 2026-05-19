import type { ModuleCartridge } from "../../../data/schemas/module";
import { draftTextSpecs } from "./textRegistryDraftSpecs";
import {
    buildOwnerBlock,
    collectOwnerFields,
} from "./textRegistryBuilderUtils";
import type { TextOwnerBlock } from "./types";

const pushRecordBlocks = (
    blocks: TextOwnerBlock[],
    filename: string,
    baseRoot: string,
    specIndex: number,
    record: Record<string, unknown> | undefined,
) => {
    const spec = draftTextSpecs[specIndex];
    Object.entries(record ?? {}).forEach(([entryKey, owner]) => {
        const ownerId = (owner as { id?: unknown })?.id;
        if (typeof ownerId !== "string") return;
        const fields = collectOwnerFields(
            filename,
            `${baseRoot}.${entryKey}`,
            spec.ownerType,
            ownerId,
            owner,
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
};

export const buildDraftTextBlocks = (
    filename: string,
    moduleData: ModuleCartridge,
): TextOwnerBlock[] => {
    const blocks: TextOwnerBlock[] = [];
    pushRecordBlocks(
        blocks,
        filename,
        "draftOptions",
        0,
        moduleData.draftOptions,
    );
    pushRecordBlocks(blocks, filename, "draftPools", 1, moduleData.draftPools);
    return blocks;
};
