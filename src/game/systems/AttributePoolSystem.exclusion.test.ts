import { describe, expect, it } from "vitest";
import { AttributePoolSystem } from "./AttributePoolSystem";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { makeBody, makeBuffer, makeSnapshot } from "./systemTestUtils";

const makeWorld = (state: Record<string, { value: number }> = {}) => ({
    id: "sys_world",
    state,
});

describe("AttributePoolSystem exclusions", () => {
    it("keeps station-assigned bodies in world totals", () => {
        const snapshot = makeSnapshot([
            makeWorld() as any,
            makeBody("free", { body: 4, mind: 2, social: 1 }) as any,
            makeBody("assigned_body", { body: 9, mind: 9, social: 9 }) as any,
            {
                id: "station",
                assignment: { assignedIds: ["assigned_body"] },
            } as any,
        ]);
        const buffer = makeBuffer();

        new AttributePoolSystem().tick(snapshot, buffer, 20);

        const updates = buffer.commands.filter(
            (c) => c.type === RuntimeCommandType.UPDATE_STATE,
        );
        expect(updates).toEqual([
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "power_body",
                    value: 13,
                    visible: true,
                },
            },
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "power_mind",
                    value: 11,
                    visible: true,
                },
            },
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "power_social",
                    value: 10,
                    visible: true,
                },
            },
        ]);
    });

    it("still skips locked bodies from world totals", () => {
        const snapshot = makeSnapshot([
            makeWorld() as any,
            makeBody("free", { body: 4, mind: 2, social: 1 }) as any,
            {
                ...makeBody("locked", { body: 9, mind: 9, social: 9 }),
                state: { flag_locked: { value: true } },
            } as any,
        ]);
        const buffer = makeBuffer();

        new AttributePoolSystem().tick(snapshot, buffer, 20);

        expect(
            buffer.commands
                .filter((c) => c.type === RuntimeCommandType.UPDATE_STATE)
                .map((command) => command.payload.value),
        ).toEqual([4, 2, 1]);
    });

    it("skips updates when world totals already match", () => {
        const snapshot = makeSnapshot([
            makeWorld({
                power_body: { value: 6 },
                power_mind: { value: 3 },
                power_social: { value: 2 },
            }) as any,
            makeBody("free", { body: 6, mind: 3, social: 2 }) as any,
        ]);
        const buffer = makeBuffer();

        new AttributePoolSystem().tick(snapshot, buffer, 20);

        expect(buffer.commands).toEqual([]);
    });
});
