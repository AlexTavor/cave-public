import Phaser from "phaser";
import { LayerId, LAYER_DEPTHS } from "../display/layers/LayerIds";
import {
    BIOLOGICAL_FOG_FRAGMENT_SHADER,
    createBiologicalFogUniformDefinitions,
} from "./biologicalFogShaderSource";
import { resolveScreenPinnedShaderRect } from "./resolveScreenPinnedShaderRect";

export const createBiologicalFogShaderObject = (
    scene: Phaser.Scene,
    width: number,
    height: number,
    cameraZoom: number,
): Phaser.GameObjects.Shader => {
    const rect = resolveScreenPinnedShaderRect(width, height, cameraZoom);
    const shader = new Phaser.Display.BaseShader(
        "biologicalFogBackground",
        BIOLOGICAL_FOG_FRAGMENT_SHADER,
        undefined,
        createBiologicalFogUniformDefinitions(),
    );
    return scene.add
        .shader(shader, rect.x, rect.y, rect.width, rect.height)
        .setScrollFactor(0)
        .setDepth(LAYER_DEPTHS[LayerId.Veins] - 1);
};
