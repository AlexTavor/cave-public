import { describe, expect, it } from "vitest";
import {
    createBlueprint,
    createEntity,
} from "../../../../engine/test/factories";
import { buildPhysicsBody } from "../../../../engine/runtime/handlers/spawnUtils";
import { gameRebirthCommand } from "./gameRebirthCommand";
import {
    makeKeeperBlueprint,
    makeRebirthRuntime,
    PASSPORT_PERMANENT_TAG,
    rebirthCave,
    rebirthPhysics,
} from "./gameRebirthCommand.testUtils";

describe("gameRebirthCommand integration", () => {
    it("preserves cave data, live carriers, and permanent passport carryover", async () => {
        const oldRuntime = makeRebirthRuntime({
            keeper: makeKeeperBlueprint("Old Keeper", 20, [
                PASSPORT_PERMANENT_TAG,
                "old",
            ]),
        });
        oldRuntime.addEntity(
            createEntity("keeper-1", {
                blueprintId: "keeper",
                tags: [PASSPORT_PERMANENT_TAG, "runtime-old"],
                state: { hp: { value: 7, visible: true, max: 20 } },
                physics: rebirthPhysics,
            }),
        );
        const body = buildPhysicsBody("keeper-1", rebirthPhysics);
        Object.assign(body, {
            position: { x: 30, y: 40 },
            prevPosition: { x: 28, y: 37 },
            acceleration: { x: 4, y: 5 },
            targetId: "goal",
            layer: "phantom",
        });
        oldRuntime.registerPhysicsBody(body);
        oldRuntime.addEntity({
            id: "carrier-1",
            tags: ["carrier"],
            physics: rebirthPhysics,
            carrier: {
                commands: [{ type: "GAIN_HABITI", habitusId: "alpha" }],
            },
            state: { carrier_arrived: { value: 1, visible: false } },
        } as any);
        oldRuntime.registerPhysicsBody(
            buildPhysicsBody("carrier-1", rebirthPhysics as any),
        );
        const newRuntime = makeRebirthRuntime({
            keeper: makeKeeperBlueprint("New Keeper", 30, [
                PASSPORT_PERMANENT_TAG,
                "fresh",
            ]),
        });
        let currentRuntime = oldRuntime;
        const execute = async () => {
            currentRuntime = newRuntime;
            return { type: "success", content: "ok" };
        };

        const result = await gameRebirthCommand.execute([], {
            runtime: { getRuntime: () => currentRuntime },
            registry: { execute },
        } as any);

        expect(result).toEqual({
            type: "success",
            content: "Rebirth complete.",
        });
        expect(newRuntime.getEntity("keeper-1")).toMatchObject({
            label: "New Keeper",
            tags: [PASSPORT_PERMANENT_TAG, "fresh"],
            state: { hp: { value: 7, visible: true, max: 30 } },
        });
        expect(newRuntime.getPhysicsBody("keeper-1")).toMatchObject({
            position: { x: 30, y: 40 },
            targetId: "goal",
            layer: "phantom",
        });
        expect(newRuntime.getEntity("carrier-1")).toMatchObject({
            tags: ["carrier"],
        });
        expect(newRuntime.getEntity("sys_world")).toMatchObject({
            cave: rebirthCave,
            permanent: { thought_seen: { intro: 2 } },
        });
    });

    it("reports skipped permanent entities without failing rebirth", async () => {
        const oldRuntime = makeRebirthRuntime({
            keeper: createBlueprint("keeper", {
                tags: [PASSPORT_PERMANENT_TAG],
            }),
        });
        oldRuntime.addEntity(
            createEntity("keeper-1", {
                blueprintId: "keeper",
                tags: [PASSPORT_PERMANENT_TAG],
            }),
        );
        let currentRuntime = oldRuntime;
        const execute = async () => {
            currentRuntime = makeRebirthRuntime({});
            return { type: "success", content: "ok" };
        };

        const result = await gameRebirthCommand.execute([], {
            runtime: { getRuntime: () => currentRuntime },
            registry: { execute },
        } as any);

        expect(result).toEqual({
            type: "success",
            content: "Rebirth complete. Skipped 1 permanent entities.",
        });
    });
});
