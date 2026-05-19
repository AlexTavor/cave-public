import type { ModuleDisplayAsset } from "../../../state/moduleStore.assets";

export const resolveDisplayViewIds = (
    display: ModuleDisplayAsset | null | undefined,
    assetId: string,
) => {
    if (!display || display.type === "body") {
        return { glyphId: null, styleId: null };
    }
    if (display.type === "resource") {
        return {
            glyphId: display.glyphKey || assetId,
            styleId: display.styleId || assetId,
        };
    }
    return {
        glyphId: assetId,
        styleId: assetId,
    };
};
