import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import type { RuntimeCommand, RuntimeEntity } from "../../types";
import type { BehaviorContext } from "./ValueResolver";
import { RuntimeCommandType } from "../../types";

const createBuffer = () => {
    const buffer: RuntimeCommand[] = [];
    return {
        buffer,
        commands: {
            enqueue: (command: RuntimeCommand) => buffer.push(command),
            drain: () => buffer.splice(0, buffer.length),
            clear: () => buffer.splice(0, buffer.length),
            size: () => buffer.length,
        },
    };
};

const buildContext = (entity: RuntimeEntity): BehaviorContext => ({
    snapshot: { getEntity: () => undefined } as any,
    globals: {},
    self: entity,
    sourceLane: "behavior_rule",
});

describe("ActionExecutor trait actions", () => {
    it("adds a trait once and avoids duplicates", () => {
        const executor = new ActionExecutor();
        const entity: RuntimeEntity = {
            id: "worker",
            traits: [{ id: "strong" }],
        };
        const { buffer, commands } = createBuffer();

        executor.execute(
            { type: "ADD_TRAIT", traitId: "hungry" },
            buildContext(entity),
            commands,
        );

        expect(buffer).toEqual([
            expect.objectContaining({
                type: RuntimeCommandType.UPDATE_TRAITS_BATCH,
                payload: {
                    updates: [
                        {
                            entityId: "worker",
                            traits: [{ id: "strong" }, { id: "hungry" }],
                        },
                    ],
                },
                metadata: {
                    sourceEntityId: "worker",
                    sourceLane: "behavior_rule",
                },
            }),
        ]);

        buffer.length = 0;

        executor.execute(
            { type: "ADD_TRAIT", traitId: "strong" },
            buildContext(entity),
            commands,
        );

        expect(buffer).toHaveLength(0);
    });
});

