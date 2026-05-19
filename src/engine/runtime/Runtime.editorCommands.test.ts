import { describe, expect, it, vi } from "vitest";
import { createGameRuntime } from "./createGameRuntime";
import { RuntimeCommandType } from "./types";
import { createCartridge, createBlueprint } from "../test/factories";

const makeRuntime = () => {
    const runtime = createGameRuntime(
        createCartridge("game.json", {
            blueprints: {
                hero: createBlueprint("hero", {
                    components: {
                        display: { label: "Hero", display_key: "unknown" },
                        physics: {
                            x: 0,
                            y: 0,
                            radius: 10,
                            mass: 1,
                            drag: 0,
                            isStatic: false,
                        },
                    },
                }),
            },
        }),
        "seed",
    );

    runtime.commands.enqueue({
        type: RuntimeCommandType.SPAWN,
        payload: { blueprintId: "hero", id: "hero" },
    });
    runtime.flushCommands();
    return runtime;
};

describe("Runtime editor commands", () => {
    it("flushCommands applies position commands without incrementing tick", () => {
        const runtime = makeRuntime();
        runtime.commands.enqueue({
            type: RuntimeCommandType.POSITION_ENTITY,
            payload: { id: "hero", x: 12, y: 34 },
        });

        expect(runtime.flushCommands()).toBe(1);
        expect(runtime.getState().tick).toBe(0);
        expect(runtime.getPhysicsBody("hero")?.position).toMatchObject({
            x: 12,
            y: 34,
        });
    });

    it("flushCommands safely no-ops when the queue is empty", () => {
        const runtime = makeRuntime();
        expect(runtime.flushCommands()).toBe(0);
        expect(runtime.getState().tick).toBe(0);
    });

    it("flushCommands publishes applied commands through telemetry", () => {
        const onCommandsApplied = vi.fn();
        const runtime = createGameRuntime(
            createCartridge("game.json"),
            "seed",
            { log: () => {}, onCommandsApplied },
        );
        runtime.commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "sys_pointer",
                key: "k",
                value: 1,
                visible: false,
            },
        });

        expect(runtime.flushCommands()).toBe(1);
        expect(onCommandsApplied).toHaveBeenCalledTimes(1);
    });

    it("stepOncePreservingPause advances exactly one tick", () => {
        const runtime = makeRuntime();
        expect(runtime.stepOncePreservingPause()).toBe(1);
        expect(runtime.getState().tick).toBe(1);
    });

    it("restores paused state after a single step", () => {
        const runtime = makeRuntime();
        runtime.getState().status = "paused";

        expect(runtime.stepOncePreservingPause()).toBe(1);
        expect(runtime.getState().status).toBe("paused");
    });
});
