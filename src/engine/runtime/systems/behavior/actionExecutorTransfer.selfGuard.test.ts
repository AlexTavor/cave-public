import { describe, it, expect } from "vitest";
import { executeTransferAction } from "./actionExecutorTransfer";
import {
    createCommandBuffer,
    buildBehaviorContext,
} from "./actionExecutorTestUtils";
import { ValueResolver } from "./ValueResolver";
import type { TransferAction } from "../../../../data/schemas/behavior";
import type { RuntimeEntity } from "../../types";

const makeEntity = (id: string, gold = 10): RuntimeEntity => ({
    id,
    state: { gold: { value: gold, max: 100 } },
    tags: ["storage:gold"],
});

describe("actionExecutorTransfer self-guard", () => {
    it("drops transfer when source resolves to self", () => {
        const entity = makeEntity("e1");
        const { buffer, commands } = createCommandBuffer();
        const ctx = buildBehaviorContext({
            self: entity,
            entities: [entity],
        });

        const action: TransferAction = {
            type: "TRANSFER",
            source: "self",
            target: "self",
            resource: "gold",
            amount: 5,
        };

        executeTransferAction(action, ctx, commands, new ValueResolver());
        expect(buffer).toHaveLength(0);
    });

    it("emits transfer when source differs from target", () => {
        const source = makeEntity("store_1", 50);
        const target = makeEntity("consumer_1", 0);
        const { buffer, commands } = createCommandBuffer();
        const ctx = buildBehaviorContext({
            self: target,
            entities: [source, target],
        });

        const action: TransferAction = {
            type: "TRANSFER",
            source: "store_1",
            target: "self",
            resource: "gold",
            amount: 5,
        };

        executeTransferAction(action, ctx, commands, new ValueResolver());
        expect(buffer).toHaveLength(1);
        expect(buffer[0]).toMatchObject({
            payload: { sourceId: "store_1", targetId: "consumer_1" },
        });
    });
});
