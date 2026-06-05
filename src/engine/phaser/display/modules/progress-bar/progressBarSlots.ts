import type Phaser from "phaser";
import type { DisplayDestroyContext, DisplayInitContext } from "../../types";
import { GLYPH_POSITION_COORDS } from "../../../../../data/schemas/assets/GlyphTypes";

export type ProgressBarSlotRenderState = {
    geometryKey: string;
    trackTint: number;
    fillTint: number;
    fillRatio: number;
    trackWidthPx: number;
    fillWidthPx: number;
    resourceId: string;
};

export type ProgressBarSlotState = {
    track: Phaser.GameObjects.Rope;
    fill: Phaser.GameObjects.Rope;
    bulb: Phaser.GameObjects.Image;
    icons: Phaser.GameObjects.Image[];
    visible: boolean;
    renderState: ProgressBarSlotRenderState | null;
};

export const hideProgressBarSlot = (slot: ProgressBarSlotState) => {
    if (!slot.visible && !slot.renderState) return;
    slot.track.setVisible(false);
    slot.fill.setVisible(false);
    slot.bulb.setVisible(false);
    slot.icons.forEach((icon) => icon.setVisible(false));
    slot.visible = false;
    slot.renderState = null;
};

export const createProgressBarSlots = (ctx: DisplayInitContext) => {
    const pool = ctx.pools.get(ctx.spec.display_key);
    return Array.from({ length: 4 }, () => {
        const track = pool.ropePool.acquire(ctx.scene);
        const fill = pool.ropePool.acquire(ctx.scene);
        const bulb = pool.imagePool.acquire(ctx.scene);
        const icons = Array.from({ length: GLYPH_POSITION_COORDS.length }, () =>
            pool.imagePool.acquire(ctx.scene),
        );
        [track, fill, bulb, ...icons].forEach((node) =>
            ctx.scratch.root.add(node),
        );
        const slot = {
            track,
            fill,
            bulb,
            icons,
            visible: false,
            renderState: null,
        };
        hideProgressBarSlot(slot);
        return slot;
    });
};

export const hideProgressBarSlots = (slots: ProgressBarSlotState[]) =>
    slots.forEach(hideProgressBarSlot);

export const destroyProgressBarSlots = (
    ctx: DisplayDestroyContext,
    slots: ProgressBarSlotState[],
) => {
    const pool = ctx.pools.get(ctx.spec.display_key);
    slots.forEach((slot) => {
        [slot.track, slot.fill, slot.bulb, ...slot.icons].forEach((node) =>
            ctx.scratch.root.remove(node),
        );
        pool.ropePool.release(slot.track);
        pool.ropePool.release(slot.fill);
        pool.imagePool.release(slot.bulb);
        slot.icons.forEach((icon) => pool.imagePool.release(icon));
    });
};
