export const hasAuthoredPosition = (blueprint: unknown): boolean => {
    const components = (
        blueprint as {
            components?: {
                spatial?: { x?: unknown; y?: unknown };
                physics?: { x?: unknown; y?: unknown };
            };
        }
    ).components;
    const spatial = components?.spatial;
    if (typeof spatial?.x === "number" && typeof spatial?.y === "number") {
        return true;
    }
    const physics = components?.physics;
    return typeof physics?.x === "number" && typeof physics?.y === "number";
};
