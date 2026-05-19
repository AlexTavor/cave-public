import jsonLogic from "json-logic-js";
import type { Snapshot } from "../runtime/Snapshot";
import { evaluateDestructiveAssignmentHasAllBodies } from "../../game/assignment/destructiveAssignmentCondition";

export const registerDestructiveAssignmentHasAllBodiesOp = (): void => {
    jsonLogic.add_operation(
        "DESTRUCTIVE_ASSIGNMENT_HAS_ALL_BODIES",
        function (this: any) {
            const ctx = this as {
                __snapshot?: Snapshot;
                self?: { id?: string };
            };

            if (!ctx.__snapshot || typeof ctx.self?.id !== "string") {
                return false;
            }

            return evaluateDestructiveAssignmentHasAllBodies(
                ctx.__snapshot,
                ctx.self.id,
            );
        },
    );
};
