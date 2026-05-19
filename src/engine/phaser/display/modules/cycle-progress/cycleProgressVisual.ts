import { computeCycleProgressRopeGeometry } from "./cycleProgressGeometry";
import { resolveCycleProgressPath } from "./cycleProgressPath";
import { readCycleProgress } from "./cycleProgressReader";
import type {
    CycleProgressResolverParams,
    ResolvedCycleProgressVisual,
} from "./cycleProgressRenderModel";
import {
    buildCycleProgressKey,
    toCycleProgressColor,
} from "./cycleProgressVisualKey";

export const resolveCycleProgressVisual = (
    params: CycleProgressResolverParams,
): ResolvedCycleProgressVisual => {
    const cycleProgress = params.style?.cycleProgress;
    if (!cycleProgress || cycleProgress.family === "none") {
        return { ropeRequest: null, ropeSignature: null };
    }
    const cycle = readCycleProgress(params.entity);
    if (cycle.kind === "invalid") {
        console.error(
            `[CycleProgressModule] Invalid cycle state for ${params.entityId}`,
        );
        return { ropeRequest: null, ropeSignature: null };
    }
    const fraction =
        cycle.kind === "absent"
            ? 1
            : Math.max(0, Math.min(1, cycle.value / cycle.max));
    const geometry = computeCycleProgressRopeGeometry({
        entityId: params.entityId,
        radius: params.radius,
        timeMs: params.timeMs,
        pulseValue: params.pulseValue,
        family: cycleProgress.family,
        familyRotationDeg: cycleProgress.familyRotationDeg,
    });
    const points = resolveCycleProgressPath(geometry.points, fraction);
    if (points.length < 2) return { ropeRequest: null, ropeSignature: null };
    const payload = {
        entityId: params.entityId,
        radius: params.radius,
        timeMs: params.timeMs,
        pulseValue: params.pulseValue,
        cycleProgress,
        fraction,
    };
    return {
        ropeRequest: {
            textureKey: params.solidStripTextureKey,
            points,
            tint: toCycleProgressColor(cycleProgress.color),
            alpha: 1,
            displayWidthPx: geometry.displayWidthPx,
        },
        ropeSignature: buildCycleProgressKey("cycle-progress", payload),
    };
};
