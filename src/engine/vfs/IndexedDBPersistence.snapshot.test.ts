import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDBPersistence } from "./IndexedDBPersistence";

describe("IndexedDBPersistence snapshot operations", () => {
    let db: IndexedDBPersistence<string>;

    beforeEach(async () => {
        db = new IndexedDBPersistence<string>();
        await db.clearAll();
    });

    it("exports all stored keys as a flat snapshot", async () => {
        await db.save("manifest.json", "root");
        await db.save("project/data.json", "child");
        await expect(db.exportAll()).resolves.toEqual({
            "manifest.json": "root",
            "project/data.json": "child",
        });
    });

    it("clears prior contents before importing a new snapshot", async () => {
        await db.save("old.json", "legacy");
        await db.importAll({
            "manifest.json": "root",
            "project/data.json": "child",
        });
        await expect(db.getAllKeys()).resolves.toEqual([
            "manifest.json",
            "project/data.json",
        ]);
    });

    it("preserves all imported keys exactly and supports empty snapshots", async () => {
        await db.importAll({ "a.json": "one", "nested/b.json": "two" });
        await expect(db.exportAll()).resolves.toEqual({
            "a.json": "one",
            "nested/b.json": "two",
        });
        await db.importAll({});
        await expect(db.getAllKeys()).resolves.toEqual([]);
    });
});
