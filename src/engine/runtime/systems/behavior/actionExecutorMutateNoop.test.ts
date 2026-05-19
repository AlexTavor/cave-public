import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import type { RuntimeEntity } from "../../types";
import {
    buildBehaviorContext,
    createCommandBuffer,
} from "./actionExecutorTestUtils";

describe("ActionExecutor mutate no-op suppression", () => {
    it("skips UPDATE_STATE when SET matches current value", () => {
        const executor = new ActionExecutor();
        const self: RuntimeEntity = {
            id: "entity_a",
            state: { hp: { value: 10 } },
        };
        const { buffer, commands } = createCommandBuffer();

        executor.execute(
            {
                type: "MUTATE",
                target: "self.state.hp.value",
                op: "SET",
                value: 10,
            },
            buildBehaviorContext({ self, entities: [self] }),
            commands,
        );

        expect(buffer).toEqual([]);
    });

    it("skips UPDATE_STATE for unchanged sys_world state targets", () => {
        const executor = new ActionExecutor();
        const self: RuntimeEntity = { id: "entity_a" };
        const world: RuntimeEntity = {
            id: "sys_world",
            state: { heat: { value: 5 } },
        };
        const { buffer, commands } = createCommandBuffer();

        executor.execute(
            {
                type: "MUTATE",
                target: "sys_world.state.heat.value",
                op: "SET",
                value: 5,
            },
            buildBehaviorContext({
                self,
                entities: [self, world],
                globals: { heat: 5 },
            }),
            commands,
        );

        expect(buffer).toEqual([]);
    });
});
