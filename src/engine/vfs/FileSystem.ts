import type { MoveItem, TreeNode } from "./types";
import {
    buildTree,
    matchesPathOrPrefix,
    moveKey,
    normalizePath,
} from "./pathUtils";
import { FileSystemBase } from "./FileSystem.base";

export class FileSystem extends FileSystemBase {
    private readonly dirtyFiles = new Set<string>();

    public override async writeFile(
        path: string,
        data: import("../../data/schemas/module").ModuleCartridge,
    ): Promise<void> {
        await super.writeFile(path, data);
        this.dirtyFiles.add(normalizePath(path));
    }

    public override async saveToDisk(filename: string): Promise<void> {
        const normalized = normalizePath(filename);
        await super.saveToDisk(filename);
        this.dirtyFiles.delete(normalized);
    }

    public getDirtyFiles(): string[] {
        return [...this.dirtyFiles];
    }

    public async deletePaths(paths: string[]): Promise<void> {
        await this.init();
        if (paths.length === 0) return;
        if (this.db.deleteMany) return this.db.deleteMany(paths);
        const keys = await this.db.getAllKeys();
        const targets = keys.filter((key) =>
            paths.some((path) => matchesPathOrPrefix(key, path)),
        );
        await Promise.all(targets.map((path) => this.db.delete(path)));
    }

    public async movePaths(items: MoveItem[]): Promise<void> {
        await this.init();
        if (items.length === 0) return;
        if (this.db.moveMany) return this.db.moveMany(items);
        const keys = await this.db.getAllKeys();
        for (const item of items) {
            const from = normalizePath(item.from);
            const to = normalizePath(item.to);
            const matched = keys.filter((key) =>
                matchesPathOrPrefix(key, from),
            );
            for (const key of matched) {
                const data = await this.db.load(key);
                if (data === undefined) continue;
                await this.db.save(moveKey(key, from, to), data);
                await this.db.delete(key);
            }
        }
    }

    public async scan(glob: string): Promise<string[]> {
        await this.init();
        if (this.db.scan) return this.db.scan(glob);
        const keys = await this.db.getAllKeys();
        if (!glob.trim()) return keys;
        const escaped = glob
            .trim()
            .split("")
            .map((char) => {
                if (char === "*") return ".*";
                if (/[.+?^${}()|[\]\\]/.test(char)) return `\\${char}`;
                return char;
            })
            .join("");
        const pattern = new RegExp(`^${escaped}$`, "i");
        return keys.filter((key) => pattern.test(key));
    }

    public async tree(root = ""): Promise<TreeNode> {
        await this.init();
        return this.db.getTree
            ? this.db.getTree(root)
            : buildTree(await this.db.getAllKeys(), root);
    }

    public override async deleteFile(path: string): Promise<void> {
        await super.deleteFile(path);
        this.dirtyFiles.delete(normalizePath(path));
    }
}

export const vfs = new FileSystem();

