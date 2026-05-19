import { describe, expect, it } from "vitest";
import { Snapshot } from "./Snapshot";
import { systemPhase } from "./runtimePhases";
import { RuntimeCommandType, type RuntimeCommand } from "./types";

const makeSnapshot = (paused: boolean): Snapshot => {
    const entities = paused
        ? [{ id: "sys_world", draft: { active: true } }]
        : [{ id: "sys_world" }];
    return new Snapshot(entities, { getBody: () => undefined } as never);
};

const cmd = (id: string): RuntimeCommand => ({
    type: RuntimeCommandType.SET_TARGET,
    payload: { entityId: id, targetId: null },
});

const makeContext = () =>
    ({
        systems: {
            preBehaviorSystems: [
                {
                    tick: (
                        _: Snapshot,
                        c: { enqueue: (x: RuntimeCommand) => void },
                    ) => c.enqueue(cmd("pre")),
                },
            ],
            behaviorSystem: {
                tick: (
                    _: Snapshot,
                    c: { enqueue: (x: RuntimeCommand) => void },
                ) => c.enqueue(cmd("behavior")),
            },
            automationSystem: {
                tick: (
                    _: Snapshot,
                    c: { enqueue: (x: RuntimeCommand) => void },
                ) => {
                    c.enqueue(cmd("automation"));
                    return {
                        activeCount: 9,
                        nextEventMs: 10,
                        nextCommand: "auto",
                    };
                },
            },
            registeredSystems: [
                {
                    tick: (
                        _: Snapshot,
                        c: { enqueue: (x: RuntimeCommand) => void },
                    ) => c.enqueue(cmd("registered")),
                },
                {
                    runsWhenPaused: true,
                    tick: (
                        _: Snapshot,
                        c: { enqueue: (x: RuntimeCommand) => void },
                    ) => c.enqueue(cmd("paused")),
                },
            ],
        },
        state: { tick: 0, seed: "s", status: "running" },
    }) as any;

describe("runtimePhases.systemPhase", () => {
    it("runs systems in expected order when not paused", () => {
        const result = systemPhase(makeSnapshot(false), makeContext(), 16);
        expect(result.emittedCommands).toEqual([
            cmd("pre"),
            cmd("behavior"),
            cmd("automation"),
            cmd("registered"),
            cmd("paused"),
        ]);
    });

    it("applies pause semantics to scheduled systems", () => {
        const result = systemPhase(makeSnapshot(true), makeContext(), 16);
        expect(result.emittedCommands).toEqual([cmd("paused")]);
    });

    it("pauses registered systems when a thought is active", () => {
        const snapshot = new Snapshot(
            [{ id: "sys_world", thought: { active: true } }],
            { getBody: () => undefined } as never,
        );
        expect(
            systemPhase(snapshot, makeContext(), 16).emittedCommands,
        ).toEqual([cmd("paused")]);
    });

    it("returns early on non-positive dt", () => {
        const result = systemPhase(makeSnapshot(false), makeContext(), 0);
        expect(result.emittedCommands).toEqual([]);
        expect(result.automationSnapshot).toEqual({
            activeCount: 0,
            nextEventMs: null,
            nextCommand: null,
        });
    });

    it("passes through automation snapshot unchanged", () => {
        const result = systemPhase(makeSnapshot(false), makeContext(), 16);
        expect(result.automationSnapshot).toEqual({
            activeCount: 9,
            nextEventMs: 10,
            nextCommand: "auto",
        });
    });
});

