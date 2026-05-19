import type { DisplayAsset } from "./displays";
import { normalizeLegacyDisplayKey } from "../../../lib/displays/normalizeLegacyDisplayKey";

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};

const ATTRIBUTE_DISPLAYS: Record<string, DisplayAsset> = {
    attr_body: { type: "attribute_pool", attribute: "body" },
    attr_mind: { type: "attribute_pool", attribute: "mind" },
    attr_social: { type: "attribute_pool", attribute: "social" },
};

const normalizeDisplays = (
    raw: Record<string, unknown>,
): Record<string, DisplayAsset> => {
    const authored = asRecord(raw.displays) as Record<string, DisplayAsset>;
    if (Object.keys(authored).length > 0) return authored;
    const resources = asRecord(raw.resources);
    const icons = asRecord(raw.icons);
    const displays: Record<string, DisplayAsset> = {};

    Object.keys(resources).forEach((key) => {
        const nextKey = normalizeLegacyDisplayKey(key);
        displays[nextKey] ??= {
            type: "resource",
            styleId: nextKey,
            glyphKey: nextKey,
        };
    });
    Object.entries(ATTRIBUTE_DISPLAYS).forEach(([key, asset]) => {
        const nextKey = normalizeLegacyDisplayKey(key);
        if (icons[key] && !displays[nextKey]) displays[nextKey] = asset;
    });
    return displays;
};

export const normalizeLegacyArtInput = (input: unknown): unknown => {
    if (!input || typeof input !== "object") return input;
    const raw = input as Record<string, unknown>;
    const {
        resources: _resources,
        configs: _configs,
        icons: _icons,
        ...rest
    } = raw;
    return {
        ...rest,
        displays: normalizeDisplays(raw),
        settings: raw.settings ?? raw.configs,
    };
};
