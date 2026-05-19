import type Phaser from "phaser";
import type { DisplayTypePool } from "../../pooling/DisplayTypePool";
import type { VeinsDisplayEdge } from "../../VeinsDisplayData";
import {
    PLACEMENT_GROW_SPEED_PX_PER_SEC,
    hideEdgeRopes,
    releaseEdgePulses,
} from "./veinsModuleTypes";
import type { VeinEdgeVisualState } from "./veinsModuleTypes";
import {
    buildRopeStyleSignature,
    buildStableGeometrySignature,
} from "./veinsEdgeSignatures";
import { advanceWavePhase } from "./veinsEdgePhase";
import { tickEdgePulses } from "./veinsPulseTick";
import { compileVeinGuidePath, resolveVeinRopePoints } from "./veinsRopePath";
import { syncVeinRope } from "./veinsRopeRenderer";
import {
    advanceRevealedLenPx,
    buildPolylineMetrics,
    slicePolylineToDistance,
} from "./veinsVisualMath";

const clearVisiblePath = (state: VeinEdgeVisualState): void => {
    state.revealedLenPx = 0;
    Object.assign(state.pathCache, {
        fullPoints: [],
        fullSegmentLensPx: [],
        fullTotalLenPx: 0,
        fullPathResolvedForPhaseRad: undefined,
        visiblePoints: [],
        visiblePathResolvedForLenPx: undefined,
    });
};

export const tickEdge = (
    state: VeinEdgeVisualState,
    edge: VeinsDisplayEdge,
    simulationDeltaMs: number,
    scene: Phaser.Scene,
    pool: DisplayTypePool,
    veinTextureKey: string,
    pulseTextureKey: string,
): void => {
    const cache = state.pathCache;
    const dtSec = simulationDeltaMs / 1000;
    const phaseShiftRad = advanceWavePhase(state, edge, dtSec);
    const stableSignature = buildStableGeometrySignature(edge);
    const styleSignature = buildRopeStyleSignature(edge);
    if (cache.stableGeometrySignature !== stableSignature) {
        cache.stableGeometrySignature = stableSignature;
        cache.compiledGuidePath = compileVeinGuidePath(edge);
        clearVisiblePath(state);
        cache.ropeStyleSignature = undefined;
    }
    cache.compiledGuidePath ??= compileVeinGuidePath(edge);
    if (!cache.compiledGuidePath) {
        hideEdgeRopes(state);
        releaseEdgePulses(state, pool);
        clearVisiblePath(state);
        return;
    }
    const fullChanged =
        cache.fullPoints.length === 0 ||
        (edge.veinType === "nervous" &&
            cache.fullPathResolvedForPhaseRad !== phaseShiftRad);
    if (fullChanged) {
        cache.fullPoints = resolveVeinRopePoints(
            cache.compiledGuidePath,
            edge,
            phaseShiftRad,
        );
        const { segmentLensPx, totalLenPx } = buildPolylineMetrics(
            cache.fullPoints,
        );
        cache.fullSegmentLensPx = segmentLensPx;
        cache.fullTotalLenPx = totalLenPx;
        cache.fullPathResolvedForPhaseRad = phaseShiftRad;
        cache.visiblePoints = [];
        cache.visiblePathResolvedForLenPx = undefined;
    }
    state.revealedLenPx = advanceRevealedLenPx(
        state.revealedLenPx,
        cache.fullTotalLenPx,
        simulationDeltaMs,
        PLACEMENT_GROW_SPEED_PX_PER_SEC,
    );
    const visibleChanged =
        fullChanged ||
        cache.visiblePoints.length === 0 ||
        cache.visiblePathResolvedForLenPx !== state.revealedLenPx;
    if (visibleChanged) {
        cache.visiblePoints = slicePolylineToDistance(
            cache.fullPoints,
            cache.fullSegmentLensPx,
            state.revealedLenPx,
        );
        cache.visiblePathResolvedForLenPx = state.revealedLenPx;
    }
    if (visibleChanged || cache.ropeStyleSignature !== styleSignature) {
        syncVeinRope(state.glowRope, {
            textureKey: veinTextureKey,
            points: cache.visiblePoints,
            tint: edge.baseColor,
            alpha: edge.glowAlpha,
            displayWidthPx: edge.glowWidthEndPx,
        });
        syncVeinRope(state.baseRope, {
            textureKey: veinTextureKey,
            points: cache.visiblePoints,
            tint: edge.baseColor,
            alpha: 1,
            displayWidthPx: edge.widthPx,
        });
        cache.ropeStyleSignature = styleSignature;
    }
    state.lastIntensity01 = edge.intensity01;
    tickEdgePulses(state, edge, dtSec, scene, pool, pulseTextureKey, cache);
};
