import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
} from "../../../engine/runtime/types";
import {
    appendCommandMetadata,
    RuntimeCommandType,
} from "../../../engine/runtime/types";
import type { GameConfig } from "../../../data/schemas/game/config";
import { resolveEffectiveMaxProgress, resolveProgress } from "./purgeResolvers";
import { pseudoRandom } from "../../../utils/pseudoRandom";
import { readWorldSeed, withWorldSeed } from "../../../utils/worldSeed";

const pickMilestoneMessage = (
    world: unknown,
    milestoneId: string,
    messages: string[],
) => {
    if (messages.length === 0) return "";
    const seed = withWorldSeed(
        readWorldSeed(world as { state?: Record<string, unknown> }, "world"),
        `purge_${milestoneId}`,
    );
    return messages[Math.floor(pseudoRandom(seed) * messages.length)] ?? "";
};

export const evaluateNarrative = (
    snapshot: Snapshot,
    commands: CommandBuffer<RuntimeCommand>,
    config: GameConfig,
): void => {
    const world = snapshot.getEntity("sys_world");
    if (!world) return;

    const milestones = config.purge.milestones;
    if (!milestones || milestones.length === 0) return;

    const progress = resolveProgress(world);
    const effectiveMaxProgress = resolveEffectiveMaxProgress(
        world,
        config.purge.maxProgress,
    );
    if (effectiveMaxProgress <= 0) return;

    const ratio = progress.value / effectiveMaxProgress;
    const state = (world.state as Record<string, unknown>) ?? {};

    for (const milestone of milestones) {
        if (ratio < milestone.threshold) continue;

        const flagKey = `purge_milestone_${milestone.id}`;
        if (state[flagKey]) continue;

        commands.enqueue(
            appendCommandMetadata(
                {
                    type: RuntimeCommandType.UPDATE_STATE,
                    payload: {
                        entityId: "sys_world",
                        key: flagKey,
                        value: 1,
                    },
                },
                {
                    purgeMilestoneMessage: pickMilestoneMessage(
                        world,
                        milestone.id,
                        milestone.messages,
                    ),
                },
            ),
        );

        break;
    }
};

