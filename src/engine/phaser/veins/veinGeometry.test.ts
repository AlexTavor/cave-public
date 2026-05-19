import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    resolveBaseWidth,
    resolveSegmentCount,
    resolveThrottleWidth,
    resolveWaveCycles,
} from "./veinGeometry";
import { makeVeinConfig } from "./veinTestConfig";

const makeConfig = (min = 2, max = 1000) =>
    makeVeinConfig({ thickness: { min_width: min, max_width: max } });

describe("resolveBaseWidth", () => {
    beforeEach(() => {
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("scales logarithmically across power decades", () => {
        expect(resolveBaseWidth(1, makeConfig())).toBe(2);
        expect(resolveBaseWidth(10, makeConfig())).toBe(12);
        expect(resolveBaseWidth(100, makeConfig())).toBe(22);
    });

    it("clamps to min and max bounds", () => {
        expect(resolveBaseWidth(0.1, makeConfig())).toBe(2);
        expect(resolveBaseWidth(1000, makeConfig(2, 20))).toBe(20);
    });

    it.each([0, -5, Number.NaN, Infinity])(
        "logs invalid power %p and returns min width",
        (power) => {
            expect(resolveBaseWidth(power, makeConfig())).toBe(2);
            expect(console.error).toHaveBeenCalledOnce();
            vi.mocked(console.error).mockClear();
        },
    );
});

describe("meter-based vein geometry", () => {
    it("scales wave cycles by world meters", () => {
        const config = makeVeinConfig({ geometry: { waviness_per_meter: 2 } });
        expect(resolveWaveCycles(0, config)).toBe(0);
        expect(resolveWaveCycles(250, config)).toBe(5);
    });

    it("rounds segment counts up per world meter", () => {
        const config = makeVeinConfig({ geometry: { segments_per_meter: 6 } });
        expect(resolveSegmentCount(0, config)).toBe(1);
        expect(resolveSegmentCount(250, config)).toBe(15);
    });
});

describe("resolveThrottleWidth", () => {
    it("returns zero for zero throttle and clamps positive values", () => {
        const config = makeConfig(2, 20);
        expect(resolveThrottleWidth(0, config)).toBe(0);
        expect(resolveThrottleWidth(0.5, config)).toBe(10);
        expect(resolveThrottleWidth(0.01, config)).toBe(2);
        expect(resolveThrottleWidth(2, config)).toBe(20);
    });
});
