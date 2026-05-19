import { describe, expect, it } from "vitest";
import { CaveBackgroundModule } from "./CaveBackgroundModule";
import { makeCaveCtx } from "./CaveBackgroundModule.testUtils";

describe("CaveBackgroundModule node overlay bounds", () => {
    it("publishes display bounds that span above and below the cave center", () => {
        const ctx = makeCaveCtx();
        CaveBackgroundModule.create(ctx.ctx as never).tick(ctx.ctx as never);
        const bounds = ctx.ctx.scratch.nodeOverlayDisplayBounds as {
            entityId: string;
            topY: number;
            bottomY: number;
        } | null;
        expect(bounds).toEqual(expect.objectContaining({ entityId: "cave" }));
        if (!bounds) return;
        expect(bounds.topY).toBeLessThan(ctx.ctx.spec.y);
        expect(bounds.bottomY).toBeGreaterThan(ctx.ctx.spec.y);
    });

    it("does not invent custom bounds when physics is absent", () => {
        const ctx = makeCaveCtx();
        ctx.ctx.spec.hasPhysics = false;
        ctx.ctx.scratch.nodeOverlayDisplayBounds = null;
        CaveBackgroundModule.create(ctx.ctx as never).tick(ctx.ctx as never);
        expect(ctx.ctx.scratch.nodeOverlayDisplayBounds).toBeNull();
    });
});
