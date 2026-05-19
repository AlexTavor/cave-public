import type {
    DisplayInitContext,
    DisplayTickContext,
    DisplayDestroyContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";

const MODULE_ID = "PulseModule";

type TargetKey =
    | "root"
    | "background"
    | "main"
    | "effectsAnchor"
    | "overlayAnchor";

type EffectKind = "scale" | "alpha";

export interface PulseModuleConfig {
    target: TargetKey;
    effect: EffectKind;
    strength: number;
    base: number;
}

const resolveTarget = (
    scratch: DisplayTickContext["scratch"],
    key: TargetKey,
): Phaser.GameObjects.Container | Phaser.GameObjects.Image | null => {
    switch (key) {
        case "root":
            return scratch.root;
        case "background":
            return scratch.backgroundImage;
        case "main":
            return scratch.mainImage;
        case "effectsAnchor":
            return scratch.effectsAnchor;
        case "overlayAnchor":
            return scratch.overlayAnchor;
    }
};

const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

export const createPulseModule = (
    config: PulseModuleConfig,
): DisplayModuleFactory => ({
    id: MODULE_ID,
    create(_ctx: DisplayInitContext): DisplayModuleRuntime {
        return {
            id: MODULE_ID,
            tick(ctx: DisplayTickContext): void {
                const obj = resolveTarget(ctx.scratch, config.target);
                if (!obj) return;

                const value = config.base + ctx.pulseValue * config.strength;

                if (config.effect === "scale") {
                    obj.setScale(value);
                } else {
                    obj.setAlpha(clamp(value, 0, 1));
                }
            },
            destroy(dCtx: DisplayDestroyContext): void {
                const obj = resolveTarget(dCtx.scratch, config.target);
                if (!obj) return;

                if (config.effect === "scale") {
                    obj.setScale(config.base);
                } else {
                    obj.setAlpha(clamp(config.base, 0, 1));
                }
            },
        };
    },
});

