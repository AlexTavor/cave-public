import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCartridge } from "../../../../engine/test/factories";

const readFileMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../engine/vfs/FileSystem", () => ({
    vfs: {
        readFile: readFileMock,
    },
}));

vi.mock("../../../../engine/terminal/fileUtils", () => ({
    getFileSuggestions: () => [],
}));

import { balancingScanCommand } from "./balancingScanCommand";

describe("balancingScanCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("summarizes lever counts", async () => {
        const cartridge = createCartridge("demo.json", {
            metadata: { id: "demo.json", name: "Demo", version: "0.0.1" },
        });

        cartridge.assets.settings = { tuning: { rate: 1 } } as any;

        readFileMock.mockResolvedValue(cartridge);

        const result = await balancingScanCommand.execute(["demo.json"], {
            registry: {
                getCommand: vi.fn(),
                getAllCommands: vi.fn(),
                execute: vi.fn(),
            },
        });

        expect(result.type).toBe("success");
        const content =
            typeof result.content === "string" ? result.content : "";
        const totalMatch = /Total Levers: (\d+)/.exec(content);
        expect(totalMatch).not.toBeNull();
        const total = Number(totalMatch?.[1] ?? 0);
        expect(total).toBeGreaterThan(0);
    });
});
