import type { Blueprint } from "../../../../data/schemas/blueprint";
import type { DisplayAsset } from "../../../../data/schemas/assets";
import type { RuntimeEntity } from "../../../runtime/types";
import { BODY_AVATAR_DISPLAY_KEY } from "../avatar/AvatarDisplayConstants";
import { readResourceProgressBars } from "../../../../lib/displays/resourceProgressBars";
import { resolveDisplaySource } from "../../../../lib/displays/resolveDisplaySource";

const readPassportGlyphKey = (body: unknown): string | null => {
    const passport =
        body && typeof body === "object"
            ? (body as { passport?: { glyphKey?: unknown } }).passport
            : null;
    return typeof passport?.glyphKey === "string" && passport.glyphKey
        ? passport.glyphKey
        : null;
};

const readDisplayGlyphKey = (display: unknown): string | null => {
    const glyphKey =
        display && typeof display === "object"
            ? (display as { glyphKey?: unknown }).glyphKey
            : null;
    return typeof glyphKey === "string" && glyphKey ? glyphKey : null;
};

const resolvePassportGlyphKey = (
    entity: RuntimeEntity,
    blueprint: Blueprint | undefined,
    displayKey: string,
) => {
    if (displayKey === BODY_AVATAR_DISPLAY_KEY) {
        return (
            readPassportGlyphKey((entity as { body?: unknown }).body) ??
            readPassportGlyphKey(blueprint?.components?.body)
        );
    }
    return null;
};

export const resolveGlyphKey = (
    entity: RuntimeEntity,
    blueprint: Blueprint | undefined,
    displayKey: string,
) =>
    readDisplayGlyphKey((entity as { display?: unknown }).display) ??
    readDisplayGlyphKey(blueprint?.components?.display) ??
    resolvePassportGlyphKey(entity, blueprint, displayKey);

export const readPassportStyleId = (blueprint: Blueprint | undefined) => {
    const styleId = blueprint?._editor?.abilities?.passport?.styleId;
    return typeof styleId === "string" && styleId ? styleId : null;
};

export const readDisplayAsset = (
    source: ReturnType<typeof resolveDisplaySource>,
) =>
    source.kind === "display" || source.kind === "unknown"
        ? source.asset
        : null;

export const readDisplayAssetStyleId = (
    asset: DisplayAsset | null,
    displayKey: string,
) => {
    if (asset?.type === "resource") return asset.styleId;
    return asset?.type === "attribute_pool" ? displayKey : null;
};

export const readDisplayAssetGlyphKey = (
    asset: DisplayAsset | null,
    displayKey: string,
) => {
    if (asset?.type === "resource") return asset.glyphKey;
    return asset?.type === "attribute_pool"
        ? (asset.glyphKey ?? displayKey)
        : null;
};

export const readDisplayBars = (display: unknown) => {
    const bars = readResourceProgressBars(display);
    return bars.length > 0 ? bars : undefined;
};
