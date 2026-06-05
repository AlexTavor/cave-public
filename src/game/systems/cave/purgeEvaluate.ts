import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
} from "../../../engine/runtime/types";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import type { GameConfig } from "../../../data/schemas/game/config";
import { pseudoRandom } from "../../../utils/pseudoRandom";
import { readWorldSeed, withWorldSeed } from "../../../utils/worldSeed";
import {
    resolvePurge,
    resolveProgress,
    resolveEffectiveMaxProgress,
} from "./purgeResolvers";
import type { PurgeRuntime } from "./purgeResolvers";
import { enqueueMirroredFactAdjust } from "../../../engine/runtime/factCommands";
import { enqueueCaveCounterAdjust } from "./caveEventCounters";
import { handleExpiredPurgeTimer } from "./purgeExpiredTimer";

const randomTimer = (seed: string, min: number, max: number): number =>
    min + pseudoRandom(seed) * (max - min);

const emitCavePurge = (
    commands: CommandBuffer<RuntimeCommand>,
    purge: { isActive?: boolean; nextKillTimer?: number },
): void => {
    commands.enqueue({
        type: RuntimeCommandType.UPDATE_CAVE,
        payload: { entityId: "sys_world", purge },
    });
};

export const evaluatePurge = (
    snapshot: Snapshot,
    commands: CommandBuffer<RuntimeCommand>,
    dt: number,
    config: GameConfig,
): void => {
    const world = snapshot.getEntity("sys_world");
    if (!world) return;

    const purge = resolvePurge(world);
    const progress = resolveProgress(world);
    const effectiveMaxProgress = resolveEffectiveMaxProgress(
        world,
        config.purge.maxProgress,
    );
    const worldSeed = readWorldSeed(world as any, "world");
    const { min, max } = config.purge.killIntervalSeconds;

    if (progress.max !== effectiveMaxProgress) {
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "sys_world",
                key: "purge_progress",
                max: effectiveMaxProgress,
            },
        });
    }

    if (purge.isActive) {
        handleActivePurge(snapshot, commands, dt, purge, min, max, worldSeed);
    } else if (progress.value >= effectiveMaxProgress) {
        activatePurge(commands, purge.nextKillTimer, min, max, worldSeed);
    }
};

const handleActivePurge = (
    snapshot: Snapshot,
    commands: CommandBuffer<RuntimeCommand>,
    dt: number,
    purge: PurgeRuntime,
    min: number,
    max: number,
    worldSeed: string,
): void => {
    const newTimer = purge.nextKillTimer - dt / 1000;
    if (newTimer <= 0) {
        handleExpiredPurgeTimer(snapshot, commands, purge, min, max, worldSeed);
    } else {
        emitCavePurge(commands, { nextKillTimer: newTimer });
    }
};

const activatePurge = (
    commands: CommandBuffer<RuntimeCommand>,
    timerSeed: number,
    min: number,
    max: number,
    worldSeed: string,
): void => {
    const timer = randomTimer(
        withWorldSeed(worldSeed, `${timerSeed}:purge_init`),
        min,
        max,
    );
    emitCavePurge(commands, { isActive: true, nextKillTimer: timer });
    enqueueCaveCounterAdjust(commands, "cave_evt_purge_began");
    enqueueMirroredFactAdjust(commands, "purge_began", "world", 1);
};

