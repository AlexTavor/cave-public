import type Phaser from "phaser";
import type { LayerRegistry } from "../layers/LayerRegistry";
import type { DisplayPoolRegistry } from "../pooling/DisplayPoolRegistry";
import { LayerId } from "../layers/LayerIds";
import type { DisplayScratch } from "../types";

export const acquireAnchors = (
    scene: Phaser.Scene,
    layers: LayerRegistry,
    pools: DisplayPoolRegistry,
    display_key: string,
): DisplayScratch => {
    const pool = pools.get(display_key);

    const root = pool.rootPool.acquire(scene);
    const backgroundAnchor = pool.backgroundAnchorPool.acquire(scene);
    const effectsAnchor = pool.effectsAnchorPool.acquire(scene);
    const overlayAnchor = pool.overlayAnchorPool.acquire(scene);

    layers.get(LayerId.Entities).add(root);
    layers.get(LayerId.Background).add(backgroundAnchor);
    layers.get(LayerId.EffectsAnchored).add(effectsAnchor);
    layers.get(LayerId.Overlays).add(overlayAnchor);

    return {
        root,
        backgroundAnchor,
        effectsAnchor,
        overlayAnchor,
        backgroundImage: null,
        mainImage: null,
        particlesManager: null,
        cycleProgressRope: null,
        caveFillGraphics: null,
        caveHairGraphics: null,
        nodeOverlayDisplayBounds: null,
    };
};

export const releaseAnchors = (
    scratch: DisplayScratch,
    pools: DisplayPoolRegistry,
    display_key: string,
): void => {
    const pool = pools.get(display_key);
    const { root, backgroundAnchor, effectsAnchor, overlayAnchor } = scratch;

    root.parentContainer?.remove(root);
    backgroundAnchor.parentContainer?.remove(backgroundAnchor);
    effectsAnchor.parentContainer?.remove(effectsAnchor);
    overlayAnchor.parentContainer?.remove(overlayAnchor);

    pool.rootPool.release(root);
    pool.backgroundAnchorPool.release(backgroundAnchor);
    pool.effectsAnchorPool.release(effectsAnchor);
    pool.overlayAnchorPool.release(overlayAnchor);
};

export const validateScratchSlots = (
    scratch: DisplayScratch,
    display_key: string,
): void => {
    const leaked: string[] = [];

    if (scratch.backgroundImage) leaked.push("backgroundImage");
    if (scratch.mainImage) leaked.push("mainImage");
    if (scratch.particlesManager) leaked.push("particlesManager");
    if (scratch.cycleProgressRope) leaked.push("cycleProgressRope");
    if (scratch.caveFillGraphics) leaked.push("caveFillGraphics");
    if (scratch.caveHairGraphics) leaked.push("caveHairGraphics");

    if (leaked.length > 0) {
        console.error(
            `[EntityVisualInstance] Leaked objects for ` +
                `"${display_key}": ${leaked.join(", ")}`,
        );
    }
};

