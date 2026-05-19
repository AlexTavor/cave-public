import type {
    DisplayPaletteColors,
    DisplayPaletteKey,
} from "./displayKeyKinds";
import { stringHash } from "../../utils/deterministicHash";

const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

const toHex = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");

const parseHex = (color: string) => {
    const value = color.trim().replace("#", "");
    if (value.length !== 6) return null;
    const next = Number.parseInt(value, 16);
    if (!Number.isFinite(next)) return null;
    return { r: (next >> 16) & 255, g: (next >> 8) & 255, b: next & 255 };
};

const parseHsl = (color: string) => {
    const match = /^hsl\(([-\d.]+),\s*([-\d.]+)%?,\s*([-\d.]+)%?\)$/i.exec(
        color.trim(),
    );
    if (!match) return null;
    return {
        h: Number.parseFloat(match[1]),
        s: Number.parseFloat(match[2]),
        l: Number.parseFloat(match[3]),
    };
};

const hslToRgb = ({ h, s, l }: { h: number; s: number; l: number }) => {
    const sat = clamp(s, 0, 100) / 100;
    const light = clamp(l, 0, 100) / 100;
    const hue = ((h % 360) + 360) % 360;
    const chroma = (1 - Math.abs(2 * light - 1)) * sat;
    const sector = hue / 60;
    const x = chroma * (1 - Math.abs((sector % 2) - 1));
    let rgb: [number, number, number] = [chroma, x, 0];
    if (sector >= 1 && sector < 2) rgb = [x, chroma, 0];
    else if (sector >= 2 && sector < 3) rgb = [0, chroma, x];
    else if (sector >= 3 && sector < 4) rgb = [0, x, chroma];
    else if (sector >= 4 && sector < 5) rgb = [x, 0, chroma];
    else if (sector >= 5) rgb = [chroma, 0, x];
    const match = light - chroma / 2;
    return {
        r: (rgb[0] + match) * 255,
        g: (rgb[1] + match) * 255,
        b: (rgb[2] + match) * 255,
    };
};

const darkenRgb = (color: { r: number; g: number; b: number }, ratio: number) =>
    `#${toHex(color.r * (1 - ratio))}${toHex(color.g * (1 - ratio))}${toHex(
        color.b * (1 - ratio),
    )}`;

export const resolveDefaultResourceProgressBarColor = (resourceId: string) => {
    const hue = Math.floor(stringHash(resourceId) * 360);
    return `hsl(${hue}, 70%, 50%)`;
};

export const resolveResourceProgressBarColor = (input: {
    resourceId: string;
    color?: string;
    paletteColorKey?: DisplayPaletteKey;
    paletteColors?: Partial<DisplayPaletteColors>;
}) =>
    (input.paletteColorKey
        ? input.paletteColors?.[input.paletteColorKey]
        : null) ||
    input.color ||
    resolveDefaultResourceProgressBarColor(input.resourceId);

export const resolveResourceProgressTrackColor = (fillColor: string) => {
    const hex = parseHex(fillColor);
    if (hex) return darkenRgb(hex, 0.55);
    const hsl = parseHsl(fillColor);
    if (hsl) {
        return `hsl(${hsl.h}, ${clamp(hsl.s, 0, 100)}%, ${clamp(
            hsl.l * 0.65,
            0,
            100,
        )}%)`;
    }
    return darkenRgb(hslToRgb({ h: 0, s: 0, l: 60 }), 0.35);
};

export const cssColorToTint = (color: string) => {
    const hex = parseHex(color);
    if (hex) return (hex.r << 16) | (hex.g << 8) | hex.b;
    const hsl = parseHsl(color);
    const rgb = hsl ? hslToRgb(hsl) : { r: 255, g: 255, b: 255 };
    return (
        (Math.round(rgb.r) << 16) | (Math.round(rgb.g) << 8) | Math.round(rgb.b)
    );
};
