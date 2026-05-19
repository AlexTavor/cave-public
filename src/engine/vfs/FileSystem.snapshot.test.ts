import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { createCartridge } from "../test/factories";
import { FileSystem } from "./FileSystem";
import type { FetchLike, PersistenceAdapter } from "./persistence";

class SnapshotDb<T> implements PersistenceAdapter<T> {
    public exportAll = async () => ({ "manifest.json": { name: "Project" } });
    public importAll = async (_data: Record<string, unknown>) => undefined;
    async load() {
        return undefined;
    }
    async save() {
        return undefined;
    }
    async delete() {
        return undefined;
    }
    async getAllKeys() {
        return [];
    }
}

const fetcher = (async (_input: string, init?: { body?: string }) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => null,
    text: async () => init?.body ?? "",
})) as unknown as FetchLike<ModuleCartridge>;

describe("engine/vfs/FileSystem snapshot APIs", () => {
    it("delegates exportState and importState to bulk adapter methods", async () => {
        const db = new SnapshotDb<ModuleCartridge>();
        const importAll = (db.importAll = async (data) => {
            expect(data).toEqual({ "manifest.json": { name: "Project" } });
        });
        const fs = new FileSystem({ db, fetcher, isDev: true });

        await expect(fs.exportState()).resolves.toEqual({
            "manifest.json": { name: "Project" },
        });
        await fs.importState({ "manifest.json": { name: "Project" } });
        expect(importAll).toBeDefined();
    });

    it("throws explicit errors when bulk adapter methods are unsupported", async () => {
        const fs = new FileSystem({
            db: {
                load: async () => undefined,
                save: async () => undefined,
                delete: async () => undefined,
                getAllKeys: async () => [],
            },
            fetcher,
            isDev: true,
        });
        await expect(fs.exportState()).rejects.toThrow(
            "Bulk VFS export is not supported.",
        );
        await expect(fs.importState({ "manifest.json": {} })).rejects.toThrow(
            "Bulk VFS import is not supported.",
        );
    });

    it("saveJsonToDisk posts arbitrary JSON to the editor save endpoint", async () => {
        let savedBody = "";
        const recordingFetcher = (async (
            _input: string,
            init?: { body?: string },
        ) => {
            savedBody = init?.body ?? "";
            return {
                ok: true,
                status: 200,
                statusText: "OK",
                json: async () => null,
                text: async () => "",
            };
        }) as unknown as FetchLike<ModuleCartridge>;
        const fs = new FileSystem({
            db: new SnapshotDb(),
            fetcher: recordingFetcher,
            isDev: true,
        });

        await fs.saveJsonToDisk("public/bootstrap/vfs-prod.json", {
            "manifest.json": createCartridge("root", { blueprints: {} }),
        });

        expect(JSON.parse(savedBody)).toEqual({
            path: "public/bootstrap/vfs-prod.json",
            content: {
                "manifest.json": createCartridge("root", { blueprints: {} }),
            },
        });
    });
});
