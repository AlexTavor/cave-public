import type Phaser from "phaser";
import type { DisplayInitContext } from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import { isRadiusVisible } from "../../../scenes/gameSceneMath";
import { parseHexColor, parseRgb, resolveLightState } from "./lightModuleState";

const MODULE_ID = "LightModule";

export const LightModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        let light: Phaser.GameObjects.PointLight | null = null;
        const ensureLight = (state: ReturnType<typeof resolveLightState>) => {
            if (!state) return null;
            if (light) return light;
            const lights = ctx.scene.lights;
            if (!lights.active) lights.enable();
            light = lights.addPointLight(
                ctx.spec.x,
                ctx.spec.y,
                parseHexColor(state.color),
                state.radius,
                state.alpha,
                0.08,
            );
            return light;
        };

        return {
            id: MODULE_ID,
            tick(tickCtx) {
                const next = resolveLightState(tickCtx);
                if (
                    !next ||
                    !tickCtx.spec.hasPhysics ||
                    !isRadiusVisible(next.radius)
                ) {
                    light?.setVisible(false);
                    return;
                }
                const point = ensureLight(next);
                if (!point) return;
                const rgb = parseRgb(next.color);
                point.setBlendMode(next.blendMode);
                point.setPosition(tickCtx.spec.x, tickCtx.spec.y);
                point.radius = next.radius;
                point.color.setTo(rgb.r, rgb.g, rgb.b);
                point.intensity = next.alpha;
                point.setVisible(true);
            },
            destroy() {
                light?.destroy();
            },
        };
    },
};
