import { Snapshot } from "../../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../../engine/runtime/types";
import type { GameConfig } from "../../../data/schemas/game/config";
import { GameConfigSchema } from "../../../data/schemas/game/config";

export const makeBuffer = (): CommandBuffer<RuntimeCommand> & {
    commands: RuntimeCommand[];
} => {
    const commands: RuntimeCommand[] = [];
    return {
        enqueue: (c: RuntimeCommand) => commands.push(c),
        drain: () => commands.splice(0),
        clear: () => {
            commands.length = 0;
        },
        size: () => commands.length,
        commands,
    } as CommandBuffer<RuntimeCommand> & { commands: RuntimeCommand[] };
};

export const snap = (entities: RuntimeEntity[]): Snapshot =>
    new Snapshot(entities, { getBody: () => undefined } as any);

export const makeTestPurgeConfig = (): GameConfig =>
    GameConfigSchema.parse({
        purge: {
            maxProgress: 100,
            killIntervalSeconds: { min: 5, max: 10 },
        },
    });

export const makeWorldWithPurge = (
    progressValue: number,
    isActive: boolean,
    nextKillTimer: number,
): RuntimeEntity => ({
    id: "sys_world",
    tags: ["sys_world"],
    state: { purge_progress: { value: progressValue, max: 100 } },
    cave: { purge: { isActive, nextKillTimer } },
});

export const makeBody = (id: string): RuntimeEntity => ({
    id,
    tags: ["body"],
    body: { health: 1, maxHealth: 1 },
});

export const makeWorldWithProgress = (
    value: number,
    max: number,
    flags?: Record<string, unknown>,
): RuntimeEntity => ({
    id: "sys_world",
    tags: ["sys_world"],
    state: { purge_progress: { value, max }, ...flags },
});

export const withMilestone = (
    config: GameConfig,
    id: string,
    threshold: number,
    messages: string[],
): GameConfig => ({
    ...config,
    purge: {
        ...config.purge,
        milestones: [...config.purge.milestones, { id, threshold, messages }],
    },
});

