import type { CaveContourPoint, CaveHairWedge } from "./caveBackgroundGeometry";

interface PolygonGraphics {
    clear(): void;
    fillStyle(color: number, alpha?: number): void;
    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
    fillPath(): void;
}

const BLACK = 0x000000;

const tracePolygon = (
    graphics: PolygonGraphics,
    points: Array<{ x: number; y: number }>,
) => {
    if (points.length < 3) return;
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index++) {
        graphics.lineTo(points[index].x, points[index].y);
    }
    graphics.closePath();
};

export const renderCaveBody = (
    graphics: PolygonGraphics,
    contour: CaveContourPoint[],
) => {
    graphics.clear();
    if (!contour.length) return;
    graphics.fillStyle(BLACK, 1);
    tracePolygon(graphics, contour);
    graphics.fillPath();
};

export const renderCaveHairs = (
    graphics: PolygonGraphics,
    wedges: CaveHairWedge[],
) => {
    graphics.clear();
    graphics.fillStyle(BLACK, 1);
    for (const wedge of wedges) {
        tracePolygon(graphics, wedge.points);
        graphics.fillPath();
    }
};
