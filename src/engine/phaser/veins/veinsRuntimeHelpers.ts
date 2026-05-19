import type { RuntimeEntity } from "../../runtime/types";
import {
    VeinConfigSchema,
    type VeinConfig,
} from "../../../data/schemas/assets";

type RawAssets = { settings?: { vein_network?: VeinConfig } };

export const readRawVeinConfig = (assets: unknown): VeinConfig | undefined =>
    (assets as RawAssets)?.settings?.vein_network;

export const parseVeinConfig = (assets: unknown): VeinConfig => {
    const raw = readRawVeinConfig(assets);
    return VeinConfigSchema.parse(raw ?? {});
};

export const hasDemandTag = (entity: RuntimeEntity): boolean =>
    !!(entity as { tags?: string[] }).tags?.some((tag) =>
        tag.startsWith("demand:"),
    );
