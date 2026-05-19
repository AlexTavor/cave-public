import type { VeinConfig } from "../../../data/schemas/assets";
import type { VeinEdge } from "./types";

const PX_PER_DECADE = 10;
const PX_PER_METER = 100;

export const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

/**
 * Resolves the static base width of the vein based on the power throughput.
 * Scales logarithmically: each ×10 increase in power adds +10 px (before clamping).
 */
export const resolveBaseWidth = (power: number, config: VeinConfig): number => {
    const { min_width, max_width } = config.thickness;
    if (!Number.isFinite(power) || power <= 0) {
        console.error(
            `[resolveBaseWidth] Invalid power=${power}; using min_width=${min_width}`,
        );
        return min_width;
    }
    const raw = min_width + PX_PER_DECADE * Math.log10(power);
    return clamp(raw, min_width, max_width);
};

/**
 * Resolves the pulsing width.
 * Pulses the base width by the multiplier.
 * 100% pulse (2.0x multiplier) means 10px -> 20px and 100px -> 200px.
 */
export const resolvePulsedWidth = (
    base: number,
    intensity: number,
    config: VeinConfig,
): number => {
    const { thickness } = config;

    // Scale the entire base linearly by the heartbeat intensity.
    // multiplier = 1.0 (resting) to pulse_width_multiplier (peak)
    const multiplier =
        1 + (thickness.pulse_width_multiplier - 1) * clamp(intensity, 0, 1);

    const pulsed = base * multiplier;

    // Final safety clamp
    return clamp(pulsed, thickness.min_width, thickness.max_width);
};

/**
 * Resolves the width for demand edges (Pool -> Sink).
 * Consistently uses the same structural logic as supply edges.
 */
export const resolveDemandWidth = (
    sourceRadius: number,
    drawFraction: number,
    intensity: number,
    config: VeinConfig,
): number => {
    // A demand edge's "power" is essentially the fraction of the source's diameter it consumes.
    const base = sourceRadius * 2 * Math.max(0, drawFraction);

    // Pulse the calculated base
    return resolvePulsedWidth(base, intensity, config);
};

export const resolveThrottleWidth = (
    throttle01: number,
    config: VeinConfig,
): number => {
    if (throttle01 <= 0) return 0;
    return clamp(
        config.thickness.max_width * throttle01,
        config.thickness.min_width,
        config.thickness.max_width,
    );
};

export const resolveWaveCycles = (
    lengthPx: number,
    config: VeinConfig,
): number =>
    (Math.max(0, lengthPx) / PX_PER_METER) * config.geometry.waviness_per_meter;

export const resolveSegmentCount = (
    lengthPx: number,
    config: VeinConfig,
): number =>
    Math.max(
        1,
        Math.ceil(
            (Math.max(0, lengthPx) / PX_PER_METER) *
                config.geometry.segments_per_meter,
        ),
    );

export const groupEdges = (edges: VeinEdge[]): VeinEdge[][] => {
    const grouped = new Map<string, VeinEdge[]>();
    for (const edge of edges) {
        const key = `${edge.sourceId}|${edge.targetId}`;
        const bucket = grouped.get(key);
        if (bucket) {
            bucket.push(edge);
        } else {
            grouped.set(key, [edge]);
        }
    }
    return [...grouped.values()];
};

export const resolveOffsetStep = (config: VeinConfig): number =>
    config.thickness.min_width * 2;

