import type { System } from "../../engine/runtime/systems/System";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeStatus,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { ThoughtDefinition } from "../../data/schemas/thoughts";
import { selectEligibleThought } from "../thoughts/thoughtEligibility";

export class ThoughtSystem implements System {
    constructor(
        private readonly getStatus: () => RuntimeStatus,
        private readonly getThoughts: () => ThoughtDefinition[],
    ) {}

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ): void {
        const thoughts = this.getThoughts();
        if (thoughts.length === 0) return;
        const thought = selectEligibleThought(thoughts, snapshot);
        if (!thought) return;
        commands.enqueue({
            type: RuntimeCommandType.SHOW_THOUGHT,
            payload: {
                thoughtId: thought.id,
                body: thought.body,
                rememberScope: thought.rememberScope,
                resumeStatus:
                    this.getStatus() === "running" ? "running" : "paused",
            },
        });
    }
}
