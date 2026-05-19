import {
    resolveOrbitPolar,
    type OrbitKind,
    type OrbitPolarInput,
} from "./orbitPolar";

const resolveRadiusOffset = (
    ownerKind: OrbitKind,
    radiusOffset = 0,
    progressRatio = 0,
) => {
    if (ownerKind !== "processing") return radiusOffset;
    const progress = Math.max(0, Math.min(1, progressRatio));
    return radiusOffset * (1 - progress);
};

export const resolveOrbitRadius = (input: {
    ownerId: string;
    ownerKind: OrbitKind;
    assignedIds: string[];
    bodyId: string;
    ownerRadius: number;
    ownerBarOutsetPx?: number;
    bodyRadius: number;
    timeMs: number;
    progressRatio?: number;
}) => resolveOrbitPolar(input).radius;

export const resolveOrbitOffsets = (
    input: OrbitPolarInput & {
        ownerX: number;
        ownerY: number;
        bodyX: number;
        bodyY: number;
    },
) => {
    const polar = resolveOrbitPolar(input);
    return {
        phaseOffset:
            Math.atan2(input.bodyY - input.ownerY, input.bodyX - input.ownerX) -
            polar.angle,
        radiusOffset:
            Math.hypot(input.bodyX - input.ownerX, input.bodyY - input.ownerY) -
            polar.radius,
    };
};

export const resolveOrbitPosition = (
    input: OrbitPolarInput & {
        ownerX: number;
        ownerY: number;
        phaseOffset?: number;
        radiusOffset?: number;
    },
) => {
    const polar = resolveOrbitPolar(input);
    const angle = polar.angle + (input.phaseOffset ?? 0);
    const radius = Math.max(
        0,
        polar.radius +
            resolveRadiusOffset(
                input.ownerKind,
                input.radiusOffset,
                input.progressRatio,
            ),
    );
    return {
        x: input.ownerX + Math.cos(angle) * radius,
        y: input.ownerY + Math.sin(angle) * radius,
    };
};

export const resolveOrbitPositionAtProgress = (
    input: OrbitPolarInput & {
        ownerX: number;
        ownerY: number;
        phaseOffset?: number;
        radiusOffset?: number;
    },
) => resolveOrbitPosition(input);
