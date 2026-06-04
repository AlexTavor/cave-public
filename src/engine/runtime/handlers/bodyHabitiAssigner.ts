import type {
    BodySettings,
    HabitusDefinition,
} from "../../../data/schemas/game/habiti";

/**
 * Input contract for assigning habiti to a spawned body. Built by the engine
 * spawn path (which holds the cartridge data + world seed) and consumed by the
 * game's habiti algorithm. Depends only on data schemas, so the engine can name
 * the contract without depending on game.
 */
export type BodyHabitiAssignerInput = {
    identitySerial: number;
    existingHabiti?: string[];
    settings?: BodySettings;
    habitusIndex: Record<string, HabitusDefinition>;
    worldSeed?: string;
    forcedHabiti?: string[];
    onInvalidForcedHabitusId?: (id: string, reason: string) => void;
};

/**
 * Computes the habiti for a spawned body. Habitus type rules and eligibility are
 * game-domain content logic, so the engine spawn path does NOT import the impl —
 * the game injects it per-runtime via Runtime.setBodyHabitiAssigner at wire-time
 * (registerGameCommandHandlers), and spawnBodyIdentity calls through
 * context.assignBodyHabiti. When no assigner is wired (e.g. an engine unit test
 * that doesn't care about habiti), the spawn path leaves habiti unchanged.
 */
export type BodyHabitiAssigner = (input: BodyHabitiAssignerInput) => string[];
