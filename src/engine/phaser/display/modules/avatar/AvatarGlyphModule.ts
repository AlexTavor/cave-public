import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import { createGlyphModule } from "../glyph/GlyphModule";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import type {
    DisplayDestroyContext,
    DisplayInitContext,
    DisplayTickContext,
} from "../../types";

const MODULE_ID = "AvatarGlyphModule";

const withGlyphSpec = <T extends { spec: DisplayInitContext["spec"] }>(
    ctx: T,
) => ({
    ...ctx,
    spec: {
        ...ctx.spec,
        display_key: ctx.spec.glyph_key ?? ctx.spec.display_key,
    },
});

export const createAvatarGlyphModule = (
    glyphRegistry: GlyphRegistry,
): DisplayModuleFactory => ({
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        if (!ctx.spec.glyph_key) {
            return { id: MODULE_ID, tick() {}, destroy() {} };
        }
        const glyph = createGlyphModule(glyphRegistry);
        const preservedMain = ctx.scratch.mainImage;
        const runtime = glyph.create(withGlyphSpec(ctx));
        ctx.scratch.mainImage = preservedMain;
        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                runtime.tick(withGlyphSpec(tickCtx));
            },
            destroy(dCtx: DisplayDestroyContext): void {
                runtime.destroy(withGlyphSpec(dCtx));
                dCtx.scratch.mainImage = preservedMain;
            },
        };
    },
});
