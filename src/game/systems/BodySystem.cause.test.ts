import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import {
    RuntimeCommandType,
    type CommandBuffer,
    type RuntimeCommand,
} from "../../engine/runtime/types";
import { BodySystem } from "./BodySystem";

const makeBuffer = (): CommandBuffer<RuntimeCommand> & {
    list: RuntimeCommand[];
} => {
    const list: RuntimeCommand[] = [];
    return {
        enqueue: (command: RuntimeCommand) => list.push(command),
        drain: () => [],
        clear: () => {},
        size: () => list.length,
        list,
    } as any;
};

const makeSnapshot = (entity: any) =>
    new Snapshot([entity], { getBody: () => undefined } as any);

describe("BodySystem cause metadata", () => {
    it("stamps starvation on kill commands and leaves survivors unchanged", () => {
        // Given
        const system = new BodySystem({}, 100);
        const buffer = makeBuffer();
        const entity = {
            id: "body-1",
            traits: ["starving"],
            body: {
                xp: 0,
                xpRate: 0,
                level: 1,
                health: 0,
                maxHealth: 1,
                baseAttributes: { body: 1, mind: 1, social: 1 },
                attributes: { body: 1, mind: 1, social: 1 },
                traits: [],
                passport: {},
            },
        };

        // When
        system.tick(makeSnapshot(entity), buffer, 1000);

        // Then
        expect(buffer.list).toContainEqual({
            type: RuntimeCommandType.KILL,
            payload: { entityId: "body-1" },
            metadata: { cause: "starvation" },
        });
    });
});
