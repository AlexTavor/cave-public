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

const makeSnapshot = (entities: any[]) =>
    new Snapshot(entities, { getBody: () => undefined } as any);

describe("BodySystem identity backfill", () => {
    it("backfills blank passports and persists the serial allocator", () => {
        const buffer = makeBuffer();
        new BodySystem({}, 100).tick(
            makeSnapshot([
                { id: "sys_world", state: { bodySerial: { value: 4 } } },
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
                        passport: {
                            name: "",
                            portraitIcon: "worker",
                            glyphKey: "sigil",
                        },
                    },
                },
            ]),
            buffer,
            1000,
        );
        expect(buffer.commands).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: RuntimeCommandType.UPDATE_STATE,
                    payload: expect.objectContaining({
                        key: "bodySerial",
                        value: 5,
                    }),
                }),
                expect.objectContaining({
                    type: RuntimeCommandType.UPDATE_BODIES_BATCH,
                    payload: expect.objectContaining({
                        updates: [
                            expect.objectContaining({
                                passport: expect.objectContaining({
                                    identitySerial: 5,
                                    avatarDisplayKey: "body_avatar:5",
                                    name: expect.any(String),
                                }),
                            }),
                        ],
                    }),
                }),
            ]),
        );
    });

    it("allocates identitySerial without overwriting authored names", () => {
        const buffer = makeBuffer();
        new BodySystem({}, 100).tick(
            makeSnapshot([
                { id: "sys_world", state: {} },
                {
                    id: "body-2",
                    body: {
                        xp: 0,
                        xpRate: 0,
                        level: 1,
                        health: 10,
                        maxHealth: 10,
                        baseAttributes: { body: 1, mind: 1, social: 1 },
                        attributes: { body: 1, mind: 1, social: 1 },
                        traits: [],
                        passport: { name: "Authored" },
                    },
                },
            ]),
            buffer,
            1000,
        );
        const batch = buffer.commands.find(
            (command: RuntimeCommand) =>
                command.type === RuntimeCommandType.UPDATE_BODIES_BATCH,
        );
        expect(batch.payload.updates[0].passport).toEqual({
            identitySerial: 1,
            avatarDisplayKey: "body_avatar:1",
        });
        expect(batch.payload.updates[0].habiti).toBeUndefined();
    });
});
