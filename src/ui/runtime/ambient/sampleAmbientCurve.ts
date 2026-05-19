export const sampleAmbientCurve = (
    value: number,
    curve: "linear" | "inExpo" | "outExpo",
): number => {
    if (curve === "linear") return value;
    if (curve === "inExpo") return value <= 0 ? 0 : 2 ** (10 * value - 10);
    return value >= 1 ? 1 : 1 - 2 ** (-10 * value);
};
