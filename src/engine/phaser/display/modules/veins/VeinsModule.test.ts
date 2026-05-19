import { describe, expect, it, vi } from "vitest";
import { makeEdge, makePool, makeState } from "./veinsDisplayTestUtils";

const mocks = vi.hoisted(() => ({
    createEdgeState: vi.fn(() => makeState()),
    disposeEdgeState: vi.fn(),
    tickEdge: vi.fn(),
}));

vi.mock("./veinsEdgeState", () => ({
    createEdgeState: mocks.createEdgeState,
    disposeEdgeState: mocks.disposeEdgeState,
}));
vi.mock("./veinsEdgeTick", () => ({ tickEdge: mocks.tickEdge }));

import { VeinsModule } from "./VeinsModule";

const makeCtx = (edges = [makeEdge()], isSimulationRunning = true) => {
    const pool = makePool();
    const container = {
        setVisible: vi.fn(),
        setAlpha: vi.fn(),
        destroy: vi.fn(),
    };
    const textureManager = {
        getVeinStripTexture: vi.fn(() => "vein-strip:white:default"),
        getShapeTexture: vi.fn(({ shape }) => `${shape}:#ffffff`),
    };
    const ctx = {
        scene: {
            add: { container: vi.fn(() => container) },
            readRuntime: () => null,
        },
        layers: { get: vi.fn(() => ({ add: vi.fn() })) },
        pools: { get: () => pool },
        textureManager,
        pulseEngine: {},
        spec: { display_key: "veins_display" },
        scratch: {},
        entity: { veinsDisplayData: { edges, isSimulationRunning } },
        deltaMs: 16,
    } as any;
    return { ctx, pool, textureManager };
};

describe("VeinsModule", () => {
    it("requests the shared vein strip texture once during creation", () => {
        const setup = makeCtx();
        VeinsModule.create(setup.ctx);
        expect(setup.textureManager.getVeinStripTexture).toHaveBeenCalledTimes(
            1,
        );
    });

    it("routes attribute vein types to distinct white pulse textures", () => {
        const setup = makeCtx([
            makeEdge({ id: "a", veinType: "body" }),
            makeEdge({ id: "b", veinType: "mind" }),
            makeEdge({ id: "c", veinType: "social" }),
            makeEdge({ id: "d", veinType: "nervous" }),
        ]);
        VeinsModule.create(setup.ctx).tick(setup.ctx);
        expect(setup.textureManager.getShapeTexture.mock.calls).toEqual([
            [{ shape: "plus_rounded", color: "#ffffff" }],
            [{ shape: "chevron_up_rounded", color: "#ffffff" }],
            [{ shape: "triple_circle", color: "#ffffff" }],
            [{ shape: "circle", color: "#ffffff" }],
        ]);
    });

    it("falls back to a circle texture for unknown vein types", () => {
        const setup = makeCtx([
            makeEdge({ id: "unknown", veinType: "mystery" }),
        ]);
        VeinsModule.create(setup.ctx).tick(setup.ctx);
        expect(setup.textureManager.getShapeTexture).toHaveBeenCalledWith({
            shape: "circle",
            color: "#ffffff",
        });
    });

    it("preserves the other tickEdge arguments while supplying a per-edge texture key", () => {
        const edge = makeEdge({ id: "body-edge", veinType: "body" });
        const setup = makeCtx([edge]);
        VeinsModule.create(setup.ctx).tick(setup.ctx);
        expect(mocks.createEdgeState).toHaveBeenCalledWith(
            setup.ctx.scene,
            setup.pool,
            expect.anything(),
            edge.intensity01,
            "vein-strip:white:default",
        );
        expect(mocks.tickEdge).toHaveBeenCalledWith(
            expect.anything(),
            edge,
            16,
            setup.ctx.scene,
            setup.pool,
            "vein-strip:white:default",
            "plus_rounded:#ffffff",
        );
    });

    it("dims veins while runtime attention focuses specific entities", () => {
        const setup = makeCtx();
        setup.ctx.scene.readRuntime = () => ({
            getEntity: () => ({
                tutorial: {
                    active: true,
                    attention: { focusEntityIds: ["egg"] },
                },
            }),
        });
        VeinsModule.create(setup.ctx).tick(setup.ctx);
        expect(
            setup.ctx.scene.add.container.mock.results[0].value.setAlpha,
        ).toHaveBeenCalledWith(0.15);
    });
});
