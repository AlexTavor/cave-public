import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    spawnGoldRings: vi.fn(),
    spawnSmokePuff: vi.fn(),
}));

vi.mock("./runtimeVisualEffectBursts", () => ({
    BODY_PICKUP_RING_COUNT: 3,
    spawnGoldRings: mocks.spawnGoldRings,
    spawnSmokePuff: mocks.spawnSmokePuff,
}));

import { RuntimeVisualEffectsManager } from "./RuntimeVisualEffectsManager";

const createScene = () => ({ cameras: { main: { shake: vi.fn() } } }) as any;
const createManager = (scene = createScene()) => ({
    scene,
    manager: new RuntimeVisualEffectsManager(
        scene,
        {} as any,
        {} as any,
        {} as any,
    ),
});

describe("RuntimeVisualEffectsManager death shake", () => {
    beforeEach(() => {
        mocks.spawnGoldRings.mockReset();
        mocks.spawnSmokePuff.mockReset();
    });

    it("triggers one camera shake when one shake event is consumed", () => {
        const { scene, manager } = createManager();
        manager.consume([{ kind: "body_death_camera_shake" }], null, 0);
        expect(scene.cameras.main.shake).toHaveBeenCalledWith(220, 0.02, true);
    });

    it("triggers one camera shake when multiple shake events are consumed", () => {
        const { scene, manager } = createManager();
        manager.consume(
            [
                { kind: "body_death_camera_shake" },
                { kind: "body_death_camera_shake" },
            ],
            null,
            0,
        );
        expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);
    });

    it("uses a shorter ring burst for body pickup effects", () => {
        const { manager } = createManager();
        manager.consume(
            [
                {
                    kind: "spawn_body_pickup_effect",
                    x: 1,
                    y: 2,
                    radius: 3,
                    entityId: "a",
                },
            ] as any,
            null,
            0,
        );
        expect(mocks.spawnGoldRings).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            1,
            2,
            3,
            3,
        );
    });

    it("uses the same shorter ring burst for body drop effects", () => {
        const { manager } = createManager();
        manager.consume(
            [
                {
                    kind: "spawn_body_drop_effect",
                    x: 4,
                    y: 5,
                    radius: 6,
                    entityId: "b",
                },
            ] as any,
            null,
            0,
        );
        expect(mocks.spawnGoldRings).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            4,
            5,
            6,
            3,
        );
    });

    it("keeps existing burst handling intact", () => {
        const { scene, manager } = createManager();
        manager.consume(
            [
                {
                    kind: "spawn_gold_rings",
                    x: 1,
                    y: 2,
                    radius: 3,
                    entityId: "a",
                },
                { kind: "body_death_camera_shake" },
                {
                    kind: "kill_smoke_puff",
                    x: 4,
                    y: 5,
                    radius: 6,
                    entityId: "b",
                },
            ] as any,
            null,
            0,
        );
        expect(mocks.spawnGoldRings).toHaveBeenCalledTimes(1);
        expect(mocks.spawnSmokePuff).toHaveBeenCalledTimes(1);
        expect(scene.cameras.main.shake).toHaveBeenCalledTimes(1);
    });
});
