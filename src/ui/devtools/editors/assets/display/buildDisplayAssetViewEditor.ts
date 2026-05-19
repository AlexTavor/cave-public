import type { ViewEditorAdapter } from "../../view-editor/ViewEditor.types";
import { buildViewEditorVisualSections } from "../../view-editor/buildViewEditorVisualSections";
import {
    readDefaultLineThickness,
    readPaletteOptions,
} from "../../view-editor/viewEditorAssetLinking";

export const buildDisplayAssetViewEditor = (params: {
    isOpen: boolean;
    close(): void;
    draft: any;
    styleDraft: any;
    glyphDraft: any;
    selectedPosition: number;
    selectedPlacement: any;
    setSelectedPosition(position: number): void;
    previewProgress: number;
    setPreviewProgress(value: number): void;
    actions: any;
    updateDefaultLineThickness(value: number): void;
    filename: string;
    assetId: string;
}): ViewEditorAdapter => {
    const visuals = buildViewEditorVisualSections({
        styleDraft: params.styleDraft,
        actions: params.actions,
    });
    return {
        isOpen: params.isOpen,
        close: params.close,
        contextLabel: "Edit View",
        ...visuals,
        cycleProgress: visuals.cycleProgress
            ? {
                  ...visuals.cycleProgress,
                  previewProgress: params.previewProgress,
                  updatePreviewProgress: params.setPreviewProgress,
              }
            : null,
        glyph: {
            placements: params.glyphDraft.placements,
            delays: params.glyphDraft.pulse.delayMsByPosition,
            selectedPosition: params.selectedPosition,
            selectedPlacement: params.selectedPlacement,
            selectPosition: params.setSelectedPosition,
            togglePlacement: params.actions.togglePlacement,
            updateShape: params.actions.updatePlacementShape,
            updateColor: params.actions.updatePlacementColor,
            updatePaletteColor: params.actions.updatePlacementPaletteColor,
            updateLineThickness: params.actions.updatePlacementLineThickness,
            updateScale: params.actions.updatePlacementScale,
            updateRotation: params.actions.updatePlacementRotation,
            updateRadialPosition: params.actions.updatePlacementRadialPosition,
            updateDistanceMin: params.actions.updatePlacementDistanceMin,
            updateDistanceMax: params.actions.updatePlacementDistanceMax,
            updateScalePulseMin: params.actions.updatePlacementScalePulseMin,
            updateScalePulseMax: params.actions.updatePlacementScalePulseMax,
            updateRotationDeltaMin:
                params.actions.updatePlacementRotationDeltaMin,
            updateRotationDeltaMax:
                params.actions.updatePlacementRotationDeltaMax,
            updateReverseDirection:
                params.actions.updatePlacementReverseDirection,
            updateDelay: params.actions.updateDelay,
            removePlacement: params.actions.removePlacement,
        },
        projectDefaults: {
            defaultLineThickness: readDefaultLineThickness(
                params.draft,
                params.assetId,
            ),
            paletteOptions: readPaletteOptions(params.draft),
            updateDefaultLineThickness: params.updateDefaultLineThickness,
        },
        preview: {
            kind: "display_icon",
            filename: params.filename,
            displayKey: params.assetId,
        },
    };
};
