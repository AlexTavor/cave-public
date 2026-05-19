export const clampFillValue = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

export const resolveFillPercent = (current: number, max: number) => {
    const safeMax = Math.max(max, 1);
    return clampFillValue((current / safeMax) * 100, 0, 100);
};

export const resolveFillHeight = (height?: string | number) =>
    typeof height === "number" ? `${height}px` : (height ?? "8px");
