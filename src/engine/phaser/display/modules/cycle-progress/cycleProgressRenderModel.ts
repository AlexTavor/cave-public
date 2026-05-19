import type { EntityStyle } from "../../../../../data/schemas/assets/styles";

export type CycleProgressPoint = { x: number; y: number };

export type CycleProgressRopeRequest = {
    textureKey: string;
    points: CycleProgressPoint[];
    tint: number;
    alpha: number;
    displayWidthPx: number;
};

export type ResolvedCycleProgressVisual = {
    ropeRequest: CycleProgressRopeRequest | null;
    ropeSignature: string | null;
};

export type CycleProgressResolverParams = {
    entity: Record<string, unknown>;
    entityId: string;
    radius: number;
    timeMs: number;
    pulseValue: number;
    style: EntityStyle | null | undefined;
    solidStripTextureKey: string;
};
