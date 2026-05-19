import { describe, expect, it } from "vitest";
import { resolveContention } from "./ContentionResolver";
import { RuntimeCommandType, type RuntimeCommand } from "../types";

const transfer = (
    sourceId: string,
    targetId: string,
    payload: Record<string, number>,
): RuntimeCommand => ({
    type: RuntimeCommandType.TRANSFER_ASSETS,
    payload: { sourceId, targetId, payload },
});

const kill = (entityId: string): RuntimeCommand => ({
    type: RuntimeCommandType.KILL,
    payload: { entityId },
});

const makeSnapshot = (entities: Record<string, Record<string, unknown>>) =>
    ({
        getEntity: (id: string) => entities[id],
    }) as any;

describe("ContentionResolver", () => {
    it("sorts transfer requests by configured source value DESC", () => {
        const commands = [
            transfer("a", "t", { mana: 1 }),
            transfer("b", "t", { mana: 1 }),
            transfer("c", "t", { mana: 1 }),
        ];
        const snapshot = makeSnapshot({
            a: { body: { level: 1 } },
            b: { body: { level: 10 } },
            c: { body: { level: 5 } },
        });

        const output = resolveContention(commands, snapshot, () => [
            { resource: "mana", sortBy: "body.level", direction: "DESC" },
        ]);

        expect((output[0] as any).payload.sourceId).toBe("b");
        expect((output[1] as any).payload.sourceId).toBe("c");
        expect((output[2] as any).payload.sourceId).toBe("a");
    });

    it("keeps FIFO when no contention rules exist", () => {
        const commands = [
            transfer("a", "t", { food: 1 }),
            transfer("b", "t", { food: 1 }),
        ];

        const output = resolveContention(commands, makeSnapshot({}), () => []);
        expect((output[0] as any).payload.sourceId).toBe("a");
        expect((output[1] as any).payload.sourceId).toBe("b");
    });

    it("falls back to 0 for invalid sort paths without crashing", () => {
        const commands = [
            transfer("a", "t", { food: 1 }),
            transfer("b", "t", { food: 1 }),
        ];

        const output = resolveContention(
            commands,
            makeSnapshot({ a: {}, b: {} }),
            () => [
                { resource: "food", sortBy: "invalid.path", direction: "DESC" },
            ],
        );

        expect((output[0] as any).payload.sourceId).toBe("a");
        expect((output[1] as any).payload.sourceId).toBe("b");
    });

    it("sorts only resources that have matching rules", () => {
        const commands = [
            transfer("a", "t", { wood: 1 }),
            transfer("b", "t", { food: 1 }),
            transfer("c", "t", { food: 1 }),
        ];
        const snapshot = makeSnapshot({
            b: { body: { xp: 10 } },
            c: { body: { xp: 1 } },
        });

        const output = resolveContention(commands, snapshot, () => [
            { resource: "food", sortBy: "body.xp", direction: "DESC" },
        ]);

        expect((output[0] as any).payload.payload.wood).toBe(1);
        expect((output[1] as any).payload.sourceId).toBe("b");
        expect((output[2] as any).payload.sourceId).toBe("c");
    });

    it("moves non-transfer commands ahead of transfer commands", () => {
        const commands = [
            transfer("a", "t", { food: 1 }),
            kill("entity-1"),
            transfer("b", "t", { food: 1 }),
        ];
        const snapshot = makeSnapshot({
            a: { body: { xp: 1 } },
            b: { body: { xp: 10 } },
        });

        const output = resolveContention(commands, snapshot, () => [
            { resource: "food", sortBy: "body.xp", direction: "DESC" },
        ]);

        expect(output[0].type).toBe(RuntimeCommandType.KILL);
        expect((output[1] as any).payload.sourceId).toBe("b");
        expect((output[2] as any).payload.sourceId).toBe("a");
    });
});
