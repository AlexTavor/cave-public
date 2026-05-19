import { describe, expect, it, vi } from "vitest";

vi.mock("../../../utils/TextureManager", () => ({
    STANDARD_TEXTURE_RADIUS: 64,
}));

import { STANDARD_TEXTURE_RADIUS } from "../../../utils/TextureManager";
import { computeTransferScale } from "../../../scenes/gameSceneMath";
import { TransferModule } from "./TransferModule";
import { makeTransferCtxWithOverlayBounds } from "./TransferDisplayModule.overlayBounds.testUtils";

describe("TransferModule", () => {
    it("allocates one background image only in legacy mode", () => {
        const legacy = makeTransferCtxWithOverlayBounds({
            transfer: { payload: { wood: 2 } },
            render: {
                mode: "legacy",
                visualType: "wood",
                color: "#fff",
                baseRadius: 4,
                effect: "solid",
            },
        });
        TransferModule.create(legacy.ctx as never);
        expect(legacy.backgroundAnchor.children).toHaveLength(1);

        const pretty = makeTransferCtxWithOverlayBounds({
            transfer: { payload: { wood: 2 } },
            render: {
                mode: "pretty",
                visualType: "wood",
                baseRadius: 4,
                glyphPresetKey: "wood",
                glyphColor: "#fff",
                light: {},
                particles: {},
            },
        });
        TransferModule.create(pretty.ctx as never);
        expect(pretty.backgroundAnchor.children).toHaveLength(0);
    });

    it("preserves the legacy transfer scaling behavior and clears scratch on destroy", () => {
        const setup = makeTransferCtxWithOverlayBounds({
            transfer: { payload: { wood: 9 } },
            render: {
                mode: "legacy",
                visualType: "wood",
                color: "#fff",
                baseRadius: 4,
                effect: "solid",
            },
        });
        const runtime = TransferModule.create(setup.ctx as never);
        runtime.tick(setup.ctx as never);

        const expected =
            Math.max(10, computeTransferScale(4, { wood: 9 }).radius) /
            STANDARD_TEXTURE_RADIUS;
        expect(setup.backgroundAnchor.children[0].scale).toBeCloseTo(expected);
        expect(setup.ctx.scratch.nodeOverlayDisplayBounds).toEqual({
            entityId: "e1",
            centerX: 0,
            topY: -Math.max(10, computeTransferScale(4, { wood: 9 }).radius),
            bottomY: Math.max(10, computeTransferScale(4, { wood: 9 }).radius),
        });

        runtime.destroy(setup.ctx as never);
        expect(setup.pool.released).toHaveLength(1);
        expect(setup.ctx.scratch.backgroundImage).toBeNull();
    });
});

