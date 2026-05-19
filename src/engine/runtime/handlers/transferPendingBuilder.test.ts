import { describe, expect, it, vi } from "vitest";
import type { CommandHandlerContext } from "./types";
import { buildPendingTransfer } from "./transferPendingBuilder";

const makeContext = (displays?: Record<string, unknown>) =>
    ({
        world: { entities: [] } as any,
        cartridge: { assets: { displays: displays ?? {} } } as any,
        impulseEngine: { getBody: vi.fn(() => null) } as any,
        markEntityListDirty: () => undefined,
        telemetry: { log: vi.fn() },
    }) as CommandHandlerContext;

const impulseConfig = {
    transferNodeMass: 1,
    transferNodeRadius: 8,
    transferNodeDrag: 0.2,
};

describe("buildPendingTransfer", () => {
    it("uses the first payload key as the pending display key", () => {
        const result = buildPendingTransfer({
            source: { id: "a", physics: { x: 1, y: 2 } },
            target: { id: "b", physics: { x: 4, y: 6 } },
            payload: { wood: 2 },
            context: makeContext({ wood: { type: "resource" } }),
            impulseConfig: impulseConfig as any,
        });

        expect((result.pendingEntity.display as any).display_key).toBe("wood");
        expect((result.pendingEntity.transfer as any).visualType).toBe("wood");
        expect((result.pendingEntity as any).render).toBeUndefined();
    });

    it("keeps transfer visual type without snapshotting pretty render data", () => {
        const result = buildPendingTransfer({
            source: { id: "a", physics: { x: 1, y: 2 } },
            target: { id: "b", physics: { x: 4, y: 6 } },
            payload: { heat: 3 },
            context: makeContext({
                heat: {
                    type: "resource",
                    styleId: "heat",
                    glyphKey: "heat_glyph",
                },
            }),
            impulseConfig: impulseConfig as any,
        });

        expect((result.pendingEntity.transfer as any).visualType).toBe("heat");
        expect((result.pendingEntity.display as any).display_key).toBe("heat");
        expect((result.pendingEntity as any).render).toBeUndefined();
    });

    it("uses authored transfer-node radius for both physics representations", () => {
        const result = buildPendingTransfer({
            source: { id: "a", physics: { x: 1, y: 2 } },
            target: { id: "b", physics: { x: 4, y: 6 } },
            payload: { ore: 4 },
            context: makeContext({
                ore: {
                    type: "resource",
                    styleId: "ore",
                    glyphKey: "ore",
                    transferNodeRadiusByValue: {
                        minValue: 2,
                        minRadius: 3,
                        maxValue: 6,
                        maxRadius: 7,
                    },
                },
            }),
            impulseConfig: impulseConfig as any,
        });
        expect((result.pendingEntity.physics as any)?.radius).toBe(5);
        expect(result.body.radius).toBe(5);
    });

    it("falls back when no authored radius rule exists", () => {
        const result = buildPendingTransfer({
            source: { id: "a", physics: { x: 1, y: 2 } },
            target: { id: "b", physics: { x: 4, y: 6 } },
            payload: { ore: 4 },
            context: makeContext({
                ore: { type: "resource", styleId: "ore", glyphKey: "ore" },
            }),
            impulseConfig: impulseConfig as any,
        });
        expect((result.pendingEntity.physics as any)?.radius).toBe(8);
        expect(result.body.radius).toBe(8);
    });

    it("logs error and falls back when authored rule is malformed", () => {
        const context = makeContext({
            ore: {
                type: "resource",
                styleId: "ore",
                glyphKey: "ore",
                transferNodeRadiusByValue: { minValue: 2 },
            },
        });
        const result = buildPendingTransfer({
            source: { id: "a", physics: { x: 1, y: 2 } },
            target: { id: "b", physics: { x: 4, y: 6 } },
            payload: { ore: 4 },
            context,
            impulseConfig: impulseConfig as any,
        });
        expect((result.pendingEntity.physics as any)?.radius).toBe(8);
        expect(result.body.radius).toBe(8);
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("Invalid transferNodeRadiusByValue"),
        );
    });
});
