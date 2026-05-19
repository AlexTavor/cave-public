import type { VeinGraphSource } from "./veinGraphSource";

const logCycle = (entityId: string, parentId: string) => {
    console.error(
        `[parentVeinRouting] Cycle detected while resolving ancestry for '${entityId}' at '${parentId}'.`,
    );
};

export const resolveAncestorPath = (
    source: VeinGraphSource,
    entityId: string,
): string[] => {
    const path: string[] = [];
    const seen = new Set<string>();
    let parentId = source.getParentId?.(entityId);
    while (parentId) {
        if (seen.has(parentId)) {
            logCycle(entityId, parentId);
            break;
        }
        seen.add(parentId);
        path.push(parentId);
        parentId = source.getParentId?.(parentId);
    }
    return path;
};
