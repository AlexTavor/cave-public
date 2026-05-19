import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { resolveEffectiveMaxProgress } from "../../game/systems/cave/purgeResolvers";
import type { Runtime } from "../../engine/runtime/Runtime";

type GameConfigLike = {
    settings?: { game_config?: { purge?: { maxProgress?: number } } };
    game_config?: { purge?: { maxProgress?: number } };
};

export const readConfiguredPurgeMaxProgress = (runtime: Runtime | null) => {
    const config = runtime?.getCartridge().config as GameConfigLike | undefined;
    return (
        config?.settings?.game_config?.purge?.maxProgress ??
        config?.game_config?.purge?.maxProgress ??
        DEFAULT_GAME_CONFIG.purge.maxProgress
    );
};

export const resolveRuntimePurgeThresholdFraction = (
    runtime: Runtime | null,
    world: Readonly<Record<string, unknown>> | null,
    value: number,
) => {
    const baseMax = readConfiguredPurgeMaxProgress(runtime);
    const effectiveMax = world
        ? resolveEffectiveMaxProgress(world, baseMax)
        : baseMax;
    if (!Number.isFinite(value) || !Number.isFinite(effectiveMax)) return null;
    if (effectiveMax <= 0) return null;
    return value / effectiveMax;
};
