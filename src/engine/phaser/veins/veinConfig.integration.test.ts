import { describe, expect, it } from "vitest";
import { parseVeinConfig } from "./veinsRuntimeHelpers";
import { buildDisplayEdges } from "./veinsDisplayBuilder";
import { buildRopePointsFull } from "../display/modules/veins/veinsRopeUtils";

const graph = {
    nodes: new Map([
        ["a", { id: "a", x: 0, y: 0, radius: 10 }],
        ["b", { id: "b", x: 200, y: 0, radius: 8 }],
    ]),
    edges: [
        {
            sourceId: "a",
            targetId: "b",
            kind: "resource-demand",
            attribute: "body",
            power: 1,
            intensity: 0.5,
            drawFraction: 0,
            sourceRadius: 10,
            deliveredRate: 10,
            throttle01: 0.5,
        },
    ],
};

describe("vein config integration", () => {
    it("carries authored meander and simplex scale through parse to rope samples", () => {
        const config = parseVeinConfig({
            settings: {
                vein_network: {
                    geometry: {
                        waviness_per_meter: 2,
                        waviness_simplex_scale: 3,
                        segments_per_meter: 12,
                        meander: {
                            point_count_min: 1,
                            point_count_max: 1,
                            offset_min_px: 18,
                            offset_max_px: 18,
                        },
                    },
                },
            },
        });
        const edge = buildDisplayEdges(graph as never, config)[0];
        if (!edge) throw new Error("expected display edge");
        expect(edge.meanderPoints).toHaveLength(1);
        expect(edge.wavinessSimplexScale).toBe(3);
        expect(edge.segments).toBe(Math.ceil((edge.pathLengthPx / 100) * 12));
        const points = buildRopePointsFull(edge);
        expect(points[0]).toEqual({ x: 0, y: 0 });
        expect(points.at(-1)).toEqual({ x: 200, y: 0 });
        expect(points.length).toBeGreaterThanOrEqual((edge.segments ?? 0) + 1);
    });

    it("removes waviness noise without requiring authored guide-point pass-through", () => {
        const edge = buildDisplayEdges(
            graph as never,
            parseVeinConfig({
                settings: {
                    vein_network: {
                        geometry: {
                            waviness_per_meter: 0,
                            waviness_simplex_scale: 0,
                            meander: {
                                point_count_min: 1,
                                point_count_max: 1,
                                offset_min_px: 18,
                                offset_max_px: 18,
                            },
                        },
                    },
                },
            }),
        )[0];
        if (!edge) throw new Error("expected display edge");
        const points = buildRopePointsFull(edge);
        expect(points[0]).toEqual({ x: 0, y: 0 });
        expect(points.at(-1)).toEqual({ x: 200, y: 0 });
        expect(points.some((point) => Math.abs(point.y) > 0.5)).toBe(true);
        expect(points).not.toEqual(expect.arrayContaining(edge.meanderPoints));
    });
});
