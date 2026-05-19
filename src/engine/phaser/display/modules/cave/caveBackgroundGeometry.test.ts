import { describe, expect, it } from "vitest";
import { DEFAULT_CAVE_FUR_RENDER } from "../../../../../data/schemas/game/caveMindRender";
import {
    computeCaveContour,
    computeCaveFurWedges,
} from "./caveBackgroundGeometry";

const fur = { ...DEFAULT_CAVE_FUR_RENDER, sampleCount: 24, hairStride: 3 };

const area = (points: Array<{ x: number; y: number }>) =>
    points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + point.x * next.y - next.x * point.y;
    }, 0);

describe("caveBackgroundGeometry", () => {
    it("is deterministic for identical inputs", () => {
        const first = computeCaveContour({
            entityId: "cave",
            radius: 40,
            timeMs: 1000,
            pulseValue: 0.5,
            fur,
        });
        const second = computeCaveContour({
            entityId: "cave",
            radius: 40,
            timeMs: 1000,
            pulseValue: 0.5,
            fur,
        });
        expect(second).toEqual(first);
    });

    it("builds contour points from sampleCount", () => {
        expect(
            computeCaveContour({
                entityId: "cave",
                radius: 40,
                timeMs: 0,
                pulseValue: 0,
                fur,
            }),
        ).toHaveLength(24);
    });

    it("builds one fur root per stride", () => {
        const contour = computeCaveContour({
            entityId: "cave",
            radius: 40,
            timeMs: 0,
            pulseValue: 0,
            fur,
        });
        expect(
            computeCaveFurWedges({
                entityId: "cave",
                timeMs: 0,
                pulseValue: 0,
                fur,
                contour,
            }),
        ).toHaveLength(8);
    });

    it("changes contour and hair length with pulse", () => {
        const contour0 = computeCaveContour({
            entityId: "cave",
            radius: 40,
            timeMs: 0,
            pulseValue: 0,
            fur,
        });
        const contour1 = computeCaveContour({
            entityId: "cave",
            radius: 40,
            timeMs: 0,
            pulseValue: 1,
            fur,
        });
        const hairs0 = computeCaveFurWedges({
            entityId: "cave",
            timeMs: 0,
            pulseValue: 0,
            fur,
            contour: contour0,
        });
        const hairs1 = computeCaveFurWedges({
            entityId: "cave",
            timeMs: 0,
            pulseValue: 1,
            fur,
            contour: contour1,
        });
        expect(contour1[0]).not.toEqual(contour0[0]);
        expect(hairs1[0].effectiveLength).toBeGreaterThan(
            hairs0[0].effectiveLength,
        );
    });

    it("emits non-self-intersecting wedges", () => {
        const contour = computeCaveContour({
            entityId: "cave",
            radius: 40,
            timeMs: 250,
            pulseValue: 0.5,
            fur,
        });
        const wedges = computeCaveFurWedges({
            entityId: "cave",
            timeMs: 250,
            pulseValue: 0.5,
            fur,
            contour,
        });
        expect(
            wedges.every((wedge) => Math.abs(area(wedge.points)) > 0.01),
        ).toBe(true);
    });
});
