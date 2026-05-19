import type { VeinConfig, VeinHeartbeat } from "../../../data/schemas/assets";
import { DEFAULT_VEIN_HEARTBEAT } from "../../../data/schemas/assets";
import {
    DISPLAY_PALETTE_DEFAULT_COLORS,
    type DisplayPaletteColors,
} from "../../../lib/displays/displayKeyKinds";
import {
    clampPulse,
    hashToPulseUnit,
    lerpPulse,
    sortEnvelope,
} from "./pulseEngineMath";

type PulseNodeColors = DisplayPaletteColors & {
    nervous: string;
    assignable: string;
    absorption: string;
};

export class PulseEngine {
    private config: VeinConfig;
    private activePresetKey?: string;
    private envelopeCache: {
        heartbeat: VeinHeartbeat;
        points: VeinHeartbeat["envelope"];
    } | null = null;

    constructor(config: VeinConfig) {
        this.config = config;
    }

    public setConfig(config: VeinConfig): void {
        this.config = config;
        this.envelopeCache = null;
    }

    public setActivePreset(key: string | undefined): void {
        this.activePresetKey = key;
        this.envelopeCache = null;
    }

    public getAllNodeColors(): PulseNodeColors {
        return {
            ...DISPLAY_PALETTE_DEFAULT_COLORS,
            body: this.config.colors.base_body,
            mind: this.config.colors.base_mind,
            social: this.config.colors.base_social,
            nervous: this.config.colors.base_nervous,
            assignable: this.config.colors.base_assignable,
            absorption: this.config.colors.base_absorption,
        };
    }

    public getSupplyPulse(time: number): number {
        return this.sampleHeartbeat(time, 0);
    }

    public getDemandPulse(entityId: string, time: number): number {
        return this.sampleHeartbeat(time, hashToPulseUnit(entityId));
    }

    private sampleHeartbeat(time: number, offset: number): number {
        const heartbeat = this.resolveHeartbeat();
        const bpm = Math.max(1, heartbeat.bpm);
        const cycleDuration = 60000 / bpm;
        const shifted = time + cycleDuration * offset;
        const phase =
            (((shifted % cycleDuration) + cycleDuration) % cycleDuration) /
            cycleDuration;
        return clampPulse(this.sampleEnvelope(phase, heartbeat), 0, 1);
    }

    private resolveHeartbeat(): VeinHeartbeat {
        const { default: key, presets } = this.config.heartbeats;
        const selected = presets[this.activePresetKey ?? key];
        return selected ?? DEFAULT_VEIN_HEARTBEAT;
    }

    private sampleEnvelope(phase: number, heartbeat: VeinHeartbeat): number {
        const points = this.getSortedEnvelope(heartbeat);
        if (points.length === 0) return 0;
        if (phase <= points[0].t) return points[0].v;
        const last = points.at(-1);
        if (last && phase >= last.t) {
            return last.v;
        }

        for (let i = 1; i < points.length; i += 1) {
            const prev = points[i - 1];
            const next = points[i];
            if (phase <= next.t) {
                const span = Math.max(0.0001, next.t - prev.t);
                const t = (phase - prev.t) / span;
                return lerpPulse(prev.v, next.v, t);
            }
        }

        return points.at(-1)?.v ?? 0;
    }

    private getSortedEnvelope(
        heartbeat: VeinHeartbeat,
    ): VeinHeartbeat["envelope"] {
        if (this.envelopeCache?.heartbeat !== heartbeat) {
            this.envelopeCache = {
                heartbeat,
                points: sortEnvelope(heartbeat.envelope),
            };
        }
        return this.envelopeCache.points;
    }
}

