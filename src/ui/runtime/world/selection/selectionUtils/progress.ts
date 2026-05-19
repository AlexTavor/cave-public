import type { RuntimeEntity } from "../../../../../engine/runtime/types";

const resolveStateValue = (entity: RuntimeEntity, path: string): number => {
    const cleanPath = path.startsWith("self.") ? path.slice(5) : path;
    const parts = cleanPath.split(".");

    let current: any = entity;
    for (const part of parts) {
        if (current === null || current === undefined) return 0;
        current = current[part];
    }

    if (
        current &&
        typeof current === "object" &&
        typeof current.value === "number"
    ) {
        return current.value;
    }

    return typeof current === "number" ? current : 0;
};

export const resolveProgressThreshold = (entity: RuntimeEntity): number => {
    const display = (entity as { display?: { bars?: any[] } }).display;
    const bars = Array.isArray(display?.bars) ? display?.bars : [];
    const bar = bars.find(
        (candidate) =>
            candidate?.key === "state.progress" ||
            candidate?.key === "progress",
    );

    if (!bar) return 0;

    if (typeof bar.max === "number") return bar.max;
    if (typeof bar.maxKey === "string") {
        return resolveStateValue(entity, bar.maxKey);
    }
    return 0;
};
