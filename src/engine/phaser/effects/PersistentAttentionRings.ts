import type Phaser from "phaser";
import { LayerId } from "../display/layers/LayerIds";
import type { LayerRegistry } from "../display/layers/LayerRegistry";
import type { DisplayPoolRegistry } from "../display/pooling/DisplayPoolRegistry";
import type { TextureManager } from "../utils/TextureManager";
import { RUNTIME_RING_TEXTURE_OPTIONS } from "../utils/runtimeRingTexture";
import {
    drawGoldRingFrame,
    GOLD_RING_COUNT,
    GOLD_RING_DURATION_MS,
    GOLD_RING_LOOP_MS,
    GOLD_RING_STAGGER_MS,
} from "./runtimeVisualEffectBursts";

const resolveScale = (ring: { width?: number }, radius: number): number =>
    (radius * 2) / Math.max(ring.width ?? 1, 1);

export class PersistentAttentionRings {
    private readonly rings: Phaser.GameObjects.Image[];
    private destroyed = false;

    constructor(
        scene: Phaser.Scene,
        layers: LayerRegistry,
        pools: DisplayPoolRegistry,
        textureManager: TextureManager,
    ) {
        const textureKey = textureManager.getGlyphTexture(
            RUNTIME_RING_TEXTURE_OPTIONS,
        );
        const pool = pools.get("runtime_effects").imagePool;
        this.rings = Array.from({ length: GOLD_RING_COUNT }, () => {
            const ring = pool.acquire(scene);
            ring.setTexture(textureKey);
            ring.setTint(0xf3cf62);
            layers.get(LayerId.EffectsGlobal).add(ring);
            return ring;
        });
    }

    public update(x: number, y: number, radius: number, nowMs: number): void {
        const loopMs =
            ((nowMs % GOLD_RING_LOOP_MS) + GOLD_RING_LOOP_MS) %
            GOLD_RING_LOOP_MS;
        this.rings.forEach((ring, index) => {
            const localMs = loopMs - index * GOLD_RING_STAGGER_MS;
            if (localMs < 0 || localMs > GOLD_RING_DURATION_MS) {
                ring.setVisible(false);
                return;
            }
            const frame = drawGoldRingFrame(
                radius,
                localMs / GOLD_RING_DURATION_MS,
            );
            ring.setPosition(x, y);
            ring.setAlpha(frame.alpha);
            ring.setScale(resolveScale(ring, frame.radiusPx));
            ring.setVisible(true);
        });
    }

    public destroy(pools: DisplayPoolRegistry): void {
        if (this.destroyed) return;
        this.destroyed = true;
        const pool = pools.get("runtime_effects").imagePool;
        this.rings.forEach((ring) => {
            ring.parentContainer?.remove(ring);
            pool.release(ring);
        });
    }
}
