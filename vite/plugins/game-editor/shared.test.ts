import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    BOOTSTRAP_OUTPUT_PATH,
    DATA_SOURCE_DIR,
    isAllowedReadPath,
    isAllowedSavePath,
    PROJECT_ROOT,
} from "./shared";

describe("game-editor shared path guards", () => {
    it("allows writes under src/data/raw and the exact bootstrap export path", () => {
        expect(isAllowedSavePath(path.join(DATA_SOURCE_DIR, "x.json"))).toBe(
            true,
        );
        expect(isAllowedSavePath(BOOTSTRAP_OUTPUT_PATH)).toBe(true);
    });

    it("keeps read and save access denied outside allowed roots", () => {
        const forbiddenPath = path.join(PROJECT_ROOT, "package.json");
        expect(isAllowedReadPath(forbiddenPath)).toBe(false);
        expect(isAllowedSavePath(forbiddenPath)).toBe(false);
    });
});
