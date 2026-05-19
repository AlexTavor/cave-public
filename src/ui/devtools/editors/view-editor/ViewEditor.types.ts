import type { ModuleCartridge } from "../../../../data/schemas/module";
import type {
    DisplayPaletteKey,
    DisplayPaletteOption,
} from "../../../../lib/displays/displayKeyKinds";

export interface ViewEditorSelectedPlacement {
    enabled: boolean;
    shape: string;
    colorHex: string;
    paletteColorKey?: DisplayPaletteKey;
    lineThickness?: number;
    scale: number;
    rotationDeg: number;
    radialPositionFactor: number;
    animation: {
        distanceFromCenterMinFactor: number;
        distanceFromCenterMaxFactor: number;
        scalePulseMin: number;
        scalePulseMax: number;
        rotationDeltaMinDeg: number;
        rotationDeltaMaxDeg: number;
        reverseDirection?: boolean;
    };
}

export interface ViewEditorAdapter {
    isOpen: boolean;
    close(): void;
    contextLabel: string;
    cycleProgress: null | {
        family: string;
        familyRotationDeg: number;
        color: string;
        previewProgress?: number;
        updateFamily(value: string): void;
        updateFamilyRotation(value: number): void;
        updateColor(value: string): void;
        updatePreviewProgress?(value: number): void;
    };
    light: {
        enabled: boolean;
        color: string;
        alpha: number;
        radiusFactor: number;
        blendMode: "NORMAL" | "ADD";
        updateEnabled(value: boolean): void;
        updateColor(value: string): void;
        updateAlpha(value: number): void;
        updateRadiusFactor(value: number): void;
        updateBlendMode(value: "NORMAL" | "ADD"): void;
    };
    transferNodeRadius: null | {
        min: number;
        max: number;
        updateMin(value: number): void;
        updateMax(value: number): void;
    };
    glyph: {
        placements: Array<{ position: number }>;
        delays: number[];
        selectedPosition: number;
        selectedPlacement: ViewEditorSelectedPlacement;
        selectPosition(position: number): void;
        togglePlacement(position: number): void;
        updateShape(position: number, value: string): void;
        updateColor(position: number, value: string): void;
        updatePaletteColor(
            position: number,
            value: DisplayPaletteKey | "",
        ): void;
        updateLineThickness(position: number, value: number | null): void;
        updateScale(position: number, value: number): void;
        updateRotation(position: number, value: number): void;
        updateRadialPosition(position: number, value: number): void;
        updateDistanceMin(position: number, value: number): void;
        updateDistanceMax(position: number, value: number): void;
        updateScalePulseMin(position: number, value: number): void;
        updateScalePulseMax(position: number, value: number): void;
        updateRotationDeltaMin(position: number, value: number): void;
        updateRotationDeltaMax(position: number, value: number): void;
        updateReverseDirection(position: number, value: boolean): void;
        updateDelay(position: number, value: number): void;
        removePlacement(position: number): void;
    };
    projectDefaults: {
        defaultLineThickness: number;
        paletteOptions: DisplayPaletteOption[];
        updateDefaultLineThickness(value: number): void;
    };
    preview:
        | {
              kind: "blueprint_runtime";
              draft: ModuleCartridge;
              blueprintId: string;
              enabled: boolean;
          }
        | { kind: "display_icon"; filename: string; displayKey: string };
}
