import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { System } from "../../engine/runtime/systems/System";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";
import { enqueueMirroredFactAdjust } from "../facts/factCommands";

const getCompletedCycleBlueprintId = (
    entity: Readonly<RuntimeEntity>,
): string | null => {
    const blueprintId =
        typeof entity.blueprintId === "string" ? entity.blueprintId : "";
    const cycle = (
        entity.state as { cycle?: { value?: number; max?: number } } | undefined
    )?.cycle;
    const value = cycle?.value;
    const max = cycle?.max;
    if (
        !blueprintId ||
        typeof value !== "number" ||
        typeof max !== "number" ||
        !Number.isFinite(value) ||
        !Number.isFinite(max)
    ) {
        return null;
    }
    if (max <= 0 || value < max) return null;
    return blueprintId;
};

export class CycleCompletedFactsSystem implements System {
    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
    ): void {
        for (const entity of snapshot.getEntities()) {
            const blueprintId = getCompletedCycleBlueprintId(entity);
            if (!blueprintId) continue;
            enqueueMirroredFactAdjust(
                commands,
                "cycle_completed",
                blueprintId,
                1,
            );
        }
    }
}
