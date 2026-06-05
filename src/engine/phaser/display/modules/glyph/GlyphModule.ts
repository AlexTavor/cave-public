import type { DisplayInitContext } from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import { GLYPH_POSITION_COORDS } from "../../../../../data/schemas/assets/GlyphTypes";
import { destroyGlyphImages, tickGlyphImages } from "./glyphModuleRuntime";

const MODULE_ID = "GlyphModule";

export const createGlyphModule = (
    glyphRegistry: GlyphRegistry,
): DisplayModuleFactory => ({
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const { pools, spec, scratch, scene } = ctx;
        const pool = pools.get(spec.display_key).imagePool;
        const images = Array.from(
            { length: GLYPH_POSITION_COORDS.length },
            () => pool.acquire(scene),
        );
        images.forEach((img) => scratch.root.add(img));
        scratch.mainImage = images[0];
        return {
            id: MODULE_ID,
            tick(tickCtx) {
                tickGlyphImages(tickCtx, images, glyphRegistry);
            },
            destroy(dCtx) {
                destroyGlyphImages(dCtx, images);
            },
        };
    },
});
