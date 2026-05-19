import { describe, expect, it } from "vitest";
import { buildDisplayEdges } from "./veinsDisplayBuilder";
import type { VeinGraph } from "./types";
import { makeVeinConfig } from "./veinTestConfig";

const makeGraph = (throttle01 = 0.5, intensity = 0.75): VeinGraph => ({
    nodes: new Map([
        ["pool_body", { id: "pool_body", x: 0, y: 0, radius: 10 }],
        ["sink", { id: "sink", x: 100, y: 0, radius: 8 }],
    ]),
    edges: [
        {
            sourceId: "pool_body",
            targetId: "sink",
            kind: "resource-demand",
            attribute: "body",
            power: 1,
            intensity,
            drawFraction: 0,
            sourceRadius: 10,
            deliveredRate: 15,
            throttle01,
        },
    ],
});

describe("buildDisplayEdges", () => {
    it("uses throttle for demand width and omits zero throttle", () => {
        const config = makeVeinConfig({
            thickness: { min_width: 2, max_width: 20 },
        });
        expect(buildDisplayEdges(makeGraph(0, 0.5), config)).toEqual([]);
        expect(buildDisplayEdges(makeGraph(0.5, 0.5), config)[0]?.widthPx).toBe(
            10,
        );
    });

    it("derives blob spawn rate and speed from delivered flow", () => {
        const config = makeVeinConfig({
            flow: { energy_per_blob: 5, min_blob_spacing_px: 12 },
        });
        const edge = buildDisplayEdges(makeGraph(), config)[0];
        expect(edge?.blobSpawnRateHz).toBe(3);
        expect(edge?.blobSpeedPxPerSec).toBe(120);
        expect(edge?.minBlobSpacingPx).toBe(12);
    });

    it("derives taper, glow, and variance values from config", () => {
        const edge = buildDisplayEdges(makeGraph(), makeVeinConfig())[0];
        expect(edge?.startWidthPx).toBeGreaterThan(edge?.endWidthPx ?? 0);
        expect(edge?.blobSizeVariance01).toBe(0.08);
    });

    it("applies heartbeat saturation to blob tint", () => {
        const config = makeVeinConfig({
            heartbeats: { blob_saturation_multiplier: 2 },
        });
        const idle = buildDisplayEdges(makeGraph(0.5, 0), config)[0];
        const active = buildDisplayEdges(makeGraph(0.5, 1), config)[0];
        expect(idle?.baseColor).toBe(active?.baseColor);
        expect(idle?.pulseColor).not.toBe(active?.pulseColor);
    });

    it("derives authored path shape and waviness settings", () => {
        const config = makeVeinConfig({
            geometry: {
                waviness_per_meter: 2,
                waviness_simplex_scale: 4,
                segments_per_meter: 6,
                meander: {
                    point_count_min: 1,
                    point_count_max: 1,
                    offset_min_px: 20,
                    offset_max_px: 20,
                },
            },
        });
        const edge = buildDisplayEdges(makeGraph(), config)[0];
        expect(edge?.meanderPoints).toHaveLength(1);
        expect(edge?.wavinessSimplexScale).toBe(4);
        expect(edge?.pathLengthPx).toBeGreaterThan(100);
        expect(edge?.freq).toBe((edge?.pathLengthPx ?? 0) / 50);
        expect(edge?.segments).toBe(
            Math.ceil(((edge?.pathLengthPx ?? 0) / 100) * 6),
        );
    });

    it("keeps width and blob flow behavior unchanged while using path length", () => {
        const edge = buildDisplayEdges(makeGraph(), makeVeinConfig())[0];
        expect(edge?.widthPx).toBe(10);
        expect(edge?.blobSpawnRateHz).toBe(1.5);
        expect(edge?.blobSpeedPxPerSec).toBe(120);
    });

    it("assigns unique visual ids to repeated logical routes", () => {
        const graph = makeGraph();
        graph.edges.push({ ...graph.edges[0] });
        const edges = buildDisplayEdges(graph, makeVeinConfig());
        expect(edges).toHaveLength(2);
        expect(edges[0]?.id).toBe("body:pool_body:sink");
        expect(edges[1]?.id).toBe("body:pool_body:sink#1");
        expect(edges[0]?.pathLengthPx).toBe(edges[1]?.pathLengthPx);
    });
});
