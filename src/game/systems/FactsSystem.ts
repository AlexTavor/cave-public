import type { System } from "../../engine/runtime/systems/System";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import {
    enqueueFactAdjust,
    enqueueMirroredFactAdjust,
} from "../../engine/runtime/factCommands";
import {
    ACTIVE_BODIES_FACT_ABOUT,
    resolveActiveBodiesFactDelta,
} from "./facts/activeBodiesFact";
import {
    PROCESSING_ONGOING_FACT_ABOUT,
    resolveProcessingOngoingFactDelta,
} from "./facts/processingOngoingFact.ts";

export class FactsSystem implements System {
    constructor(private readonly getTimeScale: () => number) {}

    public tick(
        _snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        const timeScale = this.getTimeScale();
        const gameSeconds = dt / 1000;
        const realSeconds = timeScale > 0 ? gameSeconds / timeScale : 0;
        enqueueMirroredFactAdjust(
            commands,
            "elapsed_real_seconds",
            "world",
            realSeconds,
        );
        enqueueMirroredFactAdjust(
            commands,
            "elapsed_game_seconds",
            "world",
            gameSeconds,
        );
        const activeBodiesDelta = resolveActiveBodiesFactDelta(_snapshot);
        if (activeBodiesDelta !== 0) {
            enqueueFactAdjust(
                commands,
                "run",
                "active_bodies",
                ACTIVE_BODIES_FACT_ABOUT,
                activeBodiesDelta,
            );
        }
        const processingOngoingDelta =
            resolveProcessingOngoingFactDelta(_snapshot);
        if (processingOngoingDelta !== 0) {
            enqueueFactAdjust(
                commands,
                "run",
                "processing_ongoing",
                PROCESSING_ONGOING_FACT_ABOUT,
                processingOngoingDelta,
            );
        }
    }
}
