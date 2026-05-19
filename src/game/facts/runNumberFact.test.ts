import { describe, expect, it, vi } from "vitest";
import { enqueueRunNumberBootstrap } from "./runNumberFact";

const makeCommands = () => ({ enqueue: vi.fn() });

describe("runNumberFact", () => {
    it("enqueues run 1 for a fresh lineage", () => {
        const commands = makeCommands();

        const nextRunNumber = enqueueRunNumberBootstrap(commands as any, 0);

        expect(nextRunNumber).toBe(1);
        expect(commands.enqueue.mock.calls).toEqual([
            [
                {
                    type: "ADJUST_FACT",
                    payload: {
                        scope: "run",
                        factType: "run_number",
                        factAbout: "world",
                        delta: 1,
                    },
                },
            ],
            [
                {
                    type: "ADJUST_FACT",
                    payload: {
                        scope: "permanent",
                        factType: "run_number",
                        factAbout: "world",
                        delta: 1,
                    },
                },
            ],
        ]);
    });

    it("enqueues the next run number on rebirth", () => {
        const commands = makeCommands();

        const nextRunNumber = enqueueRunNumberBootstrap(commands as any, 2);

        expect(nextRunNumber).toBe(3);
        expect(commands.enqueue).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                payload: expect.objectContaining({ delta: 3, scope: "run" }),
            }),
        );
        expect(commands.enqueue).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                payload: expect.objectContaining({
                    delta: 1,
                    scope: "permanent",
                }),
            }),
        );
    });

    it("clamps invalid previous inputs to run 1", () => {
        expect(
            enqueueRunNumberBootstrap(makeCommands() as any, Number.NaN),
        ).toBe(1);
        expect(enqueueRunNumberBootstrap(makeCommands() as any, -1)).toBe(1);
        expect(enqueueRunNumberBootstrap(makeCommands() as any, Infinity)).toBe(
            1,
        );
    });
});
