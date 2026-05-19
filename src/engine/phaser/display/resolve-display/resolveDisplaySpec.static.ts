import type { Blueprint } from "../../../../data/schemas/blueprint";
import type { DisplayAsset } from "../../../../data/schemas/assets";
import type { RuntimeEntity } from "../../../runtime/types";
import type { ResolvedDisplayStaticSpec } from "../types";
import { resolveDisplaySource } from "../../../../lib/displays/resolveDisplaySource";
import {
    parseDisplayComponent,
    parseEntityStyle,
} from "../../scenes/gameSceneVisualParsers";
import {
    readDisplayAsset,
    readDisplayAssetGlyphKey,
    readDisplayAssetStyleId,
    readDisplayBars,
    readPassportStyleId,
    resolveGlyphKey,
} from "./resolveDisplaySpec.helpers";

export const resolveDisplayStaticSpec = (params: {
    entity: RuntimeEntity;
    blueprint: Blueprint | undefined;
    styles: Record<string, unknown>;
    displays: Record<string, DisplayAsset>;
    blueprints: Record<string, Blueprint | undefined>;
}): ResolvedDisplayStaticSpec | null => {
    const { entity, blueprint, styles, displays, blueprints } = params;
    const display = parseDisplayComponent(
        entity,
        blueprint?.components?.display,
    );
    if (!display) return null;
    if (!display.display_key) {
        console.error(
            `[resolveDisplaySpec] Empty display_key for entity: ${entity.id}`,
        );
        return null;
    }
    const source = resolveDisplaySource({
        displayKey: display.display_key,
        displays,
        blueprints,
    });
    const asset = readDisplayAsset(source);
    const styleId =
        readDisplayAssetStyleId(asset, source.key) ??
        display.style ??
        readPassportStyleId(blueprint);
    let displayAssetKey: string | null = null;
    if (source.kind === "display") displayAssetKey = display.display_key;
    else if (source.kind === "unknown") displayAssetKey = "unknown";
    return {
        entityId: entity.id ?? "",
        display,
        display_key: source.key,
        display_asset_key: displayAssetKey,
        displayBars: readDisplayBars(display),
        glyph_key:
            readDisplayAssetGlyphKey(asset, source.key) ??
            resolveGlyphKey(entity, blueprint, source.key),
        label: display.label,
        styleId: styleId && parseEntityStyle(styles[styleId]) ? styleId : null,
        style: styleId ? parseEntityStyle(styles[styleId]) : null,
    };
};
