const normalizeName = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const name = value.trim();
    return name && name !== "Unknown" ? name : null;
};

export const collectUsedBodyNames = (
    entities: Iterable<{ body?: { passport?: { name?: unknown } } }>,
): Set<string> => {
    const names = new Set<string>();
    for (const entity of entities) {
        const name = normalizeName(entity.body?.passport?.name);
        if (name) names.add(name);
    }
    return names;
};
