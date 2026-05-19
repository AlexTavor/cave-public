import { describe, expect, it, vi } from "vitest";
import { CaveBackgroundModule } from "./CaveBackgroundModule";
import { makeCaveCtx } from "./CaveBackgroundModule.testUtils";

describe("CaveBackgroundModule", () => {
    it("acquires exactly two graphics", () => {
        const ctx = makeCaveCtx();
        CaveBackgroundModule.create(ctx.ctx as never);
        expect(ctx.acquired).toHaveLength(2);
    });

    it("hides both graphics when physics is absent", () => {
        const ctx = makeCaveCtx();
        ctx.ctx.spec.hasPhysics = false;
        CaveBackgroundModule.create(ctx.ctx as never).tick(ctx.ctx as never);
        expect(
            ctx.acquired.every((graphics) => graphics.visible === false),
        ).toBe(true);
    });

    it("hides and logs once when render.fur is missing", () => {
        const ctx = makeCaveCtx({ cave: { mind: { render: {} } } });
        const spy = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
        CaveBackgroundModule.create(ctx.ctx as never).tick(ctx.ctx as never);
        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining("Missing render.fur"),
        );
        expect(
            ctx.acquired.every((graphics) => graphics.visible === false),
        ).toBe(true);
        spy.mockRestore();
    });

    it("draws body and hairs without any border stroke", () => {
        const ctx = makeCaveCtx();
        CaveBackgroundModule.create(ctx.ctx as never).tick(ctx.ctx as never);
        expect(ctx.acquired[0].fillCalls).toBeGreaterThan(0);
        expect(ctx.acquired[1].fillCalls).toBeGreaterThan(0);
        expect(ctx.acquired[0].strokeCalls).toBe(0);
        expect(ctx.acquired[1].strokeCalls).toBe(0);
    });

    it("releases graphics and nulls scratch on destroy", () => {
        const ctx = makeCaveCtx();
        const runtime = CaveBackgroundModule.create(ctx.ctx as never);
        runtime.destroy(ctx.ctx as never);
        expect(ctx.released).toHaveLength(2);
        expect(ctx.ctx.scratch.caveFillGraphics).toBeNull();
        expect(ctx.ctx.scratch.caveHairGraphics).toBeNull();
    });
});
