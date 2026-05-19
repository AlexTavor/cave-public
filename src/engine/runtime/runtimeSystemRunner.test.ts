import { describe, expect, it } from "vitest";
import { MAX_COMMANDS_PER_TICK } from "./runtimeConstants";
import { createSystemBuffer } from "./runtimeSystemBatch";
import {
    runRegisteredSystems,
    runTickableReturning,
    runTickableVoid,
} from "./runtimeSystemRunner";
import {
    RuntimeCommandType,
    type RuntimeCommand,
    type RuntimeState,
} from "./types";

const makeState = (): RuntimeState => ({
    tick: 0,
    seed: "s",
    status: "running",
});
const makeSnapshot = () => ({}) as any;
const cmd = (id: string): RuntimeCommand => ({
    type: RuntimeCommandType.SET_TARGET,
    payload: { entityId: id, targetId: null },
});

describe("runtimeSystemRunner", () => {
    it("runs void tickable and merges commands in order", () => {
        const aggregate: RuntimeCommand[] = [];
        const buffer = createSystemBuffer();
        const state = makeState();
        class First {
            tick(_: unknown, c: typeof buffer): void {
                c.enqueue(cmd("a"));
            }
        }
        class Second {
            tick(_: unknown, c: typeof buffer): void {
                c.enqueue(cmd("b"));
            }
        }
        runTickableVoid(
            new First() as any,
            makeSnapshot(),
            buffer,
            16,
            aggregate,
            state,
        );
        runTickableVoid(
            new Second() as any,
            makeSnapshot(),
            buffer,
            16,
            aggregate,
            state,
        );
        expect(aggregate).toEqual([cmd("a"), cmd("b")]);
    });

    it("runs returning tickable and returns value unchanged", () => {
        const aggregate: RuntimeCommand[] = [];
        const buffer = createSystemBuffer();
        const state = makeState();
        class Returning {
            tick(_: unknown, c: typeof buffer): { ok: true } {
                c.enqueue(cmd("r"));
                return { ok: true };
            }
        }
        const result = runTickableReturning(
            new Returning() as any,
            makeSnapshot(),
            buffer,
            16,
            aggregate,
            state,
        );
        expect(result).toEqual({ ok: true });
        expect(aggregate).toHaveLength(1);
    });

    it("applies pause filtering for registered systems", () => {
        const aggregate: RuntimeCommand[] = [];
        const buffer = createSystemBuffer();
        const state = makeState();
        const normal = {
            tick: (_: unknown, c: typeof buffer) => c.enqueue(cmd("n")),
        };
        const paused = {
            runsWhenPaused: true,
            tick: (_: unknown, c: typeof buffer) => c.enqueue(cmd("p")),
        };
        runRegisteredSystems(
            [normal as any, paused as any],
            makeSnapshot(),
            buffer,
            16,
            aggregate,
            state,
            true,
        );
        expect(aggregate).toEqual([cmd("p")]);
    });

    it("sets fatal and throws on overflow", () => {
        const aggregate: RuntimeCommand[] = [];
        const buffer = createSystemBuffer();
        const state = makeState();
        const overflow = {
            tick: (_: unknown, c: typeof buffer) => {
                for (let i = 0; i <= MAX_COMMANDS_PER_TICK; i += 1)
                    c.enqueue(cmd(String(i)));
            },
        };
        expect(() =>
            runTickableVoid(
                overflow as any,
                makeSnapshot(),
                buffer,
                16,
                aggregate,
                state,
            ),
        ).toThrow(/Command Overflow/);
        expect(state.status).toBe("fatal");
    });
});
