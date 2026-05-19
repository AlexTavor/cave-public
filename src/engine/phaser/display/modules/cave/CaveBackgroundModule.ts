import { isRadiusVisible } from "../../../scenes/gameSceneMath";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import type {
    DisplayDestroyContext,
    DisplayInitContext,
    DisplayTickContext,
} from "../../types";
import {
    computeCaveContour,
    computeCaveFurWedges,
} from "./caveBackgroundGeometry";
import { createNodeOverlayDisplayBoundsFromLocalExtents } from "../../node-overlay/nodeOverlayDisplayBounds";
import { renderCaveBody, renderCaveHairs } from "./caveHairRenderer";

const MODULE_ID = "CaveBackgroundModule";

const setVisible = (
    graphics: Array<{ setVisible(value: boolean): unknown } | null>,
    visible: boolean,
) => graphics.forEach((entry) => entry?.setVisible(visible));

export const CaveBackgroundModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const pool = ctx.pools.get(ctx.spec.display_key).graphicsPool;
        const fillGraphics = pool.acquire(ctx.scene);
        const hairGraphics = pool.acquire(ctx.scene);
        ctx.scratch.backgroundAnchor.add(fillGraphics);
        ctx.scratch.backgroundAnchor.add(hairGraphics);
        ctx.scratch.caveFillGraphics = fillGraphics;
        ctx.scratch.caveHairGraphics = hairGraphics;
        let loggedMissingFur = false;

        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                const fur = (tickCtx.entity as any).cave?.mind?.render?.fur;
                if (
                    !tickCtx.spec.hasPhysics ||
                    !isRadiusVisible(tickCtx.spec.radius)
                ) {
                    setVisible([fillGraphics, hairGraphics], false);
                    return;
                }
                if (!fur) {
                    setVisible([fillGraphics, hairGraphics], false);
                    if (!loggedMissingFur) {
                        console.error(
                            `[CaveBackgroundModule] Missing render.fur for ${tickCtx.spec.entityId}`,
                        );
                        loggedMissingFur = true;
                    }
                    return;
                }
                const contour = computeCaveContour({
                    entityId: tickCtx.spec.entityId,
                    radius: tickCtx.spec.radius,
                    timeMs: tickCtx.timeMs,
                    pulseValue: tickCtx.pulseValue,
                    fur,
                });
                const wedges = computeCaveFurWedges({
                    entityId: tickCtx.spec.entityId,
                    timeMs: tickCtx.timeMs,
                    pulseValue: tickCtx.pulseValue,
                    fur,
                    contour,
                });
                renderCaveBody(fillGraphics, contour);
                renderCaveHairs(hairGraphics, wedges);
                tickCtx.scratch.nodeOverlayDisplayBounds =
                    createNodeOverlayDisplayBoundsFromLocalExtents({
                        entityId: tickCtx.spec.entityId,
                        centerX: tickCtx.spec.x,
                        centerY: tickCtx.spec.y,
                        minY: Math.min(
                            ...contour.map((point) => point.y),
                            ...wedges.flatMap((wedge) =>
                                wedge.points.map((point) => point.y),
                            ),
                        ),
                        maxY: Math.max(
                            ...contour.map((point) => point.y),
                            ...wedges.flatMap((wedge) =>
                                wedge.points.map((point) => point.y),
                            ),
                        ),
                    });
                setVisible([fillGraphics, hairGraphics], true);
            },
            destroy(dCtx: DisplayDestroyContext): void {
                for (const graphics of [fillGraphics, hairGraphics]) {
                    dCtx.scratch.backgroundAnchor.remove(graphics);
                    pool.release(graphics);
                }
                dCtx.scratch.caveFillGraphics = null;
                dCtx.scratch.caveHairGraphics = null;
            },
        };
    },
};
