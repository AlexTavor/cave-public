export const normalizeBpInput = (input: unknown): unknown => {
    if (!input || typeof input !== "object") return input;
    const raw = input as Record<string, unknown>;
    const wrapped = raw.blueprints;
    if (wrapped && typeof wrapped === "object") {
        if (typeof raw.id !== "string") return wrapped;
        const { blueprints: _ignored, ...base } = raw;
        const entries = Object.entries(wrapped as Record<string, unknown>);
        const nested =
            entries.find(([key]) => key === raw.id)?.[1] ?? entries[0]?.[1];
        return {
            [raw.id]: {
                ...(nested && typeof nested === "object"
                    ? (nested as Record<string, unknown>)
                    : {}),
                ...base,
            },
        };
    }
    if (typeof raw.id === "string") return { [raw.id]: raw };
    const nested = Object.values(raw)[0];
    if (!nested || typeof nested !== "object" || Object.keys(raw).length !== 1) {
        return input;
    }
    const nestedRaw = nested as Record<string, unknown>;
    if (typeof nestedRaw.id === "string") return { [nestedRaw.id]: nestedRaw };
    return nestedRaw.blueprints && typeof nestedRaw.blueprints === "object"
        ? nestedRaw.blueprints
        : input;
};