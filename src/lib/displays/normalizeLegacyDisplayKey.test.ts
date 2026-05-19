import { describe, expect, it } from "vitest";
import { normalizeLegacyDisplayKey } from "./normalizeLegacyDisplayKey";

describe("normalizeLegacyDisplayKey", () => {
    it("keeps authored outside unchanged while still normalizing old keys", () => {
        expect(normalizeLegacyDisplayKey("outside")).toBe("outside");
        expect(normalizeLegacyDisplayKey("status_exhausted")).toBe("attr_body");
        expect(normalizeLegacyDisplayKey("cave_bodies")).toBe("luretraveler");
    });
});
