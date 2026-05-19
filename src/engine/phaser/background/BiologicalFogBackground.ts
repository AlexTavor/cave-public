import Phaser from "phaser";
import {
    DEFAULT_BACKGROUND_CONFIG,
    type BackgroundConfig,
} from "../../../data/schemas/assets";
import type { Runtime } from "../../runtime/Runtime";
import { applyBiologicalFogUniforms } from "./applyBiologicalFogUniforms";
import { parseBackgroundConfig } from "./backgroundRuntimeHelpers";
import { createBiologicalFogShaderObject } from "./createBiologicalFogShaderObject";
import { resolveBiologicalFogUniforms } from "./resolveBiologicalFogUniforms";
import { resolveScreenPinnedShaderRect } from "./resolveScreenPinnedShaderRect";

export class BiologicalFogBackground {
    private shader: Phaser.GameObjects.Shader | null = null;
    private config: BackgroundConfig = DEFAULT_BACKGROUND_CONFIG;

    constructor(private readonly scene: Phaser.Scene) {
        this.scene.scale.on("resize", this.handleResize);
    }

    public update(runtime: Runtime, pulse01: number): void {
        this.refreshConfig(runtime);
        if (!this.config.enabled) {
            this.shader?.setVisible(false);
            return;
        }
        const shader = this.ensureShader();
        const camera = this.scene.cameras.main;
        this.syncShaderSize(shader);
        applyBiologicalFogUniforms(
            shader,
            resolveBiologicalFogUniforms({
                config: this.config,
                purgeActive: Boolean(
                    (runtime.getEntity("sys_world") as any)?.cave?.purge
                        ?.isActive,
                ),
                timeMs: runtime.getAccumulatedTime(),
                pulse01,
                cameraScrollX: camera.scrollX,
                cameraScrollY: camera.scrollY,
                cameraZoom: camera.zoom,
                viewportWidth: this.scene.scale.width,
                viewportHeight: this.scene.scale.height,
            }),
        );
        shader.setVisible(true);
    }

    public destroy(): void {
        this.scene.scale.off("resize", this.handleResize);
        this.shader?.destroy();
        this.shader = null;
    }

    private ensureShader(): Phaser.GameObjects.Shader {
        const shader =
            this.shader ??
            createBiologicalFogShaderObject(
                this.scene,
                this.scene.scale.width,
                this.scene.scale.height,
                this.scene.cameras.main.zoom,
            );
        this.shader = shader;
        return shader;
    }

    private refreshConfig(runtime: Runtime): void {
        this.config = parseBackgroundConfig(runtime.getCartridge().assets);
    }

    private syncShaderSize(shader: Phaser.GameObjects.Shader): void {
        const rect = resolveScreenPinnedShaderRect(
            this.scene.scale.width,
            this.scene.scale.height,
            this.scene.cameras.main.zoom,
        );
        shader.setSize(rect.width, rect.height);
        shader.setDisplayOrigin(rect.width / 2, rect.height / 2);
        shader.setPosition(rect.x, rect.y);
    }

    private readonly handleResize = (): void => {
        if (!this.shader) return;
        this.syncShaderSize(this.shader);
        const rect = resolveScreenPinnedShaderRect(
            this.scene.scale.width,
            this.scene.scale.height,
            this.scene.cameras.main.zoom,
        );
        this.shader.setUniform("uResolution.value.x", rect.width);
        this.shader.setUniform("uResolution.value.y", rect.height);
    };
}
