import type { BehaviorAction } from "../../data/schemas/behavior";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeCommandSourceLane,
    RuntimeEntity,
} from "../../engine/runtime/types";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import { ActionExecutor } from "../../engine/runtime/systems/behavior/ActionExecutor";
import {
    buildAssignmentMap,
    updateGlobalsBuffer,
} from "../../engine/runtime/systems/behavior/behaviorSystemUtils";

export const executeBehaviorActionList = (input: {
    actions: BehaviorAction[];
    self: RuntimeEntity;
    snapshot: Snapshot;
    commands: CommandBuffer<RuntimeCommand>;
    sourceLane: RuntimeCommandSourceLane;
}) => {
    const globals: Record<string, number> = {};
    const executor = new ActionExecutor();
    updateGlobalsBuffer(globals, input.snapshot, 0);
    const assignmentMap = buildAssignmentMap(input.snapshot);
    input.actions.forEach((action) =>
        executor.execute(
            action,
            {
                snapshot: input.snapshot,
                self: input.self,
                globals,
                sourceLane: input.sourceLane,
                assignmentMap,
            },
            input.commands,
        ),
    );
};
