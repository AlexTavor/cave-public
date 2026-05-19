import { beforeEach, describe, expect, it } from "vitest";
import {
    clearStagedProjectVersion,
    getStagedProjectVersion,
    stageProjectVersion,
} from "./projectVersionTracker";

describe("projectVersionTracker", () => {
    beforeEach(() => clearStagedProjectVersion("project/manifest.json"));

    it("stages one patch bump on the first change", () => {
        const staged = stageProjectVersion(
            "project/manifest.json",
            "0.4.2",
            "patch",
        );
        expect(staged.effectiveVersion).toBe("0.4.3");
        expect(staged.versionChanged).toBe(true);
    });

    it("does not increment again for repeated patch staging", () => {
        stageProjectVersion("project/manifest.json", "0.4.2", "patch");
        const repeated = stageProjectVersion(
            "project/manifest.json",
            "0.4.3",
            "patch",
        );
        expect(repeated.effectiveVersion).toBe("0.4.3");
        expect(repeated.versionChanged).toBe(false);
    });

    it("upgrades an existing patch cycle to minor", () => {
        stageProjectVersion("project/manifest.json", "0.4.2", "patch");
        const upgraded = stageProjectVersion(
            "project/manifest.json",
            "0.4.3",
            "minor",
        );
        expect(upgraded.effectiveVersion).toBe("0.5.0");
        expect(upgraded.pendingChange).toBe("minor");
    });

    it("does not downgrade an existing minor cycle", () => {
        stageProjectVersion("project/manifest.json", "0.4.2", "minor");
        const repeated = stageProjectVersion(
            "project/manifest.json",
            "0.5.0",
            "patch",
        );
        expect(repeated.effectiveVersion).toBe("0.5.0");
        expect(repeated.versionChanged).toBe(false);
    });

    it("clears the staged cycle", () => {
        stageProjectVersion("project/manifest.json", "0.4.2", "patch");
        clearStagedProjectVersion("project/manifest.json");
        expect(getStagedProjectVersion("project/manifest.json")).toBeNull();
    });
});
