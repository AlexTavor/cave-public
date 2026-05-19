import type Phaser from "phaser";
import type { DisplayTypePool } from "../../pooling/DisplayTypePool";
import {
    createPathCache,
    releaseEdgePulses,
    resetPathCache,
} from "./veinsModuleTypes";
import type { VeinEdgeVisualState } from "./veinsModuleTypes";

export const createEdgeState = (
    scene: Phaser.Scene,
    pool: DisplayTypePool,
    parent: Phaser.GameObjects.Container,
    intensity01: number,
    veinTextureKey: string,
): VeinEdgeVisualState => {
    const container = pool.rootPool.acquire(scene);
    const glowRope = pool.ropePool.acquire(scene);
    const baseRope = pool.ropePool.acquire(scene);
    const pulseContainer = pool.rootPool.acquire(scene);
    glowRope.setTexture(veinTextureKey);
    glowRope.setTintFill(false);
    baseRope.setTexture(veinTextureKey);
    baseRope.setTintFill(false);
    container.add([glowRope, baseRope, pulseContainer]);
    parent.add(container);
    container.setVisible(true);
    glowRope.setVisible(false);
    baseRope.setVisible(false);
    pulseContainer.setVisible(true);
    return {
        container,
        glowRope,
        baseRope,
        pulseContainer,
        revealedLenPx: 0,
        lastIntensity01: intensity01,
        pulses: [],
        spawnCarry: 0,
        nextBlobOrdinal: 0,
        wavePhaseRad: 0,
        pathCache: createPathCache(),
    };
};

export const disposeEdgeState = (
    state: VeinEdgeVisualState,
    parent: Phaser.GameObjects.Container,
    pool: DisplayTypePool,
): void => {
    resetPathCache(state.pathCache);
    releaseEdgePulses(state, pool);
    parent.remove(state.container);
    state.container.remove(state.glowRope);
    state.container.remove(state.baseRope);
    state.container.remove(state.pulseContainer);
    pool.ropePool.release(state.glowRope);
    pool.ropePool.release(state.baseRope);
    pool.rootPool.release(state.pulseContainer);
    pool.rootPool.release(state.container);
};
