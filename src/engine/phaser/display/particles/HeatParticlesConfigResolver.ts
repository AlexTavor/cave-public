import type {
    ParticleKindResolver,
    ParticleEmitterConfig,
} from "./ParticlesKinds";

const HEAT_CONFIG: ParticleEmitterConfig = {
    speed: { min: 10, max: 40 },
    lifespan: 800,
    scale: { start: 0.6, end: 0 },
    alpha: { start: 0.7, end: 0 },
    frequency: 80,
    quantity: 1,
    blendMode: "ADD",
};

const HEAT_THRESHOLD = 0.1;

export const HeatParticlesConfigResolver: ParticleKindResolver = {
    kind: "heat",
    getConfig: () => HEAT_CONFIG,
    mapIntensity(intensity: number) {
        if (intensity < HEAT_THRESHOLD) {
            return { enabled: false, frequency: -1 };
        }
        const freq = Math.max(20, HEAT_CONFIG.frequency * (1 - intensity));
        return { enabled: true, frequency: freq };
    },
};
