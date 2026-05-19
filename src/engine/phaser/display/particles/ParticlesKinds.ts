export type ParticleKind = "heat" | "xp";

export interface ParticleEmitterConfig {
    speed: { min: number; max: number };
    lifespan: number;
    scale: { start: number; end: number };
    alpha: { start: number; end: number };
    frequency: number;
    quantity: number;
    blendMode: string;
}

export interface ParticleKindResolver {
    kind: ParticleKind;
    getConfig(): ParticleEmitterConfig;
    mapIntensity(intensity: number): {
        enabled: boolean;
        frequency: number;
    };
}
