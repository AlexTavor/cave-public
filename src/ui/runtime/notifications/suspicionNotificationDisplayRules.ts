import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import type { SuspicionNotificationDisplay } from "../../../data/schemas/game/susDisplay";
import type { Runtime } from "../../../engine/runtime/Runtime";

type SuspicionDisplayRule = SuspicionNotificationDisplay;

export const readConfiguredSuspicionNotificationDisplays = (
    runtime: Runtime | null,
) => {
    const config = (
        runtime as {
            getCartridge?: () => {
                config?: {
                    settings?: {
                        game_config?: {
                            suspicionNotificationDisplays?: unknown[];
                        };
                    };
                    game_config?: {
                        suspicionNotificationDisplays?: unknown[];
                    };
                };
            };
        } | null
    )?.getCartridge?.().config;
    return (config?.settings?.game_config?.suspicionNotificationDisplays ??
        config?.game_config?.suspicionNotificationDisplays ??
        DEFAULT_GAME_CONFIG.suspicionNotificationDisplays) as SuspicionDisplayRule[];
};

export const resolveSuspicionNotificationDisplay = (
    value: number,
    rules: SuspicionDisplayRule[],
) =>
    rules.reduce<SuspicionDisplayRule | null>(
        (best, rule) =>
            value >= rule.threshold &&
            (!best || rule.threshold >= best.threshold)
                ? rule
                : best,
        null,
    );
