const splitPath = (path: string) => path.split(".").filter(Boolean);

export const getJsonAtPath = (data: unknown, path?: string): unknown => {
    if (!path) return data ?? {};
    let current = data as Record<string, unknown> | undefined;
    for (const key of splitPath(path)) {
        if (!current || typeof current !== "object") return {};
        current = current[key] as Record<string, unknown> | undefined;
    }
    return current ?? {};
};

export const setJsonAtPath = (
    data: unknown,
    path: string | undefined,
    value: unknown,
): unknown => {
    if (!path) return value;
    const keys = splitPath(path);
    const root = data && typeof data === "object" ? { ...data } : {};
    let current = root as Record<string, unknown>;
    for (const key of keys.slice(0, -1)) {
        const next = current[key];
        current[key] = next && typeof next === "object" ? { ...next } : {};
        current = current[key] as Record<string, unknown>;
    }
    current[keys.at(-1) ?? ""] = value;
    return root;
};
