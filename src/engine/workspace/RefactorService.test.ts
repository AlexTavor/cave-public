import { beforeEach, describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { RefactorService } from "./RefactorService";
import { WorkspaceService } from "./WorkspaceService";
import {
    clearStagedProjectVersion,
    getStagedProjectVersion,
} from "./projectVersionTracker";

const moduleA: ModuleCartridge = {
    metadata: { id: "A", name: "A", version: "0.0.1" },
    blueprints: {
        "A::entityA": {
            id: "A::entityA",
            label: "A",
            tags: [],
            components: {},
        },
    },
    assets: {} as any,
};

const moduleB: ModuleCartridge = {
    metadata: { id: "B", name: "B", version: "0.0.1" },
    blueprints: {
        "B::entityB": {
            id: "B::entityB",
            label: "B",
            tags: ["A::entityA"],
            components: {},
        },
    },
    assets: {} as any,
};

describe("RefactorService", () => {
    beforeEach(() => clearStagedProjectVersion("project/manifest.json"));

    it("moves namespace, updates refs, and refreshes workspace", async () => {
        const db = new Map<string, any>([
            [
                "project/manifest.json",
                {
                    name: "Project",
                    version: "0.0.1",
                    files: ["A.json", "B.json"],
                },
            ],
            ["project/A.json", moduleA],
            ["project/B.json", moduleB],
        ]);
        const vfs = {
            readFile: async (p: string) => db.get(p) ?? null,
            readText: async () => null,
            writeFile: async (p: string, d: unknown) => {
                db.set(p, d);
            },
            movePaths: async (items: Array<{ from: string; to: string }>) => {
                items.forEach(({ from, to }) => {
                    if (!db.has(from)) return;
                    db.set(to, db.get(from));
                    db.delete(from);
                });
            },
        } as any;
        const linker = {
            linkProject: async () => ({
                metadata: { id: "p", version: "0" },
                blueprints: {},
            }),
        } as any;
        const workspace = new WorkspaceService(vfs, linker);
        await workspace.loadProject("project/manifest.json");

        await new RefactorService(workspace, vfs).moveNamespace("A", "C");

        expect(db.has("project/C.json")).toBe(true);
        expect(db.has("project/A.json")).toBe(false);
        expect(db.get("project/B.json").blueprints["B::entityB"].tags[0]).toBe(
            "C::entityA",
        );
        expect(db.get("project/manifest.json").files).toContain("C.json");
        expect(db.get("project/manifest.json").version).toBe("0.0.2");
        expect(
            getStagedProjectVersion("project/manifest.json")?.effectiveVersion,
        ).toBe("0.0.2");
    });
});

