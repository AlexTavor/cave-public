import type { DBSchema, IDBPDatabase } from "idb";
import {
    buildTree,
    matchesPathOrPrefix,
    moveKey,
    normalizePath,
} from "./pathUtils";
import type { MoveItem, TreeNode } from "./types";

export interface IndexedDbSchema<SaveData> extends DBSchema {
    files: { key: string; value: SaveData };
}

export const deleteMany = async <SaveData>(
    db: IDBPDatabase<IndexedDbSchema<SaveData>>,
    storeName: "files",
    keys: string[],
) => {
    if (keys.length === 0) return;
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const allKeys = (await store.getAllKeys()).map(String);
    const targets = allKeys.filter((key) =>
        keys.some((candidate) => matchesPathOrPrefix(key, candidate)),
    );
    await Promise.all(targets.map((key) => store.delete(key)));
    await tx.done;
};

export const moveMany = async <SaveData>(
    db: IDBPDatabase<IndexedDbSchema<SaveData>>,
    storeName: "files",
    items: MoveItem[],
) => {
    if (items.length === 0) return;
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const allKeys = (await store.getAllKeys()).map(String);
    const writes: Array<{ key: string; value: SaveData }> = [];
    const deletes = new Set<string>();
    for (const item of items) {
        const from = normalizePath(item.from);
        const to = normalizePath(item.to);
        const matched = allKeys.filter((key) => matchesPathOrPrefix(key, from));
        for (const key of matched) {
            const value = await store.get(key);
            if (value === undefined) continue;
            writes.push({ key: moveKey(key, from, to), value });
            deletes.add(key);
        }
    }
    await Promise.all(writes.map((entry) => store.put(entry.value, entry.key)));
    await Promise.all(Array.from(deletes).map((key) => store.delete(key)));
    await tx.done;
};

export const scan = async <SaveData>(
    db: IDBPDatabase<IndexedDbSchema<SaveData>>,
    storeName: "files",
    glob: string,
) => {
    const keys = (await db.getAllKeys(storeName))
        .map(String)
        .sort((a, b) => a.localeCompare(b));
    if (!glob.trim()) return keys;
    const specials = ".+?^${}()|[]\\";
    let source = "";
    for (const char of glob.trim()) {
        if (char === "*") {
            source += ".*";
            continue;
        }
        if (specials.includes(char)) {
            source += `\\${char}`;
            continue;
        }
        source += char;
    }
    return keys.filter((key) => new RegExp(`^${source}$`, "i").test(key));
};

export const getTree = async <SaveData>(
    db: IDBPDatabase<IndexedDbSchema<SaveData>>,
    storeName: "files",
    root: string,
): Promise<TreeNode> =>
    buildTree((await db.getAllKeys(storeName)).map(String), root);
