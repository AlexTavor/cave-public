import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../veins/veinsRopeRenderer", () => ({ syncVeinRope: vi.fn() }));
vi.mock("./progressBarIcon", () => ({ tickProgressBarIcon: vi.fn() }));
import { syncVeinRope } from "../veins/veinsRopeRenderer";
import { tickProgressBars } from "./progressBarTick";

const makeNode = () => {
    const node: any = {};
    ["setVisible", "setTexture", "setTint", "setPosition", "setScale"].forEach(
        (key) => (node[key] = vi.fn(() => node)),
    );
    return node;
};

const makeSlot = () => ({
    track: makeNode(),
    fill: makeNode(),
    bulb: makeNode(),
    icons: [makeNode()],
    visible: false,
    renderState: null,
});

const makeInput = (value = 1) => {
    const slot = makeSlot();
    return {
        slot,
        input: {
            ctx: {
                entity: { state: { food: { value, max: 10 } } },
                spec: {
                    entityId: "node",
                    x: 2,
                    y: 3,
                    radius: 20,
                    displayBars: [
                        {
                            key: "state.food",
                            maxKey: "state.food.max",
                            position: "top_left",
                            color: "#00ff00",
                        },
                    ],
                },
                textureManager: {
                    getProgressBarStripTexture: () => "strip",
                    getShapeTexture: () => "bulb",
                },
                pulseEngine: { getAllNodeColors: () => undefined },
                scratch: { nodeOverlayDisplayBounds: null },
            } as any,
            slots: [slot, makeSlot(), makeSlot(), makeSlot()],
            glyphRegistry: {} as any,
            geometryCache: new Map(),
            loggedDuplicates: new Set<string>(),
        },
    };
};

describe("progressBarTick", () => {
    beforeEach(() => vi.mocked(syncVeinRope).mockClear());

    it("does not hide an already hidden inactive slot again", () => {
        const { slot, input } = makeInput();
        input.ctx.spec.displayBars = [];
        tickProgressBars(input as any);
        expect(slot.track.setVisible).not.toHaveBeenCalled();
    });

    it("does not rewrite track geometry when an active bar is unchanged", () => {
        const { input } = makeInput();
        tickProgressBars(input as any);
        tickProgressBars(input as any);
        expect(vi.mocked(syncVeinRope)).toHaveBeenCalledTimes(2);
    });

    it("updates only the fill rope when the ratio changes", () => {
        const { slot, input } = makeInput();
        tickProgressBars(input as any);
        vi.mocked(syncVeinRope).mockClear();
        input.ctx.entity.state.food.value = 2;
        tickProgressBars(input as any);
        expect(vi.mocked(syncVeinRope).mock.calls).toHaveLength(1);
        expect(vi.mocked(syncVeinRope).mock.calls[0]?.[0]).toBe(slot.fill);
    });
});
