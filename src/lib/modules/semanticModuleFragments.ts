import {
    BackgroundConfigSchema,
    DEFAULT_GLYPH_VIEW_CONFIG,
    DEFAULT_VEIN_CONFIG,
    GlyphViewConfigSchema,
} from "../../data/schemas/assets";
import {
    ModuleCartridgeSchema,
    type ModuleCartridge,
} from "../../data/schemas/module";
import { buildCaveBlueprintConfig } from "./buildCaveBlueprintConfig";
import {
    serializeAssetFragment,
    serializeCaveFragment,
    serializeDraftFragment,
} from "./fragmentSerializers";
import { normalizeLegacyArtInput } from "../../data/schemas/assets/normalizeLegacyArt";
import {
    asRecord,
    isAssetFile,
    isCaveFile,
    isDraftFile,
    withMetadata,
} from "./semanticModuleFragmentUtils";

export {
    isAssetFile,
    isCaveFile,
    isDraftFile,
} from "./semanticModuleFragmentUtils";

export const toCaveModule = (
    filename: string,
    raw: unknown,
): ModuleCartridge => {
    return ModuleCartridgeSchema.parse({
        ...withMetadata(filename),
        blueprint: buildCaveBlueprintConfig(raw),
    });
};

export const toAssetModule = (
    filename: string,
    raw: unknown,
): ModuleCartridge => {
    const input = asRecord(normalizeLegacyArtInput(raw));
    const settings = asRecord(input.settings);
    return ModuleCartridgeSchema.parse({
        ...withMetadata(filename),
        assets: {
            displays: asRecord(input.displays),
            glyphs: asRecord(input.glyphs),
            styles: asRecord(input.styles),
            settings: {
                background: BackgroundConfigSchema.parse(
                    settings.background ?? {},
                ),
                glyph_view: GlyphViewConfigSchema.parse(
                    settings.glyph_view ?? DEFAULT_GLYPH_VIEW_CONFIG,
                ),
                vein_network: {
                    ...DEFAULT_VEIN_CONFIG,
                    ...asRecord(settings.vein_network),
                },
            },
        },
    });
};

export const toDraftModule = (
    filename: string,
    raw: unknown,
): ModuleCartridge => {
    const input = asRecord(raw);
    return ModuleCartridgeSchema.parse({
        ...withMetadata(filename),
        draftOptions: asRecord(input.draftOptions),
        draftPools: asRecord(input.draftPools),
    });
};

export const toSemanticFragment = (
    filename: string,
    moduleData: ModuleCartridge,
): unknown => {
    if (isCaveFile(filename)) return serializeCaveFragment(moduleData);
    if (isAssetFile(filename)) return serializeAssetFragment(moduleData);
    if (isDraftFile(filename)) return serializeDraftFragment(moduleData);
    return moduleData;
};

