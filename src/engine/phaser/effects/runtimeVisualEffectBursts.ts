import Phaser from "phaser";
import { LayerId } from "../display/layers/LayerIds";
import type { LayerRegistry } from "../display/layers/LayerRegistry";
import type { DisplayPoolRegistry } from "../display/pooling/DisplayPoolRegistry";
import type { TextureManager } from "../utils/TextureManager";
import { RUNTIME_RING_TEXTURE_OPTIONS } from "../utils/runtimeRingTexture";

export const GOLD_RING_COUNT = 6;
export const GOLD_RING_STAGGER_MS = 200;
export const GOLD_RING_DURATION_MS = 620;
export const BODY_PICKUP_RING_COUNT = 1;
export const GOLD_RING_LOOP_MS =
    GOLD_RING_DURATION_MS + (GOLD_RING_COUNT - 1) * GOLD_RING_STAGGER_MS;

const GOLD_RING_TINT = 0xf3cf62;

const resolveRingScale = (ring: { width?: number }, radius: number): number =>
    (radius * 2) / Math.max(ring.width ?? 1, 1);

const resolveGoldRingTexture = (scene: Phaser.Scene): string | null => {
    const textureManager = (
        scene as Phaser.Scene & {
            textureManager?: TextureManager;
        }
    ).textureManager;
    if (!textureManager) {
        console.error(
            "[runtimeVisualEffectBursts] Missing scene texture manager",
        );
        return null;
    }
    return textureManager.getGlyphTexture(RUNTIME_RING_TEXTURE_OPTIONS);
};

export const drawGoldRingFrame = (
    radius: number,
    t: number,
): { radiusPx: number; alpha: number } => {
    const maxRadius = radius * 3;
    return {
        radiusPx: radius * (0.22 + t * 0.42) + maxRadius * t,
        alpha: 0.9 * (1 - t),
    };
};

const applyGoldRingFrame = (
    ring: Phaser.GameObjects.Image,
    x: number,
    y: number,
    radius: number,
    t: number,
) => {
    const frame = drawGoldRingFrame(radius, t);
    ring.setPosition(x, y);
    ring.setAlpha(frame.alpha);
    ring.setScale(resolveRingScale(ring, frame.radiusPx));
    ring.setVisible(true);
};

export const spawnGoldRings = (
    scene: Phaser.Scene,
    layers: LayerRegistry,
    pools: DisplayPoolRegistry,
    x: number,
    y: number,
    radius: number,
    ringCount = GOLD_RING_COUNT,
): void => {
    const textureKey = resolveGoldRingTexture(scene);
    if (!textureKey) return;
    const pool = pools.get("runtime_effects").imagePool;
    for (let index = 0; index < ringCount; index++) {
        const ring = pool.acquire(scene);
        ring.setTexture(textureKey);
        ring.setTint(GOLD_RING_TINT);
        layers.get(LayerId.EffectsGlobal).add(ring);
        scene.tweens.addCounter({
            from: 0,
            to: 1,
            delay: index * GOLD_RING_STAGGER_MS,
            duration: GOLD_RING_DURATION_MS,
            onUpdate: (tween) => {
                applyGoldRingFrame(ring, x, y, radius, tween.getValue() ?? 0);
            },
            onComplete: () => {
                ring.parentContainer?.remove(ring);
                pool.release(ring);
            },
        });
    }
};

export const spawnSmokePuff = (
    scene: Phaser.Scene,
    layers: LayerRegistry,
    textureManager: TextureManager,
    x: number,
    y: number,
    radius: number,
): void => {
    const emitter = scene.add.particles(
        x,
        y,
        textureManager.getShapeTexture({ shape: "circle", color: "#ffffff" }),
        {
            speed: { min: radius * 0.6, max: radius * 2.1 },
            lifespan: 360,
            quantity: 14,
            scale: { start: 0.28, end: 1.25 },
            alpha: { start: 0.42, end: 0 },
            tint: [0x555555, 0x777777, 0x999999],
            emitting: true,
            blendMode: Phaser.BlendModes.NORMAL,
        },
    );
    layers.get(LayerId.EffectsGlobal).add(emitter);
    scene.time.delayedCall(420, () => emitter.destroy());
};
