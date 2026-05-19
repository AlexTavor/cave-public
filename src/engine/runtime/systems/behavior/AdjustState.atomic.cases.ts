import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import { BehaviorContext } from "./ValueResolver";
import { RuntimeCommand, RuntimeCommandType, RuntimeEntity } from "../../types";

const createBuffer = () => {
    const buffer: RuntimeCommand[] = [];
    return {
        buffer,
        enqueue: (command: RuntimeCommand) => buffer.push(command),
        drain: () => [],
        clear: () => {},
        size: () => buffer.length,
    };
};

const buildContext = (entity: RuntimeEntity): BehaviorContext => ({
    snapshot: { getEntity: () => undefined } as any,
    globals: {},
    self: entity,
    sourceLane: "behavior_rule",
});

describe("ActionExecutor atomic adjustments", () => {
    it("emits ADJUST_STATE for add and sub operations", () => {
        const executor = new ActionExecutor();
        const entity = { id: "e1", state: { hp: { value: 10 } } };
        const addBuffer = createBuffer();

        executor.execute(
            {
                type: "MUTATE",
                target: "self.state.hp.value",
                op: "ADD",
                value: 5,
            },
            buildContext(entity),
            addBuffer,
        );

        expect(addBuffer.buffer[0]).toMatchObject({
            type: RuntimeCommandType.ADJUST_STATE,
            payload: { entityId: "e1", key: "hp", delta: 5 },
        });

        const subBuffer = createBuffer();
        executor.execute(
            {
                type: "MUTATE",
                target: "self.state.hp.value",
                op: "SUB",
                value: 3,
            },
            buildContext(entity),
            subBuffer,
        );

        expect(subBuffer.buffer[0]).toMatchObject({
            type: RuntimeCommandType.ADJUST_STATE,
            payload: { entityId: "e1", key: "hp", delta: -3 },
        });
    });

    it("emits UPDATE_STATE for set operations", () => {
        const executor = new ActionExecutor();
        const buffer = createBuffer();

        executor.execute(
            {
                type: "MUTATE",
                target: "self.state.hp.value",
                op: "SET",
                value: 100,
            },
            buildContext({ id: "e1", state: { hp: { value: 10 } } }),
            buffer,
        );

        expect(buffer.buffer[0]).toMatchObject({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId: "e1", key: "hp", value: 100 },
        });
    });
});
