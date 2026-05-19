import type Phaser from "phaser";
import type { DisplayTypePool } from "../../pooling/DisplayTypePool";
import type { VeinsDisplayEdge } from "../../VeinsDisplayData";
import { resolveBlobVariance } from "./veinsBlobVariance";
import { releasePulse, spawnPulse } from "./veinsPulseLifecycle";
import { samplePolylineAtDistance } from "./veinsVisualMath";
import type {
    VeinEdgePathCache,
    VeinEdgeVisualState,
} from "./veinsModuleTypes";

const readSourceGapPx = (state: VeinEdgeVisualState): number =>
    state.pulses.reduce(
        (min, pulse) => Math.min(min, pulse.distancePx),
        state.revealedLenPx,
    );

const syncPulse = (
    state: VeinEdgeVisualState,
    pulse: VeinEdgeVisualState["pulses"][number],
    pathCache: VeinEdgePathCache,
) => {
    const pos = samplePolylineAtDistance(
        pathCache.fullPoints,
        pathCache.fullSegmentLensPx,
        pulse.distancePx,
    );
    pulse.image.setPosition(pos.x, pos.y);
    pulse.image.setVisible(
        pulse.distancePx <= state.revealedLenPx - pulse.revealInsetPx,
    );
};

export const tickEdgePulses = (
    state: VeinEdgeVisualState,
    edge: VeinsDisplayEdge,
    dtSec: number,
    scene: Phaser.Scene,
    pool: DisplayTypePool,
    textureKey: string,
    pathCache: VeinEdgePathCache,
): void => {
    for (let i = state.pulses.length - 1; i >= 0; i--) {
        const pulse = state.pulses[i];
        pulse.distancePx += dtSec * edge.blobSpeedPxPerSec;
        if (pulse.distancePx > state.revealedLenPx) {
            releasePulse(state, pulse, pool);
            state.pulses.splice(i, 1);
            continue;
        }
        syncPulse(state, pulse, pathCache);
    }
    state.spawnCarry += edge.blobSpawnRateHz * dtSec;
    let batchOffsetPx = 0;
    let remainingGapPx = readSourceGapPx(state);
    while (state.spawnCarry >= 1) {
        const spacingPx =
            edge.minBlobSpacingPx *
            resolveBlobVariance(edge, state.nextBlobOrdinal).spacingMultiplier;
        const requiredGapPx =
            state.pulses.length || batchOffsetPx ? spacingPx : 0;
        if (remainingGapPx < requiredGapPx) break;
        spawnPulse(
            state,
            scene,
            pool,
            textureKey,
            edge,
            state.nextBlobOrdinal,
            batchOffsetPx,
        );
        const pulse = state.pulses.at(-1);
        if (!pulse) continue;
        syncPulse(state, pulse, pathCache);
        state.spawnCarry -= 1;
        state.nextBlobOrdinal += 1;
        batchOffsetPx += spacingPx;
        remainingGapPx -= spacingPx;
    }
};
