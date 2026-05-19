const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

export const parseHex = (hex: string) => {
    const value = Number.parseInt(hex.replace("#", ""), 16);
    return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
};

export const toInt = (r: number, g: number, b: number): number =>
    (r << 16) | (g << 8) | b;

export const toHsl = (r: number, g: number, b: number) => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (delta !== 0) {
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
        if (max === rn) {
            h = (gn - bn) / delta + (gn < bn ? 6 : 0);
        } else if (max === gn) {
            h = (bn - rn) / delta + 2;
        } else {
            h = (rn - gn) / delta + 4;
        }
        h /= 6;
    }
    return { h, s, l };
};

const hueToRgb = (p: number, q: number, t: number) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
};

export const fromHsl = (h: number, s: number, l: number) => {
    if (s === 0) {
        const v = Math.round(l * 255);
        return { r: v, g: v, b: v };
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hueToRgb(p, q, h + 1 / 3);
    const g = hueToRgb(p, q, h);
    const b = hueToRgb(p, q, h - 1 / 3);
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
};

export const resolveVeinColor = (
    baseColor: string,
    intensity: number,
    dim: number,
    bright: number,
): number => {
    const parsed = parseHex(baseColor);
    const hsl = toHsl(parsed.r, parsed.g, parsed.b);
    const multiplier = dim + intensity * (bright - dim);
    const l = clamp(hsl.l * multiplier, 0, 1);
    const rgb = fromHsl(hsl.h, hsl.s, l);
    return toInt(rgb.r, rgb.g, rgb.b);
};

export const shiftHue = (hex: string, degrees: number): string => {
    const parsed = parseHex(hex);
    const hsl = toHsl(parsed.r, parsed.g, parsed.b);
    const rgb = fromHsl((hsl.h + degrees / 360 + 1) % 1, hsl.s, hsl.l);
    return `#${toInt(rgb.r, rgb.g, rgb.b).toString(16).padStart(6, "0")}`;
};

export const scaleSaturationInt = (color: number, factor: number): number => {
    const rgb = {
        r: (color >> 16) & 0xff,
        g: (color >> 8) & 0xff,
        b: color & 0xff,
    };
    const hsl = toHsl(rgb.r, rgb.g, rgb.b);
    const next = fromHsl(hsl.h, clamp(hsl.s * factor, 0, 1), hsl.l);
    return toInt(next.r, next.g, next.b);
};

export const resolveHeartbeatBlobTint = (
    baseColor: string,
    intensity01: number,
    brightFactor: number,
    saturationMultiplier: number,
): number => {
    const parsed = parseHex(baseColor);
    const hsl = toHsl(parsed.r, parsed.g, parsed.b);
    const sat = clamp(
        hsl.s * (1 + clamp(intensity01, 0, 1) * (saturationMultiplier - 1)),
        0,
        1,
    );
    const lit = clamp(hsl.l * brightFactor, 0, 1);
    const rgb = fromHsl(hsl.h, sat, lit);
    return toInt(rgb.r, rgb.g, rgb.b);
};

