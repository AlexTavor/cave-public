import { describe, expect, it } from "vitest";
import {
    buildAddOptions,
    normalizeManifestFiles,
    stripProjectPrefix,
} from "./manifestPaths";

describe("manifestPaths", () => {
    it("strips project root prefix from file paths", () => {
        expect(
            stripProjectPrefix(
                "cave_roguelite_gdd_v2/modules/world.bp",
                "cave_roguelite_gdd_v2",
            ),
        ).toBe("modules/world.bp");
    });

    it("normalizes manifest files and removes duplicates", () => {
        expect(
            normalizeManifestFiles(
                ["cave_roguelite_gdd_v2/modules/world.bp", "modules/world.bp"],
                "cave_roguelite_gdd_v2",
            ),
        ).toEqual(["modules/world.bp"]);
    });

    it("builds add-file options excluding already-added files", () => {
        const scanned = [
            "cave_roguelite_gdd_v2/modules/world.bp",
            "modules/swarm.bp",
        ];
        const existing = ["modules/world.bp"];
        expect(
            buildAddOptions(scanned, existing, "cave_roguelite_gdd_v2"),
        ).toEqual(["modules/swarm.bp"]);
    });
});
