import { describe, expect, it } from "vitest";
import { isModuleSessionFilename } from "./isModuleSessionFilename";

describe("isModuleSessionFilename", () => {
    it("accepts json and semantic module file paths", () => {
        expect(isModuleSessionFilename("game.json")).toBe(true);
        expect(isModuleSessionFilename("modules/blueprints/actors.bp")).toBe(
            true,
        );
        expect(isModuleSessionFilename("scripts/init.cvs")).toBe(true);
    });

    it("rejects manifest files", () => {
        expect(isModuleSessionFilename("manifest.json")).toBe(false);
        expect(
            isModuleSessionFilename("cave_roguelite_gdd_v2/manifest.json"),
        ).toBe(false);
    });
});
