import { beforeEach, describe, expect, it, vi } from "vitest";

const { vfsMock } = vi.hoisted(() => ({
    vfsMock: {
        writeFile: vi.fn(),
        listFiles: vi.fn(),
        readFile: vi.fn(),
        readText: vi.fn(),
    },
}));

vi.mock("../../vfs/FileSystem", () => ({ vfs: vfsMock }));
vi.mock("../fileUtils", () => ({ refreshFileCache: vi.fn() }));

import { fsCommands } from "./fsCommands";

const cmd = (name: string) => fsCommands.find((entry) => entry.name === name)!;

describe("fsCommands", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal(
            "fetch",
            vi.fn(async (url: string) => {
                if (url === "/__editor/tree") {
                    return {
                        ok: true,
                        json: async () => ({
                            path: "src/data/raw/content",
                            type: "directory",
                            children: [
                                {
                                    path: "src/data/raw/content/a.bp",
                                    type: "file",
                                },
                                {
                                    path: "src/data/raw/content/init.cvs",
                                    type: "file",
                                },
                            ],
                        }),
                    } as Response;
                }
                if (url.startsWith("/__editor/read")) {
                    if (url.includes("init.cvs")) {
                        return {
                            ok: true,
                            text: async () => "tick.run",
                        } as Response;
                    }
                    return {
                        ok: true,
                        json: async () => ({ metadata: { id: "a" } }),
                    } as Response;
                }
                if (url === "/__editor/save") return { ok: true } as Response;
                return { ok: false, status: 500 } as Response;
            }),
        );
    });

    it("fs.load imports semantic files into vfs", async () => {
        const result = await cmd("fs-load").execute(["content"], {} as any);
        expect(result.type).toBe("success");
        expect(vfsMock.writeFile).toHaveBeenCalledWith(
            "content/a.bp",
            expect.any(Object),
        );
        expect(vfsMock.writeFile).toHaveBeenCalledWith(
            "content/init.cvs",
            "tick.run",
        );
    });

    it("fs.loadTree loads full source root into vfs", async () => {
        await cmd("fs-load-tree").execute([], {} as any);
        expect(fetch).toHaveBeenCalledWith(
            "/__editor/tree",
            expect.objectContaining({
                body: JSON.stringify({ root: "src/data/raw" }),
            }),
        );
    });

    it("fs.save writes each vfs file to editor save endpoint", async () => {
        vfsMock.listFiles.mockResolvedValue([
            "content/a.bp",
            "content/init.cvs",
        ]);
        vfsMock.readFile.mockImplementation(async (path: string) =>
            path.endsWith(".cvs") ? "tick.run" : { metadata: { id: "a" } },
        );
        const result = await cmd("fs-save").execute(["content"], {} as any);
        expect(result.type).toBe("success");
        expect(fetch).toHaveBeenCalledWith(
            "/__editor/save",
            expect.objectContaining({
                body: JSON.stringify({
                    path: "src/data/raw/content/a.bp",
                    content: { metadata: { id: "a" } },
                }),
            }),
        );
        expect(fetch).toHaveBeenCalledWith(
            "/__editor/save",
            expect.objectContaining({
                body: JSON.stringify({
                    path: "src/data/raw/content/init.cvs",
                    content: "tick.run",
                }),
            }),
        );
    });
});
