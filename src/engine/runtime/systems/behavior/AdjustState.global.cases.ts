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

describe("ActionExecutor global adjustments", () => {
    it("falls back to SET_GLOBAL for global targets", () => {
        const executor = new ActionExecutor();
        const buffer = createBuffer();
        const context = {
            ...buildContext({ id: "e1" }),
            globals: { score: 10 },
            snapshot: {
                getEntity: (id: string) =>
                    id === "sys_world"
                        ? { state: { score: { value: 10 } } }
                        : undefined,
            } as any,
        };

        executor.execute(
            {
                type: "MUTATE",
                target: "global.score",
                op: "ADD",
                value: 5,
            },
            context,
            buffer,
        );

        expect(buffer.buffer[0]).toMatchObject({
            type: RuntimeCommandType.SET_GLOBAL,
            payload: { key: "score", value: 15 },
        });
    });
});
