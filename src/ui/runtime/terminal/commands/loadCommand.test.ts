import { describe, it, expect, vi, beforeEach } from "vitest";

const readTextMock = vi.hoisted(() => vi.fn());
const writeFileMock = vi.hoisted(() => vi.fn());
const refreshFileCacheMock = vi.hoisted(() => vi.fn());
const getFileSuggestionsMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../engine/vfs/FileSystem", () => ({
    vfs: {
        readText: readTextMock,
        writeFile: writeFileMock,
    },
}));

vi.mock("../../../../engine/terminal/fileUtils", () => ({
    fileCache: [],
    refreshFileCache: refreshFileCacheMock,
    getFileSuggestions: getFileSuggestionsMock,
}));

import { loadCommand } from "./loadCommand";

describe("loadCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("fetches text from disk and writes to VFS", async () => {
        const scriptContent = "game.reset";
        readTextMock.mockResolvedValue(scriptContent);

        const result = await loadCommand.execute(["script.cvs"], {
            registry: {} as any,
        });

        expect(result.type).toBe("success");
        expect(readTextMock).toHaveBeenCalledWith("script.cvs");
        expect(writeFileMock).toHaveBeenCalledWith("script.cvs", scriptContent);
        expect(refreshFileCacheMock).toHaveBeenCalled();
        expect(result.content).toContain("Successfully loaded");
    });

    it("returns error if file is not found on disk", async () => {
        readTextMock.mockResolvedValue(null);

        const result = await loadCommand.execute(["missing.cvs"], {
            registry: {} as any,
        });

        expect(result.type).toBe("error");
        expect(result.content).toContain("not found on disk");
        expect(writeFileMock).not.toHaveBeenCalled();
    });

    it("returns error on invalid arguments", async () => {
        const result = await loadCommand.execute([], {
            registry: {} as any,
        });

        expect(result.type).toBe("error");
        expect(result.content).toContain("Invalid arguments");
    });

    it("handles write errors gracefully", async () => {
        readTextMock.mockResolvedValue("content");
        writeFileMock.mockRejectedValue(new Error("Write failed"));

        const result = await loadCommand.execute(["broken.cvs"], {
            registry: {} as any,
        });

        expect(result.type).toBe("error");
        expect(result.content).toContain("Load failed: Write failed");
    });

    it("delegates autocomplete to getFileSuggestions", () => {
        if (!loadCommand.autocomplete) {
            throw new Error("Autocomplete handler missing");
        }

        const mockContext = {} as any;
        const mockArgs = ["part"];
        const mockResult = [{ label: "partial.cvs", type: "value" }];

        getFileSuggestionsMock.mockReturnValue(mockResult);

        const result = loadCommand.autocomplete(mockArgs, mockContext);

        expect(getFileSuggestionsMock).toHaveBeenCalledWith(
            mockArgs,
            mockContext,
        );
        expect(result).toBe(mockResult);
    });
});
