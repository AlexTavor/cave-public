import { clamp } from "./blueprintVisualsActionUtils";

const defaultLight = (style: any) => ({
    color: style.cycleProgress?.color ?? "#ffffff",
    alpha: 0.5,
    radiusFactor: 1.5,
    blendMode: "ADD",
});

const ensureLight = (style: any) => (style.light ??= defaultLight(style));

export const createLightVisualActions = (
    mutateStyle: (recipe: (style: any) => void) => void,
) => ({
    updateLightEnabled: (value: boolean) =>
        mutateStyle((style) => {
            if (value) ensureLight(style);
            else delete style.light;
        }),
    updateLightColor: (value: string) =>
        mutateStyle((style) => {
            ensureLight(style).color = value;
        }),
    updateLightAlpha: (value: number) =>
        mutateStyle((style) => {
            ensureLight(style).alpha = clamp(value, 0, 1);
        }),
    updateLightRadiusFactor: (value: number) =>
        mutateStyle((style) => {
            ensureLight(style).radiusFactor = Math.max(0.01, value);
        }),
    updateLightBlendMode: (value: "NORMAL" | "ADD") =>
        mutateStyle((style) => {
            ensureLight(style).blendMode = value;
        }),
});
