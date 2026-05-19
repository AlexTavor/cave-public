import { describe, expect, it, vi } from "vitest";
import { resolveGlyphPlacementTransform } from "../../glyph/glyphRenderMath";
import { computeTransferScale } from "../../../scenes/gameSceneMath";
import { createTransferGlyphModule } from "./TransferGlyphModule";
import { makeTestGlyph } from "../glyph/GlyphModule.testUtils";
import { makeTransferCtxWithOverlayBounds } from "./TransferDisplayModule.overlayBounds.testUtils";

describe("TransferGlyphModule", () => {
    it("allocates 9 images only in pretty mode and clears mainImage on destroy", () => {
        const glyphRegistry = { get: vi.fn(() => makeTestGlyph(1)) } as any;
        const pretty = makeTransferCtxWithOverlayBounds({
            transfer: { payload: { wood: 9 } },
            render: {
                mode: "pretty",
                visualType: "wood",
                baseRadius: 4,
                glyphPresetKey: "preset_key",
                glyphColor: "#00ff00",
                light: {},
                particles: {},
            },
        });
        const runtime = createTransferGlyphModule(glyphRegistry).create(
            pretty.ctx as never,
        );
        expect(pretty.root.children).toHaveLength(9);
        runtime.destroy(pretty.ctx as never);
        expect(pretty.pool.released).toHaveLength(9);
        expect(pretty.ctx.scratch.mainImage).toBeNull();

        const legacy = makeTransferCtxWithOverlayBounds({
            transfer: { payload: { wood: 9 } },
            render: {
                mode: "legacy",
                visualType: "wood",
                color: "#fff",
                baseRadius: 4,
                effect: "solid",
            },
        });
        createTransferGlyphModule(glyphRegistry).create(legacy.ctx as never);
        expect(legacy.root.children).toHaveLength(0);
    });

    it("uses glyphPresetKey, payload-scaled radius, and glyphColor", () => {
        const get = vi.fn(() => makeTestGlyph(1));
        const setup = makeTransferCtxWithOverlayBounds({
            transfer: { payload: { wood: 9 } },
            render: {
                mode: "pretty",
                visualType: "wood",
                baseRadius: 4,
                glyphPresetKey: "preset_key",
                glyphColor: "#00ff00",
                light: {},
                particles: {},
            },
        });
        const runtime = createTransferGlyphModule({ get } as any).create(
            setup.ctx as never,
        );
        runtime.tick(setup.ctx as never);

        expect(get).toHaveBeenCalledWith("preset_key");
        const radius = computeTransferScale(4, { wood: 9 }).radius;
        const transform = resolveGlyphPlacementTransform({
            radius,
            placement: makeTestGlyph(1).placements[0],
            pulse: makeTestGlyph(1).pulse,
            pulseValue: 0.5,
        });
        expect(setup.root.children[0].scale).toBeCloseTo(transform.imageScale);
        expect(setup.root.children[0].tint).toBe(Number.parseInt("00ff00", 16));
        expect(setup.ctx.scratch.nodeOverlayDisplayBounds).toEqual({
            entityId: "e1",
            centerX: 0,
            topY: -radius,
            bottomY: radius,
        });
    });
});

