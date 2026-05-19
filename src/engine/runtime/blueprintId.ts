export const coerceBlueprintId = (value: unknown): string | undefined => {
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return undefined;
};
