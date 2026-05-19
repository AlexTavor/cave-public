import type Phaser from "phaser";

const S = 128;
const C = 64;
const R = 54;
const T = 6;

type DrawFn = (g: Phaser.GameObjects.Graphics) => void;

export const drawCircle: DrawFn = (g) => {
    g.fillCircle(C, C, R);
};

export const drawPixel: DrawFn = (g) => {
    g.fillRect(C - 8, C - 8, 16, 16);
};

export const drawRing: DrawFn = (g) => {
    g.lineStyle(T, 0xffffff, 1);
    g.strokeCircle(C, C, R);
};

const strokeRegularPolygon = (
    g: Phaser.GameObjects.Graphics,
    sides: number,
): void => {
    g.lineStyle(T, 0xffffff, 1);
    g.beginPath();
    for (let i = 0; i <= sides; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const x = C + Math.cos(angle) * R;
        const y = C + Math.sin(angle) * R;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
    g.closePath();
    g.strokePath();
};

export const drawHexRing: DrawFn = (g) => strokeRegularPolygon(g, 6);

export const drawOctRing: DrawFn = (g) => strokeRegularPolygon(g, 8);

export const drawSquareRing: DrawFn = (g) => {
    g.lineStyle(T, 0xffffff, 1);
    g.strokeRect(C - R, C - R, R * 2, R * 2);
};

export const GLYPH_TEXTURE_SIZE = S;
