import type {
    DisplayDestroyContext,
    DisplayInitContext,
    DisplayTickContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import { isRadiusVisible } from "../../../scenes/gameSceneMath";
import {
    hideCycleProgressRope,
    syncCycleProgressRope,
} from "./cycleProgressRopeRenderer";
import { resolveCycleProgressVisual } from "./cycleProgressVisual";

const MODULE_ID = "CycleProgressModule";

export const CycleProgressModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const pool = ctx.pools.get(ctx.spec.display_key);
        const rope = pool.ropePool.acquire(ctx.scene);
        const solidStripTextureKey = ctx.textureManager.getSolidStripTexture();
        ctx.scratch.backgroundAnchor.add(rope);
        ctx.scratch.cycleProgressRope = rope;
        hideCycleProgressRope(rope);
        let lastSignature: string | null = null;
        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                if (
                    !tickCtx.spec.hasPhysics ||
                    !isRadiusVisible(tickCtx.spec.radius)
                ) {
                    hideCycleProgressRope(rope);
                    lastSignature = null;
                    return;
                }
                const visual = resolveCycleProgressVisual({
                    entity: tickCtx.entity as Record<string, unknown>,
                    entityId: tickCtx.spec.entityId,
                    radius: tickCtx.spec.radius,
                    timeMs: tickCtx.timeMs,
                    pulseValue: tickCtx.pulseValue,
                    style: tickCtx.spec.style,
                    solidStripTextureKey,
                });
                if (!visual.ropeRequest) return hideCycleProgressRope(rope);
                if (visual.ropeSignature !== lastSignature) {
                    syncCycleProgressRope(rope, visual.ropeRequest);
                    lastSignature = visual.ropeSignature;
                }
            },
            destroy(dCtx: DisplayDestroyContext): void {
                rope.parentContainer?.remove(rope);
                dCtx.pools.get(dCtx.spec.display_key).ropePool.release(rope);
                if (dCtx.scratch.cycleProgressRope === rope) {
                    dCtx.scratch.cycleProgressRope = null;
                }
            },
        };
    },
};
