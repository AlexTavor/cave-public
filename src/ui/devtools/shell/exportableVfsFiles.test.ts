import { describe, expect, it } from "vitest";
import { isExportableVfsFile } from "./exportableVfsFiles";

describe("isExportableVfsFile", () => {
    it("excludes save files without hiding regular project files", () => {
        expect(isExportableVfsFile("saves/autosave.json")).toBe(false);
        expect(isExportableVfsFile("/saves/slot-1.json")).toBe(false);
        expect(isExportableVfsFile("project/modules/core.bp")).toBe(true);
    });
});
