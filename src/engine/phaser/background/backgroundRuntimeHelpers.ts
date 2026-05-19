import {
    BackgroundConfigSchema,
    type BackgroundConfig,
} from "../../../data/schemas/assets";

type RawAssets = { settings?: { background?: BackgroundConfig } };

export const readRawBackgroundConfig = (
    assets: unknown,
): BackgroundConfig | undefined => (assets as RawAssets)?.settings?.background;

export const parseBackgroundConfig = (assets: unknown): BackgroundConfig => {
    const raw = readRawBackgroundConfig(assets);
    return BackgroundConfigSchema.parse(raw ?? {});
};
