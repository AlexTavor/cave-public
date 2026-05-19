import type { VeinConfig } from "../../../data/schemas/assets";
import { resolveHeartbeatBlobTint, shiftHue } from "./colorUtils";

const FALLBACK_HEX = "#9e9e9e";

const parseHex = (hex: string): [number, number, number] => {
    const color = Number.parseInt(hex.replace("#", ""), 16);
    return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
};

const applyFactor = (hex: string, factor: number): number => {
    const [r, g, b] = parseHex(hex);
    return (
        (Math.min(255, Math.round(r * factor)) << 16) |
        (Math.min(255, Math.round(g * factor)) << 8) |
        Math.min(255, Math.round(b * factor))
    );
};

export const resolveDisplayColors = (
    edgeId: string,
    veinType: string,
    intensity01: number,
    config: VeinConfig,
): { baseColor: number; pulseColor: number } => {
    const key = `base_${veinType}` as keyof VeinConfig["colors"];
    const hex =
        typeof config.colors[key] === "string"
            ? config.colors[key]
            : FALLBACK_HEX;
    const unit = ((edgeId.length + (edgeId.codePointAt(0) ?? 0)) % 1000) / 999;
    const shifted = shiftHue(
        hex,
        (unit * 2 - 1) * config.colors.hue_variance_degrees,
    );
    return {
        baseColor: applyFactor(shifted, config.colors.supply_dim_factor),
        pulseColor: resolveHeartbeatBlobTint(
            shifted,
            intensity01,
            config.colors.supply_bright_factor,
            config.heartbeats.blob_saturation_multiplier,
        ),
    };
};
