import type { ModuleCartridge } from "../../../../../data/schemas/module";
import {
    ensurePlacementAnimationDraft,
    ensureWorldPresenceDraft,
    resolveDisplayId,
} from "./blueprintVisualsDraft";
import { ensureResourceViewAssets } from "../../view-editor/viewEditorAssetLinking";
import { withPlacement } from "./blueprintVisualsActionUtils";
import { createLinkedAssetMutators } from "./blueprintVisualsLinkedMutations";
import { createCycleProgressVisualActions } from "./visualsCycleProgressActions";
import { createGlyphVisualActions } from "./visualsGlyphActions";
import { createLightVisualActions } from "./visualsLightActions";
import { createRadiusVisualActions } from "./visualsRadiusActions";

export const createBlueprintVisualsEditorActions = (params: {
    blueprintFilename: string;
    assetFilename: string;
    blueprintId: string;
    getBlueprintDraft: () => ModuleCartridge | null;
    updateDraft: (
        filename: string,
        recipe: (draft: ModuleCartridge) => void,
    ) => void;
}) => {
    const { blueprintFilename, blueprintId, updateDraft, assetFilename } =
        params;
    const { mutateStyle, mutateGlyph } = createLinkedAssetMutators(params);
    const mutatePresence = (
        recipe: (
            presence: NonNullable<ReturnType<typeof ensureWorldPresenceDraft>>,
        ) => void,
    ) =>
        updateDraft(blueprintFilename, (draft) => {
            const presence = ensureWorldPresenceDraft(draft, blueprintId);
            if (presence) recipe(presence);
        });
    const mutateAnimation = (
        position: number,
        recipe: (
            animation: NonNullable<
                ReturnType<typeof ensurePlacementAnimationDraft>
            >,
        ) => void,
    ) =>
        mutateGlyph((glyph) => {
            withPlacement(glyph, position);
            const animation = ensurePlacementAnimationDraft(glyph, position);
            if (animation) recipe(animation);
        });

    return {
        ...createCycleProgressVisualActions(mutateStyle),
        ...createLightVisualActions(mutateStyle),
        ...createRadiusVisualActions(mutatePresence),
        ...createGlyphVisualActions(mutateGlyph, mutateAnimation),
        updateDefaultLineThickness: (value: number) =>
            updateDraft(assetFilename, (draft) => {
                const blueprintDraft = params.getBlueprintDraft();
                const displayId = blueprintDraft
                    ? resolveDisplayId(blueprintDraft, blueprintId)
                    : blueprintId;
                const display = ensureResourceViewAssets(draft, displayId);
                display.defaultLineThickness = Math.max(1, value);
            }),
    };
};
