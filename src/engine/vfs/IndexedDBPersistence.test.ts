import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDBPersistence } from "./IndexedDBPersistence";

describe("IndexedDBPersistence batch operations", () => {
    let db: IndexedDBPersistence<string>;

    beforeEach(async () => {
        db = new IndexedDBPersistence<string>();
        await db.clearAll();
    });

    it("moveMany renames keys and keeps values", async () => {
        await db.save("a/file.txt", "x");
        await db.moveMany([{ from: "a", to: "b" }]);
        await expect(db.load("a/file.txt")).resolves.toBeUndefined();
        await expect(db.load("b/file.txt")).resolves.toBe("x");
    });

    it("moveMany overwrites existing destination", async () => {
        await db.save("a.txt", "new");
        await db.save("b.txt", "old");
        await db.moveMany([{ from: "a.txt", to: "b.txt" }]);
        await expect(db.load("b.txt")).resolves.toBe("new");
    });

    it("deleteMany removes explicit keys and prefix directories", async () => {
        await db.save("dir/file.txt", "x");
        await db.save("other.txt", "y");
        await db.deleteMany(["dir"]);
        await expect(db.load("dir/file.txt")).resolves.toBeUndefined();
        await expect(db.load("other.txt")).resolves.toBe("y");
    });

    it("scan supports wildcard matching", async () => {
        await db.save("a.json", "x");
        await db.save("b.txt", "y");
        await expect(db.scan("*.json")).resolves.toEqual(["a.json"]);
        await expect(db.scan("")).resolves.toEqual(["a.json", "b.txt"]);
    });

    it("getTree builds hierarchical structure", async () => {
        await db.save("a/b/c.txt", "x");
        const tree = await db.getTree("a");
        expect(tree.type).toBe("directory");
        expect(JSON.stringify(tree)).toContain("c.txt");
    });
});
