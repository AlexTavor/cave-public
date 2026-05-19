import { RESOURCE_PROGRESS_BAR_POSITIONS } from "../../../../../lib/displays/resourceProgressBarSlots";
import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import type { DisplayTickContext } from "../../types";
import {
    hideProgressBarSlot,
    type ProgressBarSlotState,
} from "./progressBarSlots";
import {
    readCachedProgressBarGeometry,
    type CachedProgressBarGeometry,
} from "./progressBarTick.cache";
import { resolvePositionedProgressBars } from "./progressBarTick.positioned";
import { tickActiveProgressBarSlot } from "./progressBarTick.slot";

export const tickProgressBars = (input: {
    ctx: DisplayTickContext;
    slots: ProgressBarSlotState[];
    glyphRegistry: GlyphRegistry;
    geometryCache: Map<string, CachedProgressBarGeometry>;
    loggedDuplicates: Set<string>;
}) => {
    const stripKey = input.ctx.textureManager.getProgressBarStripTexture();
    const bulbKey = input.ctx.textureManager.getShapeTexture({
        shape: "circle",
        color: "#ffffff",
    });
    const paletteColors = input.ctx.pulseEngine.getAllNodeColors?.();
    const positioned = resolvePositionedProgressBars({
        entityId: input.ctx.spec.entityId,
        entity: input.ctx.entity,
        displayBars: input.ctx.spec.displayBars as any,
        loggedDuplicates: input.loggedDuplicates,
    });
    RESOURCE_PROGRESS_BAR_POSITIONS.forEach((position, index) => {
        const slot = input.slots[index];
        const active = positioned.get(position);
        if (!active) {
            hideProgressBarSlot(slot);
            return;
        }
        const geometry = readCachedProgressBarGeometry(
            input.geometryCache,
            position,
            input.ctx.spec.radius,
            active.live.spanRatio,
        );
        tickActiveProgressBarSlot({
            ctx: input.ctx,
            slot,
            glyphRegistry: input.glyphRegistry,
            geometry,
            stripKey,
            bulbKey,
            active,
            paletteColors,
        });
    });
};
