const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

const clone = <T>(value: T): T => {
    if (Array.isArray(value)) return value.map(clone) as T;
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, clone(item)]),
    ) as T;
};

export const deepMergeObjects = <T>(base: T, override: unknown): T => {
    if (override === undefined) return clone(base);
    if (override === null) return null as T;
    if (Array.isArray(override)) return clone(override) as T;
    if (!isPlainObject(override)) return override as T;
    if (!isPlainObject(base)) return clone(override) as T;

    const out: Record<string, unknown> = clone(base);
    for (const [key, value] of Object.entries(override)) {
        if (value === undefined) continue;
        out[key] = deepMergeObjects(out[key], value);
    }
    return out as T;
};
