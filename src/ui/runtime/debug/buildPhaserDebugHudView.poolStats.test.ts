import { describe, expect, it } from "vitest";
import { buildPhaserDebugHudView } from "./buildPhaserDebugHudView";

describe("buildPhaserDebugHudView pool leak stats", () => {
    it("prints available-on-scene counts for each pool type", () => {
        const [scene] = buildPhaserDebugHudView(
            [
                {
                    sceneId: "s",
                    phaser: {},
                    display: { pools: { veins: makePool() } },
                } as any,
            ],
            { activeGameCount: 0, canvasCount: 0, cardQueueSize: 0 } as any,
        );

        expect(scene.pools[0]).toContain("aos r1 b2 e3 o4 i5 rp6 g7");
    });
});

const makePool = () => ({
    displayKey: "veins_display",
    rootPool: {
        created: 0,
        available: 0,
        availableOnScene: 1,
        inUse: 0,
        highWaterInUse: 0,
    },
    backgroundAnchorPool: {
        created: 0,
        available: 0,
        availableOnScene: 2,
        inUse: 0,
        highWaterInUse: 0,
    },
    effectsAnchorPool: {
        created: 0,
        available: 0,
        availableOnScene: 3,
        inUse: 0,
        highWaterInUse: 0,
    },
    overlayAnchorPool: {
        created: 0,
        available: 0,
        availableOnScene: 4,
        inUse: 0,
        highWaterInUse: 0,
    },
    imagePool: {
        created: 0,
        available: 0,
        availableOnScene: 5,
        inUse: 0,
        highWaterInUse: 0,
    },
    ropePool: {
        created: 0,
        available: 0,
        availableOnScene: 6,
        inUse: 0,
        highWaterInUse: 0,
    },
    graphicsPool: {
        created: 0,
        available: 0,
        availableOnScene: 7,
        inUse: 0,
        highWaterInUse: 0,
    },
});
