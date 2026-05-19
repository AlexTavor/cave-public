import type Phaser from "phaser";
import type { DisplayInitContext } from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import { parseHexColor, parseRgb } from "./lightModuleState";
import { resolveMenuAmbientProximityLightState } from "./menuAmbientProximityLightState";

const MODULE_ID = "MenuAmbientProximityLightModule";
const LIGHT_ATTENUATION = 0.08;

export const MenuAmbientProximityLightModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        let light: Phaser.GameObjects.PointLight | null = null;
        const readPointerWorld = () => {
            const pointer = ctx.scene.input?.activePointer;
            pointer?.updateWorldPoint?.(ctx.scene.cameras.main);
            return {
                x: pointer?.worldX ?? Number.NaN,
                y: pointer?.worldY ?? Number.NaN,
            };
        };
        const ensureLight = (color: string, radius: number, alpha: number) => {
            if (light) return light;
            const lights = ctx.scene.lights;
            if (!lights.active) lights.enable();
            light = lights.addPointLight(
                ctx.spec.x,
                ctx.spec.y,
                parseHexColor(color),
                radius,
                alpha,
                LIGHT_ATTENUATION,
            );
            return light;
        };

        return {
            id: MODULE_ID,
            tick(tickCtx) {
                const pointerWorld = readPointerWorld();
                const next = resolveMenuAmbientProximityLightState({
                    hasPhysics: tickCtx.spec.hasPhysics,
                    nodeX: tickCtx.spec.x,
                    nodeY: tickCtx.spec.y,
                    pointerX: pointerWorld.x,
                    pointerY: pointerWorld.y,
                    radius: tickCtx.spec.radius,
                });
                if (!next) {
                    light?.setVisible(false);
                    return;
                }
                const point = ensureLight(next.color, next.radius, next.alpha);
                const rgb = parseRgb(next.color);
                point.setBlendMode(next.blendMode);
                point.setPosition(next.x, next.y);
                point.radius = next.radius;
                point.color.setTo(rgb.r, rgb.g, rgb.b);
                point.intensity = next.alpha;
                point.setVisible(true);
            },
            destroy() {
                light?.destroy();
                light = null;
            },
        };
    },
};
