import { describe, expect, it } from "vitest";
import { projectVeinEdgeFlow } from "./veinFlowProjection";
import type { VeinEdge, VeinGraph } from "./types";

const edge = (overrides: Partial<VeinEdge>): VeinEdge => ({
    sourceId: "a",
    targetId: "b",
    kind: "resource-demand",
    attribute: "body",
    power: 1,
    intensity: 0,
    drawFraction: 0,
    sourceRadius: 10,
    deliveredRate: 0,
    throttle01: 1,
    ...overrides,
});

describe("projectVeinEdgeFlow", () => {
    it("projects direct sink delivery and clamps throttle", () => {
        const graph: VeinGraph = {
            nodes: new Map(),
            edges: [
                edge({
                    sourceId: "sys_world",
                    targetId: "sink_a",
                }),
                edge({
                    sourceId: "sys_world",
                    targetId: "sink_b",
                }),
            ],
        };
        projectVeinEdgeFlow(graph, [
            {
                id: "sink_a",
                powerSink: { allocatedDraw: { body: 6 }, throttle: 0.25 },
            },
            {
                id: "sink_b",
                powerSink: { allocatedDraw: { body: 4 }, throttle: 2 },
            },
        ] as never);
        expect(graph.edges.map((item) => item.deliveredRate)).toEqual([6, 4]);
        expect(graph.edges.map((item) => item.throttle01)).toEqual([0.25, 1]);
    });

    it("forces nervous edges to zero flow and unit throttle", () => {
        const graph: VeinGraph = {
            nodes: new Map(),
            edges: [edge({ kind: "nervous", attribute: "nervous" })],
        };
        projectVeinEdgeFlow(graph, []);
        expect(graph.edges[0]).toMatchObject({
            deliveredRate: 0,
            throttle01: 1,
        });
    });

    it("projects routed demand edges from the terminal sink", () => {
        const graph: VeinGraph = {
            nodes: new Map(),
            edges: [
                edge({ sourceId: "sys_world", targetId: "parent" }),
                edge({ sourceId: "parent", targetId: "child" }),
            ],
        };

        projectVeinEdgeFlow(graph, [
            {
                id: "child",
                powerSink: { allocatedDraw: { body: 8 }, throttle: 0.4 },
            },
        ] as never);

        expect(graph.edges.map((item) => item.deliveredRate)).toEqual([8, 8]);
        expect(graph.edges.map((item) => item.throttle01)).toEqual([0.4, 0.4]);
    });
});
