import jsonLogic from "json-logic-js";
import { evaluateBodiesAssigned } from "../assignment/bodiesAssignedCondition";
import type { LogicOpContext } from "./logicOpContext";

export const registerBodiesAssignedOp = (): void => {
    jsonLogic.add_operation("BODIES_ASSIGNED", function (this: LogicOpContext) {
        if (!this.__snapshot || typeof this.self?.id !== "string") {
            return false;
        }
        return evaluateBodiesAssigned(this.__snapshot, this.self.id);
    });
};
