import { describe, expect, it } from "vitest";
import { createSystemBuffer } from "./runtimeSystemBatch";
import { RuntimeCommandType, type RuntimeCommand } from "./types";

const command = (id: string): RuntimeCommand => ({
    type: RuntimeCommandType.SET_TARGET,
    payload: { entityId: id, targetId: null },
});

describe("runtimeSystemBatch", () => {
    it("drain returns commands and empties buffer", () => {
        const buffer = createSystemBuffer();
        buffer.enqueue(command("a"));
        const drained = buffer.drain();
        expect(drained).toHaveLength(1);
        expect(buffer.size()).toBe(0);
    });

    it("transfers ownership of drained array", () => {
        const buffer = createSystemBuffer();
        buffer.enqueue(command("a"));
        const drained = buffer.drain();
        drained.push(command("mutated"));
        expect(drained).toHaveLength(2);
        expect(buffer.size()).toBe(0);
    });

    it("keeps new enqueues isolated from drained array mutation", () => {
        const buffer = createSystemBuffer();
        buffer.enqueue(command("a"));
        const drained = buffer.drain();
        drained.push(command("mutated"));
        buffer.enqueue(command("fresh"));
        expect(buffer.drain()).toEqual([command("fresh")]);
    });
});
