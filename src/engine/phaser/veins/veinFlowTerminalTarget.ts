import type { VeinEdge, VeinGraph } from "./types";

const findNextEdgeIndex = (
    graph: VeinGraph,
    edge: VeinEdge,
    startIndex: number,
): number => {
    for (let index = startIndex + 1; index < graph.edges.length; index += 1) {
        const next = graph.edges[index];
        if (
            next.kind === edge.kind &&
            next.attribute === edge.attribute &&
            next.sourceId === edge.targetId
        ) {
            return index;
        }
    }
    return -1;
};

export const resolveTerminalChainTargetId = (
    graph: VeinGraph,
    startIndex: number,
    scope: string,
): string => {
    const seen = new Set<number>();
    let currentIndex = startIndex;
    while (!seen.has(currentIndex)) {
        seen.add(currentIndex);
        const edge = graph.edges[currentIndex];
        const nextIndex = edge
            ? findNextEdgeIndex(graph, edge, currentIndex)
            : -1;
        if (nextIndex === -1) return edge?.targetId ?? "";
        currentIndex = nextIndex;
    }
    console.error(
        `[${scope}] Cycle detected in routed vein chain.`,
        graph.edges[startIndex],
    );
    return (
        graph.edges[currentIndex]?.targetId ??
        graph.edges[startIndex]?.targetId ??
        ""
    );
};
