import type Phaser from "phaser";
import type { DisplayTypePool } from "../../pooling/DisplayTypePool";

export type VeinPoint = { x: number; y: number };

export type CompiledVeinGuidePath = {
    guidePath: VeinPoint[];
    segmentLensPx: number[];
    pathLengthPx: number;
    distances: number[];
    simplex: (x: number, y: number) => number;
};

export type VeinEdgePathCache = {
    stableGeometrySignature?: string;
    compiledGuidePath: CompiledVeinGuidePath | null;
    fullPoints: VeinPoint[];
    fullSegmentLensPx: number[];
    fullTotalLenPx: number;
    fullPathResolvedForPhaseRad?: number;
    visiblePoints: VeinPoint[];
    visiblePathResolvedForLenPx?: number;
    ropeStyleSignature?: string;
};

export type PulseInstance = {
    image: Phaser.GameObjects.Image;
    distancePx: number;
    ordinal: number;
    tint: number;
    scaleMultiplier: number;
    revealInsetPx: number;
};

export type VeinEdgeVisualState = {
    container: Phaser.GameObjects.Container;
    glowRope: Phaser.GameObjects.Rope;
    baseRope: Phaser.GameObjects.Rope;
    pulseContainer: Phaser.GameObjects.Container;
    revealedLenPx: number;
    lastIntensity01: number;
    pulses: PulseInstance[];
    spawnCarry: number;
    nextBlobOrdinal: number;
    wavePhaseRad: number;
    pathCache: VeinEdgePathCache;
};

export const PLACEMENT_GROW_SPEED_PX_PER_SEC = 600;
export const BASE_STROKE_ALPHA = 1;
export const PULSE_ALPHA = 0.8;
export const PULSE_DIAMETER_MARGIN_PX = 2;

export const createPathCache = (): VeinEdgePathCache => ({
    compiledGuidePath: null,
    fullPoints: [],
    fullSegmentLensPx: [],
    fullTotalLenPx: 0,
    visiblePoints: [],
});

export const resetPathCache = (pathCache: VeinEdgePathCache): void => {
    Object.assign(pathCache, {
        stableGeometrySignature: undefined,
        compiledGuidePath: null,
        fullPoints: [],
        fullSegmentLensPx: [],
        fullTotalLenPx: 0,
        fullPathResolvedForPhaseRad: undefined,
        visiblePoints: [],
        visiblePathResolvedForLenPx: undefined,
        ropeStyleSignature: undefined,
    });
};

export const releaseEdgePulses = (
    state: VeinEdgeVisualState,
    pool: DisplayTypePool,
): void => {
    for (const pulse of state.pulses) {
        state.pulseContainer.remove(pulse.image);
        pool.imagePool.release(pulse.image);
    }
    state.pulses.length = 0;
};

export const hideEdgeRopes = (state: VeinEdgeVisualState): void => {
    state.glowRope.setVisible(false);
    state.baseRope.setVisible(false);
};
