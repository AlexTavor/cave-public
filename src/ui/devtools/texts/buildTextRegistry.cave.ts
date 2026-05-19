import type { ModuleCartridge } from "../../../data/schemas/module";
import { caveTextSpecs } from "./textRegistryCaveSpecs";
import {
    buildOwnerBlock,
    collectOwnerFields,
} from "./textRegistryBuilderUtils";
import type { TextOwnerBlock } from "./types";

const pushArrayBlocks = (
    blocks: TextOwnerBlock[],
    filename: string,
    basePath: string,
    specIndex: number,
    items: unknown[] | undefined,
) => {
    const spec = caveTextSpecs[specIndex];
    (items ?? []).forEach((owner, index) => {
        const ownerId = (owner as { id?: unknown })?.id;
        if (typeof ownerId !== "string") return;
        const fields = collectOwnerFields(
            filename,
            `${basePath}.${index}`,
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

const pushRecordBlocks = (
    blocks: TextOwnerBlock[],
    filename: string,
    basePath: string,
    specIndex: number,
    record: Record<string, unknown> | undefined,
) => {
    const spec = caveTextSpecs[specIndex];
    Object.entries(record ?? {}).forEach(([key, owner]) => {
        const ownerId = (owner as { id?: unknown })?.id;
        if (typeof ownerId !== "string") return;
        const fields = collectOwnerFields(
            filename,
            `${basePath}.${key}`,
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

export const buildCaveTextBlocks = (
    filename: string,
    moduleData: ModuleCartridge,
): TextOwnerBlock[] => {
    const config = moduleData.config;
    const blocks: TextOwnerBlock[] = [];
    pushArrayBlocks(
        blocks,
        filename,
        "config.settings.guidances",
        0,
        config?.settings?.guidances,
    );
    pushArrayBlocks(
        blocks,
        filename,
        "config.settings.tutorials",
        1,
        config?.settings?.tutorials,
    );
    pushArrayBlocks(
        blocks,
        filename,
        "config.settings.knowledge",
        2,
        config?.settings?.knowledge,
    );
    pushRecordBlocks(blocks, filename, "config.traits", 3, config?.traits);
    pushRecordBlocks(blocks, filename, "config.habiti", 4, config?.habiti);
    pushRecordBlocks(
        blocks,
        filename,
        "config.understanding",
        5,
        config?.understanding,
    );
    pushArrayBlocks(
        blocks,
        filename,
        "config.settings.game_config.purge.milestones",
        6,
        config?.settings?.game_config?.purge?.milestones,
    );
    return blocks;
};
