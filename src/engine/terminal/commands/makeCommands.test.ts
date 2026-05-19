import { beforeEach, describe, expect, it, vi } from "vitest";

const { vfsMock } = vi.hoisted(() => ({
    vfsMock: { readFile: vi.fn(), writeFile: vi.fn(), listFiles: vi.fn() },
}));

vi.mock("../../vfs/FileSystem", () => ({ vfs: vfsMock }));
vi.mock("../fileUtils", () => ({
    DIR_MARKER_FILENAME: ".cave-dir",
    refreshFileCache: vi.fn(),
    getPathSuggestions: vi.fn(() => [
        { label: "content/", type: "value", insertText: "content/" },
    ]),
}));

import { makeCommands } from "./makeCommands";

const cmd = (name: string) =>
    makeCommands.find((entry) => entry.name === name)!;

describe("makeCommands", () => {
    beforeEach(() => vi.clearAllMocks());

    it("makefile creates file and rejects duplicates", async () => {
        vfsMock.readFile.mockResolvedValueOnce(null).mockResolvedValueOnce({});
        const created = await cmd("makefile").execute(
            ["content/a.bp"],
            {} as any,
        );
        expect(created.type).toBe("success");
        expect(vfsMock.writeFile).toHaveBeenCalledWith("content/a.bp", {
            id: "a",
            label: "",
            tags: [],
            components: {},
            _editor: {},
        });
        const duplicate = await cmd("makefile").execute(
            ["content/a.bp"],
            {} as any,
        );
        expect(duplicate.type).toBe("error");
    });

    it("creates versioned manifest templates", async () => {
        vfsMock.readFile.mockResolvedValue(null);
        await cmd("makefile").execute(["content/manifest.json"], {} as any);
        expect(vfsMock.writeFile).toHaveBeenCalledWith(
            "content/manifest.json",
            expect.objectContaining({ version: "0.0.1" }),
        );
    });

    it("rejects unsupported file extensions", async () => {
        vfsMock.readFile.mockResolvedValue(null);
        const result = await cmd("makefile").execute(
            ["content/a.json"],
            {} as any,
        );
        expect(result.type).toBe("error");
    });

    it("creates .cvs script files", async () => {
        vfsMock.readFile.mockResolvedValue(null);
        const result = await cmd("makefile").execute(
            ["scripts/init.cvs"],
            {} as any,
        );
        expect(result.type).toBe("success");
        expect(vfsMock.writeFile).toHaveBeenCalledWith(
            "scripts/init.cvs",
            "# Cave script\n",
        );
    });

    it("makedir creates marker and rejects duplicates", async () => {
        vfsMock.listFiles
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(["content/.cave-dir"]);
        const created = await cmd("makedir").execute(["content"], {} as any);
        expect(created.type).toBe("success");
        expect(vfsMock.writeFile).toHaveBeenCalledWith(
            "content/.cave-dir",
            expect.any(Object),
        );
        const duplicate = await cmd("makedir").execute(["content"], {} as any);
        expect(duplicate.type).toBe("error");
    });

    it("exposes autocomplete and usage errors", async () => {
        expect(cmd("makefile").autocomplete?.(["co"], {} as any)).toHaveLength(
            1,
        );
        expect(cmd("makedir").autocomplete?.(["co"], {} as any)).toHaveLength(
            1,
        );
        const fileErr = await cmd("makefile").execute([], {} as any);
        const dirErr = await cmd("makedir").execute([], {} as any);
        expect(fileErr.type).toBe("error");
        expect(dirErr.type).toBe("error");
    });
});

