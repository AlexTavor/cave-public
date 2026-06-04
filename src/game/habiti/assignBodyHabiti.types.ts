// The habiti-assignment input contract is owned by the engine spawn path (which
// builds it) and lives in engine/runtime/handlers/bodyHabitiAssigner so the
// engine can name it without depending on game. Re-exported here under the
// game-local name the habiti algorithm and its callers use.
export type { BodyHabitiAssignerInput as AssignBodyHabitiInput } from "../../engine/runtime/handlers/bodyHabitiAssigner";
