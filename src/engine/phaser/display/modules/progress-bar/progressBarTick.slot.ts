import { syncVeinRope } from "../veins/veinsRopeRenderer";
import { slicePolylineToDistance } from "../veins/veinsVisualMath";
import {
    mergeNodeOverlayDisplayBounds,
    createNodeOverlayDisplayBoundsFromLocalExtents,
} from "../../node-overlay/nodeOverlayDisplayBounds";
import {
    cssColorToTint,
    resolveResourceProgressBarColor,
    resolveResourceProgressTrackColor,
} from "../../../../../lib/displays/resourceProgressBarColor";
import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import type { DisplayTickContext } from "../../types";
import type {
    ProgressBarSlotRenderState,
    ProgressBarSlotState,
} from "./progressBarSlots";
import {
    shouldUpdateBulb,
    shouldUpdateFill,
    shouldUpdateTrack,
    type CachedProgressBarGeometry,
} from "./progressBarTick.cache";
import { tickProgressBarIcon } from "./progressBarIcon";

export const tickActiveProgressBarSlot = (input: {
    ctx: DisplayTickContext;
    slot: ProgressBarSlotState;
    glyphRegistry: GlyphRegistry;
    geometry: CachedProgressBarGeometry;
    stripKey: string;
    bulbKey: string;
    active: { bar: any; live: any };
    paletteColors: Record<string, string> | undefined;
}) => {
    const {
        ctx,
        slot,
        glyphRegistry,
        geometry,
        stripKey,
        bulbKey,
        active,
        paletteColors,
    } = input;
    const fillRatio = Math.max(
        0,
        Math.min(1, active.live.current / active.live.max),
    );
    const fillColor = resolveResourceProgressBarColor({
        resourceId: active.live.resourceId,
        color: active.bar.color,
        paletteColorKey: active.bar.paletteColorKey,
        paletteColors,
    });
    const nextState: ProgressBarSlotRenderState = {
        geometryKey: geometry.geometryKey,
        trackTint: cssColorToTint(resolveResourceProgressTrackColor(fillColor)),
        fillTint: cssColorToTint(fillColor),
        fillRatio,
        trackWidthPx: geometry.trackWidthPx,
        fillWidthPx: geometry.fillWidthPx,
        resourceId: active.live.resourceId,
    };
    if (shouldUpdateTrack(slot.renderState, nextState)) {
        syncVeinRope(slot.track, {
            textureKey: stripKey,
            points: geometry.points,
            tint: nextState.trackTint,
            alpha: 1,
            displayWidthPx: geometry.trackWidthPx,
        });
    }
    if (shouldUpdateFill(slot.renderState, nextState)) {
        syncVeinRope(slot.fill, {
            textureKey: stripKey,
            points: slicePolylineToDistance(
                geometry.points,
                geometry.metrics.segmentLensPx,
                geometry.metrics.totalLenPx * fillRatio,
            ),
            tint: nextState.fillTint,
            alpha: 1,
            displayWidthPx: geometry.fillWidthPx,
        });
    }
    if (shouldUpdateBulb(slot.renderState, nextState))
        slot.bulb.setTexture(bulbKey).setTint(nextState.trackTint);
    slot.bulb
        .setPosition(geometry.bulb.x, geometry.bulb.y)
        .setScale((geometry.trackWidthPx * 2) / 128)
        .setVisible(true);
    tickProgressBarIcon({
        ctx,
        icons: slot.icons,
        glyphRegistry,
        resourceId: active.live.resourceId,
        radius: geometry.bulbRadiusPx * 3,
        x: geometry.bulb.x,
        y: geometry.bulb.y,
    });
    ctx.scratch.nodeOverlayDisplayBounds = mergeNodeOverlayDisplayBounds(
        ctx.scratch.nodeOverlayDisplayBounds,
        createNodeOverlayDisplayBoundsFromLocalExtents({
            entityId: ctx.spec.entityId,
            centerX: ctx.spec.x,
            centerY: ctx.spec.y,
            minY: geometry.bounds.minY,
            maxY: geometry.bounds.maxY,
        }),
    );
    slot.visible = true;
    slot.renderState = nextState;
};
