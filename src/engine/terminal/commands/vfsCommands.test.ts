import { beforeEach, describe, expect, it, vi } from "vitest";

const { vfsMock } = vi.hoisted(() => ({
    vfsMock: {
        tree: vi.fn(),
        scan: vi.fn(),
        listFiles: vi.fn(),
        deletePaths: vi.fn(),
        movePaths: vi.fn(),
    },
}));

vi.mock("../../vfs/FileSystem", () => ({ vfs: vfsMock }));
vi.mock("../fileUtils", () => ({
    DIR_MARKER_FILENAME: ".cave-dir",
    getPathSuggestions: vi.fn((token: string) => [
        { label: `${token}x`, type: "value", insertText: `${token}x` },
    ]),
}));

import { vfsCommands } from "./vfsCommands";

const cmd = (name: string) => vfsCommands.find((entry) => entry.name === name)!;

describe("vfsCommands", () => {
    beforeEach(() => vi.clearAllMocks());

    it("vfs.delete deletes a single file immediately", async () => {
        vfsMock.listFiles.mockResolvedValue(["file.txt"]);
        const result = await cmd("vfs-delete").execute(["file.txt"], {} as any);
        expect(vfsMock.deletePaths).toHaveBeenCalledWith(["file.txt"]);
        expect(result.type).toBe("success");
    });

    it("vfs.delete prompts when deleting a directory", async () => {
        vfsMock.listFiles.mockResolvedValue(["dir/file.txt"]);
        const result = await cmd("vfs-delete").execute(["dir"], {} as any);
        expect(result.next).toBeTypeOf("function");
        expect((await result.next!("n", {} as any)).content).toBe("Aborted");
        expect(vfsMock.deletePaths).not.toHaveBeenCalled();
        expect((await result.next!("y", {} as any)).type).toBe("success");
    });

    it("vfs.tree renders ascii output", async () => {
        vfsMock.tree.mockResolvedValue({
            name: ".",
            path: "",
            type: "directory",
            children: [{ name: "a.txt", type: "file" }],
        });
        const result = await cmd("vfs-tree").execute([], {} as any);
        expect(result.content).toContain("a.txt");
    });

    it("vfs.move validates args and calls movePaths", async () => {
        expect((await cmd("vfs-move").execute(["only"], {} as any)).type).toBe(
            "error",
        );
        vfsMock.listFiles.mockResolvedValue(["folder/.cave-dir", "a.txt"]);
        await cmd("vfs-move").execute(["a.txt", "folder"], {} as any);
        expect(vfsMock.movePaths).toHaveBeenCalledWith([
            { from: "a.txt", to: "folder/a.txt" },
        ]);
    });

    it("vfs.scan validates args and calls vfs scan", async () => {
        expect((await cmd("vfs-scan").execute([], {} as any)).type).toBe(
            "error",
        );
        vfsMock.scan.mockResolvedValue(["a.json"]);
        const ok = await cmd("vfs-scan").execute(["a"], {} as any);
        expect(vfsMock.scan).toHaveBeenCalledWith("*a*");
        expect(ok.content).toContain("a.json");
    });
});
