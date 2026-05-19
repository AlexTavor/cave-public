import type {
    ParticleKindResolver,
    ParticleEmitterConfig,
} from "./ParticlesKinds";

const XP_CONFIG: ParticleEmitterConfig = {
    speed: { min: 20, max: 60 },
    lifespan: 600,
    scale: { start: 0.4, end: 0 },
    alpha: { start: 0.9, end: 0 },
    frequency: 120,
    quantity: 1,
    blendMode: "ADD",
};

const XP_THRESHOLD = 0.05;

export const XpParticlesConfigResolver: ParticleKindResolver = {
    kind: "xp",
    getConfig: () => XP_CONFIG,
    mapIntensity(intensity: number) {
        if (intensity < XP_THRESHOLD) {
            return { enabled: false, frequency: -1 };
        }
        const freq = Math.max(30, XP_CONFIG.frequency * (1 - intensity));
        return { enabled: true, frequency: freq };
    },
};
