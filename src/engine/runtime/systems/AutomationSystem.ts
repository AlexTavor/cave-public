import type { RuntimeEntity, CommandBuffer, RuntimeCommand } from "../types";
import { RuntimeCommandType } from "../types";
import type { AutomationComponent } from "../../../data/schemas/components";
import type { Snapshot } from "../Snapshot";

export interface AutomationSnapshot {
    activeCount: number;
    nextEventMs: number | null;
    nextCommand: string | null;
}

// Optimization: Direct access instead of Zod parsing.
// We trust the data is valid because it was validated on Spawn/Input.
const getAutomationComponent = (
    entity: RuntimeEntity,
): AutomationComponent | null => {
    const automation = (entity as any).automation;
    if (!automation || typeof automation !== "object") return null;
    return automation as AutomationComponent;
};

export class AutomationSystem {
    private updateSnapshot(
        snapshot: AutomationSnapshot,
        command: string,
        nextRemaining: number,
    ): void {
        const candidateNext = Math.max(0, nextRemaining);
        if (
            snapshot.nextEventMs === null ||
            candidateNext < snapshot.nextEventMs
        ) {
            snapshot.nextEventMs = candidateNext;
            snapshot.nextCommand = command;
        }
    }

    private enqueueUpdate(
        commands: CommandBuffer<RuntimeCommand>,
        entityId: string,
        remainingMs: number,
        repeats: number,
    ): void {
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_AUTOMATION,
            payload: {
                entityId,
                remainingMs,
                repeats,
            },
        });
    }

    private enqueueKill(
        commands: CommandBuffer<RuntimeCommand>,
        entityId: string,
    ): void {
        commands.enqueue({
            type: RuntimeCommandType.KILL,
            payload: { entityId },
        });
    }

    private enqueueExecute(
        commands: CommandBuffer<RuntimeCommand>,
        command: string,
    ): void {
        commands.enqueue({
            type: RuntimeCommandType.EXECUTE_AUTOMATION,
            payload: { command },
        });
    }

    private resolveNextTiming(
        automation: AutomationComponent,
        nextRemaining: number,
    ): { nextInterval: number; nextRepeats: number } {
        const nextRepeats =
            automation.repeats < 0 ? -1 : automation.repeats - 1;
        const rollover =
            automation.intervalMs + (nextRemaining % automation.intervalMs);
        const nextInterval =
            Number.isFinite(rollover) && rollover > 0
                ? rollover
                : automation.intervalMs;
        return { nextInterval, nextRepeats };
    }

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dtMs: number,
    ): AutomationSnapshot {
        const automationSnapshot: AutomationSnapshot = {
            activeCount: 0,
            nextEventMs: null,
            nextCommand: null,
        };

        if (!Number.isFinite(dtMs) || dtMs <= 0) {
            return automationSnapshot;
        }

        for (const entity of snapshot.getEntities()) {
            // Hot path optimization
            const automation = getAutomationComponent(entity);

            if (!automation || !entity.id) {
                continue;
            }

            automationSnapshot.activeCount += 1;

            const nextRemaining = automation.remainingMs - dtMs;
            this.updateSnapshot(
                automationSnapshot,
                automation.command,
                nextRemaining,
            );

            if (automation.repeats === 0) {
                this.enqueueKill(commands, entity.id);
                continue;
            }

            if (nextRemaining > 0) {
                this.enqueueUpdate(
                    commands,
                    entity.id,
                    nextRemaining,
                    automation.repeats,
                );
                continue;
            }

            this.enqueueExecute(commands, automation.command);

            const { nextInterval, nextRepeats } = this.resolveNextTiming(
                automation,
                nextRemaining,
            );

            this.enqueueUpdate(commands, entity.id, nextInterval, nextRepeats);

            if (nextRepeats === 0) {
                this.enqueueKill(commands, entity.id);
            }
        }

        return automationSnapshot;
    }
}
