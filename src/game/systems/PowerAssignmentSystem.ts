import type { Snapshot } from "../../engine/runtime/Snapshot";
import {
    CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY,
    hasConditionalActivationSavedThrottleState,
    isConditionalActivationThrottleHidden,
} from "../../engine/runtime/conditionalActivationState";
import type { System } from "../../engine/runtime/systems/System";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { readAssignedIds } from "../assignment/bodyAssignment";
import { isPowerAssignmentNode } from "../assignment/assignmentNodeKinds";

export class PowerAssignmentSystem implements System {
    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
    ): void {
        const nodes = snapshot
            .getEntities()
            .filter((entity) => isPowerAssignmentNode(entity as any));

        const counts = nodes.map((entity) => ({
            entity,
            count: isConditionalActivationThrottleHidden(entity)
                ? 0
                : readAssignedIds(entity as any).length,
        }));

        const total = counts.reduce((sum, entry) => sum + entry.count, 0);

        counts.forEach(({ entity, count }) => {
            const nextThrottle = total > 0 ? count / total : 0;
            const hidden = isConditionalActivationThrottleHidden(entity);

            const currentThrottle = (
                entity as { powerSink?: { throttle?: unknown } }
            ).powerSink?.throttle;

            const currentSavedThrottle = (
                entity as { state?: Record<string, { value?: unknown }> }
            ).state?.[CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY]?.value;

            if (!entity.id) return;

            if (currentThrottle !== nextThrottle) {
                commands.enqueue({
                    type: RuntimeCommandType.UPDATE_POWER_SINK,
                    payload: {
                        entityId: entity.id,
                        throttle: nextThrottle,
                    },
                });
            }

            if (
                !hidden &&
                hasConditionalActivationSavedThrottleState(entity) &&
                currentSavedThrottle !== nextThrottle
            ) {
                commands.enqueue({
                    type: RuntimeCommandType.UPDATE_STATE,
                    payload: {
                        entityId: entity.id,
                        key: CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY,
                        value: nextThrottle,
                        visible: false,
                    },
                });
            }
        });
    }
}
