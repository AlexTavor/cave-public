import { readPurgeProgressMaxBonus } from "../../habiti/purgeProgressBonusState";

export type PurgeRuntime = { isActive: boolean; nextKillTimer: number };

export const resolvePurge = (
    entity: Readonly<Record<string, unknown>>,
): PurgeRuntime => {
    const cave = entity.cave as { purge?: PurgeRuntime } | undefined;
    return {
        isActive: cave?.purge?.isActive ?? false,
        nextKillTimer: cave?.purge?.nextKillTimer ?? 0,
    };
};

export const resolveProgress = (
    entity: Readonly<Record<string, unknown>>,
): { value: number; max: number } => {
    const state = entity.state as Record<string, unknown> | undefined;
    const pp = state?.purge_progress as
        | { value?: number; max?: number }
        | undefined;
    return { value: pp?.value ?? 0, max: pp?.max ?? 100 };
};

export const resolveEffectiveMaxProgress = (
    entity: Readonly<Record<string, unknown>>,
    baseConfigMax: number,
): number => baseConfigMax + readPurgeProgressMaxBonus(entity);

export const pickBodyIndex = (count: number, r: number): number =>
    Math.floor(r * count);

