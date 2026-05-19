import type { VeinHeartbeat } from "../../../data/schemas/assets";

export const clampPulse = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

export const sortEnvelope = (envelope: VeinHeartbeat["envelope"]) =>
    [...envelope].sort((a, b) => a.t - b.t);

export const lerpPulse = (start: number, end: number, t: number) =>
    start + (end - start) * t;

export const hashToPulseUnit = (value: string): number => {
    let hash = 0;
    for (const char of value) {
        const code = char.codePointAt(0) ?? 0;
        hash = (hash << 5) - hash + code;
        hash = Math.trunc(hash);
    }
    return Math.abs(hash % 1000) / 1000;
};
