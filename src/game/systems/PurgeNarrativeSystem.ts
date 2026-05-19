import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import type { System } from "../../engine/runtime/systems/System";
import type { GameConfig } from "../../data/schemas/game/config";
import { evaluateNarrative } from "./cave/purgeNarrative";

export class PurgeNarrativeSystem implements System {
    private readonly config: GameConfig;

    constructor(config: GameConfig) {
        this.config = config;
    }

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
    ): void {
        evaluateNarrative(snapshot, commands, this.config);
    }
}
