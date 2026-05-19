export type VeinAttribute = "body" | "mind" | "social" | "nervous";
export type VeinEdgeKind = "resource-demand" | "nervous";

export interface VeinNode {
    id: string;
    x: number;
    y: number;
    radius: number;
}

export interface VeinEdge {
    sourceId: string;
    targetId: string;
    kind: VeinEdgeKind;
    attribute: VeinAttribute;
    power: number;
    intensity: number;
    drawFraction: number;
    sourceRadius: number;
    deliveredRate: number;
    throttle01: number;
    comfort01?: number;
}

export interface VeinGraph {
    nodes: Map<string, VeinNode>;
    edges: VeinEdge[];
}

