import type { BackgroundConfig } from "../../../data/schemas/assets";

type Vec2 = { x: number; y: number };

export interface BiologicalFogUniforms {
    resolution: Vec2;
    cameraScroll: Vec2;
    cameraZoom: number;
    timeMs: number;
    pulse01: number;
    baseColor: [number, number, number];
    liftColor: [number, number, number];
    intensity: number;
    largeScale: number;
    smallScale: number;
    largeDrift: Vec2;
    smallDrift: Vec2;
    thresholdLow: number;
    thresholdHigh: number;
    heartbeatAmplitude: number;
}

const PURGE_RED: [number, number, number] = [1, 0, 0];
const PURGE_TINT_STRENGTH = 0.15;

const normalizeHexColor = (value: string): [number, number, number] => {
    const compact = value.trim().replace(/^#/, "");
    const hex =
        compact.length === 3
            ? compact
                  .split("")
                  .map((part) => `${part}${part}`)
                  .join("")
            : compact;
    if (!/^[0-9a-f]{6}$/i.test(hex)) {
        throw new Error(`Invalid biological fog color '${value}'`);
    }
    return [0, 2, 4].map(
        (index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255,
    ) as [number, number, number];
};

export const resolveBiologicalFogUniforms = (input: {
    config: BackgroundConfig;
    purgeActive: boolean;
    timeMs: number;
    pulse01: number;
    cameraScrollX: number;
    cameraScrollY: number;
    cameraZoom: number;
    viewportWidth: number;
    viewportHeight: number;
}): BiologicalFogUniforms => {
    const pulse01 = Math.max(0, Math.min(1, input.pulse01));
    const baseColor = normalizeHexColor(input.config.base_color);
    const purgeMix = input.purgeActive ? pulse01 * PURGE_TINT_STRENGTH : 0;
    return {
        resolution: {
            x: input.viewportWidth / Math.max(input.cameraZoom, 0.0001),
            y: input.viewportHeight / Math.max(input.cameraZoom, 0.0001),
        },
        cameraScroll: { x: input.cameraScrollX, y: input.cameraScrollY },
        cameraZoom: input.cameraZoom,
        timeMs: input.timeMs,
        pulse01,
        baseColor: baseColor.map(
            (value, index) => value + (PURGE_RED[index] - value) * purgeMix,
        ) as [number, number, number],
        liftColor: normalizeHexColor(input.config.lift_color),
        intensity: input.config.intensity,
        largeScale: input.config.large_scale,
        smallScale: input.config.small_scale,
        largeDrift: input.config.large_drift_per_ms,
        smallDrift: input.config.small_drift_per_ms,
        thresholdLow: input.config.threshold_low,
        thresholdHigh: input.config.threshold_high,
        heartbeatAmplitude: input.config.heartbeat_amplitude,
    };
};
