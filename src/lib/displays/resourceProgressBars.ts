import type { DisplayPaletteKey } from "./displayKeyKinds";
import type { ResourceProgressBarPosition } from "./resourceProgressBarSlots";
import { DEFAULT_RESOURCE_PROGRESS_BAR_SPAN_RATIO } from "./resourceProgressBarSlots";

export type ResourceProgressBar = {
    key?: string;
    max?: number;
    maxKey?: string;
    color?: string;
    label?: string;
    position?: ResourceProgressBarPosition;
    paletteColorKey?: DisplayPaletteKey;
    spanRatio?: number;
};

const STORAGE_KEYS = ["allowDeposit", "allowWithdraw", "priority"] as const;
const BAR_RESOURCE_RE = /^state\.([^.]+)(?:\.(?:value|max))?$/;

const normalizePath = (path: string) =>
    path.startsWith("self.") ? path.slice(5) : path;

const readNumericPath = (entity: Record<string, unknown>, path?: string) => {
    if (!path) return null;
    let current: any = entity;
    for (const part of normalizePath(path).split(".")) {
        if (current == null) return null;
        current = current[part];
    }
    if (typeof current === "number" && Number.isFinite(current)) return current;
    return Number.isFinite(current?.value) ? current.value : null;
};

const normalizeSpanRatio = (spanRatio?: number) => {
    if (!Number.isFinite(spanRatio))
        return DEFAULT_RESOURCE_PROGRESS_BAR_SPAN_RATIO;
    return Math.max(0.0001, Math.min(1, spanRatio ?? 1));
};

export const readResourceProgressBars = (
    display: unknown,
): ResourceProgressBar[] => {
    const bars =
        display && typeof display === "object"
            ? (display as { bars?: ResourceProgressBar[] }).bars
            : null;
    return Array.isArray(bars) ? bars : [];
};

export const resolveResourceProgressBarResourceId = (path: string) =>
    BAR_RESOURCE_RE.exec(normalizePath(path))?.[1] ?? null;

export const resolveResourceProgressBarValuePath = (path: string) => {
    const normalized = normalizePath(path);
    return normalized.startsWith("state.") ? `${normalized}.value` : normalized;
};

export const isStorageLikeStateEntry = (
    entry: unknown,
): entry is Record<string, unknown> =>
    !!entry &&
    typeof entry === "object" &&
    STORAGE_KEYS.some((key) => Object.hasOwn(entry, key));

export const resolveResourceProgressBarLiveRange = (
    entity: Record<string, unknown>,
    bar: ResourceProgressBar,
) => {
    if (typeof bar.key !== "string") return null;
    const resourceId = resolveResourceProgressBarResourceId(bar.key);
    if (!resourceId) return null;
    const max =
        typeof bar.max === "number"
            ? bar.max
            : readNumericPath(entity, bar.maxKey);
    if (!Number.isFinite(max) || (max ?? 0) <= 0) return null;
    const current = readNumericPath(
        entity,
        resolveResourceProgressBarValuePath(bar.key),
    );
    return {
        resourceId,
        current: Number.isFinite(current) ? Math.max(0, current ?? 0) : 0,
        max,
        position: bar.position,
        spanRatio: normalizeSpanRatio(bar.spanRatio),
    };
};
