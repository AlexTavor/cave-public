import type { ViewEditorAdapter } from "../../view-editor/ViewEditor.types";
import { buildViewEditorVisualSections } from "../../view-editor/buildViewEditorVisualSections";
import {
    readDefaultLineThickness,
    readPaletteOptions,
} from "../../view-editor/viewEditorAssetLinking";

export const buildBlueprintViewEditor = (params: {
    isOpen: boolean;
    close(): void;
    mergedDraft: any;
    blueprintId: string;
    styleDraft: any;
    glyphDraft: any;
    radiusDraft: any;
    selectedPosition: number;
    selectedPlacement: any;
    setSelectedPosition(position: number): void;
    actions: any;
    previewEnabled: boolean;
    displayId: string;
}): ViewEditorAdapter => ({
    isOpen: params.isOpen,
    close: params.close,
    contextLabel: "Edit View",
    ...buildViewEditorVisualSections({
        styleDraft: params.styleDraft,
        actions: params.actions,
        radiusDraft: params.radiusDraft,
    }),
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
        updateRotationDeltaMin: params.actions.updatePlacementRotationDeltaMin,
        updateRotationDeltaMax: params.actions.updatePlacementRotationDeltaMax,
        updateReverseDirection: params.actions.updatePlacementReverseDirection,
        updateDelay: params.actions.updateDelay,
        removePlacement: params.actions.removePlacement,
    },
    projectDefaults: {
        defaultLineThickness: readDefaultLineThickness(
            params.mergedDraft,
            params.displayId,
        ),
        paletteOptions: readPaletteOptions(params.mergedDraft),
        updateDefaultLineThickness: params.actions.updateDefaultLineThickness,
    },
    preview: {
        kind: "blueprint_runtime",
        draft: params.mergedDraft,
        blueprintId: params.blueprintId,
        enabled: params.previewEnabled,
    },
});
