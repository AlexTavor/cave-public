import { ensurePlacementAnimationDraft } from "../../blueprint/visuals/blueprintVisualsGlyphDraft";
import { createCycleProgressVisualActions } from "../../blueprint/visuals/visualsCycleProgressActions";
import { createGlyphVisualActions } from "../../blueprint/visuals/visualsGlyphActions";
import { createLightVisualActions } from "../../blueprint/visuals/visualsLightActions";
import {
    ensureGlyphAssetById,
    ensureStyleAssetById,
} from "../../view-editor/viewEditorAssetLinking";

export const createDisplayViewEditorActions = (params: {
    filename: string;
    glyphId: string | null;
    styleId: string | null;
    updateDraft: (filename: string, recipe: (draft: any) => void) => void;
}) => {
    const mutateGlyph = (recipe: (glyph: any) => void) => {
        const { glyphId } = params;
        if (!glyphId) return null;
        return params.updateDraft(params.filename, (draft) => {
            recipe(ensureGlyphAssetById(draft, glyphId));
        });
    };
    const mutateStyle = (recipe: (style: any) => void) => {
        const { styleId } = params;
        if (!styleId) return null;
        return params.updateDraft(params.filename, (draft) => {
            recipe(ensureStyleAssetById(draft, styleId));
        });
    };
    return {
        ...createCycleProgressVisualActions(mutateStyle as never),
        ...createLightVisualActions(mutateStyle as never),
        ...createGlyphVisualActions(mutateGlyph as never, (position, recipe) =>
            mutateGlyph((glyph: any) => {
                const animation = ensurePlacementAnimationDraft(
                    glyph,
                    position,
                );
                if (animation) recipe(animation);
            }),
        ),
    };
};
