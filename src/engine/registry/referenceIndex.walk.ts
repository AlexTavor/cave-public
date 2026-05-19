import type { BlueprintId, BrokenReference, IncomingReference } from "./types";

const ENTITY_ID_PATTERN = /\bentity_[a-z0-9]+\b/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date)
    );
}

function pushIncoming(
    incomingByTarget: Record<BlueprintId, IncomingReference[]>,
    entry: IncomingReference,
) {
    if (!incomingByTarget[entry.targetId]) {
        incomingByTarget[entry.targetId] = [];
    }
    incomingByTarget[entry.targetId].push(entry);
}

export const walkReferences = (params: {
    existingIds: Set<string>;
    incomingByTarget: Record<BlueprintId, IncomingReference[]>;
    broken: BrokenReference[];
    fromId: string;
    fromLabel: string;
    node: unknown;
    path: string;
}) => {
    const { existingIds, incomingByTarget, broken, fromId, fromLabel } = params;

    const walk = (node: unknown, path: string) => {
        if (typeof node === "string") {
            const value = node;

            if (value === fromId && path.endsWith(".id")) return;

            if (existingIds.has(value)) {
                pushIncoming(incomingByTarget, {
                    targetId: value,
                    fromId,
                    fromLabel,
                    path,
                    value,
                });
                return;
            }

            if (ENTITY_ID_PATTERN.test(value)) {
                broken.push({
                    missingId: value,
                    fromId,
                    fromLabel,
                    path,
                    value,
                });
            }
            return;
        }

        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                walk(node[i], `${path}[${i}]`);
            }
            return;
        }

        if (isPlainObject(node)) {
            for (const [key, value] of Object.entries(node)) {
                walk(value, `${path}.${key}`);
            }
        }
    };

    walk(params.node, params.path);
};
