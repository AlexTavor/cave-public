import type { Passport } from "../../../data/schemas/game/body";
import type { AttributeTotals } from "./attributes";
import type { TraitIndex } from "./traits";

export type ProcessBodyEntityOptions = {
    healthMultiplier: number;
    worldSeed?: string;
    caveAttributes: AttributeTotals;
    traitIndex: TraitIndex;
    globals: Record<string, number>;
    passportPatch?: Partial<Passport> | null;
    habitusPatch?: string[] | null;
};
