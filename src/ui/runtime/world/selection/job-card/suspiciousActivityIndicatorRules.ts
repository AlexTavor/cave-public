import { DEFAULT_GAME_CONFIG } from "../../../../../data/schemas/game/config";
import type { Runtime } from "../../../../../engine/runtime/Runtime";

export const readConfiguredSusDisplays = (runtime: Runtime | null) => {
    const config = runtime?.getCartridge().config as
        | {
              settings?: { game_config?: { susDisplays?: unknown[] } };
              game_config?: { susDisplays?: unknown[] };
          }
        | undefined;
    return (config?.settings?.game_config?.susDisplays ??
        config?.game_config?.susDisplays ??
        DEFAULT_GAME_CONFIG.susDisplays) as typeof DEFAULT_GAME_CONFIG.susDisplays;
};

export const resolveDisplayRule = (
    amount: number,
    rules: typeof DEFAULT_GAME_CONFIG.susDisplays,
) =>
    rules.reduce<(typeof rules)[number] | null>((best, rule) => {
        const isMatch = amount >= rule.threshold;
        return isMatch && (!best || rule.threshold >= best.threshold)
            ? rule
            : best;
    }, null);
