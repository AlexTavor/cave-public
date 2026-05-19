import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { System } from "../../engine/runtime/systems/System";
import { isBlockingOverlayActive } from "../../engine/runtime/runtimePauseState";
import { resolveXpThreshold } from "./body/progression";
import type { GameConfig } from "../../data/schemas/game/config";
import { evaluatePurge } from "./cave/purgeEvaluate";
import { resolveCaveProgression } from "./cave/caveProgressionState";

export class CaveSystem implements System {
    private readonly config: GameConfig;

    constructor(config: GameConfig) {
        this.config = config;
    }

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        const world = snapshot.getEntity("sys_world");
        if (!world) return;

        evaluatePurge(snapshot, commands, dt, this.config);

        const {
            xp: progXp,
            level: currentLevel,
            skillpoints,
        } = resolveCaveProgression(world);

        if (handleSkillpoints(snapshot, commands, currentLevel, skillpoints)) {
            return;
        }

        handleXp(currentLevel, progXp, commands, skillpoints);
    }
}

function handleXp(
    currentLevel: number,
    progXp: number,
    commands: CommandBuffer<RuntimeCommand>,
    skillpoints: number,
) {
    const threshold = resolveXpThreshold(currentLevel);

    if (progXp < threshold) return;
    commands.enqueue({
        type: RuntimeCommandType.UPDATE_CAVE,
        payload: {
            entityId: "sys_world",
            xp: progXp - threshold,
            level: currentLevel + 1,
            skillpoints: skillpoints + 1,
        },
    });
}

function handleSkillpoints(
    snapshot: Snapshot,
    commands: CommandBuffer<RuntimeCommand>,
    currentLevel: number,
    skillpoints: number,
): boolean {
    if (skillpoints <= 0) return false;

    if (!isBlockingOverlayActive(snapshot)) {
        commands.enqueue({
            type: RuntimeCommandType.TRIGGER_DRAFT,
            payload: {
                poolId: "pool_level_up",
                triggerEntityId: "sys_world",
                label: `Level ${currentLevel} Reward`,
            },
        });
        return true;
    }
    return false;
}

