import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { gameKillAllBodiesExceptCommand } from "./gameKillAllBodiesExceptCommand";

const makeRuntime = () => ({
    commands: { enqueue: vi.fn() },
});

describe("gameKillAllBodiesExceptCommand", () => {
    it("queues the runtime command for a valid quantity", async () => {
        const runtime = makeRuntime();

        const result = await gameKillAllBodiesExceptCommand.execute(["2"], {
            runtime: { getRuntime: () => runtime },
        } as any);

        expect(result.type).toBe("success");
        expect(runtime.commands.enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.KILL_ALL_BODIES_EXCEPT,
            payload: { quantity: 2 },
        });
    });

    it("rejects invalid quantities", async () => {
        const result = await gameKillAllBodiesExceptCommand.execute(["-1"], {
            runtime: { getRuntime: () => makeRuntime() },
        } as any);

        expect(result.type).toBe("error");
        expect(result.content).toContain("Invalid arguments");
    });
});
