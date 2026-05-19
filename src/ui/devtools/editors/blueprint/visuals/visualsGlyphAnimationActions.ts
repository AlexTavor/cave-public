import { delayValue, setMax, setMin } from "./blueprintVisualsActionUtils";

export const createGlyphAnimationActions = (
    mutateGlyph: (recipe: (glyph: any) => void) => void,
    mutateAnimation: (
        position: number,
        recipe: (animation: any) => void,
    ) => void,
) => ({
    updatePlacementDistanceMin: (position: number, value: number) =>
        mutateAnimation(position, (animation) => {
            animation.distanceFromCenterMinFactor = setMin(
                value,
                animation.distanceFromCenterMaxFactor,
                0.01,
            );
        }),
    updatePlacementDistanceMax: (position: number, value: number) =>
        mutateAnimation(position, (animation) => {
            animation.distanceFromCenterMaxFactor = setMax(
                value,
                animation.distanceFromCenterMinFactor,
                0.01,
            );
        }),
    updatePlacementScalePulseMin: (position: number, value: number) =>
        mutateAnimation(position, (animation) => {
            animation.scalePulseMin = setMin(
                value,
                animation.scalePulseMax,
                0.01,
            );
        }),
    updatePlacementScalePulseMax: (position: number, value: number) =>
        mutateAnimation(position, (animation) => {
            animation.scalePulseMax = setMax(
                value,
                animation.scalePulseMin,
                0.01,
            );
        }),
    updatePlacementRotationDeltaMin: (position: number, value: number) =>
        mutateAnimation(position, (animation) => {
            animation.rotationDeltaMinDeg = setMin(
                value,
                animation.rotationDeltaMaxDeg,
                1,
            );
        }),
    updatePlacementRotationDeltaMax: (position: number, value: number) =>
        mutateAnimation(position, (animation) => {
            animation.rotationDeltaMaxDeg = setMax(
                value,
                animation.rotationDeltaMinDeg,
                1,
            );
        }),
    updatePlacementReverseDirection: (position: number, value: boolean) =>
        mutateAnimation(position, (animation) => {
            animation.reverseDirection = value;
        }),
    removePlacement: (position: number) =>
        mutateGlyph((glyph) => {
            glyph.placements = glyph.placements.filter(
                (item: any) => item.position !== position,
            );
        }),
    updateDelay: (position: number, value: number) =>
        mutateGlyph((glyph) => {
            glyph.pulse.delayMsByPosition[position] = delayValue(value);
        }),
});
