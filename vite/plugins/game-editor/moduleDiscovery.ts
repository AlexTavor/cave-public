import fs from "node:fs";
import path from "node:path";
import { normalizeProjectPath } from "./shared";

const loadModule = (dirPath: string) => ({
    path: normalizeProjectPath(dirPath),
    manifest: JSON.parse(
        fs.readFileSync(path.join(dirPath, "manifest.json"), "utf-8"),
    ),
});

export const discoverModulesRecursively = async (
    dir: string,
): Promise<any[]> => {
    if (!fs.existsSync(dir)) {
        if (dir.endsWith("src/data/raw")) {
            console.warn(`[GameEditor] Directory not found: ${dir}`);
        }
        return [];
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const modules = fs.existsSync(path.join(dir, "manifest.json"))
        ? [loadModule(dir)]
        : [];
    const nested = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory())
            .map((entry) =>
                discoverModulesRecursively(path.join(dir, entry.name)),
            ),
    );
    return modules.concat(...nested);
};
