import type { ModuleCartridge } from "../../../../../data/schemas/module";
import {
    ensureResourceViewAssets,
    readDefaultLineThickness,
    readPaletteOptions,
} from "../../view-editor/viewEditorAssetLinking";
import {
    ensureGlyphAssetById,
    ensureStyleAssetById,
    resolveGlyphId,
    resolveDisplayId,
    resolveStyleId,
} from "./blueprintVisualsDraft";
import { linkPassportAsset } from "./blueprintVisualsActionUtils";

export const createLinkedAssetMutators = (params: {
    blueprintFilename: string;
    assetFilename: string;
    blueprintId: string;
    getBlueprintDraft: () => ModuleCartridge | null;
    updateDraft: (
        filename: string,
        recipe: (draft: ModuleCartridge) => void,
    ) => void;
}) => {
    const readStyleId = () => {
        const draft = params.getBlueprintDraft();
        return draft
            ? resolveStyleId(draft, params.blueprintId)
            : params.blueprintId;
    };
    const readDisplayKey = () => {
        const draft = params.getBlueprintDraft();
        return draft
            ? resolveDisplayId(draft, params.blueprintId)
            : params.blueprintId;
    };
    const readGlyphId = () => {
        const draft = params.getBlueprintDraft();
        return draft
            ? resolveGlyphId(draft, params.blueprintId)
            : params.blueprintId;
    };

    return {
        mutateStyle: (
            recipe: (style: ReturnType<typeof ensureStyleAssetById>) => void,
        ) => {
            const styleId = readStyleId();
            const displayKey = readDisplayKey();
            params.updateDraft(params.assetFilename, (draft) => {
                const display = ensureResourceViewAssets(draft, displayKey);
                recipe(ensureStyleAssetById(draft, display.styleId || styleId));
            });
            params.updateDraft(params.blueprintFilename, (draft) => {
                linkPassportAsset(
                    draft,
                    params.blueprintId,
                    displayKey,
                    styleId,
                );
            });
        },
        mutateGlyph: (
            recipe: (glyph: ReturnType<typeof ensureGlyphAssetById>) => void,
        ) => {
            const glyphId = readGlyphId();
            const displayKey = readDisplayKey();
            params.updateDraft(params.assetFilename, (draft) => {
                const display = ensureResourceViewAssets(draft, displayKey);
                recipe(
                    ensureGlyphAssetById(draft, display.glyphKey || glyphId),
                );
            });
            params.updateDraft(params.blueprintFilename, (draft) => {
                linkPassportAsset(
                    draft,
                    params.blueprintId,
                    displayKey,
                    glyphId,
                );
            });
        },
        readProjectDefaults: () => {
            const draft = params.getBlueprintDraft();
            const displayKey = readDisplayKey();
            return draft
                ? {
                      defaultLineThickness: readDefaultLineThickness(
                          draft,
                          displayKey,
                      ),
                      paletteOptions: readPaletteOptions(draft),
                  }
                : {
                      defaultLineThickness: 10,
                      paletteOptions: [],
                  };
        },
    };
};
