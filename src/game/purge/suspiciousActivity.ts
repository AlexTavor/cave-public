import type { EditorAbilities } from "../../data/schemas/abilities";
import type { UpdaterAbilityConfig } from "../../data/schemas/abilities/updater";

export const SUSPICIOUS_ACTIVITY_TAG = "suspicious_activity";
export const PURGE_PROGRESS_TARGET = "sys_world.state.purge_progress.value";

const readTriggers = (config: UpdaterAbilityConfig) =>
    config.triggers ?? ["cycle_complete"];

const hasSuspiciousTrigger = (config: UpdaterAbilityConfig) =>
    readTriggers(config).some(
        (trigger) =>
            trigger === "cycle_complete" || trigger === "assignment_complete",
    );

export const collectSuspiciousPurgeUpdaters = (
    abilities?: EditorAbilities,
): UpdaterAbilityConfig[] =>
    (abilities?.updater ?? []).filter(
        (config) =>
            config.target === PURGE_PROGRESS_TARGET &&
            config.op === "ADD" &&
            hasSuspiciousTrigger(config),
    );
