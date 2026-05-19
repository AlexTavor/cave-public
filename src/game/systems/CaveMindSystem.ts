import type { System } from "../../engine/runtime/systems/System";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    DEFAULT_GAME_CONFIG,
    type GameConfig,
} from "../../data/schemas/game/config";
import { collectCaveStimuli } from "./cave/collectCaveStimuli";
import { resolveCaveAttention } from "./cave/resolveCaveAttention";
import { resolveCaveRenderState } from "./cave/resolveCaveRenderState";
import { updateCaveEmotions } from "./cave/updateCaveEmotions";
import { updateCaveSalience } from "./cave/updateCaveSalience";

export class CaveMindSystem implements System {
    public constructor(
        private readonly displayConfig: GameConfig["caveDisplay"] = DEFAULT_GAME_CONFIG.caveDisplay,
    ) {}

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
    ): void {
        const world = snapshot.getEntity("sys_world") as any;
        const previousMind = world?.cave?.mind;
        if (!world?.id || !previousMind) return;
        const stimuli = collectCaveStimuli(snapshot, previousMind.memory);
        if (!stimuli) return;
        const { entities, ranked } = updateCaveSalience(
            stimuli,
            previousMind.memory,
        );
        const { emotions, memoryPatch: emotionMemoryPatch } =
            updateCaveEmotions(
                stimuli,
                previousMind.emotions,
                previousMind.memory,
            );
        const attention = resolveCaveAttention(
            ranked,
            previousMind.attention,
            emotions,
        );
        const { render, pulsePresetKey, memoryPatch } = resolveCaveRenderState(
            attention,
            emotions,
            stimuli.world.comfort,
            stimuli.world.caveWorldX,
            stimuli.world.caveWorldY,
            this.displayConfig,
            previousMind.memory.eyeDriftPhaseX,
            previousMind.memory.eyeDriftPhaseY,
        );
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_CAVE,
            payload: {
                entityId: "sys_world",
                mind: {
                    attention,
                    emotions,
                    render,
                    pulsePresetKey,
                    memory: {
                        previousComfort: stimuli.world.comfort,
                        comfortDeclineTicks:
                            emotionMemoryPatch.comfortDeclineTicks,
                        comfortTrendAnchor:
                            previousMind.memory.comfortTrendAnchor ?? null,
                        comfortWindowStartComfort:
                            emotionMemoryPatch.comfortWindowStartComfort,
                        comfortWindowStartElapsedS:
                            emotionMemoryPatch.comfortWindowStartElapsedS,
                        comfortWindowDelta:
                            emotionMemoryPatch.comfortWindowDelta,
                        previousXp: stimuli.world.xp,
                        previousLevel: stimuli.world.level,
                        eyeDriftPhaseX: memoryPatch.eyeDriftPhaseX,
                        eyeDriftPhaseY: memoryPatch.eyeDriftPhaseY,
                        previousPurgeActive: stimuli.world.purgeActive,
                        previousSelectedEntityId:
                            stimuli.world.selectedEntityId,
                        previousDragEntityId: stimuli.world.dragEntityId,
                        previousDragActive: stimuli.world.dragActive,
                        previousEventCounters: stimuli.world.eventCounters,
                        curiosityNodes: emotionMemoryPatch.curiosityNodes,
                        entities,
                    },
                },
            },
        });
    }
}
