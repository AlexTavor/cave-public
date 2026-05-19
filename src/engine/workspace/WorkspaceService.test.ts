import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { WorkspaceService } from "./WorkspaceService";

const makeModule = (id: string): ModuleCartridge => ({
    metadata: { id, name: id, version: "0.0.1" },
    blueprints: { [id]: { id, label: id, tags: [], components: {} } },
    assets: {} as any,
});

const makeHarness = () => {
    const db = new Map<string, any>();
    const vfs = {
        readFile: async (p: string) => db.get(p) ?? null,
        readText: async (p: string) =>
            db.has(p) ? JSON.stringify(db.get(p)) : null,
        writeFile: async (p: string, d: unknown) => {
            db.set(p, d);
        },
        movePaths: async () => undefined,
    } as any;
    const linker = {
        linkProject: async () => ({
            metadata: { id: "p", version: "0.0.1" },
            blueprints: {},
        }),
    } as any;
    return { db, vfs, linker };
};

describe("WorkspaceService", () => {
    it("creates project manifest and loads project", async () => {
        const { db, vfs, linker } = makeHarness();
        const service = new WorkspaceService(vfs, linker);

        await service.createProject("project", "Test");

        expect(db.has("project/manifest.json")).toBe(true);
        expect(db.get("project/manifest.json").version).toBe("0.0.1");
        expect(service.activeCartridge).toBeTruthy();
    });

    it("reloads modules by replacing runtime instance", async () => {
        const { db, vfs, linker } = makeHarness();
        db.set("project/manifest.json", { name: "Project", files: ["A.json"] });
        db.set("project/A.json", makeModule("A::entity"));
        const service = new WorkspaceService(vfs, linker);

        await service.loadProject("project/manifest.json");
        const firstId = service.activeRuntime?.id;

        db.set("project/A.json", makeModule("A::entity_v2"));
        await service.reloadModules(["A.json"]);

        expect(service.activeRuntime?.id).not.toBe(firstId);
        expect(
            service.moduleCache.get("A.json")?.blueprints["A::entity_v2"],
        ).toBeTruthy();
    });

    it("writes bare blueprint payloads for .bp files", async () => {
        const { db, vfs, linker } = makeHarness();
        db.set("project/manifest.json", { name: "Project", files: ["A.bp"] });
        db.set("project/A.bp", {
            id: "A",
            label: "A",
            tags: [],
            components: {},
        });
        const service = new WorkspaceService(vfs, linker);

        await service.loadProject("project/manifest.json");
        await service.writeModule("A.bp", {
            ...makeModule("A"),
            config: { settings: { impulse: { defaultDtMs: 99 } } } as any,
        });

        expect(db.get("project/A.bp")).toEqual(
            expect.objectContaining({ id: "A", components: {} }),
        );
        expect(db.get("project/A.bp").config).toBeUndefined();
    });

    it("throws when loading invalid project manifest", async () => {
        const { db, vfs, linker } = makeHarness();
        db.set("project/manifest.json", { files: ["A.json"] });
        const service = new WorkspaceService(vfs, linker);

        await expect(
            service.loadProject("project/manifest.json"),
        ).rejects.toThrow(/non-empty name/);
    });

    it("allows non-module semantic files during project load", async () => {
        const { db, vfs, linker } = makeHarness();
        db.set("project/manifest.json", { name: "Project", files: ["A.json"] });
        db.set("project/A.json", { arbitrary: true });
        const service = new WorkspaceService(vfs, linker);

        await expect(
            service.loadProject("project/manifest.json"),
        ).resolves.toBeUndefined();
    });
});

