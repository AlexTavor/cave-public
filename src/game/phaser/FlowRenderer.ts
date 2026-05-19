export interface FlowPoint {
    x: number;
    y: number;
}

export interface FlowEdge {
    from: FlowPoint;
    to: FlowPoint;
    contribution: number;
    total: number;
    color?: number;
}

export interface FlowRenderTarget {
    clear: () => void;
    lineStyle: (width: number, color: number, alpha?: number) => void;
    lineBetween: (x1: number, y1: number, x2: number, y2: number) => void;
}

export const calculateThickness = (
    contribution: number,
    total: number,
    maxThickness = 8,
): number => {
    if (!Number.isFinite(contribution) || !Number.isFinite(total)) return 0;
    if (contribution <= 0 || total <= 0) return 0;
    const ratio = Math.min(1, contribution / total);
    const scaled = ratio * maxThickness;
    return Math.max(
        0,
        Math.min(maxThickness, Number.parseFloat(scaled.toFixed(2))),
    );
};

export class FlowRenderer {
    private readonly target: FlowRenderTarget;

    constructor(target: FlowRenderTarget) {
        this.target = target;
    }

    public render(edges: FlowEdge[], maxThickness = 8): void {
        this.target.clear();

        for (const edge of edges) {
            const thickness = calculateThickness(
                edge.contribution,
                edge.total,
                maxThickness,
            );

            if (thickness <= 0) continue;

            const color = edge.color ?? 0xffffff;
            this.target.lineStyle(thickness, color, 0.9);
            this.target.lineBetween(
                edge.from.x,
                edge.from.y,
                edge.to.x,
                edge.to.y,
            );
        }
    }
}
