import type { VeinAttribute, VeinEdge, VeinEdgeKind, VeinGraph } from "./types";

type EdgeInput = {
    sourceId: string;
    targetId: string;
    kind: VeinEdgeKind;
    attribute: VeinAttribute;
    power: number;
    sourceRadius: number;
    drawFraction?: number;
};

export const pushVeinEdge = (
    graphBuffer: VeinGraph,
    input: EdgeInput,
): VeinEdge => {
    const edge: VeinEdge = {
        ...input,
        drawFraction: input.drawFraction ?? 0,
        intensity: 0,
        deliveredRate: 0,
        throttle01: 1,
    };
    graphBuffer.edges.push(edge);
    return edge;
};
