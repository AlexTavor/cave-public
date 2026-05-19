import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    spawnGoldRings: vi.fn(),
    spawnSmokePuff: vi.fn(),
    created: [] as Array<{
        update: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
    }>,
}));

vi.mock("./runtimeVisualEffectBursts", () => ({
    spawnGoldRings: mocks.spawnGoldRings,
    spawnSmokePuff: mocks.spawnSmokePuff,
}));
vi.mock("./PersistentAttentionRings", () => ({
    PersistentAttentionRings: class {
        public update = vi.fn();
        public destroy = vi.fn();

        public constructor() {
            mocks.created.push(this);
        }
    },
}));

import { RuntimeVisualEffectsManager } from "./RuntimeVisualEffectsManager";

const DEFAULT_BODY = { position: { x: 1, y: 2 }, radius: 3 };

const makeRuntime = (ringEntityIds: string[], body: any = DEFAULT_BODY) => ({
    getEntity: () => ({
        tutorial: {
            active: true,
            attention: { ringEntityIds },
        },
    }),
    getPhysicsBody: () => body,
});

describe("RuntimeVisualEffectsManager attention", () => {
    beforeEach(() => {
        mocks.spawnGoldRings.mockReset();
        mocks.spawnSmokePuff.mockReset();
        mocks.created.length = 0;
    });

    it("keeps burst consumption intact", () => {
        new RuntimeVisualEffectsManager(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        ).consume(
            [{ kind: "spawn_gold_rings", x: 1, y: 2, radius: 3 }] as any,
            null,
            0,
        );
        expect(mocks.spawnGoldRings).toHaveBeenCalled();
    });

    it("creates and destroys persistent rings from tutorial ring ids", () => {
        const manager = new RuntimeVisualEffectsManager(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );
        manager.consume([], makeRuntime(["node"]) as any, 0);
        manager.consume([], makeRuntime([]) as any, 16);
        expect(mocks.created[0]?.update).toHaveBeenCalled();
        expect(mocks.created[0]?.destroy).toHaveBeenCalled();
    });

    it("does not render a persistent ring for the selected entity", () => {
        const manager = new RuntimeVisualEffectsManager(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );
        manager.consume([], makeRuntime(["node"]) as any, 0, "node");
        expect(mocks.created).toHaveLength(0);
    });

    it("skips missing bodies and destroy still clears rings", () => {
        const manager = new RuntimeVisualEffectsManager(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );
        manager.consume([], makeRuntime(["node"], null) as any, 0);
        manager.consume([], makeRuntime(["node"]) as any, 16);
        manager.destroy();
        expect(mocks.created.at(-1)?.destroy).toHaveBeenCalled();
    });
});
