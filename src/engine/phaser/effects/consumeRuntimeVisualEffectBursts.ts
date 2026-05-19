import type Phaser from "phaser";
import type { LayerRegistry } from "../display/layers/LayerRegistry";
import type { DisplayPoolRegistry } from "../display/pooling/DisplayPoolRegistry";
import type { TextureManager } from "../utils/TextureManager";
import type { RuntimeVisualEvent } from "../../../ui/runtime/effects/runtimeVisualEvents";
import {
    BODY_PICKUP_RING_COUNT,
    spawnGoldRings,
    spawnSmokePuff,
} from "./runtimeVisualEffectBursts";

const DEATH_SHAKE_DURATION_MS = 220;
const DEATH_SHAKE_INTENSITY = 0.02;

export const consumeRuntimeVisualEffectBursts = (
    scene: Phaser.Scene,
    layers: LayerRegistry,
    pools: DisplayPoolRegistry,
    textureManager: TextureManager,
    events: RuntimeVisualEvent[],
): void => {
    let shake: [number, number] | null = null;
    events.forEach((event) => {
        if (event.kind === "body_death_camera_shake") {
            shake = [DEATH_SHAKE_DURATION_MS, DEATH_SHAKE_INTENSITY];
            return;
        }
        if (event.kind === "spawn_gold_rings") {
            spawnGoldRings(
                scene,
                layers,
                pools,
                event.x,
                event.y,
                event.radius,
            );
            return;
        }
        if (event.kind === "spawn_body_pickup_effect") {
            spawnGoldRings(
                scene,
                layers,
                pools,
                event.x,
                event.y,
                event.radius,
                BODY_PICKUP_RING_COUNT,
            );
            return;
        }
        if (event.kind === "spawn_body_drop_effect") {
            spawnGoldRings(
                scene,
                layers,
                pools,
                event.x,
                event.y,
                event.radius,
                BODY_PICKUP_RING_COUNT,
            );
            return;
        }
        spawnSmokePuff(
            scene,
            layers,
            textureManager,
            event.x,
            event.y,
            event.radius,
        );
    });
    if (!shake) return;
    scene.cameras.main.shake(shake[0], shake[1], true);
};
