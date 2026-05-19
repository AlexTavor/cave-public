import Phaser from "phaser";

const C = 64;
const R = 54;

const buildSegment = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    radius: number,
) => {
    const angle = Math.atan2(by - ay, bx - ax);
    const dx = Math.cos(angle + Math.PI / 2) * radius;
    const dy = Math.sin(angle + Math.PI / 2) * radius;
    return [
        new Phaser.Geom.Point(ax + dx, ay + dy),
        new Phaser.Geom.Point(bx + dx, by + dy),
        new Phaser.Geom.Point(bx - dx, by - dy),
        new Phaser.Geom.Point(ax - dx, ay - dy),
    ];
};

const strokePolygon = (
    g: Phaser.GameObjects.Graphics,
    sides: number,
    thickness: number,
    color: number,
    alpha: number,
) => {
    g.lineStyle(thickness, color, alpha).beginPath();
    for (let index = 0; index <= sides; index += 1) {
        const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
        const x = C + Math.cos(angle) * R;
        const y = C + Math.sin(angle) * R;
        if (index === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
    g.closePath().strokePath();
};

const drawRoundedSegment = (
    g: Phaser.GameObjects.Graphics,
    from: [number, number],
    to: [number, number],
    radius: number,
) => {
    g.fillPoints(buildSegment(from[0], from[1], to[0], to[1], radius), true);
    g.fillCircle(from[0], from[1], radius);
    g.fillCircle(to[0], to[1], radius);
};

export const drawStrokeGlyphShape = (
    g: Phaser.GameObjects.Graphics,
    shape: string,
    thickness: number,
    color: number,
    outsetPx: number,
    alpha = 1,
) => {
    const width = thickness + outsetPx * 2;
    const radius = Math.max(2, width / 2);
    switch (shape) {
        case "line":
            g.fillStyle(color, alpha).fillRect(C - width / 2, 0, width, 128);
            return true;
        case "chevron":
            drawRoundedSegment(
                g,
                [C - R * 0.6, C - R * 0.4],
                [C, C + R * 0.4],
                radius,
            );
            drawRoundedSegment(
                g,
                [C, C + R * 0.4],
                [C + R * 0.6, C - R * 0.4],
                radius,
            );
            return true;
        case "ring":
            g.lineStyle(width, color, alpha).strokeCircle(C, C, R);
            return true;
        case "hex_ring":
            strokePolygon(g, 6, width, color, alpha);
            return true;
        case "oct_ring":
            strokePolygon(g, 8, width, color, alpha);
            return true;
        case "square_ring":
            g.lineStyle(width, color, alpha).strokeRect(
                C - R,
                C - R,
                R * 2,
                R * 2,
            );
            return true;
        case "chevron_up_rounded":
            drawRoundedSegment(g, [36, 82], [64, 40], radius);
            drawRoundedSegment(g, [64, 40], [92, 82], radius);
            return true;
        default:
            return false;
    }
};
