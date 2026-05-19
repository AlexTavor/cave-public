import { clamp } from "./blueprintVisualsActionUtils";

const ensureCycleProgress = (style: any) =>
    (style.cycleProgress ??= {
        family: "circle",
        familyRotationDeg: 0,
        color: "#ffffff",
    });

export const createCycleProgressVisualActions = (
    mutateStyle: (recipe: (style: any) => void) => void,
) => ({
    updateCycleProgressFamily: (value: string) =>
        mutateStyle((style) => {
            ensureCycleProgress(style).family = value;
        }),
    updateCycleProgressFamilyRotation: (value: number) =>
        mutateStyle((style) => {
            ensureCycleProgress(style).familyRotationDeg = clamp(value, 0, 360);
        }),
    updateCycleProgressColor: (value: string) =>
        mutateStyle((style) => {
            ensureCycleProgress(style).color = value;
        }),
});
