import { describe, expect, it, vi } from "vitest";

vi.mock("../../vfs/FileSystem", () => {
    const db = new Map<string, any>([
        ["proj/manifest.json", { name: "Old Project", files: ["game.bp"] }],
        [
            "proj/game.bp",
            {
                metadata: { id: "Old Project", name: "Old Project" },
                blueprints: {},
                assets: {},
            },
        ],
    ]);
    return {
        vfs: {
            readFile: vi.fn(async (p: string) => db.get(p) ?? null),
            readText: vi.fn(async () => null),
            listFiles: vi.fn(async () => Array.from(db.keys())),
            writeFile: vi.fn(async (p: string, d: unknown) => {
                db.set(p, d);
            }),
        },
    };
});

import { projectDuplicateCommand } from "./projectDuplicateCommand";

describe("projectDuplicateCommand", () => {
    it("duplicates project and updates manifest name", async () => {
        const result = await projectDuplicateCommand.execute(
            ["proj", "newProj"],
            {} as any,
        );
        expect(result.type).toBe("success");

        const mocked = await import("../../vfs/FileSystem");
        const manifest = (await mocked.vfs.readFile(
            "newProj/manifest.json",
        )) as any;
        const game = (await mocked.vfs.readFile("newProj/game.bp")) as any;

        expect(manifest.name).toBe("newProj");
        expect(game.metadata.name).toBe("newProj");
    });

    it("fails when source project is invalid", async () => {
        const result = await projectDuplicateCommand.execute(
            ["missing", "copy"],
            {} as any,
        );
        expect(result.type).toBe("error");
    });
});
