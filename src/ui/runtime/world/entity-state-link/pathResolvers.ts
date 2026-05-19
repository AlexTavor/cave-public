import { ROOT_KEYS, type PathResolver } from "./types";

export const createPathResolver = (path: string): PathResolver => {
    const segments = path.split(".").filter(Boolean);
    const hasRoot = segments.length > 0 && ROOT_KEYS.has(segments[0]);

    return (entity) => {
        let current: any = hasRoot ? entity : (entity as any)?.state;

        for (const segment of segments) {
            if (current === undefined || current === null) return undefined;
            current = current[segment];
        }

        return current;
    };
};

export const resolveNumericValue = (candidate: unknown): number | null => {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return candidate;
    }

    if (candidate && typeof candidate === "object") {
        const value = (candidate as { value?: unknown }).value;
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
    }

    return null;
};
