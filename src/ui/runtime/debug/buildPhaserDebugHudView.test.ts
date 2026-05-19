import { describe, expect, it } from "vitest";
import { buildPhaserDebugHudView } from "./buildPhaserDebugHudView";

describe("buildPhaserDebugHudView", () => {
    it("sorts pools by high-water usage and surfaces scene facts", () => {
        const [scene] = buildPhaserDebugHudView(
            [
                {
                    sceneId: "GameScene-1",
                    sceneKey: "GameScene",
                    updatedAtMs: 1,
                    runtime: {
                        id: "runtime-1",
                        tick: 12,
                        status: "running",
                        entityCount: 42,
                        accumulatedTime: 192,
                    },
                    display: {
                        activeInstances: 10,
                        activeByDisplayKey: {},
                        pools: {
                            low: makePool("low", 1, 2),
                            high: makePool("high", 4, 8),
                        },
                    },
                    textures: {
                        totalTextureCount: 9,
                        managedTextureCount: 9,
                        placeholderTextureCount: 1,
                        glyphTextureCount: 2,
                        shapeTextureCount: 3,
                        shapeTextureKeys: [],
                    },
                    phaser: { displayListCount: 11, tweenCount: 5 },
                } as any,
            ],
            {
                activeGameCount: 2,
                canvasCount: 3,
                snapshotRate: "60",
                heapUsedMb: "128",
                heapTotalMb: "256",
                heapLimitMb: "4096",
                snapshotTotal: 999,
                tickSnapshotTotal: 888,
                runtimeSnapshotTotal: 12,
                dirtyMarkTotal: 0,
                entitySortTotal: 0,
                appliedCommandTotal: 0,
                emittedCommandTotal: 0,
                topAppliedType: "none",
                topEmittedType: "none",
                topEmittingSystem: "none",
            },
        );

        expect(
            scene.facts.find((fact) => fact.label === "entities")?.value,
        ).toBe("42");
        expect(scene.facts.find((fact) => fact.label === "games")?.value).toBe(
            "2",
        );
        expect(
            scene.facts.find((fact) => fact.label === "heapUsedMb")?.value,
        ).toBe("128");
        expect(scene.facts.find((fact) => fact.label === "snap/s")?.value).toBe(
            "60",
        );
        expect(scene.pools[0]).toContain("high");
    });
});

const makePool = (displayKey: string, inUse: number, highWater: number) => ({
    displayKey,
    rootPool: { created: 0, available: 0, inUse: 0, highWaterInUse: highWater },
    backgroundAnchorPool: {
        created: 0,
        available: 0,
        inUse: 0,
        highWaterInUse: 0,
    },
    effectsAnchorPool: {
        created: 0,
        available: 0,
        inUse: 0,
        highWaterInUse: 0,
    },
    overlayAnchorPool: {
        created: 0,
        available: 0,
        inUse: 0,
        highWaterInUse: 0,
    },
    imagePool: {
        created: inUse,
        available: 0,
        inUse,
        highWaterInUse: highWater,
    },
    ropePool: { created: 0, available: 0, inUse: 0, highWaterInUse: 0 },
    graphicsPool: {
        created: inUse,
        available: 0,
        inUse,
        highWaterInUse: highWater,
    },
});
