import { describe, expect, it } from "vitest";
import { calcThroughputRate } from "./throughputCalc";

describe("calcThroughputRate", () => {
    it("returns throughput for valid inputs", () => {
        expect(calcThroughputRate(10, 0.5, 1000)).toBeCloseTo(5);
    });

    it("returns 0 when efficiency is zero", () => {
        expect(calcThroughputRate(10, 0, 1000)).toBe(0);
    });

    it("returns 0 when threshold is zero", () => {
        expect(calcThroughputRate(10, 0.5, 0)).toBe(0);
    });
});
