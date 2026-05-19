import { describe, expect, it } from "vitest";
import {
    classifyManifestChange,
    createProjectManifest,
    parseProjectManifest,
} from "./projectManifest";

describe("projectManifest versioning", () => {
    it("normalizes missing versions and validates present versions", () => {
        expect(
            parseProjectManifest(
                { name: "Project", files: [] },
                "manifest.json",
            ).version,
        ).toBe("0.0.0");
        expect(() =>
            parseProjectManifest(
                { name: "Project", version: "nope", files: [] },
                "manifest.json",
            ),
        ).toThrow(/invalid version/);
    });

    it("creates versioned manifests and classifies changes", () => {
        const created = createProjectManifest("Project");
        expect(created.version).toBe("0.0.1");
        expect(
            classifyManifestChange(created, {
                ...created,
                files: ["modules/swarm.bp"],
            }),
        ).toBe("minor");
        expect(
            classifyManifestChange(created, { ...created, name: "Renamed" }),
        ).toBe("patch");
        expect(
            classifyManifestChange(
                { ...created, files: ["a.bp", "b.bp"] },
                { ...created, files: ["b.bp"] },
            ),
        ).toBe("patch");
        expect(classifyManifestChange(created, created)).toBeNull();
    });
});
