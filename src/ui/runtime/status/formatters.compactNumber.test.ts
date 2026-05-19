import { describe, expect, it } from "vitest";
import { formatCompactNumber } from "./formatters";

describe("formatCompactNumber", () => {
    it("preserves the shared rounded compact-number behavior", () => {
        expect(formatCompactNumber(0)).toBe("0");
        expect(formatCompactNumber(12)).toBe("12");
        expect(formatCompactNumber(999)).toBe("999");
        expect(formatCompactNumber(1_000)).toBe("1k");
    });
});
