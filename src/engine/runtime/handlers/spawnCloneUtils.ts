import { deepClone } from "../../../utils/objectUtils";

export const STATEFUL_KEYS = [
    "state",
    "physics",
    "body",
    "traits",
    "cave",
    "assignment",
    "powerSink",
    "automation",
    "run",
    "permanent",
    "thought",
    "parent",
] as const;

const STATEFUL_KEY_SET = new Set<string>(STATEFUL_KEYS);

export const cloneStatefulComponents = (
    blueprintComponents: Record<string, unknown>,
): Record<string, unknown> => {
    const cloned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(blueprintComponents)) {
        if (!STATEFUL_KEY_SET.has(key)) continue;
        cloned[key] = deepClone(value);
    }
    return cloned;
};

