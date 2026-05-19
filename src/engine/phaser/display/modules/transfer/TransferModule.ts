import type {
    DisplayInitContext,
    DisplayTickContext,
    DisplayDestroyContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import { createNodeOverlayDisplayBoundsFromRadius } from "../../nodeOverlayDisplayBounds";
import { STANDARD_TEXTURE_RADIUS } from "../../../utils/TextureManager";
import {
    readTransferPayload,
    readTransferRender,
    resolveTransferRadius,
} from "./transferDisplayHelpers";

const MODULE_ID = "TransferModule";
const DEFAULT_COLOR = "#d8d8d8";
const DEFAULT_BASE_RADIUS = 4;
const MIN_TRANSFER_RADIUS = 10;

const noOpRuntime = (): DisplayModuleRuntime => ({
    id: MODULE_ID,
    tick: () => undefined,
    destroy: () => undefined,
});

export const TransferModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const render = readTransferRender(ctx.entity);
        if (render?.mode === "pretty") return noOpRuntime();
        const pool = ctx.pools.get(ctx.spec.display_key);
        const img = pool.imagePool.acquire(ctx.scene);
        ctx.scratch.backgroundAnchor.add(img);
        ctx.scratch.backgroundImage = img;

        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                const { entity, textureManager } = tickCtx;
                const payload = readTransferPayload(entity);
                if (!payload) {
                    img.setVisible(false);
                    return;
                }
                const legacy = readTransferRender(entity);
                const color =
                    legacy?.mode === "legacy" ? legacy.color : DEFAULT_COLOR;
                const baseRadius = Math.max(
                    1,
                    legacy?.baseRadius ?? DEFAULT_BASE_RADIUS,
                );
                const key = textureManager.getShapeTexture({
                    shape: "circle",
                    color,
                });
                img.setTexture(key);
                const renderRadius = Math.max(
                    MIN_TRANSFER_RADIUS,
                    resolveTransferRadius(entity, baseRadius),
                );
                img.setScale(renderRadius / STANDARD_TEXTURE_RADIUS);
                tickCtx.scratch.nodeOverlayDisplayBounds =
                    createNodeOverlayDisplayBoundsFromRadius({
                        entityId: tickCtx.spec.entityId,
                        centerX: tickCtx.spec.x,
                        centerY: tickCtx.spec.y,
                        radius: renderRadius,
                    });
                img.setVisible(true);
            },
            destroy(dCtx: DisplayDestroyContext): void {
                dCtx.scratch.backgroundAnchor.remove(img);
                dCtx.pools.get(dCtx.spec.display_key).imagePool.release(img);
                dCtx.scratch.backgroundImage = null;
            },
        };
    },
};

