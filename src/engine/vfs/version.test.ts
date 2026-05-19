import { describe, expect, it } from "vitest";
import { isSemverNewer } from "./version";

describe("engine/vfs/version", () => {
    it("compares semantic versions correctly", () => {
        expect(isSemverNewer("1.0.1", "1.0.0")).toBe(true);
        expect(isSemverNewer("1.0.0", "1.0.0")).toBe(false);
        expect(isSemverNewer("1.0.0", "1.0.1")).toBe(false);
        expect(isSemverNewer("2", "1.9.9")).toBe(true);
        expect(isSemverNewer("1.2", "1.2.0")).toBe(false);
    });
});
