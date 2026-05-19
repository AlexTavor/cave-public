import { describe, expect, it } from "vitest";
import { createCartridge, createEntity } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { serialize } from "./RuntimeSerializer";
import { hydrateRuntime } from "./hydrateRuntime";

const makeRuntime = (cartridge = createCartridge("test")) =>
    new Runtime(cartridge, "seed-1", new CommandsManager());

describe("hydrateRuntime sys_world rebasing", () => {
    it("rebases raw saved sys_world onto current config while keeping runtime state", () => {
        const source = makeRuntime();
        source.addEntity(
            createEntity("sys_world", {
                tags: ["stale-tag"],
                passiveEffects: [
                    { op: "ADD", target: "self.state.food.value" },
                ],
                behavior: {
                    rules: [
                        {
                            id: "stale_rule",
                            sortKey: "0",
                            conditions: [],
                            actions: [],
                        },
                    ],
                },
                state: {
                    food: { value: 150, max: 240 },
                    heat: { value: 70, max: 90 },
                },
            }),
        );

        const target = makeRuntime();
        hydrateRuntime(target, serialize(source, "sys-world-test"));

        const world = target.getEntity("sys_world") as any;
        expect(world.tags).toContain("body_provider");
        expect(world.tags).not.toContain("stale-tag");
        expect(world.state.food).toMatchObject({
            value: 150,
            max: 240,
            preserveValueOnMaxDecrease: true,
        });
        expect(world.behavior.rules.map((rule: any) => rule.id)).toEqual(
            expect.arrayContaining(["sys_auto_req_food_set_floor_max_0"]),
        );
        expect(world.behavior.rules.map((rule: any) => rule.id)).not.toContain(
            "stale_rule",
        );
    });
});
