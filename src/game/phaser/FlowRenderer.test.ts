import { describe, it, expect, vi } from "vitest";
import { FlowRenderer, calculateThickness } from "./FlowRenderer";

const makeTarget = () => {
    return {
        clear: vi.fn(),
        lineStyle: vi.fn(),
        lineBetween: vi.fn(),
    };
};

describe("calculateThickness", () => {
    it("returns 0 when total is 0", () => {
        expect(calculateThickness(5, 0)).toBe(0);
    });

    it("returns 0 when contribution is 0", () => {
        expect(calculateThickness(0, 10)).toBe(0);
    });

    it("clamps ratio above 1", () => {
        expect(calculateThickness(20, 10, 8)).toBe(8);
    });

    it("scales proportionally", () => {
        expect(calculateThickness(5, 10, 8)).toBe(4);
    });
});

describe("FlowRenderer", () => {
    it("draws lines for valid edges", () => {
        const target = makeTarget();
        const renderer = new FlowRenderer(target);

        renderer.render(
            [
                {
                    from: { x: 0, y: 0 },
                    to: { x: 10, y: 0 },
                    contribution: 5,
                    total: 10,
                    color: 0x00ff00,
                },
            ],
            8,
        );

        expect(target.clear).toHaveBeenCalled();
        expect(target.lineStyle).toHaveBeenCalledWith(4, 0x00ff00, 0.9);
        expect(target.lineBetween).toHaveBeenCalledWith(0, 0, 10, 0);
    });

    it("skips edges with zero thickness", () => {
        const target = makeTarget();
        const renderer = new FlowRenderer(target);

        renderer.render(
            [
                {
                    from: { x: 0, y: 0 },
                    to: { x: 10, y: 0 },
                    contribution: 0,
                    total: 10,
                },
            ],
            8,
        );

        expect(target.lineStyle).not.toHaveBeenCalled();
        expect(target.lineBetween).not.toHaveBeenCalled();
    });
});
