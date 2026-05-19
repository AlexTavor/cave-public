import { describe, it, expect, vi } from "vitest";
import { gameRebirthCommand } from "./gameRebirthCommand";

const DEFAULT_CAVE = {
    attributes: { body: 10, mind: 10, social: 10 },
    progression: { xp: 50, level: 3, skillpoints: 2 },
    ownedHabiti: ["human", "ancient"],
    ownedUnderstanding: ["insight"],
};

const makeMockRuntime = (
    cave: Record<string, unknown> | null = DEFAULT_CAVE,
) => {
    const world = cave
        ? [
              {
                  id: "sys_world",
                  cave,
                  state: {},
                  permanent: {
                      thought_seen: { intro: 2 },
                      run_number: { world: 2 },
                  },
                  run: { thought_seen: { temp: 1 } },
              },
          ]
        : [{ id: "sys_world", state: {} }];
    return {
        tick: vi.fn(),
        commands: { enqueue: vi.fn() },
        flushCommands: vi.fn(),
        getEntities: () => world,
    };
};

const makeContext = (runtime: ReturnType<typeof makeMockRuntime>) => ({
    runtime: {
        getRuntime: () => runtime,
        reset: vi.fn(),
    },
    registry: {
        execute: vi.fn().mockResolvedValue({ type: "success", content: "ok" }),
    },
});

describe("gameRebirthCommand", () => {
    it("returns error when runtime is missing", async () => {
        const ctx: any = { runtime: { getRuntime: () => null } };
        const result = await gameRebirthCommand.execute([], ctx);
        expect(result.type).toBe("error");
    });

    it("returns error when cave data is missing", async () => {
        const rt = makeMockRuntime(null);
        const ctx: any = makeContext(rt);
        const result = await gameRebirthCommand.execute([], ctx);
        expect(result.type).toBe("error");
        expect(result.content).toContain("cave");
    });

    it("returns error when script execution fails", async () => {
        const rt = makeMockRuntime();
        const ctx: any = makeContext(rt);
        ctx.registry.execute = vi
            .fn()
            .mockResolvedValue({ type: "error", content: "Script broken" });
        const result = await gameRebirthCommand.execute([], ctx);
        expect(result.type).toBe("error");
    });

    it("uses custom script path when provided", async () => {
        const rt = makeMockRuntime();
        const ctx: any = makeContext(rt);
        await gameRebirthCommand.execute(["my/script.cvs"], ctx);
        expect(ctx.registry.execute).toHaveBeenCalledWith(
            "run my/script.cvs",
            expect.anything(),
        );
    });

    it("returns success on complete rebirth", async () => {
        const rt = makeMockRuntime();
        const ctx: any = makeContext(rt);
        const result = await gameRebirthCommand.execute([], ctx);
        const enqueue = ctx.runtime.getRuntime().commands.enqueue;

        expect(result.type).toBe("success");
        expect(enqueue).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "UPDATE_CAVE",
                payload: expect.objectContaining({
                    ownedHabiti: ["human", "ancient"],
                    ownedUnderstanding: ["insight"],
                }),
            }),
        );
        expect(enqueue).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "ADJUST_FACT",
                payload: expect.objectContaining({
                    scope: "permanent",
                    factType: "thought_seen",
                }),
            }),
        );
        expect(enqueue).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "ADJUST_FACT",
                payload: {
                    scope: "run",
                    factType: "run_number",
                    factAbout: "world",
                    delta: 3,
                },
            }),
        );
        expect(enqueue).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "ADJUST_FACT",
                payload: {
                    scope: "permanent",
                    factType: "run_number",
                    factAbout: "world",
                    delta: 1,
                },
            }),
        );
        expect(ctx.runtime.getRuntime().flushCommands).toHaveBeenCalledTimes(1);
    });
});

