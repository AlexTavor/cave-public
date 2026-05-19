import { PHYSICS_DEFAULT_RADIUS } from "../../../data/schemas/physics";
import type { RuntimeEntity } from "../../runtime/types";

export interface DisplayRadiusConfig {
    min?: number;
    max?: number;
    valueRef?: string;
    maxRef?: string;
}

export interface DisplayRadiusHost {
    radius?: DisplayRadiusConfig;
}

export interface PhysicsRadiusHost {
    radius: number;
}

export const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

export const resolveEntityPath = (
    entity: RuntimeEntity,
    path: string,
): number => {
    if (!path) return 0;
    const segments = path.split(".");
    let current: any = entity;

    for (const segment of segments) {
        if (current == null) return 0;
        current = current[segment];
    }

    if (typeof current === "number" && Number.isFinite(current)) return current;
    if (typeof current === "boolean") return current ? 1 : 0;

    if (current && typeof current === "object") {
        const value = (current as { value?: unknown }).value;
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
    }

    return 0;
};

export const resolveRefValue = (
    entity: RuntimeEntity,
    ref?: string,
): number => {
    if (!ref) return 0;
    const normalized = ref.trim();
    if (!normalized) return 0;
    if (normalized.startsWith("self.")) {
        return resolveEntityPath(entity, normalized.slice("self.".length));
    }
    return resolveEntityPath(entity, normalized);
};

export const resolveDisplayRadius = (
    entity: RuntimeEntity,
    display: DisplayRadiusHost | null,
    physics: PhysicsRadiusHost | null,
): { baseRadius: number; radius: number } => {
    const min =
        display?.radius?.min ?? physics?.radius ?? PHYSICS_DEFAULT_RADIUS;
    const max = display?.radius?.max ?? min;

    let ratio = 1;
    if (display?.radius?.valueRef) {
        const value = resolveRefValue(entity, display.radius.valueRef);
        if (display.radius.maxRef) {
            const maxValue = resolveRefValue(entity, display.radius.maxRef);
            ratio = maxValue > 0 ? value / maxValue : 0;
        } else {
            ratio = value;
        }
    }

    const clamped = clamp(ratio, 0, 1);
    const radius = min + (max - min) * clamped;

    return {
        baseRadius: min,
        radius,
    };
};

export const sumPayload = (
    payload: Record<string, number> | undefined,
): number => {
    if (!payload) return 0;
    return Object.values(payload).reduce(
        (total, value) => total + (Number.isFinite(value) ? value : 0),
        0,
    );
};

export const computeTransferScale = (
    baseRadius: number,
    payload: Record<string, number> | undefined,
): { radius: number; scale: number } => {
    const total = Math.max(0, sumPayload(payload));
    const growth = Math.log10(total + 1);
    const radius = baseRadius * (1 + growth);
    const scale = baseRadius > 0 ? radius / baseRadius : 1;
    return { radius, scale };
};

export const isRadiusVisible = (radius: number): boolean => radius > 0.5;
