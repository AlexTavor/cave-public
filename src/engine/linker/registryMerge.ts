import type { BlueprintV2 } from "./types";

type Registry = Record<string, BlueprintV2>;

const cloneRegistry = (value: Registry): Registry => ({
    ...Object.fromEntries(
        Object.entries(value).map(([id, bp]) => [id, { ...bp }]),
    ),
});

export const mergeRegistry = (
    base: Registry,
    override: Registry,
    onCollision?: (id: string) => void,
): Registry => {
    const out = cloneRegistry(base);
    for (const [id, blueprint] of Object.entries(override)) {
        if (id in out) onCollision?.(id);
        out[id] = { ...blueprint };
    }
    return out;
};
