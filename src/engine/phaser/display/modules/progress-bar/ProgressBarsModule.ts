import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import type { DisplayModuleFactory } from "../../moduleTypes";
import {
    createProgressBarSlots,
    destroyProgressBarSlots,
} from "./progressBarSlots";
import type { CachedProgressBarGeometry } from "./progressBarTick.cache";
import { tickProgressBars } from "./progressBarTick";

export const createProgressBarsModule = (
    glyphRegistry: GlyphRegistry,
): DisplayModuleFactory => ({
    id: "ProgressBarsModule",
    create(ctx) {
        const slots = createProgressBarSlots(ctx);
        const geometryCache = new Map<string, CachedProgressBarGeometry>();
        const loggedDuplicates = new Set<string>();
        return {
            id: "ProgressBarsModule",
            tick(tickCtx) {
                tickProgressBars({
                    ctx: tickCtx,
                    slots,
                    glyphRegistry,
                    geometryCache,
                    loggedDuplicates,
                });
            },
            destroy(destroyCtx) {
                destroyProgressBarSlots(destroyCtx, slots);
            },
        };
    },
});
