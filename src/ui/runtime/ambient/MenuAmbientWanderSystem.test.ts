import { describe, expect, it } from "vitest";
import { MenuAmbientWanderSystem } from "./MenuAmbientWanderSystem";

const config = {
    entityCount: 1,
    minSpeedPxPerSecond: 20,
    maxSpeedPxPerSecond: 20,
    retargetIntervalMsMin: 1,
    retargetIntervalMsMax: 1,
    speedCurve: [{ t: 0, v: 1 }],
} as const;

const snapshot = {
    query: () => [{ id: "menu_anchor_0" }],
    getPhysicsBody: () => ({ x: 10, y: 20 }),
} as any;

describe("MenuAmbientWanderSystem", () => {
    it("reuses the same POSITION_ENTITY command per anchor", () => {
        const system = new MenuAmbientWanderSystem({
            config: config as never,
            seed: "seed",
            worldWidth: () => 100,
            worldHeight: () => 100,
        });
        const queue: any[] = [];
        const commands = { enqueue: (command: unknown) => queue.push(command) };

        system.tick(snapshot, commands, 16);
        const first = queue[0];
        system.tick(snapshot, commands, 16);

        expect(queue[1]).toBe(first);
        expect(queue[1].payload.id).toBe("menu_anchor_0");
    });
});
