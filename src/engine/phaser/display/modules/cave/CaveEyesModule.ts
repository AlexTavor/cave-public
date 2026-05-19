import Phaser from "phaser";
import { isRadiusVisible } from "../../../scenes/gameSceneMath";
import type {
    DisplayDestroyContext,
    DisplayInitContext,
    DisplayTickContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import { BLEND_MODE_NORMAL } from "../../blendModes";
import { resolveCaveEyeGeometry } from "./caveEyesRenderMath";

const MODULE_ID = "CaveEyesModule";
const HIDE = (images: Phaser.GameObjects.Image[]) =>
    images.forEach((image) => image.setVisible(false));
const toColor = (hex: string) =>
    Phaser.Display.Color.HexStringToColor(hex).color;
const resolveBlink = (
    timeMs: number,
    intervalMs: number,
    durationMs: number,
    phaseMs: number,
) => {
    const window =
        (((timeMs + phaseMs) % Math.max(1, intervalMs)) + intervalMs) %
        intervalMs;
    return window > durationMs
        ? 1
        : 1 - Math.abs(window / Math.max(1, durationMs) - 0.5) * 2;
};

export const CaveEyesModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const pool = ctx.pools.get(ctx.spec.display_key).imagePool;
        const eyeTexture = ctx.textureManager.getShapeTexture({
            shape: "circle",
            color: "#ffffff",
        });
        const pupilTexture = ctx.textureManager.getShapeTexture({
            shape: "rect",
            color: "#ffffff",
        });
        const leftEye = pool.acquire(ctx.scene);
        const rightEye = pool.acquire(ctx.scene);
        const leftPupil = pool.acquire(ctx.scene);
        const rightPupil = pool.acquire(ctx.scene);
        for (const image of [leftEye, rightEye, leftPupil, rightPupil]) {
            image.setBlendMode(BLEND_MODE_NORMAL as Phaser.BlendModes);
            ctx.scratch.effectsAnchor.add(image);
        }
        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                const render = (tickCtx.entity as any).cave?.mind?.render;
                if (
                    !render ||
                    !tickCtx.spec.hasPhysics ||
                    !isRadiusVisible(tickCtx.spec.radius)
                ) {
                    HIDE([leftEye, rightEye, leftPupil, rightPupil]);
                    return;
                }
                const blink = resolveBlink(
                    tickCtx.timeMs,
                    render.blinkIntervalMs,
                    render.blinkDurationMs,
                    render.blinkPhaseMs,
                );
                const geometry = resolveCaveEyeGeometry(
                    tickCtx.spec.radius,
                    render,
                );
                const openness = Math.max(0.04, blink);
                const eyeHeight = Math.max(3, geometry.eyeHeight * openness);
                const pupilHeight = Math.max(
                    2,
                    geometry.pupilHeight * openness * 0.92,
                );
                for (const [image, eye] of [
                    [leftEye, geometry.left],
                    [rightEye, geometry.right],
                ] as const) {
                    image.setTexture(eyeTexture);
                    image.setPosition(eye.x, eye.y);
                    image.setDisplaySize(geometry.eyeWidth, eyeHeight);
                    image.setTint(toColor(render.eyeColor));
                    image.setVisible(true);
                }
                for (const [image, eye] of [
                    [leftPupil, geometry.left],
                    [rightPupil, geometry.right],
                ] as const) {
                    image.setTexture(pupilTexture);
                    image.setPosition(eye.pupilX, eye.pupilY);
                    image.setDisplaySize(geometry.pupilWidth, pupilHeight);
                    image.setTint(0x0b0905);
                    image.setAlpha(0.96);
                    image.setVisible(true);
                }
            },
            destroy(dCtx: DisplayDestroyContext): void {
                for (const image of [
                    leftEye,
                    rightEye,
                    leftPupil,
                    rightPupil,
                ]) {
                    dCtx.scratch.effectsAnchor.remove(image);
                    pool.release(image);
                }
            },
        };
    },
};
