import type { ParticleKind, ParticleKindResolver } from "./ParticlesKinds";
import { HeatParticlesConfigResolver } from "./HeatParticlesConfigResolver";
import { XpParticlesConfigResolver } from "./XpParticlesConfigResolver";

const RESOLVERS: Record<ParticleKind, ParticleKindResolver> = {
    heat: HeatParticlesConfigResolver,
    xp: XpParticlesConfigResolver,
};

export class ParticlesConfigRegistry {
    public get(kind: ParticleKind): ParticleKindResolver {
        return RESOLVERS[kind];
    }
}
