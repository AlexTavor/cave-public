const STATE_ENTRY_RUNTIME_KEYS = ["value", "visible"] as const;
const SCALE_AWARE_STATE_ENTRY_RUNTIME_KEYS = [
    ...STATE_ENTRY_RUNTIME_KEYS,
    "max",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveStateEntryRuntimeKeys = (
    ...entries: unknown[]
): ReadonlyArray<(typeof SCALE_AWARE_STATE_ENTRY_RUNTIME_KEYS)[number]> =>
    entries.some((entry) => isRecord(entry) && entry.scaleOnMaxChange === true)
        ? SCALE_AWARE_STATE_ENTRY_RUNTIME_KEYS
        : STATE_ENTRY_RUNTIME_KEYS;

export const stripDefinitionStateKeys = (value: unknown): unknown => {
    if (!isRecord(value)) return structuredClone(value);
    const state = structuredClone(value);
    for (const key of Object.keys(state)) {
        if (key.startsWith("vals_")) delete state[key];
    }
    return state;
};

export const mergeStateEntryForHydrate = (
    baseEntry: unknown,
    savedEntry: unknown,
): unknown => {
    if (!isRecord(savedEntry) || !isRecord(baseEntry))
        return structuredClone(savedEntry);
    const merged = structuredClone(baseEntry);
    const runtimeKeys = resolveStateEntryRuntimeKeys(baseEntry, savedEntry);
    for (const [key, value] of Object.entries(savedEntry)) {
        if (
            value === undefined ||
            value === null ||
            !runtimeKeys.includes(
                key as (typeof SCALE_AWARE_STATE_ENTRY_RUNTIME_KEYS)[number],
            )
        ) {
            continue;
        }
        merged[key] = structuredClone(value);
    }
    return merged;
};

export const mergeStateForHydrate = (
    baseState: unknown,
    savedState: unknown,
): Record<string, unknown> => {
    const base = isRecord(baseState) ? structuredClone(baseState) : {};
    const saved = stripDefinitionStateKeys(savedState);
    if (!isRecord(saved)) return base;
    for (const [key, value] of Object.entries(saved)) {
        base[key] = mergeStateEntryForHydrate(base[key], value);
    }
    return base;
};

const saveStateEntry = (baseEntry: unknown, currentEntry: unknown): unknown => {
    if (!isRecord(currentEntry) || !isRecord(baseEntry)) {
        return structuredClone(stripDefinitionStateKeys(currentEntry));
    }
    const current = stripDefinitionStateKeys(currentEntry) as Record<
        string,
        unknown
    >;
    const base = stripDefinitionStateKeys(baseEntry) as Record<string, unknown>;
    const saved: Record<string, unknown> = {};
    for (const key of resolveStateEntryRuntimeKeys(baseEntry, currentEntry)) {
        const value = current[key];
        if (value === undefined || value === base[key]) continue;
        saved[key] = structuredClone(value);
    }
    return Object.keys(saved).length ? saved : undefined;
};

export const saveState = (
    baseState: unknown,
    currentState: unknown,
): Record<string, unknown> => {
    const base = isRecord(baseState) ? baseState : {};
    const current = stripDefinitionStateKeys(currentState);
    if (!isRecord(current)) return {};
    const saved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(current)) {
        const entry = saveStateEntry(base[key], value);
        if (entry !== undefined) saved[key] = entry as Record<string, unknown>;
    }
    return saved;
};
