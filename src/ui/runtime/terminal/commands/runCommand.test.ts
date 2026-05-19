import { describe, it, expect, vi } from "vitest";

const readTextMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../engine/vfs/FileSystem", () => ({
    vfs: {
        readText: readTextMock,
        listFiles: vi.fn().mockResolvedValue([]),
    },
}));

import { runCommand } from "./runCommand";

describe("runCommand", () => {
    it("executes each non-comment line in the script", async () => {
        readTextMock.mockResolvedValue(
            [
                "# boot",
                "game.reset",
                "",
                "game.spawn test_source source_A",
            ].join("\n"),
        );

        const execute = vi.fn().mockResolvedValue({
            type: "success",
            content: "ok",
        });

        const registry = {
            execute,
            getCommand: vi.fn(),
            getAllCommands: vi.fn(),
        };

        const result = await runCommand.execute(["basic_transfer.cvs"], {
            registry,
        });

        expect(result.type).toBe("success");
        expect(execute).toHaveBeenCalledTimes(2);
        expect(execute).toHaveBeenCalledWith(
            "game.reset",
            expect.objectContaining({ registry }),
        );
        expect(execute).toHaveBeenCalledWith(
            "game.spawn test_source source_A",
            expect.objectContaining({ registry }),
        );
    });

    it("fails fast and reports the failing line", async () => {
        readTextMock.mockResolvedValue(
            ["game.reset", "project-load bad/manifest.json", "tick.run"].join(
                "\n",
            ),
        );

        const execute = vi
            .fn()
            .mockResolvedValueOnce({ type: "success", content: "ok" })
            .mockResolvedValueOnce({
                type: "error",
                content: "Manifest 'bad/manifest.json' not found.",
            });

        const registry = {
            execute,
            getCommand: vi.fn(),
            getAllCommands: vi.fn(),
        };

        const result = await runCommand.execute(["init.cvs"], { registry });

        expect(result.type).toBe("error");
        expect(result.content).toContain(
            "Script failed at line 2: 'project-load bad/manifest.json'",
        );
        expect(execute).toHaveBeenCalledTimes(2);
    });
});
