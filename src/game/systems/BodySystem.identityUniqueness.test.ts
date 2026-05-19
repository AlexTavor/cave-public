import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../engine/runtime/types";
import { BodySystem } from "./BodySystem";

const makeBuffer = () => {
    const commands: RuntimeCommand[] = [];
    return {
        commands,
        enqueue: (command: RuntimeCommand) => commands.push(command),
    } as any;
};

describe("BodySystem identity uniqueness", () => {
    it("avoids generating a name already used by another entity", () => {
        const buffer = makeBuffer();
        new BodySystem({}, 100).tick(
            new Snapshot(
                [
                    { id: "sys_world", state: {} },
                    {
                        id: "existing",
                        body: { passport: { name: "Ada Marshley" } },
                    },
                    {
                        id: "body-1",
                        body: {
                            xp: 0,
                            xpRate: 0,
                            level: 1,
                            health: 10,
                            maxHealth: 10,
                            baseAttributes: { body: 1, mind: 1, social: 1 },
                            attributes: { body: 1, mind: 1, social: 1 },
                            traits: [],
                            passport: { name: "" },
                        },
                    },
                ],
                { getBody: () => undefined } as any,
            ),
            buffer,
            1000,
        );
        const batch = buffer.commands.find(
            (command: RuntimeCommand) =>
                command.type === RuntimeCommandType.UPDATE_BODIES_BATCH,
        ) as Extract<
            RuntimeCommand,
            { type: RuntimeCommandType.UPDATE_BODIES_BATCH }
        >;
        expect(batch.payload.updates[0].passport?.name).not.toBe(
            "Ada Marshley",
        );
    });
});
