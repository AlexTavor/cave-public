import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../engine/runtime/types";
import { executeDraftCompletion } from "./triggerDraftCompletion";

describe("executeDraftCompletion provenance", () => {
    it("stamps onComplete behavior commands with draft completion provenance", () => {
        // Given
        const commands: RuntimeCommand[] = [];
        const world = new World<any>();
        world.add({ id: "sys_world", state: { wood: { value: 1 } } });

        // When
        executeDraftCompletion(
            [{ type: "MUTATE", target: "global.wood", op: "ADD", value: 2 }],
            { id: "reward-node" } as any,
            {
                world,
                impulseEngine: { getBody: () => undefined },
                cartridge: { blueprints: {} },
                commands: {
                    enqueue: (command: RuntimeCommand) =>
                        commands.push(command),
                    drain: () => [],
                    clear: () => {},
                    size: () => commands.length,
                },
            } as any,
        );

        // Then
        expect(commands).toContainEqual({
            type: RuntimeCommandType.SET_GLOBAL,
            payload: { key: "wood", value: 3 },
            metadata: {
                sourceEntityId: "reward-node",
                sourceLane: "draft_on_complete",
            },
        });
    });
});
