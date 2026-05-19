type StateEntry = {
    value?: number | string | boolean;
    min?: number;
    max?: number;
    scaleOnMaxChange?: boolean;
    preserveValueOnMaxDecrease?: boolean;
};

const resolveFloor = (min: number | undefined, max: number | undefined) => {
    if (typeof min === "number") return min;
    return typeof max === "number" ? 0 : undefined;
};

export const clampNumeric = (
    raw: number,
    min: number | undefined,
    max: number | undefined,
) => {
    const floor = resolveFloor(min, max);
    let value = typeof floor === "number" ? Math.max(floor, raw) : raw;
    if (typeof max === "number") value = Math.min(max, value);
    return value;
};

export const applyMaxChange = (entry: StateEntry, newMax: number): void => {
    const oldMax = entry.max;
    entry.max = newMax;
    if (typeof entry.value !== "number") return;
    if (typeof oldMax !== "number" || newMax >= oldMax) return;
    const shouldScale =
        entry.scaleOnMaxChange && oldMax > 0 && entry.value > newMax;
    if (shouldScale) {
        entry.value = entry.value * (newMax / oldMax);
        return;
    }
    if (entry.preserveValueOnMaxDecrease === true) return;
    entry.value = Math.min(entry.value, newMax);
};
