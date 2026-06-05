import type Phaser from "phaser";
import type { DisplayInitContext } from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import { GLYPH_POSITION_COORDS } from "../../../../../data/schemas/assets/GlyphTypes";
import { createNodeOverlayDisplayBoundsFromRadius } from "../../nodeOverlayDisplayBounds";
import {
    readTransferRender,
    resolveTransferRadius,
} from "./transferDisplayHelpers";
import {
    destroyTransferGlyph,
    tickTransferGlyph,
} from "./transferGlyphRuntime";

const MODULE_ID = "TransferGlyphModule";
type Img = Phaser.GameObjects.Image;

const noOpRuntime = (): DisplayModuleRuntime => ({
    id: MODULE_ID,
    tick: () => undefined,
    destroy: () => undefined,
});

export const createTransferGlyphModule = (
    glyphRegistry: GlyphRegistry,
): DisplayModuleFactory => ({
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        if (readTransferRender(ctx.entity)?.mode !== "pretty")
            return noOpRuntime();
        const pool = ctx.pools.get(ctx.spec.display_key).imagePool;
        const images: Img[] = [];
        for (const _slot of GLYPH_POSITION_COORDS)
            images.push(pool.acquire(ctx.scene));
        for (const image of images) ctx.scratch.root.add(image);
        ctx.scratch.mainImage = images[0];
        return {
            id: MODULE_ID,
            tick(tickCtx) {
                tickTransferGlyph(tickCtx, glyphRegistry, images);
                const render = readTransferRender(tickCtx.entity);
                const bounds = createNodeOverlayDisplayBoundsFromRadius({
                    entityId: tickCtx.spec.entityId,
                    centerX: tickCtx.spec.x,
                    centerY: tickCtx.spec.y,
                    radius: resolveTransferRadius(
                        tickCtx.entity,
                        render?.baseRadius ?? 0,
                    ),
                });
                if (bounds) tickCtx.scratch.nodeOverlayDisplayBounds = bounds;
            },
            destroy(dCtx) {
                destroyTransferGlyph(dCtx, images);
            },
        };
    },
});

