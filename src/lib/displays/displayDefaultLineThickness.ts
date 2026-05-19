type ModuleLike = {
    assets?: {
        displays?: Record<string, { defaultLineThickness?: unknown }>;
        settings?: {
            glyph_view?: { defaultLineThickness?: unknown };
        };
    };
};

export const readLegacyDefaultLineThickness = (moduleData: ModuleLike) => {
    const value = moduleData.assets?.settings?.glyph_view?.defaultLineThickness;
    return typeof value === "number" && value > 0 ? value : 10;
};

export const readDisplayDefaultLineThickness = (
    moduleData: ModuleLike,
    displayKey: string,
) => {
    const value =
        moduleData.assets?.displays?.[displayKey]?.defaultLineThickness;
    return typeof value === "number" && value > 0
        ? value
        : readLegacyDefaultLineThickness(moduleData);
};
