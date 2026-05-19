export interface GlyphVisualInspectorProps {
    selectedPosition: number;
    selectedPlacement: {
        enabled: boolean;
        shape: string;
        colorHex: string;
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
        };
    };
    updateShape(position: number, value: string): void;
    updateColor(position: number, value: string): void;
    updateScale(position: number, value: number): void;
    updateRotation(position: number, value: number): void;
    updateRadialPosition(position: number, value: number): void;
    updateDistanceMin(position: number, value: number): void;
    updateDistanceMax(position: number, value: number): void;
    updateScalePulseMin(position: number, value: number): void;
    updateScalePulseMax(position: number, value: number): void;
    updateRotationDeltaMin(position: number, value: number): void;
    updateRotationDeltaMax(position: number, value: number): void;
    removePlacement(position: number): void;
}
