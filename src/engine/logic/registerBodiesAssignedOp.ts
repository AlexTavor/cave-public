import jsonLogic from "json-logic-js";
import type { Snapshot } from "../runtime/Snapshot";
import { evaluateBodiesAssigned } from "../../game/assignment/bodiesAssignedCondition";

export const registerBodiesAssignedOp = (): void => {
    jsonLogic.add_operation("BODIES_ASSIGNED", function (this: any) {
        const ctx = this as { __snapshot?: Snapshot; self?: { id?: string } };
        if (!ctx.__snapshot || typeof ctx.self?.id !== "string") {
            return false;
        }
        return evaluateBodiesAssigned(ctx.__snapshot, ctx.self.id);
    });
};
