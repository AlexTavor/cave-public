import type Phaser from "phaser";
import type { DisplayTypePool } from "../../pooling/DisplayTypePool";
import type { VeinsDisplayEdge } from "../../VeinsDisplayData";
import type { PulseInstance, VeinEdgeVisualState } from "./veinsModuleTypes";
import { PULSE_ALPHA, PULSE_DIAMETER_MARGIN_PX } from "./veinsModuleTypes";
import { resolveBlobVariance } from "./veinsBlobVariance";

const resolvePulseScale = (
    imageWidth: number,
    edge: VeinsDisplayEdge,
): number => {
    return Math.max(1, edge.widthPx - PULSE_DIAMETER_MARGIN_PX) / imageWidth;
};

export const releasePulse = (
    state: VeinEdgeVisualState,
    pulse: PulseInstance,
    pool: DisplayTypePool,
): void => {
    state.pulseContainer.remove(pulse.image);
    pool.imagePool.release(pulse.image);
};

export const spawnPulse = (
    state: VeinEdgeVisualState,
    scene: Phaser.Scene,
    pool: DisplayTypePool,
    textureKey: string,
    edge: VeinsDisplayEdge,
    ordinal: number,
    distancePx: number,
): void => {
    const image = pool.imagePool.acquire(scene);
    const variance = resolveBlobVariance(edge, ordinal);
    image.setTexture(textureKey);
    const scale =
        resolvePulseScale(image.width, edge) * variance.sizeMultiplier * 3;
    image.setTint(variance.tint);
    image.setAlpha(PULSE_ALPHA);
    image.setScale(scale);
    state.pulseContainer.add(image);
    state.pulses.push({
        image,
        distancePx,
        ordinal,
        tint: variance.tint,
        scaleMultiplier: variance.sizeMultiplier,
        revealInsetPx: (image.width * scale) / 2,
    });
};
