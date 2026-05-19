import Phaser from "phaser";

const S = 128;
const C = 64;
const R = 54;
const T = 10;

type DrawFn = (g: Phaser.GameObjects.Graphics) => void;

export const drawLine: DrawFn = (g) => {
    g.fillRect(C - T / 2, 0, T, S);
};

export const drawChevron: DrawFn = (g) => {
    g.lineStyle(T, 0xffffff, 1);
    g.beginPath();
    g.moveTo(C - R * 0.6, C - R * 0.4);
    g.lineTo(C, C + R * 0.4);
    g.lineTo(C + R * 0.6, C - R * 0.4);
    g.strokePath();
};

export const drawCrescent: DrawFn = (g) => {
    g.fillCircle(C, C, R * 0.7);
    g.fillStyle(0x000000, 1);
    g.fillCircle(C + R * 0.3, C, R * 0.55);
    g.fillStyle(0xffffff, 1);
};

export const drawTriangle: DrawFn = (g) => {
    g.fillTriangle(
        C,
        C - R,
        C + R * 0.9,
        C + R * 0.7,
        C - R * 0.9,
        C + R * 0.7,
    );
};

export const drawStar5: DrawFn = (g) => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? R : R * 0.4;
        pts.push(
            new Phaser.Geom.Point(
                C + Math.cos(angle) * r,
                C + Math.sin(angle) * r,
            ),
        );
    }
    g.fillPoints(pts, true);
};

export const drawStar6: DrawFn = (g) => {
    const drawTri = (offset: number) => {
        const pts: Phaser.Geom.Point[] = [];
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3 + offset;
            pts.push(
                new Phaser.Geom.Point(
                    C + Math.cos(angle) * R,
                    C + Math.sin(angle) * R,
                ),
            );
        }
        g.fillPoints(pts, true);
    };
    drawTri(-Math.PI / 2);
    drawTri(Math.PI / 2);
};
