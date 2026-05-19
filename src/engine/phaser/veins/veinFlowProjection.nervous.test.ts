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

describe("projectVeinEdgeFlow nervous projection", () => {
    it("keeps direct nervous links at zero flow while preserving comfort", () => {
        const graph: VeinGraph = {
            nodes: new Map(),
            edges: [
                edge({
                    sourceId: "sys_world",
                    targetId: "carrier",
                    kind: "nervous",
                    attribute: "nervous",
                }),
            ],
        };

        projectVeinEdgeFlow(graph, [
            {
                id: "sys_world",
                state: { comfort: { value: 0.75 } },
            },
            { id: "carrier" },
        ] as never);

        expect(graph.edges[0]).toMatchObject({
            deliveredRate: 0,
            comfort01: 0.75,
        });
    });

    it("projects routed nervous edges with zero flow from the terminal node", () => {
        const graph: VeinGraph = {
            nodes: new Map(),
            edges: [
                edge({
                    sourceId: "sys_world",
                    targetId: "parent",
                    kind: "nervous",
                    attribute: "nervous",
                }),
                edge({
                    sourceId: "parent",
                    targetId: "carrier",
                    kind: "nervous",
                    attribute: "nervous",
                }),
            ],
        };

        projectVeinEdgeFlow(graph, [
            {
                id: "sys_world",
                state: { comfort: { value: 0.5 } },
            },
            { id: "parent" },
            { id: "carrier" },
        ] as never);

        expect(graph.edges[0]).toMatchObject({
            deliveredRate: 0,
            comfort01: 0.5,
        });
        expect(graph.edges[1]).toMatchObject({
            deliveredRate: 0,
            comfort01: 0.5,
        });
    });
});
